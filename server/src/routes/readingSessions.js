const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher, isAuthorizedForUser } = require('../middleware/auth');
const { calculateWCPM, calculateImprovementPercentage } = require('../utils/helpers');

/**
 * @route POST /api/reading-sessions
 * @desc Create a new reading session
 * @access Private
 */
router.post('/', [
  verifyToken,
  body('userId').isInt().withMessage('Valid user ID is required'),
  body('readingMaterialId').isInt().withMessage('Valid reading material ID is required'),
  body('totalWords').isInt({ min: 1 }).withMessage('Total words must be at least 1'),
  body('correctWords').isInt({ min: 0 }).withMessage('Correct words must be a non-negative number'),
  body('totalErrors').isInt({ min: 0 }).withMessage('Total errors must be a non-negative number'),
  body('startTime').optional().isISO8601().withMessage('Start time must be a valid date'),
  body('endTime').optional().isISO8601().withMessage('End time must be a valid date'),
  body('durationSeconds').isInt({ min: 1 }).withMessage('Duration must be at least 1 second')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Verify user is authorized to create session for this userId
  if (req.user.role === 'student' && req.user.id !== req.body.userId) {
    return res.status(403).json({ message: 'Not authorized to create sessions for other users' });
  }

  const {
    userId,
    readingMaterialId,
    totalWords,
    correctWords,
    totalErrors,
    startTime = new Date(),
    endTime = new Date(),
    durationSeconds,
    notes = ''
  } = req.body;

  try {
    // Calculate WCPM
    const wordsPerMinute = calculateWCPM(totalWords, totalErrors, durationSeconds);
    const accuracy = Math.round((correctWords / totalWords) * 100);

    // Get previous session for this user and reading material to calculate improvement
    const previousSessionResult = await req.db.query(
      `SELECT words_per_minute FROM reading_sessions 
       WHERE user_id = $1 AND reading_material_id = $2 
       ORDER BY start_time DESC LIMIT 1`,
      [userId, readingMaterialId]
    );

    let improvementPercent = 0;
    if (previousSessionResult.rows.length > 0) {
      const previousWPM = previousSessionResult.rows[0].words_per_minute;
      improvementPercent = calculateImprovementPercentage(previousWPM, wordsPerMinute);
    }

    // Insert new reading session
    const result = await req.db.query(
      `INSERT INTO reading_sessions 
       (user_id, reading_material_id, total_words, correct_words, total_errors, 
        words_per_minute, accuracy_percentage, improvement_percentage, 
        start_time, end_time, duration_seconds, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING id`,
      [
        userId,
        readingMaterialId,
        totalWords,
        correctWords,
        totalErrors,
        wordsPerMinute,
        accuracy,
        improvementPercent,
        startTime,
        endTime,
        durationSeconds,
        notes
      ]
    );

    const sessionId = result.rows[0].id;

    // Check if this session completes an assignment
    if (sessionId) {
      await req.db.query(
        `UPDATE reading_assignments
         SET is_completed = true, completed_at = NOW()
         WHERE user_id = $1 AND reading_material_id = $2 AND is_completed = false`,
        [userId, readingMaterialId]
      );
    }

    res.status(201).json({ 
      id: sessionId,
      wordsPerMinute,
      accuracy,
      improvementPercent,
      message: 'Reading session created successfully' 
    });
  } catch (error) {
    console.error('Error creating reading session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-sessions/user/:userId
 * @desc Get all reading sessions for a specific user
 * @access Private
 */
router.get('/user/:userId', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('materialId').optional().isInt().withMessage('Valid material ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const materialId = req.query.materialId ? parseInt(req.query.materialId) : null;

  try {
    let query = `
      SELECT rs.*, rm.title as reading_material_title, rm.grade_level, rm.difficulty_level
      FROM reading_sessions rs
      JOIN reading_materials rm ON rs.reading_material_id = rm.id
      WHERE rs.user_id = $1
    `;
    const queryParams = [userId];

    // Add material filter if provided
    if (materialId) {
      query += ' AND rs.reading_material_id = $2';
      queryParams.push(materialId);
    }

    query += ' ORDER BY rs.start_time DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);

    const result = await req.db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM reading_sessions WHERE user_id = $1';
    const countParams = [userId];
    
    if (materialId) {
      countQuery += ' AND reading_material_id = $2';
      countParams.push(materialId);
    }
    
    const countResult = await req.db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      sessions: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reading sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-sessions/:id
 * @desc Get a specific reading session by ID
 * @access Private
 */
router.get('/:id', [
  verifyToken,
  param('id').isInt().withMessage('Valid session ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sessionId = parseInt(req.params.id);

  try {
    const result = await req.db.query(
      `SELECT rs.*, rm.title as reading_material_title, rm.grade_level, rm.difficulty_level,
        u.first_name, u.last_name, u.grade_level as user_grade
       FROM reading_sessions rs
       JOIN reading_materials rm ON rs.reading_material_id = rm.id
       JOIN users u ON rs.user_id = u.id
       WHERE rs.id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reading session not found' });
    }

    const session = result.rows[0];

    // Check authorization - teachers can view any session, students only their own
    if (req.user.role === 'student' && req.user.id !== session.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this session' });
    }

    // Get errors for this session
    const errorsResult = await req.db.query(
      'SELECT * FROM reading_errors WHERE session_id = $1',
      [sessionId]
    );

    session.errors = errorsResult.rows;

    res.json(session);
  } catch (error) {
    console.error('Error fetching reading session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/reading-sessions/:id/errors
 * @desc Add reading errors for a specific session
 * @access Private
 */
router.post('/:id/errors', [
  verifyToken,
  param('id').isInt().withMessage('Valid session ID is required'),
  body('errors').isArray().withMessage('Errors must be an array'),
  body('errors.*.errorType').isIn(['pronunciation', 'substitution', 'omission', 'insertion', 'repetition', 'self-correction', 'hesitation', 'other'])
    .withMessage('Valid error type is required'),
  body('errors.*.wordPosition').optional().isInt().withMessage('Word position must be a number'),
  body('errors.*.errorWord').optional().isString().withMessage('Error word must be a string'),
  body('errors.*.correctWord').optional().isString().withMessage('Correct word must be a string'),
  body('errors.*.notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sessionId = parseInt(req.params.id);
  const { errors: readingErrors } = req.body;

  try {
    // Verify session exists and user is authorized
    const sessionResult = await req.db.query(
      'SELECT user_id FROM reading_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reading session not found' });
    }

    const userId = sessionResult.rows[0].user_id;

    // Check authorization
    if (req.user.role === 'student' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Not authorized to add errors to this session' });
    }

    // Insert errors in a transaction
    await req.db.query('BEGIN');

    const insertedErrors = [];
    for (const error of readingErrors) {
      const result = await req.db.query(
        `INSERT INTO reading_errors 
         (session_id, error_type, word_position, error_word, correct_word, notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        [
          sessionId,
          error.errorType,
          error.wordPosition || null,
          error.errorWord || null,
          error.correctWord || null,
          error.notes || null
        ]
      );
      insertedErrors.push({ id: result.rows[0].id, ...error });
    }

    await req.db.query('COMMIT');

    res.status(201).json({ 
      message: 'Reading errors added successfully',
      errors: insertedErrors
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    console.error('Error adding reading errors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-sessions/analyze/:userId
 * @desc Get reading performance analysis for a user
 * @access Private
 */
router.get('/analyze/:userId', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required'),
  query('period').optional().isIn(['week', 'month', 'year', 'all']).withMessage('Valid period is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const period = req.query.period || 'month';

  try {
    let timeFilter = '';
    let params = [userId];

    if (period === 'week') {
      timeFilter = 'AND start_time >= NOW() - INTERVAL \'7 days\'';
    } else if (period === 'month') {
      timeFilter = 'AND start_time >= NOW() - INTERVAL \'30 days\'';
    } else if (period === 'year') {
      timeFilter = 'AND start_time >= NOW() - INTERVAL \'365 days\'';
    }

    // Get all sessions in time period
    const sessionsResult = await req.db.query(
      `SELECT id, reading_material_id, words_per_minute, accuracy_percentage, 
              improvement_percentage, start_time, duration_seconds
       FROM reading_sessions 
       WHERE user_id = $1 ${timeFilter}
       ORDER BY start_time ASC`,
      params
    );

    // Get average WCPM and accuracy
    const statsResult = await req.db.query(
      `SELECT AVG(words_per_minute)::numeric as avg_wpm, 
              AVG(accuracy_percentage)::numeric as avg_accuracy,
              AVG(improvement_percentage)::numeric as avg_improvement,
              MAX(words_per_minute) as max_wpm,
              COUNT(DISTINCT reading_material_id) as unique_materials,
              COUNT(*) as total_sessions,
              SUM(duration_seconds) as total_reading_time
       FROM reading_sessions 
       WHERE user_id = $1 ${timeFilter}`,
      params
    );

    // Get error patterns
    const errorsResult = await req.db.query(
      `SELECT re.error_type, COUNT(*) as count 
       FROM reading_errors re 
       JOIN reading_sessions rs ON re.session_id = rs.id 
       WHERE rs.user_id = $1 ${timeFilter}
       GROUP BY re.error_type 
       ORDER BY count DESC`,
      params
    );

    // Calculate progress over time
    const timelineData = sessionsResult.rows.map(session => ({
      date: session.start_time,
      wpm: session.words_per_minute,
      accuracy: session.accuracy_percentage,
      improvement: session.improvement_percentage
    }));

    // Format stats data
    const stats = statsResult.rows[0];
    
    res.json({
      summary: {
        averageWPM: parseFloat(stats.avg_wpm).toFixed(1),
        averageAccuracy: parseFloat(stats.avg_accuracy).toFixed(1),
        averageImprovement: parseFloat(stats.avg_improvement).toFixed(1),
        maxWPM: stats.max_wpm,
        uniqueMaterials: stats.unique_materials,
        totalSessions: stats.total_sessions,
        totalReadingTimeMinutes: Math.round(stats.total_reading_time / 60)
      },
      errorPatterns: errorsResult.rows,
      timeline: timelineData
    });
  } catch (error) {
    console.error('Error analyzing reading sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 