const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher } = require('../middleware/auth');
const bcrypt = require('bcrypt');

/**
 * @route GET /api/teachers
 * @desc Get all teachers
 * @access Private (Teachers only)
 */
router.get('/', [
  verifyToken,
  isTeacher,
  query('schoolId').optional().isInt().withMessage('Valid school ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const schoolId = req.query.schoolId ? parseInt(req.query.schoolId) : null;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    // Build query with filters
    let query = `
      SELECT t.id, t.username, t.first_name, t.last_name, t.email, 
             t.school_id, t.created_at, s.name as school_name
      FROM teachers t
      LEFT JOIN schools s ON t.school_id = s.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (schoolId) {
      query += ` AND t.school_id = $${paramCount}`;
      queryParams.push(schoolId);
      paramCount++;
    }

    // Add pagination
    query += ` ORDER BY t.last_name, t.first_name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await req.db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM teachers t WHERE 1=1';
    const countParams = [];
    
    if (schoolId) {
      countQuery += ' AND t.school_id = $1';
      countParams.push(schoolId);
    }
    
    const countResult = await req.db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      teachers: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/teachers/:id
 * @desc Get a teacher by ID
 * @access Private (Teachers only)
 */
router.get('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid teacher ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = parseInt(req.params.id);

  // Only allow teachers to view their own profile or admin teachers to view any
  if (req.user.id !== teacherId && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Not authorized to view this teacher profile' });
  }

  try {
    const result = await req.db.query(
      `SELECT t.id, t.username, t.first_name, t.last_name, t.email, 
              t.school_id, t.created_at, s.name as school_name
       FROM teachers t
       LEFT JOIN schools s ON t.school_id = s.id
       WHERE t.id = $1`,
      [teacherId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get teacher's students count
    const studentsResult = await req.db.query(
      'SELECT COUNT(*) FROM users WHERE teacher_id = $1',
      [teacherId]
    );

    // Get recent assignments created by this teacher
    const assignmentsResult = await req.db.query(
      `SELECT ra.id, ra.user_id, ra.reading_material_id, ra.assigned_date, 
              ra.due_by, ra.is_completed, u.first_name as student_first_name, 
              u.last_name as student_last_name, rm.title as material_title
       FROM reading_assignments ra
       JOIN users u ON ra.user_id = u.id
       JOIN reading_materials rm ON ra.reading_material_id = rm.id
       WHERE ra.assigned_by_id = $1
       ORDER BY ra.assigned_date DESC
       LIMIT 10`,
      [teacherId]
    );

    const teacher = result.rows[0];
    teacher.totalStudents = parseInt(studentsResult.rows[0].count);
    teacher.recentAssignments = assignmentsResult.rows;

    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/teachers/:id
 * @desc Update a teacher
 * @access Private (Teachers can only update themselves)
 */
router.put('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid teacher ID is required'),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('schoolId').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = parseInt(req.params.id);

  // Teachers can only update their own profile
  if (req.user.id !== teacherId) {
    return res.status(403).json({ message: 'Not authorized to update this teacher profile' });
  }

  const updates = req.body;

  // Convert camelCase to snake_case for database
  const dbUpdates = {};
  if (updates.firstName) dbUpdates.first_name = updates.firstName;
  if (updates.lastName) dbUpdates.last_name = updates.lastName;
  if (updates.email) dbUpdates.email = updates.email;
  if (updates.schoolId) dbUpdates.school_id = updates.schoolId;

  // Handle password separately
  if (updates.password) {
    const salt = await bcrypt.genSalt(10);
    dbUpdates.password_hash = await bcrypt.hash(updates.password, salt);
  }

  try {
    // Check if teacher exists
    const checkResult = await req.db.query(
      'SELECT id FROM teachers WHERE id = $1',
      [teacherId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if email is already taken (if updating email)
    if (updates.email) {
      const emailCheck = await req.db.query(
        'SELECT id FROM teachers WHERE email = $1 AND id != $2',
        [updates.email, teacherId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Build dynamic update query
    const keys = Object.keys(dbUpdates);
    if (keys.length === 0) {
      return res.status(400).json({ message: 'No update fields provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [teacherId, ...keys.map(key => dbUpdates[key])];

    const result = await req.db.query(
      `UPDATE teachers SET ${setClause} WHERE id = $1 RETURNING id`,
      values
    );

    res.json({ 
      id: result.rows[0].id,
      message: 'Teacher profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/teachers/:id/students
 * @desc Get all students for a teacher
 * @access Private (Teachers only)
 */
router.get('/:id/students', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid teacher ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = parseInt(req.params.id);

  // Teachers can only view their own students
  if (req.user.id !== teacherId && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Not authorized to view students for this teacher' });
  }

  try {
    const result = await req.db.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.grade_level, u.created_at,
              up.average_wcpm, up.average_accuracy, up.current_difficulty_level
       FROM users u
       LEFT JOIN user_progress up ON u.id = up.user_id
       WHERE u.teacher_id = $1
       ORDER BY u.last_name, u.first_name`,
      [teacherId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/teachers/:id/assignments
 * @desc Create reading assignments for one or more students
 * @access Private (Teachers only)
 */
router.post('/:id/assignments', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid teacher ID is required'),
  body('readingMaterialId').isInt().withMessage('Valid reading material ID is required'),
  body('studentIds').isArray().withMessage('Student IDs must be an array'),
  body('studentIds.*').isInt().withMessage('Each student ID must be an integer'),
  body('dueBy').isISO8601().withMessage('Due date must be a valid date'),
  body('notes').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = parseInt(req.params.id);

  // Teachers can only create assignments as themselves
  if (req.user.id !== teacherId) {
    return res.status(403).json({ message: 'Not authorized to create assignments as this teacher' });
  }

  const { readingMaterialId, studentIds, dueBy, notes = '' } = req.body;

  try {
    // Verify reading material exists
    const materialResult = await req.db.query(
      'SELECT id FROM reading_materials WHERE id = $1',
      [readingMaterialId]
    );

    if (materialResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    // Verify all students exist and belong to this teacher
    const studentsResult = await req.db.query(
      'SELECT id FROM users WHERE id = ANY($1) AND teacher_id = $2',
      [studentIds, teacherId]
    );

    if (studentsResult.rows.length !== studentIds.length) {
      return res.status(400).json({ 
        message: 'One or more students are invalid or do not belong to this teacher' 
      });
    }

    // Create assignments in a transaction
    await req.db.query('BEGIN');

    const insertedIds = [];
    for (const studentId of studentIds) {
      const result = await req.db.query(
        `INSERT INTO reading_assignments 
         (user_id, reading_material_id, assigned_by_id, assigned_date, due_by, notes) 
         VALUES ($1, $2, $3, NOW(), $4, $5) 
         RETURNING id`,
        [studentId, readingMaterialId, teacherId, dueBy, notes]
      );
      insertedIds.push(result.rows[0].id);
    }

    await req.db.query('COMMIT');

    res.status(201).json({ 
      assignmentIds: insertedIds,
      message: `Created ${insertedIds.length} assignments successfully` 
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    console.error('Error creating assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/teachers/:id/class-performance
 * @desc Get performance overview for a teacher's class
 * @access Private (Teachers only)
 */
router.get('/:id/class-performance', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid teacher ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = parseInt(req.params.id);

  // Teachers can only view their own class performance
  if (req.user.id !== teacherId && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Not authorized to view this class performance' });
  }

  try {
    // Get overall class statistics
    const overallResult = await req.db.query(
      `SELECT 
         COUNT(DISTINCT u.id) as total_students,
         COUNT(DISTINCT rs.id) as total_sessions,
         AVG(up.average_wcpm)::numeric as class_avg_wcpm,
         AVG(up.average_accuracy)::numeric as class_avg_accuracy,
         SUM(up.total_reading_time) as total_reading_time
       FROM users u
       LEFT JOIN user_progress up ON u.id = up.user_id
       LEFT JOIN reading_sessions rs ON u.id = rs.user_id AND rs.start_time > NOW() - INTERVAL '30 days'
       WHERE u.teacher_id = $1`,
      [teacherId]
    );

    // Get grade level distribution
    const gradeResult = await req.db.query(
      `SELECT u.grade_level, COUNT(*) as student_count
       FROM users u
       WHERE u.teacher_id = $1
       GROUP BY u.grade_level
       ORDER BY u.grade_level`,
      [teacherId]
    );

    // Get students who need attention (low performance or inactive)
    const attentionResult = await req.db.query(
      `SELECT u.id, u.first_name, u.last_name, u.grade_level,
              up.average_wcpm, up.average_accuracy, up.last_activity_date,
              CASE
                WHEN up.average_accuracy < 90 THEN 'Low accuracy'
                WHEN up.last_activity_date < NOW() - INTERVAL '7 days' THEN 'Inactive'
                WHEN up.average_wcpm < 60 THEN 'Low WCPM'
                ELSE NULL
              END as attention_reason
       FROM users u
       JOIN user_progress up ON u.id = up.user_id
       WHERE u.teacher_id = $1
       AND (
         up.average_accuracy < 90 OR
         up.last_activity_date < NOW() - INTERVAL '7 days' OR
         up.average_wcpm < 60
       )
       ORDER BY up.last_activity_date ASC`,
      [teacherId]
    );

    // Get recent reading sessions (last 30 days)
    const sessionsResult = await req.db.query(
      `SELECT date_trunc('day', rs.start_time) as day, COUNT(*) as session_count
       FROM reading_sessions rs
       JOIN users u ON rs.user_id = u.id
       WHERE u.teacher_id = $1
       AND rs.start_time > NOW() - INTERVAL '30 days'
       GROUP BY date_trunc('day', rs.start_time)
       ORDER BY day`,
      [teacherId]
    );

    // Format response
    const overall = overallResult.rows[0];
    
    res.json({
      overview: {
        totalStudents: parseInt(overall.total_students),
        totalSessions: parseInt(overall.total_sessions || 0),
        classAverageWCPM: parseFloat(overall.class_avg_wcpm || 0).toFixed(1),
        classAverageAccuracy: parseFloat(overall.class_avg_accuracy || 0).toFixed(1),
        totalReadingTimeMinutes: Math.round(parseInt(overall.total_reading_time || 0) / 60)
      },
      gradeDistribution: gradeResult.rows.map(grade => ({
        grade: grade.grade_level,
        count: parseInt(grade.student_count)
      })),
      needsAttention: attentionResult.rows,
      sessionActivity: sessionsResult.rows.map(day => ({
        date: day.day,
        count: parseInt(day.session_count)
      }))
    });
  } catch (error) {
    console.error('Error fetching class performance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/teachers
 * @desc Register a new teacher (alternative endpoint)
 * @access Public
 */
router.post('/', [
  body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('school_id').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, first_name, last_name, email, school_id } = req.body;

  try {
    // Check if username or email already exists
    const existingUser = await req.db.query(
      'SELECT username, email FROM teachers WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new teacher
    const result = await req.db.query(
      `INSERT INTO teachers (username, password_hash, first_name, last_name, email, school_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, first_name, last_name, email`,
      [username, hashedPassword, first_name, last_name, email, school_id || null]
    );

    const newTeacher = result.rows[0];

    res.status(201).json({ 
      id: newTeacher.id,
      username: newTeacher.username,
      first_name: newTeacher.first_name,
      last_name: newTeacher.last_name,
      email: newTeacher.email,
      message: 'Teacher created successfully' 
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 