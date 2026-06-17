import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const StudentLogin: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/students/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Login failed');
        return;
      }

      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentInfo', JSON.stringify(data.student));
      navigate('/student/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
            <div>
              <h1>Withrow University College</h1>
              <span className="logo-sub">Student Portal</span>
            </div>
          </div>
          <nav>
            <ul className="nav-links">
              <li><Link to="/">Admission Portal</Link></li>
              <li><Link to="/application-status">Check Status</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <h2>Student Portal Login</h2>
          <p>Access your student dashboard, fee information, and more.</p>
        </div>
      </div>

      <div className="container-sm">
        <div className="card" style={{ maxWidth: '420px', margin: '2rem auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', fontSize: '1.5rem',
            }}>🎓</div>
            <h3 className="section-title" style={{ margin: 0 }}>Student Login</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Enter your Student ID and password
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Student ID *</label>
              <input
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="e.g. WUC/RG/25/0001"
                required
                autoFocus
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <p>Your login credentials were sent to your email when your admission was approved.</p>
            <p style={{ marginTop: '0.75rem' }}>
              <Link to="/student/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }}>Forgot your password?</Link>
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Need help? Contact <a href="mailto:admissions@wuc.edu.gh" style={{ color: 'var(--primary)' }}>admissions@wuc.edu.gh</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
