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
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState({ type: 'all', value: '', month: '' });
  const [filterMonth, setFilterMonth] = useState('');



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

  const handleGenerateAll = async (e) => {
    e.preventDefault();
    try {
      const payload = { month: payTarget.month };
      if (payTarget.type === 'branch') payload.department = payTarget.value;
      if (payTarget.type === 'employee') {
        payload.employee_id = payTarget.value;
        payload.bonus = payTarget.bonus ? parseFloat(payTarget.bonus) : 0;
        payload.deductions = payTarget.deductions ? parseFloat(payTarget.deductions) : 0;
      }
      const res = await api.post('/payroll/generate_all', payload);
      setPayrolls([...res.data.payrolls, ...payrolls]);
      setShowPayModal(false);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to auto-generate payrolls');
    }
  };

  const months = [...new Set(payrolls.map(p => p.month))].sort((a, b) => b.localeCompare(a));

  const filtered = filterMonth ? payrolls.filter(p => p.month === filterMonth) : payrolls;

  const totalNet  = filtered.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalGross = filtered.reduce((s, p) => s + (p.basic_salary || 0) + (p.bonus || 0) + (p.overtime_pay || 0), 0);
  const totalTax   = filtered.reduce((s, p) => s + (p.tax || 0) + (p.deductions || 0), 0);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage salaries, bonuses, and pay slips.</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)', width: 'auto' }} onClick={() => { setPayTarget({ type: 'branch', value: '', month: '' }); setShowPayModal(true); }}>
              <CreditCard size={18} style={{ marginRight: '0.5rem' }} />
              Pay By Branch
            </button>
            <button className="btn" style={{ width: 'auto' }} onClick={() => { setPayTarget({ type: 'all', value: '', month: '' }); setShowPayModal(true); }}>
              <CreditCard size={18} style={{ marginRight: '0.5rem' }} />
              Pay All Employees
            </button>
          </div>
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

      {/* Employees Table to Pay */}
      {isAdmin && (
        <>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Process Payments</h2>
          <div className="table-container" style={{ marginBottom: '2rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{emp.id}</div>
                    </td>
                    <td>{emp.department}</td>
                    <td><span className={`badge ${emp.status === 'active' ? 'active' : 'inactive'}`}>{emp.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => { setPayTarget({ type: 'employee', value: emp.id, month: '' }); setShowPayModal(true); }}
                        style={{ background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10B981', cursor: 'pointer', padding: '0.35rem 0.6rem', borderRadius: 4, fontWeight: 600, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CreditCard size={14} /> Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Payroll History</h2>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Month</th>
              <th>Basic Salary</th>
              <th>Bonus</th>
              <th>Overtime Pay</th>
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
                  <td style={{ color: '#10B981' }}>+{fmt(p.overtime_pay)}</td>
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
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {payTarget.type === 'branch' ? 'Pay Selected Branch' : payTarget.type === 'employee' ? 'Pay Employee' : 'Pay All Employees'}
              </h2>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleGenerateAll}>
              {payTarget.type === 'branch' && (
                <div className="form-group">
                  <label>Select Branch/Department *</label>
                  <select required className="form-input" value={payTarget.value} onChange={e => setPayTarget({...payTarget, value: e.target.value})}>
                    <option value="">— Select —</option>
                    {[...new Set(employees.map(e => e.department).filter(Boolean))].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Target Month (YYYY-MM) *</label>
                <input required type="month" className="form-input" value={payTarget.month} onChange={e => setPayTarget({...payTarget, month: e.target.value})} />
              </div>
              {payTarget.type === 'employee' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Additional Bonus (₹)</label>
                    <input type="number" min="0" step="0.01" className="form-input" value={payTarget.bonus || ''} onChange={e => setPayTarget({...payTarget, bonus: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Deductions (₹)</label>
                    <input type="number" min="0" step="0.01" className="form-input" value={payTarget.deductions || ''} onChange={e => setPayTarget({...payTarget, deductions: e.target.value})} />
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This will automatically calculate basic salary, fetch attendance for overtime, tally completed task bonuses, and deduct flat 10% taxes for <strong>the selected targets</strong> that haven't been paid this month yet. A confirmation email will be automatically sent.
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ backgroundColor: '#10B981', color: 'white' }}>Process Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
