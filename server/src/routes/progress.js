const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const { verifyToken, isAuthorizedForUser } = require('../middleware/auth');

/**
 * @route GET /api/progress/:userId
 * @desc Get a user's progress data
 * @access Private
 */
router.get('/:userId', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);

  try {
    const result = await req.db.query(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User progress not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/progress/:userId/history
 * @desc Get a user's progress history
 * @access Private
 */
router.get('/:userId/history', [
  verifyToken,
  isAuthorizedForUser,
  param('userId').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);

  try {
    // Get reading sessions history
    const sessionsResult = await req.db.query(
      `SELECT rs.id, rs.words_per_minute, rs.accuracy_percentage, 
              rs.improvement_percentage, rs.start_time, rs.duration_seconds,
              rm.title as material_title, rm.difficulty_level
       FROM reading_sessions rs
       JOIN reading_materials rm ON rs.reading_material_id = rm.id
       WHERE rs.user_id = $1
       ORDER BY rs.start_time DESC
       LIMIT 30`,
      [userId]
    );

    // Get daily goals history
    const goalsResult = await req.db.query(
      `SELECT * FROM daily_goals
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [userId]
    );

    // Get difficulty level progression
    const difficultyResult = await req.db.query(
      `SELECT DISTINCT ON (date_trunc('day', start_time))
              date_trunc('day', start_time) as date,
              MAX(rm.difficulty_level) as difficulty_level
       FROM reading_sessions rs
       JOIN reading_materials rm ON rs.reading_material_id = rm.id
       WHERE rs.user_id = $1
       GROUP BY date_trunc('day', start_time)
       ORDER BY date_trunc('day', start_time) DESC
       LIMIT 30`,
      [userId]
    );

    res.json({
      sessions: sessionsResult.rows,
      goals: goalsResult.rows,
      difficultyProgression: difficultyResult.rows
    });
  } catch (error) {
    console.error('Error fetching user progress history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 