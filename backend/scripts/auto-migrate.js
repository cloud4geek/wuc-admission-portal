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
          guardian_info JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ applications');
    } else {
      // Ensure guardian_info column exists on pre-existing databases, and
      // migrate any guardian data previously stored in admin_notes.
      await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS guardian_info JSONB DEFAULT '{}'`).catch(() => {});
      await client.query(`
        UPDATE applications
        SET guardian_info = admin_notes::jsonb
        WHERE (guardian_info IS NULL OR guardian_info = '{}'::jsonb)
          AND admin_notes IS NOT NULL
          AND admin_notes <> ''
          AND admin_notes ~ '^\\s*\\{'
          AND (admin_notes::jsonb ? 'name')
      `).catch(() => {});
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

    // ── students ──
    if (!has.has('students')) {
      await client.query(`
        CREATE TABLE students (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(20) UNIQUE NOT NULL,
          application_id UUID REFERENCES applications(id),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          other_names VARCHAR(100),
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          date_of_birth DATE,
          gender VARCHAR(10),
          nationality VARCHAR(100) DEFAULT 'Ghanaian',
          hometown VARCHAR(100),
          postal_address TEXT,
          programme_id VARCHAR(60),
          programme_label TEXT,
          enrollment_option VARCHAR(20) DEFAULT 'Regular',
          application_type VARCHAR(10) DEFAULT 'regular',
          password_hash TEXT NOT NULL,
          must_change_password BOOLEAN DEFAULT true,
          reset_token TEXT,
          reset_token_expires TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ students');
    } else {
      // Add reset_token columns if missing
      await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS reset_token TEXT`).catch(() => {});
      await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`).catch(() => {});
    }

    // ── announcements ──
    if (!has.has('announcements')) {
      await client.query(`
        CREATE TABLE announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'normal',
          target VARCHAR(20) DEFAULT 'all',
          is_active BOOLEAN DEFAULT true,
          created_by UUID REFERENCES admin_users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ announcements');
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

    // ── courses ──
    if (!has.has('courses')) {
      await client.query(`
        CREATE TABLE courses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_code VARCHAR(20) UNIQUE NOT NULL,
          course_title VARCHAR(255) NOT NULL,
          credit_hours INTEGER NOT NULL DEFAULT 3,
          programme_id VARCHAR(60),
          semester INTEGER NOT NULL,
          level INTEGER NOT NULL DEFAULT 100,
          course_type VARCHAR(20) DEFAULT 'core',
          lecturer VARCHAR(255),
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ courses');
    }

    // ── course_registrations ──
    if (!has.has('course_registrations')) {
      await client.query(`
        CREATE TABLE course_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          course_id UUID NOT NULL REFERENCES courses(id),
          academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
          semester INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT 'registered',
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (student_id, course_id, academic_year, semester)
        )`);
      console.log('  ✅ course_registrations');
    }

    // ── lecturers ──
    if (!has.has('lecturers')) {
      await client.query(`
        CREATE TABLE lecturers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id VARCHAR(20) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          department VARCHAR(100),
          title VARCHAR(50) DEFAULT 'Mr.',
          password_hash TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ lecturers');
    } else {
      // Add setup columns if missing
      await client.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS reset_token TEXT`).catch(() => {});
      await client.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`).catch(() => {});
    }

    // ── lecturer_courses (which courses a lecturer teaches) ──
    if (!has.has('lecturer_courses')) {
      await client.query(`
        CREATE TABLE lecturer_courses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
          course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
          semester INTEGER NOT NULL,
          UNIQUE (lecturer_id, course_id, academic_year, semester)
        )`);
      console.log('  ✅ lecturer_courses');
    }

    // ── results ──
    if (!has.has('results')) {
      await client.query(`
        CREATE TABLE results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          course_id UUID NOT NULL REFERENCES courses(id),
          academic_year VARCHAR(20) NOT NULL,
          semester INTEGER NOT NULL,
          score DECIMAL(5,2),
          grade VARCHAR(5),
          grade_point DECIMAL(3,2),
          status VARCHAR(20) DEFAULT 'pending',
          submitted_by UUID REFERENCES lecturers(id),
          published_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (student_id, course_id, academic_year, semester)
        )`);
      console.log('  ✅ results');
    } else {
      // Add submitted_by if missing
      await client.query(`ALTER TABLE results ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES lecturers(id)`).catch(() => {});
    }

    // ── timetable ──
    if (!has.has('timetable')) {
      await client.query(`
        CREATE TABLE timetable (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID REFERENCES courses(id),
          programme_id VARCHAR(60),
          level INTEGER NOT NULL DEFAULT 100,
          semester INTEGER NOT NULL,
          academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
          day_of_week VARCHAR(15) NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          venue VARCHAR(255),
          lecturer VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ timetable');
    }

    // ── document_requests ──
    if (!has.has('document_requests')) {
      await client.query(`
        CREATE TABLE document_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          document_type VARCHAR(50) NOT NULL,
          reason TEXT,
          copies INTEGER DEFAULT 1,
          status VARCHAR(20) DEFAULT 'pending',
          admin_notes TEXT,
          processed_by UUID REFERENCES admin_users(id),
          processed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ document_requests');
    }

    // ── support_tickets ──
    if (!has.has('support_tickets')) {
      await client.query(`
        CREATE TABLE support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          subject VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'normal',
          status VARCHAR(20) DEFAULT 'open',
          admin_reply TEXT,
          replied_by UUID REFERENCES admin_users(id),
          replied_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ support_tickets');
    }

    // ── resources (library/e-books/materials) ──
    if (!has.has('resources')) {
      await client.query(`
        CREATE TABLE resources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50) NOT NULL,
          file_url TEXT,
          external_url TEXT,
          programme_id VARCHAR(60),
          level INTEGER,
          semester INTEGER,
          uploaded_by UUID REFERENCES admin_users(id),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ resources');
    }

    // ── exam_schedule ──
    if (!has.has('exam_schedule')) {
      await client.query(`
        CREATE TABLE exam_schedule (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID REFERENCES courses(id),
          academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
          semester INTEGER NOT NULL,
          exam_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          venue VARCHAR(255),
          exam_type VARCHAR(30) DEFAULT 'final',
          instructions TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log('  ✅ exam_schedule');
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
      ['idx_students_sid',     'students(student_id)'],
      ['idx_students_email',   'students(email)'],
      ['idx_students_app',     'students(application_id)'],
      ['idx_courses_code',     'courses(course_code)'],
      ['idx_courses_prog',     'courses(programme_id, level, semester)'],
      ['idx_reg_student',      'course_registrations(student_id, academic_year, semester)'],
      ['idx_results_student',  'results(student_id, academic_year, semester)'],
      ['idx_timetable_prog',   'timetable(programme_id, level, semester, academic_year)'],
      ['idx_docreq_student',   'document_requests(student_id)'],
      ['idx_tickets_student',  'support_tickets(student_id)'],
      ['idx_resources_cat',    'resources(category, programme_id)'],
      ['idx_exams_course',     'exam_schedule(course_id, academic_year, semester)'],
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
