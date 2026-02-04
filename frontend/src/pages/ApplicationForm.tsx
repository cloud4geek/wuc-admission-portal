import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ApplicationForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    voucherCode: '', firstName: '', lastName: '', otherNames: '', dateOfBirth: '', gender: '',
    nationality: '', region: '', hometown: '', email: '', phone: '', address: '', programChoice: '',
    previousSchool: '', yearCompleted: '', guardianName: '', guardianPhone: '', guardianEmail: ''
  });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    photo: null, birthCert: null, wassce: null, nmcPin: null, recommendation: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [e.target.name]: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const applicationId = `APP${Date.now().toString().slice(-6)}`;
      setMessage({
        type: 'success',
        text: `Application submitted successfully! Your Application ID is: ${applicationId}. Check your email for confirmation.`
      });
      setTimeout(() => window.location.href = '/application-status', 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Application submission failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section"><h1>WUC Admission Portal</h1></div>
          <nav>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/purchase-voucher">Purchase Voucher</Link></li>
              <li><Link to="/application-status">Check Status</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1e3a8a' }}>Application Form</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            {[1, 2, 3, 4].map(num => (
              <div key={num} style={{ flex: 1, height: '4px', background: step >= num ? '#3b82f6' : '#e5e7eb', marginRight: num < 4 ? '0.5rem' : '0' }} />
            ))}
          </div>

          {message.text && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div>
                <h3 style={{ marginBottom: '1.5rem', color: '#1e40af' }}>Step 1: Voucher Verification</h3>
                <div className="form-group">
                  <label>Voucher Code *</label>
                  <input type="text" name="voucherCode" value={formData.voucherCode} onChange={handleChange} placeholder="Enter your voucher code" required />
                </div>
                <button type="button" onClick={() => setStep(2)} className="btn btn-primary">Next</button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 style={{ marginBottom: '1.5rem', color: '#1e40af' }}>Step 2: Personal Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Other Names</label><input type="text" name="otherNames" value={formData.otherNames} onChange={handleChange} /></div>
                  <div className="form-group"><label>Date of Birth *</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Gender *</label><select name="gender" value={formData.gender} onChange={handleChange} required><option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option></select></div>
                  <div className="form-group"><label>Nationality *</label><input type="text" name="nationality" value={formData.nationality} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Region *</label><input type="text" name="region" value={formData.region} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Hometown *</label><input type="text" name="hometown" value={formData.hometown} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Email *</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Phone *</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} required /></div>
                </div>
                <div className="form-group"><label>Residential Address *</label><textarea name="address" value={formData.address} onChange={handleChange} rows={3} required /></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setStep(1)} className="btn" style={{ background: '#6b7280', color: 'white' }}>Previous</button>
                  <button type="button" onClick={() => setStep(3)} className="btn btn-primary">Next</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 style={{ marginBottom: '1.5rem', color: '#1e40af' }}>Step 3: Academic & Guardian Information</h3>
                <div className="form-group">
                  <label>Program Choice *</label>
                  <select name="programChoice" value={formData.programChoice} onChange={handleChange} required>
                    <option value="">Select Program</option>
                    <option value="nursing">Nursing</option>
                    <option value="midwifery">Midwifery</option>
                    <option value="public-health">Public Health</option>
                    <option value="health-info">Health Information Management</option>
                    <option value="biomedical">Biomedical Science</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div className="form-group"><label>Previous School *</label><input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Year Completed *</label><input type="number" name="yearCompleted" value={formData.yearCompleted} onChange={handleChange} min="2000" max="2025" required /></div>
                </div>
                <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#1e40af' }}>Guardian Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div className="form-group"><label>Guardian Name *</label><input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Guardian Phone *</label><input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} required /></div>
                  <div className="form-group"><label>Guardian Email</label><input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleChange} /></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setStep(2)} className="btn" style={{ background: '#6b7280', color: 'white' }}>Previous</button>
                  <button type="button" onClick={() => setStep(4)} className="btn btn-primary">Next</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h3 style={{ marginBottom: '1.5rem', color: '#1e40af' }}>Step 4: Document Upload (GTEC & NMC Compliant)</h3>
                <div className="form-group"><label>Passport Photo * (Max 2MB, JPG/PNG)</label><input type="file" name="photo" onChange={handleFileChange} accept="image/*" required /></div>
                <div className="form-group"><label>Birth Certificate / National ID * (Max 5MB, PDF)</label><input type="file" name="birthCert" onChange={handleFileChange} accept=".pdf" required /></div>
                <div className="form-group"><label>WASSCE/SSSCE Certificate * (Max 5MB, PDF)</label><input type="file" name="wassce" onChange={handleFileChange} accept=".pdf" required /></div>
                <div className="form-group"><label>NMC Pin (Top-up applicants - Optional) (Max 5MB, PDF)</label><input type="file" name="nmcPin" onChange={handleFileChange} accept=".pdf" /></div>
                <div className="form-group"><label>Recommendation Letter (Optional, Max 5MB, PDF)</label><input type="file" name="recommendation" onChange={handleFileChange} accept=".pdf" /></div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setStep(3)} className="btn" style={{ background: '#6b7280', color: 'white' }}>Previous</button>
                  <button type="submit" className="btn btn-success" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;
