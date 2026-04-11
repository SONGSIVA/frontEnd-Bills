import { useEffect, useState } from 'react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client'
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = {
  customer_id: '', customer_name: '', mobile: '',
  address: '', gst_no: '', postal_code: '',
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = () => getCustomers().then(r => setCustomers(r.data))
  useEffect(() => { load() }, [])

  const filtered = customers.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search)
  )

  const openAdd = () => { setEditCustomer(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c) => {
    setEditCustomer(c)
    setForm({
      customer_id: c.customer_id, customer_name: c.customer_name,
      mobile: c.mobile, address: c.address || '',
      gst_no: c.gst_no || '', postal_code: c.postal_code || '',
    })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditCustomer(null); setForm(emptyForm) }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.customer_id || !form.customer_name || !form.mobile) {
      toast.error('Customer ID, name and mobile are required'); return
    }
    setLoading(true)
    try {
      if (editCustomer) {
        await updateCustomer(editCustomer.id, {
          customer_name: form.customer_name, mobile: form.mobile,
          address: form.address, gst_no: form.gst_no, postal_code: form.postal_code,
        })
        toast.success('Customer updated')
      } else {
        await createCustomer(form)
        toast.success('Customer added')
      }
      closeModal(); load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error saving customer')
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return
    try { await deleteCustomer(id); toast.success('Customer deleted'); load() }
    catch { toast.error('Cannot delete — customer may have existing bills') }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage your customer database</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat-card">
          <div className="label">Total Customers</div>
          <div className="value">{customers.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">GST Registered</div>
          <div className="value">{customers.filter(c => c.gst_no).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input placeholder="Search by name, ID or mobile…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Customer
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer ID</th><th>Name</th><th>Mobile</th>
                <th>GST No</th><th>Postal Code</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <Users size={40} />
                    <p>{search ? 'No customers match your search' : 'No customers yet. Add your first customer!'}</p>
                  </div>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td><span className="badge badge-green">{c.customer_id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                    {c.address && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{c.address.substring(0, 40)}{c.address.length > 40 ? '…' : ''}</div>}
                  </td>
                  <td>{c.mobile}</td>
                  <td>{c.gst_no ? <span className="badge badge-blue">{c.gst_no}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td>{c.postal_code || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(c)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(c.id)}>
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
              <h2>{editCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="btn btn-outline btn-sm" onClick={closeModal}>✕</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Customer ID *</label>
                <input name="customer_id" value={form.customer_id} onChange={handleChange}
                  placeholder="e.g. CUST-001" disabled={!!editCustomer} />
              </div>
              <div className="form-group">
                <label>Customer Name *</label>
                <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="+91 9XXXXXXXXX" />
              </div>
              <div className="form-group">
                <label>GST Number</label>
                <input name="gst_no" value={form.gst_no} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="form-group">
                <label>Postal Code</label>
                <input name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="6-digit PIN" />
              </div>
              <div className="form-group full">
                <label>Address</label>
                <textarea name="address" value={form.address} onChange={handleChange}
                  placeholder="Full address including city and state…" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving…' : editCustomer ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
