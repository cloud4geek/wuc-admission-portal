import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LecturerSetupPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const staffId = searchParams.get('staffId') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setLoading(true); setMessage('');
    try {
      const res = await fetch(`${API}/api/lecturers/setup-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, staffId, password }),
      });
      const data = await res.json();
      setMessage(data.message);
      setSuccess(data.success);
    } catch { setMessage('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (!token || !staffId) {
    return (
      <div>
        <header className="header"><div className="header-content"><div className="logo-section">
          <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC" />
          <div><h1>Withrow University College</h1><span className="logo-sub">Lecturer Portal</span></div>
        </div></div></header>
        <div className="container-sm" style={{ textAlign: 'center', marginTop: '3rem' }}>
          <div className="alert alert-error">Invalid setup link. Please contact administration for a new link.</div>
          <Link to="/lecturer/login"><button className="btn btn-primary">Go to Login</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="header"><div className="header-content"><div className="logo-section">
        <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC" />
        <div><h1>Withrow University College</h1><span className="logo-sub">Lecturer Portal</span></div>
      </div></div></header>

      <div className="page-hero"><div className="page-hero-inner">
        <h2>Set Up Your Password</h2>
        <p>Create a password for your staff account: <strong>{staffId}</strong></p>
      </div></div>

      <div className="container-sm">
        <div className="card" style={{ maxWidth: 420, margin: '2rem auto' }}>
          {message && <div className={`alert ${success ? 'alert-success' : 'alert-error'}`}>{message}</div>}

          {!success ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Staff ID</label>
                <input type="text" value={staffId} disabled style={{ background: 'var(--surface-2)', fontWeight: 700 }} />
              </div>
              <div className="form-group">
                <label>Create Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  placeholder="Min 8 chars, 1 uppercase, 1 number" />
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Re-enter password" />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Setting up...' : 'Activate Account'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Your account is now active. Log in with your Staff ID and password.</p>
              <Link to="/lecturer/login"><button className="btn btn-primary">Go to Login</button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecturerSetupPassword;
