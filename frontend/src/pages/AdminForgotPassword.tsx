import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.message || 'Request failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)', padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'white', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem',
            marginBottom: '1rem', boxShadow: 'var(--shadow-md)',
          }}>
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo"
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Reset Password
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Withrow University College</p>
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '2.25rem', boxShadow: 'var(--shadow-xl)' }}>
          {sent ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📧</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.75rem' }}>Check Your Email</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.6 }}>
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                  The link expires in 1 hour.
                </p>
              </div>
              <div className="alert alert-info">
                In development mode, check the backend console for the 📧 [DEV EMAIL] log containing the reset link.
              </div>
              <Link to="/admin/login">
                <button className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>Back to Login</button>
              </Link>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Enter your admin email address and we'll send you a link to reset your password.
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@wuc.edu.gh" autoComplete="email" />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <Link to="/admin/login" style={{ fontSize: '0.875rem', color: 'var(--primary-light)' }}>← Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
