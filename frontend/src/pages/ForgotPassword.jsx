import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    setResetToken('');

    try {
      // Direct call to API since useAuth might not expose this yet
      const API_URL = 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }
      
      setMessage(data.message);
      if (data.reset_token) {
        setResetToken(data.reset_token);
      }
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

        <h1 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Forgot Password</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Enter your email to receive a reset link</p>

        {error && <div className="error-message">{error}</div>}
        {message && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{message}</div>}
        
        {resetToken && (
          <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px dashed #6366F1', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#6366F1', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>For demo purposes only:</p>
            <p style={{ margin: 0, fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text-main)', userSelect: 'all' }}>{resetToken}</p>
            <button 
              type="button" 
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              style={{ marginTop: '1rem', background: '#6366F1', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Proceed to Reset
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email" id="email" className="form-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required autoComplete="email"
            />
          </div>

          <button type="submit" className="btn" disabled={isLoading} style={{ marginTop: '1rem' }}>
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Sending...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                <Mail size={18} /> Send Reset Instructions
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
