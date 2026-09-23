import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LecturerLogin: React.FC = () => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/lecturers/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Login failed'); return; }
      localStorage.setItem('lecturerToken', data.token);
      localStorage.setItem('lecturerInfo', JSON.stringify(data.lecturer));
      navigate('/lecturer/dashboard');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
            <div><h1>Withrow University College</h1><span className="logo-sub">Lecturer Portal</span></div>
          </div>
          <nav><ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/student/login">Student Portal</Link></li>
          </ul></nav>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <h2>Lecturer Portal</h2>
          <p>Manage courses, upload grades, and view student enrollments.</p>
        </div>
      </div>

      <div className="container-sm">
        <div className="card" style={{ maxWidth: 420, margin: '2rem auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Staff Login</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Enter your Staff ID and password</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Staff ID</label>
              <input type="text" value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="e.g. WUC/LEC/001" required style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LecturerLogin;