/**
 * Student Portal Controller — Course Registration, Timetable, Results,
 * Document Requests, Support Tickets, Resources, Exams
 */
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/* ══════════════════════════════════════════════════════════
   COURSE REGISTRATION
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/courses/available — courses available for registration */
const getAvailableCourses = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT programme_id, enrollment_option FROM students WHERE id = $1',
      [req.student.studentId]
    );
    if (student.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const { programme_id } = student.rows[0];
    const { semester, level, academicYear } = req.query;

    const result = await pool.query(
      `SELECT c.*, 
        EXISTS(SELECT 1 FROM course_registrations cr 
               WHERE cr.course_id = c.id AND cr.student_id = $1 
               AND cr.academic_year = $2 AND cr.semester = $3) as is_registered
       FROM courses c 
       WHERE c.programme_id = $4 AND c.is_active = true
       AND ($5::int IS NULL OR c.level = $5)
       AND ($6::int IS NULL OR c.semester = $6)
       ORDER BY c.level, c.semester, c.course_code`,
      [req.student.studentId, academicYear || '2025/2026', semester || 1, programme_id,
       level ? parseInt(level) : null, semester ? parseInt(semester) : null]
    );

    res.json({ success: true, courses: result.rows });
  } catch (error) {
    logger.error('Get available courses error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load courses' });
  }
};

/** GET /api/students/courses/registered — student's registered courses */
const getRegisteredCourses = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;
    const result = await pool.query(
      `SELECT cr.*, c.course_code, c.course_title, c.credit_hours, c.lecturer, c.level, c.course_type
       FROM course_registrations cr
       JOIN courses c ON c.id = cr.course_id
       WHERE cr.student_id = $1
       AND ($2::varchar IS NULL OR cr.academic_year = $2)
       AND ($3::int IS NULL OR cr.semester = $3)
       ORDER BY c.level, c.course_code`,
      [req.student.studentId, academicYear || null, semester ? parseInt(semester) : null]
    );

    const totalCredits = result.rows.reduce((sum, r) => sum + (r.credit_hours || 0), 0);
    res.json({ success: true, registrations: result.rows, totalCredits });
  } catch (error) {
    logger.error('Get registered courses error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load registrations' });
  }
};

