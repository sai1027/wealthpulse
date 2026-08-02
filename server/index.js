import express from 'express';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import { initDB, queryAll, queryGet, runStmt, saveDB } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'wealthpulse-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ─── Auth Middleware ──────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = queryGet('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ id: user.id, username: user.username, display_name: user.display_name });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = queryGet('SELECT id, username, display_name FROM users WHERE id = ?', [req.session.userId]);
  res.json(user);
});

app.post('/api/auth/register', (req, res) => {
  const { username, display_name, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const existing = queryGet('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const { lastId } = runStmt('INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
    [username, display_name || username, hash]);

  seedCategoriesForUser(lastId);

  req.session.userId = lastId;
  req.session.username = username;
  res.json({ id: lastId, username, display_name: display_name || username });
});

app.put('/api/auth/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  const user = queryGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  runStmt('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(new_password, 10), req.session.userId]);
  res.json({ ok: true });
});

// ─── CATEGORIES ROUTES ───────────────────────────────────────
app.get('/api/categories', requireAuth, (req, res) => {
  const categories = queryAll('SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order', [req.session.userId]);
  res.json(categories);
});

app.post('/api/categories', requireAuth, (req, res) => {
  const { name, slug, icon, category_type, sort_order } = req.body;
  const { lastId } = runStmt(
    'INSERT INTO categories (user_id, name, slug, icon, category_type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [req.session.userId, name, slug, icon || '📁', category_type || 'custom', sort_order || 99]
  );
  res.json({ id: lastId });
});

app.put('/api/categories/reorder', requireAuth, (req, res) => {
  const { category_orders } = req.body;
  for (const { id, sort_order } of category_orders) {
    runStmt('UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?', [sort_order, id, req.session.userId]);
  }
  res.json({ ok: true });
});

