import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const DRAFT_KEY = 'wuc_draft_topup';
const STEPS = ['Voucher', 'Personal', 'Guardian', 'Programmes', 'Academic', 'Employment', 'Documents'];

const PROGRAMMES = [
  { id: 'bsc-ph-disease-topup',   label: 'BSc Public Health (Disease Control Option) — Top-Up',                  enrollments: ['Regular', 'Weekend', 'Sandwich'] },
  { id: 'bsc-ph-nutrition-topup', label: 'BSc Public Health (Nutrition Option) — Top-Up',                        enrollments: ['Regular', 'Weekend', 'Sandwich'] },
  { id: 'bsc-nursing-access',     label: 'BSc Nursing (Access Programme) — For NAC/NAP Certificate Holders',     enrollments: ['Regular', 'Weekend'] },
  { id: 'mature-access-topup',    label: 'BSc Nursing (Top-Up) — For Diploma in General Nursing or Related Field', enrollments: ['Regular', 'Weekend'] },
];

const CORE_SUBJECTS = ['English Language', 'Core Mathematics', 'Integrated Science', 'Social Studies'];
const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];

type ProgrammeChoice = { id: string; preference: string };
type SubjectGrade    = { subject: string; indexNo: string; examType: string; dateTaken: string; grade: string };
type Institution     = { name: string; from: string; to: string; certificate: string };
type Employment      = { employer: string; position: string; from: string; to: string };

const emptySubject     = (subject = ''): SubjectGrade => ({ subject, indexNo: '', examType: '', dateTaken: '', grade: '' });
const emptyInstitution = (): Institution => ({ name: '', from: '', to: '', certificate: '' });
const emptyEmployment  = (): Employment  => ({ employer: '', position: '', from: '', to: '' });

interface TopUpDraft {
  step: number;
  voucherCode: string;
  personal: { title: string; surname: string; firstName: string; otherNames: string; gender: string; dob: string; nationality: string; hometown: string; postalAddress: string; email: string; phone: string; physicalChallenge: string };
  guardian: { name: string; relationship: string; occupation: string; postalAddress: string; email: string; phone: string };
  programmeChoices: ProgrammeChoice[];
  enrollmentOption: string;
  financing: string[];
  otherFinancing: string;
  institutions: Institution[];
  hasWassce: boolean;
  coreGrades: SubjectGrade[];
  electiveGrades: SubjectGrade[];
  diplomaQuals: { qualification: string; subject: string; dateObtained: string; grade: string }[];
  employments: Employment[];
  totalYearsWorked: string;
}

const defaultTopUpDraft = (): TopUpDraft => ({
  step: 1,
  voucherCode: '',
  personal: { title: '', surname: '', firstName: '', otherNames: '', gender: '', dob: '', nationality: 'Ghanaian', hometown: '', postalAddress: '', email: '', phone: '', physicalChallenge: '' },
  guardian: { name: '', relationship: '', occupation: '', postalAddress: '', email: '', phone: '' },
  programmeChoices: [],
  enrollmentOption: '',
  financing: [],
  otherFinancing: '',
  institutions: [emptyInstitution(), emptyInstitution(), emptyInstitution(), emptyInstitution()],
  hasWassce: false,
  coreGrades: CORE_SUBJECTS.map(emptySubject),
  electiveGrades: [emptySubject(), emptySubject(), emptySubject()],
  diplomaQuals: [{ qualification: '', subject: '', dateObtained: '', grade: '' }, { qualification: '', subject: '', dateObtained: '', grade: '' }],
  employments: [emptyEmployment(), emptyEmployment()],
  totalYearsWorked: '',
});

