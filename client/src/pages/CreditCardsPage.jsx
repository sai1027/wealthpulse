import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatCurrencyFull } from '../api';

export default function CreditCardsPage({ categories }) {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [fields, setFields] = useState([]);
  const [view, setView] = useState('matrix');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showFieldManager, setShowFieldManager] = useState(false);

  const category = categories.find(c => c.slug === slug);

  useEffect(() => {
    if (category) loadData();
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

  // Fields to show in matrix (visible_in_summary ones)
  const matrixFields = fields.filter(f => f.is_visible_in_summary);

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
          <div className="page-title"><span className="page-title-icon">💳</span> {category.name}</div>
          <div className="page-subtitle">{items.length} card{items.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="page-header-actions">
          <div className="view-switcher">
            <button className={`view-switcher-btn ${view === 'matrix' ? 'active' : ''}`} onClick={() => setView('matrix')}>📋 Matrix</button>
            <button className={`view-switcher-btn ${view === 'cards' ? 'active' : ''}`} onClick={() => setView('cards')}>📇 Cards</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowFieldManager(true)}>⚙ Fields</button>
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>+ Add Card</button>
        </div>
      </div>

      <div className="page-body">
        {items.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">💳</div>
              <div className="empty-state-title">No credit cards added yet</div>
              <div className="empty-state-text">Add your first credit card to start comparing</div>
              <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>+ Add Card</button>
            </div>
          </div>
        ) : view === 'matrix' ? (
          /* MATRIX VIEW */
          <div className="matrix-container animate-in">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Field</th>
                  {items.map(item => (
                    <th key={item.id}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 24 }}>💳</span>
                        <span>{item.name}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => { setEditingItem(item); setShowModal(true); }}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={async () => {
                            if (confirm(`Delete "${item.name}"?`)) { await api.deleteItem(item.id); loadData(); }
                          }}>🗑</button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixFields.map(field => (
                  <tr key={field.id}>
                    <td>{field.field_label}</td>
                    {items.map(item => {
                      const val = item.values?.[field.field_name]?.value || '';
                      let display = val || <span style={{ color: 'var(--text-muted)' }}>—</span>;
                      if (field.field_type === 'currency' && val) {
                        display = formatCurrencyFull(val);
                      }
                      return <td key={item.id}>{display}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARDS VIEW */
          <div className="grid-auto animate-in">
            {items.map(item => (
              <div key={item.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.values?.bank?.value || ''}</div>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItem(item); setShowModal(true); }}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      if (confirm(`Delete "${item.name}"?`)) { await api.deleteItem(item.id); loadData(); }
                    }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {matrixFields.slice(0, 10).map(field => {
                    const val = item.values?.[field.field_name]?.value || '';
                    if (!val) return null;
                    return (
                      <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{field.field_label}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {field.field_type === 'currency' ? formatCurrencyFull(val) : val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <CardModal
          category={category}
          fields={fields}
          item={editingItem}
          onClose={() => setShowModal(false)}
          onSave={async () => { await loadData(); setShowModal(false); }}
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

// ─── CARD MODAL ──────────────────────────────────────────────
function CardModal({ category, fields, item, onClose, onSave }) {
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

  const handleChange = (fieldId, val) => setValues(prev => ({ ...prev, [fieldId]: val }));

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
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{item ? 'Edit' : 'Add'} Credit Card</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="input-group">
              <label className="input-label">Card Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., HDFC Regalia" required autoFocus />
            </div>
            <div className="grid-2 gap-16">
              {fields.map(f => {
                let options = [];
                try { options = f.options ? JSON.parse(f.options) : []; } catch(e) {}
                return (
                  <div key={f.id} className="input-group">
                    <label className="input-label">{f.field_label}</label>
                    {f.field_type === 'select' && options.length > 0 ? (
                      <select className="input" value={values[f.id] || ''} onChange={e => handleChange(f.id, e.target.value)}>
                        <option value="">Select...</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        className="input"
                        type={f.field_type === 'currency' || f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                        step={f.field_type === 'currency' ? '0.01' : undefined}
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
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (item ? 'Update' : 'Add Card')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── FIELD MANAGER MODAL ─────────────────────────────────────
function FieldManagerModal({ category, fields, onClose, onSave }) {
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
              {f.is_sensitive ? <span className="badge badge-gold">Sensitive</span> : null}
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                if (confirm('Delete this field?')) { await api.deleteField(f.id); await onSave(); }
              }} title="Delete">🗑</button>
            </div>
          ))}
          {showAddForm ? (
            <form onSubmit={handleAddField} style={{ marginTop: 16 }}>
              <div className="grid-2 gap-12">
                <div className="input-group">
                  <label className="input-label">Field Label</label>
                  <input className="input" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="e.g., Cashback Rate" required autoFocus />
                </div>
                <div className="input-group">
                  <label className="input-label">Field Type</label>
                  <select className="input" value={newFieldType} onChange={e => setNewFieldType(e.target.value)}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency (₹)</option>
                    <option value="percent">Percent (%)</option>
                    <option value="date">Date</option>
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
