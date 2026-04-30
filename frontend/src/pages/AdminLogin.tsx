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
  const [error, setError] = useState('');
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
            background: 'white',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)',
          }}>
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo"
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Administration Portal
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Withrow University College</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem',
          boxShadow: 'var(--shadow-xl)',
        }}>
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email Address</label>
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
              <label>Password</label>
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
            <Link to="/admin/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--primary-light)' }}>
              Forgot password?
            </Link>
          </div>
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