app.put('/api/categories/:id', requireAuth, (req, res) => {
  const cat = queryGet('SELECT * FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const { name, icon, sort_order } = req.body;
  runStmt('UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?',
    [name || cat.name, icon || cat.icon, sort_order != null ? sort_order : cat.sort_order, req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/categories/:id', requireAuth, (req, res) => {
  // Delete items and their values first
  const items = queryAll('SELECT id FROM items WHERE category_id = ?', [req.params.id]);
  for (const item of items) {
    runStmt('DELETE FROM item_values WHERE item_id = ?', [item.id]);
    runStmt('DELETE FROM monthly_snapshots WHERE item_id = ?', [item.id]);
  }
  runStmt('DELETE FROM items WHERE category_id = ?', [req.params.id]);
  runStmt('DELETE FROM field_definitions WHERE category_id = ?', [req.params.id]);
  runStmt('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  res.json({ ok: true });
});

// ─── CATEGORIES ROUTES ───────────────────────────────────────
// ─── CATEGORIES ROUTES ───────────────────────────────────────
app.get('/api/categories/:categoryId/fields', requireAuth, (req, res) => {
  const cat = queryGet('SELECT id FROM categories WHERE id = ? AND user_id = ?', [req.params.categoryId, req.session.userId]);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const fields = queryAll('SELECT * FROM field_definitions WHERE category_id = ? ORDER BY sort_order', [req.params.categoryId]);
  res.json(fields);
});

app.post('/api/fields', requireAuth, (req, res) => {
  const { category_id, field_name, field_label, field_type, options, is_required, is_sensitive, is_visible_in_summary } = req.body;
  const max = queryGet('SELECT MAX(sort_order) as max_order FROM field_definitions WHERE category_id = ?', [category_id]);
  const { lastId } = runStmt(
    'INSERT INTO field_definitions (category_id, field_name, field_label, field_type, options, is_required, is_sensitive, is_visible_in_summary, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [category_id, field_name, field_label, field_type || 'text', options || null, is_required ? 1 : 0, is_sensitive ? 1 : 0, is_visible_in_summary ? 1 : 0, (max?.max_order || 0) + 1]
  );
  res.json({ id: lastId });
});

app.put('/api/fields/reorder', requireAuth, (req, res) => {
  const { field_orders } = req.body;
  for (const { id, sort_order } of field_orders) {
    runStmt('UPDATE field_definitions SET sort_order = ? WHERE id = ?', [sort_order, id]);
  }
  res.json({ ok: true });
});

app.put('/api/fields/:id', requireAuth, (req, res) => {
  const field = queryGet('SELECT * FROM field_definitions WHERE id = ?', [req.params.id]);
  if (!field) return res.status(404).json({ error: 'Field not found' });
  const { field_label, field_type, options, is_required, is_sensitive, is_visible_in_summary, sort_order } = req.body;
  runStmt(`UPDATE field_definitions SET 
    field_label = ?, field_type = ?, options = ?, is_required = ?, is_sensitive = ?, is_visible_in_summary = ?, sort_order = ?
    WHERE id = ?`,
    [
      field_label ?? field.field_label,
      field_type ?? field.field_type,
      options ?? field.options,
      is_required != null ? (is_required ? 1 : 0) : field.is_required,
      is_sensitive != null ? (is_sensitive ? 1 : 0) : field.is_sensitive,
      is_visible_in_summary != null ? (is_visible_in_summary ? 1 : 0) : field.is_visible_in_summary,
      sort_order ?? field.sort_order,
      req.params.id
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/fields/:id', requireAuth, (req, res) => {
  runStmt('DELETE FROM item_values WHERE field_id = ?', [req.params.id]);
  runStmt('DELETE FROM field_definitions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── ITEMS ROUTES ────────────────────────────────────────────

// ─── ITEMS ROUTES ────────────────────────────────────────────
app.get('/api/items', requireAuth, (req, res) => {
  const { category_id } = req.query;
  let items;
  if (category_id) {
    items = queryAll('SELECT * FROM items WHERE category_id = ? AND user_id = ? ORDER BY created_at DESC', [category_id, req.session.userId]);
  } else {
    items = queryAll('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
  }

  const result = items.map(item => {
    const vals = queryAll(`
      SELECT iv.field_id, iv.value, fd.field_name, fd.field_label, fd.field_type, fd.is_sensitive, fd.sort_order
      FROM item_values iv
      JOIN field_definitions fd ON fd.id = iv.field_id
      WHERE iv.item_id = ?
      ORDER BY fd.sort_order
    `, [item.id]);

    const values = {};
    for (const v of vals) {
      values[v.field_name] = {
        field_id: v.field_id,
        value: v.value,
        label: v.field_label,
        type: v.field_type,
        is_sensitive: v.is_sensitive
      };
    }
    return { ...item, values };
  });

  res.json(result);
});

app.post('/api/items', requireAuth, (req, res) => {
  const { category_id, name, description, values } = req.body;
  const { lastId: itemId } = runStmt(
    'INSERT INTO items (category_id, user_id, name, description) VALUES (?, ?, ?, ?)',
    [category_id, req.session.userId, name, description || '']
  );

  if (values && typeof values === 'object') {
    for (const [fieldId, value] of Object.entries(values)) {
      runStmt('INSERT OR REPLACE INTO item_values (item_id, field_id, value) VALUES (?, ?, ?)',
        [itemId, parseInt(fieldId), String(value)]);
    }
  }

  recordAutoSnapshot(itemId, category_id, values);

  res.json({ id: itemId });
});

app.put('/api/items/:id', requireAuth, (req, res) => {
  const { name, description, values } = req.body;
  const item = queryGet('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  runStmt('UPDATE items SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name || item.name, description ?? item.description, req.params.id]);

  if (values && typeof values === 'object') {
    for (const [fieldId, value] of Object.entries(values)) {
      // Check if value exists
      const existing = queryGet('SELECT id FROM item_values WHERE item_id = ? AND field_id = ?', [req.params.id, parseInt(fieldId)]);
      if (existing) {
        runStmt('UPDATE item_values SET value = ? WHERE item_id = ? AND field_id = ?', [String(value), req.params.id, parseInt(fieldId)]);
      } else {
        runStmt('INSERT INTO item_values (item_id, field_id, value) VALUES (?, ?, ?)', [req.params.id, parseInt(fieldId), String(value)]);
      }
    }
  }

  recordAutoSnapshot(req.params.id, item.category_id, values);

  res.json({ ok: true });
});

app.delete('/api/items/:id', requireAuth, (req, res) => {
  runStmt('DELETE FROM item_values WHERE item_id = ?', [req.params.id]);
  runStmt('DELETE FROM monthly_snapshots WHERE item_id = ?', [req.params.id]);
  runStmt('DELETE FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  res.json({ ok: true });
});

// ─── MONTHLY SNAPSHOTS ROUTES ────────────────────────────────
app.get('/api/items/:itemId/snapshots', requireAuth, (req, res) => {
  const snapshots = queryAll('SELECT * FROM monthly_snapshots WHERE item_id = ? ORDER BY month DESC', [req.params.itemId]);
  res.json(snapshots);
});

app.post('/api/snapshots', requireAuth, (req, res) => {
  const { item_id, month, invested_value, current_value, notes } = req.body;
  // Check if snapshot already exists for this month
  const existing = queryGet('SELECT id FROM monthly_snapshots WHERE item_id = ? AND month = ?', [item_id, month]);
  if (existing) {
    runStmt('UPDATE monthly_snapshots SET invested_value = ?, current_value = ?, notes = ?, recorded_at = CURRENT_TIMESTAMP WHERE id = ?',
      [invested_value || 0, current_value || 0, notes || '', existing.id]);
    res.json({ id: existing.id });
  } else {
    const { lastId } = runStmt(
      'INSERT INTO monthly_snapshots (item_id, month, invested_value, current_value, notes) VALUES (?, ?, ?, ?, ?)',
      [item_id, month, invested_value || 0, current_value || 0, notes || '']
    );
    res.json({ id: lastId });
  }
});

app.delete('/api/snapshots/:id', requireAuth, (req, res) => {
  runStmt('DELETE FROM monthly_snapshots WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── DASHBOARD ROUTE ─────────────────────────────────────────
app.get('/api/dashboard', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const categories = queryAll('SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order', [userId]);

  const dashboardData = categories.map(cat => {
    const items = queryAll('SELECT * FROM items WHERE category_id = ? AND user_id = ?', [cat.id, userId]);
    const investedField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'invested_value'", [cat.id]);
    const currentField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'current_value'", [cat.id]);

    let totalInvested = 0, totalCurrent = 0;
    if (investedField && currentField) {
      for (const item of items) {
        const inv = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, investedField.id]);
        const cur = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, currentField.id]);
        totalInvested += parseFloat(inv?.value || 0);
        totalCurrent += parseFloat(cur?.value || 0);
      }
    }

    let totalCoverage = 0, totalPremium = 0;
    if (cat.category_type === 'insurance') {
      const coverageField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'sum_assured'", [cat.id]);
      const premiumField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'premium_amount'", [cat.id]);
      for (const item of items) {
        if (coverageField) {
          const v = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, coverageField.id]);
          totalCoverage += parseFloat(v?.value || 0);
        }
        if (premiumField) {
          const v = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, premiumField.id]);
          totalPremium += parseFloat(v?.value || 0);
        }
      }
    }

    let totalBalance = 0;
    if (cat.category_type === 'bank') {
      const balanceField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'balance'", [cat.id]);
      if (balanceField) {
        for (const item of items) {
          const v = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, balanceField.id]);
          totalBalance += parseFloat(v?.value || 0);
        }
      }
    }

    return {
      ...cat,
      item_count: items.length,
      total_invested: totalInvested,
      total_current: totalCurrent,
      total_returns: totalCurrent - totalInvested,
      returns_percent: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100) : 0,
      total_coverage: totalCoverage,
      total_premium: totalPremium,
      total_balance: totalBalance,
    };
  });

  // Monthly net worth trend
  const monthlyTrend = queryAll(`
    SELECT ms.month, SUM(ms.invested_value) as total_invested, SUM(ms.current_value) as total_current
    FROM monthly_snapshots ms
    JOIN items i ON i.id = ms.item_id
    WHERE i.user_id = ?
    GROUP BY ms.month
    ORDER BY ms.month ASC
  `, [userId]);

  // Upcoming due dates
  const upcoming = [];
  const insuranceCats = categories.filter(c => c.category_type === 'insurance');
  for (const cat of insuranceCats) {
    const dueDateField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'premium_due_date'", [cat.id]);
    const premiumField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'premium_amount'", [cat.id]);
    if (dueDateField) {
      const catItems = queryAll('SELECT * FROM items WHERE category_id = ? AND user_id = ?', [cat.id, userId]);
      for (const item of catItems) {
        const dueDate = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, dueDateField.id]);
        const premium = premiumField ? queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, premiumField.id]) : null;
        if (dueDate?.value) {
          upcoming.push({
            name: item.name,
            category: cat.name,
            icon: cat.icon,
            due_date: dueDate.value,
            amount: premium?.value || '0',
          });
        }
      }
    }
  }

  res.json({ categories: dashboardData, monthly_trend: monthlyTrend, upcoming });
});

