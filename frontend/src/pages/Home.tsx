import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => (
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
            <li><a href="https://www.wuc.edu.gh" target="_blank" rel="noopener noreferrer">Main Website</a></li>
            <li><Link to="/purchase-voucher">Buy Voucher</Link></li>
            <li><Link to="/application-status">Check Status</Link></li>
            <li><Link to="/apply">Regular Apply</Link></li>
            <li><Link to="/apply-topup" className="nav-cta">Top-Up Apply</Link></li>
          </ul>
        </nav>
      </div>
    </header>

    {/* Hero */}
    <div style={{
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 60%, var(--primary-light) 100%)',
      color: 'white',
      padding: '4rem 2rem',
      textAlign: 'center',
      borderBottom: '3px solid var(--accent)',
    }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(201,168,76,0.2)',
          border: '1px solid rgba(201,168,76,0.4)',
          borderRadius: '999px',
          padding: '0.3rem 1rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: '1.25rem',
        }}>
          2025/2026 Academic Year
        </div>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '1rem' }}>
          Begin Your Journey at WUC
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Apply for admission to Withrow University College — fully accredited by GTEC and NMC.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/purchase-voucher">
            <button className="btn btn-accent btn-lg">Get Application Voucher</button>
          </Link>
          <Link to="/application-status">
            <button className="btn btn-ghost btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.35)' }}>
              Track Application
            </button>
          </Link>
        </div>
      </div>
    </div>

    <div className="container">
      {/* Application type selector */}
      <div className="card" style={{ marginBottom: '1.25rem', background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
        <h3 className="section-title" style={{ marginBottom: '0.375rem' }}>Which application form do you need?</h3>
        <p className="section-subtitle">Choose the form that matches your qualification level.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--surface)', border: '2px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-xs)', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Regular</span>
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.375rem' }}>Regular Undergraduate</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              For fresh applicants with <strong>WASSCE / SSCE</strong> results. Includes BSc Nursing, BSc Public Health, and Mature Access programmes.
            </p>
            <Link to="/apply"><button className="btn btn-success btn-full">Regular Application →</button></Link>
          </div>
          <div style={{ background: 'var(--surface)', border: '2px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span style={{ background: 'var(--warning-bg)', color: 'var(--accent-dark)', borderRadius: 'var(--radius-xs)', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Top-Up</span>
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.375rem' }}>Top-Up / Access Programme</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              For holders of a <strong>Certificate, Diploma, HND</strong> or equivalent qualification upgrading to a BSc degree.
            </p>
            <Link to="/apply-topup"><button className="btn btn-accent btn-full">Top-Up Application →</button></Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { step: '01', title: 'Buy Voucher', desc: 'Pay GHS 220 via MTN MoMo, Telecel Cash, Visa, or Mastercard.', link: '/purchase-voucher', label: 'Buy Voucher', color: 'var(--primary-mid)', btn: 'btn-primary' },
          { step: '02', title: 'Fill Application', desc: 'Choose your form type above and complete all sections.', link: '/apply', label: 'Apply', color: 'var(--success)', btn: 'btn-success' },
          { step: '03', title: 'Track Status', desc: 'Monitor progress and download your admission letter when approved.', link: '/application-status', label: 'Check Status', color: 'var(--primary-light)', btn: 'btn-primary' },
        ].map(({ step, title, desc, link, label, color, btn }) => (
          <div key={step} className="card" style={{ margin: 0, position: 'relative', paddingTop: '1.75rem' }}>
            <div style={{ position: 'absolute', top: '-1px', left: '2rem', background: color, color: 'white', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', padding: '0.2rem 0.6rem', borderRadius: '0 0 6px 6px' }}>
              STEP {step}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>{desc}</p>
            <Link to={link}><button className={`btn ${btn} btn-full`}>{label}</button></Link>
          </div>
        ))}
      </div>

      {/* Programmes offered */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title">Programmes Offered</h3>
        <p className="section-subtitle">Select up to 3 programmes in order of preference when applying.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'BSc Public Health', sub: 'Disease Control Option', tag: 'Regular' },
            { label: 'BSc Public Health', sub: 'Nutrition Option', tag: 'Regular' },
            { label: 'BSc Nursing', sub: 'Regular / Weekend / Sandwich', tag: 'Regular' },
            { label: 'Mature Access Program', sub: 'For applicants 25 years and above', tag: 'Regular' },
            { label: 'BSc Public Health (Disease Control)', sub: 'Top-Up', tag: 'Top-Up' },
            { label: 'BSc Public Health (Nutrition)', sub: 'Top-Up', tag: 'Top-Up' },
            { label: 'BSc Nursing', sub: 'Access Programme — NAC/NAP Certificate Holders', tag: 'Top-Up' },
            { label: 'BSc Nursing (Top-Up)', sub: 'Diploma in General Nursing or Related Field', tag: 'Top-Up' },
          ].map(({ label, sub, tag }) => (
            <div key={`${label}-${sub}`} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${tag === 'Top-Up' ? 'var(--accent)' : 'var(--border)'}`,
              background: tag === 'Top-Up' ? 'var(--warning-bg)' : 'var(--surface-2)',
            }}>
              <span style={{ color: tag === 'Top-Up' ? 'var(--accent-dark)' : 'var(--success)', fontWeight: 800, fontSize: '1rem', marginTop: '2px', flexShrink: 0 }}>◆</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{label}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>
                <span style={{
                  display: 'inline-block', marginTop: '0.3rem',
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  padding: '0.1rem 0.45rem', borderRadius: '999px',
                  background: tag === 'Top-Up' ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: tag === 'Top-Up' ? 'var(--accent-dark)' : 'var(--success)',
                  border: `1px solid ${tag === 'Top-Up' ? 'var(--accent)' : 'var(--success-border)'}`,
                }}>{tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents + Contact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ margin: 0 }}>
          <h3 className="section-title">Required Documents</h3>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>All Applicants</p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              'Certified true copies of certificates / results slips',
              'Birth Certificate or National ID',
              'Upload Red background passport-sized photograph',
            ].map(doc => (
              <li key={doc} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>✓</span>{doc}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-dark)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Top-Up Applicants (additional)</p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              'Official transcripts from tertiary institution',
              'HND / Diploma / Certificate (certified copies)',
            ].map(doc => (
              <li key={doc} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-dark)', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>✓</span>{doc}
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ margin: 0, background: 'var(--primary)', color: 'white', border: 'none' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white' }}>Contact Admissions</h3>
          {[
            { icon: '✉', label: 'Email', value: 'admissions@wuc.edu.gh' },
            { icon: '☎', label: 'Phone', value: '+233 53 519 7436' },
            { icon: '🌐', label: 'Website', value: 'www.wuc.edu.gh', href: 'https://www.wuc.edu.gh' },
          ].map(({ icon, label, value, href }) => (
            <div key={label} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', opacity: 0.7, marginTop: '1px' }}>{icon}</span>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.1rem' }}>{label}</div>
                {href
                  ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500 }}>{value}</a>
                  : <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Home;
