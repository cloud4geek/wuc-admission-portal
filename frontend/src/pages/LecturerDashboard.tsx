import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LecturerDashboard: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('lecturerToken');
  const lecturerInfo = (() => { try { return JSON.parse(localStorage.getItem('lecturerInfo') || '{}'); } catch { return {}; } })();
  const logout = () => { localStorage.removeItem('lecturerToken'); localStorage.removeItem('lecturerInfo'); navigate('/lecturer/login'); };

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = getToken();
    if (!token) { navigate('/lecturer/login'); return null; }
    const res = await fetch(url, { ...opts, headers: { ...opts.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem('lecturerToken'); localStorage.removeItem('lecturerInfo'); navigate('/lecturer/login'); return null; }
    return res.json();
  }, [navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await authFetch(`${API}/api/lecturers/courses`);
      if (data?.success) setCourses(data.courses);
      setLoading(false);
    })();
  }, [authFetch]);

  const loadStudents = async (course: any) => {
    setSelectedCourse(course);
    setStudentsLoading(true); setMsg('');
    const data = await authFetch(`${API}/api/lecturers/courses/${course.course_id}/students?academicYear=${course.academic_year}&semester=${course.semester}`);
    if (data?.success) {
      setStudents(data.students);
      const g: Record<string, string> = {};
      data.students.forEach((s: any) => { if (s.score !== null) g[s.student_uuid] = String(s.score); });
      setGrades(g);
    }
    setStudentsLoading(false);
  };

  const handleSaveGrades = async () => {
    if (!selectedCourse) return;
    setSaving(true); setMsg('');
    const gradeArray = Object.entries(grades).filter(([_, v]) => v !== '').map(([studentId, score]) => ({ studentId, score: parseFloat(score) }));
    const data = await authFetch(`${API}/api/lecturers/courses/${selectedCourse.course_id}/grades`, {
      method: 'POST', body: JSON.stringify({ grades: gradeArray, academicYear: selectedCourse.academic_year, semester: selectedCourse.semester }),
    });
    if (data?.success) setMsg(`Saved: ${data.submitted} grade(s) as draft.${data.errors ? ` ${data.errors} error(s).` : ''}`);
    else setMsg(data?.message || 'Failed');
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!selectedCourse) return;
    if (!window.confirm('Publish all draft grades? Students will be able to see their results immediately.')) return;
    setSaving(true);
    const data = await authFetch(`${API}/api/lecturers/courses/${selectedCourse.course_id}/publish`, {
      method: 'POST', body: JSON.stringify({ academicYear: selectedCourse.academic_year, semester: selectedCourse.semester }),
    });
    if (data?.success) { setMsg(`Published ${data.published} result(s). Students can now view grades.`); loadStudents(selectedCourse); }
    else setMsg(data?.message || 'Publish failed');
    setSaving(false);
  };

  const getGradeFromScore = (score: number) => {
    if (score >= 80) return { grade: 'A+', color: '#059669' };
    if (score >= 75) return { grade: 'A', color: '#059669' };
    if (score >= 70) return { grade: 'B+', color: '#0e7a4e' };
    if (score >= 65) return { grade: 'B', color: '#0e7a4e' };
    if (score >= 60) return { grade: 'C+', color: '#b45309' };
    if (score >= 55) return { grade: 'C', color: '#b45309' };
    if (score >= 50) return { grade: 'D+', color: '#d97706' };
    if (score >= 45) return { grade: 'D', color: '#d97706' };
    if (score >= 40) return { grade: 'E', color: '#dc2626' };
    return { grade: 'F', color: '#dc2626' };
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
            <div><h1>WUC Lecturer Portal</h1><span className="logo-sub">Grade Management</span></div>
          </div>
          <nav><ul className="nav-links">
            <li><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{lecturerInfo.title} {lecturerInfo.firstName} {lecturerInfo.lastName}</span></li>
            <li><button onClick={logout} className="btn btn-ghost btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Sign Out</button></li>
          </ul></nav>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
        {!selectedCourse ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>My Courses</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select a course to manage grades</p>
            {loading ? <p>Loading courses...</p> : courses.length === 0 ? (
              <div className="card"><p style={{ color: 'var(--text-muted)' }}>No courses assigned. Contact administration to be assigned courses.</p></div>
            ) : (
              <>
                {/* Group courses by level for clarity */}
                {Array.from(new Set(courses.map((c: any) => c.level))).sort().map(level => {
                  const levelCourses = courses.filter((c: any) => c.level === level);
                  return (
                    <div key={level} style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        Level {level} — {levelCourses.length} course{levelCourses.length > 1 ? 's' : ''}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {levelCourses.map((c: any) => (
                          <div key={c.id} onClick={() => loadStudents(c)} className="card" style={{ margin: 0, cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{c.course_code}</strong>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{c.course_title}</p>
                                {c.programme_id && <span style={{ fontSize: '0.7rem', color: 'var(--accent-dark)', background: 'var(--warning-bg)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>{c.programme_id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>}
                              </div>
                              <span className="badge badge-info">{c.credit_hours} CR</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                              <span>Level {c.level}</span><span>Sem {c.semester}</span><span>{c.academic_year}</span><span>{c.enrolled_count} student{c.enrolled_count !== 1 ? 's' : ''}</span>
                              <span className={`badge ${c.course_type === 'core' ? 'badge-info' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>{c.course_type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <button onClick={() => { setSelectedCourse(null); setStudents([]); setMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>← Back to Courses</button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedCourse.course_code} — {selectedCourse.course_title}</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Level {selectedCourse.level} · Semester {selectedCourse.semester} · {selectedCourse.academic_year}
                  {selectedCourse.programme_id && <> · <strong>{selectedCourse.programme_id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</strong></>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => {
                  const token = getToken();
                  window.open(`${API}/api/lecturers/courses/${selectedCourse.course_id}/export?academicYear=${selectedCourse.academic_year}&semester=${selectedCourse.semester}&token=${token}`, '_blank');
                }} className="btn btn-ghost btn-sm">Export CSV</button>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  Import CSV
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setSaving(true); setMsg('');
                    const data = await authFetch(`${API}/api/lecturers/courses/${selectedCourse.course_id}/import`, {
                      method: 'POST', body: JSON.stringify({ csvData: text, academicYear: selectedCourse.academic_year, semester: selectedCourse.semester }),
                    });
                    if (data?.success) { setMsg(`Import: ${data.submitted} grade(s) saved.${data.errors ? ` ${data.errors} error(s).` : ''}${data.errorDetails ? ' ' + data.errorDetails.join('; ') : ''}`); loadStudents(selectedCourse); }
                    else setMsg(data?.message || 'Import failed');
                    setSaving(false);
                    e.target.value = '';
                  }} />
                </label>
                <button onClick={handleSaveGrades} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Saving...' : 'Save as Draft'}</button>
              </div>
            </div>

            {msg && <div className={`alert ${msg.includes('Published') || msg.includes('Saved') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>{msg}</div>}

            <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--info)' }}>
              <strong>Ghana GPA Scale:</strong> A+ (80-100) = 4.0 | A (75-79) = 4.0 | B+ (70-74) = 3.5 | B (65-69) = 3.0 | C+ (60-64) = 2.5 | C (55-59) = 2.0 | D+ (50-54) = 1.5 | D (45-49) = 1.0 | F (&lt;40) = 0.0
            </div>

            {studentsLoading ? <p>Loading students...</p> : students.length === 0 ? (
              <div className="card"><p style={{ color: 'var(--text-muted)' }}>No students registered for this course.</p></div>
            ) : (
              <div className="table-wrap"><table className="data-table"><thead><tr>
                <th>#</th><th>Student ID</th><th>Name</th><th>Score (0-100)</th><th>Grade</th><th>Status</th>
              </tr></thead><tbody>
                {students.map((s: any, i: number) => {
                  const scoreVal = grades[s.student_uuid] || '';
                  const numScore = parseFloat(scoreVal);
                  const gradeInfo = !isNaN(numScore) ? getGradeFromScore(numScore) : null;
                  return (
                    <tr key={s.student_uuid}>
                      <td>{i + 1}</td>
                      <td><strong>{s.student_id}</strong></td>
                      <td>{s.last_name}, {s.first_name}</td>
                      <td><input type="number" min={0} max={100} step={0.5} value={scoreVal} onChange={e => setGrades(g => ({ ...g, [s.student_uuid]: e.target.value }))}
                        style={{ width: 80, padding: '0.35rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem', textAlign: 'center' }} /></td>
                      <td style={{ fontWeight: 700, color: gradeInfo?.color || 'var(--text-muted)' }}>{gradeInfo?.grade || '—'}</td>
                      <td><span className={`badge ${s.result_status === 'published' ? 'badge-success' : s.result_status === 'draft' ? 'badge-warning' : 'badge-neutral'}`}>{s.result_status || 'Not graded'}</span></td>
                    </tr>
                  );
                })}
              </tbody></table></div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;
