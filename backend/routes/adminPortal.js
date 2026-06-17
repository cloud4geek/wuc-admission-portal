/**
 * Admin Portal Routes — Manage courses, timetable, resources,
 * document requests, and support tickets for the Student Portal.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');

router.use(authenticateAdmin);

/* ── COURSES ── */
router.get('/courses', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM courses ORDER BY programme_id, level, semester, course_code');
    res.json({ success: true, courses: result.rows });
  } catch (error) { next(error); }
});

router.post('/courses', async (req, res, next) => {
  const { courseCode, courseTitle, creditHours, programmeId, semester, level, courseType, lecturer } = req.body;
  try {
    await pool.query(
      `INSERT INTO courses (course_code, course_title, credit_hours, programme_id, semester, level, course_type, lecturer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [courseCode, courseTitle, creditHours || 3, programmeId || null, semester || 1, level || 100, courseType || 'core', lecturer || null]
    );
    res.status(201).json({ success: true, message: 'Course created' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Course code already exists' });
    next(error);
  }
});

router.delete('/courses/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) { next(error); }
});

/* ── TIMETABLE ── */
router.get('/timetable', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.course_code, c.course_title FROM timetable t
       LEFT JOIN courses c ON c.id = t.course_id
       ORDER BY CASE t.day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, t.start_time`
    );
    res.json({ success: true, timetable: result.rows });
  } catch (error) { next(error); }
});

router.post('/timetable', async (req, res, next) => {
  const { courseId, programmeId, level, semester, dayOfWeek, startTime, endTime, venue, lecturer } = req.body;
  try {
    await pool.query(
      `INSERT INTO timetable (course_id, programme_id, level, semester, academic_year, day_of_week, start_time, end_time, venue, lecturer)
       VALUES ($1,$2,$3,$4,'2025/2026',$5,$6,$7,$8,$9)`,
      [courseId || null, programmeId || 'bsc-nursing', level || 100, semester || 1, dayOfWeek, startTime, endTime, venue || null, lecturer || null]
    );
    res.status(201).json({ success: true, message: 'Timetable entry added' });
  } catch (error) { next(error); }
});

router.delete('/timetable/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM timetable WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Entry removed' });
  } catch (error) { next(error); }
});

/* ── DOCUMENT REQUESTS ── */
router.get('/document-requests', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT dr.*, s.student_id, s.first_name, s.last_name FROM document_requests dr
       JOIN students s ON s.id = dr.student_id
       ORDER BY CASE dr.status WHEN 'pending' THEN 1 WHEN 'processing' THEN 2 ELSE 3 END, dr.created_at DESC`
    );
    res.json({ success: true, requests: result.rows });
  } catch (error) { next(error); }
});

router.put('/document-requests/:id', async (req, res, next) => {
  const { status, adminNotes } = req.body;
  try {
    await pool.query(
      `UPDATE document_requests SET status=$1, admin_notes=COALESCE($2, admin_notes), processed_by=$3, processed_at=NOW() WHERE id=$4`,
      [status, adminNotes || null, req.admin?.adminId || null, req.params.id]
    );
    res.json({ success: true, message: 'Request updated' });
  } catch (error) { next(error); }
});

/* ── SUPPORT TICKETS ── */
router.get('/support-tickets', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT st.*, s.student_id, s.first_name, s.last_name FROM support_tickets st
       JOIN students s ON s.id = st.student_id
       ORDER BY CASE st.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, st.created_at DESC`
    );
    res.json({ success: true, tickets: result.rows });
  } catch (error) { next(error); }
});

router.post('/support-tickets/:id/reply', async (req, res, next) => {
  const { reply } = req.body;
  try {
    await pool.query(
      `UPDATE support_tickets SET admin_reply=$1, replied_by=$2, replied_at=NOW(), status='in_progress', updated_at=NOW() WHERE id=$3`,
      [reply, req.admin?.adminId || null, req.params.id]
    );
    res.json({ success: true, message: 'Reply sent' });
  } catch (error) { next(error); }
});

router.put('/support-tickets/:id/status', async (req, res, next) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE support_tickets SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) { next(error); }
});

/* ── RESOURCES ── */
router.get('/resources', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM resources ORDER BY created_at DESC');
    res.json({ success: true, resources: result.rows });
  } catch (error) { next(error); }
});

