import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (role) => {
    if (role === 'admin') { setEmail('admin@company.com'); setPassword('admin123'); }
    else                  { setEmail('employee@company.com'); setPassword('employee123'); }
  };

  return (
    <div className="auth-container">
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="glass-card" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366F1, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
            <Zap size={28} color="#fff" />
          </div>
        </div>

        <h1 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Smart Payroll</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Sign in to your HR dashboard</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email" id="email" className="form-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password" id="password" className="form-input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn" disabled={isLoading} style={{ marginTop: '1rem' }}>
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Signing in...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogIn size={18} /> Sign In
              </span>
            )}
          </button>
        </form>

        {/* Demo Quick-Fill */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Accounts</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button onClick={() => quickFill('admin')}
              style={{ padding: '0.5rem', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, background: 'rgba(99,102,241,0.06)', color: '#6366F1', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.12)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.06)'}
            >
              👑 Admin Login
            </button>
            <button onClick={() => quickFill('employee')}
              style={{ padding: '0.5rem', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, background: 'rgba(16,185,129,0.06)', color: '#10B981', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.12)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.06)'}
            >
              👤 Employee Login
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
