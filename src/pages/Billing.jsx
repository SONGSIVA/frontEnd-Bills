import { useEffect, useState } from 'react'
import { getItems, getCustomers, getBills, createBill, updateBill, deleteBill } from '../api/client'
import { getCompanySettings } from '../api/client'
import { generateInvoicePDF } from '../components/InvoicePDF'
import { Plus, Trash2, Download, FileText, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyBillForm = { customer_id: '', cgst_rate: '9', sgst_rate: '9', notes: '' }

export default function Billing() {
  const [bills, setBills] = useState([])
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [company, setCompany] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [form, setForm] = useState(emptyBillForm)
  const [billItems, setBillItems] = useState([])
  const [loading, setLoading] = useState(false)

  const load = () => getBills().then(r => setBills(r.data))

  useEffect(() => {
    load()
    getItems().then(r => setItems(r.data))
    getCustomers().then(r => setCustomers(r.data))
    getCompanySettings().then(r => setCompany(r.data)).catch(() => {})
  }, [])

  const subtotal = billItems.reduce((s, bi) => s + (bi.quantity * bi.unit_price), 0)
  const cgst = subtotal * (parseFloat(form.cgst_rate) || 0) / 100
  const sgst = subtotal * (parseFloat(form.sgst_rate) || 0) / 100
  const total = subtotal + cgst + sgst

  const openCreate = () => {
    setEditingBill(null)
    setForm(emptyBillForm)
    setBillItems(items.length > 0 ? [{ item_id: items[0].id, quantity: 1, unit_price: items[0].unit_price }] : [])
    setShowCreate(true)
  }

  const openEdit = (bill) => {
    setEditingBill(bill)
    setForm({
      customer_id: String(bill.customer_id),
      cgst_rate: String(bill.cgst_rate),
      sgst_rate: String(bill.sgst_rate),
      notes: bill.notes || '',
    })
    setBillItems(bill.items.map(bi => ({
      item_id: bi.item_id,
      quantity: bi.quantity,
      unit_price: bi.unit_price,
    })))
    setShowCreate(true)
  }

  const closeForm = () => { setShowCreate(false); setEditingBill(null); setForm(emptyBillForm); setBillItems([]) }

  const addRow = () => {
    if (items.length === 0) { toast.error('Add items to catalogue first'); return }
    const first = items[0]
    setBillItems(prev => [...prev, { item_id: first.id, quantity: 1, unit_price: first.unit_price }])
  }

  const removeRow = (idx) => setBillItems(prev => prev.filter((_, i) => i !== idx))

  const updateRow = (idx, field, value) => {
    setBillItems(prev => prev.map((row, i) => {
      if (i !== idx) return row
      if (field === 'item_id') {
        const found = items.find(it => it.id === parseInt(value))
        return { ...row, item_id: parseInt(value), unit_price: found ? found.unit_price : row.unit_price }
      }
      return { ...row, [field]: parseFloat(value) || 0 }
    }))
  }

  const handleSubmit = async () => {
    if (!form.customer_id) { toast.error('Please select a customer'); return }
    if (billItems.length === 0) { toast.error('Add at least one item'); return }
    for (const bi of billItems) {
      if (!bi.quantity || bi.quantity <= 0) { toast.error('All quantities must be > 0'); return }
    }
    setLoading(true)
    try {
      const payload = {
        customer_id: parseInt(form.customer_id),
        cgst_rate: parseFloat(form.cgst_rate) || 0,
        sgst_rate: parseFloat(form.sgst_rate) || 0,
        notes: form.notes,
        items: billItems.map(bi => ({ item_id: bi.item_id, quantity: bi.quantity, unit_price: bi.unit_price })),
      }

      let res
      if (editingBill) {
        res = await updateBill(editingBill.id, payload)
        toast.success(`Invoice ${res.data.invoice_number} updated!`)
      } else {
        res = await createBill(payload)
        toast.success(`Invoice ${res.data.invoice_number} created!`)
      }

      closeForm()
      load()
      generateInvoicePDF(res.data, company)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save invoice')
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice permanently?')) return
    try { await deleteBill(id); toast.success('Invoice deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const handleDownload = (bill) => generateInvoicePDF(bill, company)

  return (
    <div>
      <div className="page-header">
        <h1>Billing</h1>
        <p>Create and manage GST invoices</p>
      </div>

      {/* Invoice list */}
      {!showCreate && (
        <>
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="stat-card">
              <div className="label">Total Invoices</div>
              <div className="value">{bills.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Revenue</div>
              <div className="value">₹{bills.reduce((s, b) => s + b.total_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </div>
            <div className="stat-card">
              <div className="label">GST Collected</div>
              <div className="value">₹{bills.reduce((s, b) => s + b.cgst_amount + b.sgst_amount, 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>All Invoices</h2>
              <button className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} /> New Invoice
              </button>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No.</th><th>Customer</th><th>Date</th>
                    <th>Subtotal</th><th>GST</th><th>Total</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr><td colSpan={7}>
                      <div className="empty-state">
                        <FileText size={40} />
                        <p>No invoices yet. Create your first bill!</p>
                      </div>
                    </td></tr>
                  ) : bills.map(b => (
                    <tr key={b.id}>
                      <td><span className="badge badge-blue">{b.invoice_number}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.customer.customer_name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{b.customer.mobile}</div>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                      <td>₹{b.subtotal.toFixed(2)}</td>
                      <td style={{ color: '#10b981' }}>₹{(b.cgst_amount + b.sgst_amount).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: '#6366f1' }}>₹{b.total_amount.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm btn-icon" title="Edit invoice"
                            onClick={() => openEdit(b)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-success btn-sm btn-icon" title="Download PDF"
                            onClick={() => handleDownload(b)}>
                            <Download size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                            onClick={() => handleDelete(b.id)}>
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
        </>
      )}

      {/* Create / Edit Invoice Form */}
      {showCreate && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {editingBill ? `Edit Invoice — ${editingBill.invoice_number}` : 'New Invoice'}
              </h2>
              {editingBill && (
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Changes will update the invoice and re-download the PDF
                </p>
              )}
            </div>
            <button className="btn btn-outline" onClick={closeForm}>
              <X size={16} /> Cancel
            </button>
          </div>

          <div className="billing-layout">
            {/* Left */}
            <div>
              {/* Customer */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</h3>
                <div className="form-group">
                  <label>Select Customer *</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">— Choose customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_id})</option>
                    ))}
                  </select>
                </div>
                {form.customer_id && (() => {
                  const c = customers.find(x => x.id === parseInt(form.customer_id))
                  return c ? (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569' }}>
                      <div><strong>{c.customer_name}</strong> · {c.mobile}</div>
                      {c.address && <div style={{ marginTop: 3 }}>{c.address}</div>}
                      {c.gst_no && <div style={{ marginTop: 3 }}>GSTIN: {c.gst_no}</div>}
                    </div>
                  ) : null
                })()}
              </div>

              {/* Line Items */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Line Items</h3>
                  <button className="btn btn-outline btn-sm" onClick={addRow}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                {billItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 8 }}>
                    Click "Add Row" to add items
                  </div>
                ) : (
                  <>
                    <div className="item-row" style={{ marginBottom: 6 }}>
                      {['ITEM', 'QTY', 'PRICE (₹)', 'TOTAL', ''].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{h}</span>
                      ))}
                    </div>
                    {billItems.map((bi, idx) => (
                      <div key={idx} className="item-row">
                        <select value={bi.item_id} onChange={e => updateRow(idx, 'item_id', e.target.value)} style={{ fontSize: 13 }}>
                          {items.map(it => <option key={it.id} value={it.id}>{it.item_name}</option>)}
                        </select>
                        <input type="number" min="0.01" step="0.01" value={bi.quantity}
                          onChange={e => updateRow(idx, 'quantity', e.target.value)} style={{ fontSize: 13 }} />
                        <input type="number" min="0" step="0.01" value={bi.unit_price}
                          onChange={e => updateRow(idx, 'unit_price', e.target.value)} style={{ fontSize: 13 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          ₹{(bi.quantity * bi.unit_price).toFixed(2)}
                        </span>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeRow(idx)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Notes */}
              <div className="card">
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</h3>
                <textarea placeholder="Payment terms, delivery notes…"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {/* Right: summary */}
            <div>
              <div className="card" style={{ position: 'sticky', top: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GST Summary</h3>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                  <div className="form-group">
                    <label>CGST %</label>
                    <input type="number" min="0" max="28" step="0.1" value={form.cgst_rate}
                      onChange={e => setForm(f => ({ ...f, cgst_rate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>SGST %</label>
                    <input type="number" min="0" max="28" step="0.1" value={form.sgst_rate}
                      onChange={e => setForm(f => ({ ...f, sgst_rate: e.target.value }))} />
                  </div>
                </div>

                <div className="gst-summary">
                  <div className="gst-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                  <div className="gst-row"><span>CGST ({form.cgst_rate}%)</span><span>₹{cgst.toFixed(2)}</span></div>
                  <div className="gst-row"><span>SGST ({form.sgst_rate}%)</span><span>₹{sgst.toFixed(2)}</span></div>
                  <div className="gst-row" style={{ borderTop: '1px solid #e2e8f0', marginTop: 6, paddingTop: 10, fontWeight: 700, fontSize: 16 }}>
                    <span>Total</span>
                    <span style={{ color: '#6366f1' }}>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {billItems.length > 0 && (
                  <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>ITEMS ({billItems.length})</div>
                    {billItems.map((bi, i) => {
                      const it = items.find(x => x.id === bi.item_id)
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: '#374151' }}>{it?.item_name} × {bi.quantity}</span>
                          <span style={{ fontWeight: 600 }}>₹{(bi.quantity * bi.unit_price).toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>
                    {editingBill ? 'Updated PDF will download after saving' : 'PDF downloads automatically after saving'}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleSubmit} disabled={loading}>
                    <FileText size={16} />
                    {loading ? 'Saving…' : editingBill ? 'Update Invoice & Download PDF' : 'Create Invoice & Download PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
