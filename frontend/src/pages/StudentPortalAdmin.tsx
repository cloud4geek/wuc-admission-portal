import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` });

type Section = 'overview' | 'courses' | 'assignments' | 'timetable' | 'results' | 'documents' | 'tickets' | 'resources';

const StudentPortalAdmin: React.FC = () => {
  const [section, setSection] = useState<Section>('overview');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/admin/students?limit=1`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setStats({ totalStudents: data.pagination.total });
      } catch {}
    })();
  }, []);

  const navItems: { key: Section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'courses', label: 'Manage Courses' },
    { key: 'assignments', label: 'Assign Courses' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'results', label: 'Publish Results' },
    { key: 'documents', label: 'Document Requests' },
    { key: 'tickets', label: 'Support Tickets' },
    { key: 'resources', label: 'Resources' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>Student Portal Management</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage courses, timetable, results, and student services</p>
        </div>
        <Link to="/admin"><button className="btn btn-ghost btn-sm">← Back to Admin</button></Link>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', overflowX: 'auto', borderBottom: '2px solid var(--border)' }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => setSection(n.key)} style={{
            padding: '0.65rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
            color: section === n.key ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: section === n.key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>{n.label}</button>
        ))}
      </div>

      {section === 'overview' && <OverviewSection stats={stats} setSection={setSection} />}
      {section === 'courses' && <CoursesSection />}
      {section === 'assignments' && <AssignmentsSection />}
      {section === 'timetable' && <TimetableSection />}
      {section === 'results' && <ResultsSection />}
      {section === 'documents' && <DocumentsSection />}
      {section === 'tickets' && <TicketsSection />}
      {section === 'resources' && <ResourcesSection />}
    </div>
  );
};

