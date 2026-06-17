import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icons';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
type Tab = 'dashboard' | 'courses' | 'timetable' | 'results' | 'exams' | 'fees' | 'documents' | 'resources' | 'support' | 'profile';

const StudentDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [fees, setFees] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('studentToken');
  const logout = () => { localStorage.removeItem('studentToken'); localStorage.removeItem('studentInfo'); navigate('/student/login'); };

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = getToken();
    if (!token) { navigate('/student/login'); return null; }
    const res = await fetch(url, { ...opts, headers: { ...opts.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem('studentToken'); localStorage.removeItem('studentInfo'); navigate('/student/login'); return null; }
    return res.json();
  }, [navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, f, a, ph] = await Promise.all([
        authFetch(`${API}/api/students/profile`),
        authFetch(`${API}/api/students/fees`),
        authFetch(`${API}/api/students/announcements`),
        authFetch(`${API}/api/students/photo`),
      ]);
      if (p?.success) setProfile(p.profile);
      if (f?.success) setFees(f.fees);
      if (a?.success) setAnnouncements(a.announcements || []);
      if (ph?.success) setPhotoUrl(ph.photoUrl);
      setLoading(false);
    })();
  }, [authFetch]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--surface-2)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Student Portal...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const navItems: { key: Tab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'courses', icon: 'courses', label: 'Courses' },
    { key: 'timetable', icon: 'timetable', label: 'Timetable' },
    { key: 'results', icon: 'results', label: 'Results' },
    { key: 'exams', icon: 'exams', label: 'Examinations' },
    { key: 'fees', icon: 'fees', label: 'Finances' },
    { key: 'documents', icon: 'documents', label: 'Documents' },
    { key: 'resources', icon: 'library', label: 'Library' },
    { key: 'support', icon: 'support', label: 'Support' },
    { key: 'profile', icon: 'profile', label: 'My Profile' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: 260, background: 'var(--primary)', color: 'white', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : -260, bottom: 0, zIndex: 300,
        transition: 'left 0.3s ease',
      }} className="portal-sidebar">
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC" style={{ height: 36, borderRadius: 4, background: 'white', padding: '2px 4px' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '-0.01em' }}>WUC Portal</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</div>
            </div>
          </div>
        </div>

        {/* Student ID Card Mini */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: photoUrl ? 'none' : 'linear-gradient(135deg, var(--accent), var(--accent-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, overflow: 'hidden', border: '2px solid var(--accent)' }}>
              {photoUrl ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.firstName?.[0] || 'S')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.firstName} {profile?.lastName}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500 }}>{profile?.studentId}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { setTab(item.key); setSidebarOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
              padding: '0.7rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
              background: tab === item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: tab === item.key ? 'white' : 'rgba(255,255,255,0.65)',
              fontSize: '0.85rem', fontWeight: tab === item.key ? 600 : 400,
              marginBottom: '0.2rem', textAlign: 'left', transition: 'all 0.2s',
            }}>
              <Icon name={item.icon} size={18} color={tab === item.key ? 'white' : 'rgba(255,255,255,0.6)'} />
              {item.label}
              {tab === item.key && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 1rem', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem' }}>
            <Icon name="logout" size={16} color="rgba(255,255,255,0.7)" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }} />}

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, marginLeft: 0, minWidth: 0 }} className="portal-main">
        {/* Top Bar */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="sidebar-toggle" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><Icon name="menu" size={22} color="var(--primary)" /></button>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name={navItems.find(n => n.key === tab)?.icon || 'dashboard'} size={20} color="var(--primary)" />
                {navItems.find(n => n.key === tab)?.label}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} className="hide-mobile">{profile?.programme}</span>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
          {tab === 'dashboard' && <DashboardView profile={profile} fees={fees} announcements={announcements} setTab={setTab} />}
          {tab === 'courses' && <CoursesView authFetch={authFetch} />}
          {tab === 'timetable' && <TimetableView authFetch={authFetch} />}
          {tab === 'results' && <ResultsView authFetch={authFetch} />}
          {tab === 'exams' && <ExamsView authFetch={authFetch} />}
          {tab === 'fees' && <FeesView fees={fees} />}
          {tab === 'documents' && <DocumentsView authFetch={authFetch} />}
          {tab === 'resources' && <ResourcesView authFetch={authFetch} />}
          {tab === 'support' && <SupportView authFetch={authFetch} />}
          {tab === 'profile' && <ProfileView profile={profile} setProfile={setProfile} authFetch={authFetch} photoUrl={photoUrl} />}
        </div>
      </main>

      {/* Responsive Styles */}
      <style>{`
        .portal-sidebar { left: 0 !important; }
        .portal-main { margin-left: 260px !important; }
        .sidebar-toggle { display: none !important; }
        @media (max-width: 900px) {
          .portal-sidebar { left: ${sidebarOpen ? '0' : '-260px'} !important; }
          .portal-main { margin-left: 0 !important; }
          .sidebar-toggle { display: block !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
};

/* ══════════════ DASHBOARD VIEW ══════════════ */
const DashboardView: React.FC<{ profile: any; fees: any; announcements: any[]; setTab: (t: Tab) => void }> = ({ profile, fees, announcements, setTab }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div>
      {/* Greeting Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 50%, var(--primary-light) 100%)', borderRadius: 'var(--radius-md)', padding: '2rem', color: 'white', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(201,168,76,0.08)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{greeting}</p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>{profile.firstName} {profile.lastName}</h2>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>
            <span>{profile.programme || 'N/A'}</span>
            <span>{profile.enrollmentOption} • {profile.applicationType === 'topup' ? 'Top-Up' : 'Regular'}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Academic Year', value: '2025/2026', icon: 'calendar', color: 'var(--info)' },
          { label: 'Semester', value: '1st Semester', icon: 'timetable', color: 'var(--success)' },
          { label: 'Level', value: '100', icon: 'star', color: 'var(--accent-dark)' },
          { label: 'Status', value: 'Active', icon: 'check', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 'var(--radius-sm)', padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={22} color={s.color} /></div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: 'courses', label: 'Register Courses', tab: 'courses' as Tab, color: '#3b82f6' },
          { icon: 'timetable', label: 'View Timetable', tab: 'timetable' as Tab, color: '#8b5cf6' },
          { icon: 'results', label: 'Check Results', tab: 'results' as Tab, color: '#10b981' },
          { icon: 'fees', label: 'Fee Details', tab: 'fees' as Tab, color: '#f59e0b' },
          { icon: 'documents', label: 'Request Docs', tab: 'documents' as Tab, color: '#ef4444' },
          { icon: 'support', label: 'Get Support', tab: 'support' as Tab, color: '#6366f1' },
        ].map(a => (
          <button key={a.label} onClick={() => setTab(a.tab)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.target as any).style.borderColor = a.color; (e.target as any).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.target as any).style.borderColor = 'var(--border)'; (e.target as any).style.transform = 'none'; }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><Icon name={a.icon} size={28} color={a.color} /></div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</div>
          </button>
        ))}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Announcements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {announcements.slice(0, 5).map(a => (
                <div key={a.id} style={{ padding: '0.875rem', borderRadius: '8px', borderLeft: `4px solid ${a.priority === 'urgent' ? 'var(--danger)' : a.priority === 'important' ? 'var(--accent)' : 'var(--info)'}`, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{a.title}</strong>
                    {a.priority !== 'normal' && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: a.priority === 'urgent' ? 'var(--danger)' : 'var(--accent)', color: 'white', fontWeight: 700, textTransform: 'uppercase' }}>{a.priority}</span>}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{a.content}</p>
                </div>
              ))}
            </div>
          </div>
      )}
    </div>
  );
};

/* ══════════════ COURSES VIEW ══════════════ */
const CoursesView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [available, setAvailable] = useState<any[]>([]);
  const [registered, setRegistered] = useState<any[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [registering, setRegistering] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [a, r] = await Promise.all([
      authFetch(`${API}/api/students/courses/available?semester=${semester}`),
      authFetch(`${API}/api/students/courses/registered?semester=${semester}`),
    ]);
    if (a?.success) setAvailable(a.courses);
    if (r?.success) { setRegistered(r.registrations); setTotalCredits(r.totalCredits); }
    setLoading(false);
  }, [authFetch, semester]);
  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    if (selected.length === 0) return;
    setRegistering(true); setMsg('');
    const d = await authFetch(`${API}/api/students/courses/register`, { method: 'POST', body: JSON.stringify({ courseIds: selected, semester }) });
    if (d?.success) { setMsg(`✅ ${d.registered} course(s) registered successfully!`); setSelected([]); load(); }
    else setMsg(d?.message || 'Registration failed');
    setRegistering(false);
  };

  const handleDrop = async (id: string) => {
    if (!window.confirm('Are you sure you want to drop this course?')) return;
    await authFetch(`${API}/api/students/courses/drop/${id}`, { method: 'DELETE' });
    load();
  };

  const unregistered = available.filter(c => !c.is_registered);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Register and manage your courses for the semester</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select value={semester} onChange={e => setSemester(Number(e.target.value))} style={{ padding: '0.5rem 1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: 'white' }}>
            <option value={1}>Semester 1</option><option value={2}>Semester 2</option>
          </select>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700 }}>
            {totalCredits} Credits
          </div>
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>{msg}</div>}

      {/* Registered Courses */}
      {registered.length > 0 && (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>📋 Registered Courses ({registered.length})</h3>
            <span className="badge badge-success">{totalCredits} credit hours</span>
          </div>
          <div className="table-wrap"><table className="data-table"><thead><tr>
            <th>Code</th><th>Course Title</th><th>Credits</th><th>Lecturer</th><th>Type</th><th>Action</th>
          </tr></thead><tbody>
            {registered.map((r: any) => (
              <tr key={r.id}>
                <td><strong style={{ color: 'var(--primary)' }}>{r.course_code}</strong></td>
                <td>{r.course_title}</td><td style={{ textAlign: 'center' }}>{r.credit_hours}</td>
                <td style={{ fontSize: '0.8rem' }}>{r.lecturer || '—'}</td>
                <td><span className={`badge ${r.course_type === 'core' ? 'badge-info' : 'badge-neutral'}`}>{r.course_type}</span></td>
                <td><button onClick={() => handleDrop(r.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>✕ Drop</button></td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      {/* Available Courses */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>📚 Available Courses</h3>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading courses...</p> : unregistered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <p>No unregistered courses available. {available.length > 0 ? 'All courses have been registered.' : 'Courses will be added by administration.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap"><table className="data-table"><thead><tr>
              <th style={{ width: 40 }}><input type="checkbox" onChange={e => setSelected(e.target.checked ? unregistered.map(c => c.id) : [])} checked={selected.length === unregistered.length && unregistered.length > 0} /></th>
              <th>Code</th><th>Course Title</th><th>Credits</th><th>Level</th><th>Type</th><th>Lecturer</th>
            </tr></thead><tbody>
              {unregistered.map((c: any) => (
                <tr key={c.id} style={{ background: selected.includes(c.id) ? 'var(--info-bg)' : undefined }}>
                  <td><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(s => e.target.checked ? [...s, c.id] : s.filter(x => x !== c.id))} /></td>
                  <td><strong style={{ color: 'var(--primary)' }}>{c.course_code}</strong></td>
                  <td>{c.course_title}</td><td style={{ textAlign: 'center' }}>{c.credit_hours}</td><td style={{ textAlign: 'center' }}>{c.level}</td>
                  <td><span className={`badge ${c.course_type === 'core' ? 'badge-info' : 'badge-neutral'}`}>{c.course_type}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{c.lecturer || '—'}</td>
                </tr>
              ))}
            </tbody></table></div>
            {selected.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--info-border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--info)', fontWeight: 600 }}>{selected.length} course(s) selected</span>
                <button onClick={handleRegister} disabled={registering} className="btn btn-primary btn-sm">{registering ? 'Registering...' : 'Register Selected'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ══════════════ TIMETABLE VIEW ══════════════ */
const TimetableView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState(1);

  useEffect(() => { (async () => { setLoading(true); const d = await authFetch(`${API}/api/students/timetable?semester=${semester}`); if (d?.success) setTimetable(d.timetable); setLoading(false); })(); }, [authFetch, semester]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your weekly class schedule</p>
        <select value={semester} onChange={e => setSemester(Number(e.target.value))} style={{ padding: '0.5rem 1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: 'white' }}>
          <option value={1}>Semester 1</option><option value={2}>Semester 2</option>
        </select>
      </div>
      {loading ? <p>Loading...</p> : timetable.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Timetable not yet published for this semester.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {days.map((day, di) => {
            const slots = timetable.filter(t => t.day_of_week === day);
            if (slots.length === 0) return null;
            return (
              <div key={day} style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{day}</div>
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {slots.map((s: any, i: number) => (
                    <div key={s.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', borderLeft: `4px solid ${colors[(di + i) % colors.length]}`, background: 'var(--surface-2)' }}>
                      <div style={{ minWidth: 90, fontWeight: 700, fontSize: '0.8rem', color: colors[(di + i) % colors.length] }}>{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s.course_code} — {s.course_title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>📍 {s.venue || 'TBD'}{s.lecturer ? ` • 👤 ${s.lecturer}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════ RESULTS VIEW ══════════════ */
const ResultsView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [results, setResults] = useState<any[]>([]);
  const [gpa, setGpa] = useState<number | null>(null);
  const [classOfDegree, setClassOfDegree] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setLoading(true); const d = await authFetch(`${API}/api/students/results`); if (d?.success) { setResults(d.results); setGpa(d.cgpa ?? d.gpa ?? null); setClassOfDegree(d.classOfDegree || null); } setLoading(false); })(); }, [authFetch]);

  return (
    <div>
      {gpa !== null && gpa !== undefined && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--success), #059669)', color: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem 2rem', minWidth: 160, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)' }}>CGPA</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{Number(gpa).toFixed(2)}</div>
          </div>
          {classOfDegree && (
            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem 2rem', minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Classification</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary)' }}>{classOfDegree}</div>
            </div>
          )}
        </div>
      )}
      {loading ? <p>Loading...</p> : results.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ color: 'var(--text-muted)' }}>No results published yet.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div className="table-wrap"><table className="data-table"><thead><tr>
            <th>Code</th><th>Course Title</th><th>Credits</th><th>Score</th><th>Grade</th><th>GP</th><th>Year / Sem</th>
          </tr></thead><tbody>
            {results.map((r: any) => (
              <tr key={r.id}><td><strong>{r.course_code}</strong></td><td>{r.course_title}</td><td style={{ textAlign: 'center' }}>{r.credit_hours}</td>
                <td style={{ textAlign: 'center' }}>{r.score ?? '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: ['A+','A','A-','B+','B'].includes(r.grade) ? 'var(--success)' : ['B-','C+','C'].includes(r.grade) ? 'var(--accent-dark)' : 'var(--danger)' }}>{r.grade || '—'}</td>
                <td style={{ textAlign: 'center' }}>{r.grade_point ?? '—'}</td>
                <td style={{ fontSize: '0.8rem' }}>{r.academic_year} / Sem {r.semester}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
};

/* ══════════════ EXAMS VIEW ══════════════ */
const ExamsView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setLoading(true); const d = await authFetch(`${API}/api/students/exams`); if (d?.success) setExams(d.exams); setLoading(false); })(); }, [authFetch]);

  return (
    <div>
      {loading ? <p>Loading...</p> : exams.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <p style={{ color: 'var(--text-muted)' }}>No exams scheduled. The timetable will appear when published.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {exams.map((e: any) => (
            <div key={e.id} style={{ background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <div style={{ minWidth: 60, textAlign: 'center', background: 'var(--danger-bg)', borderRadius: '8px', padding: '0.5rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{new Date(e.exam_date).getDate()}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase' }}>{new Date(e.exam_date).toLocaleDateString('en-GB', { month: 'short' })}</div>
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.9rem' }}>{e.course_code} — {e.course_title}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  🕐 {e.start_time?.slice(0, 5)} – {e.end_time?.slice(0, 5)} • 📍 {e.venue || 'TBD'} • <span className="badge badge-info" style={{ verticalAlign: 'middle' }}>{e.exam_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════ FEES VIEW ══════════════ */
const FeesView: React.FC<{ fees: any }> = ({ fees }) => {
  const fmt = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  if (!fees) return <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}><div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div><p style={{ color: 'var(--text-muted)' }}>Fee structure not yet available.</p></div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-mid))', borderRadius: 'var(--radius-md)', padding: '1.5rem', color: 'white' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)' }}>Total Fees</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{fmt(fees.totalFee)}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>{fees.programmeLabel} • {fees.academicYear}</div>
        </div>
        <div style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--success-border)' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)', fontWeight: 700 }}>Initial Payment ({fees.payment.initialPaymentPercent}%)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{fmt(fees.totalFee * fees.payment.initialPaymentPercent / 100)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Due: {fees.payment.initialPaymentDeadline}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Fee Breakdown</h3>
          {[{ l: 'Tuition Fee', v: fees.breakdown.tuitionFee }, { l: 'Facility Fee', v: fees.breakdown.facilityFee }, { l: 'Library Fee', v: fees.breakdown.libraryFee }, { l: 'ICT Fee', v: fees.breakdown.ictFee }, { l: 'Examination Fee', v: fees.breakdown.examinationFee }, { l: 'Registration Fee', v: fees.breakdown.registrationFee }].map(i => (
            <div key={i.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--surface-3)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{i.l}</span><strong>{fmt(i.v)}</strong>
            </div>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>🏦 Payment Details</h3>
          {[{ l: 'Bank', v: fees.payment.bankName }, { l: 'Branch', v: fees.payment.bankBranch }, { l: 'Account Number', v: fees.payment.bankAccountNo }, { l: 'Account Name', v: fees.payment.bankAccountName }].map(i => (
            <div key={i.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--surface-3)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{i.l}</span><strong>{i.v}</strong>
            </div>
          ))}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--warning-bg)', borderRadius: '6px', border: '1px solid var(--warning-border)', fontSize: '0.8rem', color: 'var(--warning)' }}>
            ⚠️ Balance ({100 - fees.payment.initialPaymentPercent}%) due by {fees.payment.balancePaymentDeadline}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════ DOCUMENTS VIEW ══════════════ */
const DocumentsView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ documentType: 'transcript', reason: '', copies: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => { setLoading(true); const d = await authFetch(`${API}/api/students/document-requests`); if (d?.success) setRequests(d.requests); setLoading(false); }, [authFetch]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    const d = await authFetch(`${API}/api/students/document-requests`, { method: 'POST', body: JSON.stringify(form) });
    if (d?.success) { setMsg('✅ Request submitted successfully!'); setForm({ documentType: 'transcript', reason: '', copies: 1 }); load(); }
    else setMsg(d?.message || 'Failed');
    setSubmitting(false);
  };

  const types: Record<string, string> = { transcript: '📋 Academic Transcript', recommendation_letter: '✉️ Recommendation Letter', enrollment_letter: '📝 Enrollment Verification', introduction_letter: '📨 Introduction Letter', certificate: '🏆 Certificate Copy' };

  return (
    <div>
      <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>📄 Request a Document</h3>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group"><label>Document Type</label><select value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}>
              {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
            <div className="form-group"><label>Number of Copies</label><input type="number" min={1} max={5} value={form.copies} onChange={e => setForm(f => ({ ...f, copies: parseInt(e.target.value) || 1 }))} /></div>
          </div>
          <div className="form-group"><label>Purpose / Reason</label><input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. For scholarship application, job application..." /></div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
        </form>
      </div>

      {!loading && requests.length > 0 && (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Request History</h3></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Document</th><th>Copies</th><th>Status</th><th>Submitted</th><th>Notes</th></tr></thead><tbody>
            {requests.map((r: any) => (
              <tr key={r.id}><td>{types[r.document_type] || r.document_type}</td><td style={{ textAlign: 'center' }}>{r.copies}</td>
                <td><span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'processing' ? 'badge-info' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                <td style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                <td style={{ fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.admin_notes || '—'}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
};

/* ══════════════ RESOURCES VIEW ══════════════ */
const ResourcesView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');

  useEffect(() => { (async () => { setLoading(true); const d = await authFetch(`${API}/api/students/resources${cat ? `?category=${cat}` : ''}`); if (d?.success) setResources(d.resources); setLoading(false); })(); }, [authFetch, cat]);

  const icons: Record<string, string> = { ebook: '📕', lecture_note: '📝', past_question: '📋', guideline: '📌', other: '📎' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Access learning materials and resources</p>
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '0.5rem 1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: 'white' }}>
          <option value="">All Resources</option><option value="ebook">E-Books</option><option value="lecture_note">Lecture Notes</option><option value="past_question">Past Questions</option><option value="guideline">Guidelines</option>
        </select>
      </div>
      {loading ? <p>Loading...</p> : resources.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          <p style={{ color: 'var(--text-muted)' }}>No resources available yet. Materials will be uploaded by lecturers.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {resources.map((r: any) => (
            <div key={r.id} style={{ background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '1.25rem', transition: 'box-shadow 0.2s' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.75rem' }}>{icons[r.category] || '📎'}</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{r.title}</strong>
                  {r.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>{r.description}</p>}
                  <span className="badge badge-neutral" style={{ marginTop: '0.5rem' }}>{(r.category || '').replace('_', ' ')}</span>
                </div>
              </div>
              {(r.file_url || r.external_url) && <a href={r.external_url || r.file_url} target="_blank" rel="noopener noreferrer"><button className="btn btn-primary btn-sm btn-full" style={{ marginTop: '1rem' }}>Open Resource →</button></a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════ SUPPORT VIEW ══════════════ */
const SupportView: React.FC<{ authFetch: any }> = ({ authFetch }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'general', message: '', priority: 'normal' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => { setLoading(true); const d = await authFetch(`${API}/api/students/support-tickets`); if (d?.success) setTickets(d.tickets); setLoading(false); }, [authFetch]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const d = await authFetch(`${API}/api/students/support-tickets`, { method: 'POST', body: JSON.stringify(form) });
    if (d?.success) { setForm({ subject: '', category: 'general', message: '', priority: 'normal' }); setShowForm(false); load(); }
    setSubmitting(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Submit issues and track resolutions</p>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">{showForm ? '✕ Cancel' : '+ New Ticket'}</button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <form onSubmit={submit}>
            <div className="form-group"><label>Subject *</label><input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required placeholder="Brief description of your issue" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="general">General</option><option value="academic">Academic</option><option value="fees">Fees & Finance</option><option value="facilities">Facilities</option><option value="IT">IT / Portal</option>
              </select></div>
              <div className="form-group"><label>Priority</label><select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select></div>
            </div>
            <div className="form-group"><label>Description *</label><textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required rows={4} placeholder="Describe your issue in detail..." style={{ width: '100%', padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', resize: 'vertical' }} /></div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Ticket'}</button>
          </form>
        </div>
      )}

      {loading ? <p>Loading...</p> : tickets.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
          <p style={{ color: 'var(--text-muted)' }}>No support tickets. Click "New Ticket" if you need assistance.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tickets.map((t: any) => (
            <div key={t.id} style={{ background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{t.subject}</strong>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <span className={`badge ${t.status === 'resolved' ? 'badge-success' : t.status === 'in_progress' ? 'badge-info' : t.status === 'closed' ? 'badge-neutral' : 'badge-warning'}`}>{t.status.replace('_', ' ')}</span>
                  <span className="badge badge-neutral">{t.category}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>{t.message}</p>
              {t.admin_reply && (
                <div style={{ marginTop: '0.75rem', padding: '0.875rem', background: 'var(--success-bg)', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>ADMIN REPLY</div>
                  <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{t.admin_reply}</p>
                </div>
              )}
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════ PROFILE VIEW ══════════════ */
const ProfileView: React.FC<{ profile: any; setProfile: any; authFetch: any; photoUrl: string | null }> = ({ profile, setProfile, authFetch, photoUrl }) => {
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editAddress, setEditAddress] = useState(profile?.postalAddress || '');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg('');
    const d = await authFetch(`${API}/api/students/profile`, { method: 'PUT', body: JSON.stringify({ phone: editPhone, postalAddress: editAddress }) });
    if (d?.success) { setMsg('✅ Profile updated!'); setProfile((p: any) => ({ ...p, phone: editPhone, postalAddress: editAddress })); }
    else setMsg(d?.message || 'Failed');
    setSaving(false);
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('❌ Passwords do not match'); return; }
    setPwSaving(true); setPwMsg('');
    const d = await authFetch(`${API}/api/students/change-password`, { method: 'POST', body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
    if (d?.success) { setPwMsg('✅ Password changed!'); setPwForm({ currentPassword: '', newPassword: '', confirm: '' }); }
    else setPwMsg(`❌ ${d?.message || 'Failed'}`);
    setPwSaving(false);
  };

  return (
    <div>
      {/* Profile Header */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: photoUrl ? 'none' : 'linear-gradient(135deg, var(--primary), var(--primary-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.75rem', fontWeight: 700, overflow: 'hidden', border: '3px solid var(--accent)' }}>
          {photoUrl ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profile.firstName?.[0]}${profile.lastName?.[0]}`}
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{profile.firstName} {profile.otherNames || ''} {profile.lastName}</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{profile.programme}</div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-success">Active</span>
            <span className="badge badge-info">{profile.enrollmentOption}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Personal Info */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Personal Details</h3>
          {[{ l: 'Email', v: profile.email }, { l: 'Phone', v: profile.phone }, { l: 'Date of Birth', v: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '—' }, { l: 'Gender', v: profile.gender }, { l: 'Nationality', v: profile.nationality }, { l: 'Hometown', v: profile.hometown }, { l: 'Address', v: profile.postalAddress }].map(i => (
            <div key={i.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-3)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{i.l}</span><strong style={{ textAlign: 'right', maxWidth: '60%' }}>{i.v}</strong>
            </div>
          ))}
        </div>

        {/* Update Contact + Change Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Update Contact</h3>
            {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '0.75rem' }}>{msg}</div>}
            <form onSubmit={saveProfile}>
              <div className="form-group"><label>Phone</label><input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} /></div>
              <div className="form-group"><label>Address</label><input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} /></div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>

          <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>🔒 Change Password</h3>
            {pwMsg && <div className={`alert ${pwMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '0.75rem' }}>{pwMsg}</div>}
            <form onSubmit={changePw}>
              <div className="form-group"><label>Current Password</label><input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required /></div>
              <div className="form-group"><label>New Password</label><input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} /></div>
              <div className="form-group"><label>Confirm Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required /></div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving}>{pwSaving ? 'Changing...' : 'Change Password'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
