import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, UserPlus, X, Briefcase, ExternalLink, UserCog } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Teams() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [teams, setTeams]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showTeamModal, setShowTeamModal]       = useState(false);
  const [showMemberModal, setShowMemberModal]   = useState(null); // team id
  const [showLeaderModal, setShowLeaderModal]   = useState(null); // team id
  const [leaderForm, setLeaderForm]             = useState({ leader_id: '' });
  
  // Leaders Chat State
  const [showLeaderChat, setShowLeaderChat]     = useState(false);
  const [leaderMessages, setLeaderMessages]     = useState([]);
  const [leaderChatInput, setLeaderChatInput]   = useState('');

  const [teamForm, setTeamForm] = useState({ name: '', department: '', leader_id: '' });
  const [memberForm, setMemberForm] = useState({ employee_id: '' });

  useEffect(() => {
    fetchTeams();
    if (isAdmin) fetchEmployees();
  }, []);

  useEffect(() => {
    let interval;
    if (showLeaderChat) {
      fetchLeaderMessages();
      interval = setInterval(fetchLeaderMessages, 5000);
    }
    return () => clearInterval(interval);
  }, [showLeaderChat]);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams/');
      setTeams(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees/');
      setEmployees(res.data);
    } catch (e) { console.error(e); }
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teams/', {
        ...teamForm,
        leader_id: teamForm.leader_id || null
      });
      setTeams([res.data, ...teams]);
      setShowTeamModal(false);
      setTeamForm({ name: '', department: '', leader_id: '' });
      fetchTeams(); // refresh to get member list
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create team');
    }
  };

  const deleteTeam = async (id) => {
    if (!confirm('Delete this team and all its memberships?')) return;
    try {
      await api.delete(`/teams/${id}`);
      setTeams(teams.filter(t => t.id !== id));
    } catch (e) { alert(e.response?.data?.error || 'Failed to delete team'); }
  };

  const addMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/teams/${showMemberModal}/members`, {
        employee_id: memberForm.employee_id
      });
      setShowMemberModal(null);
      setMemberForm({ employee_id: '' });
      fetchTeams();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to add member');
    }
  };

  const changeLeader = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/teams/${showLeaderModal}/leader`, { leader_id: leaderForm.leader_id });
      setShowLeaderModal(null);
      setLeaderForm({ leader_id: '' });
      fetchTeams();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to change leader');
    }
  };

  const fetchLeaderMessages = async () => {
    try {
      const res = await api.get('/leaders_chat/messages');
      setLeaderMessages(res.data);
    } catch (e) { console.error('Leader chat fetch error', e); }
  };

  const sendLeaderMessage = async (e) => {
    e.preventDefault();
    if (!leaderChatInput.trim()) return;
    try {
      const res = await api.post('/leaders_chat/messages', { content: leaderChatInput });
      setLeaderMessages([...leaderMessages, res.data]);
      setLeaderChatInput('');
    } catch (e) { alert('Failed to send message'); }
  };

  const removeMember = async (teamId, empId) => {
    try {
      await api.delete(`/teams/${teamId}/members/${empId}`);
      fetchTeams();
    } catch (e) { alert('Failed to remove member'); }
  };

  const DEPT_COLORS = {
    Engineering: '#6366F1', Marketing: '#F59E0B', Sales: '#10B981',
    HR: '#EC4899', Finance: '#14B8A6', Design: '#8B5CF6'
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teams</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage team structures and assignments.</p>
        </div>
        {isAdmin && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowTeamModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Create Team
          </button>
        )}
        {(isAdmin || teams.some(t => t.is_leader)) && (
          <button className="btn" style={{ width: 'auto', marginLeft: '1rem', backgroundColor: 'var(--text-main)', color: 'var(--surface)' }} onClick={() => setShowLeaderChat(!showLeaderChat)}>
            <Users size={18} style={{ marginRight: '0.5rem' }} />
            {showLeaderChat ? 'Hide Leaders Chat' : 'Leaders Chat'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-info"><p>Total Teams</p><h3>{teams.length}</h3></div>
          <div className="stat-icon"><Briefcase size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p>Total Members</p><h3>{teams.reduce((s, t) => s + (t.member_count || 0), 0)}</h3></div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}><Users size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p>Departments</p><h3>{new Set(teams.map(t => t.department).filter(Boolean)).size}</h3></div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' }}><Briefcase size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p>Avg Team Size</p><h3>{teams.length ? (teams.reduce((s, t) => s + t.member_count, 0) / teams.length).toFixed(1) : 0}</h3></div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(236,72,153,0.1)', color: '#EC4899' }}><Users size={20} /></div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading teams...</div>}

      {!loading && teams.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <Briefcase size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No teams created yet. Click "Create Team" to get started.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {teams.map(team => {
          const deptColor = DEPT_COLORS[team.department] || '#6366F1';
          return (
            <div key={team.id} className="table-container" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{team.name}</h3>
                  {team.department && (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 9999, backgroundColor: `${deptColor}20`, color: deptColor, fontWeight: 600 }}>
                      {team.department}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/teams/${team.id}`)}
                      title="Open Workspace"
                      style={{ padding: '0.375rem', background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: 6, color: '#10B981', cursor: 'pointer' }}>
                      <ExternalLink size={16} />
                    </button>
                    <button onClick={() => setShowMemberModal(team.id)}
                      title="Add Member"
                      style={{ padding: '0.375rem', background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 6, color: '#6366F1', cursor: 'pointer' }}>
                      <UserPlus size={16} />
                    </button>
                    <button onClick={() => { setShowLeaderModal(team.id); setLeaderForm({ leader_id: team.leader_id || '' }); }}
                      title="Change Leader"
                      style={{ padding: '0.375rem', background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: 6, color: '#D97706', cursor: 'pointer' }}>
                      <UserCog size={16} />
                    </button>
                    <button onClick={() => deleteTeam(team.id)}
                      title="Delete Team"
                      style={{ padding: '0.375rem', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Leader: <strong style={{ color: 'var(--text-main)' }}>{team.leader_name || 'N/A'}</strong>
              </div>
              <button onClick={() => navigate(`/teams/${team.id}`)}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#6366F1', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <ExternalLink size={14} /> Open Team Workspace
              </button>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Members ({team.member_count})
                </div>
                {team.members && team.members.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {team.members.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', borderRadius: 6, backgroundColor: 'var(--surface-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#6366F1' }}>
                            {m.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{m.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.role}</div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => removeMember(team.id, m.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No members yet.</p>
                )}
              </div>
            </div>
          );
          })}
        </div>

        {showLeaderChat && (
          <div className="table-container" style={{ width: '400px', height: '600px', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Leaders' Communication Hub</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leaderMessages.map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{msg.sender_name}</div>
                   <div style={{ padding: '0.6rem 0.8rem', borderRadius: '12px', backgroundColor: msg.sender_id === user?.id ? 'var(--primary)' : 'var(--surface-secondary)', color: msg.sender_id === user?.id ? 'white' : 'inherit', fontSize: '0.85rem' }}>
                     {msg.content}
                   </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendLeaderMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ marginBottom: 0 }} 
                placeholder="Message other leaders..." 
                value={leaderChatInput}
                onChange={(e) => setLeaderChatInput(e.target.value)}
              />
              <button type="submit" className="btn" style={{ width: 'auto' }}>Send</button>
            </form>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showTeamModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create Team</h2>
              <button onClick={() => setShowTeamModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={createTeam}>
              <div className="form-group">
                <label>Team Name *</label>
                <input required type="text" className="form-input" placeholder="e.g. Frontend Squad" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select className="form-input" value={teamForm.department} onChange={e => setTeamForm({...teamForm, department: e.target.value})}>
                  <option value="">Select Department</option>
                  {Object.keys(DEPT_COLORS).map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Team Lead</label>
                <select className="form-input" value={teamForm.leader_id} onChange={e => setTeamForm({...teamForm, leader_id: e.target.value})}>
                  <option value="">— No Lead —</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowTeamModal(false)}>Cancel</button>
                <button type="submit" className="btn">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add Team Member</h2>
              <button onClick={() => setShowMemberModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={addMember}>
              <div className="form-group">
                <label>Select Employee *</label>
                <select required className="form-input" value={memberForm.employee_id} onChange={e => setMemberForm({employee_id: e.target.value})}>
                  <option value="">Choose employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowMemberModal(null)}>Cancel</button>
                <button type="submit" className="btn">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Leader Modal */}
      {showLeaderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: 420, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Change Team Leader</h2>
              <button onClick={() => setShowLeaderModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={changeLeader}>
              <div className="form-group">
                <label>Select New Team Leader *</label>
                <select required className="form-input" value={leaderForm.leader_id} onChange={e => setLeaderForm({ leader_id: e.target.value })}>
                  <option value="">— Choose Employee —</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}
                </select>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                The selected person will become the new team leader. They will be added to the team automatically if not already a member.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowLeaderModal(null)}>Cancel</button>
                <button type="submit" className="btn" style={{ backgroundColor: '#D97706', color: 'white' }}>Change Leader</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
