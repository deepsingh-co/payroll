import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, CreditCard, Calendar, Briefcase, CheckSquare, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p>{label}</p>
        <h3>{value}</h3>
        {sub && <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>{sub}</p>}
      </div>
      <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState({
    employees: 0, teams: 0, pendingLeaves: 0, totalPayroll: 0,
    tasksDone: 0, tasksInProgress: 0, tasksPending: 0,
    recentLeaves: [], recentTasks: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const results = await Promise.allSettled([
          api.get('/employees/'),
          api.get('/teams/'),
          api.get('/leaves/'),
          api.get('/payroll/'),
          api.get('/tasks/'),
        ]);
        const [empRes, teamRes, leaveRes, payrollRes, taskRes] = results;

        const employees  = empRes.value?.data  || [];
        const teams      = teamRes.value?.data  || [];
        const leaves     = leaveRes.value?.data || [];
        const payrolls   = payrollRes.value?.data || [];
        const tasks      = taskRes.value?.data  || [];

        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthPayrolls = payrolls.filter(p => p.month === currentMonth);
        const totalPayroll  = monthPayrolls.reduce((s, p) => s + (p.net_salary || 0), 0);

        setStats({
          employees:   employees.length,
          teams:       teams.length,
          pendingLeaves: leaves.filter(l => l.status === 'pending').length,
          totalPayroll,
          tasksDone:      tasks.filter(t => t.status === 'completed').length,
          tasksInProgress: tasks.filter(t => t.status === 'in_progress').length,
          tasksPending:   tasks.filter(t => t.status === 'pending').length,
          recentLeaves: leaves.slice(-5).reverse(),
          recentTasks:  tasks.slice(-5).reverse(),
        });
      } catch (e) {
        console.error('Dashboard fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const fmt = (n) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n.toFixed(2)}`;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, <strong>{user?.name}</strong>! Here's what's happening.</p>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {isAdmin && <StatCard label="Total Employees" value={stats.employees} icon={<Users size={20} />} color="var(--primary)" sub="Active workforce" />}
        {isAdmin && <StatCard label="Active Teams" value={stats.teams} icon={<Briefcase size={20} />} color="var(--success-text)" sub="Current departments" />}
        {isAdmin && <StatCard label="Pending Leaves" value={stats.pendingLeaves} icon={<Calendar size={20} />} color="var(--warning-text)" sub="Awaiting approval" />}
        {isAdmin && <StatCard label="Monthly Payroll" value={fmt(stats.totalPayroll)} icon={<CreditCard size={20} />} color="var(--danger)" sub={`${new Date().toLocaleString('default', { month: 'long' })} payout`} />}
        <StatCard label="Tasks Pending" value={stats.tasksPending} icon={<Clock size={20} />} color="var(--warning-text)" sub="Need attention" />
        <StatCard label="In Progress" value={stats.tasksInProgress} icon={<CheckSquare size={20} />} color="var(--primary)" sub="Currently active" />
        <StatCard label="Completed" value={stats.tasksDone} icon={<CheckCircle2 size={20} />} color="var(--success-text)" sub="Finished tasks" />
        {!isAdmin && <StatCard label="My Leave Status" value={stats.pendingLeaves} icon={<Calendar size={20} />} color="#EC4899" sub="Pending requests" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Recent Tasks */}
        <div className="table-container" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Tasks</h3>
            <Link to="/tasks" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>View All →</Link>
          </div>
          {stats.recentTasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tasks assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.recentTasks.map(task => {
                const statusColors = { pending: '#D97706', in_progress: '#6366F1', completed: '#10B981' };
                const color = statusColors[task.status] || '#6B7280';
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderRadius: 8, backgroundColor: 'var(--surface-secondary)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{task.title}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>{task.assignee_name}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 9999, backgroundColor: `${color}20`, color, fontWeight: 600 }}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Leave Requests */}
        <div className="table-container" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Leave Requests</h3>
            <Link to="/leaves" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>View All →</Link>
          </div>
          {stats.recentLeaves.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No leave requests found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.recentLeaves.map(l => {
                const statusColors = { pending: '#D97706', approved: '#10B981', rejected: '#EF4444' };
                const color = statusColors[l.status] || '#6B7280';
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderRadius: 8, backgroundColor: 'var(--surface-secondary)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{l.employee_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.type} Leave • {new Date(l.from_date).toLocaleDateString()} – {new Date(l.to_date).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 9999, backgroundColor: `${color}20`, color, fontWeight: 600 }}>
                      {l.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {isAdmin && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { to: '/employees', label: '+ Add Employee', color: '#6366F1' },
              { to: '/teams',     label: '+ Create Team',  color: '#10B981' },
              { to: '/tasks',     label: '+ Assign Task',  color: '#D97706' },
              { to: '/payroll',   label: '+ Run Payroll',  color: '#EF4444' },
              { to: '/leaves',    label: 'Review Leaves',  color: '#EC4899' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: `1px solid ${a.color}40`, color: a.color, fontWeight: 600, fontSize: '0.875rem', backgroundColor: `${a.color}10`, textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = `${a.color}20`}
                onMouseOut={e => e.currentTarget.style.backgroundColor = `${a.color}10`}
              >{a.label}</Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
