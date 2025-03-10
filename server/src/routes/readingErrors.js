const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const { verifyToken, isAuthorizedForUser } = require('../middleware/auth');

/**
 * @route GET /api/reading-errors/session/:sessionId
 * @desc Get all reading errors for a specific session
 * @access Private
 */
router.get('/session/:sessionId', [
  verifyToken,
  param('sessionId').isInt().withMessage('Valid session ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sessionId = parseInt(req.params.sessionId);

  try {
    // First check if the session exists and get the user ID
    const sessionResult = await req.db.query(
      'SELECT user_id FROM reading_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reading session not found' });
    }

    const userId = sessionResult.rows[0].user_id;

    // Check authorization - teachers can view any session for their students, students only their own
    if (req.user.role === 'student' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Not authorized to view errors for this session' });
    } else if (req.user.role === 'teacher') {
      // Check if student belongs to this teacher
      const studentCheck = await req.db.query(
        'SELECT id FROM users WHERE id = $1 AND teacher_id = $2',
        [userId, req.user.id]
      );
      
      if (studentCheck.rows.length === 0 && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized to view errors for this student' });
      }
    }

    // Get the errors
    const result = await req.db.query(
      'SELECT * FROM reading_errors WHERE session_id = $1 ORDER BY word_position',
      [sessionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reading errors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-errors/analysis/:userId
 * @desc Get error pattern analysis for a user
 * @access Private
 */
router.get('/analysis/:userId', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required'),
  query('period').optional().isIn(['week', 'month', 'all']).withMessage('Valid period is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const period = req.query.period || 'month';

  try {
    let timeFilter = '';
    
    if (period === 'week') {
      timeFilter = 'AND rs.start_time >= NOW() - INTERVAL \'7 days\'';
    } else if (period === 'month') {
      timeFilter = 'AND rs.start_time >= NOW() - INTERVAL \'30 days\'';
    }

    // Get error types distribution
    const errorsResult = await req.db.query(
      `SELECT re.error_type, COUNT(*) as count
       FROM reading_errors re
       JOIN reading_sessions rs ON re.session_id = rs.id
       WHERE rs.user_id = $1 ${timeFilter}
       GROUP BY re.error_type
       ORDER BY count DESC`,
      [userId]
    );

    // Get most common error words
    const errorWordsResult = await req.db.query(
      `SELECT re.error_word, COUNT(*) as count
       FROM reading_errors re
       JOIN reading_sessions rs ON re.session_id = rs.id
       WHERE rs.user_id = $1 ${timeFilter} AND re.error_word IS NOT NULL
       GROUP BY re.error_word
       ORDER BY count DESC
       LIMIT 10`,
      [userId]
    );

    // Get error progression over time
    const progressionResult = await req.db.query(
      `SELECT date_trunc('day', rs.start_time) as date, COUNT(*) as total_errors
       FROM reading_errors re
       JOIN reading_sessions rs ON re.session_id = rs.id
       WHERE rs.user_id = $1 ${timeFilter}
       GROUP BY date_trunc('day', rs.start_time)
       ORDER BY date ASC`,
      [userId]
    );

    // Get error rate (errors per 100 words) over time
    const errorRateResult = await req.db.query(
      `SELECT date_trunc('day', rs.start_time) as date, 
              COUNT(re.id) as total_errors,
              SUM(rs.total_words) as total_words,
              (COUNT(re.id)::float / NULLIF(SUM(rs.total_words), 0) * 100) as error_rate
       FROM reading_sessions rs
       LEFT JOIN reading_errors re ON rs.id = re.session_id
       WHERE rs.user_id = $1 ${timeFilter}
       GROUP BY date_trunc('day', rs.start_time)
       ORDER BY date ASC`,
      [userId]
    );

    res.json({
      errorTypes: errorsResult.rows,
      commonErrorWords: errorWordsResult.rows,
      errorProgression: progressionResult.rows,
      errorRates: errorRateResult.rows.map(rate => ({
        date: rate.date,
        totalErrors: parseInt(rate.total_errors),
        totalWords: parseInt(rate.total_words),
        errorRate: parseFloat(rate.error_rate || 0).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Error analyzing reading errors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 