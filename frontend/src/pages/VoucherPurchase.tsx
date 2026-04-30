import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const VoucherPurchase: React.FC = () => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', paymentMethod: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [voucherCode, setVoucherCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setVoucherCode('');
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API}/api/vouchers/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setVoucherCode(data.voucherCode);
        setMessage({ type: 'success', text: `Payment successful! A confirmation email has been sent to ${formData.email}.` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Payment failed. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentOptions = [
    { value: 'mtn', label: 'MTN Mobile Money' },
    { value: 'telecel', label: 'Telecel Cash' },
    { value: 'visa', label: 'Visa Card' },
    { value: 'mastercard', label: 'Mastercard' },
  ];

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
              <li><Link to="/apply">Apply Now</Link></li>
              <li><Link to="/application-status">Check Status</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-inner">
          <h2>Purchase Application Voucher</h2>
          <p>Secure your spot — pay the application fee to receive your unique voucher code.</p>
        </div>
      </div>

      <div className="container-sm">
        {voucherCode && (
          <div className="voucher-box">
            <div className="voucher-label">Your Voucher Code</div>
            <div className="voucher-code">{voucherCode}</div>
            <button onClick={copyToClipboard} className="btn btn-accent btn-sm">
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Save this code — you'll need it to complete your application.
            </p>
          </div>
        )}

        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Applicant Details</h3>
            <div style={{
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-sm)',
              padding: '0.4rem 0.875rem',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}>
              GHS 220.00
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. Kwame" required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Mensah" required />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+233 XX XXX XXXX" required />
            </div>

            <div className="form-group">
              <label>Payment Method *</label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                <option value="">Select a payment method</option>
                {paymentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Processing...' : 'Pay GHS 220.00'}
            </button>
          </form>
        </div>

        <div className="card" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.75rem' }}>
            Important Notes
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              'Your voucher code appears on screen immediately after payment.',
              'A confirmation email is also sent to your address.',
              'Vouchers are valid for 30 days from the purchase date.',
              'For issues, contact admissions@wuc.edu.gh.',
            ].map(note => (
              <li key={note} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8375rem', color: 'var(--warning)' }}>
                <span style={{ flexShrink: 0 }}>•</span>{note}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Retrieve Lost Voucher ── */}
        <VoucherRecovery />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Voucher Recovery Component
   ══════════════════════════════════════════════════════════ */
const VoucherRecovery: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API}/api/vouchers/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'No voucher found.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Lost your voucher code?
        </p>
        <button onClick={() => setOpen(true)} className="btn btn-ghost">
          Retrieve Lost Voucher
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="section-title">Retrieve Lost Voucher</h3>
      <p className="section-subtitle">
        Enter the email address and phone number you used when purchasing the voucher.
        If they match, your voucher code will be displayed and resent to you.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {result ? (
        <div>
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{result.message}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.vouchers.map((v: any) => (
              <div key={v.voucherCode} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${v.status === 'unused' ? 'var(--success-border)' : 'var(--border)'}`,
                background: v.status === 'unused' ? 'var(--success-bg)' : 'var(--surface-2)',
              }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--primary)' }}>
                    {v.voucherCode}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Purchased: {new Date(v.purchasedAt).toLocaleDateString()} · Expires: {new Date(v.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${v.status === 'unused' ? 'badge-success' : v.status === 'used' ? 'badge-neutral' : 'badge-danger'}`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => { setResult(null); setOpen(false); }} className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleRecover}>
          <div className="form-group">
            <label>Email Address *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="The email you used during purchase" required />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="The phone number you used during purchase" required />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Find My Voucher'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default VoucherPurchase;
