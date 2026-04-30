import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input {...props} type={show ? 'text' : 'password'}
        style={{ ...(props.style || {}), paddingRight: '2.5rem', width: '100%' }} />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
          color: 'var(--text-muted)', padding: '0.2rem', lineHeight: 1,
        }}
        tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
};

const AdminResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (password !== confirm) return 'Passwords do not match';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/admin/login'), 3000);
      } else {
        setError(data.message || 'Reset failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)', padding: '1.5rem',
      }}>
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '2.25rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.75rem' }}>Invalid Reset Link</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            This link is missing a reset token. Please request a new password reset.
          </p>
          <Link to="/admin/forgot-password">
            <button className="btn btn-primary btn-full" style={{ marginTop: '1.25rem' }}>Request New Reset</button>
          </Link>
        </div>
      </div>
    );
  }

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
          <h2 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem' }}>Set New Password</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Withrow University College</p>
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '2.25rem', boxShadow: 'var(--shadow-xl)' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>✅</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.75rem' }}>Password Reset!</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Your password has been updated. Redirecting to login...
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Enter your new password. It must be at least 8 characters with an uppercase letter and a number.
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>New Password</label>
                  <PasswordInput required value={password} onChange={e => setPassword((e.target as HTMLInputElement).value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number" autoComplete="new-password" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Confirm Password</label>
                  <PasswordInput required value={confirm} onChange={e => setConfirm((e.target as HTMLInputElement).value)}
                    placeholder="Re-enter password" autoComplete="new-password" />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                  {loading ? 'Resetting...' : 'Reset Password'}
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

export default AdminResetPassword;
