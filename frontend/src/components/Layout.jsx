import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Briefcase, CheckSquare, CreditCard, Calendar, LogOut, Loader2 } from 'lucide-react';

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Employees', path: '/employees', icon: <Users size={20} />, adminOnly: true },
    { name: 'Teams', path: '/teams', icon: <Briefcase size={20} /> },
    { name: 'Tasks', path: '/tasks', icon: <CheckSquare size={20} /> },
    { name: 'Payroll', path: '/payroll', icon: <CreditCard size={20} /> },
    { name: 'Leaves', path: '/leaves', icon: <Calendar size={20} /> },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            P
          </div>
          Smart Payroll
        </div>
        
        <nav className="sidebar-nav">
          <div style={{ marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Main Menu
          </div>
          {navItems.map((item) => {
            if (item.adminOnly && user.role !== 'admin') return null;
            
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--surface-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--primary)',
              border: '2px solid var(--border)'
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              width: '100%', 
              padding: '0.5rem', 
              background: 'none', 
              border: 'none', 
              color: 'var(--danger)', 
              cursor: 'pointer',
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Action buttons could go here */}
          </div>
        </div>
        
        <div className="page-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
