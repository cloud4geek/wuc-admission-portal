import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--primary, #1a2332)',
      color: 'rgba(255,255,255,0.85)',
      padding: '3rem 2rem 1.5rem',
      marginTop: '3rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Transparent logo watermark */}
      <div style={{
        position: 'absolute', top: '50%', right: '5%',
        transform: 'translateY(-50%)',
        width: '300px', height: '300px',
        backgroundImage: 'url(http://wuc.edu.gh/wp-content/uploads/2023/08/Withrow-Logo-scaled.jpg)',
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        opacity: 0.04, pointerEvents: 'none', borderRadius: '50%',
      }} />
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Top section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <img
                src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg"
                alt="Withrow University College"
                style={{ height: '54px', width: '54px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Withrow University College</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Admission Portal</div>
              </div>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              Fully accredited by GTEC and NMC. Providing quality education in Health Sciences and Nursing.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: '1rem' }}>
              Quick Links
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Buy Voucher', to: '/purchase-voucher' },
                { label: 'Regular Application', to: '/apply' },
                { label: 'Top-Up Application', to: '/apply-topup' },
                { label: 'Check Status', to: '/application-status' },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: '1rem' }}>
              Contact Us
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ opacity: 0.6 }}>✉</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>admissions@wuc.edu.gh</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ opacity: 0.6 }}>☎</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>+233 53 519 7436</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ opacity: 0.6 }}>🌐</span>
                <a href="https://www.wuc.edu.gh" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #c9a84c)', textDecoration: 'none' }}>
                  www.wuc.edu.gh
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <p style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              © {currentYear} Withrow University College. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="https://www.wuc.edu.gh" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                Privacy Policy
              </a>
              <a href="https://www.wuc.edu.gh" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                Terms of Use
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
