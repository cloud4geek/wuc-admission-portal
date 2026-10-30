import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(
    () => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('expired') === '1')
      ? 'Your session expired after 10 minutes of inactivity. Please sign in again.'
      : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed'); return; }
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      navigate('/admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <img src="http://wuc.edu.gh/wp-content/uploads/2023/08/Withrow-Logo-scaled.jpg" alt="Withrow University College"
              style={{ height: '60px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Administration Portal
          </h2>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Logo backdrop */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '250px', height: '250px',
            backgroundImage: 'url(http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg)',
            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            opacity: 0.15, pointerEvents: 'none',
            mixBlendMode: 'screen',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'white' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: 'rgba(255,255,255,0.9)' }}>Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="admin@wuc.edu.gh"
                autoComplete="email"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: 'rgba(255,255,255,0.9)' }}>Password</label>
              <PasswordInput
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: (e.target as HTMLInputElement).value })}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: '0.5rem' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <Link to="/admin/forgot-password" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
              Forgot password?
            </Link>
          </div>
          </div>{/* End zIndex wrapper */}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>
            ← Back to Admission Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
