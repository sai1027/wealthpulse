import { initDB, queryAll, queryGet, runStmt } from './db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  await initDB();

  // Check if already seeded
  const existing = queryGet('SELECT COUNT(*) as count FROM users');
  if (existing && existing.count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  // Create default admin user
  const hash = bcrypt.hashSync('admin', 10);
  const { lastId: userId } = runStmt(
    'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
    ['admin', 'Admin', hash]
  );

  seedCategoriesForUser(userId);

  console.log('✅ Database seeded successfully!');
  console.log('   Default login: admin / admin');
}

function seedCategoriesForUser(userId) {
  const defaultCategories = [
    { name: 'Stocks', slug: 'stocks', icon: '📊', type: 'investment', order: 1, fields: [
      ['broker', 'Broker', 'select', JSON.stringify(['Zerodha','Upstox','Groww','Angel One','ICICI Direct','HDFC Securities','Kotak Securities','Other']), 1,0,1],
      ['invested_value', 'Invested Value (₹)', 'currency', null, 1,0,1],
      ['current_value', 'Current Value (₹)', 'currency', null, 1,0,1],
      ['notes', 'Notes', 'text', null, 0,0,0],
    ]},
    { name: 'ETFs', slug: 'etfs', icon: '🪙', type: 'investment', order: 2, fields: [
      ['fund_name', 'Fund/ETF Name', 'text', null, 1,0,1],
      ['broker', 'Broker', 'select', JSON.stringify(['Zerodha','Upstox','Groww','Angel One','ICICI Direct','Kotak Securities','Other']), 1,0,1],
      ['invested_value', 'Invested Value (₹)', 'currency', null, 1,0,1],
      ['current_value', 'Current Value (₹)', 'currency', null, 1,0,1],
      ['notes', 'Notes', 'text', null, 0,0,0],
    ]},
    { name: 'Mutual Funds', slug: 'mutual-funds', icon: '📈', type: 'investment', order: 3, fields: [
      ['platform', 'Platform/Broker', 'select', JSON.stringify(['Zerodha Coin','Groww','Kuvera','Paytm Money','MF Utility','AMC Direct','Other']), 1,0,1],
      ['invested_value', 'Invested Value (₹)', 'currency', null, 1,0,1],
      ['current_value', 'Current Value (₹)', 'currency', null, 1,0,1],
      ['sip_amount', 'SIP Amount (₹)', 'currency', null, 0,0,1],
      ['notes', 'Notes', 'text', null, 0,0,0],
    ]},
    { name: 'REITs', slug: 'reits', icon: '🏢', type: 'investment', order: 4, fields: [
      ['reit_name', 'REIT Name', 'text', null, 1,0,1],
      ['broker', 'Broker', 'select', JSON.stringify(['Zerodha','Upstox','Groww','Other']), 1,0,1],
      ['invested_value', 'Invested Value (₹)', 'currency', null, 1,0,1],
      ['current_value', 'Current Value (₹)', 'currency', null, 1,0,1],
      ['dividend_yield', 'Dividend Yield (%)', 'percent', null, 0,0,1],
      ['notes', 'Notes', 'text', null, 0,0,0],
    ]},
    { name: 'US Stocks', slug: 'us-stocks', icon: '🇺🇸', type: 'investment', order: 5, fields: [
      ['platform', 'Platform', 'select', JSON.stringify(['INDmoney','Vested','Groww','Other']), 1,0,1],
      ['invested_value', 'Invested Value (₹)', 'currency', null, 1,0,1],
      ['current_value', 'Current Value (₹)', 'currency', null, 1,0,1],
      ['notes', 'Notes', 'text', null, 0,0,0],
    ]},
    { name: 'Unlisted Stocks', slug: 'unlisted-stocks', icon: '🔒', type: 'investment', order: 6, fields: [
      ['company', 'Company Name', 'text', null, 1,0,1],
      ['source', 'Source/Platform', 'text', null, 0,0,1],
      ['invested_value', 'Invested Value (₹)', 'currency', null, 1,0,1],
      ['current_value', 'Current Valuation (₹)', 'currency', null, 1,0,1],
      ['notes', 'Notes', 'text', null, 0,0,0],
    ]},
    { name: 'Credit Cards', slug: 'credit-cards', icon: '💳', type: 'credit_card', order: 7, fields: [
      ['card_name','Card Name','text',null,1,0,1],
      ['bank','Bank','text',null,1,0,1],
      ['card_number','Card Number','text',null,0,1,0],
      ['card_type','Type','text',null,0,0,1],
      ['credit_limit','Credit Limit (₹)','currency',null,0,0,1],
      ['annual_fee','Annual Fee (₹)','currency',null,0,0,1],
      ['fee_waiver','Fee Waiver Condition','text',null,0,0,1],
      ['reward_expiry','Reward Expiry','text',null,0,0,1],
      ['reward_value','Reward Value','text',null,0,0,1],
      ['min_redemption_points','Min Points for Redemption','text',null,0,0,1],
      ['redemption_fee','Reward Redemption Fee','text',null,0,0,0],
      ['capped_per_month','Capped Per Month','text',null,0,0,1],
      ['best_category','Best Category','text',null,0,0,1],
      ['lounge_access','Lounge Access','text',null,0,0,1],
      ['fuel_waiver','Fuel Waiver','text',null,0,0,0],
      ['upi_rewards','UPI Rewards','text',null,0,0,0],
      ['bonus','Bonus','text',null,0,0,0],
      ['preferred_platform','Preferred Platform','text',null,0,0,0],
      ['specific_platform','Specific Platform','text',null,0,0,0],
      ['cash_withdraw','Cash Withdraw','text',null,0,0,0],
      ['email','Email','text',null,0,0,0],
      ['toll_free','Toll Free Number','text',null,0,0,0],
      ['renewal_month','Renewal Month','text',null,0,0,1],
      ['exclusions','Exclusions','text',null,0,0,0],
      ['billing_cycle','Billing Cycle','text',null,0,0,1],
      ['payment_date','Payment Date','text',null,0,0,1],
      ['expiry','Card Expiry','text',null,0,1,0],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Term Insurance', slug: 'term-insurance', icon: '🛡️', type: 'insurance', order: 8, fields: [
      ['policy_name','Policy Name','text',null,1,0,1],
      ['insurer','Insurer','text',null,1,0,1],
      ['policy_no','Policy Number','text',null,0,0,0],
      ['sum_assured','Sum Assured (₹)','currency',null,1,0,1],
      ['premium_amount','Premium Amount (₹)','currency',null,1,0,1],
      ['premium_frequency','Premium Frequency','select',JSON.stringify(['Monthly','Quarterly','Half-Yearly','Yearly']),0,0,1],
      ['premium_due_date','Premium Due Date','date',null,0,0,1],
      ['policy_start','Policy Start Date','date',null,0,0,0],
      ['policy_end','Policy End Date','date',null,0,0,0],
      ['nominee','Nominee','text',null,0,0,0],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Life Insurance', slug: 'life-insurance', icon: '❤️', type: 'insurance', order: 9, fields: [
      ['policy_name','Policy Name','text',null,1,0,1],
      ['insurer','Insurer','text',null,1,0,1],
      ['policy_no','Policy Number','text',null,0,0,0],
      ['sum_assured','Sum Assured (₹)','currency',null,1,0,1],
      ['premium_amount','Premium Amount (₹)','currency',null,1,0,1],
      ['maturity_value','Maturity Value (₹)','currency',null,0,0,1],
      ['premium_frequency','Premium Frequency','select',JSON.stringify(['Monthly','Quarterly','Half-Yearly','Yearly']),0,0,1],
      ['premium_due_date','Premium Due Date','date',null,0,0,1],
      ['policy_start','Policy Start Date','date',null,0,0,0],
      ['maturity_date','Maturity Date','date',null,0,0,0],
      ['nominee','Nominee','text',null,0,0,0],
      ['notes','Notes','text',null,0,0,0],
    ]},
    { name: 'Bank Accounts', slug: 'bank-accounts', icon: '🏦', type: 'bank', order: 10, fields: [
      ['bank_name','Bank Name','text',null,1,0,1],
      ['account_no','Account Number','text',null,0,1,1],
      ['ifsc','IFSC Code','text',null,0,0,0],
      ['branch','Branch','text',null,0,0,0],
      ['account_type','Account Type','select',JSON.stringify(['Savings','Current','Salary','NRI','FD','Other']),0,0,1],
      ['balance','Balance (₹)','currency',null,0,0,1],
      ['net_banking_id','Net Banking ID','text',null,0,1,0],
      ['net_banking_password','Net Banking Password','text',null,0,1,0],
      ['upi_id','UPI ID','text',null,0,0,0],
      ['debit_card_no','Debit Card Number','text',null,0,1,0],
      ['notes','Notes','text',null,0,0,0],
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

  console.log(`Seeded 10 categories with default fields for user ${userId}`);
}

export { seedCategoriesForUser };
seed();