/** POST /api/students/courses/register — register for courses */
const registerCourses = async (req, res) => {
  const { courseIds, semester, academicYear } = req.body;
  try {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one course' });
    }
    if (courseIds.length > 8) {
      return res.status(400).json({ success: false, message: 'Maximum 8 courses per semester' });
    }

    let registered = 0;
    for (const courseId of courseIds) {
      await pool.query(
        `INSERT INTO course_registrations (student_id, course_id, academic_year, semester)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [req.student.studentId, courseId, academicYear || '2025/2026', semester || 1]
      );
      registered++;
    }

    res.json({ success: true, message: `${registered} course(s) registered`, registered });
  } catch (error) {
    logger.error('Course registration error', { error: error.message });
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

/** DELETE /api/students/courses/drop/:registrationId */
const dropCourse = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM course_registrations WHERE id = $1 AND student_id = $2 RETURNING id',
      [req.params.registrationId, req.student.studentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    res.json({ success: true, message: 'Course dropped' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to drop course' });
  }
};

/* ══════════════════════════════════════════════════════════
   RESULTS / GPA
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/results */
const getResults = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    // Get all published results
    const result = await pool.query(
      `SELECT r.*, c.course_code, c.course_title, c.credit_hours, c.level
       FROM results r
       JOIN courses c ON c.id = r.course_id
       WHERE r.student_id = $1 AND r.status = 'published'
       ORDER BY r.academic_year DESC, r.semester DESC, c.level, c.course_code`,
      [req.student.studentId]
    );

    // Filter for display if semester/year specified
    let displayResults = result.rows;
    if (academicYear) displayResults = displayResults.filter(r => r.academic_year === academicYear);
    if (semester) displayResults = displayResults.filter(r => r.semester === parseInt(semester));

    // Calculate CGPA (cumulative — all results)
    let cTotalPoints = 0, cTotalCredits = 0;
    for (const r of result.rows) {
      if (r.grade_point !== null && r.credit_hours) {
        cTotalPoints += parseFloat(r.grade_point) * r.credit_hours;
        cTotalCredits += r.credit_hours;
      }
    }
    const cgpa = cTotalCredits > 0 ? parseFloat((cTotalPoints / cTotalCredits).toFixed(2)) : null;

    // Calculate SGPA (semester — filtered results)
    let sTotalPoints = 0, sTotalCredits = 0;
    for (const r of displayResults) {
      if (r.grade_point !== null && r.credit_hours) {
        sTotalPoints += parseFloat(r.grade_point) * r.credit_hours;
        sTotalCredits += r.credit_hours;
      }
    }
    const sgpa = sTotalCredits > 0 ? parseFloat((sTotalPoints / sTotalCredits).toFixed(2)) : null;

    // Class of degree (Ghana standard)
    let classOfDegree = null;
    if (cgpa !== null) {
      if (cgpa >= 3.6) classOfDegree = 'First Class';
      else if (cgpa >= 3.0) classOfDegree = 'Second Class (Upper Division)';
      else if (cgpa >= 2.0) classOfDegree = 'Second Class (Lower Division)';
      else if (cgpa >= 1.5) classOfDegree = 'Third Class';
      else if (cgpa >= 1.0) classOfDegree = 'Pass';
      else classOfDegree = 'Fail';
    }

    // Group by semester for transcript view
    const semesters = {};
    for (const r of result.rows) {
      const key = `${r.academic_year} Sem ${r.semester}`;
      if (!semesters[key]) semesters[key] = [];
      semesters[key].push(r);
    }

    res.json({
      success: true,
      results: displayResults,
      transcript: semesters,
      sgpa,
      cgpa,
      classOfDegree,
      totalCreditsEarned: cTotalCredits,
    });
  } catch (error) {
    logger.error('Get results error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load results' });
  }
};

/* ══════════════════════════════════════════════════════════
   TIMETABLE
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/timetable */
const getTimetable = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT programme_id FROM students WHERE id = $1', [req.student.studentId]
    );
    const { programme_id } = student.rows[0];
    const { semester, level, academicYear } = req.query;

    const result = await pool.query(
      `SELECT t.*, c.course_code, c.course_title
       FROM timetable t
       LEFT JOIN courses c ON c.id = t.course_id
       WHERE t.programme_id = $1 AND t.is_active = true
       AND ($2::int IS NULL OR t.semester = $2)
       AND ($3::int IS NULL OR t.level = $3)
       AND ($4::varchar IS NULL OR t.academic_year = $4)
       ORDER BY CASE t.day_of_week 
         WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7
       END, t.start_time`,
      [programme_id, semester ? parseInt(semester) : null, level ? parseInt(level) : null, academicYear || null]
    );

    res.json({ success: true, timetable: result.rows });
  } catch (error) {
    logger.error('Get timetable error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load timetable' });
  }
};

/* ══════════════════════════════════════════════════════════
   DOCUMENT REQUESTS
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/document-requests */
const getDocumentRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM document_requests WHERE student_id = $1 ORDER BY created_at DESC`,
      [req.student.studentId]
    );
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
};

/** POST /api/students/document-requests */
const createDocumentRequest = async (req, res) => {
  const { documentType, reason, copies } = req.body;
  try {
    await pool.query(
      `INSERT INTO document_requests (student_id, document_type, reason, copies) VALUES ($1,$2,$3,$4)`,
      [req.student.studentId, documentType, reason || null, copies || 1]
    );
    res.status(201).json({ success: true, message: 'Document request submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Request failed' });
  }
};

/* ══════════════════════════════════════════════════════════
   SUPPORT TICKETS
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/support-tickets */
const getSupportTickets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM support_tickets WHERE student_id = $1 ORDER BY created_at DESC`,
      [req.student.studentId]
    );
    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
};

/** POST /api/students/support-tickets */
const createSupportTicket = async (req, res) => {
  const { subject, category, message, priority } = req.body;
  try {
    await pool.query(
      `INSERT INTO support_tickets (student_id, subject, category, message, priority) VALUES ($1,$2,$3,$4,$5)`,
      [req.student.studentId, subject, category, message, priority || 'normal']
    );
    res.status(201).json({ success: true, message: 'Support ticket created' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

/* ══════════════════════════════════════════════════════════
   RESOURCES / LIBRARY
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/resources */
const getResources = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT programme_id FROM students WHERE id = $1', [req.student.studentId]
    );
    const { programme_id } = student.rows[0];
    const { category } = req.query;

    const result = await pool.query(
      `SELECT * FROM resources 
       WHERE is_active = true AND (programme_id IS NULL OR programme_id = $1)
       AND ($2::varchar IS NULL OR category = $2)
       ORDER BY created_at DESC`,
      [programme_id, category || null]
    );
    res.json({ success: true, resources: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load resources' });
  }
};

/* ══════════════════════════════════════════════════════════
   EXAM SCHEDULE
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/exams */
const getExamSchedule = async (req, res) => {
  try {
    // Get exams for courses the student is registered for
    const { semester, academicYear } = req.query;
    const result = await pool.query(
      `SELECT es.*, c.course_code, c.course_title
       FROM exam_schedule es
       JOIN courses c ON c.id = es.course_id
       WHERE es.is_active = true
       AND es.course_id IN (
         SELECT cr.course_id FROM course_registrations cr
         WHERE cr.student_id = $1
         AND ($2::varchar IS NULL OR cr.academic_year = $2)
         AND ($3::int IS NULL OR cr.semester = $3)
       )
       ORDER BY es.exam_date, es.start_time`,
      [req.student.studentId, academicYear || null, semester ? parseInt(semester) : null]
    );
    res.json({ success: true, exams: result.rows });
  } catch (error) {
    logger.error('Get exam schedule error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load exam schedule' });
  }
};

/* ══════════════════════════════════════════════════════════
   STUDENT PHOTO / ID
   ══════════════════════════════════════════════════════════ */

/** GET /api/students/photo — get student passport photo URL */
const getStudentPhoto = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.file_path FROM documents d
       JOIN students s ON s.application_id = d.application_id
       WHERE s.id = $1 AND d.document_type = 'photo'
       ORDER BY d.created_at DESC LIMIT 1`,
      [req.student.studentId]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, photoUrl: null });
    }
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const photoUrl = `${process.env.API_URL || 'http://localhost:5000'}/${result.rows[0].file_path}?token=${token}`;
    res.json({ success: true, photoUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get photo' });
  }
};

module.exports = {
  getAvailableCourses, getRegisteredCourses, registerCourses, dropCourse,
  getResults,
  getTimetable,
  getDocumentRequests, createDocumentRequest,
  getSupportTickets, createSupportTicket,
  getResources,
  getExamSchedule,
  getStudentPhoto,
};
