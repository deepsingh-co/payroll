import { useState, useEffect } from 'react';
import {
  CheckSquare, Plus, Clock, AlertCircle, CheckCircle2,
  Trash2, X, ShieldCheck, ShieldX, Eye, PlayCircle, UserCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_STYLES = {
  pending:        { bg: 'rgba(245,158,11,0.1)',  color: '#D97706', label: 'Pending'         },
  in_progress:    { bg: 'rgba(99,102,241,0.1)',  color: '#6366F1', label: 'In Progress'     },
  pending_review: { bg: 'rgba(234,88,12,0.1)',   color: '#EA580C', label: 'Awaiting Review' },
  completed:      { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', label: 'Completed'        },
};

const COMPLEXITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks]           = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [teams, setTeams]           = useState([]);
  const [currentEmp, setCurrentEmp] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewModal, setReviewModal]   = useState(null);

  const [formData, setFormData] = useState({
    title: '', assigned_to: '', complexity_score: 1,
    estimated_hours: 1, deadline: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tasksRes, empRes, teamsRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/employees/'),
        api.get('/teams/')
      ]);
      
      setTasks(tasksRes.data);
      setEmployees(empRes.data);
      setTeams(teamsRes.data);
      
      const mine = empRes.data.find(e => e.email === user?.email || e.user_id === user?.id);
      setCurrentEmp(mine);
    } catch (e) {
      console.error('Failed to fetch task data', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/');
      setTasks(res.data);
    } catch (e) { console.error(e); }
  };

  const myTeams = teams.filter(t => t.leader_id === currentEmp?.id);
  const isLeader = myTeams.length > 0;
  const canAssign = isAdmin || isLeader;

  let assignableEmployees = [];
  if (isAdmin) {
    const leaderIds = new Set(teams.map(t => t.leader_id).filter(Boolean));
    assignableEmployees = employees.filter(e => leaderIds.has(e.id));
  } else if (isLeader) {
    const memberIds = new Set(myTeams.flatMap(t => t.member_ids || []));
    assignableEmployees = employees.filter(e => memberIds.has(e.id));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks/', {
        ...formData,
        assigned_to: formData.assigned_to || null,
        complexity_score: parseInt(formData.complexity_score),
        estimated_hours: parseFloat(formData.estimated_hours),
      });
      setShowModal(false);
      setFormData({ title: '', assigned_to: '', complexity_score: 1, estimated_hours: 1, deadline: '' });
      fetchTasks();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create task');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tasks/${id}`, { status });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      setReviewModal(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update task');
    }
  };

  const startTask = async (id) => {
    try {
      await api.put(`/tasks/${id}`, { status: 'in_progress' });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to start task');
    }
  };

  const markForReview = async (id) => {
    if (!window.confirm('Submit this task for verification?')) return;
    await updateStatus(id, 'pending_review');
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (e) { alert(e.response?.data?.error || 'Failed to delete task'); }
  };

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const counts = {
    all:            tasks.length,
    pending:        tasks.filter(t => t.status === 'pending').length,
    in_progress:    tasks.filter(t => t.status === 'in_progress').length,
    pending_review: tasks.filter(t => t.status === 'pending_review').length,
    completed:      tasks.filter(t => t.status === 'completed').length,
  };

  const reviewTasks = tasks.filter(t => {
    if (t.status !== 'pending_review') return false;
    if (isAdmin) return true;
    return t.assigned_by === currentEmp?.id;
  });

  return (
    <div className="tasks-page-container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Tasks Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isAdmin ? 'Corporate oversight' : 'Team operations and delivery management.'}
          </p>
        </div>
        {canAssign && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px' }}>
            <Plus size={20} /> Assign New Task
          </button>
        )}
      </div>

      {/* Review Banner */}
      {reviewTasks.length > 0 && (
        <div className="review-banner" style={{
          background: 'linear-gradient(135deg, rgba(234,88,12,0.1), rgba(251,146,60,0.05))',
          border: '1px solid rgba(234,88,12,0.2)',
          borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#EA580C20', color: '#EA580C', padding: '0.75rem', borderRadius: '50%' }}><UserCheck size={24} /></div>
            <div>
              <div style={{ fontWeight: 700, color: '#EA580C' }}>{reviewTasks.length} Pending Verification Requests</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Action required: Review submitted deliverables.</div>
            </div>
          </div>
          <button className="btn" style={{ background: '#EA580C', color: '#fff' }} onClick={() => setFilterStatus('pending_review')}>Review Tasks</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { key: 'all', label: 'All Tasks', color: '#6366F1', icon: <CheckSquare /> },
          { key: 'pending', label: 'Pending', color: '#D97706', icon: <Clock /> },
          { key: 'in_progress', label: 'In Progress', color: '#6366F1', icon: <AlertCircle /> },
          { key: 'pending_review', label: 'In Review', color: '#EA580C', icon: <Eye /> },
          { key: 'completed', label: 'Completed', color: '#10B981', icon: <CheckCircle2 /> },
        ].map(card => (
          <div key={card.key} onClick={() => setFilterStatus(card.key)} className="stat-card" style={{
            cursor: 'pointer', background: 'var(--surface-main)', border: filterStatus === card.key ? `2px solid ${card.color}` : '1px solid var(--border)',
            padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{counts[card.key]}</div>
            </div>
            <div style={{ color: card.color, background: `${card.color}15`, padding: '0.5rem', borderRadius: '10px' }}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-container" style={{ background: 'var(--surface-main)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Task Details</th>
              <th style={{ padding: '1rem' }}>Assignee</th>
              <th style={{ padding: '1rem' }}>Verifier</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Fetching data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No tasks found in this view.</td></tr>
            ) : (
              filtered.map(task => {
                const st = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
                const isAssignedToMe = task.assigned_to === currentEmp?.id;
                const canVerify = isAdmin || (task.assigned_by === currentEmp?.id);
                
                return (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border)', background: task.status === 'pending_review' ? 'rgba(234,88,12,0.03)' : 'transparent' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{task.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Complexity: {COMPLEXITY_LABEL[task.complexity_score]} | {task.estimated_hours}h</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366F120', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>{task.assignee_name?.charAt(0)}</div>
                        <div style={{ fontSize: '0.9rem' }}>{task.assignee_name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{task.assigner_name || 'Admin'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '8px', background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {isAssignedToMe && task.status === 'pending' && <button className="action-btn" style={{ background: '#6366F1', color: '#fff' }} onClick={() => startTask(task.id)}><PlayCircle size={14} /> Start</button>}
                        {isAssignedToMe && (task.status === 'in_progress' || task.status === 'pending') && <button className="action-btn" style={{ background: '#10B981', color: '#fff' }} onClick={() => markForReview(task.id)}><CheckCircle2 size={14} /> Mark Done</button>}
                        {canVerify && task.status === 'pending_review' && <button className="action-btn" style={{ background: '#EA580C', color: '#fff' }} onClick={() => setReviewModal(task)}><ShieldCheck size={14} /> Verify</button>}
                        {(isAdmin || task.assigned_by === currentEmp?.id) && <button onClick={() => deleteTask(task.id)} style={{ color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      {reviewModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '450px', background: 'var(--surface-main)', padding: '2rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Review Deliverables</h2>
              <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
            </div>
            <div style={{ background: 'rgba(234,88,12,0.05)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(234,88,12,0.1)' }}>
              <div style={{ fontWeight: 700, color: '#EA580C', marginBottom: '0.5rem' }}>{reviewModal.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assigned to: {reviewModal.assignee_name} | Complexity: {COMPLEXITY_LABEL[reviewModal.complexity_score]}</div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>Verify the deliverables. Approval will close the task and trigger bonus points. Rejection will send it back for revision.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1.5px solid #EF4444', color: '#EF4444', background: '#EF444405', fontWeight: 700, cursor: 'pointer' }} onClick={() => updateStatus(reviewModal.id, 'in_progress')}>Reject</button>
              <button style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', color: '#fff', background: '#10B981', fontWeight: 700, cursor: 'pointer' }} onClick={() => updateStatus(reviewModal.id, 'completed')}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '500px', background: 'var(--surface-main)', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Assign Work</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Task Title</label>
                <input required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-secondary)' }} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Assign To</label>
                <select required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-secondary)' }} value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                  <option value="">Select individual...</option>
                  {assignableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Complexity</label>
                  <select className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }} value={formData.complexity_score} onChange={e => setFormData({ ...formData, complexity_score: e.target.value })}>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Hours</label>
                  <input type="number" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }} value={formData.estimated_hours} onChange={e => setFormData({ ...formData, estimated_hours: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 700 }}>Deploy Task</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .action-btn {
          border: none; padding: 0.4rem 0.75rem; borderRadius: 8px; font-size: 0.8rem; font-weight: 700;
          display: flex; align-items: center; gap: 0.35rem; cursor: pointer; transition: opacity 0.2s;
        }
        .action-btn:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
