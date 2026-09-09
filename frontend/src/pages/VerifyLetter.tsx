import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface VerifyResult {
  valid: boolean;
  message: string;
  applicant?: {
    applicationId: string;
    name: string;
    programmeType: string;
    status: string;
  };
}

const VerifyLetter: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const sig = params.get('sig');

    if (!id || !sig) {
      setResult({ valid: false, message: 'Invalid verification link. Missing letter reference.' });
      setLoading(false);
      return;
    }

    fetch(`${API}/api/applications/verify-letter?id=${encodeURIComponent(id)}&sig=${encodeURIComponent(sig)}`)
      .then(r => r.json())
      .then((data: VerifyResult) => setResult(data))
      .catch(() => setResult({ valid: false, message: 'Could not verify the letter. Please try again later.' }))
      .finally(() => setLoading(false));
  }, [location.search]);

  const navy = '#0a2240';
  const green = '#16a34a';
  const red = '#dc2626';

  return (
    <div style={{ maxWidth: 560, margin: '3rem auto', padding: '0 1rem' }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2.5rem 2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)', textAlign: 'center',
      }}>
        <h2 style={{ color: navy, marginBottom: '0.25rem' }}>Admission Letter Verification</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Withrow University College
        </p>

        {loading && (
          <div style={{ padding: '2rem', color: '#666' }}>
            <div style={{ fontSize: '1rem' }}>Verifying letter authenticity…</div>
          </div>
        )}

        {!loading && result && (
          <div>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: result.valid ? '#dcfce7' : '#fee2e2',
              color: result.valid ? green : red, fontSize: 40, fontWeight: 700,
            }}>
              {result.valid ? '✓' : '✕'}
            </div>

            <h3 style={{ color: result.valid ? green : red, marginBottom: '0.75rem' }}>
              {result.valid ? 'Authentic Letter' : 'Verification Failed'}
            </h3>

            <p style={{ color: '#333', lineHeight: 1.5, marginBottom: result.applicant ? '1.5rem' : 0 }}>
              {result.message}
            </p>

            {result.valid && result.applicant && (
              <div style={{
                textAlign: 'left', background: '#f8fafc', borderRadius: 12,
                padding: '1.25rem 1.5rem', marginTop: '1rem',
              }}>
                <Row label="Applicant" value={result.applicant.name} />
                <Row label="Application ID" value={result.applicant.applicationId} />
                <Row label="Programme Type" value={result.applicant.programmeType === 'topup' ? 'Top-Up' : 'Undergraduate'} />
                <Row label="Status" value={result.applicant.status} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #eef2f7' }}>
    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{label}</span>
    <span style={{ color: '#0a2240', fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>{value}</span>
  </div>
);

export default VerifyLetter;
