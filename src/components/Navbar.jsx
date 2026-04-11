import { useLocation, useNavigate } from 'react-router-dom'
import { Package, Users, FileText, LayoutDashboard, Settings } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/items', label: 'Items', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/billing', label: 'Billing', icon: FileText },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>🧾</span>
        <span>BillEase</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <button
            key={to}
            className={`nav-link ${location.pathname === to ? 'active' : ''}`}
            onClick={() => navigate(to)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 0' }}>
        <button
          className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} />
          <span>Company Settings</span>
        </button>
      </div>
      <div style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
        v1.1.0 — GST Billing
      </div>
    </aside>
  )
}
