/**
 * Auto-migration: creates all tables in the 'wuc' schema.
 * The wuc schema is owned by wuc_admin so no superuser needed.
 * Runs on every server start — safe to run repeatedly.
 */
const { pool } = require('../config/database');

async function autoMigrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running auto-migration...');

    // Ensure schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS wuc AUTHORIZATION CURRENT_USER');
    await client.query('SET search_path TO wuc, public');

    // Check existing tables in wuc schema
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'wuc'`
    );
    const has = new Set(rows.map(r => r.tablename));

    // ── vouchers ──
    if (!has.has('vouchers')) {
      await client.query(`
        CREATE TABLE vouchers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          voucher_code VARCHAR(20) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          payment_reference VARCHAR(100),
          amount DECIMAL(10,2) NOT NULL DEFAULT 220.00,
          status VARCHAR(20) DEFAULT 'unused',
          used_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ vouchers');
    }

    // ── admin_users ──
    if (!has.has('admin_users')) {
      await client.query(`
        CREATE TABLE admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          reset_token TEXT,
          reset_token_expires TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ admin_users');
    }

    // ── applications ──
    if (!has.has('applications')) {
      await client.query(`
        CREATE TABLE applications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id VARCHAR(20) UNIQUE NOT NULL,
          voucher_id UUID REFERENCES vouchers(id),
          application_type VARCHAR(10) NOT NULL DEFAULT 'regular',
          title VARCHAR(10),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          other_names VARCHAR(100),
          date_of_birth DATE NOT NULL,
          gender VARCHAR(10) NOT NULL,
          nationality VARCHAR(100) NOT NULL DEFAULT 'Ghanaian',
          hometown VARCHAR(100) NOT NULL,
          postal_address TEXT NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          physical_challenge TEXT,
          enrollment_option VARCHAR(20),
          financing JSONB DEFAULT '[]',
          candidate_type VARCHAR(10) DEFAULT 'wassce',
          total_years_worked INTEGER,
          status VARCHAR(20) DEFAULT 'pending',
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reviewed_at TIMESTAMP,
          reviewed_by UUID,
          admission_letter_url TEXT,
          rejection_reason TEXT,
          admin_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ applications');
    }

    // ── programme_choices ──
    if (!has.has('programme_choices')) {
      await client.query(`
        CREATE TABLE programme_choices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
          programme_id VARCHAR(60) NOT NULL,
          programme_label TEXT NOT NULL,
          preference SMALLINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (application_id, preference)
        )`);
      console.log('  ✅ programme_choices');
    }

    // ── institutions_attended ──
    if (!has.has('institutions_attended')) {
      await client.query(`
        CREATE TABLE institutions_attended (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
          sort_order SMALLINT NOT NULL DEFAULT 1,
          institution_name TEXT NOT NULL,
          date_from VARCHAR(10),
          date_to VARCHAR(10),
          certificate_awarded TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ institutions_attended');
    }

    // ── academic_grades ──
    if (!has.has('academic_grades')) {
      await client.query(`
        CREATE TABLE academic_grades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
          subject_type VARCHAR(10) NOT NULL,
          subject_name VARCHAR(100) NOT NULL,
          index_no VARCHAR(30),
          exam_type VARCHAR(10),
          date_taken VARCHAR(10),
          grade VARCHAR(5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ academic_grades');
    }

    // ── diploma_qualifications ──
    if (!has.has('diploma_qualifications')) {
      await client.query(`
        CREATE TABLE diploma_qualifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
          sort_order SMALLINT NOT NULL DEFAULT 1,
          qualification VARCHAR(100) NOT NULL,
          subject_studied TEXT,
          date_obtained VARCHAR(10),
          grade VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ diploma_qualifications');
    }

    // ── employment_history ──
    if (!has.has('employment_history')) {
      await client.query(`
        CREATE TABLE employment_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
          sort_order SMALLINT NOT NULL DEFAULT 1,
          employer VARCHAR(255) NOT NULL,
          position_held VARCHAR(255),
          date_from VARCHAR(10),
          date_to VARCHAR(10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ employment_history');
    }

    // ── documents ──
    if (!has.has('documents')) {
      await client.query(`
        CREATE TABLE documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
          document_type VARCHAR(50) NOT NULL,
          document_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          status VARCHAR(20) DEFAULT 'pending',
          verified_at TIMESTAMP,
          verified_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ documents');
    }

    // ── payments ──
    if (!has.has('payments')) {
      await client.query(`
        CREATE TABLE payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          voucher_id UUID REFERENCES vouchers(id),
          payment_reference VARCHAR(100) UNIQUE NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'GHS',
          status VARCHAR(20) DEFAULT 'pending',
          provider_response JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ payments');
    }

    // ── notifications ──
    if (!has.has('notifications')) {
      await client.query(`
        CREATE TABLE notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_email VARCHAR(255) NOT NULL,
          recipient_phone VARCHAR(20),
          notification_type VARCHAR(50) NOT NULL,
          subject VARCHAR(255),
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          sent_at TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ notifications');
    }

    // ── audit_logs ──
    if (!has.has('audit_logs')) {
      await client.query(`
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id UUID,
          details JSONB,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ audit_logs');
    }

    // ── programme_fees ──
    if (!has.has('programme_fees')) {
      await client.query(`
        CREATE TABLE programme_fees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          programme_id VARCHAR(60) NOT NULL,
          programme_label TEXT NOT NULL,
          application_type VARCHAR(10) NOT NULL CHECK (application_type IN ('regular','topup')),
          enrollment_option VARCHAR(20) NOT NULL CHECK (enrollment_option IN ('Regular','Weekend','Sandwich')),
          tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          facility_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          library_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          ict_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          examination_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          other_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
          other_fees_label TEXT,
          total_fee DECIMAL(10,2) GENERATED ALWAYS AS (tuition_fee + facility_fee + library_fee + ict_fee + examination_fee + registration_fee + other_fees) STORED,
          duration_years INTEGER NOT NULL DEFAULT 4,
          bank_name TEXT DEFAULT 'GCB BANK',
          bank_branch TEXT DEFAULT 'AGONA BRANCH',
          bank_account_no TEXT DEFAULT '6201130004574',
          bank_account_name TEXT DEFAULT 'WITHROW COLLEGE',
          initial_payment_percent INTEGER DEFAULT 70,
          initial_payment_deadline TEXT DEFAULT 'September 1',
          balance_payment_deadline TEXT DEFAULT 'October 15',
          programme_start_date TEXT DEFAULT 'September 8',
          academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (programme_id, application_type, enrollment_option, academic_year)
        )
      `);
      console.log('  ✅ programme_fees');
    } else {
      // Add new columns if table exists
      const newCols = [
        ['duration_years', 'INTEGER DEFAULT 4'],
        ['bank_name', "TEXT DEFAULT 'GCB BANK'"],
        ['bank_branch', "TEXT DEFAULT 'AGONA BRANCH'"],
        ['bank_account_no', "TEXT DEFAULT '6201130004574'"],
        ['bank_account_name', "TEXT DEFAULT 'WITHROW COLLEGE'"],
        ['initial_payment_percent', 'INTEGER DEFAULT 70'],
        ['initial_payment_deadline', "TEXT DEFAULT 'September 1'"],
        ['balance_payment_deadline', "TEXT DEFAULT 'October 15'"],
        ['programme_start_date', "TEXT DEFAULT 'September 8'"],
      ];
      for (const [col, def] of newCols) {
        await client.query(`ALTER TABLE programme_fees ADD COLUMN IF NOT EXISTS ${col} ${def}`).catch(() => {});
      }
    }

    // ── Indexes ──
    const indexes = [
      ['idx_vouchers_code',    'vouchers(voucher_code)'],
      ['idx_vouchers_email',   'vouchers(email)'],
      ['idx_vouchers_status',  'vouchers(status)'],
      ['idx_app_id',           'applications(application_id)'],
      ['idx_app_email',        'applications(email)'],
      ['idx_app_status',       'applications(status)'],
      ['idx_app_type',         'applications(application_type)'],
      ['idx_prog_app',         'programme_choices(application_id)'],
      ['idx_inst_app',         'institutions_attended(application_id)'],
      ['idx_grades_app',       'academic_grades(application_id)'],
      ['idx_diploma_app',      'diploma_qualifications(application_id)'],
      ['idx_employ_app',       'employment_history(application_id)'],
      ['idx_docs_app',         'documents(application_id)'],
      ['idx_pay_ref',          'payments(payment_reference)'],
      ['idx_fees_prog',        'programme_fees(programme_id, application_type, enrollment_option)'],
    ];
    for (const [name, def] of indexes) {
      await client.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${def}`).catch(() => {});
    }

    console.log('✅ Auto-migration complete — all tables ready.\n');
  } catch (err) {
    console.error('❌ Auto-migration error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { autoMigrate };