// ─── EXPORT ROUTE ────────────────────────────────────────────
app.get('/api/export', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const wb = XLSX.utils.book_new();
  const categories = queryAll('SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order', [userId]);

  // Summary sheet
  const summaryData = categories.map(cat => {
    const count = queryGet('SELECT COUNT(*) as cnt FROM items WHERE category_id = ? AND user_id = ?', [cat.id, userId]);
    return { Category: cat.name, Type: cat.category_type, Items: count?.cnt || 0 };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData.length ? summaryData : [{ Category: 'No data' }]), 'Summary');

  // Per-category sheets
  for (const cat of categories) {
    const fields = queryAll('SELECT * FROM field_definitions WHERE category_id = ? ORDER BY sort_order', [cat.id]);
    const items = queryAll('SELECT * FROM items WHERE category_id = ? AND user_id = ?', [cat.id, userId]);

    const rows = items.map(item => {
      const row = { Name: item.name };
      for (const field of fields) {
        const val = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [item.id, field.id]);
        row[field.field_label] = val?.value || '';
      }
      return row;
    });

    const sheetName = cat.name.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Name: 'No data yet' }]), sheetName);
  }

  // Monthly Trends sheet
  const allSnapshots = queryAll(`
    SELECT i.name, c.name as category, ms.month, ms.invested_value, ms.current_value, ms.notes
    FROM monthly_snapshots ms
    JOIN items i ON i.id = ms.item_id
    JOIN categories c ON c.id = i.category_id
    WHERE i.user_id = ?
    ORDER BY ms.month DESC, c.sort_order
  `, [userId]);

  if (allSnapshots.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allSnapshots.map(s => ({
      Category: s.category, Item: s.name, Month: s.month,
      'Invested Value': s.invested_value, 'Current Value': s.current_value, Notes: s.notes
    }))), 'Monthly Trends');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="WealthPulse_Export.xlsx"');
  res.send(Buffer.from(buf));
});

