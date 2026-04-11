import { useEffect, useState } from 'react'
import { getCompanySettings, saveCompanySettings } from '../api/client'
import { Building2, Save, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = {
  company_name: '', gst_no: '', address: '', city: '',
  state: '', postal_code: '', mobile: '', email: '',
  website: '', bank_name: '', bank_account: '', bank_ifsc: '',
}

export default function Settings() {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getCompanySettings().then(r => {
      setForm(prev => ({ ...prev, ...r.data }))
    }).catch(() => {})
  }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }
    setLoading(true)
    try {
      await saveCompanySettings(form)
      toast.success('Company settings saved!')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      toast.error('Failed to save settings')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Company Settings</h1>
        <p>Your company details will appear on every invoice PDF</p>
      </div>

      {/* Preview card */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12 }}>
          <Building2 size={28} color="#fff" />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
            {form.company_name || 'Your Company Name'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
            {[form.city, form.state].filter(Boolean).join(', ') || 'City, State'}
            {form.gst_no ? ` · GSTIN: ${form.gst_no}` : ''}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 13 }}>
          Invoice preview
        </div>
      </div>

      {/* Basic Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Basic Information
        </h2>
        <div className="form-grid three-col">
          <div className="form-group full">
            <label>Company Name *</label>
            <input name="company_name" value={form.company_name} onChange={handleChange} placeholder="e.g. Acme Pvt. Ltd." />
          </div>
          <div className="form-group">
            <label>GST Number (GSTIN)</label>
            <input name="gst_no" value={form.gst_no} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="form-group">
            <label>Mobile</label>
            <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="+91 9XXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="info@company.com" />
          </div>
          <div className="form-group full">
            <label>Website</label>
            <input name="website" value={form.website} onChange={handleChange} placeholder="www.yourcompany.com" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Address
        </h2>
        <div className="form-grid">
          <div className="form-group full">
            <label>Street Address</label>
            <textarea name="address" value={form.address} onChange={handleChange}
              placeholder="Building no., Street name…" style={{ minHeight: 70 }} />
          </div>
          <div className="form-group">
            <label>City</label>
            <input name="city" value={form.city} onChange={handleChange} placeholder="Chennai" />
          </div>
          <div className="form-group">
            <label>State</label>
            <input name="state" value={form.state} onChange={handleChange} placeholder="Tamil Nadu" />
          </div>
          <div className="form-group">
            <label>Postal Code</label>
            <input name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="600001" />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Bank Details <span style={{ fontSize: 12, fontWeight: 400, textTransform: 'none' }}>(shown on invoice for payment)</span>
        </h2>
        <div className="form-grid three-col">
          <div className="form-group">
            <label>Bank Name</label>
            <input name="bank_name" value={form.bank_name} onChange={handleChange} placeholder="State Bank of India" />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input name="bank_account" value={form.bank_account} onChange={handleChange} placeholder="XXXXXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>IFSC Code</label>
            <input name="bank_ifsc" value={form.bank_ifsc} onChange={handleChange} placeholder="SBIN0001234" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: 14 }}>
            <CheckCircle size={18} /> Settings saved successfully
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}
          style={{ minWidth: 160, justifyContent: 'center' }}>
          <Save size={16} />
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
