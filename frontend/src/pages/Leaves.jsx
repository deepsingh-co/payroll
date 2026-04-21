import { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle2, XCircle, Clock, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_CONF = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', icon: <Clock size={14} />,         label: 'Pending'  },
  approved: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', icon: <CheckCircle2 size={14} />,  label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', icon: <XCircle size={14} />,       label: 'Rejected' },
};

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Unpaid', 'Emergency'];

function daysBetween(from, to) {
  const d = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(d) + 1);
}

export default function Leaves() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    type: 'Annual', from_date: '', to_date: ''
  });

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves/');
      setLeaves(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves/', {
        type: formData.type,
        from_date: new Date(formData.from_date).toISOString(),
        to_date: new Date(formData.to_date).toISOString(),
      });
      setShowModal(false);
      setFormData({ type: 'Annual', from_date: '', to_date: '' });
      fetchLeaves();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to apply leave');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/leaves/${id}`, { status });
      setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l));
    } catch (e) { console.error(e); }
  };

  const filtered = filterStatus === 'all' ? leaves : leaves.filter(l => l.status === filterStatus);

  const counts = {
    all:      leaves.length,
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage time-off requests and approvals.</p>
        </div>
        {!isAdmin && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Apply Leave
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { key: 'all',      label: 'Total Requests', color: '#6366F1' },
          { key: 'pending',  label: 'Pending',         color: '#D97706' },
          { key: 'approved', label: 'Approved',        color: '#10B981' },
          { key: 'rejected', label: 'Rejected',        color: '#EF4444' },
        ].map(card => (
          <div key={card.key} className="stat-card" style={{ cursor: 'pointer', border: filterStatus === card.key ? `2px solid ${card.color}` : '1px solid var(--border)' }}
            onClick={() => setFilterStatus(card.key)}>
            <div className="stat-info">
              <p>{card.label}</p>
              <h3>{counts[card.key]}</h3>
            </div>
            <div className="stat-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
              <Calendar size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Leave Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Status</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '2rem' }}>Loading leaves...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No leave requests found.</td></tr>
            ) : (
              filtered.map(leave => {
                const st = STATUS_CONF[leave.status] || STATUS_CONF.pending;
                const days = daysBetween(leave.from_date, leave.to_date);
                return (
                  <tr key={leave.id}>
                    {isAdmin && (
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{leave.employee_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emp #{leave.employee_id}</div>
                      </td>
                    )}
                    <td>
                      <span style={{ fontWeight: 500 }}>{leave.type}</span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{new Date(leave.from_date).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.875rem' }}>{new Date(leave.to_date).toLocaleDateString()}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: days > 5 ? '#EF4444' : 'var(--text-main)' }}>{days}d</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.25rem 0.625rem', borderRadius: 9999, backgroundColor: st.bg, color: st.color, fontWeight: 600 }}>
                        {st.icon}{st.label}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {leave.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => updateStatus(leave.id, 'approved')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.75rem', border: 'none', borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(leave.id, 'rejected')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.75rem', border: 'none', borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Apply for Leave</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleApply}>
              <div className="form-group">
                <label>Leave Type *</label>
                <select required className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t} Leave</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>From Date *</label>
                  <input required type="date" className="form-input" value={formData.from_date} onChange={e => setFormData({...formData, from_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>To Date *</label>
                  <input required type="date" className="form-input" min={formData.from_date} value={formData.to_date} onChange={e => setFormData({...formData, to_date: e.target.value})} />
                </div>
              </div>
              {formData.from_date && formData.to_date && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>
                  📅 Duration: {daysBetween(formData.from_date, formData.to_date)} day(s)
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
