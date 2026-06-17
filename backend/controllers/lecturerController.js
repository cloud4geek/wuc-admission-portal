/**
 * Lecturer Controller — Authentication and Grade Management
 * Ghana University GPA Scale (4.0):
 *   A+  = 4.0 (80-100)   First Class
 *   A   = 4.0 (75-79)    First Class
 *   B+  = 3.5 (70-74)    Second Class Upper
 *   B   = 3.0 (65-69)    Second Class Upper
 *   C+  = 2.5 (60-64)    Second Class Lower
 *   C   = 2.0 (55-59)    Second Class Lower
 *   D+  = 1.5 (50-54)    Third Class / Pass
 *   D   = 1.0 (45-49)    Pass
 *   E   = 0.5 (40-44)    Marginal Fail (some institutions allow supplementary)
 *   F   = 0.0 (0-39)     Fail
 */
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../utils/jwt');
const logger = require('../utils/logger');

/* ── Ghana GPA Grade Mapping ── */
const getGradeFromScore = (score) => {
  if (score >= 80) return { grade: 'A+', gradePoint: 4.0 };
  if (score >= 75) return { grade: 'A', gradePoint: 4.0 };
  if (score >= 70) return { grade: 'B+', gradePoint: 3.5 };
  if (score >= 65) return { grade: 'B', gradePoint: 3.0 };
  if (score >= 60) return { grade: 'C+', gradePoint: 2.5 };
  if (score >= 55) return { grade: 'C', gradePoint: 2.0 };
  if (score >= 50) return { grade: 'D+', gradePoint: 1.5 };
  if (score >= 45) return { grade: 'D', gradePoint: 1.0 };
  if (score >= 40) return { grade: 'E', gradePoint: 0.5 };
  return { grade: 'F', gradePoint: 0.0 };
};

const getClassOfDegree = (cgpa) => {
  if (cgpa >= 3.6) return 'First Class';
  if (cgpa >= 3.0) return 'Second Class (Upper Division)';
  if (cgpa >= 2.0) return 'Second Class (Lower Division)';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Fail';
};

