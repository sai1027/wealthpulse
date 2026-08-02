import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatCurrency, formatCurrencyFull, formatPercent, getCurrentMonth } from '../api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, BarElement);

export default function CategoryPage({ categories }) {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [fields, setFields] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [revealedFields, setRevealedFields] = useState({});

  const category = categories.find(c => c.slug === slug);

  useEffect(() => {
    if (category) {
      loadData();
    }
  }, [category?.id]);

  const loadData = async () => {
    if (!category) return;
    const [fieldsData, itemsData] = await Promise.all([
      api.getFields(category.id),
      api.getItems(category.id),
    ]);
    setFields(fieldsData);
    setItems(itemsData);
  };

  const summaryFields = fields.filter(f => f.is_visible_in_summary);

  // Calculate totals for investment categories
  const isInvestment = category?.category_type === 'investment';
  const investedField = fields.find(f => f.field_name === 'invested_value');
  const currentField = fields.find(f => f.field_name === 'current_value');

  const totalInvested = isInvestment ? items.reduce((s, item) => {
    return s + parseFloat(item.values?.invested_value?.value || 0);
  }, 0) : 0;

  const totalCurrent = isInvestment ? items.reduce((s, item) => {
    return s + parseFloat(item.values?.current_value?.value || 0);
  }, 0) : 0;

  const totalReturns = totalCurrent - totalInvested;
  const returnsPercent = totalInvested > 0 ? (totalReturns / totalInvested * 100) : 0;

  // Broker/platform breakdown
  const brokerField = fields.find(f => f.field_name === 'broker' || f.field_name === 'platform');
  const brokerBreakdown = useMemo(() => {
    if (!brokerField || !isInvestment) return [];
    const map = {};
    items.forEach(item => {
      const broker = item.values?.[brokerField.field_name]?.value || 'Unknown';
      if (!map[broker]) map[broker] = { name: broker, invested: 0, current: 0, count: 0 };
      map[broker].invested += parseFloat(item.values?.invested_value?.value || 0);
      map[broker].current += parseFloat(item.values?.current_value?.value || 0);
      map[broker].count++;
    });
    return Object.values(map);
  }, [items, brokerField]);

  // Insurance totals
  const isInsurance = category?.category_type === 'insurance';
  const totalCoverage = isInsurance ? items.reduce((s, item) => s + parseFloat(item.values?.sum_assured?.value || 0), 0) : 0;
  const totalPremium = isInsurance ? items.reduce((s, item) => s + parseFloat(item.values?.premium_amount?.value || 0), 0) : 0;

  // Bank totals
  const isBank = category?.category_type === 'bank';
  const totalBalance = isBank ? items.reduce((s, item) => s + parseFloat(item.values?.balance?.value || 0), 0) : 0;

  const toggleReveal = (key) => {
    setRevealedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderValue = (item, field) => {
    const val = item.values?.[field.field_name]?.value || '';
    if (!val) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    if (field.is_sensitive) {
      const key = `${item.id}-${field.id}`;
      const revealed = revealedFields[key];
      return (
        <span className="sensitive-field">
          <span className="sensitive-field-value">{revealed ? val : '••••••••'}</span>
          <span className="sensitive-field-toggle" onClick={(e) => { e.stopPropagation(); toggleReveal(key); }}>{revealed ? '🙈' : '👁'}</span>
        </span>
      );
    }
    if (field.field_type === 'currency') return formatCurrencyFull(val);
    if (field.field_type === 'percent') return `${val}%`;
    return val;
  };

  if (!category) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Category not found</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title"><span className="page-title-icon">{category.icon}</span> {category.name}</div>
          <div className="page-subtitle">{items.length} item{items.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowFieldManager(true)}>⚙ Fields</button>
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>+ Add {category.name.replace(/s$/, '')}</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Row */}
        {isInvestment && (
          <div className="grid-4 mb-24 animate-in">
            <div className="stat-card">
              <div className="stat-card-label">Portfolio Value</div>
              <div className="stat-card-value">{formatCurrency(totalCurrent)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Invested</div>
              <div className="stat-card-value">{formatCurrency(totalInvested)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Returns</div>
              <div className="stat-card-value" style={{ background: totalReturns >= 0 ? 'var(--gradient-green)' : 'var(--gradient-red)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {formatPercent(returnsPercent)}
              </div>
              <div className={`stat-card-sub ${totalReturns >= 0 ? 'returns-positive' : 'returns-negative'}`}>
                {totalReturns >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(totalReturns))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Holdings</div>
              <div className="stat-card-value">{items.length}</div>
            </div>
          </div>
        )}

        {isInsurance && (
          <div className="grid-3 mb-24 animate-in">
            <div className="stat-card">
              <div className="stat-card-label">Total Coverage</div>
              <div className="stat-card-value">{formatCurrency(totalCoverage)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Annual Premium</div>
              <div className="stat-card-value">{formatCurrency(totalPremium)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Policies</div>
              <div className="stat-card-value">{items.length}</div>
            </div>
          </div>
        )}

        {isBank && (
          <div className="grid-3 mb-24 animate-in">
            <div className="stat-card">
              <div className="stat-card-label">Total Balance</div>
              <div className="stat-card-value">{formatCurrency(totalBalance)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Accounts</div>
              <div className="stat-card-value">{items.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Banks</div>
              <div className="stat-card-value">{new Set(items.map(i => i.values?.bank_name?.value).filter(Boolean)).size}</div>
            </div>
          </div>
        )}

        {/* Broker Breakdown */}
        {isInvestment && brokerBreakdown.length > 0 && (
          <div className="mb-24">
            <div className="section-header"><div className="section-title">📊 Broker Breakdown</div></div>
            <div className="grid-auto">
              {brokerBreakdown.map(b => (
                <div key={b.name} className="card">
                  <div className="card-title">{b.name}</div>
                  <div className="card-value">{formatCurrency(b.current)}</div>
                  <div className="card-subvalue">
                    <span style={{ color: 'var(--text-muted)' }}>Invested: {formatCurrency(b.invested)}</span>
                  </div>
                  <div className={`card-subvalue ${b.current - b.invested >= 0 ? 'returns-positive' : 'returns-negative'}`}>
                    {b.invested > 0 ? formatPercent((b.current - b.invested) / b.invested * 100) : '—'} · {b.count} items
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        {items.length > 0 ? (
          <div className="data-table-container animate-in">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {summaryFields.map(f => <th key={f.id}>{f.field_label}</th>)}
                  {isInvestment && <th>Returns</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const inv = parseFloat(item.values?.invested_value?.value || 0);
                  const cur = parseFloat(item.values?.current_value?.value || 0);
                  const ret = cur - inv;
                  const retPct = inv > 0 ? (ret / inv * 100) : 0;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      {summaryFields.map(f => <td key={f.id}>{renderValue(item, f)}</td>)}
                      {isInvestment && (
                        <td>
                          <span className={ret >= 0 ? 'returns-positive' : 'returns-negative'}>
                            {formatPercent(retPct)} <span style={{ fontSize: 11 }}>({formatCurrency(Math.abs(ret))})</span>
                          </span>
                        </td>
                      )}
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItem(item); setShowModal(true); }}>✏️</button>
                          {isInvestment && (
                            <button className="btn btn-ghost btn-sm" onClick={async () => {
                              const snaps = await api.getSnapshots(item.id);
                              setSnapshots(snaps);
                              setShowSnapshotModal(item);
                            }}>📊</button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={async () => {
                            if (confirm(`Delete "${item.name}"?`)) {
                              await api.deleteItem(item.id);
                              loadData();
                            }
                          }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">{category.icon}</div>
              <div className="empty-state-title">No {category.name.toLowerCase()} added yet</div>
              <div className="empty-state-text">Click the button above to add your first entry</div>
              <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>+ Add {category.name.replace(/s$/, '')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ItemModal
          category={category}
          fields={fields}
          item={editingItem}
          onClose={() => setShowModal(false)}
          onSave={async () => { await loadData(); setShowModal(false); }}
        />
      )}

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <SnapshotModal
          item={showSnapshotModal}
          snapshots={snapshots}
          onClose={() => setShowSnapshotModal(null)}
          onSave={async () => {
            const snaps = await api.getSnapshots(showSnapshotModal.id);
            setSnapshots(snaps);
          }}
        />
      )}

      {/* Field Manager Modal */}
      {showFieldManager && (
        <FieldManagerModal
          category={category}
          fields={fields}
          onClose={() => setShowFieldManager(false)}
          onSave={async () => { await loadData(); }}
        />
      )}
    </>
  );
}

// ─── ITEM MODAL ──────────────────────────────────────────────
function ItemModal({ category, fields, item, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '');
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      const v = {};
      fields.forEach(f => {
        const fieldVal = item.values?.[f.field_name];
        if (fieldVal) v[f.id] = fieldVal.value;
      });
      setValues(v);
    }
  }, [item, fields]);

  const handleChange = (fieldId, val) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (item) {
        await api.updateItem(item.id, { name, values });
      } else {
        await api.createItem({ category_id: category.id, name, values });
      }
      await onSave();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{item ? 'Edit' : 'Add'} {category.name.replace(/s$/, '')}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={`Enter name`} required autoFocus />
            </div>
            {fields.map(f => {
              let options = [];
              try { options = f.options ? JSON.parse(f.options) : []; } catch(e) {}
              
              return (
                <div key={f.id} className="input-group">
                  <label className="input-label">{f.field_label}{f.is_required ? ' *' : ''}</label>
                  {f.field_type === 'select' && options.length > 0 ? (
                    <select className="input" value={values[f.id] || ''} onChange={e => handleChange(f.id, e.target.value)} required={!!f.is_required}>
                      <option value="">Select...</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={f.field_type === 'currency' || f.field_type === 'number' || f.field_type === 'percent' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                      step={f.field_type === 'currency' || f.field_type === 'percent' ? '0.01' : undefined}
                      value={values[f.id] || ''}
                      onChange={e => handleChange(f.id, e.target.value)}
                      placeholder={f.field_label}
                      required={!!f.is_required}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (item ? 'Update' : 'Add')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SNAPSHOT MODAL ──────────────────────────────────────────
function SnapshotModal({ item, snapshots, onClose, onSave }) {
  const [month, setMonth] = useState(getCurrentMonth());
  const [investedValue, setInvestedValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await api.createSnapshot({ item_id: item.id, month, invested_value: parseFloat(investedValue) || 0, current_value: parseFloat(currentValue) || 0, notes });
    setInvestedValue('');
    setCurrentValue('');
    setNotes('');
    await onSave();
    setSaving(false);
  };

  const chartData = {
    labels: [...snapshots].reverse().map(s => {
      const [y, m] = s.month.split('-');
      return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      { label: 'Current Value', data: [...snapshots].reverse().map(s => s.current_value), borderColor: '#6c5ce7', backgroundColor: 'rgba(108,92,231,0.1)', fill: true, tension: 0.4 },
      { label: 'Invested', data: [...snapshots].reverse().map(s => s.invested_value), borderColor: '#00cec9', backgroundColor: 'rgba(0,206,201,0.05)', fill: true, tension: 0.4, borderDash: [5, 5] },
    ]
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📊 Monthly Snapshots — {item.name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {snapshots.length > 1 && (
            <div style={{ height: 200 }}>
              <Line data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#5a5a78', font: { size: 10 } } },
                  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#5a5a78', font: { size: 10 }, callback: v => formatCurrency(v) } }
                },
                plugins: { legend: { labels: { color: '#9898b0', font: { size: 11 }, usePointStyle: true } } }
              }} />
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="section-title mt-16 mb-16">Record Monthly Value</div>
            <div className="grid-3 gap-12">
              <div className="input-group">
                <label className="input-label">Month</label>
                <input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Invested (₹)</label>
                <input className="input" type="number" step="0.01" value={investedValue} onChange={e => setInvestedValue(e.target.value)} placeholder="0" />
              </div>
              <div className="input-group">
                <label className="input-label">Current Value (₹)</label>
                <input className="input" type="number" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="input-group mt-8">
              <label className="input-label">Notes</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            <button type="submit" className="btn btn-primary mt-16" disabled={saving}>{saving ? 'Saving...' : 'Save Snapshot'}</button>
          </form>

          {snapshots.length > 0 && (
            <>
              <div className="section-title mt-24">History</div>
              {snapshots.map(s => (
                <div key={s.id} className="snapshot-item">
                  <div className="snapshot-month">{s.month}</div>
                  <div className="snapshot-values">
                    <div><span className="snapshot-label">Invested:</span> {formatCurrencyFull(s.invested_value)}</div>
                    <div><span className="snapshot-label">Current:</span> {formatCurrencyFull(s.current_value)}</div>
                    <div className={s.current_value >= s.invested_value ? 'returns-positive' : 'returns-negative'}>
                      {s.invested_value > 0 ? formatPercent((s.current_value - s.invested_value) / s.invested_value * 100) : '—'}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={async () => {
                    if (confirm('Delete this snapshot?')) { await api.deleteSnapshot(s.id); await onSave(); }
                  }}>🗑</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FIELD MANAGER MODAL ─────────────────────────────────────
function FieldManagerModal({ category, fields, onClose, onSave }) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddField = async (e) => {
    e.preventDefault();
    const fieldName = newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    await api.createField({
      category_id: category.id,
      field_name: fieldName,
      field_label: newFieldLabel,
      field_type: newFieldType,
      is_visible_in_summary: true,
    });
    setNewFieldLabel('');
    setNewFieldType('text');
    setShowAddForm(false);
    await onSave();
  };

  const handleDeleteField = async (fieldId) => {
    if (confirm('Delete this field? All values for this field will be removed.')) {
      await api.deleteField(fieldId);
      await onSave();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">⚙ Manage Fields — {category.name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {fields.map(f => (
            <div key={f.id} className="field-item">
              <span className="field-item-drag">☰</span>
              <span className="field-item-name">{f.field_label}</span>
              <span className="field-item-type">{f.field_type}</span>
              {f.is_required ? <span className="badge badge-primary">Required</span> : null}
              {f.is_sensitive ? <span className="badge badge-gold">Sensitive</span> : null}
              <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteField(f.id)} title="Delete field">🗑</button>
            </div>
          ))}

          {showAddForm ? (
            <form onSubmit={handleAddField} style={{ marginTop: 16 }}>
              <div className="grid-2 gap-12">
                <div className="input-group">
                  <label className="input-label">Field Label</label>
                  <input className="input" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="e.g., Dividend Yield" required autoFocus />
                </div>
                <div className="input-group">
                  <label className="input-label">Field Type</label>
                  <select className="input" value={newFieldType} onChange={e => setNewFieldType(e.target.value)}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency (₹)</option>
                    <option value="percent">Percent (%)</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-8 mt-16">
                <button type="submit" className="btn btn-primary btn-sm">Add Field</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-secondary w-full mt-16" onClick={() => setShowAddForm(true)}>+ Add New Field</button>
          )}
        </div>
      </div>
    </div>
  );
}
