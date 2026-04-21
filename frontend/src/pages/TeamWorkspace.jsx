import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Plus, AlertCircle, CheckCircle2, Clock,
  MessageSquare, ClipboardList, X, Users
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_STYLES = {
  pending:     { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', label: 'Pending'     },
  in_progress: { bg: 'rgba(99,102,241,0.12)',  color: '#6366F1', label: 'In Progress' },
  completed:   { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'Completed'   },
};

const COMPLEXITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };

export default function TeamWorkspace() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [team, setTeam]       = useState(null);
  const [myEmployee, setMyEmployee] = useState(null);
  const [tasks, setTasks]     = useState([]);
  const [messages, setMessages] = useState([]);
  const [issues, setIssues]   = useState([]);
  const [tab, setTab]         = useState('tasks'); // tasks | chat | issues

  // task form
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', assigned_to: '', complexity_score: 1, estimated_hours: 1, deadline: '' });

  // issue form
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '' });

  // chat
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  const isLeader = team && myEmployee && team.leader_id === myEmployee.id;
  const canAssignTasks = isAdmin || isLeader;

  useEffect(() => {
    fetchTeam();
    fetchMyEmployee();
  }, [teamId]);

  useEffect(() => {
    if (tab === 'tasks') fetchTasks();
    if (tab === 'chat')  { fetchMessages(); const iv = setInterval(fetchMessages, 4000); return () => clearInterval(iv); }
    if (tab === 'issues') fetchIssues();
  }, [tab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTeam = async () => {
    try {
      const res = await api.get('/teams/');
      const found = res.data.find(t => t.id === teamId);
      setTeam(found || null);
    } catch (e) { console.error(e); }
  };

  const fetchMyEmployee = async () => {
    try {
      const res = await api.get('/employees/me');
      setMyEmployee(res.data);
    } catch {}
  };

  const fetchTasks    = async () => { try { const r = await api.get(`/teams/${teamId}/tasks`);    setTasks(r.data); } catch (e) { console.error(e); } };
  const fetchMessages = async () => { try { const r = await api.get(`/teams/${teamId}/messages`); setMessages(r.data); } catch (e) { console.error(e); } };
  const fetchIssues   = async () => { try { const r = await api.get(`/teams/${teamId}/issues`);   setIssues(r.data); } catch (e) { console.error(e); } };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      const r = await api.post(`/teams/${teamId}/messages`, { content: chatInput });
      setMessages([...messages, r.data]);
      setChatInput('');
    } catch (err) { alert(err.response?.data?.error || 'Failed to send'); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/teams/${teamId}/tasks`, {
        ...taskForm,
        complexity_score: parseInt(taskForm.complexity_score),
        estimated_hours: parseFloat(taskForm.estimated_hours)
      });
      setShowTaskModal(false);
      setTaskForm({ title: '', assigned_to: '', complexity_score: 1, estimated_hours: 1, deadline: '' });
      fetchTasks();
    } catch (err) { alert(err.response?.data?.error || 'Failed to create task'); }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.put(`/teams/${teamId}/tasks/${taskId}/status`, { status });
      fetchTasks();
    } catch (err) { alert(err.response?.data?.error || 'Failed to update status'); }
  };

  const raiseIssue = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/teams/${teamId}/issues`, issueForm);
      setShowIssueModal(false);
      setIssueForm({ title: '', description: '' });
      fetchIssues();
    } catch (err) { alert(err.response?.data?.error || 'Failed to raise issue'); }
  };

  const resolveIssue = async (issueId, status) => {
    try {
      await api.put(`/teams/${teamId}/issues/${issueId}`, { status });
      fetchIssues();
    } catch (err) { alert(err.response?.data?.error || 'Failed to update issue'); }
  };

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (!team) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <Users size={40} style={{ marginBottom: '1rem' }} />
      <p>Loading team workspace…</p>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/teams')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.15rem' }}>{team.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              {team.department} · Leader: <strong style={{ color: 'var(--text-main)' }}>{team.leader_name}</strong> · {team.member_count} member{team.member_count !== 1 && 's'}
            </p>
          </div>
        </div>
        {canAssignTasks && tab === 'tasks' && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowTaskModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Assign Task
          </button>
        )}
        {tab === 'issues' && (
          <button className="btn" style={{ width: 'auto', backgroundColor: '#F59E0B', color: 'white' }} onClick={() => setShowIssueModal(true)}>
            <AlertCircle size={18} style={{ marginRight: '0.5rem' }} /> Raise Issue
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {[
          { key: 'tasks',  label: 'Tasks',  icon: <ClipboardList size={16} /> },
          { key: 'chat',   label: 'Team Chat', icon: <MessageSquare size={16} /> },
          { key: 'issues', label: 'Issues', icon: <AlertCircle size={16} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.2rem', background: 'none', cursor: 'pointer',
              border: 'none', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.2s', marginBottom: '-1px'
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── TASKS ─── */}
      {tab === 'tasks' && (
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
                {(canAssignTasks) && <th style={{ textAlign: 'right' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No tasks yet. Assign the first task!</td></tr>
              ) : tasks.map(task => {
                const st = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
                const isMyTask = myEmployee && task.assigned_to === myEmployee.id;
                return (
                  <tr key={task.id}>
                    <td><div style={{ fontWeight: 500 }}>{task.title}</div></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', color: '#6366F1' }}>
                          {task.assignee_name?.charAt(0)}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{task.assignee_name}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: 4, backgroundColor: task.complexity_score >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', color: task.complexity_score >= 3 ? '#EF4444' : '#6366F1', fontWeight: 600 }}>
                        {COMPLEXITY_LABEL[task.complexity_score] || task.complexity_score}
                      </span>
                    </td>
                    <td>{task.estimated_hours}h</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 9999, backgroundColor: st.bg, color: st.color, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </td>
                    {(canAssignTasks) && (
                      <td style={{ textAlign: 'right' }}>
                        <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value)}
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', cursor: 'pointer' }}>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    )}
                    {!canAssignTasks && isMyTask && task.status !== 'completed' && (
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => updateTaskStatus(task.id, 'completed')}
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={14} /> Mark Done
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── CHAT ─── */}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto', padding: '2rem' }}>
                <MessageSquare size={32} style={{ marginBottom: '0.5rem' }} />
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
            {messages.map(m => {
              const isMine = myEmployee && m.sender_id === myEmployee.id;
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: isMine ? 'var(--primary)' : 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: isMine ? 'white' : '#6366F1' }}>
                    {m.sender_name?.charAt(0)}
                  </div>
                  <div style={{ maxWidth: '65%' }}>
                    {!isMine && <div style={{ fontSize: '0.72rem', color: 'var(--text-main)', marginBottom: '0.2rem', fontWeight: 700 }}>{m.sender_name}</div>}
                    <div style={{ padding: '0.6rem 0.9rem', borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isMine ? 'var(--primary)' : 'var(--surface-secondary)', color: isMine ? 'white' : 'var(--text-main)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: isMine ? 'right' : 'left' }}>{fmtTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', background: 'var(--surface)' }}>
            <input
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message…"
              className="form-input" style={{ flex: 1, marginBottom: 0 }}
            />
            <button type="submit" className="btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ─── ISSUES ─── */}
      {tab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {issues.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <AlertCircle size={36} style={{ marginBottom: '1rem' }} />
              <p>No issues raised yet. Click "Raise Issue" to flag a problem.</p>
            </div>
          )}
          {issues.map(issue => (
            <div key={issue.id} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{issue.title}</span>
                  <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 9999, backgroundColor: issue.status === 'resolved' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: issue.status === 'resolved' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                    {issue.status}
                  </span>
                </div>
                {issue.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{issue.description}</p>}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Raised by <strong style={{ color: 'var(--text-main)' }}>{issue.raised_by}</strong> · {fmtTime(issue.created_at)}
                </div>
              </div>
              {canAssignTasks && issue.status === 'open' && (
                <button onClick={() => resolveIssue(issue.id, 'resolved')}
                  style={{ flexShrink: 0, marginLeft: '1rem', padding: '0.35rem 0.75rem', borderRadius: 6, border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10B981', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={14} /> Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Assign Task Modal ─── */}
      {showTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Assign Task</h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={createTask}>
              <div className="form-group">
                <label>Task Title *</label>
                <input required type="text" className="form-input" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Assign To (Team Member)</label>
                <select className="form-input" value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}>
                  <option value="">— Unassigned —</option>
                  {(team.members || []).map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Complexity</label>
                  <select className="form-input" value={taskForm.complexity_score} onChange={e => setTaskForm({...taskForm, complexity_score: e.target.value})}>
                    <option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option><option value={4}>Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Est. Hours</label>
                  <input type="number" min="0.5" step="0.5" className="form-input" value={taskForm.estimated_hours} onChange={e => setTaskForm({...taskForm, estimated_hours: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input type="datetime-local" className="form-input" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Raise Issue Modal ─── */}
      {showIssueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 460, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Raise an Issue</h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={raiseIssue}>
              <div className="form-group">
                <label>Issue Title *</label>
                <input required type="text" className="form-input" placeholder="Brief summary of the problem" value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" rows={3} placeholder="More details…" value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ background: '#F59E0B', color: 'white' }}>Submit Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
