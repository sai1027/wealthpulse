import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth, useTheme } from '../App';

export default function SettingsPage({ categories, onRefresh }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedCat, setSelectedCat] = useState(null);
  const [fields, setFields] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');
  const [newCatType, setNewCatType] = useState('custom');
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    if (selectedCat) {
      api.getFields(selectedCat.id).then(setFields);
    }
  }, [selectedCat?.id]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0]);
    }
  }, [categories]);

  const loadFields = async () => {
    if (selectedCat) {
      const f = await api.getFields(selectedCat.id);
      setFields(f);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    await api.createCategory({ name: newCatName, slug, icon: newCatIcon, category_type: newCatType });
    setNewCatName('');
    setNewCatIcon('📁');
    setShowAddCategory(false);
    await onRefresh();
  };

  const handleDeleteCategory = async (cat) => {
    if (confirm(`Delete "${cat.name}" and all its data? This cannot be undone.`)) {
      await api.deleteCategory(cat.id);
      if (selectedCat?.id === cat.id) setSelectedCat(null);
      await onRefresh();
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    const fieldName = newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    await api.createField({
      category_id: selectedCat.id,
      field_name: fieldName,
      field_label: newFieldLabel,
      field_type: newFieldType,
      is_visible_in_summary: true,
    });
    setNewFieldLabel('');
    setNewFieldType('text');
    setShowAddField(false);
    await loadFields();
  };

  const handleDeleteField = async (fieldId) => {
    if (confirm('Delete this field and all its values?')) {
      await api.deleteField(fieldId);
      await loadFields();
    }
  };

  const handleToggleVisibility = async (field) => {
    await api.updateField(field.id, { is_visible_in_summary: !field.is_visible_in_summary });
    await loadFields();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.changePassword(currentPwd, newPwd);
      setPwdMsg('Password changed successfully!');
      setCurrentPwd('');
      setNewPwd('');
      setTimeout(() => setPwdMsg(''), 3000);
    } catch (err) {
      setPwdMsg(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title"><span className="page-title-icon">⚙️</span> Settings</div>
          <div className="page-subtitle">Manage categories, fields & account</div>
        </div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr', gap: 24 }}>
          {/* Left: Settings List */}
          <div>
            <div className="section-header">
              <div className="section-title">Appearance</div>
            </div>
            <div className="card mb-24" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ fontWeight: 600 }}>Dark Mode</div>
              <button className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleTheme}>
                {theme === 'dark' ? '🌙 On' : '☀️ Off'}
              </button>
            </div>

            <div className="section-header">
              <div className="section-title">Categories</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCategory(!showAddCategory)}>+</button>
            </div>

            {showAddCategory && (
              <form onSubmit={handleAddCategory} className="card mb-16">
                <div className="input-group mb-16">
                  <label className="input-label">Name</label>
                  <input className="input" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" required autoFocus />
                </div>
                <div className="grid-2 gap-12 mb-16">
                  <div className="input-group">
                    <label className="input-label">Icon</label>
                    <input className="input" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} placeholder="📁" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Type</label>
                    <select className="input" value={newCatType} onChange={e => setNewCatType(e.target.value)}>
                      <option value="investment">Investment</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="insurance">Insurance</option>
                      <option value="bank">Bank</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-8">
                  <button type="submit" className="btn btn-primary btn-sm">Create</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddCategory(false)}>Cancel</button>
                </div>
              </form>
            )}

            {categories.map(cat => (
              <div
                key={cat.id}
                className={`field-item ${selectedCat?.id === cat.id ? 'active' : ''}`}
                style={{
                  cursor: 'pointer',
                  background: selectedCat?.id === cat.id ? 'var(--primary-glow)' : undefined,
                  borderColor: selectedCat?.id === cat.id ? 'var(--border-active)' : undefined,
                }}
                onClick={() => setSelectedCat(cat)}
              >
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span className="field-item-name">{cat.name}</span>
                <span className="field-item-type">{cat.category_type}</span>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }} title="Delete category">🗑</button>
              </div>
            ))}
          </div>

          {/* Right: Fields for selected category */}
          <div>
            {selectedCat ? (
              <>
                <div className="section-header">
                  <div className="section-title">{selectedCat.icon} {selectedCat.name} — Fields</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddField(!showAddField)}>+ Add Field</button>
                </div>

                {showAddField && (
                  <form onSubmit={handleAddField} className="card mb-16">
                    <div className="grid-2 gap-12">
                      <div className="input-group">
                        <label className="input-label">Field Label</label>
                        <input className="input" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="e.g., Target Price" required autoFocus />
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
                      <button type="submit" className="btn btn-primary btn-sm">Add</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddField(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {fields.length > 0 ? (
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Type</th>
                          <th>Required</th>
                          <th>Sensitive</th>
                          <th>In Summary</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map(f => (
                          <tr key={f.id}>
                            <td style={{ fontWeight: 600 }}>{f.field_label}</td>
                            <td><span className="field-item-type">{f.field_type}</span></td>
                            <td>{f.is_required ? '✓' : '—'}</td>
                            <td>{f.is_sensitive ? <span className="badge badge-gold">Yes</span> : '—'}</td>
                            <td>
                              <button className={`btn btn-sm ${f.is_visible_in_summary ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleToggleVisibility(f)} style={{ padding: '4px 10px' }}>
                                {f.is_visible_in_summary ? '👁 Visible' : '🙈 Hidden'}
                              </button>
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteField(f.id)}>🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-text">No fields defined. Add some above.</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">👈</div>
                  <div className="empty-state-title">Select a category</div>
                  <div className="empty-state-text">Click a category on the left to manage its fields</div>
                </div>
              </div>
            )}

            {/* Account Settings */}
            <div className="mt-24">
              <div className="section-header">
                <div className="section-title">🔑 Account</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 14, marginBottom: 16 }}>
                  <strong>Username:</strong> {user?.username} <br />
                  <strong>Display Name:</strong> {user?.display_name}
                </div>

                {showPasswordChange ? (
                  <form onSubmit={handlePasswordChange}>
                    <div className="grid-2 gap-12 mb-16">
                      <div className="input-group">
                        <label className="input-label">Current Password</label>
                        <input className="input" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">New Password</label>
                        <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required />
                      </div>
                    </div>
                    {pwdMsg && <div style={{ fontSize: 13, color: pwdMsg.includes('success') ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: 12 }}>{pwdMsg}</div>}
                    <div className="flex gap-8">
                      <button type="submit" className="btn btn-primary btn-sm">Change Password</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPasswordChange(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordChange(true)}>Change Password</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
