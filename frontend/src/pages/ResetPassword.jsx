import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, Lock } from 'lucide-react';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract token from URL like ?token=xyz
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setIsLoading(true);

    try {
      const API_URL = 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      
      setMessage(data.message + " Redirecting to login...");
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="glass-card" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366F1, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
            <Zap size={28} color="#fff" />
          </div>
        </div>

        <h1 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Reset Password</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Create a new, strong password</p>

        {error && <div className="error-message">{error}</div>}
        {message && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ display: token ? 'none' : 'block' }}>
            <label htmlFor="token">Reset Token (If not auto-filled)</label>
            <input
              type="text" id="token" className="form-input"
              value={token} onChange={e => setToken(e.target.value)}
              placeholder="Paste token here" required={!token}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password" id="newPassword" className="form-input"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••" required minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password" id="confirmPassword" className="form-input"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••" required minLength="6"
            />
          </div>

          <button type="submit" className="btn" disabled={isLoading} style={{ marginTop: '1rem' }}>
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Resetting...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                <Lock size={18} /> Reset Password
              </span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.875rem', color: '#6366F1', textDecoration: 'none', fontWeight: 600 }}>Back to Login</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
