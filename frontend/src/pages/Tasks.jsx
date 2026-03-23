import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Clock, AlertCircle, CheckCircle2, Trash2, X, User } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_STYLES = {
  pending:     { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', label: 'Pending'     },
  in_progress: { bg: 'rgba(99,102,241,0.12)',  color: '#6366F1', label: 'In Progress' },
  completed:   { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'Completed'   },
};

const COMPLEXITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    title: '', assigned_to: '', complexity_score: 1,
    estimated_hours: 1, deadline: ''
  });

  useEffect(() => {
    fetchTasks();
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/');
      setTasks(res.data);
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
      await api.post('/tasks/', {
        ...formData,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
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
      setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (e) { alert(e.response?.data?.error || 'Failed to delete task'); }
  };

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks & Workload</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track assignments and team progress.</p>
        </div>
        {isAdmin && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Assign Task
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { key: 'all',         label: 'Total Tasks',    icon: <CheckSquare size={20} />, color: '#6366F1' },
          { key: 'pending',     label: 'Pending',        icon: <Clock size={20} />,       color: '#D97706' },
          { key: 'in_progress', label: 'In Progress',    icon: <AlertCircle size={20} />, color: '#6366F1' },
          { key: 'completed',   label: 'Completed',      icon: <CheckCircle2 size={20} />,color: '#10B981' },
        ].map(card => (
          <div key={card.key} className="stat-card" style={{ cursor: 'pointer', border: filterStatus === card.key ? `2px solid ${card.color}` : '1px solid var(--border)' }}
            onClick={() => setFilterStatus(card.key)}>
            <div className="stat-info">
              <p>{card.label}</p>
              <h3>{counts[card.key]}</h3>
            </div>
            <div className="stat-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Complexity</th>
              <th>Est. Hours</th>
              <th>Deadline</th>
              <th>Status</th>
              {(isAdmin) && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading tasks...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No tasks found.</td></tr>
            ) : (
              filtered.map(task => {
                const st = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{task.id}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#6366F1' }}>
                          {task.assignee_name?.charAt(0) || '?'}
                        </div>
                        {task.assignee_name || 'Unassigned'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: 4, backgroundColor: task.complexity_score >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', color: task.complexity_score >= 3 ? '#EF4444' : '#6366F1', fontWeight: 600 }}>
                        {COMPLEXITY_LABEL[task.complexity_score] || task.complexity_score}
                      </span>
                    </td>
                    <td>{task.estimated_hours}h</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={task.status}
                          onChange={e => updateStatus(task.id, e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', backgroundColor: st.bg, color: st.color, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.625rem', borderRadius: 9999, backgroundColor: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Assign New Task</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input required type="text" className="form-input" placeholder="e.g. Design new landing page" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select className="form-input" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                  <option value="">— Unassigned —</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Complexity</label>
                  <select className="form-input" value={formData.complexity_score} onChange={e => setFormData({...formData, complexity_score: e.target.value})}>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                    <option value={4}>Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Hours</label>
                  <input type="number" min="0.5" step="0.5" className="form-input" value={formData.estimated_hours} onChange={e => setFormData({...formData, estimated_hours: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input type="datetime-local" className="form-input" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
