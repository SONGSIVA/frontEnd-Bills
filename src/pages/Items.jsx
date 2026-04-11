import { useEffect, useState } from 'react'
import { getItems, createItem, updateItem, deleteItem } from '../api/client'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { item_code: '', item_name: '', unit_price: '', description: '' }

export default function Items() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = () => getItems().then(r => setItems(r.data))
  useEffect(() => { load() }, [])

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    i.item_code.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setForm({ item_code: item.item_code, item_name: item.item_name, unit_price: item.unit_price, description: item.description || '' })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(emptyForm) }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.item_code || !form.item_name || !form.unit_price) {
      toast.error('Item code, name and unit price are required'); return
    }
    setLoading(true)
    try {
      const payload = { ...form, unit_price: parseFloat(form.unit_price) }
      if (editItem) {
        await updateItem(editItem.id, { item_name: payload.item_name, unit_price: payload.unit_price, description: payload.description })
        toast.success('Item updated')
      } else {
        await createItem(payload)
        toast.success('Item added')
      }
      closeModal(); load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error saving item')
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return
    try { await deleteItem(id); toast.success('Item deleted'); load() }
    catch { toast.error('Failed to delete item') }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Items</h1>
        <p>Manage your product and service catalogue</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card">
          <div className="label">Total Items</div>
          <div className="value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg. Unit Price</div>
          <div className="value">
            ₹{items.length ? (items.reduce((s, i) => s + i.unit_price, 0) / items.length).toFixed(2) : '0.00'}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Highest Price</div>
          <div className="value">
            ₹{items.length ? Math.max(...items.map(i => i.unit_price)).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Item
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Unit Price</th><th>Description</th><th>Added On</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <Package size={40} />
                    <p>{search ? 'No items match your search' : 'No items yet. Add your first item!'}</p>
                  </div>
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td><span className="badge badge-blue">{item.item_code}</span></td>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td>₹{item.unit_price.toFixed(2)}</td>
                  <td style={{ color: '#64748b', maxWidth: 200 }}>{item.description || '—'}</td>
                  <td style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(item.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="btn btn-outline btn-sm" onClick={closeModal}>✕</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Item Code *</label>
                <input name="item_code" value={form.item_code} onChange={handleChange}
                  placeholder="e.g. PROD-001" disabled={!!editItem} />
              </div>
              <div className="form-group">
                <label>Item Name *</label>
                <input name="item_name" value={form.item_name} onChange={handleChange} placeholder="e.g. Laptop Stand" />
              </div>
              <div className="form-group">
                <label>Unit Price (₹) *</label>
                <input name="unit_price" type="number" min="0" step="0.01"
                  value={form.unit_price} onChange={handleChange} placeholder="0.00" />
              </div>
              <div className="form-group full">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  placeholder="Optional product description…" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving…' : editItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