// ─── SEED HELPER FOR NEW USERS ───────────────────────────────
function seedCategoriesForUser(userId) {
  const defaultCategories = [
    { name: 'Stocks', slug: 'stocks', icon: '📊', type: 'investment', order: 1, fields: [
      ['broker','Broker','select',JSON.stringify(['Zerodha','Upstox','Groww','Angel One','ICICI Direct','HDFC Securities','Kotak Securities','Other']),1,0,1],
      ['invested_value','Invested Value (₹)','currency',null,1,0,1],
      ['current_value','Current Value (₹)','currency',null,1,0,1],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'ETFs', slug: 'etfs', icon: '🪙', type: 'investment', order: 2, fields: [
      ['fund_name','Fund/ETF Name','text',null,1,0,1],
      ['broker','Broker','select',JSON.stringify(['Zerodha','Upstox','Groww','Other']),1,0,1],
      ['invested_value','Invested Value (₹)','currency',null,1,0,1],
      ['current_value','Current Value (₹)','currency',null,1,0,1],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Mutual Funds', slug: 'mutual-funds', icon: '📈', type: 'investment', order: 3, fields: [
      ['platform','Platform/Broker','select',JSON.stringify(['Zerodha Coin','Groww','Kuvera','Paytm Money','MF Utility','AMC Direct','Other']),1,0,1],
      ['invested_value','Invested Value (₹)','currency',null,1,0,1],
      ['current_value','Current Value (₹)','currency',null,1,0,1],
      ['sip_amount','SIP Amount (₹)','currency',null,0,0,1],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'REITs', slug: 'reits', icon: '🏢', type: 'investment', order: 4, fields: [
      ['reit_name','REIT Name','text',null,1,0,1],['broker','Broker','select',JSON.stringify(['Zerodha','Upstox','Groww','Other']),1,0,1],
      ['invested_value','Invested Value (₹)','currency',null,1,0,1],['current_value','Current Value (₹)','currency',null,1,0,1],
      ['dividend_yield','Dividend Yield (%)','percent',null,0,0,1],['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'US Stocks', slug: 'us-stocks', icon: '🇺🇸', type: 'investment', order: 5, fields: [
      ['platform','Platform','select',JSON.stringify(['INDmoney','Vested','Groww','Other']),1,0,1],
      ['invested_value','Invested Value (₹)','currency',null,1,0,1],['current_value','Current Value (₹)','currency',null,1,0,1],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Unlisted Stocks', slug: 'unlisted-stocks', icon: '🔒', type: 'investment', order: 6, fields: [
      ['company','Company Name','text',null,1,0,1],['source','Source/Platform','text',null,0,0,1],
      ['invested_value','Invested Value (₹)','currency',null,1,0,1],['current_value','Current Valuation (₹)','currency',null,1,0,1],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Credit Cards', slug: 'credit-cards', icon: '💳', type: 'credit_card', order: 7, fields: [
      ['card_name','Card Name','text',null,1,0,1],['bank','Bank','text',null,1,0,1],['card_number','Card Number','text',null,0,1,0],
      ['card_type','Type','text',null,0,0,1],['credit_limit','Credit Limit (₹)','currency',null,0,0,1],
      ['annual_fee','Annual Fee (₹)','currency',null,0,0,1],['fee_waiver','Fee Waiver Condition','text',null,0,0,1],
      ['reward_expiry','Reward Expiry','text',null,0,0,1],['reward_value','Reward Value','text',null,0,0,1],
      ['min_redemption_points','Min Points for Redemption','text',null,0,0,1],['capped_per_month','Capped Per Month','text',null,0,0,1],
      ['best_category','Best Category','text',null,0,0,1],['lounge_access','Lounge Access','text',null,0,0,1],
      ['fuel_waiver','Fuel Waiver','text',null,0,0,0],['upi_rewards','UPI Rewards','text',null,0,0,0],
      ['bonus','Bonus','text',null,0,0,0],['renewal_month','Renewal Month','text',null,0,0,1],
      ['billing_cycle','Billing Cycle','text',null,0,0,1],['payment_date','Payment Date','text',null,0,0,1],
      ['expiry','Card Expiry','text',null,0,1,0],['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Term Insurance', slug: 'term-insurance', icon: '🛡️', type: 'insurance', order: 8, fields: [
      ['policy_name','Policy Name','text',null,1,0,1],['insurer','Insurer','text',null,1,0,1],['policy_no','Policy Number','text',null,0,0,0],
      ['sum_assured','Sum Assured (₹)','currency',null,1,0,1],['premium_amount','Premium Amount (₹)','currency',null,1,0,1],
      ['premium_frequency','Premium Frequency','select',JSON.stringify(['Monthly','Quarterly','Half-Yearly','Yearly']),0,0,1],
      ['premium_due_date','Premium Due Date','date',null,0,0,1],['policy_start','Policy Start Date','date',null,0,0,0],
      ['policy_end','Policy End Date','date',null,0,0,0],['nominee','Nominee','text',null,0,0,0],['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Life Insurance', slug: 'life-insurance', icon: '❤️', type: 'insurance', order: 9, fields: [
      ['policy_name','Policy Name','text',null,1,0,1],['insurer','Insurer','text',null,1,0,1],['policy_no','Policy Number','text',null,0,0,0],
      ['sum_assured','Sum Assured (₹)','currency',null,1,0,1],['premium_amount','Premium Amount (₹)','currency',null,1,0,1],
      ['maturity_value','Maturity Value (₹)','currency',null,0,0,1],
      ['premium_frequency','Premium Frequency','select',JSON.stringify(['Monthly','Quarterly','Half-Yearly','Yearly']),0,0,1],
      ['premium_due_date','Premium Due Date','date',null,0,0,1],['policy_start','Policy Start Date','date',null,0,0,0],
      ['maturity_date','Maturity Date','date',null,0,0,0],['nominee','Nominee','text',null,0,0,0],['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Bank Accounts', slug: 'bank-accounts', icon: '🏦', type: 'bank', order: 10, fields: [
      ['bank_name','Bank Name','text',null,1,0,1],['account_no','Account Number','text',null,0,1,1],
      ['ifsc','IFSC Code','text',null,0,0,0],['branch','Branch','text',null,0,0,0],
      ['account_type','Account Type','select',JSON.stringify(['Savings','Current','Salary','NRI','FD','Other']),0,0,1],
      ['balance','Balance (₹)','currency',null,0,0,1],['net_banking_id','Net Banking ID','text',null,0,1,0],
      ['net_banking_password','Net Banking Password','text',null,0,1,0],['upi_id','UPI ID','text',null,0,0,0],
      ['debit_card_no','Debit Card Number','text',null,0,1,0],['notes','Notes','text',null,0,0,0],
    ]},
  ];

  for (const cat of defaultCategories) {
    const { lastId: catId } = runStmt(
      'INSERT INTO categories (user_id, name, slug, icon, category_type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, cat.name, cat.slug, cat.icon, cat.type, cat.order]
    );
    cat.fields.forEach((f, i) => {
      runStmt(
        'INSERT INTO field_definitions (category_id, field_name, field_label, field_type, options, is_required, is_sensitive, is_visible_in_summary, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [catId, f[0], f[1], f[2], f[3], f[4], f[5], f[6], i]
      );
    });
  }
}

function recordAutoSnapshot(itemId, categoryId, values) {
  if (!values) return;
  
  const investedField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'invested_value'", [categoryId]);
  const currentField = queryGet("SELECT id FROM field_definitions WHERE category_id = ? AND field_name = 'current_value'", [categoryId]);
  
  if (!investedField && !currentField) return;
  
  let invested = 0;
  let current = 0;
  let hasValue = false;
  
  if (investedField && values[investedField.id] !== undefined) {
    invested = parseFloat(values[investedField.id]) || 0;
    hasValue = true;
  } else if (investedField) {
    const val = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [itemId, investedField.id]);
    invested = parseFloat(val?.value || 0);
  }

  if (currentField && values[currentField.id] !== undefined) {
    current = parseFloat(values[currentField.id]) || 0;
    hasValue = true;
  } else if (currentField) {
    const val = queryGet('SELECT value FROM item_values WHERE item_id = ? AND field_id = ?', [itemId, currentField.id]);
    current = parseFloat(val?.value || 0);
  }

  if (!hasValue) return;
  
  const date = new Date();
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  const existing = queryGet('SELECT id FROM monthly_snapshots WHERE item_id = ? AND month = ?', [itemId, month]);
  if (existing) {
    runStmt('UPDATE monthly_snapshots SET invested_value = ?, current_value = ?, recorded_at = CURRENT_TIMESTAMP WHERE id = ?',
      [invested, current, existing.id]);
  } else {
    runStmt('INSERT INTO monthly_snapshots (item_id, month, invested_value, current_value, notes) VALUES (?, ?, ?, ?, ?)',
      [itemId, month, invested, current, 'Auto-recorded']);
  }
}

// ─── START SERVER ────────────────────────────────────────────
async function start() {
  await initDB();
  runStmt("UPDATE categories SET icon = 'ChartPie' WHERE name = 'Mutual Funds'");
  app.listen(PORT, () => {
    console.log(`🚀 WealthPulse API running at http://localhost:${PORT}`);
  });
}

start();