const ApplicationFormTopUp: React.FC = () => {
  const [draft, setDraft] = useState<TopUpDraft>(defaultTopUpDraft());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<{ [k: string]: File | null }>({ certificates: null, transcripts: null, birthCert: null });
  const [loading, setLoading] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [photoError, setPhotoError] = useState('');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load draft on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) { setDraft(JSON.parse(saved)); setHasSavedDraft(true); }
    } catch { /* corrupt */ }
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* full */ }
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [draft]);

  const set = (partial: Partial<TopUpDraft>) => setDraft(d => ({ ...d, ...partial }));

  const saveDraftManually = () => {
    setSavingDraft(true);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); setDraftSaved(true); setHasSavedDraft(true); setTimeout(() => setDraftSaved(false), 2500); }
    finally { setSavingDraft(false); }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(defaultTopUpDraft());
    setPhotoFile(null);
    setOtherFiles({ certificates: null, transcripts: null, birthCert: null });
    setHasSavedDraft(false);
    setMessage({ type: '', text: '' });
  };

  // ── Photo validation ──
  const validateAndSetPhoto = (file: File, inputEl: HTMLInputElement) => {
    setPhotoError('');
    // Accept any image file — no size or dimension restrictions
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.');
      inputEl.value = '';
      return;
    }
    setPhotoFile(file);
  };

  /* ── helpers ── */
  const hp = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    set({ personal: { ...draft.personal, [e.target.name]: e.target.value } });

  const hg = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    set({ guardian: { ...draft.guardian, [e.target.name]: e.target.value } });

  // Single programme selection — selecting a new one replaces the previous
  const selectProgramme = (id: string) => {
    const already = draft.programmeChoices.length === 1 && draft.programmeChoices[0].id === id;
    if (already) {
      // Deselect
      set({ programmeChoices: [], enrollmentOption: '' });
    } else {
      // Select this programme; clear enrollment if it's not valid for the new programme
      const prog = PROGRAMMES.find(p => p.id === id);
      const validEnrollments = prog?.enrollments ?? ['Regular', 'Weekend', 'Sandwich'];
      const keepEnrollment = validEnrollments.includes(draft.enrollmentOption) ? draft.enrollmentOption : '';
      set({ programmeChoices: [{ id, preference: '1' }], enrollmentOption: keepEnrollment });
    }
  };

  const selectedProgramme = PROGRAMMES.find(p => p.id === draft.programmeChoices[0]?.id) ?? null;
  const availableEnrollments = selectedProgramme?.enrollments ?? ['Regular', 'Weekend', 'Sandwich'];

  const toggleFinancing = (val: string) =>
    set({ financing: draft.financing.includes(val) ? draft.financing.filter(f => f !== val) : [...draft.financing, val] });

  const updateCoreGrade = (i: number, field: keyof SubjectGrade, val: string) =>
    set({ coreGrades: draft.coreGrades.map((g, idx) => idx === i ? { ...g, [field]: val } : g) });

  const updateElectiveGrade = (i: number, field: keyof SubjectGrade, val: string) =>
    set({ electiveGrades: draft.electiveGrades.map((g, idx) => idx === i ? { ...g, [field]: val } : g) });

  const updateInstitution = (i: number, field: keyof Institution, val: string) =>
    set({ institutions: draft.institutions.map((inst, idx) => idx === i ? { ...inst, [field]: val } : inst) });

  const updateDiplomaQual = (i: number, field: string, val: string) =>
    set({ diplomaQuals: draft.diplomaQuals.map((q, idx) => idx === i ? { ...q, [field]: val } : q) });

  const updateEmployment = (i: number, field: keyof Employment, val: string) =>
    set({ employments: draft.employments.map((e, idx) => idx === i ? { ...e, [field]: val } : e) });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setOtherFiles(f => ({ ...f, [e.target.name]: e.target.files![0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) { setMessage({ type: 'error', text: 'Passport photo is required. Please upload it in Step 2.' }); return; }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const payload = {
        applicationType: 'topup',
        voucherCode: draft.voucherCode,
        title: draft.personal.title,
        firstName: draft.personal.firstName,
        lastName: draft.personal.surname,
        otherNames: draft.personal.otherNames,
        dateOfBirth: draft.personal.dob,
        gender: draft.personal.gender,
        nationality: draft.personal.nationality,
        hometown: draft.personal.hometown,
        postalAddress: draft.personal.postalAddress,
        email: draft.personal.email,
        phone: draft.personal.phone,
        physicalChallenge: draft.personal.physicalChallenge,
        enrollmentOption: draft.enrollmentOption,
        financing: [...draft.financing, ...(draft.otherFinancing ? [`Other: ${draft.otherFinancing}`] : [])],
        guardianName: draft.guardian.name,
        guardianPhone: draft.guardian.phone,
        guardianEmail: draft.guardian.email,
        guardianRelationship: draft.guardian.relationship,
        guardianOccupation: draft.guardian.occupation,
        guardianPostalAddress: draft.guardian.postalAddress,
        programmeChoices: draft.programmeChoices.map(p => ({
          id: p.id,
          // Strip the descriptive comment (everything after ' — ') — only the clean
          // programme name is stored in the DB and appears on the admission letter.
          label: (PROGRAMMES.find(pr => pr.id === p.id)?.label || p.id).split(' — ')[0].trim(),
          preference: p.preference,
        })),
        institutions: draft.institutions,
        diplomaQuals: draft.diplomaQuals,
        coreGrades: draft.hasWassce ? draft.coreGrades : [],
        electiveGrades: draft.hasWassce ? draft.electiveGrades : [],
        employments: draft.employments,
        totalYearsWorked: draft.totalYearsWorked,
      };

      const res = await fetch(`${API}/api/applications/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        const errMsg = data.message ||
          (data.errors && data.errors.length > 0
            ? data.errors.map((e: any) => e.msg).join(', ')
            : 'Submission failed.');
        setMessage({ type: 'error', text: errMsg });
        return;
      }

      const appId = data.applicationId;
      const formData = new FormData();
      formData.append('photo', photoFile);
      if (otherFiles.certificates) formData.append('certificates', otherFiles.certificates);
      if (otherFiles.transcripts)  formData.append('transcripts',  otherFiles.transcripts);
      if (otherFiles.birthCert)    formData.append('birthCert',    otherFiles.birthCert);

      // Upload documents — retry once on failure
      let uploadOk = false;
      for (let attempt = 0; attempt < 2 && !uploadOk; attempt++) {
        try {
          const uploadRes = await fetch(`${API}/api/applications/${appId}/documents`, { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          uploadOk = uploadData.success;
          if (!uploadOk) console.error('Document upload failed:', uploadData.message);
        } catch (err) {
          console.error('Document upload error (attempt ' + (attempt + 1) + '):', err);
        }
      }

      clearDraft();
      setSubmittedAppId(appId);
      setMessage({
        type: 'success',
        text: uploadOk
          ? `Top-Up application submitted! Your ID is ${appId}. A confirmation has been sent to ${draft.personal.email}.`
          : `Application submitted (ID: ${appId}) but document upload failed. Please contact admissions to re-upload your documents.`,
      });
      setTimeout(() => (window.location.href = '/application-status'), 8000);
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
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
              <span className="logo-sub">Agona-Asamang · Admission Portal</span>
            </div>
          </div>
          <nav>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/purchase-voucher">Buy Voucher</Link></li>
              <li><Link to="/application-status">Check Status</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <div style={{
            display: 'inline-block', background: 'rgba(201,168,76,0.25)',
            border: '1px solid rgba(201,168,76,0.5)', borderRadius: '999px',
            padding: '0.2rem 0.875rem', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            color: 'var(--accent)', marginBottom: '0.625rem',
          }}>
            Top-Up / Access Programme
          </div>
          <h2>Undergraduate Admission — Top-Up Application</h2>
          <p>For applicants holding a Certificate, Diploma, HND or equivalent qualification. Write in block letters.</p>
        </div>
      </div>

      <div className="container-sm">
        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
            {message.type === 'success' && submittedAppId && (
              <div style={{ marginTop: '0.875rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    window.open(`${API}/api/applications/${submittedAppId}/application-form`, '_blank');
                  }}
                >
                  🖨 Print Application Form
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  Opens as PDF — use your browser's print dialog
                </span>
              </div>
            )}
          </div>
        )}

        {/* Draft bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
          padding: '0.625rem 1rem', background: 'var(--surface-3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8125rem',
        }}>
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem' }}>💾</span>
            {draftSaved ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Draft saved!</span>
              : hasSavedDraft ? <span>Draft auto-saved · Step {draft.step} of {STEPS.length}</span>
              : <span>Progress auto-saves as you type</span>}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={saveDraftManually} disabled={savingDraft} className="btn btn-ghost btn-sm">
              {savingDraft ? 'Saving…' : 'Save Draft'}
            </button>
            {hasSavedDraft && (
              <button type="button" onClick={() => { if (window.confirm('Clear saved draft and start over?')) clearDraft(); }}
                className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Clear Draft</button>
            )}
          </div>
        </div>

        {/* Step bar */}
        <div className="step-bar">
          {STEPS.map((label, i) => {
            const num = i + 1;
            const state = draft.step > num ? 'done' : draft.step === num ? 'active' : '';
            return (
              <div key={label} className={`step-item ${state}`}>
                <div className="step-dot">{draft.step > num ? '✓' : num}</div>
                <div className="step-label">{label}</div>
              </div>
            );
          })}
        </div>

        <div className="card">

          {/* ── STEP 1: Voucher ── */}
          {draft.step === 1 && (
            <div>
              <h3 className="section-title">Voucher Verification</h3>
              <p className="section-subtitle">Enter the voucher code received after payment to unlock the application form.</p>
              <div className="alert alert-info">
                This form is for <strong>Top-Up / Access Programme</strong> applicants who already hold a Certificate, Diploma, HND, or equivalent qualification.
                If you are a fresh WASSCE candidate, use the <Link to="/apply">Regular Application Form</Link>.
              </div>
              <div className="form-group">
                <label>Voucher Code *</label>
                <input
                  type="text"
                  value={draft.voucherCode}
                  onChange={e => set({ voucherCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. WUC12345678"
                  required
                  style={{ fontFamily: 'monospace', letterSpacing: '0.08em', fontSize: '1.05rem' }}
                />
              </div>
              <button type="button" onClick={() => draft.voucherCode.trim() && set({ step: 2 })} className="btn btn-primary">
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: Personal Particulars ── */}
          {draft.step === 2 && (
            <div>
              <h3 className="section-title">Personal Particulars of Applicant</h3>

              {/* Passport photo uploader */}
              <div style={{ float: 'right', marginLeft: '1.25rem', marginBottom: '1rem' }}>
                <input
                  type="file"
                  id="passportPhotoInputTopUp"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    validateAndSetPhoto(file, e.target);
                  }}
                />
                <div
                  onClick={() => document.getElementById('passportPhotoInputTopUp')?.click()}
                  style={{
                    width: '112px', height: '136px',
                    border: photoFile ? '2px solid var(--success)' : photoError ? '2px solid var(--danger)' : '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden', cursor: 'pointer', position: 'relative',
                    background: 'var(--surface-3)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.2s',
                  }}
                  title="Click to upload passport photo"
                >
                  {photoFile ? (
                    <img
                      src={URL.createObjectURL(photoFile)}
                      alt="Passport"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>📷</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' as const, lineHeight: 1.3, padding: '0 0.25rem' }}>
                        Click to upload passport photo
                      </span>
                    </>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: photoFile ? 'rgba(14,122,78,0.85)' : 'rgba(0,0,0,0.45)',
                    color: 'white', fontSize: '0.6rem', fontWeight: 700,
                    textAlign: 'center', padding: '0.2rem 0',
                    letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                  }}>
                    {photoFile ? '✓ Uploaded' : 'Passport Photo *'}
                  </div>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem', textAlign: 'center' as const, width: '112px', lineHeight: 1.3 }}>
                  JPG/JPEG/PNG<br />Any size
                </p>
                {photoError && (
                  <p style={{ fontSize: '0.6rem', color: 'var(--danger)', lineHeight: 1.3, marginTop: '0.25rem', textAlign: 'center' as const, width: '112px' }}>
                    ⚠ {photoError}
                  </p>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Title *</label>
                  <select name="title" value={draft.personal.title} onChange={hp} required>
                    <option value="">Select</option>
                    <option>Mr</option><option>Mrs</option><option>Miss</option><option>Dr</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Surname *</label>
                  <input type="text" name="surname" value={draft.personal.surname} onChange={hp} required style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" name="firstName" value={draft.personal.firstName} onChange={hp} required style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label>Other Name(s)</label>
                  <input type="text" name="otherNames" value={draft.personal.otherNames} onChange={hp} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label>Gender *</label>
                  <select name="gender" value={draft.personal.gender} onChange={hp} required>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input type="date" name="dob" value={draft.personal.dob} onChange={hp} required />
                </div>
                <div className="form-group">
                  <label>Nationality *</label>
                  <input type="text" name="nationality" value={draft.personal.nationality} onChange={hp} required />
                </div>
                <div className="form-group">
                  <label>Home Town *</label>
                  <input type="text" name="hometown" value={draft.personal.hometown} onChange={hp} required />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" name="email" value={draft.personal.email} onChange={hp} required />
                </div>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input type="tel" name="phone" value={draft.personal.phone} onChange={hp} placeholder="+233 XX XXX XXXX" required />
                </div>
              </div>
              <div className="form-group">
                <label>Permanent Postal Address *</label>
                <textarea name="postalAddress" value={draft.personal.postalAddress} onChange={hp} rows={2} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label>State Any Physical Challenge (if applicable)</label>
                <input type="text" name="physicalChallenge" value={draft.personal.physicalChallenge} onChange={hp} placeholder="None / describe if applicable" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => set({ step: 1 })} className="btn btn-ghost">← Back</button>
                <button type="button" onClick={() => set({ step: 3 })} className="btn btn-primary">Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Guardian ── */}
          {draft.step === 3 && (
            <div>
              <h3 className="section-title">Particulars of Parent / Guardian</h3>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" value={draft.guardian.name} onChange={hg} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Relationship *</label>
                  <select name="relationship" value={draft.guardian.relationship} onChange={hg} required>
                    <option value="">Select</option>
                    <option>Father</option><option>Mother</option><option>Guardian</option>
                    <option>Sibling</option><option>Spouse</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Occupation *</label>
                  <input type="text" name="occupation" value={draft.guardian.occupation} onChange={hg} required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={draft.guardian.email} onChange={hg} />
                </div>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input type="tel" name="phone" value={draft.guardian.phone} onChange={hg} required />
                </div>
              </div>
              <div className="form-group">
                <label>Permanent Postal Address *</label>
                <textarea name="postalAddress" value={draft.guardian.postalAddress} onChange={hg} rows={2} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => set({ step: 2 })} className="btn btn-ghost">← Back</button>
                <button type="button" onClick={() => set({ step: 4 })} className="btn btn-primary">Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Programme & Enrollment ── */}
          {draft.step === 4 && (
            <div>
              <h3 className="section-title">Programme Selection</h3>
              <p className="section-subtitle">
                Select <strong>one programme</strong> you wish to apply for, then choose your enrollment option.
              </p>

              <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>No.</th>
                      <th>Programme</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Select</th>
                      <th style={{ width: '160px' }}>Available Enrollment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROGRAMMES.map((prog, i) => {
                      const selected = draft.programmeChoices[0]?.id === prog.id;
                      return (
                        <tr key={prog.id} style={{ background: selected ? 'var(--info-bg)' : undefined }}>
                          <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}.</td>
                          <td>
                            <span style={{ fontWeight: selected ? 700 : 400 }}>
                              {prog.label.split(' — ')[0]}
                            </span>
                            {prog.label.includes(' — ') && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                {prog.label.split(' — ')[1]}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="radio"
                              name="programme"
                              checked={selected}
                              onChange={() => selectProgramme(prog.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-mid)' }}
                            />
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {prog.enrollments.join(', ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {draft.programmeChoices.length === 0 && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                  Please select a programme to continue.
                </div>
              )}

              {/* Enrollment — only shown after a programme is selected */}
              {selectedProgramme && (
                <>
                  <hr className="divider" />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.02em' }}>
                    Enrollment Option * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>— for {selectedProgramme.label.split(' — ')[0]}</span>
                  </h4>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {availableEnrollments.map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                        <input type="radio" name="enrollment" value={opt} checked={draft.enrollmentOption === opt}
                          onChange={() => set({ enrollmentOption: opt })}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary-mid)' }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </>
              )}

              <hr className="divider" />
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.02em' }}>
                Financing of Education *
              </h4>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {['SSNIT Students Loan Scheme', 'Employer', 'Guardian', 'Self'].map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                    <input type="checkbox" checked={draft.financing.includes(opt)} onChange={() => toggleFinancing(opt)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary-mid)' }} />
                    {opt}
                  </label>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label>Other (specify)</label>
                <input type="text" value={draft.otherFinancing} onChange={e => set({ otherFinancing: e.target.value })} placeholder="Describe other financing source" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => set({ step: 3 })} className="btn btn-ghost">← Back</button>
                <button type="button"
                  onClick={() => draft.programmeChoices.length === 1 && draft.enrollmentOption && set({ step: 5 })}
                  className="btn btn-primary"
                  disabled={draft.programmeChoices.length !== 1 || !draft.enrollmentOption}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Institutions & Academic Performance ── */}
          {draft.step === 5 && (
            <div>
              <h3 className="section-title">Institutions Attended / Qualifications</h3>
              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px' }}>No.</th>
                      <th>Name of Institution</th>
                      <th style={{ width: '100px' }}>From</th>
                      <th style={{ width: '100px' }}>To</th>
                      <th style={{ width: '170px' }}>Certificate Awarded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.institutions.map((inst, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                        <td><input type="text" value={inst.name} onChange={e => updateInstitution(i, 'name', e.target.value)}
                          placeholder="School / College / University"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="number" value={inst.from} onChange={e => updateInstitution(i, 'from', e.target.value)}
                          placeholder="YYYY" min="1980" max="2026"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="number" value={inst.to} onChange={e => updateInstitution(i, 'to', e.target.value)}
                          placeholder="YYYY" min="1980" max="2026"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="text" value={inst.certificate} onChange={e => updateInstitution(i, 'certificate', e.target.value)}
                          placeholder="e.g. HND, Diploma"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => set({ institutions: [...draft.institutions, emptyInstitution()] })}
                className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }}>
                + Add Institution
              </button>

              <hr className="divider" />

              {/* Diploma / HND section — always shown for top-up */}
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Diploma / HND / Nursing / Teaching Qualification *
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Enter all tertiary qualifications (DBS, HND, Nursing Diploma, Teaching Diploma, Nursing Certificate, Teaching Certificate, etc.)
              </p>
              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Qualification</th>
                      <th>Subject / Programme Studied</th>
                      <th style={{ width: '130px' }}>Date Obtained</th>
                      <th style={{ width: '90px' }}>Grade / Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.diplomaQuals.map((q, i) => (
                      <tr key={i}>
                        <td><input type="text" value={q.qualification} onChange={e => updateDiplomaQual(i, 'qualification', e.target.value)}
                          placeholder="e.g. HND, Nursing Diploma"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="text" value={q.subject} onChange={e => updateDiplomaQual(i, 'subject', e.target.value)}
                          placeholder="e.g. General Nursing"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="month" value={q.dateObtained} onChange={e => updateDiplomaQual(i, 'dateObtained', e.target.value)}
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="text" value={q.grade} onChange={e => updateDiplomaQual(i, 'grade', e.target.value)}
                          placeholder="e.g. Merit"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => set({ diplomaQuals: [...draft.diplomaQuals, { qualification: '', subject: '', dateObtained: '', grade: '' }] })}
                className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }}>
                + Add Qualification
              </button>

              <hr className="divider" />

              {/* Optional WASSCE toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <input type="checkbox" id="hasWassce" checked={draft.hasWassce} onChange={e => set({ hasWassce: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-mid)', cursor: 'pointer' }} />
                <label htmlFor="hasWassce" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  I also have WASSCE / SSCE results to declare
                </label>
              </div>

              {draft.hasWassce && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                    Core Subjects
                  </p>
                  <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px' }}>No.</th>
                          <th>Subject</th>
                          <th style={{ width: '130px' }}>Index No.</th>
                          <th style={{ width: '120px' }}>Exam Type</th>
                          <th style={{ width: '130px' }}>Date Taken</th>
                          <th style={{ width: '90px' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.coreGrades.map((row, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>{i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{row.subject}</td>
                            <td>
                              <input type="text" value={row.indexNo} onChange={e => updateCoreGrade(i, 'indexNo', e.target.value)}
                                placeholder="e.g. 1234567890"
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }} />
                            </td>
                            <td>
                              <select value={row.examType} onChange={e => updateCoreGrade(i, 'examType', e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }}>
                                <option value="">— Select —</option>
                                <option value="WASSCE">WASSCE</option>
                                <option value="SSCE">SSCE</option>
                                <option value="NOVDEC">NOVDEC</option>
                              </select>
                            </td>
                            <td>
                              <input type="month" value={row.dateTaken} onChange={e => updateCoreGrade(i, 'dateTaken', e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }} />
                            </td>
                            <td>
                              <select value={row.grade} onChange={e => updateCoreGrade(i, 'grade', e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }}>
                                <option value="">—</option>
                                {GRADES.map(g => <option key={g}>{g}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                    Elective Subjects
                  </p>
                  <div className="table-wrap" style={{ marginBottom: '0.75rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px' }}>No.</th>
                          <th>Subject</th>
                          <th style={{ width: '130px' }}>Index No.</th>
                          <th style={{ width: '120px' }}>Exam Type</th>
                          <th style={{ width: '130px' }}>Date Taken</th>
                          <th style={{ width: '90px' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.electiveGrades.map((row, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>{i + 1}</td>
                            <td>
                              <input type="text" value={row.subject} onChange={e => updateElectiveGrade(i, 'subject', e.target.value)}
                                placeholder={`Elective ${i + 1}`}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }} />
                            </td>
                            <td>
                              <input type="text" value={row.indexNo} onChange={e => updateElectiveGrade(i, 'indexNo', e.target.value)}
                                placeholder="e.g. 1234567890"
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }} />
                            </td>
                            <td>
                              <select value={row.examType} onChange={e => updateElectiveGrade(i, 'examType', e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }}>
                                <option value="">— Select —</option>
                                <option value="WASSCE">WASSCE</option>
                                <option value="SSCE">SSCE</option>
                                <option value="NOVDEC">NOVDEC</option>
                              </select>
                            </td>
                            <td>
                              <input type="month" value={row.dateTaken} onChange={e => updateElectiveGrade(i, 'dateTaken', e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }} />
                            </td>
                            <td>
                              <select value={row.grade} onChange={e => updateElectiveGrade(i, 'grade', e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%' }}>
                                <option value="">—</option>
                                {GRADES.map(g => <option key={g}>{g}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={() => set({ electiveGrades: [...draft.electiveGrades, emptySubject()] })}
                    className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
                    + Add Elective Subject
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => set({ step: 4 })} className="btn btn-ghost">← Back</button>
                <button type="button" onClick={() => set({ step: 6 })} className="btn btn-primary">Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Employment History ── */}
          {draft.step === 6 && (
            <div>
              <h3 className="section-title">Employment History</h3>
              <p className="section-subtitle">Complete if applicable. Leave blank if not employed.</p>

              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px' }}>No.</th>
                      <th>Employer / Organisation</th>
                      <th style={{ width: '160px' }}>Position Held</th>
                      <th style={{ width: '110px' }}>From</th>
                      <th style={{ width: '110px' }}>To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.employments.map((emp, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}.</td>
                        <td><input type="text" value={emp.employer} onChange={e => updateEmployment(i, 'employer', e.target.value)}
                          placeholder="Organisation name"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="text" value={emp.position} onChange={e => updateEmployment(i, 'position', e.target.value)}
                          placeholder="Job title"
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="month" value={emp.from} onChange={e => updateEmployment(i, 'from', e.target.value)}
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                        <td><input type="month" value={emp.to} onChange={e => updateEmployment(i, 'to', e.target.value)}
                          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={() => set({ employments: [...draft.employments, emptyEmployment()] })}
                className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }}>
                + Add Employment
              </button>

              <div className="form-group" style={{ maxWidth: '240px' }}>
                <label>Total Number of Years Worked</label>
                <input type="number" value={draft.totalYearsWorked} onChange={e => set({ totalYearsWorked: e.target.value })}
                  placeholder="e.g. 5" min="0" max="50" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => set({ step: 5 })} className="btn btn-ghost">← Back</button>
                <button type="button" onClick={() => set({ step: 7 })} className="btn btn-primary">Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 7: Documents & Declaration ── */}
          {draft.step === 7 && (
            <form onSubmit={handleSubmit}>
              <h3 className="section-title">Documents to Attach</h3>
              <p className="section-subtitle">Upload certified copies of all required documents. PDF, JPG, PNG accepted. Max 5MB each.</p>

              <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <strong>Required documents for Top-Up applicants:</strong>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 1.8, fontSize: '0.875rem' }}>
                    <li>Certified true copies of certificates / results slips and birth certificate</li>
                    <li>Transcripts for those with tertiary certifications (HND, Diploma, etc.)</li>
                    <li>Any other relevant academic records</li>
                          </ul>
                </div>
              </div>

              <div className="form-group">
                <label>Passport Photograph</label>
                {photoFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)' }}>
                    <img src={URL.createObjectURL(photoFile)} alt="Passport" style={{ width: '52px', height: '62px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--success-border)' }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--success)' }}>✓ Photo uploaded in Step 2</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{photoFile.name}</div>
                      <button type="button" onClick={() => document.getElementById('passportPhotoInputTopUp')?.click()}
                        style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Change photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--danger)' }}>No photo uploaded yet</div>
                      <button type="button" onClick={() => { set({ step: 2 }); }}
                        style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        ← Go back to Step 2 to upload
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Certificates / Results Slips * (PDF or image, max 5MB)</label>
                <input type="file" name="certificates" onChange={handleFileChange} accept=".pdf,image/*" required />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Certified copies — HND, Diploma, WASSCE, etc.</span>
              </div>
              <div className="form-group">
                <label>Transcripts * (PDF, max 5MB)</label>
                <input type="file" name="transcripts" onChange={handleFileChange} accept=".pdf,image/*" required />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official transcripts from your tertiary institution</span>
              </div>
              <div className="form-group">
                <label>Birth Certificate or National ID * (PDF or image, max 5MB)</label>
                <input type="file" name="birthCert" onChange={handleFileChange} accept=".pdf,image/*" required />
              </div>

              <hr className="divider" />
              <h3 className="section-title">Candidate Declaration</h3>
              <div style={{
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '1.25rem',
                fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                marginBottom: '1.25rem',
              }}>
                I hereby declare that all the above information provided by me is true and correct, and that I could be
                denied admission, or be withdrawn from the University after admission, if the information on this form
                proves to be false.
              </div>

              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name (as signature) *</label>
                  <input type="text" placeholder={`${draft.personal.firstName} ${draft.personal.surname}`.trim() || 'Your full name'} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Date *</label>
                  <input type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => set({ step: 6 })} className="btn btn-ghost">← Back</button>
                <button type="submit" className="btn btn-success btn-lg" disabled={loading}>
                  {loading ? 'Submitting Application...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ApplicationFormTopUp;
