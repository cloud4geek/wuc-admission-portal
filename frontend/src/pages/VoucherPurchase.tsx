import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const VoucherPurchase: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    paymentMethod: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [voucherCode, setVoucherCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setVoucherCode('');

    try {
      const response = await fetch('http://localhost:5000/api/vouchers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setVoucherCode(data.voucherCode);
        setMessage({
          type: 'success',
          text: `Payment successful! Your voucher code is displayed below. An email has also been sent to ${formData.email}.`
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Payment failed. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(voucherCode);
    alert('Voucher code copied to clipboard!');
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section"><h1>WUC Admission Portal</h1></div>
          <nav>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/apply">Apply Now</Link></li>
              <li><Link to="/application-status">Check Status</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1e3a8a' }}>Purchase Application Voucher</h2>
          <p style={{ marginBottom: '2rem', color: '#666' }}>Application Fee: GHS 200.00</p>

          {message.text && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>
          )}

          {voucherCode && (
            <div style={{ 
              background: '#003366', 
              color: 'white', 
              padding: '2rem', 
              borderRadius: '8px', 
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{ marginBottom: '1rem', color: 'white' }}>Your Voucher Code</h3>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                letterSpacing: '0.2rem',
                marginBottom: '1rem'
              }}>
                {voucherCode}
              </div>
              <button 
                onClick={copyToClipboard}
                style={{
                  background: 'white',
                  color: '#003366',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📋 Copy Code
              </button>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#e0e0e0' }}>
                Save this code! You'll need it to complete your application.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+233XXXXXXXXX" required />
            </div>

            <div className="form-group">
              <label>Payment Method *</label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                <option value="">Select Payment Method</option>
                <option value="mtn">MTN Mobile Money</option>
                <option value="telecel">Telecel Cash</option>
                <option value="visa">Visa Card</option>
                <option value="mastercard">Mastercard</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Processing Payment...' : 'Pay GHS 200.00'}
            </button>
          </form>
        </div>

        <div className="card" style={{ background: '#fef3c7' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#92400e' }}>Important Notes:</h3>
          <ul style={{ lineHeight: '1.8', paddingLeft: '1.5rem', color: '#78350f' }}>
            <li>Your voucher code will be displayed on screen immediately after payment</li>
            <li>A confirmation email will also be sent to your email address</li>
            <li>Keep your voucher code safe - you'll need it to complete your application</li>
            <li>Voucher is valid for 30 days from purchase date</li>
            <li>If you have any issues, contact admissions@wuc.edu.gh</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoucherPurchase;
