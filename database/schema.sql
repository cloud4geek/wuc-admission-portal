-- ============================================================
-- WUC Admission Portal — Full Database Schema v2
-- Withrow University College, Agona-Asamangah
-- Supports: Regular (WASSCE/Mature) + Top-Up (Diploma/HND) applicants
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Vouchers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_code     VARCHAR(20) UNIQUE NOT NULL,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(20) NOT NULL,
    payment_method   VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    amount           DECIMAL(10,2) NOT NULL DEFAULT 220.00,
    status           VARCHAR(20) DEFAULT 'unused' CHECK (status IN ('unused','used','expired')),
    used_at          TIMESTAMP,
    expires_at       TIMESTAMP NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Applications (core record) ───────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id   VARCHAR(20) UNIQUE NOT NULL,
    voucher_id       UUID REFERENCES vouchers(id),

    -- Form type
    application_type VARCHAR(10) NOT NULL DEFAULT 'regular'
                     CHECK (application_type IN ('regular','topup')),

    -- Personal particulars
    title            VARCHAR(10),
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,   -- surname
    other_names      VARCHAR(100),
    date_of_birth    DATE NOT NULL,
    gender           VARCHAR(10) NOT NULL,
    nationality      VARCHAR(100) NOT NULL DEFAULT 'Ghanaian',
    hometown         VARCHAR(100) NOT NULL,
    postal_address   TEXT NOT NULL,
    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(20) NOT NULL,
    physical_challenge TEXT,

    -- Enrollment & financing
    enrollment_option VARCHAR(20) CHECK (enrollment_option IN ('Regular','Weekend','Sandwich')),
    financing         JSONB DEFAULT '[]',

    -- Candidate type (regular form only)
    candidate_type   VARCHAR(10) DEFAULT 'wassce'
                     CHECK (candidate_type IN ('wassce','mature')),

    -- Top-up: employment summary
    total_years_worked INTEGER,

    -- Status & review
    status           VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
    submitted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at      TIMESTAMP,
    reviewed_by      UUID REFERENCES admin_users(id),
    admission_letter_url TEXT,
    rejection_reason TEXT,
    admin_notes      TEXT,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Programme choices (up to 3 per application) ──────────────
CREATE TABLE IF NOT EXISTS programme_choices (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    programme_id   VARCHAR(60) NOT NULL,
    programme_label TEXT NOT NULL,
    preference     SMALLINT NOT NULL CHECK (preference BETWEEN 1 AND 3),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (application_id, preference)
);

-- ── Institutions attended ────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions_attended (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    sort_order       SMALLINT NOT NULL DEFAULT 1,
    institution_name TEXT NOT NULL,
    date_from        VARCHAR(10),
    date_to          VARCHAR(10),
    certificate_awarded TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Academic grades (WASSCE/SSCE core & elective) ────────────
CREATE TABLE IF NOT EXISTS academic_grades (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    subject_type   VARCHAR(10) NOT NULL CHECK (subject_type IN ('core','elective')),
    subject_name   VARCHAR(100) NOT NULL,
    index_no       VARCHAR(30),
    exam_type      VARCHAR(10) CHECK (exam_type IN ('WASSCE','SSCE','NOVDEC')),
    date_taken     VARCHAR(10),
    grade          VARCHAR(5),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Diploma / HND qualifications (top-up applicants) ─────────
CREATE TABLE IF NOT EXISTS diploma_qualifications (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    sort_order     SMALLINT NOT NULL DEFAULT 1,
    qualification  VARCHAR(100) NOT NULL,
    subject_studied TEXT,
    date_obtained  VARCHAR(10),
    grade          VARCHAR(50),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Employment history (top-up applicants) ───────────────────
CREATE TABLE IF NOT EXISTS employment_history (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    sort_order     SMALLINT NOT NULL DEFAULT 1,
    employer       VARCHAR(255) NOT NULL,
    position_held  VARCHAR(255),
    date_from      VARCHAR(10),
    date_to        VARCHAR(10),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Documents ────────────────────────────────────────────────
-- document_type values: photo, birth_cert, certificates,
--   transcripts, wassce, nmc_pin, recommendation
CREATE TABLE IF NOT EXISTS documents (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    document_type  VARCHAR(50) NOT NULL,
    document_name  VARCHAR(255) NOT NULL,
    file_path      TEXT NOT NULL,
    file_size      INTEGER,
    mime_type      VARCHAR(100),
    status         VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
    verified_at    TIMESTAMP,
    verified_by    UUID,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id        UUID REFERENCES vouchers(id),
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    payment_method    VARCHAR(50) NOT NULL,
    amount            DECIMAL(10,2) NOT NULL,
    currency          VARCHAR(3) DEFAULT 'GHS',
    status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
    provider_response JSONB,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Admin users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username            VARCHAR(100) UNIQUE NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    role                VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
    is_active           BOOLEAN DEFAULT true,
    last_login          TIMESTAMP,
    reset_token         TEXT,
    reset_token_expires TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email  VARCHAR(255) NOT NULL,
    recipient_phone  VARCHAR(20),
    notification_type VARCHAR(50) NOT NULL,
    subject          VARCHAR(255),
    message          TEXT NOT NULL,
    status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    sent_at          TIMESTAMP,
    error_message    TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Audit logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vouchers_code        ON vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_vouchers_email       ON vouchers(email);
CREATE INDEX IF NOT EXISTS idx_vouchers_status      ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_applications_id      ON applications(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_email   ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status  ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_type    ON applications(application_type);
CREATE INDEX IF NOT EXISTS idx_prog_choices_app     ON programme_choices(application_id);
CREATE INDEX IF NOT EXISTS idx_institutions_app     ON institutions_attended(application_id);
CREATE INDEX IF NOT EXISTS idx_grades_app           ON academic_grades(application_id);
CREATE INDEX IF NOT EXISTS idx_diploma_app          ON diploma_qualifications(application_id);
CREATE INDEX IF NOT EXISTS idx_employment_app       ON employment_history(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_app        ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref         ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_vouchers_updated_at
    BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Default admin (password: Admin@WUC2025) ──────────────────
-- Hash generated with bcrypt rounds=10
INSERT INTO admin_users (username, email, password_hash, role)
VALUES ('admin', 'admin@wuc.edu.gh',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y',
        'super_admin')
ON CONFLICT (email) DO NOTHING;
