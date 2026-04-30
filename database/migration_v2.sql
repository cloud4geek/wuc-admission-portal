-- ============================================================
-- WUC Admission Portal — Migration v2
-- Adds: application_type, title, surname, postal_address,
--       physical_challenge, enrollment_option, financing,
--       programme_choices, institutions_attended,
--       academic_grades (WASSCE core + electives),
--       diploma_qualifications (top-up),
--       employment_history (top-up),
--       transcripts document type
-- Run this against an existing database.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ── 1. Extend applications table ────────────────────────────

-- Application type: 'regular' | 'topup'
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_type VARCHAR(10) NOT NULL DEFAULT 'regular';

-- Title (Mr/Mrs/Miss/Dr)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS title VARCHAR(10);

-- Surname stored separately (last_name kept for compatibility)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS surname VARCHAR(100);

-- Permanent postal address (replaces generic address for compliance)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS postal_address TEXT;

-- Physical challenge declaration
ALTER TABLE applications ADD COLUMN IF NOT EXISTS physical_challenge TEXT;

-- Enrollment option: Regular | Weekend | Sandwich
ALTER TABLE applications ADD COLUMN IF NOT EXISTS enrollment_option VARCHAR(20);

-- Financing (stored as comma-separated or JSON array)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS financing JSONB DEFAULT '[]';

-- Total years worked (top-up only)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS total_years_worked INTEGER;

-- Candidate type within regular form: 'wassce' | 'mature'
ALTER TABLE applications ADD COLUMN IF NOT EXISTS candidate_type VARCHAR(10) DEFAULT 'wassce';

-- ── 2. Programme choices table ───────────────────────────────
-- Stores up to 3 programme preferences per application

CREATE TABLE IF NOT EXISTS programme_choices (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    programme_id   VARCHAR(60) NOT NULL,
    programme_label TEXT NOT NULL,
    preference     SMALLINT NOT NULL CHECK (preference BETWEEN 1 AND 3),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (application_id, preference)
);

CREATE INDEX IF NOT EXISTS idx_prog_choices_app ON programme_choices(application_id);

-- ── 3. Institutions attended table ──────────────────────────

CREATE TABLE IF NOT EXISTS institutions_attended (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    sort_order     SMALLINT NOT NULL DEFAULT 1,
    institution_name TEXT NOT NULL,
    date_from      VARCHAR(10),   -- year or YYYY-MM
    date_to        VARCHAR(10),
    certificate_awarded TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_institutions_app ON institutions_attended(application_id);

-- ── 4. Academic grades table (WASSCE / SSCE) ────────────────

CREATE TABLE IF NOT EXISTS academic_grades (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    subject_type   VARCHAR(10) NOT NULL CHECK (subject_type IN ('core', 'elective')),
    subject_name   VARCHAR(100) NOT NULL,
    date_taken     VARCHAR(10),   -- YYYY-MM
    grade          VARCHAR(5),    -- A1, B2 … F9
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grades_app ON academic_grades(application_id);

-- ── 5. Diploma / HND qualifications table (top-up) ──────────

CREATE TABLE IF NOT EXISTS diploma_qualifications (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    sort_order     SMALLINT NOT NULL DEFAULT 1,
    qualification  VARCHAR(100) NOT NULL,   -- e.g. HND, Nursing Diploma
    subject_studied TEXT,
    date_obtained  VARCHAR(10),             -- YYYY-MM
    grade          VARCHAR(50),             -- Merit, Pass, etc.
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diploma_app ON diploma_qualifications(application_id);

-- ── 6. Employment history table (top-up) ────────────────────

CREATE TABLE IF NOT EXISTS employment_history (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    sort_order     SMALLINT NOT NULL DEFAULT 1,
    employer       VARCHAR(255) NOT NULL,
    position_held  VARCHAR(255),
    date_from      VARCHAR(10),   -- YYYY-MM
    date_to        VARCHAR(10),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employment_app ON employment_history(application_id);

-- ── 7. Extend documents table with new types ────────────────
-- Existing constraint (if any) on document_type — add transcripts
-- No schema change needed; document_type is VARCHAR(50), free text.
-- Accepted values now: photo, birth_cert, certificates, transcripts, wassce, nmc_pin, recommendation

-- ── 8. Admin: add reject + notes capability ─────────────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update status check to include 'rejected'
-- (PostgreSQL doesn't enforce VARCHAR values without a CHECK constraint;
--  add one only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_status_check'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END$$;

-- ── 9. Indexes for new columns ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_type   ON applications(application_type);
CREATE INDEX IF NOT EXISTS idx_applications_enroll ON applications(enrollment_option);

-- ── v2.1: Add index_no and exam_type to academic_grades ──────
ALTER TABLE academic_grades ADD COLUMN IF NOT EXISTS index_no  VARCHAR(30);
ALTER TABLE academic_grades ADD COLUMN IF NOT EXISTS exam_type VARCHAR(10)
  CHECK (exam_type IN ('WASSCE','SSCE','NOVDEC'));
