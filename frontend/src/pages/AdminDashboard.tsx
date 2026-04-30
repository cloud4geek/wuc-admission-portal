import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';

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

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
});

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ══════════════════════════════════════════════════════════
   Auth guard — redirects to login if no token
   ══════════════════════════════════════════════════════════ */
const useAuthGuard = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin/login', { replace: true });
  }, [navigate]);
};

/* ══════════════════════════════════════════════════════════
   Application Detail Page
   ══════════════════════════════════════════════════════════ */
const ApplicationDetail: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', open: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/admin/applications/${applicationId}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) { setApp(data.application); setNotes(data.application.admin_notes || ''); }
      } catch {} finally { setLoading(false); }
    })();
  }, [applicationId]);

  const doAction = async (action: string, body?: any) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/applications/${applicationId}/${action}`, {
        method: 'POST', headers: authHeaders(), body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      alert(data.message || 'Done');
      if (action === 'approve' || action === 'reject') navigate('/admin/applications');
    } catch { alert('Error'); } finally { setSaving(false); }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/admin/applications/${applicationId}/notes`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ notes }),
      });
      alert('Notes saved');
    } catch {} finally { setSaving(false); }
  };

  const sendEmail = async () => {
    if (!emailForm.subject || !emailForm.message) return alert('Subject and message required');
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/applications/${applicationId}/email`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      alert(data.message || 'Sent');
      setEmailForm({ subject: '', message: '', open: false });
    } catch { alert('Failed to send'); } finally { setSaving(false); }
  };

  const verifyDoc = async (docId: string) => {
    await fetch(`${API}/api/admin/documents/${docId}/verify`, { method: 'POST', headers: authHeaders() });
    setApp((a: any) => ({ ...a, documents: a.documents.map((d: any) => d.id === docId ? { ...d, status: 'verified' } : d) }));
  };

  if (loading) return <div className="spinner" />;
  if (!app) return <div className="card"><p>Application not found.</p></div>;

  const guardian = (() => { try { return JSON.parse(app.admin_notes || '{}')?.guardian || JSON.parse(app.admin_notes || '{}'); } catch { return null; } })();
  const coreGrades = (app.academicGrades || []).filter((g: any) => g.subject_type === 'core');
  const electiveGrades = (app.academicGrades || []).filter((g: any) => g.subject_type === 'elective');

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{title}</h4>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div style={{ marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <button onClick={() => navigate('/admin/applications')} className="btn btn-ghost btn-sm" style={{ marginBottom: '0.5rem' }}>← Back to Applications</button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>Application {app.application_id}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
            <span className={`badge ${app.application_type === 'topup' ? 'badge-warning' : 'badge-info'}`}>{app.application_type === 'topup' ? 'Top-Up' : 'Regular'}</span>
            <span className={`badge ${app.status === 'approved' ? 'badge-success' : app.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{app.status}</span>
          </div>
        </div>
        {app.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => doAction('approve')} className="btn btn-success" disabled={saving}>Approve</button>
            <button onClick={() => { const r = prompt('Reason (optional):'); if (r !== null) doAction('reject', { reason: r }); }} className="btn btn-danger" disabled={saving}>Reject</button>
          </div>
        )}
        {app.status === 'approved' && (
          <button onClick={async () => {
            setSaving(true);
            try {
              const res = await fetch(`${API}/api/admin/applications/${applicationId}/regenerate-letter`, {
                method: 'POST', headers: authHeaders(),
              });
              const data = await res.json();
              alert(data.message || 'Letter regenerated');
            } catch { alert('Failed'); } finally { setSaving(false); }
          }} className="btn btn-primary" disabled={saving}>
            {saving ? 'Generating...' : 'Regenerate Admission Letter'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start' }}>
        {/* Main content */}
        <div>
          <div className="card">
            <Section title="Personal Information">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                <Field label="Title" value={app.title} />
                <Field label="First Name" value={app.first_name} />
                <Field label="Last Name" value={app.last_name} />
                <Field label="Other Names" value={app.other_names} />
                <Field label="Gender" value={app.gender} />
                <Field label="Date of Birth" value={fmtDate(app.date_of_birth)} />
                <Field label="Nationality" value={app.nationality} />
                <Field label="Hometown" value={app.hometown} />
                <Field label="Email" value={app.email} />
                <Field label="Phone" value={app.phone} />
                <Field label="Physical Challenge" value={app.physical_challenge || 'None'} />
              </div>
              <Field label="Postal Address" value={app.postal_address} />
            </Section>

            {guardian && (
              <Section title="Guardian / Parent">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  <Field label="Name" value={guardian.name} />
                  <Field label="Relationship" value={guardian.relationship} />
                  <Field label="Occupation" value={guardian.occupation} />
                  <Field label="Phone" value={guardian.phone} />
                  <Field label="Email" value={guardian.email} />
                </div>
                <Field label="Address" value={guardian.postalAddress} />
              </Section>
            )}

            <Section title="Programme Choices">
              {(app.programmeChoices || []).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <span className="badge badge-info">{['1st', '2nd', '3rd'][p.preference - 1]}</span>
                  <span style={{ fontSize: '0.875rem' }}>{p.programme_label}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                <Field label="Enrollment" value={app.enrollment_option} />
                <Field label="Financing" value={Array.isArray(app.financing) ? app.financing.join(', ') : app.financing} />
              </div>
            </Section>

            {(app.institutionsAttended || []).length > 0 && (
              <Section title="Institutions Attended">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Institution</th><th>From</th><th>To</th><th>Certificate</th></tr></thead>
                    <tbody>
                      {app.institutionsAttended.map((inst: any, i: number) => (
                        <tr key={i}><td>{inst.institution_name}</td><td>{inst.date_from}</td><td>{inst.date_to}</td><td>{inst.certificate_awarded}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {coreGrades.length > 0 && (
              <Section title="WASSCE / SSCE Grades">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Subject</th><th>Index No.</th><th>Exam</th><th>Date</th><th>Grade</th></tr></thead>
                    <tbody>
                      {[...coreGrades, ...electiveGrades].map((g: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: g.subject_type === 'core' ? 600 : 400 }}>{g.subject_name} {g.subject_type === 'elective' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(elective)</span>}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{g.index_no || '—'}</td>
                          <td><span className="badge badge-neutral">{g.exam_type || '—'}</span></td>
                          <td>{g.date_taken || '—'}</td>
                          <td style={{ fontWeight: 700 }}>{g.grade || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {(app.diplomaQualifications || []).length > 0 && (
              <Section title="Diploma / HND Qualifications">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Qualification</th><th>Subject</th><th>Date</th><th>Grade</th></tr></thead>
                    <tbody>
                      {app.diplomaQualifications.map((q: any, i: number) => (
                        <tr key={i}><td>{q.qualification}</td><td>{q.subject_studied}</td><td>{q.date_obtained}</td><td>{q.grade}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {(app.employmentHistory || []).length > 0 && (
              <Section title="Employment History">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Employer</th><th>Position</th><th>From</th><th>To</th></tr></thead>
                    <tbody>
                      {app.employmentHistory.map((e: any, i: number) => (
                        <tr key={i}><td>{e.employer}</td><td>{e.position_held}</td><td>{e.date_from}</td><td>{e.date_to}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {app.total_years_worked && <Field label="Total Years Worked" value={app.total_years_worked} />}
              </Section>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Documents */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 className="section-title" style={{ fontSize: '0.875rem' }}>Documents</h4>
            {(app.documents || []).length === 0 ? (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>No documents uploaded</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {app.documents.map((doc: any) => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{doc.document_type.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.document_name} · {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <a href={`${API}/${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}>View</a>
                      {doc.status !== 'verified' ? (
                        <button onClick={() => verifyDoc(doc.id)} className="btn btn-success btn-sm" style={{ fontSize: '0.7rem' }}>Verify</button>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>✓ Verified</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Upload documents for this application */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Upload / Replace Documents
              </p>
              <input type="file" id="adminDocUpload" multiple accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
                onChange={async (e) => {
                  const fileList = e.target.files;
                  if (!fileList || fileList.length === 0) return;
                  setSaving(true);
                  try {
                    const fd = new FormData();
                    for (let i = 0; i < fileList.length; i++) {
                      const f = fileList[i];
                      const isImage = /\.(jpg|jpeg|png)$/i.test(f.name);
                      // First image file → photo, rest → certificates
                      if (isImage && !fd.has('photo')) {
                        fd.append('photo', f);
                      } else if (/\.pdf$/i.test(f.name)) {
                        if (!fd.has('certificates')) fd.append('certificates', f);
                        else if (!fd.has('birthCert')) fd.append('birthCert', f);
                        else if (!fd.has('transcripts')) fd.append('transcripts', f);
                      } else {
                        fd.append('certificates', f);
                      }
                    }
                    const res = await fetch(`${API}/api/applications/${app.application_id}/documents`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
                      body: fd,
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert('Documents uploaded successfully');
                      // Refresh the application detail
                      const r2 = await fetch(`${API}/api/admin/applications/${applicationId}`, { headers: authHeaders() });
                      const d2 = await r2.json();
                      if (d2.success) setApp(d2.application);
                    } else {
                      alert('Upload failed: ' + (data.message || 'Unknown error'));
                    }
                  } catch (err) {
                    alert('Upload error');
                  } finally {
                    setSaving(false);
                    e.target.value = '';
                  }
                }}
              />
              <button onClick={() => document.getElementById('adminDocUpload')?.click()}
                className="btn btn-ghost btn-sm btn-full" disabled={saving}>
                {saving ? 'Uploading...' : '📎 Upload Files'}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 className="section-title" style={{ fontSize: '0.875rem' }}>Admin Notes</h4>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              style={{ width: '100%', padding: '0.5rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', resize: 'vertical' }}
              placeholder="Internal notes about this application..." />
            <button onClick={saveNotes} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} disabled={saving}>Save Notes</button>
          </div>

          {/* Email applicant */}
          <div className="card">
            <h4 className="section-title" style={{ fontSize: '0.875rem' }}>Email Applicant</h4>
            {!emailForm.open ? (
              <button onClick={() => setEmailForm(f => ({ ...f, open: true }))} className="btn btn-ghost btn-sm btn-full">Compose Email</button>
            ) : (
              <div>
                <input type="text" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject" style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '0.5rem' }} />
                <textarea value={emailForm.message} onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Message to applicant..." rows={4}
                  style={{ width: '100%', padding: '0.5rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                  <button onClick={sendEmail} className="btn btn-primary btn-sm" disabled={saving}>Send</button>
                  <button onClick={() => setEmailForm({ subject: '', message: '', open: false })} className="btn btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <h4 className="section-title" style={{ fontSize: '0.875rem' }}>Timeline</h4>
            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>📝 Submitted: {fmtDate(app.submitted_at)}</div>
              {app.reviewed_at && <div>{app.status === 'approved' ? '✅' : '❌'} Reviewed: {fmtDate(app.reviewed_at)}</div>}
              {app.rejection_reason && <div style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>Reason: {app.rejection_reason}</div>}
            </div>
          </div>

          {/* Admission Letter — view/download for approved applications */}
          {app.status === 'approved' && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h4 className="section-title" style={{ fontSize: '0.875rem' }}>Admission Letter</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a
                  href={`${API}/api/applications/${app.application_id}/admission-letter`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-sm"
                >
                  👁 View / Download Letter
                </a>
                <a
                  href={`${API}/api/applications/${app.application_id}/application-form`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  📄 View Application Form
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Main Dashboard Component
   ══════════════════════════════════════════════════════════ */
const AdminDashboard: React.FC = () => {
  useAuthGuard();
  const location = useLocation();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [appFilter, setAppFilter] = useState({ type: '', status: '', search: '' });
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/dashboard/stats`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) { navigate('/admin/login'); return; }
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
  }, [navigate]);

  const fetchApplications = useCallback(async (page = 1) => {
    setLoadingApps(true);
    try {
      const params = new URLSearchParams();
      if (appFilter.type) params.set('type', appFilter.type);
      if (appFilter.status) params.set('status', appFilter.status);
      if (appFilter.search) params.set('search', appFilter.search);
      params.set('page', String(page));
      params.set('limit', '25');
      const res = await fetch(`${API}/api/admin/applications?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) { setApplications(data.applications); setPagination(data.pagination || { total: 0, page: 1, pages: 1 }); }
    } catch {} finally { setLoadingApps(false); }
  }, [appFilter]);

  const fetchVouchers = useCallback(async () => {
    setLoadingVouchers(true);
    try {
      const res = await fetch(`${API}/api/admin/vouchers`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setVouchers(data.vouchers);
    } catch {} finally { setLoadingVouchers(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname.includes('/applications')) fetchApplications();
    if (location.pathname.includes('/vouchers')) fetchVouchers();
  }, [location.pathname, fetchApplications, fetchVouchers]);

  const approveApp = async (appId: string) => {
    if (!window.confirm(`Approve ${appId}?`)) return;
    await fetch(`${API}/api/admin/applications/${appId}/approve`, { method: 'POST', headers: authHeaders() });
    fetchApplications(); fetchStats();
  };

  const rejectApp = async (appId: string) => {
    const reason = prompt('Reason (optional):');
    if (reason === null) return;
    await fetch(`${API}/api/admin/applications/${appId}/reject`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ reason }) });
    fetchApplications(); fetchStats();
  };

  const doBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedApps.length === 0) return alert('Select applications first');
    const reason = action === 'reject' ? prompt('Reason for rejection (optional):') : undefined;
    if (action === 'reject' && reason === null) return;
    if (!window.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} ${selectedApps.length} application(s)?`)) return;
    const res = await fetch(`${API}/api/admin/applications/bulk-action`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ applicationIds: selectedApps, action, reason }),
    });
    const data = await res.json();
    alert(data.message || 'Done');
    setSelectedApps([]);
    fetchApplications(); fetchStats();
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (appFilter.type) params.set('type', appFilter.type);
    if (appFilter.status) params.set('status', appFilter.status);
    window.open(`${API}/api/admin/export/applications?${params}&token=${localStorage.getItem('adminToken')}`, '_blank');
  };

  const toggleSelect = (appId: string) => {
    setSelectedApps(prev => prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]);
  };

  const toggleSelectAll = () => {
    const pendingIds = applications.filter(a => a.status === 'pending').map(a => a.application_id);
    setSelectedApps(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { return {}; }
  })();
  const adminFirstName = adminUser.username
    ? adminUser.username.charAt(0).toUpperCase() + adminUser.username.slice(1)
    : 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const navItems = [
    { to: '/admin', label: 'Overview', exact: true },
    { to: '/admin/applications', label: 'Applications' },
    { to: '/admin/vouchers', label: 'Vouchers' },
    { to: '/admin/fees', label: 'Fees' },
    ...(adminUser.role === 'super_admin' ? [{ to: '/admin/users', label: 'Users' }] : []),
  ];

  // Items hidden under "More ▾" dropdown
  const moreItems = [
    ...(adminUser.role === 'super_admin' ? [{ to: '/admin/audit',    label: '📋 Audit Log' }] : []),
    { to: '/admin/template', label: '🖼 Template' },
    ...(adminUser.role === 'super_admin' ? [{ to: '/admin/enrolments', label: '✅ Enrolments' }] : []),
  ];

  const isActive = (to: string, exact?: boolean) => exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/admin';
  const moreActive = moreItems.some(m => location.pathname.startsWith(m.to));

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
            <div><h1>WUC Administration</h1><span className="logo-sub">Admissions Management</span></div>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, marginLeft: '1.5rem' }}>
            <ul className="nav-links" style={{ flex: 1 }}>
              {navItems.map(({ to, label, exact }) => (
                <li key={to}><Link to={to} style={isActive(to, exact) || (exact && location.pathname === to) ? { background: 'rgba(255,255,255,0.18)', color: 'white' } : {}}>{label}</Link></li>
              ))}

              {/* ── More ▾ dropdown ── */}
              <li style={{ position: 'relative' }}>
                <button
                  onClick={() => setMoreOpen(o => !o)}
                  style={{
                    background: moreActive || moreOpen ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer',
                    padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-xs)',
                    fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  More <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{moreOpen ? '▲' : '▼'}</span>
                </button>
                {moreOpen && (
                  <>
                    {/* Backdrop to close on outside click */}
                    <div
                      onClick={() => setMoreOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    />
                    <ul style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                      background: 'var(--primary-dark, #0a2240)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
                      minWidth: '170px', padding: '0.35rem 0', zIndex: 100,
                      listStyle: 'none', margin: 0,
                    }}>
                      {moreItems.map(({ to, label }) => (
                        <li key={to}>
                          <Link
                            to={to}
                            onClick={() => setMoreOpen(false)}
                            style={{
                              display: 'block', padding: '0.5rem 1rem',
                              color: isActive(to) ? 'white' : 'rgba(255,255,255,0.75)',
                              background: isActive(to) ? 'rgba(255,255,255,0.12)' : 'transparent',
                              fontSize: '0.85rem', fontWeight: isActive(to) ? 600 : 400,
                              textDecoration: 'none', whiteSpace: 'nowrap',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.background = isActive(to) ? 'rgba(255,255,255,0.12)' : 'transparent')}
                          >
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>

              <li><Link to="/" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>Portal ↗</Link></li>
            </ul>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>{greeting},</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{adminFirstName}!</div>
              </div>
              <button onClick={handleLogout}
                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-xs)', padding: '0.4rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="container">
        <Routes>
          {/* ── Overview ── */}
          <Route path="/" element={
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>Dashboard Overview</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Current admissions cycle</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="stat-card blue"><div className="stat-label">Total Applications</div><div className="stat-value">{stats?.totalApplications ?? '—'}</div><div className="stat-sub">Regular: {stats?.regularApplications ?? 0} · Top-Up: {stats?.topupApplications ?? 0}</div></div>
                <div className="stat-card amber"><div className="stat-label">Pending</div><div className="stat-value">{stats?.pendingApplications ?? '—'}</div></div>
                <div className="stat-card green"><div className="stat-label">Approved</div><div className="stat-value">{stats?.approvedApplications ?? '—'}</div></div>
                <div className="stat-card" style={{ borderTop: '3px solid var(--danger)' }}><div className="stat-label">Rejected</div><div className="stat-value">{stats?.rejectedApplications ?? '—'}</div></div>
                <div className="stat-card purple"><div className="stat-label">Vouchers</div><div className="stat-value">{stats?.totalVouchers ?? '—'}</div><div className="stat-sub">{stats?.usedVouchers ?? 0} used</div></div>
              </div>

              {stats?.programmeBreakdown?.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 className="section-title">Applications by 1st Choice Programme</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {stats.programmeBreakdown.map((p: any) => (
                      <div key={p.programme_label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (p.count / stats.totalApplications) * 100)}%`, height: '100%', background: 'var(--primary-mid)', borderRadius: '4px', minWidth: '2px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '30px', textAlign: 'right', fontWeight: 700 }}>{p.count}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '200px' }}>{p.programme_label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="section-title">Quick Actions</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Link to="/admin/applications"><button className="btn btn-primary">Review Applications</button></Link>
                  <Link to="/admin/vouchers"><button className="btn btn-ghost">Manage Vouchers</button></Link>
                  <button onClick={exportCSV} className="btn btn-ghost">Export CSV</button>
                </div>
              </div>
            </div>
          } />

          {/* ── Applications list ── */}
          <Route path="/applications" element={
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>Applications</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{pagination.total} total · Page {pagination.page} of {pagination.pages}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={appFilter.type} onChange={e => setAppFilter(f => ({ ...f, type: e.target.value }))} className="form-group" style={{ padding: '0.4rem 0.6rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', margin: 0 }}>
                    <option value="">All Types</option><option value="regular">Regular</option><option value="topup">Top-Up</option>
                  </select>
                  <select value={appFilter.status} onChange={e => setAppFilter(f => ({ ...f, status: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    <option value="">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                  </select>
                  <input type="text" placeholder="Search…" value={appFilter.search} onChange={e => setAppFilter(f => ({ ...f, search: e.target.value }))}
                    style={{ padding: '0.4rem 0.6rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', minWidth: '160px' }} />
                  <button onClick={() => fetchApplications()} className="btn btn-primary btn-sm">Search</button>
                  <button onClick={exportCSV} className="btn btn-ghost btn-sm">Export CSV</button>
                </div>
              </div>

              {/* Bulk actions */}
              {selectedApps.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
                  <strong>{selectedApps.length} selected</strong>
                  <button onClick={() => doBulkAction('approve')} className="btn btn-success btn-sm">Approve All</button>
                  <button onClick={() => doBulkAction('reject')} className="btn btn-danger btn-sm">Reject All</button>
                  <button onClick={() => setSelectedApps([])} className="btn btn-ghost btn-sm">Clear</button>
                </div>
              )}

              {loadingApps ? <div className="spinner" /> : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '36px' }}><input type="checkbox" onChange={toggleSelectAll} checked={selectedApps.length > 0 && selectedApps.length === applications.filter(a => a.status === 'pending').length} style={{ cursor: 'pointer' }} /></th>
                        <th>ID</th><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No applications found</td></tr>}
                      {applications.map(app => (
                        <tr key={app.application_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/applications/${app.application_id}`)}>
                          <td onClick={e => e.stopPropagation()}>
                            {app.status === 'pending' && <input type="checkbox" checked={selectedApps.includes(app.application_id)} onChange={() => toggleSelect(app.application_id)} style={{ cursor: 'pointer' }} />}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{app.application_id}</td>
                          <td style={{ fontWeight: 600 }}>{app.first_name} {app.last_name}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{app.email}</td>
                          <td><span className={`badge ${app.application_type === 'topup' ? 'badge-warning' : 'badge-info'}`}>{app.application_type === 'topup' ? 'Top-Up' : 'Regular'}</span></td>
                          <td><span className={`badge ${app.status === 'approved' ? 'badge-success' : app.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{app.status}</span></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(app.submitted_at)}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <Link to={`/admin/applications/${app.application_id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}>View</Link>
                              {app.status === 'pending' && <>
                                <button onClick={() => approveApp(app.application_id)} className="btn btn-success btn-sm" style={{ fontSize: '0.7rem' }}>✓</button>
                                <button onClick={() => rejectApp(app.application_id)} className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }}>✗</button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.375rem', marginTop: '1rem' }}>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => fetchApplications(p)}
                      className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ minWidth: '36px' }}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          } />

          {/* ── Application Detail ── */}
          <Route path="/applications/:applicationId" element={<ApplicationDetail />} />

          {/* ── Vouchers ── */}
          <Route path="/vouchers" element={
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem' }}>Vouchers</h2>
              {loadingVouchers ? <div className="spinner" /> : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead>
                    <tbody>
                      {vouchers.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No vouchers</td></tr>}
                      {vouchers.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>{v.voucher_code}</td>
                          <td>{v.first_name} {v.last_name}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.email}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.phone}</td>
                          <td><span className={`badge ${v.status === 'used' ? 'badge-neutral' : v.status === 'expired' ? 'badge-danger' : 'badge-success'}`}>{v.status}</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(v.expires_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                              {/* Resend — available for any status */}
                              <button onClick={async () => {
                                const channel = window.confirm(
                                  `Resend voucher ${v.voucher_code} to:\n\nEmail: ${v.email}\nPhone: ${v.phone}\n\nClick OK to resend via both Email and SMS.`
                                );
                                if (!channel) return;
                                try {
                                  const res = await fetch(`${API}/api/vouchers/resend`, {
                                    method: 'POST',
                                    headers: authHeaders(),
                                    body: JSON.stringify({ voucherId: v.id }),
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    alert(`✅ Voucher resent!\n\nCode: ${v.voucher_code}\nEmail: ${v.email}\nPhone: ${v.phone}`);
                                  } else {
                                    alert('❌ Resend failed: ' + (data.message || 'Unknown error'));
                                  }
                                } catch {
                                  alert('❌ Network error. Please try again.');
                                }
                              }} className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem' }}>
                                📧 Resend
                              </button>
                              {v.status === 'unused' && (
                                <button onClick={async () => {
                                  if (!window.confirm(`Cancel voucher ${v.voucher_code}?\n\nThis cannot be undone.`)) return;
                                  await fetch(`${API}/api/admin/vouchers/${v.id}/cancel`, { method: 'POST', headers: authHeaders() });
                                  fetchVouchers();
                                }} className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }}>Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          } />

          {/* ── Fees Management ── */}
          <Route path="/fees" element={<FeesManagementPage />} />

          {/* ── Template Management ── */}
          <Route path="/template" element={<TemplateManagementPage />} />

          {/* ── Audit Log ── */}
          <Route path="/audit" element={<AuditLogPage />} />

          {/* ── Admin Users ── */}
          <Route path="/users" element={<AdminUsersPage />} />

          {/* ── Manual Enrolments (super_admin only) ── */}
          <Route path="/enrolments" element={<ManualEnrolmentPage />} />
        </Routes>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Fees Management Page (super_admin only)
   ══════════════════════════════════════════════════════════ */
const PROGRAMMES_LIST = [
  { id: 'bsc-public-health-disease',   label: 'BSc Public Health (Disease Control Option)' },
  { id: 'bsc-public-health-nutrition', label: 'BSc Public Health (Nutrition Option)' },
  { id: 'bsc-nursing',                 label: 'BSc Nursing' },
  { id: 'bsc-ph-disease-topup',        label: 'BSc Public Health (Disease Control) — Top-Up' },
  { id: 'bsc-ph-nutrition-topup',      label: 'BSc Public Health (Nutrition) — Top-Up' },
  { id: 'bsc-nursing-access',          label: 'BSc Nursing (Access Programme) — For NAC/NAP Certificate Holders' },
  { id: 'mature-access-topup',         label: 'BSc Nursing (Top-Up) — For Diploma in General Nursing or Related Field' },
];

const FeesManagementPage: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    programmeId: '', applicationType: 'regular', enrollmentOption: 'Regular',
    tuitionFee: '', facilityFee: '', libraryFee: '', ictFee: '',
    examinationFee: '', registrationFee: '', otherFees: '', otherFeesLabel: '', academicYear: '2025/2026',
    durationYears: '4', bankName: 'GCB BANK', bankBranch: 'AGONA BRANCH',
    bankAccountNo: '6201130004574', bankAccountName: 'WITHROW COLLEGE',
    initialPaymentPercent: '70', initialPaymentDeadline: 'September 1',
    balancePaymentDeadline: 'October 15', programmeStartDate: 'September 8',
  });
  const [saving, setSaving] = useState(false);
  const currentRole = (() => { try { return JSON.parse(localStorage.getItem('adminUser') || '{}').role; } catch { return 'admin'; } })();

  const fetchFees = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/fees`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setFees(data.fees);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const resetForm = () => {
    setForm({ programmeId: '', applicationType: 'regular', enrollmentOption: 'Regular',
      tuitionFee: '', facilityFee: '', libraryFee: '', ictFee: '',
      examinationFee: '', registrationFee: '', otherFees: '', otherFeesLabel: '', academicYear: '2025/2026',
      durationYears: '4', bankName: 'GCB BANK', bankBranch: 'AGONA BRANCH',
      bankAccountNo: '6201130004574', bankAccountName: 'WITHROW COLLEGE',
      initialPaymentPercent: '70', initialPaymentDeadline: 'September 1',
      balancePaymentDeadline: 'October 15', programmeStartDate: 'September 8' });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (fee: any) => {
    setForm({
      programmeId: fee.programme_id, applicationType: fee.application_type, enrollmentOption: fee.enrollment_option,
      tuitionFee: fee.tuition_fee, facilityFee: fee.facility_fee, libraryFee: fee.library_fee, ictFee: fee.ict_fee,
      examinationFee: fee.examination_fee, registrationFee: fee.registration_fee,
      otherFees: fee.other_fees, otherFeesLabel: fee.other_fees_label || '', academicYear: fee.academic_year,
      durationYears: fee.duration_years || '4', bankName: fee.bank_name || 'GCB BANK',
      bankBranch: fee.bank_branch || 'AGONA BRANCH', bankAccountNo: fee.bank_account_no || '6201130004574',
      bankAccountName: fee.bank_account_name || 'WITHROW COLLEGE',
      initialPaymentPercent: fee.initial_payment_percent || '70',
      initialPaymentDeadline: fee.initial_payment_deadline || 'September 1',
      balancePaymentDeadline: fee.balance_payment_deadline || 'October 15',
      programmeStartDate: fee.programme_start_date || 'September 8',
    });
    setEditId(fee.id);
    setShowForm(true);
  };

  const saveFee = async () => {
    const prog = PROGRAMMES_LIST.find(p => p.id === form.programmeId);
    if (!prog) return alert('Select a programme');
    setSaving(true);
    try {
      const body = { ...form, programmeLabel: prog.label };
      const url = editId ? `${API}/api/admin/fees/${editId}` : `${API}/api/admin/fees`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { resetForm(); fetchFees(); } else { alert(data.message || 'Failed'); }
    } catch { alert('Error saving'); } finally { setSaving(false); }
  };

  const deleteFee = async (id: string) => {
    if (!window.confirm('Delete this fee structure?')) return;
    await fetch(`${API}/api/admin/fees/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchFees();
  };

  const fmtGHS = (n: any) => `GHS ${parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

  const FeeInput = ({ label, field }: { label: string; field: string }) => (
    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
      <label style={{ fontSize: '0.75rem' }}>{label}</label>
      <input type="number" step="0.01" min="0" value={(form as any)[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder="0.00" style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem' }} />
    </div>
  );

  if (currentRole !== 'super_admin') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: 'var(--danger)' }}>Access Denied</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Only super admins can manage fee structures.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>Programme Fee Structures</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Fees are included in admission letters. Each programme + enrollment type + application type combination has its own fee structure.
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary btn-sm">
          {showForm ? 'Cancel' : '+ Add Fee Structure'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="section-title">{editId ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Programme *</label>
              <select value={form.programmeId} onChange={e => setForm(f => ({ ...f, programmeId: e.target.value }))} disabled={!!editId}>
                <option value="">Select Programme</option>
                {PROGRAMMES_LIST.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Application Type *</label>
              <select value={form.applicationType} onChange={e => setForm(f => ({ ...f, applicationType: e.target.value }))} disabled={!!editId}>
                <option value="regular">Regular</option>
                <option value="topup">Top-Up</option>
              </select>
            </div>
            <div className="form-group">
              <label>Enrollment Option *</label>
              <select value={form.enrollmentOption} onChange={e => setForm(f => ({ ...f, enrollmentOption: e.target.value }))} disabled={!!editId}>
                <option value="Regular">Regular</option>
                <option value="Weekend">Weekend</option>
                <option value="Sandwich">Sandwich</option>
              </select>
            </div>
            <div className="form-group">
              <label>Academic Year</label>
              <input type="text" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025/2026" />
            </div>
          </div>
          <hr className="divider" />
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fee Breakdown (GHS)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
            <FeeInput label="Tuition Fee" field="tuitionFee" />
            <FeeInput label="Facility / Maintenance" field="facilityFee" />
            <FeeInput label="Library Fee" field="libraryFee" />
            <FeeInput label="ICT / Technology" field="ictFee" />
            <FeeInput label="Examination Fee" field="examinationFee" />
            <FeeInput label="Registration Fee" field="registrationFee" />
            <FeeInput label="Other Fees" field="otherFees" />
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Other Fees Label</label>
              <input type="text" value={form.otherFeesLabel} onChange={e => setForm(f => ({ ...f, otherFeesLabel: e.target.value }))} placeholder="e.g. SRC Dues" />
            </div>
          </div>

          <hr className="divider" />
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Programme & Payment Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Duration (Years)</label>
              <input type="number" min="1" max="6" value={form.durationYears} onChange={e => setForm(f => ({ ...f, durationYears: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Programme Start Date</label>
              <input type="text" value={form.programmeStartDate} onChange={e => setForm(f => ({ ...f, programmeStartDate: e.target.value }))} placeholder="September 8" />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Initial Payment %</label>
              <input type="number" min="1" max="100" value={form.initialPaymentPercent} onChange={e => setForm(f => ({ ...f, initialPaymentPercent: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Initial Payment Deadline</label>
              <input type="text" value={form.initialPaymentDeadline} onChange={e => setForm(f => ({ ...f, initialPaymentDeadline: e.target.value }))} placeholder="September 1" />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Balance Payment Deadline</label>
              <input type="text" value={form.balancePaymentDeadline} onChange={e => setForm(f => ({ ...f, balancePaymentDeadline: e.target.value }))} placeholder="October 15" />
            </div>
          </div>

          <hr className="divider" />
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bank Account Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Account Name</label>
              <input type="text" value={form.bankAccountName} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Bank Name</label>
              <input type="text" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Account Number</label>
              <input type="text" value={form.bankAccountNo} onChange={e => setForm(f => ({ ...f, bankAccountNo: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Branch</label>
              <input type="text" value={form.bankBranch} onChange={e => setForm(f => ({ ...f, bankBranch: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={saveFee} className="btn btn-success" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create Fee Structure'}</button>
            <button onClick={resetForm} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Programme</th>
                <th>Type</th>
                <th>Enrollment</th>
                <th>Year</th>
                <th style={{ textAlign: 'right' }}>Total Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No fee structures defined yet</td></tr>}
              {fees.map(fee => (
                <tr key={fee.id}>
                  <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{fee.programme_label}</td>
                  <td><span className={`badge ${fee.application_type === 'topup' ? 'badge-warning' : 'badge-info'}`}>{fee.application_type}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{fee.enrollment_option}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fee.academic_year}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>{fmtGHS(fee.total_fee)}</td>
                  <td><span className={`badge ${fee.is_active ? 'badge-success' : 'badge-neutral'}`}>{fee.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => startEdit(fee)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}>Edit</button>
                      <button onClick={() => deleteFee(fee.id)} className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Admission Letter Template Management (super_admin)
   ══════════════════════════════════════════════════════════ */
const TemplateManagementPage: React.FC = () => {
  const [template, setTemplate] = useState<any>(null);
  const [registrar, setRegistrar] = useState({ name: 'Ms. Mary Yaa Boahemaa', title: 'Registrar', signaturePath: null as string | null });
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentStartY, setContentStartY] = useState(170);
  const currentRole = (() => { try { return JSON.parse(localStorage.getItem('adminUser') || '{}').role; } catch { return 'admin'; } })();

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/template`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        if (data.template) { setTemplate(data.template); setContentStartY(data.template.contentStartY || 170); }
        if (data.registrar) {
          setRegistrar(data.registrar);
          if (data.registrar.signaturePath) {
            const sigFile = data.registrar.signaturePath.split(/[\\/]/).pop();
            setSigPreview(`${API}/uploads/templates/${sigFile}`);
          }
        }
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('template', file);
      const res = await fetch(`${API}/api/admin/template/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` }, body: fd,
      });
      const data = await res.json();
      if (data.success) { setTemplate(data.template); setContentStartY(data.template.contentStartY || 170); alert(data.message); }
      else alert(data.message || 'Failed');
    } catch { alert('Upload error'); } finally { setSaving(false); e.target.value = ''; }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/template/fields`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ contentStartY }),
      });
      const data = await res.json();
      alert(data.message || 'Saved');
    } catch { alert('Error'); } finally { setSaving(false); }
  };

  const saveRegistrar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/registrar`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name: registrar.name, title: registrar.title }),
      });
      const data = await res.json();
      alert(data.message || 'Saved');
    } catch { alert('Error'); } finally { setSaving(false); }
  };

  const uploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('signature', file);
      const res = await fetch(`${API}/api/admin/registrar/signature`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` }, body: fd,
      });
      const data = await res.json();
      if (data.success) { setSigPreview(data.signatureUrl); alert('Signature uploaded'); }
      else alert(data.message || 'Failed');
    } catch { alert('Upload error'); } finally { setSaving(false); e.target.value = ''; }
  };

  const removeTemplate = async () => {
    if (!window.confirm('Remove template? Letters will use the default built-in format.')) return;
    await fetch(`${API}/api/admin/template`, { method: 'DELETE', headers: authHeaders() });
    setTemplate(null);
  };

  if (currentRole !== 'super_admin') {
    return <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><h3 style={{ color: 'var(--danger)' }}>Access Denied</h3></div>;
  }
  if (loading) return <div className="spinner" />;

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>Admission Letter Settings</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Configure the letterhead, registrar details, and signature that appear on every generated admission letter.
      </p>

      {/* ── Letterhead ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title">Letterhead Background</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Upload a PNG/JPG image of your letterhead (logo, college name, footer). The full letter body is written below it automatically.
        </p>
        {template ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>✅ Active: {template.filename}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploaded: {template.uploadedAt ? new Date(template.uploadedAt).toLocaleDateString() : '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {template.previewUrl && <a href={template.previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Preview</a>}
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>Replace<input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={uploadFile} style={{ display: 'none' }} /></label>
                <button onClick={removeTemplate} className="btn btn-danger btn-sm">Remove</button>
              </div>
            </div>
            <hr className="divider" />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Letter Body Start Position</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              How far from the top (in points) the letter body starts. Increase if text overlaps your letterhead. A4 = 842pt tall.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <input type="range" min="80" max="350" value={contentStartY} onChange={e => setContentStartY(parseInt(e.target.value))} style={{ flex: 1 }} />
              <input type="number" min="80" max="350" value={contentStartY} onChange={e => setContentStartY(parseInt(e.target.value) || 170)}
                style={{ width: '70px', padding: '0.3rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', textAlign: 'center' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pt</span>
            </div>
            <button onClick={saveSettings} className="btn btn-success btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save Position'}</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>No letterhead uploaded — using default built-in WUC header.</p>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              Upload Letterhead Image (PNG/JPG)
              <input type="file" accept=".png,.jpg,.jpeg" onChange={uploadFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* ── Registrar ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title">Registrar Details</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          The registrar's name, title, and signature appear at the bottom of every admission letter.
        </p>
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Registrar Name</label>
            <input type="text" value={registrar.name} onChange={e => setRegistrar(r => ({ ...r, name: e.target.value }))} placeholder="Ms. Mary Yaa Boahemaa" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Title</label>
            <input type="text" value={registrar.title} onChange={e => setRegistrar(r => ({ ...r, title: e.target.value }))} placeholder="Registrar" />
          </div>
        </div>
        <button onClick={saveRegistrar} className="btn btn-primary btn-sm" disabled={saving} style={{ marginBottom: '1.25rem' }}>
          {saving ? 'Saving...' : 'Save Registrar Details'}
        </button>

        <hr className="divider" />
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Registrar Signature</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Upload a PNG/JPG of the registrar's signature. It will appear above the name on every admission letter. Use a transparent background PNG for best results.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {sigPreview ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', background: 'var(--surface-2)' }}>
              <img src={sigPreview} alt="Signature" style={{ height: '60px', maxWidth: '180px', objectFit: 'contain', display: 'block' }} />
            </div>
          ) : (
            <div style={{ width: '180px', height: '60px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No signature</span>
            </div>
          )}
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            {sigPreview ? 'Replace Signature' : 'Upload Signature'}
            <input type="file" accept=".png,.jpg,.jpeg" onChange={uploadSignature} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* ── What's auto-generated ── */}
      <div className="card">
        <h3 className="section-title">What the system generates automatically</h3>
        <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: '1.25rem' }}>
          <li>Date, Reference number, Applicant name + email, Passport photo</li>
          <li>Salutation ("Dear [First Name],")</li>
          <li>Title: "OFFER OF ADMISSION FOR THE [YEAR] ACADEMIC YEAR"</li>
          <li>Opening paragraph with programme, duration, enrollment type, start date</li>
          <li>Point 1: Total fees in words + figures, bank account details (from Fees settings)</li>
          <li>Point 2: Initial payment % + balance with deadlines (from Fees settings)</li>
          <li>Points 3–7: Standard conditions (qualifications, provisions, medical, probation, non-refundable)</li>
          <li>"Congratulations" + "Yours Sincerely" + Registrar signature image + name + title</li>
        </ul>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Audit Log Page
   ══════════════════════════════════════════════════════════ */
const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/admin/audit-logs?limit=100`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setLogs(data.logs);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem' }}>Audit Log</h2>
      {loading ? <div className="spinner" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No audit logs yet</td></tr>}
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{log.admin_username || '—'}</td>
                  <td><span className="badge badge-info">{log.action}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{log.entity_type || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Admin Users Page
   ══════════════════════════════════════════════════════════ */
const AdminUsersPage: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'admin' });
  const currentRole = (() => { try { return JSON.parse(localStorage.getItem('adminUser') || '{}').role; } catch { return 'admin'; } })();

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAdmins(data.admins);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const createAdmin = async () => {
    if (!form.username || !form.email || !form.password) return alert('All fields required');
    try {
      const res = await fetch(`${API}/api/admin/users`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      alert(data.message);
      if (data.success) { setShowCreate(false); setForm({ username: '', email: '', password: '', role: 'admin' }); fetchAdmins(); }
    } catch { alert('Failed'); }
  };

  const toggleUser = async (id: string) => {
    await fetch(`${API}/api/admin/users/${id}/toggle`, { method: 'POST', headers: authHeaders() });
    fetchAdmins();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>Admin Users</h2>
        {currentRole === 'super_admin' && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm">
            {showCreate ? 'Cancel' : '+ New Admin'}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="section-title">Create Admin User</h3>
          <div className="form-grid">
            <div className="form-group"><label>Username</label><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label>Password (min 8 chars)</label><PasswordInput value={form.password} onChange={e => setForm(f => ({ ...f, password: (e.target as HTMLInputElement).value }))} /></div>
            <div className="form-group"><label>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <button onClick={createAdmin} className="btn btn-success">Create</button>
        </div>
      )}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Active</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.username}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.email}</td>
                  <td><span className={`badge ${a.role === 'super_admin' ? 'badge-info' : 'badge-neutral'}`}>{a.role}</span></td>
                  <td><span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}>{a.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(a.last_login)}</td>
                  <td>
                    {currentRole === 'super_admin' && (
                      <button onClick={() => toggleUser(a.id)} className={`btn btn-sm ${a.is_active ? 'btn-danger' : 'btn-success'}`} style={{ fontSize: '0.7rem' }}>
                        {a.is_active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Manual Enrolment Page (super_admin only)
   ══════════════════════════════════════════════════════════ */
const ENROL_PROGRAMMES = [
  { id: 'bsc-public-health-disease',   label: 'BSc Public Health (Disease Control Option)',  type: 'regular' },
  { id: 'bsc-public-health-nutrition', label: 'BSc Public Health (Nutrition Option)',         type: 'regular' },
  { id: 'bsc-nursing',                 label: 'BSc Nursing',                                  type: 'regular' },
  { id: 'bsc-ph-disease-topup',        label: 'BSc Public Health (Disease Control) — Top-Up', type: 'topup'   },
  { id: 'bsc-ph-nutrition-topup',      label: 'BSc Public Health (Nutrition) — Top-Up',       type: 'topup'   },
  { id: 'bsc-nursing-access',          label: 'BSc Nursing (Access Programme)',                type: 'topup'   },
  { id: 'mature-access-topup',         label: 'BSc Nursing (Top-Up)',                          type: 'topup'   },
];

const ManualEnrolmentPage: React.FC = () => {
  const adminUser = (() => { try { return JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { return {}; } })();

  const [form, setForm] = useState({
    title: '', firstName: '', lastName: '', otherNames: '',
    email: '', phone: '', dateOfBirth: '', gender: '',
    nationality: 'Ghanaian', hometown: '', postalAddress: '',
    enrollmentOption: 'Regular', applicationType: 'regular',
    candidateType: 'wassce', programmeId: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; applicationId?: string; letterUrl?: string } | null>(null);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [feeInfo, setFeeInfo] = useState<any>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [otherFiles, setOtherFiles] = useState<{ [k: string]: File | null }>({
    certificates: null, birthCert: null, transcripts: null,
  });

  const sf = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Fetch fee whenever programme, enrollment option, or application type changes
  useEffect(() => {
    const prog = ENROL_PROGRAMMES.find(p => p.id === form.programmeId);
    const appType = prog?.type || form.applicationType;
    if (!form.programmeId || !form.enrollmentOption) { setFeeInfo(null); return; }
    setFeeLoading(true);
    fetch(
      `${API}/api/admin/fees/lookup?programmeId=${form.programmeId}&applicationType=${appType}&enrollmentOption=${form.enrollmentOption}`,
      { headers: authHeaders() }
    )
      .then(r => r.json())
      .then(d => setFeeInfo(d.fee || null))
      .catch(() => setFeeInfo(null))
      .finally(() => setFeeLoading(false));
  }, [form.programmeId, form.enrollmentOption, form.applicationType]);

  // Fetch recent manual enrolments
  const fetchEnrolments = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API}/api/admin/applications?search=Manual+enrolment&limit=50`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setEnrolments(data.applications.filter((a: any) => !a.voucher_id));
      }
    } catch {} finally { setLoadingList(false); }
  }, []);

  useEffect(() => { fetchEnrolments(); }, [fetchEnrolments]);

  // Role check AFTER all hooks
  if (adminUser.role !== 'super_admin') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--danger)', fontWeight: 600 }}>🔒 Super Admin access required</p>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Only super administrators can manually enrol applicants.</p>
      </div>
    );
  }

  const selectedProg = ENROL_PROGRAMMES.find(p => p.id === form.programmeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programmeId) { alert('Please select a programme'); return; }
    if (!photoFile) { alert('Passport photo is required'); return; }
    const feeNote = feeInfo ? ` | Fees: GH₵${parseFloat(feeInfo.total_fee).toLocaleString()}` : ' | ⚠ No fee structure found';
    if (!window.confirm(`Manually enrol ${form.firstName} ${form.lastName} into ${selectedProg?.label}?${feeNote}`)) return;
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...form,
        programmeLabel: selectedProg?.label || form.programmeId,
        applicationType: selectedProg?.type || 'regular',
      };
      const res = await fetch(`${API}/api/admin/enrolments/manual`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.applicationId) {
        // Upload documents first, then regenerate letter with photo
        const formData = new FormData();
        formData.append('photo', photoFile);
        if (otherFiles.certificates) formData.append('certificates', otherFiles.certificates);
        if (otherFiles.birthCert)    formData.append('birthCert',    otherFiles.birthCert);
        if (otherFiles.transcripts)  formData.append('transcripts',  otherFiles.transcripts);
        try {
          await fetch(`${API}/api/applications/${data.applicationId}/documents`, {
            method: 'POST', body: formData,
          });
          // Regenerate letter now that photo is in the documents table
          const regenRes = await fetch(
            `${API}/api/admin/applications/${data.applicationId}/regenerate-letter`,
            { method: 'POST', headers: authHeaders() }
          );
          const regenData = await regenRes.json();
          if (regenData.admissionLetterUrl) {
            data.admissionLetterUrl = regenData.admissionLetterUrl;
          }
        } catch { /* non-fatal */ }
      }

      setResult({
        success: data.success,
        message: data.message || (data.success ? 'Enrolled successfully' : 'Enrolment failed'),
        applicationId: data.applicationId,
        letterUrl: data.admissionLetterUrl,
      });
      if (data.success) {
        setForm(f => ({ ...f, firstName: '', lastName: '', otherNames: '', email: '', phone: '',
          dateOfBirth: '', gender: '', hometown: '', postalAddress: '', programmeId: '', notes: '', title: '' }));
        setFeeInfo(null);
        setPhotoFile(null);
        setPhotoPreview(null);
        setOtherFiles({ certificates: null, birthCert: null, transcripts: null });
        fetchEnrolments();
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
        Manual Enrolment
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Enrol an applicant directly without a voucher. The application is immediately approved and an admission letter is generated.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Enrolment Form ── */}
        <div className="card">
          <h3 className="section-title">New Enrolment</h3>
          {result && (
            <div className={`alert alert-${result.success ? 'success' : 'error'}`} style={{ marginBottom: '1rem' }}>
              {result.message}
              {result.success && result.applicationId && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem' }}>ID: <strong>{result.applicationId}</strong></span>
                  {result.letterUrl && (
                    <a href={result.letterUrl} target="_blank" rel="noopener noreferrer">
                      <button className="btn btn-primary btn-sm">📄 View Admission Letter</button>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {/* Programme */}
            <div className="form-group">
              <label>Programme *</label>
              <select name="programmeId" value={form.programmeId} onChange={sf} required>
                <option value="">— Select Programme —</option>
                <optgroup label="Regular">
                  {ENROL_PROGRAMMES.filter(p => p.type === 'regular').map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Top-Up / Access">
                  {ENROL_PROGRAMMES.filter(p => p.type === 'topup').map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Enrollment Option */}
            <div className="form-group">
              <label>Enrollment Option *</label>
              <select name="enrollmentOption" value={form.enrollmentOption} onChange={sf} required>
                <option value="Regular">Regular</option>
                <option value="Weekend">Weekend</option>
                <option value="Sandwich">Sandwich</option>
              </select>
            </div>

            {/* Fee Structure — auto-loaded from fees dashboard */}
            {form.programmeId && (
              <div style={{
                border: `1.5px solid ${feeInfo ? 'var(--success)' : feeLoading ? 'var(--border)' : 'var(--warning)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem 1rem',
                marginBottom: '0.5rem',
                background: feeInfo ? 'var(--success-bg, #f0fdf4)' : feeLoading ? 'var(--surface-3)' : '#fffbeb',
              }}>
                {feeLoading ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Loading fee structure…</p>
                ) : feeInfo ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                        💰 Fee Structure — {feeInfo.academic_year}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success)' }}>
                        GH₵{parseFloat(feeInfo.total_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {[
                        ['Tuition', feeInfo.tuition_fee],
                        ['Facility', feeInfo.facility_fee],
                        ['Library', feeInfo.library_fee],
                        ['ICT', feeInfo.ict_fee],
                        ['Examination', feeInfo.examination_fee],
                        ['Registration', feeInfo.registration_fee],
                        ...(parseFloat(feeInfo.other_fees) > 0 ? [[feeInfo.other_fees_label || 'Other', feeInfo.other_fees]] : []),
                      ].filter(([, v]) => parseFloat(v as string) > 0).map(([label, val]) => (
                        <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{label}</span>
                          <span style={{ fontWeight: 600 }}>GH₵{parseFloat(val as string).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <strong>Initial payment ({feeInfo.initial_payment_percent}%):</strong>{' '}
                      GH₵{(parseFloat(feeInfo.total_fee) * parseInt(feeInfo.initial_payment_percent) / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      {' '}by {feeInfo.initial_payment_deadline} · Bank: {feeInfo.bank_name}, A/C {feeInfo.bank_account_no}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, fontWeight: 500 }}>
                    ⚠ No fee structure found for this programme / enrollment combination.
                    Please configure fees in the <strong>Fees</strong> section before enrolling.
                  </p>
                )}
              </div>
            )}

            {/* Candidate Type */}
            <div className="form-group">
              <label>Candidate Type *</label>
              <select name="candidateType" value={form.candidateType} onChange={sf} required>
                <option value="wassce">WASSCE / SSCE</option>
                <option value="mature">Mature (25+ years)</option>
              </select>
            </div>

            <hr className="divider" />

            {/* Personal Details */}
            <div className="form-grid">
              <div className="form-group">
                <label>Title</label>
                <select name="title" value={form.title} onChange={sf}>
                  <option value="">—</option>
                  <option>Mr</option><option>Mrs</option><option>Miss</option><option>Dr</option>
                </select>
              </div>
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" name="firstName" value={form.firstName} onChange={sf} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label>Surname *</label>
                <input type="text" name="lastName" value={form.lastName} onChange={sf} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label>Other Names</label>
                <input type="text" name="otherNames" value={form.otherNames} onChange={sf} style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label>Gender *</label>
                <select name="gender" value={form.gender} onChange={sf} required>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={sf} required />
              </div>
              <div className="form-group">
                <label>Nationality *</label>
                <input type="text" name="nationality" value={form.nationality} onChange={sf} required />
              </div>
              <div className="form-group">
                <label>Home Town *</label>
                <input type="text" name="hometown" value={form.hometown} onChange={sf} required />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" name="email" value={form.email} onChange={sf} required />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input type="tel" name="phone" value={form.phone} onChange={sf} required placeholder="+233 XX XXX XXXX" />
              </div>
            </div>
            <div className="form-group">
              <label>Postal Address *</label>
              <textarea name="postalAddress" value={form.postalAddress} onChange={sf} rows={2} required style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label>Admin Notes (optional)</label>
              <textarea name="notes" value={form.notes} onChange={sf} rows={2}
                placeholder="Reason for manual enrolment, special circumstances, etc." />
            </div>

            <hr className="divider" />

            {/* ── Documents & Photo ── */}
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Documents &amp; Passport Photo
            </h4>

            {/* Passport Photo */}
            <div className="form-group">
              <label>Passport Photo * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(JPG/PNG, any size)</span></label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  onClick={() => document.getElementById('enrol-photo-input')?.click()}
                  style={{
                    width: '90px', height: '110px', flexShrink: 0,
                    border: photoFile ? '2px solid var(--success)' : photoError ? '2px solid var(--danger)' : '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer',
                    background: 'var(--surface-3)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', position: 'relative',
                  }}
                  title="Click to upload passport photo"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Passport" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <span style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>📷</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 0.25rem' }}>Click to upload</span>
                    </>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: photoFile ? 'rgba(14,122,78,0.85)' : 'rgba(0,0,0,0.45)',
                    color: 'white', fontSize: '0.55rem', fontWeight: 700,
                    textAlign: 'center', padding: '0.15rem 0', textTransform: 'uppercase',
                  }}>
                    {photoFile ? '✓ Uploaded' : 'Passport Photo *'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <input id="enrol-photo-input" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) { setPhotoError('Please select an image file.'); return; }
                      setPhotoError('');
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }}
                  />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Upload a recent passport-size photograph of the applicant.<br />
                    This will appear on the admission letter and application form.
                  </p>
                  {photoError && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.3rem' }}>⚠ {photoError}</p>}
                  {photoFile && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.3rem' }}>✓ {photoFile.name}</p>}
                </div>
              </div>
            </div>

            {/* Supporting Documents */}
            <div className="form-grid">
              <div className="form-group">
                <label>Certificates / Results <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(PDF/image)</span></label>
                <input type="file" accept=".pdf,image/*"
                  onChange={e => setOtherFiles(f => ({ ...f, certificates: e.target.files?.[0] || null }))} />
                {otherFiles.certificates && <span style={{ fontSize: '0.72rem', color: 'var(--success)' }}>✓ {otherFiles.certificates.name}</span>}
              </div>
              <div className="form-group">
                <label>Birth Certificate / National ID <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(PDF/image)</span></label>
                <input type="file" accept=".pdf,image/*"
                  onChange={e => setOtherFiles(f => ({ ...f, birthCert: e.target.files?.[0] || null }))} />
                {otherFiles.birthCert && <span style={{ fontSize: '0.72rem', color: 'var(--success)' }}>✓ {otherFiles.birthCert.name}</span>}
              </div>
              <div className="form-group">
                <label>Transcripts <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(PDF/image, optional)</span></label>
                <input type="file" accept=".pdf,image/*"
                  onChange={e => setOtherFiles(f => ({ ...f, transcripts: e.target.files?.[0] || null }))} />
                {otherFiles.transcripts && <span style={{ fontSize: '0.72rem', color: 'var(--success)' }}>✓ {otherFiles.transcripts.name}</span>}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Enrolling…' : '✅ Enrol Applicant'}
            </button>
          </form>
        </div>

        {/* ── Recent Manual Enrolments ── */}
        <div className="card">
          <h3 className="section-title">Recent Manual Enrolments</h3>
          {loadingList ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : enrolments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No manual enrolments yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>App ID</th>
                    <th>Name</th>
                    <th>Programme</th>
                    <th>Enrolled</th>
                    <th>Letter</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolments.map((e: any) => (
                    <tr key={e.application_id}>
                      <td><span className="badge badge-info">{e.application_id}</span></td>
                      <td style={{ fontWeight: 600 }}>{e.first_name} {e.last_name}</td>
                      <td style={{ fontSize: '0.8rem' }}>{e.programmes || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {e.reviewed_at ? new Date(e.reviewed_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {e.admission_letter_url ? (
                          <a href={e.admission_letter_url} target="_blank" rel="noopener noreferrer">
                            <button className="btn btn-ghost btn-sm">📄</button>
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
