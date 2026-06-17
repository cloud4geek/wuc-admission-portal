import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const StudentForgotPassword: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/api/students/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, email }),
      });
      const data = await res.json();
      setMessage(data.message || 'Request sent.');
      setSuccess(data.success);
    } catch {
      setMessage('Network error. Please try again.');
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
              <li><Link to="/student/login">Back to Login</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <h2>Reset Password</h2>
          <p>Enter your Student ID and email to receive a password reset link.</p>
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
                <label>Student ID *</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. WUC/RG/25/0001"
                  required
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your registered email"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Check your email for the reset link. It expires in 1 hour.
              </p>
              <Link to="/student/login">
                <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Login</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentForgotPassword;
