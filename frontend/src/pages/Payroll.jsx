import { useState, useEffect } from 'react';
import { CreditCard, Plus, Download, X, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Payroll() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [payrolls, setPayrolls]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '', month: '', bonus: 0, tax: 0, deductions: 0
  });

  useEffect(() => {
    fetchPayrolls();
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const res = await api.get('/payroll/');
      setPayrolls(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees/');
      setEmployees(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/payroll/', {
        ...formData,
        employee_id: parseInt(formData.employee_id),
        bonus: parseFloat(formData.bonus),
        tax: parseFloat(formData.tax),
        deductions: parseFloat(formData.deductions),
      });
      setPayrolls([res.data, ...payrolls]);
      setShowModal(false);
      setFormData({ employee_id: '', month: '', bonus: 0, tax: 0, deductions: 0 });
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to generate payroll');
    }
  };

  const months = [...new Set(payrolls.map(p => p.month))].sort((a, b) => b.localeCompare(a));

  const filtered = filterMonth ? payrolls.filter(p => p.month === filterMonth) : payrolls;

  const totalNet  = filtered.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalGross = filtered.reduce((s, p) => s + (p.basic_salary || 0) + (p.bonus || 0), 0);
  const totalTax   = filtered.reduce((s, p) => s + (p.tax || 0) + (p.deductions || 0), 0);

  const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage salaries, bonuses, and pay slips.</p>
        </div>
        {isAdmin && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Generate Payroll
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-info">
            <p>Total Net Payout</p>
            <h3 style={{ fontSize: '1.4rem' }}>{fmt(totalNet)}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
            <CreditCard size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p>Total Gross</p>
            <h3 style={{ fontSize: '1.4rem' }}>{fmt(totalGross)}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p>Total Deductions / Tax</p>
            <h3 style={{ fontSize: '1.4rem' }}>{fmt(totalTax)}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            <Download size={20} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p>Records</p>
            <h3 style={{ fontSize: '1.4rem' }}>{filtered.length}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      {/* Month Filter */}
      {months.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterMonth('')}
            style={{ padding: '0.375rem 0.875rem', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', backgroundColor: !filterMonth ? 'var(--primary)' : 'var(--surface)', color: !filterMonth ? '#fff' : 'var(--text-main)' }}
          >All Months</button>
          {months.map(m => (
            <button key={m}
              onClick={() => setFilterMonth(m)}
              style={{ padding: '0.375rem 0.875rem', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', backgroundColor: filterMonth === m ? 'var(--primary)' : 'var(--surface)', color: filterMonth === m ? '#fff' : 'var(--text-main)' }}
            >{m}</button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Month</th>
              <th>Basic Salary</th>
              <th>Bonus</th>
              <th>Tax</th>
              <th>Deductions</th>
              <th style={{ color: '#10B981' }}>Net Salary</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading payroll...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No payroll records found.</td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id}>
                  {isAdmin && (
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.employee_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{p.employee_id}</div>
                    </td>
                  )}
                  <td><span className="badge active">{p.month}</span></td>
                  <td>{fmt(p.basic_salary)}</td>
                  <td style={{ color: '#10B981' }}>+{fmt(p.bonus)}</td>
                  <td style={{ color: '#EF4444' }}>-{fmt(p.tax)}</td>
                  <td style={{ color: '#EF4444' }}>-{fmt(p.deductions)}</td>
                  <td style={{ fontWeight: 700, color: '#10B981' }}>{fmt(p.net_salary)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Generate Payroll</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Employee *</label>
                <select required className="form-input" value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Month (YYYY-MM) *</label>
                <input required type="month" className="form-input" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Bonus ($)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Tax ($)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.tax} onChange={e => setFormData({...formData, tax: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Deductions ($)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