/* ── Overview ── */
const OverviewSection: React.FC<{ stats: any; setSection: (s: Section) => void }> = ({ stats, setSection }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
    {[
      { label: 'Total Students', value: stats?.totalStudents ?? '—', action: () => {}, color: 'var(--primary)' },
      { label: 'Manage Courses', value: 'Add / Edit', action: () => setSection('courses'), color: 'var(--info)' },
      { label: 'Timetable', value: 'Schedule', action: () => setSection('timetable'), color: '#8b5cf6' },
      { label: 'Results', value: 'Publish', action: () => setSection('results'), color: 'var(--success)' },
      { label: 'Document Requests', value: 'Process', action: () => setSection('documents'), color: 'var(--accent-dark)' },
      { label: 'Support Tickets', value: 'Respond', action: () => setSection('tickets'), color: 'var(--danger)' },
    ].map(c => (
      <div key={c.label} onClick={c.action} className="card" style={{ margin: 0, cursor: 'pointer', borderTop: `3px solid ${c.color}` }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>{c.value}</div>
      </div>
    ))}
  </div>
);

/* ── Courses Management ── */
const CoursesSection: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courseCode: '', courseTitle: '', creditHours: 3, programmeId: 'bsc-nursing', semester: 1, level: 100, courseType: 'core', lecturer: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/admin/portal/courses`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setCourses(data.courses);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`${API}/api/admin/portal/courses`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setShowForm(false); setForm({ courseCode: '', courseTitle: '', creditHours: 3, programmeId: 'bsc-nursing', semester: 1, level: 100, courseType: 'core', lecturer: '' }); load(); }
    else alert(data.message);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course?')) return;
    await fetch(`${API}/api/admin/portal/courses/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Course Catalogue</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">{showForm ? 'Cancel' : '+ Add Course'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group"><label>Course Code *</label><input type="text" value={form.courseCode} onChange={e => setForm(f => ({ ...f, courseCode: e.target.value }))} required placeholder="e.g. NUR 101" /></div>
              <div className="form-group"><label>Course Title *</label><input type="text" value={form.courseTitle} onChange={e => setForm(f => ({ ...f, courseTitle: e.target.value }))} required /></div>
              <div className="form-group"><label>Credits</label><input type="number" min={1} max={6} value={form.creditHours} onChange={e => setForm(f => ({ ...f, creditHours: parseInt(e.target.value) || 3 }))} /></div>
              <div className="form-group"><label>Level</label><select value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) }))}><option value={100}>100</option><option value={200}>200</option><option value={300}>300</option><option value={400}>400</option></select></div>
              <div className="form-group"><label>Semester</label><select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}><option value={1}>1</option><option value={2}>2</option></select></div>
              <div className="form-group"><label>Type</label><select value={form.courseType} onChange={e => setForm(f => ({ ...f, courseType: e.target.value }))}><option value="core">Core</option><option value="elective">Elective</option></select></div>
              <div className="form-group"><label>Programme</label><input type="text" value={form.programmeId} onChange={e => setForm(f => ({ ...f, programmeId: e.target.value }))} /></div>
              <div className="form-group"><label>Lecturer</label><input type="text" value={form.lecturer} onChange={e => setForm(f => ({ ...f, lecturer: e.target.value }))} /></div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Create Course'}</button>
          </form>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="table-wrap"><table className="data-table"><thead><tr>
          <th>Code</th><th>Title</th><th>Credits</th><th>Level</th><th>Sem</th><th>Type</th><th>Lecturer</th><th></th>
        </tr></thead><tbody>
          {courses.map((c: any) => (
            <tr key={c.id}><td><strong>{c.course_code}</strong></td><td>{c.course_title}</td><td>{c.credit_hours}</td><td>{c.level}</td><td>{c.semester}</td>
              <td><span className={`badge ${c.course_type === 'core' ? 'badge-info' : 'badge-neutral'}`}>{c.course_type}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{c.lecturer || '—'}</td>
              <td><button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
};

/* ── Course Assignments ── */
const AssignmentsSection: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lecturerId: '', courseId: '', semester: 1, academicYear: '2025/2026' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [a, l, c] = await Promise.all([
      fetch(`${API}/api/admin/portal/assignments`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/admin/portal/lecturers`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/admin/portal/courses`, { headers: authHeaders() }).then(r => r.json()),
    ]);
    if (a.success) setAssignments(a.assignments);
    if (l.success) setLecturers(l.lecturers);
    if (c.success) setCourses(c.courses);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg('');
    const res = await fetch(`${API}/api/admin/portal/assignments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setMsg('Course assigned successfully.'); setShowForm(false); load(); }
    else setMsg(data.message || 'Failed');
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this assignment?')) return;
    await fetch(`${API}/api/admin/portal/assignments/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Assign Courses to Lecturers</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lecturers can only grade courses assigned to them</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">{showForm ? 'Cancel' : '+ Assign Course'}</button>
      </div>

      {msg && <div className={`alert ${msg.includes('success') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>{msg}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleAssign}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group"><label>Lecturer *</label>
                <select value={form.lecturerId} onChange={e => setForm(f => ({ ...f, lecturerId: e.target.value }))} required>
                  <option value="">Select Lecturer</option>
                  {lecturers.map(l => <option key={l.id} value={l.id}>{l.title} {l.first_name} {l.last_name} ({l.staff_id})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Course *</label>
                <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} required>
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_title} (L{c.level} S{c.semester})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Semester</label>
                <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}>
                  <option value={1}>Semester 1</option><option value={2}>Semester 2</option>
                </select>
              </div>
              <div className="form-group"><label>Academic Year</label>
                <input type="text" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Assigning...' : 'Assign Course'}</button>
          </form>
        </div>
      )}

      {loading ? <p>Loading...</p> : assignments.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)' }}>No course assignments yet. Assign courses so lecturers can upload grades.</p></div>
      ) : (
        <div className="table-wrap"><table className="data-table"><thead><tr>
          <th>Lecturer</th><th>Course</th><th>Level</th><th>Semester</th><th>Year</th><th></th>
        </tr></thead><tbody>
          {assignments.map((a: any) => (
            <tr key={a.id}>
              <td><strong>{a.lecturer_title} {a.lecturer_first} {a.lecturer_last}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.staff_id}</span></td>
              <td>{a.course_code} — {a.course_title}</td>
              <td>{a.level}</td><td>{a.semester}</td><td>{a.academic_year}</td>
              <td><button onClick={() => handleRemove(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
};

/* ── Timetable Management ── */
const TimetableSection: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courseId: '', programmeId: 'bsc-nursing', level: 100, semester: 1, dayOfWeek: 'Monday', startTime: '08:00', endTime: '10:00', venue: '', lecturer: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, c] = await Promise.all([
      fetch(`${API}/api/admin/portal/timetable`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/admin/portal/courses`, { headers: authHeaders() }).then(r => r.json()),
    ]);
    if (t.success) setEntries(t.timetable);
    if (c.success) setCourses(c.courses);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`${API}/api/admin/portal/timetable`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setShowForm(false); load(); } else alert(data.message);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this timetable entry?')) return;
    await fetch(`${API}/api/admin/portal/timetable/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Timetable Management</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">{showForm ? 'Cancel' : '+ Add Entry'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group"><label>Course *</label><select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} required>
                <option value="">Select course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>)}
              </select></div>
              <div className="form-group"><label>Day *</label><select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
              <div className="form-group"><label>Start Time</label><input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="form-group"><label>End Time</label><input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
              <div className="form-group"><label>Venue</label><input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Lecture Hall A" /></div>
              <div className="form-group"><label>Level</label><select value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) }))}><option value={100}>100</option><option value={200}>200</option><option value={300}>300</option><option value={400}>400</option></select></div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Add to Timetable'}</button>
          </form>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Day</th><th>Time</th><th>Course</th><th>Venue</th><th>Level</th><th></th></tr></thead><tbody>
          {entries.map((e: any) => (
            <tr key={e.id}><td><strong>{e.day_of_week}</strong></td><td>{e.start_time?.slice(0,5)} – {e.end_time?.slice(0,5)}</td><td>{e.course_code} — {e.course_title}</td><td>{e.venue || '—'}</td><td>{e.level}</td>
              <td><button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button></td></tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
};

/* ── Results Publishing ── */
const ResultsSection: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');
  const [semester, setSemester] = useState(1);
  const [level, setLevel] = useState<number | ''>('');
  const [academicYear] = useState('2025/2026');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/admin/portal/courses`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setCourses(data.courses);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const publishCourse = async (courseId: string, courseCode: string) => {
    if (!window.confirm(`Publish all draft grades for ${courseCode} (Semester ${semester}, ${academicYear})? Students will see results immediately.`)) return;
    setPublishing(true); setMsg('');
    const res = await fetch(`${API}/api/admin/portal/results/publish`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ courseId, academicYear, semester }),
    });
    const data = await res.json();
    if (data.success) setMsg(`Published ${data.published} result(s) for ${courseCode}.`);
    else setMsg(data.message || 'Publish failed');
    setPublishing(false);
  };

  const publishBulk = async () => {
    const levelLabel = level ? `Level ${level}` : 'ALL levels';
    if (!window.confirm(`Publish all draft grades for ${levelLabel}, Semester ${semester}, ${academicYear}? This cannot be undone.`)) return;
    setPublishing(true); setMsg('');
    const res = await fetch(`${API}/api/admin/portal/results/publish-all`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ academicYear, semester, level: level || undefined }),
    });
    const data = await res.json();
    if (data.success) setMsg(data.message);
    else setMsg(data.message || 'Publish failed');
    setPublishing(false);
  };

  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({ academicYear, semester: String(semester) });
      if (level) params.append('level', String(level));
      const res = await fetch(`${API}/api/admin/portal/results/draft-counts?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const counts: Record<string, number> = {};
        (data.counts || []).forEach((c: any) => { counts[c.course_id] = parseInt(c.count); });
        setDraftCounts(counts);
      }
    })();
  }, [semester, academicYear, level, msg]);

  const coursesWithDrafts = courses.filter(c => (draftCounts[c.id] || 0) > 0);
  const totalDrafts = Object.values(draftCounts).reduce((sum, v) => sum + v, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Publish Results (Registrar)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Review and publish lecturer-submitted draft grades by level</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={semester} onChange={e => setSemester(parseInt(e.target.value))} style={{ padding: '0.4rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            <option value={1}>Semester 1</option><option value={2}>Semester 2</option>
          </select>
          <select value={level} onChange={e => setLevel(e.target.value ? parseInt(e.target.value) : '')} style={{ padding: '0.4rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            <option value="">All Levels</option><option value={100}>Level 100</option><option value={200}>Level 200</option><option value={300}>Level 300</option><option value={400}>Level 400</option>
          </select>
          {totalDrafts > 0 && (
            <button onClick={publishBulk} disabled={publishing} className="btn btn-success btn-sm">
              Publish {level ? `Level ${level}` : 'All'} ({totalDrafts})
            </button>
          )}
        </div>
      </div>

      {msg && <div className={`alert ${msg.includes('ublished') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>{msg}</div>}

      {loading ? <p>Loading...</p> : coursesWithDrafts.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)' }}>No draft grades pending{level ? ` for Level ${level}` : ''}, Semester {semester}. Lecturers must submit grades first.</p></div>
      ) : (
        <div className="table-wrap"><table className="data-table"><thead><tr>
          <th>Course</th><th>Level</th><th>Programme</th><th>Draft Grades</th><th>Action</th>
        </tr></thead><tbody>
          {coursesWithDrafts.map((c: any) => (
            <tr key={c.id}>
              <td><strong>{c.course_code}</strong> — {c.course_title}</td>
              <td><span className="badge badge-info">Level {c.level}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{c.programme_id || '—'}</td>
              <td><span className="badge badge-warning">{draftCounts[c.id]} pending</span></td>
              <td><button onClick={() => publishCourse(c.id, c.course_code)} disabled={publishing} className="btn btn-success btn-sm" style={{ fontSize: '0.75rem' }}>Publish</button></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
};

/* ── Document Requests ── */
const DocumentsSection: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/admin/portal/document-requests`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setRequests(data.requests);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string, notes?: string) => {
    await fetch(`${API}/api/admin/portal/document-requests/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status, adminNotes: notes }) });
    load();
  };

  const types: Record<string, string> = { transcript: 'Academic Transcript', recommendation_letter: 'Recommendation Letter', enrollment_letter: 'Enrollment Verification', introduction_letter: 'Introduction Letter', certificate: 'Certificate Copy' };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Document Requests</h3>
      {loading ? <p>Loading...</p> : requests.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No pending requests.</p> : (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Document</th><th>Copies</th><th>Reason</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>
          {requests.map((r: any) => (
            <tr key={r.id}><td><strong>{r.student_id}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.first_name} {r.last_name}</span></td>
              <td>{types[r.document_type] || r.document_type}</td><td>{r.copies}</td><td style={{ fontSize: '0.8rem', maxWidth: 150 }}>{r.reason || '—'}</td>
              <td><span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'processing' ? 'badge-info' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              <td>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => updateStatus(r.id, 'processing')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Process</button>
                    <button onClick={() => updateStatus(r.id, 'completed', 'Ready for collection')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Complete</button>
                    <button onClick={() => updateStatus(r.id, 'rejected', 'Unable to process')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Reject</button>
                  </div>
                )}
                {r.status === 'processing' && <button onClick={() => updateStatus(r.id, 'completed', 'Ready for collection')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Mark Complete</button>}
              </td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
};

/* ── Support Tickets ── */
const TicketsSection: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/admin/portal/support-tickets`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setTickets(data.tickets);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sendReply = async (id: string) => {
    await fetch(`${API}/api/admin/portal/support-tickets/${id}/reply`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ reply: replyText }) });
    setReplyId(null); setReplyText(''); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/admin/portal/support-tickets/${id}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
    load();
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Support Tickets</h3>
      {loading ? <p>Loading...</p> : tickets.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No tickets.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tickets.map((t: any) => (
            <div key={t.id} className="card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong>{t.subject}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>by {t.first_name} {t.last_name} ({t.student_id})</span>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  <span className={`badge ${t.status === 'resolved' ? 'badge-success' : t.status === 'in_progress' ? 'badge-info' : 'badge-warning'}`}>{t.status}</span>
                  <span className="badge badge-neutral">{t.category}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>{t.message}</p>
              {t.admin_reply && <div style={{ padding: '0.75rem', background: 'var(--success-bg)', borderRadius: '6px', borderLeft: '3px solid var(--success)', fontSize: '0.85rem', marginBottom: '0.75rem' }}><strong style={{ fontSize: '0.7rem', color: 'var(--success)' }}>REPLY:</strong> {t.admin_reply}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {t.status === 'open' && <button onClick={() => updateStatus(t.id, 'in_progress')} className="btn btn-ghost btn-sm">Mark In Progress</button>}
                {t.status !== 'resolved' && <button onClick={() => updateStatus(t.id, 'resolved')} className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }}>Resolve</button>}
                <button onClick={() => setReplyId(replyId === t.id ? null : t.id)} className="btn btn-ghost btn-sm">Reply</button>
              </div>
              {replyId === t.id && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." style={{ flex: 1, padding: '0.5rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }} />
                  <button onClick={() => sendReply(t.id)} className="btn btn-primary btn-sm" disabled={!replyText.trim()}>Send</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Resources Management ── */
const ResourcesSection: React.FC = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'lecture_note', externalUrl: '', programmeId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/admin/portal/resources`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setResources(data.resources);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`${API}/api/admin/portal/resources`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setShowForm(false); setForm({ title: '', description: '', category: 'lecture_note', externalUrl: '', programmeId: '' }); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this resource?')) return;
    await fetch(`${API}/api/admin/portal/resources/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Learning Resources</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">{showForm ? 'Cancel' : '+ Add Resource'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group"><label>Title *</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="form-group"><label>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="ebook">E-Book</option><option value="lecture_note">Lecture Note</option><option value="past_question">Past Question</option><option value="guideline">Guideline</option>
              </select></div>
              <div className="form-group"><label>URL *</label><input type="url" value={form.externalUrl} onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))} required placeholder="https://..." /></div>
              <div className="form-group"><label>Programme (blank for all)</label><input type="text" value={form.programmeId} onChange={e => setForm(f => ({ ...f, programmeId: e.target.value }))} placeholder="e.g. bsc-nursing" /></div>
            </div>
            <div className="form-group"><label>Description</label><input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Add Resource'}</button>
          </form>
        </div>
      )}

      {loading ? <p>Loading...</p> : resources.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No resources uploaded yet.</p> : (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Title</th><th>Category</th><th>Programme</th><th>Date</th><th></th></tr></thead><tbody>
          {resources.map((r: any) => (
            <tr key={r.id}><td><strong>{r.title}</strong>{r.description && <><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description}</span></>}</td>
              <td><span className="badge badge-neutral">{r.category?.replace('_',' ')}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{r.programme_id || 'All'}</td>
              <td style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              <td><button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button></td></tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
};

export default StudentPortalAdmin;
