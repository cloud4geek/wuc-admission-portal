import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const StudentResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/api/students/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setMessage(data.message);
      setSuccess(data.success);
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div>
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
              <div><h1>Withrow University College</h1><span className="logo-sub">Student Portal</span></div>
            </div>
          </div>
        </header>
        <div className="container-sm" style={{ textAlign: 'center', marginTop: '3rem' }}>
          <div className="alert alert-error">Invalid reset link. Please request a new one.</div>
          <Link to="/student/forgot-password"><button className="btn btn-primary">Request New Link</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
            <div><h1>Withrow University College</h1><span className="logo-sub">Student Portal</span></div>
          </div>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <h2>Set New Password</h2>
          <p>Choose a strong password with at least 8 characters, one uppercase letter, and one number.</p>
        </div>
      </div>

      <div className="container-sm">
        <div className="card" style={{ maxWidth: '420px', margin: '2rem auto' }}>
          {message && (
            <div className={`alert ${success ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Your password has been reset successfully.
              </p>
              <Link to="/student/login">
                <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Login Now</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentResetPassword;
