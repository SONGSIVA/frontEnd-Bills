import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getItems, getCustomers, getBills } from '../api/client'
import { Package, Users, FileText, IndianRupee } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ items: 0, customers: 0, bills: 0, revenue: 0 })
  const [recentBills, setRecentBills] = useState([])

  useEffect(() => {
    Promise.all([getItems(), getCustomers(), getBills()]).then(([i, c, b]) => {
      const bills = b.data
      setStats({
        items: i.data.length,
        customers: c.data.length,
        bills: bills.length,
        revenue: bills.reduce((s, b) => s + b.total_amount, 0),
      })
      setRecentBills(bills.slice(0, 5))
    })
  }, [])

  const cards = [
    { label: 'Total Items', value: stats.items, icon: Package, color: '#6366f1', bg: '#ede9fe', onClick: () => navigate('/items') },
    { label: 'Total Customers', value: stats.customers, icon: Users, color: '#10b981', bg: '#dcfce7', onClick: () => navigate('/customers') },
    { label: 'Invoices Generated', value: stats.bills, icon: FileText, color: '#f59e0b', bg: '#fef3c7', onClick: () => navigate('/billing') },
    { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: IndianRupee, color: '#3b82f6', bg: '#dbeafe', onClick: null },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to BillEase — your GST billing manager</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {cards.map(({ label, value, icon: Icon, color, bg, onClick }) => (
          <div key={label} className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="label">{label}</span>
              <div style={{ background: bg, borderRadius: 8, padding: 8 }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Invoices</h2>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/billing')}>View all</button>
        </div>
        {recentBills.length === 0 ? (
          <div className="empty-state"><p>No invoices yet. Create your first bill!</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map(b => (
                  <tr key={b.id}>
                    <td><span className="badge badge-blue">{b.invoice_number}</span></td>
                    <td>{b.customer.customer_name}</td>
                    <td>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: 700 }}>₹{b.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
