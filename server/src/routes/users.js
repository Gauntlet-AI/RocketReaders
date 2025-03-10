const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher, isAuthorizedForUser } = require('../middleware/auth');
const bcrypt = require('bcrypt');

/**
 * @route GET /api/users
 * @desc Get all users (students) with optional filters
 * @access Private (Teachers only)
 */
router.get('/', [
  verifyToken,
  isTeacher,
  query('teacherId').optional().isInt().withMessage('Valid teacher ID is required'),
  query('gradeLevel').optional().isIn(['K', '1', '2', '3']).withMessage('Valid grade level is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('search').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = req.query.teacherId ? parseInt(req.query.teacherId) : null;
  const gradeLevel = req.query.gradeLevel;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const search = req.query.search;

  try {
    // Build dynamic query with filters
    let query = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.grade_level, 
             u.created_at, u.teacher_id, t.first_name as teacher_first_name, 
             t.last_name as teacher_last_name
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (teacherId) {
      query += ` AND u.teacher_id = $${paramCount}`;
      queryParams.push(teacherId);
      paramCount++;
    }

    if (gradeLevel) {
      query += ` AND u.grade_level = $${paramCount}`;
      queryParams.push(gradeLevel);
      paramCount++;
    }

    if (search) {
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.username ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Add pagination
    query += ` ORDER BY u.last_name, u.first_name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await req.db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users u WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (teacherId) {
      countQuery += ` AND u.teacher_id = $${countParamIndex}`;
      countParams.push(teacherId);
      countParamIndex++;
    }

    if (gradeLevel) {
      countQuery += ` AND u.grade_level = $${countParamIndex}`;
      countParams.push(gradeLevel);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex} OR u.username ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await req.db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/users/:id
 * @desc Get a user by ID
 * @access Private
 */
router.get('/:id', [
  verifyToken,
  isAuthorizedForUser,
  param('id').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);

  try {
    const result = await req.db.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.grade_level, 
              u.created_at, u.teacher_id, t.first_name as teacher_first_name, 
              t.last_name as teacher_last_name
       FROM users u
       LEFT JOIN teachers t ON u.teacher_id = t.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Get user's progress data
    const progressResult = await req.db.query(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [userId]
    );

    // Get user's achievements
    const achievementsResult = await req.db.query(
      `SELECT ua.id, ua.achievement_id, ua.date_earned, ua.is_new,
              a.name, a.description, a.icon_url, a.points
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.date_earned DESC`,
      [userId]
    );

    // Get user's pending assignments
    const assignmentsResult = await req.db.query(
      `SELECT ra.id, ra.reading_material_id, ra.assigned_date, ra.due_by, 
              ra.is_completed, ra.completed_at, ra.assigned_by_id, 
              rm.title as material_title, rm.difficulty_level,
              t.first_name as assigned_by_first_name, t.last_name as assigned_by_last_name
       FROM reading_assignments ra
       JOIN reading_materials rm ON ra.reading_material_id = rm.id
       LEFT JOIN teachers t ON ra.assigned_by_id = t.id
       WHERE ra.user_id = $1
       AND (ra.is_completed = false OR ra.completed_at > NOW() - INTERVAL '7 days')
       ORDER BY ra.due_by ASC, ra.assigned_date DESC`,
      [userId]
    );

    // Get recent sessions summary
    const sessionsResult = await req.db.query(
      `SELECT COUNT(*) as total_sessions, 
              AVG(words_per_minute)::numeric as avg_wpm,
              MAX(words_per_minute) as max_wpm,
              AVG(accuracy_percentage)::numeric as avg_accuracy,
              SUM(duration_seconds) as total_reading_time
       FROM reading_sessions 
       WHERE user_id = $1 
       AND start_time > NOW() - INTERVAL '30 days'`,
      [userId]
    );

    // Format response
    res.json({
      user,
      progress: progressResult.rows[0] || null,
      achievements: achievementsResult.rows,
      assignments: assignmentsResult.rows,
      recentActivity: {
        totalSessions: parseInt(sessionsResult.rows[0].total_sessions),
        averageWPM: parseFloat(sessionsResult.rows[0].avg_wpm || 0).toFixed(1),
        maxWPM: parseInt(sessionsResult.rows[0].max_wpm || 0),
        averageAccuracy: parseFloat(sessionsResult.rows[0].avg_accuracy || 0).toFixed(1),
        totalReadingTimeMinutes: Math.round((parseInt(sessionsResult.rows[0].total_reading_time || 0)) / 60)
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/users/register
 * @desc Create a new user (student) without authentication
 * @access Public
 */
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 4 }),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('grade').isIn(['K', '1', '2', '3']).withMessage('Valid grade level is required'),
  body('teacher_id').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, first_name, last_name, grade, teacher_id } = req.body;

  try {
    // Check if username already exists
    const existingUser = await req.db.query(
      'SELECT username FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await req.db.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, grade_level, teacher_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [username, hashedPassword, first_name, last_name, grade, teacher_id]
    );

    const userId = result.rows[0].id;

    // Initialize user progress
    await req.db.query(
      `INSERT INTO user_progress 
       (user_id, total_reading_time, current_difficulty_level, average_wcpm, average_accuracy, streaks, last_activity_date) 
       VALUES ($1, 0, 'A', 0, 0, 0, NOW())`,
      [userId]
    );

    // Initialize default daily goal
    await req.db.query(
      `INSERT INTO daily_goals 
       (user_id, reading_minutes, reading_sessions, target_wcpm, date) 
       VALUES ($1, 15, 3, 60, CURRENT_DATE)`,
      [userId]
    );

    res.status(201).json({ 
      id: userId,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/users
 * @desc Create a new user (student)
 * @access Private (Teachers only)
 */
router.post('/', [
  verifyToken,
  isTeacher,
  body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 4 }),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('gradeLevel').isIn(['K', '1', '2', '3']).withMessage('Valid grade level is required'),
  body('teacherId').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, firstName, lastName, gradeLevel, teacherId = req.user.id } = req.body;

  try {
    // Check if username already exists
    const existingUser = await req.db.query(
      'SELECT username FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await req.db.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, grade_level, teacher_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [username, hashedPassword, firstName, lastName, gradeLevel, teacherId]
    );

    const userId = result.rows[0].id;

    // Initialize user progress
    await req.db.query(
      `INSERT INTO user_progress 
       (user_id, total_reading_time, current_difficulty_level, average_wcpm, average_accuracy, streaks, last_activity_date) 
       VALUES ($1, 0, 'A', 0, 0, 0, NOW())`,
      [userId]
    );

    // Initialize default daily goal
    await req.db.query(
      `INSERT INTO daily_goals 
       (user_id, reading_minutes, reading_sessions, target_wcpm, date) 
       VALUES ($1, 15, 3, 60, CURRENT_DATE)`,
      [userId]
    );

    res.status(201).json({ 
      id: userId,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/users/:id
 * @desc Update a user
 * @access Private (Teachers for any user, students only themselves)
 */
router.put('/:id', [
  verifyToken,
  isAuthorizedForUser,
  param('id').isInt().withMessage('Valid user ID is required'),
  body('username').optional().isLength({ min: 3 }),
  body('password').optional().isLength({ min: 4 }),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('gradeLevel').optional().isIn(['K', '1', '2', '3']),
  body('teacherId').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);
  const updates = req.body;

  // Students can only update certain fields
  if (req.user.role === 'student') {
    const allowedUpdates = ['password'];
    Object.keys(updates).forEach(key => {
      if (!allowedUpdates.includes(key)) {
        delete updates[key];
      }
    });
  }

  // Convert camelCase to snake_case for database
  const dbUpdates = {};
  if (updates.username) dbUpdates.username = updates.username;
  if (updates.firstName) dbUpdates.first_name = updates.firstName;
  if (updates.lastName) dbUpdates.last_name = updates.lastName;
  if (updates.gradeLevel) dbUpdates.grade_level = updates.gradeLevel;
  if (updates.teacherId) dbUpdates.teacher_id = updates.teacherId;

  // Handle password separately
  if (updates.password) {
    const salt = await bcrypt.genSalt(10);
    dbUpdates.password_hash = await bcrypt.hash(updates.password, salt);
  }

  try {
    // Check if user exists
    const checkResult = await req.db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is already taken (if updating username)
    if (updates.username) {
      const usernameCheck = await req.db.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [updates.username, userId]
      );

      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Build dynamic update query
    const keys = Object.keys(dbUpdates);
    if (keys.length === 0) {
      return res.status(400).json({ message: 'No update fields provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [userId, ...keys.map(key => dbUpdates[key])];

    const result = await req.db.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id`,
      values
    );

    res.json({ 
      id: result.rows[0].id,
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/users/:id
 * @desc Delete a user
 * @access Private (Teachers only)
 */
router.delete('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);

  try {
    // Check if user exists
    const checkResult = await req.db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user - the database cascade will handle related records
    await req.db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/users/:id/achievements
 * @desc Get all achievements for a user
 * @access Private
 */
router.get('/:id/achievements', [
  verifyToken,
  isAuthorizedForUser,
  param('id').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);

  try {
    // Get earned achievements
    const earnedResult = await req.db.query(
      `SELECT ua.id, ua.achievement_id, ua.date_earned, ua.is_new,
              a.name, a.description, a.icon_url, a.points, a.requirements
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.date_earned DESC`,
      [userId]
    );

    // Get all available achievements
    const allResult = await req.db.query(
      `SELECT a.id, a.name, a.description, a.icon_url, a.points, a.requirements,
              CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
       ORDER BY a.id ASC`,
      [userId]
    );

    // Get unread achievements and mark them as read
    const unreadResult = await req.db.query(
      `SELECT ua.id, ua.achievement_id, ua.date_earned,
              a.name, a.description, a.icon_url, a.points
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1 AND ua.is_new = true
       ORDER BY ua.date_earned DESC`,
      [userId]
    );

    if (unreadResult.rows.length > 0) {
      await req.db.query(
        'UPDATE user_achievements SET is_new = false WHERE user_id = $1 AND is_new = true',
        [userId]
      );
    }

    res.json({
      earned: earnedResult.rows,
      all: allResult.rows,
      unread: unreadResult.rows
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/users/:id/assignments
 * @desc Get all reading assignments for a user
 * @access Private
 */
router.get('/:id/assignments', [
  verifyToken,
  isAuthorizedForUser,
  param('id').isInt().withMessage('Valid user ID is required'),
  query('status').optional().isIn(['pending', 'completed', 'all']).withMessage('Valid status is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);
  const status = req.query.status || 'all';

  try {
    let statusFilter = '';
    if (status === 'pending') {
      statusFilter = 'AND ra.is_completed = false';
    } else if (status === 'completed') {
      statusFilter = 'AND ra.is_completed = true';
    }

    const result = await req.db.query(
      `SELECT ra.id, ra.reading_material_id, ra.assigned_date, ra.due_by, 
              ra.is_completed, ra.completed_at, ra.assigned_by_id, ra.notes,
              rm.title as material_title, rm.difficulty_level, rm.grade_level,
              rm.word_count, rm.author,
              t.first_name as assigned_by_first_name, t.last_name as assigned_by_last_name
       FROM reading_assignments ra
       JOIN reading_materials rm ON ra.reading_material_id = rm.id
       LEFT JOIN teachers t ON ra.assigned_by_id = t.id
       WHERE ra.user_id = $1 ${statusFilter}
       ORDER BY ra.due_by ASC, ra.assigned_date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/users/:id/progress
 * @desc Get detailed progress data for a user
 * @access Private
 */
router.get('/:id/progress', [
  verifyToken,
  isAuthorizedForUser,
  param('id').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);

  try {
    // Get user's progress record
    const progressResult = await req.db.query(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [userId]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ message: 'User progress not found' });
    }

    const progress = progressResult.rows[0];

    // Get session history by month
    const sessionHistoryResult = await req.db.query(
      `SELECT 
        date_trunc('month', start_time) as month,
        COUNT(*) as total_sessions,
        AVG(words_per_minute)::numeric as avg_wpm,
        MAX(words_per_minute) as max_wpm,
        AVG(accuracy_percentage)::numeric as avg_accuracy,
        SUM(duration_seconds) as total_reading_time
      FROM reading_sessions 
      WHERE user_id = $1 
      GROUP BY date_trunc('month', start_time)
      ORDER BY month DESC
      LIMIT 6`,
      [userId]
    );

    // Get daily goal compliance
    const goalComplianceResult = await req.db.query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_days
      FROM daily_goals
      WHERE user_id = $1
      AND date > NOW() - INTERVAL '30 days'`,
      [userId]
    );

    // Get improvement over time
    const improvementResult = await req.db.query(
      `SELECT 
        date_trunc('week', start_time) as week,
        AVG(words_per_minute)::numeric as avg_wpm
      FROM reading_sessions 
      WHERE user_id = $1 
      AND start_time > NOW() - INTERVAL '3 months'
      GROUP BY date_trunc('week', start_time)
      ORDER BY week ASC`,
      [userId]
    );

    // Format response
    const goalCompliance = goalComplianceResult.rows[0];
    const complianceRate = goalCompliance.total_days > 0 
      ? (goalCompliance.completed_days / goalCompliance.total_days) * 100 
      : 0;

    res.json({
      currentProgress: {
        currentDifficultyLevel: progress.current_difficulty_level,
        averageWCPM: progress.average_wcpm,
        averageAccuracy: progress.average_accuracy,
        totalReadingTimeMinutes: Math.round(progress.total_reading_time / 60),
        streaks: progress.streaks,
        lastActivityDate: progress.last_activity_date
      },
      monthlyHistory: sessionHistoryResult.rows.map(month => ({
        month: month.month,
        totalSessions: parseInt(month.total_sessions),
        averageWPM: parseFloat(month.avg_wpm).toFixed(1),
        maxWPM: parseInt(month.max_wpm),
        averageAccuracy: parseFloat(month.avg_accuracy).toFixed(1),
        totalReadingTimeMinutes: Math.round(parseInt(month.total_reading_time) / 60)
      })),
      goalCompliance: {
        totalDays: parseInt(goalCompliance.total_days),
        completedDays: parseInt(goalCompliance.completed_days),
        complianceRate: complianceRate.toFixed(1)
      },
      weeklyImprovement: improvementResult.rows.map(week => ({
        week: week.week,
        averageWPM: parseFloat(week.avg_wpm).toFixed(1)
      }))
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 