router.post('/resources', async (req, res, next) => {
  const { title, description, category, externalUrl, programmeId } = req.body;
  try {
    await pool.query(
      `INSERT INTO resources (title, description, category, external_url, programme_id, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [title, description || null, category || 'other', externalUrl || null, programmeId || null, req.admin?.adminId || null]
    );
    res.status(201).json({ success: true, message: 'Resource added' });
  } catch (error) { next(error); }
});

router.delete('/resources/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM resources WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) { next(error); }
});

/* ── RESULTS PUBLISHING (Registrar/Super Admin only) ── */

// Get draft counts per course
router.get('/results/draft-counts', async (req, res, next) => {
  const { academicYear, semester, level } = req.query;
  try {
    let query = `SELECT r.course_id, c.level, COUNT(*) as count FROM results r
       JOIN courses c ON c.id = r.course_id
       WHERE r.status = 'draft' AND r.academic_year = $1 AND r.semester = $2`;
    const params = [academicYear || '2025/2026', semester || 1];
    if (level) {
      query += ` AND c.level = $3`;
      params.push(level);
    }
    query += ` GROUP BY r.course_id, c.level`;
    const result = await pool.query(query, params);
    res.json({ success: true, counts: result.rows });
  } catch (error) { next(error); }
});

// Publish grades for a specific course
router.post('/results/publish', async (req, res, next) => {
  const { courseId, academicYear, semester } = req.body;
  try {
    const result = await pool.query(
      `UPDATE results SET status = 'published', published_at = NOW()
       WHERE course_id = $1 AND academic_year = $2 AND semester = $3 AND status = 'draft'
       RETURNING id`,
      [courseId, academicYear || '2025/2026', semester || 1]
    );
    res.json({ success: true, message: `${result.rowCount} result(s) published`, published: result.rowCount });
  } catch (error) { next(error); }
});

// Publish ALL draft grades for a semester — optionally filtered by level
router.post('/results/publish-all', async (req, res, next) => {
  const { academicYear, semester, level } = req.body;
  try {
    let query, params;
    if (level) {
      // Publish only for a specific level
      query = `UPDATE results SET status = 'published', published_at = NOW()
               WHERE academic_year = $1 AND semester = $2 AND status = 'draft'
               AND course_id IN (SELECT id FROM courses WHERE level = $3)
               RETURNING id`;
      params = [academicYear || '2025/2026', semester || 1, level];
    } else {
      // Publish all levels
      query = `UPDATE results SET status = 'published', published_at = NOW()
               WHERE academic_year = $1 AND semester = $2 AND status = 'draft'
               RETURNING id`;
      params = [academicYear || '2025/2026', semester || 1];
    }
    const result = await pool.query(query, params);
    const levelMsg = level ? ` for Level ${level}` : ' across all levels';
    res.json({ success: true, message: `${result.rowCount} result(s) published${levelMsg}`, published: result.rowCount });
  } catch (error) { next(error); }
});

/* ── COURSE ASSIGNMENTS (Assign courses to lecturers) ── */

// Get all assignments with lecturer and course details
router.get('/assignments', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT lc.id, lc.academic_year, lc.semester,
              l.id as lecturer_id, l.staff_id, l.first_name as lecturer_first, l.last_name as lecturer_last, l.title as lecturer_title,
              c.id as course_id, c.course_code, c.course_title, c.credit_hours, c.level
       FROM lecturer_courses lc
       JOIN lecturers l ON l.id = lc.lecturer_id
       JOIN courses c ON c.id = lc.course_id
       ORDER BY lc.academic_year DESC, lc.semester, c.course_code`
    );
    res.json({ success: true, assignments: result.rows });
  } catch (error) { next(error); }
});

// Get all lecturers (for dropdown)
router.get('/lecturers', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, staff_id, first_name, last_name, title, department FROM lecturers WHERE is_active = true ORDER BY last_name'
    );
    res.json({ success: true, lecturers: result.rows });
  } catch (error) { next(error); }
});

// Assign a course to a lecturer
router.post('/assignments', async (req, res, next) => {
  const { lecturerId, courseId, academicYear, semester } = req.body;
  try {
    await pool.query(
      `INSERT INTO lecturer_courses (lecturer_id, course_id, academic_year, semester) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [lecturerId, courseId, academicYear || '2025/2026', semester || 1]
    );
    res.status(201).json({ success: true, message: 'Course assigned to lecturer' });
  } catch (error) { next(error); }
});

// Remove assignment
router.delete('/assignments/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM lecturer_courses WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Assignment removed' });
  } catch (error) { next(error); }
});

module.exports = router;
