import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ApplicationStatus: React.FC = () => {
  const [searchType, setSearchType] = useState('application');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApplication(null);
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const res = await fetch(
        `${API}/api/applications/status?searchType=${searchType}&searchValue=${encodeURIComponent(searchValue)}`
      );
      const data = await res.json();
      if (!data.success) {
        setApplication(null);
        alert(data.message || 'Application not found');
      } else {
        setApplication(data.application);
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; badge: string; message: string }> = {
    approved: {
      label: 'Approved',
      badge: 'badge-success',
      message: 'Congratulations! Your application has been approved. Download your admission letter below.',
    },
    pending: {
      label: 'Under Review',
      badge: 'badge-warning',
      message: 'Your application is under review. You will be notified via email once a decision is made.',
    },
    rejected: {
      label: 'Not Successful',
      badge: 'badge-danger',
      message: 'Unfortunately your application was not successful. Contact admissions for more information.',
    },
  };

  const searchLabels: Record<string, string> = {
    application: 'Application ID',
    voucher: 'Voucher Code',
    email: 'Email Address',
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
            <div>
              <h1>Withrow University College</h1>
              <span className="logo-sub">Admission Portal</span>
            </div>
          </div>
          <nav>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/purchase-voucher">Buy Voucher</Link></li>
              <li><Link to="/apply" className="nav-cta">Apply Now</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <h2>Application Status</h2>
          <p>Track your application using your Application ID, Voucher Code, or Email.</p>
        </div>
      </div>

      <div className="container-sm">
        <div className="card">
          <h3 className="section-title">Search Application</h3>
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label>Search By</label>
              <select value={searchType} onChange={e => setSearchType(e.target.value)}>
                <option value="application">Application ID</option>
                <option value="voucher">Voucher Code</option>
                <option value="email">Email Address</option>
              </select>
            </div>
            <div className="form-group">
              <label>{searchLabels[searchType]} *</label>
              <input
                type={searchType === 'email' ? 'email' : 'text'}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder={`Enter your ${searchLabels[searchType].toLowerCase()}`}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Check Status'}
            </button>
          </form>
        </div>

        {application && (() => {
          const cfg = statusConfig[application.status] || statusConfig.pending;
          return (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Application Details</h3>
                <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Application ID', value: application.application_id },
                  { label: 'Applicant Name', value: `${application.first_name} ${application.last_name}` },
                  { label: 'Type', value: application.application_type === 'topup' ? 'Top-Up / Access' : 'Regular' },
                  { label: 'Enrollment', value: application.enrollment_option || '—' },
                  { label: 'Submitted', value: application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : '—' },
                  { label: 'Reviewed', value: application.reviewed_at ? new Date(application.reviewed_at).toLocaleDateString() : 'Pending' },
                ].map(({ label, value }) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>

              <hr className="divider" />

              <div className={`alert alert-${application.status === 'approved' ? 'success' : application.status === 'rejected' ? 'error' : 'warning'}`}
                style={{ marginBottom: application.status === 'approved' ? '1rem' : 0 }}>
                {cfg.message}
              </div>

              {application.status === 'approved' && (
                <a
                  href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/applications/${application.application_id}/admission-letter`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="btn btn-success">Download Admission Letter</button>
                </a>
              )}

              {/* Print application form — available to all applicants */}
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => window.open(
                    `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/applications/${application.application_id}/application-form`,
                    '_blank'
                  )}
                >
                  🖨 Print Application Form
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ApplicationStatus;
