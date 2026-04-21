import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, MailCheck, ShieldCheck } from 'lucide-react';

export default function VerifyEmail() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('idle'); // idle, verifying, success, error
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If the user was redirected here with an email query param, auto-fill it
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('verifying');
    setMessage('');

    if (!email || !token) {
      setStatus('error');
      setMessage('Please enter both email and verification code.');
      return;
    }

    try {
      const API_URL = 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email.');
      }
      
      setStatus('success');
      setMessage(data.message);
      
      // Auto redirect to login after a few seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
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

        <h1 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Verify Account</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Enter the 6-digit code sent to your email.</p>

        {status === 'success' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
             <ShieldCheck color="#10B981" size={56} />
             <p style={{ color: '#10B981', fontWeight: 600, fontSize: '1.1rem' }}>{message}</p>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Redirecting to login...</p>
          </div>
        ) : (
          <>
            {status === 'error' && <div className="error-message">{message}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email" id="email" className="form-input"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="token">6-Digit Verification Code</label>
                <input
                  type="text" id="token" className="form-input"
                  value={token} onChange={e => setToken(e.target.value)}
                  placeholder="123456" required
                  maxLength="6"
                  style={{ letterSpacing: '0.2em', fontSize: '1.2rem', textAlign: 'center' }}
                />
              </div>

              <button type="submit" className="btn" disabled={status === 'verifying'} style={{ marginTop: '1rem' }}>
                {status === 'verifying' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Verifying...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                    <MailCheck size={18} /> Verify Code
                  </span>
                )}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.875rem', color: '#6366F1', textDecoration: 'none', fontWeight: 600 }}>Back to Login</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
