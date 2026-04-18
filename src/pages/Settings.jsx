import { useEffect, useState, useRef } from 'react'
import { getCompanySettings, saveCompanySettings, uploadCompanyLogo } from '../api/client'
import { Building2, Save, CheckCircle, AlertCircle, Upload, X, Image } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = {
  company_name: '', gst_no: '', address: '', city: '',
  state: '', postal_code: '', mobile: '', email: '',
  website: '', bank_name: '', bank_account: '', bank_ifsc: '',
}

export default function Settings() {
  const [form, setForm]           = useState(emptyForm)
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(true)
  const [saved, setSaved]         = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [logoUrl, setLogoUrl]     = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const fileRef = useRef()

  // Load settings from backend
  useEffect(() => {
    setFetching(true)
    getCompanySettings()
      .then(r => {
        const data = r.data || {}
        setForm({
          company_name:  data.company_name  || '',
          gst_no:        data.gst_no        || '',
          address:       data.address       || '',
          city:          data.city          || '',
          state:         data.state         || '',
          postal_code:   data.postal_code   || '',
          mobile:        data.mobile        || '',
          email:         data.email         || '',
          website:       data.website       || '',
          bank_name:     data.bank_name     || '',
          bank_account:  data.bank_account  || '',
          bank_ifsc:     data.bank_ifsc     || '',
        })
        setLogoUrl(data.logo_url || '')
        setFetchError(false)
      })
      .catch(() => { setFetchError(true); toast.error('Could not load settings') })
      .finally(() => setFetching(false))
  }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // ── Logo handling ─────────────────────────────────────────
  const processFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2MB')
      return
    }
    try {
      console.log('Uploading logo file:', file.name, file.size, file.type)
      const response = await uploadCompanyLogo(file)
      console.log('Upload response:', response)
      const url = response.data?.logo_url || ''
      console.log('Logo URL from response:', url)
      if (!url) throw new Error('No logo URL returned from backend')
      setLogoUrl(url)
      toast.success('Logo uploaded — will appear on all future PDFs')
    } catch (err) {
      console.error('Logo upload failed:', err)
      console.error('Error details:', err.response?.data, err.response?.status, err.message)
      toast.error(`Upload failed: ${err.message}`)
    }
  }

  const handleFileInput = e => processFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }

  const removeLogo = () => {
    setLogoUrl('')
    if (fileRef.current) fileRef.current.value = ''
    toast.success('Logo removed')
  }

  // ── Save settings ─────────────────────────────────────────
  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }
    setLoading(true)
    try {
      const payload = {
        company_name:  form.company_name.trim(),
        gst_no:        form.gst_no.trim()        || null,
        address:       form.address.trim()       || null,
        city:          form.city.trim()          || null,
        state:         form.state.trim()         || null,
        postal_code:   form.postal_code.trim()   || null,
        mobile:        form.mobile.trim()        || null,
        email:         form.email.trim()         || null,
        website:       form.website.trim()       || null,
        bank_name:     form.bank_name.trim()     || null,
        bank_account:  form.bank_account.trim()  || null,
        bank_ifsc:     form.bank_ifsc.trim()     || null,
      }
      await saveCompanySettings(payload)
      toast.success('Company settings saved!')
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings')
    } finally { setLoading(false) }
  }

  if (fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
        Loading settings…
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Company Settings</h1>
        <p>Your company details and logo will appear on every invoice PDF</p>
      </div>

      {fetchError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, color: '#b91c1c', fontSize: 14,
        }}>
          <AlertCircle size={18} />
          Could not reach the backend. Make sure the Python server is running on port 8000.
        </div>
      )}

      {/* ── Preview banner ─────────────────────────────────── */}
      <div style={{
        background: '#6366f1', borderRadius: 14, padding: '16px 24px',
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo preview inside banner */}
        {logoUrl ? (
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            background: '#fff', padding: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={logoUrl}
              alt="Company logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
            />
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <Building2 size={28} color="#fff" />
          </div>
        )}
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
            {form.company_name || 'Your Company Name'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
            {[form.city, form.state].filter(Boolean).join(', ') || 'City, State'}
            {form.gst_no ? ` · GSTIN: ${form.gst_no}` : ''}
          </div>
        </div>
        <div style={{
          marginLeft: 'auto', background: 'rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 12,
        }}>
          PDF preview
        </div>
      </div>

      {/* ── Company Logo Upload ────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Company Logo
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
          Appears in the top-left corner of every invoice PDF next to your company name.
          PNG or JPG recommended. Max 2MB.
        </p>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#6366f1' : '#d1d5db'}`,
              borderRadius: 12, padding: '24px 32px',
              textAlign: 'center', cursor: 'pointer',
              background: dragOver ? '#ede9fe' : '#f8fafc',
              transition: 'all 0.2s', minWidth: 200,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={22} color="#6366f1" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
              Click to upload logo
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              or drag and drop here
            </div>
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>
              PNG, JPG, SVG · Max 2MB
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {/* Current logo preview */}
          {logoUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Current logo:</div>
              <div style={{
                position: 'relative', display: 'inline-block',
                border: '1px solid #e2e8f0', borderRadius: 10, padding: 8,
                background: '#f8fafc',
              }}>
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={{ width: 120, height: 80, objectFit: 'contain', display: 'block', borderRadius: 6 }}
                />
                <button
                  onClick={removeLogo}
                  title="Remove logo"
                  style={{
                    position: 'absolute', top: -10, right: -10,
                    background: '#ef4444', color: '#fff', border: 'none',
                    borderRadius: '50%', width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 12,
                  }}
                >
                  <X size={13} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={14} /> Logo saved · shows on all PDFs
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8, padding: '24px 32px',
              border: '1px solid #f1f5f9', borderRadius: 12, background: '#f8fafc',
              color: '#cbd5e1', minWidth: 160,
            }}>
              <Image size={36} />
              <div style={{ fontSize: 13, color: '#94a3b8' }}>No logo uploaded yet</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Basic Information ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Basic Information
        </h2>
        <div className="form-grid">
          <div className="form-group full">
            <label>Company Name *</label>
            <input name="company_name" value={form.company_name} onChange={handleChange}
              placeholder="e.g. Acme Pvt. Ltd." />
          </div>
          <div className="form-group">
            <label>GST Number (GSTIN)</label>
            <input name="gst_no" value={form.gst_no} onChange={handleChange}
              placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="form-group">
            <label>Mobile</label>
            <input name="mobile" value={form.mobile} onChange={handleChange}
              placeholder="+91 9XXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="info@company.com" />
          </div>
          <div className="form-group">
            <label>Website</label>
            <input name="website" value={form.website} onChange={handleChange}
              placeholder="www.yourcompany.com" />
          </div>
        </div>
      </div>

      {/* ── Address ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

      {/* ── Bank Details ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Bank Details
          <span style={{ fontSize: 12, fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
            (shown on invoice for payment)
          </span>
        </h2>
        <div className="form-grid three-col">
          <div className="form-group">
            <label>Bank Name</label>
            <input name="bank_name" value={form.bank_name} onChange={handleChange}
              placeholder="State Bank of India" />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input name="bank_account" value={form.bank_account} onChange={handleChange}
              placeholder="XXXXXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>IFSC Code</label>
            <input name="bank_ifsc" value={form.bank_ifsc} onChange={handleChange}
              placeholder="SBIN0001234" />
          </div>
        </div>
      </div>

      {/* ── Save button ───────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: 14 }}>
            <CheckCircle size={18} /> Saved successfully!
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={loading || fetching}
          style={{ minWidth: 160, justifyContent: 'center' }}>
          <Save size={16} />
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}