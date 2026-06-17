import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, #061729 0%, #0a2240 100%)',
      color: 'rgba(255,255,255,0.7)',
      padding: '2rem 1.5rem 1.5rem',
      marginTop: '3rem',
      borderTop: '3px solid #c9a84c',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>

        {/* College Info */}
        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Withrow University College
          </h4>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
            An Affiliate of University for Development Studies (UDS)
          </p>
          <p style={{ fontSize: '0.78rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.5)' }}>
            Loc: Agona Asamang Road<br />
            P.O. Box 128, Agona-Ashanti
          </p>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Contact</h4>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.8, margin: 0 }}>
            📞 0303969461 / 0535197436<br />
            ✉️ admissions@wuc.edu.gh<br />
            🌐 www.wuc.edu.gh
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Quick Links</h4>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.8, margin: 0 }}>
            <a href="/purchase-voucher" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Buy Voucher</a><br />
            <a href="/apply" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Apply Now</a><br />
            <a href="/application-status" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Check Status</a>
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        marginTop: '1.5rem',
        paddingTop: '1rem',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.4)',
      }}>
        © {new Date().getFullYear()} Withrow University College. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