/* ── POST /api/lecturers/login ── */
const lecturerLogin = async (req, res) => {
  const { staffId, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM lecturers WHERE staff_id = $1 AND is_active = true',
      [staffId.toUpperCase().trim()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid Staff ID or password' });
    }
    const lecturer = result.rows[0];
    const valid = await bcrypt.compare(password, lecturer.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid Staff ID or password' });
    }
    await pool.query('UPDATE lecturers SET last_login = NOW() WHERE id = $1', [lecturer.id]);
    const token = jwtUtil.generateToken({
      lecturerId: lecturer.id,
      staffId: lecturer.staff_id,
      email: lecturer.email,
      role: 'lecturer',
    }, '12h');
    res.json({
      success: true, token,
      lecturer: { id: lecturer.id, staffId: lecturer.staff_id, firstName: lecturer.first_name, lastName: lecturer.last_name, title: lecturer.title, department: lecturer.department },
    });
  } catch (error) {
    logger.error('Lecturer login error', { error: error.message });
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/* ── GET /api/lecturers/courses — courses assigned to this lecturer ── */
const getMyCourses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lc.*, c.course_code, c.course_title, c.credit_hours, c.level, c.programme_id, c.course_type,
              (SELECT COUNT(*) FROM course_registrations cr WHERE cr.course_id = c.id AND cr.academic_year = lc.academic_year AND cr.semester = lc.semester) as enrolled_count
       FROM lecturer_courses lc
       JOIN courses c ON c.id = lc.course_id
       WHERE lc.lecturer_id = $1
       ORDER BY lc.academic_year DESC, lc.semester, c.level, c.course_code`,
      [req.lecturer.lecturerId]
    );
    res.json({ success: true, courses: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load courses' });
  }
};

/* ── GET /api/lecturers/courses/:courseId/students — enrolled students for a course ── */
const getCourseStudents = async (req, res) => {
  const { courseId } = req.params;
  const { academicYear, semester } = req.query;
  try {
    // Verify lecturer owns this course
    const ownerCheck = await pool.query(
      'SELECT id FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2',
      [req.lecturer.lecturerId, courseId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this course' });
    }

    const result = await pool.query(
      `SELECT s.id as student_uuid, s.student_id, s.first_name, s.last_name,
              cr.id as registration_id,
              r.score, r.grade, r.grade_point, r.status as result_status, r.id as result_id
       FROM course_registrations cr
       JOIN students s ON s.id = cr.student_id
       LEFT JOIN results r ON r.student_id = s.id AND r.course_id = cr.course_id 
         AND r.academic_year = cr.academic_year AND r.semester = cr.semester
       WHERE cr.course_id = $1
       AND cr.academic_year = $2
       AND cr.semester = $3
       ORDER BY s.last_name, s.first_name`,
      [courseId, academicYear || '2025/2026', semester || 1]
    );
    res.json({ success: true, students: result.rows });
  } catch (error) {
    logger.error('Get course students error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load students' });
  }
};

/* ── POST /api/lecturers/courses/:courseId/grades — submit grades for a course ── */
const submitGrades = async (req, res) => {
  const { courseId } = req.params;
  const { grades, academicYear, semester } = req.body;
  // grades = [{ studentId: uuid, score: number }]
  try {
    // Verify lecturer owns this course
    const ownerCheck = await pool.query(
      'SELECT id FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2',
      [req.lecturer.lecturerId, courseId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this course' });
    }

    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: 'No grades provided' });
    }

    // Get all students registered for this specific course/year/semester
    const registeredStudents = await pool.query(
      `SELECT student_id FROM course_registrations WHERE course_id = $1 AND academic_year = $2 AND semester = $3`,
      [courseId, academicYear || '2025/2026', semester || 1]
    );
    const registeredSet = new Set(registeredStudents.rows.map(r => r.student_id));

    let submitted = 0, errors = 0, skipped = 0;
    for (const g of grades) {
      if (g.score === null || g.score === undefined || g.score === '') continue;

      // SECURITY: Verify student is registered for THIS specific course
      if (!registeredSet.has(g.studentId)) {
        skipped++;
        continue;
      }

      const score = parseFloat(g.score);
      if (isNaN(score) || score < 0 || score > 100) { errors++; continue; }
      const { grade, gradePoint } = getGradeFromScore(score);

      // Upsert result — only allow overwrite if status is 'draft' or 'pending'
      // Once published, grades cannot be changed without admin intervention
      await pool.query(
        `INSERT INTO results (student_id, course_id, academic_year, semester, score, grade, grade_point, status, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
         ON CONFLICT (student_id, course_id, academic_year, semester)
         DO UPDATE SET score = $5, grade = $6, grade_point = $7, status = 'draft', submitted_by = $8
         WHERE results.status != 'published'`,
        [g.studentId, courseId, academicYear || '2025/2026', semester || 1, score, grade, gradePoint, req.lecturer.lecturerId]
      );
      submitted++;
    }

    res.json({ 
      success: true, 
      message: `${submitted} grade(s) saved as draft.${errors ? ` ${errors} invalid score(s) skipped.` : ''}${skipped ? ` ${skipped} unregistered student(s) rejected.` : ''}`,
      submitted, errors, skipped 
    });
  } catch (error) {
    logger.error('Submit grades error', { error: error.message });
    res.status(500).json({ success: false, message: 'Grade submission failed' });
  }
};

/* ── POST /api/lecturers/courses/:courseId/publish — publish grades ── */
/* RESTRICTED: Only Registrar or Super Admin can publish grades */
const publishGrades = async (req, res) => {
  return res.status(403).json({ 
    success: false, 
    message: 'Only the Registrar or Super Admin can publish grades. Please submit your grades as draft and notify the Registrar for approval.' 
  });
};

/* ── GET /api/lecturers/profile ── */
const getLecturerProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, staff_id, first_name, last_name, email, phone, department, title, created_at FROM lecturers WHERE id = $1',
      [req.lecturer.lecturerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

/* ── GET /api/lecturers/courses/:courseId/export — Export student list as CSV for offline grading ── */
const exportStudentsCSV = async (req, res) => {
  const { courseId } = req.params;
  const { academicYear, semester } = req.query;
  try {
    const ownerCheck = await pool.query(
      'SELECT id FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2',
      [req.lecturer.lecturerId, courseId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Not assigned to this course' });
    }

    // Get course info
    const courseInfo = await pool.query('SELECT course_code, course_title, level FROM courses WHERE id = $1', [courseId]);
    const course = courseInfo.rows[0];

    // Get registered students with any existing scores
    const result = await pool.query(
      `SELECT s.student_id, s.first_name, s.last_name,
              r.score
       FROM course_registrations cr
       JOIN students s ON s.id = cr.student_id
       LEFT JOIN results r ON r.student_id = s.id AND r.course_id = cr.course_id 
         AND r.academic_year = cr.academic_year AND r.semester = cr.semester
       WHERE cr.course_id = $1 AND cr.academic_year = $2 AND cr.semester = $3
       ORDER BY s.last_name, s.first_name`,
      [courseId, academicYear || '2025/2026', semester || 1]
    );

    // Build CSV
    const header = 'Student ID,Last Name,First Name,Score (0-100)';
    const rows = result.rows.map(s => 
      `${s.student_id},${s.last_name},${s.first_name},${s.score !== null ? s.score : ''}`
    );
    const csv = [
      `# ${course.course_code} - ${course.course_title} (Level ${course.level})`,
      `# Academic Year: ${academicYear || '2025/2026'}, Semester: ${semester || 1}`,
      `# Instructions: Enter scores in the "Score (0-100)" column. Save as CSV and upload back.`,
      `# DO NOT modify Student ID, Last Name, or First Name columns.`,
      '',
      header,
      ...rows
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${course.course_code.replace(/\s/g, '-')}-grades-template.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Export CSV error', { error: error.message });
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

/* ── POST /api/lecturers/courses/:courseId/import — Import grades from CSV ── */
const importGradesCSV = async (req, res) => {
  const { courseId } = req.params;
  const { csvData, academicYear, semester } = req.body;
  try {
    const ownerCheck = await pool.query(
      'SELECT id FROM lecturer_courses WHERE lecturer_id = $1 AND course_id = $2',
      [req.lecturer.lecturerId, courseId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Not assigned to this course' });
    }

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ success: false, message: 'No CSV data provided' });
    }

    // Parse CSV — skip comment lines and header
    const lines = csvData.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV must have a header row and at least one data row' });
    }

    // Skip header row
    const dataLines = lines.slice(1);

    // Get registered students for validation
    const registeredStudents = await pool.query(
      `SELECT s.id, s.student_id FROM course_registrations cr
       JOIN students s ON s.id = cr.student_id
       WHERE cr.course_id = $1 AND cr.academic_year = $2 AND cr.semester = $3`,
      [courseId, academicYear || '2025/2026', semester || 1]
    );
    const studentMap = new Map(registeredStudents.rows.map(s => [s.student_id, s.id]));

    let submitted = 0, errors = 0, skipped = 0;
    const errorDetails = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle commas in quoted fields)
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 4) { errors++; errorDetails.push(`Row ${i + 2}: Not enough columns`); continue; }

      const [studentId, , , scoreStr] = parts;
      
      if (!scoreStr || scoreStr === '') { skipped++; continue; } // Empty score = skip

      const studentUuid = studentMap.get(studentId);
      if (!studentUuid) { errors++; errorDetails.push(`Row ${i + 2}: Student ${studentId} not registered for this course`); continue; }

      const score = parseFloat(scoreStr);
      if (isNaN(score) || score < 0 || score > 100) { errors++; errorDetails.push(`Row ${i + 2}: Invalid score "${scoreStr}" for ${studentId}`); continue; }

      const { grade, gradePoint } = getGradeFromScore(score);

      await pool.query(
        `INSERT INTO results (student_id, course_id, academic_year, semester, score, grade, grade_point, status, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
         ON CONFLICT (student_id, course_id, academic_year, semester)
         DO UPDATE SET score = $5, grade = $6, grade_point = $7, status = 'draft', submitted_by = $8
         WHERE results.status != 'published'`,
        [studentUuid, courseId, academicYear || '2025/2026', semester || 1, score, grade, gradePoint, req.lecturer.lecturerId]
      );
      submitted++;
    }

    res.json({
      success: true,
      message: `Import complete: ${submitted} grade(s) saved as draft.`,
      submitted, errors, skipped,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined,
    });
  } catch (error) {
    logger.error('Import CSV error', { error: error.message });
    res.status(500).json({ success: false, message: 'Import failed: ' + error.message });
  }
};

module.exports = { lecturerLogin, getMyCourses, getCourseStudents, submitGrades, publishGrades, getLecturerProfile, getGradeFromScore, getClassOfDegree, exportStudentsCSV, importGradesCSV };
