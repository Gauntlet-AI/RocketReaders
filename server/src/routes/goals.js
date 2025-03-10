const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher, isAuthorizedForUser } = require('../middleware/auth');

/**
 * @route GET /api/goals/:userId
 * @desc Get a user's daily goals
 * @access Private
 */
router.get('/:userId', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required'),
  query('date').optional().isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const date = req.query.date || new Date().toISOString().split('T')[0]; // Default to today

  try {
    const result = await req.db.query(
      'SELECT * FROM daily_goals WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (result.rows.length === 0) {
      // If no goal exists for the date, get the most recent goal
      const latestResult = await req.db.query(
        'SELECT * FROM daily_goals WHERE user_id = $1 ORDER BY date DESC LIMIT 1',
        [userId]
      );

      if (latestResult.rows.length === 0) {
        return res.status(404).json({ message: 'No goals found for user' });
      }

      // Return the latest goal but indicate it's not for the requested date
      return res.json({
        ...latestResult.rows[0],
        isExact: false,
        message: 'No goal found for requested date, returning latest goal'
      });
    }

    res.json({
      ...result.rows[0],
      isExact: true
    });
  } catch (error) {
    console.error('Error fetching user goal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/goals/:userId
 * @desc Create or update a daily goal for a user
 * @access Private (Teachers only, or students for themselves)
 */
router.post('/:userId', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('readingMinutes').isInt({ min: 1 }).withMessage('Reading minutes must be a positive integer'),
  body('readingSessions').isInt({ min: 1 }).withMessage('Reading sessions must be a positive integer'),
  body('targetWcpm').isInt({ min: 1 }).withMessage('Target WCPM must be a positive integer')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const { date, readingMinutes, readingSessions, targetWcpm } = req.body;

  try {
    // Check if goal already exists for this date
    const existingResult = await req.db.query(
      'SELECT id FROM daily_goals WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing goal
      result = await req.db.query(
        `UPDATE daily_goals 
         SET reading_minutes = $1, reading_sessions = $2, target_wcpm = $3
         WHERE user_id = $4 AND date = $5
         RETURNING id`,
        [readingMinutes, readingSessions, targetWcpm, userId, date]
      );

      res.json({ 
        id: result.rows[0].id,
        message: 'Goal updated successfully' 
      });
    } else {
      // Create new goal
      result = await req.db.query(
        `INSERT INTO daily_goals 
         (user_id, date, reading_minutes, reading_sessions, target_wcpm, is_completed) 
         VALUES ($1, $2, $3, $4, $5, false) 
         RETURNING id`,
        [userId, date, readingMinutes, readingSessions, targetWcpm]
      );

      res.status(201).json({ 
        id: result.rows[0].id,
        message: 'Goal created successfully' 
      });
    }
  } catch (error) {
    console.error('Error creating/updating goal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/goals/:userId/check
 * @desc Check if a user's daily goal is completed
 * @access Private
 */
router.get('/:userId/check', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required'),
  query('date').optional().isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const date = req.query.date || new Date().toISOString().split('T')[0]; // Default to today

  try {
    // Get the goal for the date
    const goalResult = await req.db.query(
      'SELECT * FROM daily_goals WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ message: 'No goal found for the specified date' });
    }

    const goal = goalResult.rows[0];

    // Get reading sessions for the date
    const sessionsResult = await req.db.query(
      `SELECT COUNT(*) as session_count, 
              SUM(duration_seconds) as total_seconds,
              MAX(words_per_minute) as max_wcpm
       FROM reading_sessions
       WHERE user_id = $1 
       AND date_trunc('day', start_time) = date_trunc('day', $2::timestamp)`,
      [userId, date]
    );

    const sessions = sessionsResult.rows[0];
    const sessionCount = parseInt(sessions.session_count);
    const readingMinutes = Math.round(parseInt(sessions.total_seconds || 0) / 60);
    const maxWcpm = parseInt(sessions.max_wcpm || 0);

    // Check if goal is completed
    const isCompleted = 
      sessionCount >= goal.reading_sessions &&
      readingMinutes >= goal.reading_minutes &&
      maxWcpm >= goal.target_wcpm;

    // Update goal completion status if needed
    if (isCompleted && !goal.is_completed) {
      await req.db.query(
        'UPDATE daily_goals SET is_completed = true WHERE id = $1',
        [goal.id]
      );
    }

    res.json({
      goal,
      progress: {
        sessionCount,
        readingMinutes,
        maxWcpm
      },
      isCompleted,
      requirementsMet: {
        sessions: sessionCount >= goal.reading_sessions,
        minutes: readingMinutes >= goal.reading_minutes,
        wcpm: maxWcpm >= goal.target_wcpm
      }
    });
  } catch (error) {
    console.error('Error checking goal completion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 