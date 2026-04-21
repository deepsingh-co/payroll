import { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Plus, Download, X, TrendingUp, Zap,
  CheckCircle, Clock, AlertCircle, Loader, Mail,
  ArrowRight, RefreshCw, ChevronDown, ChevronUp, Calendar,
  DollarSign, Users, Activity
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/* ─── tiny helpers ─────────────────────────────────────────────────────── */
const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const STEP_ICONS = {
  'Initiated':              <Zap size={14} />,
  'Gathering Employees':    <Users size={14} />,
  'Calculating Salaries':   <DollarSign size={14} />,
  'Processing Payments':    <CreditCard size={14} />,
  'Sending Notifications':  <Mail size={14} />,
  'Completed':              <CheckCircle size={14} />,
  'Error':                  <AlertCircle size={14} />,
};

const STATUS_COLOR = {
  done:        { bg: 'rgba(16,185,129,0.15)', c: '#10B981', border: '#10B981' },
  in_progress: { bg: 'rgba(99,102,241,0.15)', c: '#818CF8', border: '#818CF8' },
  failed:      { bg: 'rgba(239,68,68,0.15)',  c: '#EF4444', border: '#EF4444' },
  pending:     { bg: 'rgba(107,114,128,0.1)', c: '#9CA3AF', border: '#4B5563' },
};

const TXN_STATUS_BADGE = {
  completed:   { bg: '#10B981', label: 'Completed' },
  failed:      { bg: '#EF4444', label: 'Failed' },
  processing:  { bg: '#6366F1', label: 'Processing' },
  notifying:   { bg: '#F59E0B', label: 'Notifying' },
  calculating: { bg: '#3B82F6', label: 'Calculating' },
  pending:     { bg: '#6B7280', label: 'Pending' },
};

/* ─── TransactionFlowCard ───────────────────────────────────────────────── */
function TransactionFlowCard({ txn }) {
  const [expanded, setExpanded] = useState(false);
  const badge = TXN_STATUS_BADGE[txn.status] || TXN_STATUS_BADGE.pending;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      marginBottom: '1rem',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(x => !x)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', cursor: 'pointer', gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: txn.triggered_by === 'auto'
              ? 'linear-gradient(135deg,#6366F1,#8B5CF6)'
              : 'linear-gradient(135deg,#10B981,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {txn.triggered_by === 'auto' ? <Zap size={18} color="#fff" /> : <CreditCard size={18} color="#fff" />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Payroll — {txn.month}
              <span style={{
                marginLeft: 8, fontSize: '0.7rem', padding: '2px 8px',
                borderRadius: 20, background: txn.triggered_by === 'auto'
                  ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                color: txn.triggered_by === 'auto' ? '#818CF8' : '#10B981',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                {txn.triggered_by === 'auto' ? '⚡ Auto' : '✋ Manual'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtDate(txn.created_at)} · {txn.total_employees} employee(s) · {fmt(txn.total_amount)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
            background: badge.bg, color: '#fff', letterSpacing: 0.3
          }}>{badge.label}</span>
          {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Steps Timeline */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          {/* Progress bar */}
          <div style={{
            height: 6, background: 'var(--surface-secondary)', borderRadius: 99, marginBottom: '1.25rem', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: txn.status === 'completed' ? '100%'
                : txn.status === 'failed'      ? '100%'
                : txn.status === 'notifying'   ? '80%'
                : txn.status === 'processing'  ? '60%'
                : txn.status === 'calculating' ? '40%'
                : '10%',
              background: txn.status === 'failed'
                ? 'linear-gradient(90deg,#EF4444,#F87171)'
                : 'linear-gradient(90deg,#6366F1,#10B981)',
              borderRadius: 99,
              transition: 'width 0.6s ease'
            }} />
          </div>

          {/* Step list */}
          <div style={{ position: 'relative' }}>
            {(txn.steps || []).map((step, i) => {
              const sc = STATUS_COLOR[step.status] || STATUS_COLOR.pending;
              const isLast = i === txn.steps.length - 1;
              return (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: isLast ? 0 : '0.5rem' }}>
                  {/* icon + connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: sc.bg, border: `2px solid ${sc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: sc.c, flexShrink: 0, position: 'relative', zIndex: 1
                    }}>
                      {step.status === 'in_progress'
                        ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : (STEP_ICONS[step.step] || <Activity size={13} />)
                      }
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 2, flexGrow: 1, minHeight: 20,
                        background: `linear-gradient(${sc.border},var(--border))`,
                        margin: '2px 0'
                      }} />
                    )}
                  </div>
                  {/* content */}
                  <div style={{ paddingBottom: isLast ? 0 : '0.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: sc.c }}>{step.step}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {step.timestamp ? new Date(step.timestamp).toLocaleTimeString('en-IN') : ''}
                      </span>
                    </div>
                    {step.detail && (
                      <div style={{
                        fontSize: '0.78rem', color: 'var(--text-muted)',
                        background: 'var(--surface-secondary)', borderRadius: 6,
                        padding: '4px 10px', marginTop: 4
                      }}>
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary row */}
          {txn.status === 'completed' && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(16,185,129,0.08)', borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex', gap: '2rem', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#10B981' }}>
                <strong>Paid:</strong> {fmt(txn.total_amount)}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#10B981' }}>
                <strong>Employees:</strong> {txn.total_employees}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#10B981' }}>
                <strong>Completed:</strong> {fmtDate(txn.completed_at)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Payroll Page ─────────────────────────────────────────────────── */
export default function Payroll() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [payrolls, setPayrolls]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [transactions, setTxns]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState('history'); // 'history' | 'transactions'
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget]   = useState({ type: 'all', value: '', month: '' });
  const [filterMonth, setFilterMonth] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayrolls();
    if (isAdmin) {
      fetchEmployees();
      fetchTransactions();
    }
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

  const fetchTransactions = async () => {
    setTxnLoading(true);
    try {
      const res = await api.get('/payroll/transactions');
      setTxns(res.data);
    } catch (e) { console.error(e); }
    finally { setTxnLoading(false); }
  };

  const handleGenerateAll = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const payload = { month: payTarget.month };
      if (payTarget.type === 'branch')   payload.department  = payTarget.value;
      if (payTarget.type === 'employee') {
        payload.employee_id  = payTarget.value;
        payload.bonus        = payTarget.bonus      ? parseFloat(payTarget.bonus)      : 0;
        payload.deductions   = payTarget.deductions ? parseFloat(payTarget.deductions)  : 0;
      }
      const res = await api.post('/payroll/generate_all', payload);
      setPayrolls(prev => [...res.data.payrolls, ...prev]);
      setShowPayModal(false);
      // refresh transactions so flow is visible
      await fetchTransactions();
      setActiveTab('transactions');
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to auto-generate payrolls');
    } finally {
      setProcessing(false);
    }
  };

  const months   = [...new Set(payrolls.map(p => p.month))].sort((a, b) => b.localeCompare(a));
  const filtered = filterMonth ? payrolls.filter(p => p.month === filterMonth) : payrolls;

  const totalNet   = filtered.reduce((s, p) => s + (p.net_salary   || 0), 0);
  const totalGross = filtered.reduce((s, p) => s + (p.basic_salary || 0) + (p.bonus || 0) + (p.overtime_pay || 0), 0);
  const totalTax   = filtered.reduce((s, p) => s + (p.tax || 0) + (p.deductions || 0), 0);

  /* ── Next auto-pay date (last day of current month) ── */
  const now       = new Date();
  const lastDay   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft  = Math.ceil((lastDay - now) / 86400000);

  return (
    <>
      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .tab-btn { background:none; border:none; cursor:pointer; padding:0.5rem 1.25rem;
          font-size:0.88rem; font-weight:600; border-radius:8px; transition:all 0.2s; }
        .tab-btn.active { background:var(--primary); color:#fff; }
        .tab-btn:not(.active) { color:var(--text-muted); }
        .tab-btn:not(.active):hover { background:var(--surface-secondary); color:var(--text-main); }
      `}</style>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Manage salaries, view transaction flows &amp; auto-pay settings.
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn"
              style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)', width: 'auto' }}
              onClick={() => { setPayTarget({ type: 'branch', value: '', month: '' }); setShowPayModal(true); }}>
              <CreditCard size={16} style={{ marginRight: '0.4rem' }} /> Pay By Branch
            </button>
            <button className="btn" style={{ width: 'auto' }}
              onClick={() => { setPayTarget({ type: 'all', value: '', month: '' }); setShowPayModal(true); }}>
              <CreditCard size={16} style={{ marginRight: '0.4rem' }} /> Pay All Employees
            </button>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
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
            <p>Tax &amp; Deductions</p>
            <h3 style={{ fontSize: '1.4rem' }}>{fmt(totalTax)}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            <Download size={20} />
          </div>
        </div>

        {/* Auto-pay countdown card */}
        {isAdmin && (
          <div className="stat-card" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div className="stat-info">
              <p>Next Auto-Pay</p>
              <h3 style={{ fontSize: '1.3rem', color: '#818CF8' }}>
                {lastDay.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#818CF8', marginTop: 2 }}>
                {daysLeft === 0 ? '🔥 Runs tonight at 23:00 UTC' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
              <Zap size={20} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs (admin only) ── */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface)', padding: '0.35rem', borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            📋 Payroll History
          </button>
          <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveTab('transactions'); fetchTransactions(); }}>
            ⚡ Transaction Flow
            {transactions.length > 0 && (
              <span style={{ marginLeft: 6, background: '#6366F1', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: '0.72rem' }}>
                {transactions.length}
              </span>
            )}
          </button>
          {activeTab === 'transactions' && (
            <button onClick={fetchTransactions} title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem 0.5rem' }}>
              <RefreshCw size={15} style={txnLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: TRANSACTION FLOW
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && isAdmin && (
        <>
          {/* How It Works banner */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(16,185,129,0.08))',
            border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14,
            padding: '1rem 1.25rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#818CF8" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#818CF8' }}>Auto-Payroll Flow</span>
            </div>
            {[
              ['1', 'Month End Detected', '#6366F1'],
              ['→', '', 'var(--text-muted)'],
              ['2', 'Salaries Calculated', '#3B82F6'],
              ['→', '', 'var(--text-muted)'],
              ['3', 'Payments Processed', '#10B981'],
              ['→', '', 'var(--text-muted)'],
              ['4', 'Emails Sent', '#F59E0B'],
              ['→', '', 'var(--text-muted)'],
              ['5', 'Completed ✓', '#10B981'],
            ].map(([num, label, color], i) =>
              label ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 800, color: '#fff', flexShrink: 0
                  }}>{num}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
              ) : (
                <ArrowRight key={i} size={14} color={color} />
              )
            )}
          </div>

          {txnLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Loader size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '4rem 2rem',
              background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)'
            }}>
              <Activity size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No transactions yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
                Click <strong>Pay All Employees</strong> to run the first payroll and see the flow here.
              </p>
            </div>
          ) : (
            transactions.map(t => <TransactionFlowCard key={t.id} txn={t} />)
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: PAYROLL HISTORY
      ══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'history' || !isAdmin) && (
        <>
          {/* Process individual employees table */}
          {isAdmin && (
            <>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Process Payments</h2>
              <div className="table-container" style={{ marginBottom: '2rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Base Salary / yr</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email || `ID #${emp.id}`}</div>
                        </td>
                        <td>{emp.department}</td>
                        <td>{fmt(emp.salary)}</td>
                        <td><span className={`badge ${emp.status === 'active' ? 'active' : 'inactive'}`}>{emp.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => { setPayTarget({ type: 'employee', value: emp.id, month: '' }); setShowPayModal(true); }}
                            style={{ background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10B981', cursor: 'pointer', padding: '0.35rem 0.8rem', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CreditCard size={13} /> Pay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Month Filter */}
          {months.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Calendar size={15} color="var(--text-muted)" />
              <button
                onClick={() => setFilterMonth('')}
                style={{ padding: '0.3rem 0.8rem', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: !filterMonth ? 'var(--primary)' : 'var(--surface)', color: !filterMonth ? '#fff' : 'var(--text-main)' }}>
                All Months
              </button>
              {months.map(m => (
                <button key={m} onClick={() => setFilterMonth(m)}
                  style={{ padding: '0.3rem 0.8rem', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: filterMonth === m ? 'var(--primary)' : 'var(--surface)', color: filterMonth === m ? '#fff' : 'var(--text-main)' }}>
                  {m}
                </button>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Payroll History</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {isAdmin && <th>Employee</th>}
                  <th>Month</th>
                  <th>Basic Salary</th>
                  <th>Bonus</th>
                  <th>Overtime</th>
                  <th>Tax</th>
                  <th>Deductions</th>
                  <th style={{ color: '#10B981' }}>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading payroll...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No payroll records found.
                  </td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    {isAdmin && (
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.employee_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{p.employee_id?.slice(-6)}</div>
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAY MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 540, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {payTarget.type === 'branch' ? '🏢 Pay Selected Branch' : payTarget.type === 'employee' ? '👤 Pay Employee' : '🌐 Pay All Employees'}
              </h2>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateAll}>
              {payTarget.type === 'branch' && (
                <div className="form-group">
                  <label>Select Branch / Department *</label>
                  <select required className="form-input" value={payTarget.value}
                    onChange={e => setPayTarget({ ...payTarget, value: e.target.value })}>
                    <option value="">— Select —</option>
                    {[...new Set(employees.map(e => e.department).filter(Boolean))].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Target Month *</label>
                <input required type="month" className="form-input" value={payTarget.month}
                  onChange={e => setPayTarget({ ...payTarget, month: e.target.value })} />
              </div>

              {payTarget.type === 'employee' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Additional Bonus (₹)</label>
                    <input type="number" min="0" step="0.01" className="form-input"
                      value={payTarget.bonus || ''}
                      onChange={e => setPayTarget({ ...payTarget, bonus: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Extra Deductions (₹)</label>
                    <input type="number" min="0" step="0.01" className="form-input"
                      value={payTarget.deductions || ''}
                      onChange={e => setPayTarget({ ...payTarget, deductions: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Auto-calc explanation */}
              <div style={{
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818CF8', marginBottom: 6 }}>
                  ⚡ Auto-Calculation Includes:
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  ✓ Basic Salary (annual ÷ 12)<br />
                  ✓ Overtime (hours &gt; 12/day × 1.5× hourly rate)<br />
                  ✓ Task Completion Bonus (₹500 per completed task)<br />
                  ✓ Tax auto-deducted at 10% of basic salary<br />
                  ✓ Email notification sent to each employee
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn"
                  style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)', flex: 1 }}
                  onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn"
                  style={{ backgroundColor: '#10B981', color: 'white', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={processing}>
                  {processing
                    ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                    : <><CreditCard size={16} /> Process &amp; Send Payment</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
