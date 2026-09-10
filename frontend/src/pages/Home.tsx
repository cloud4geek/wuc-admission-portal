import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const sliderImages = [
  { url: 'http://wuc.edu.gh/wp-content/uploads/2025/12/WUC_People-2.jpg', alt: 'WUC Graduation Celebration' },
  { url: 'http://wuc.edu.gh/wp-content/uploads/2025/07/3-1-scaled.jpg', alt: 'WUC Graduates' },
  { url: 'http://wuc.edu.gh/wp-content/uploads/2025/07/30-scaled.jpg', alt: 'WUC Convocation' },
  { url: 'http://wuc.edu.gh/wp-content/uploads/2025/07/33-scaled.jpg', alt: 'WUC Faculty and Students' },
];

const HeroSlider: React.FC = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((prev) => (prev + 1) % sliderImages.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', overflow: 'hidden' }}>
      {/* Images */}
      {sliderImages.map((img, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          opacity: i === current ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
        }}>
          <img src={img.url} alt={img.alt} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} />
        </div>
      ))}

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(0,51,102,0.75) 0%, rgba(0,51,102,0.55) 50%, rgba(0,51,102,0.7) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', color: 'white', padding: '2rem',
      }}>
        <div style={{ maxWidth: '680px' }}>
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
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: '2rem' }}>
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

      {/* Dots */}
      <div style={{
        position: 'absolute', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '0.5rem',
      }}>
        {sliderImages.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} style={{
            width: i === current ? '24px' : '10px', height: '10px',
            borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: i === current ? 'var(--accent, #c9a84c)' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Accent bottom border */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--accent, #c9a84c)' }} />
    </div>
  );
};

const Home: React.FC = () => (
  <div>
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          <img src="http://wuc.edu.gh/wp-content/uploads/2023/08/Withrow-Logo-scaled.jpg" alt="Withrow University College" style={{ height: '54px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }} />
          <div>
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

    {/* Hero Slider */}
    <HeroSlider />

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

      {/* Programmes offered + Documents + Contact — with full watermark backdrop */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Large transparent logo watermark spanning full section */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%', height: '100%', maxWidth: '900px', maxHeight: '900px',
          backgroundImage: 'url(http://wuc.edu.gh/wp-content/uploads/2023/08/Withrow-Logo-scaled.jpg)',
          backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          opacity: 0.1, pointerEvents: 'none',
        }} />

      {/* Programmes offered */}
      <div style={{
        marginBottom: '1.25rem',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(0,51,102,0.03) 0%, rgba(201,168,76,0.05) 100%)',
        border: '1px solid rgba(0,51,102,0.08)',
        position: 'relative',
      }}>
        {/* Decorative blur circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(201,168,76,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(0,51,102,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Programmes Offered</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>Select up to 3 programmes in order of preference when applying.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'BSc Public Health — Disease Control', desc: 'Prepares graduates to design and implement disease surveillance, prevention, and control strategies within Ghana\'s public health infrastructure, aligned with GHS and WHO frameworks.', tag: 'Regular' },
              { label: 'BSc Public Health — Nutrition', desc: 'Focuses on community nutrition, food safety, and dietary interventions to address malnutrition and non-communicable diseases across Ghanaian health facilities.', tag: 'Regular' },
              { label: 'BSc Nursing', desc: 'A comprehensive programme producing competent registered nurses for clinical, community, and public health settings, accredited by the Nursing and Midwifery Council of Ghana (NMC).', tag: 'Regular' },
              { label: 'Mature Access Programme', desc: 'Designed for applicants aged 25 and above who seek an alternative pathway into health science degree programmes, meeting GHS workforce development goals.', tag: 'Regular' },
              { label: 'BSc Public Health — Disease Control (Top-Up)', desc: 'An upgrading pathway for diploma and certificate holders in environmental health or disease control to obtain a full bachelor\'s degree for career advancement within GHS.', tag: 'Top-Up' },
              { label: 'BSc Public Health — Nutrition (Top-Up)', desc: 'Enables holders of HND or diploma qualifications in nutrition or related fields to progress to a BSc and take on senior public health nutrition roles.', tag: 'Top-Up' },
              { label: 'BSc Nursing — Access Programme', desc: 'For NAC/NAP certificate holders seeking to upgrade to a BSc Nursing degree, enabling eligibility for advanced clinical roles and NMC licensure.', tag: 'Top-Up' },
              { label: 'BSc Nursing (Top-Up)', desc: 'A degree completion programme for holders of Diploma in General Nursing or related fields, designed to meet NMC requirements for professional advancement.', tag: 'Top-Up' },
            ].map(({ label, desc, tag }) => (
              <div key={label} style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${tag === 'Top-Up' ? 'rgba(201,168,76,0.25)' : 'rgba(0,51,102,0.08)'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>{label}</div>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    padding: '0.15rem 0.55rem', borderRadius: '999px',
                    background: tag === 'Top-Up' ? 'rgba(201,168,76,0.12)' : 'rgba(16,185,129,0.1)',
                    color: tag === 'Top-Up' ? '#8b6914' : '#059669',
                    border: `1px solid ${tag === 'Top-Up' ? 'rgba(201,168,76,0.3)' : 'rgba(16,185,129,0.25)'}`,
                  }}>{tag}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
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

        <div className="card" style={{
          margin: 0, background: 'rgba(0,51,102,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          position: 'relative', overflow: 'hidden', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
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
          </div>{/* End zIndex wrapper */}
        </div>
      </div>

      </div>{/* End watermark wrapper */}
    </div>
  </div>
);

export default Home;
