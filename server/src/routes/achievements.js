const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { verifyToken, isTeacher } = require('../middleware/auth');

/**
 * @route GET /api/achievements
 * @desc Get all available achievements
 * @access Private
 */
router.get('/', [
  verifyToken
], async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM achievements ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/achievements
 * @desc Create a new achievement
 * @access Private (Teachers only)
 */
router.post('/', [
  verifyToken,
  isTeacher,
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('iconUrl').optional().isURL().withMessage('Icon URL must be a valid URL'),
  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('requirements').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, iconUrl = null, points, requirements = null } = req.body;

  try {
    const result = await req.db.query(
      `INSERT INTO achievements 
       (name, description, icon_url, points, requirements) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [name, description, iconUrl, points, requirements]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Achievement created successfully' 
    });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/achievements/award
 * @desc Award an achievement to a user
 * @access Private (Teachers only)
 */
router.post('/award', [
  verifyToken,
  isTeacher,
  body('userId').isInt().withMessage('Valid user ID is required'),
  body('achievementId').isInt().withMessage('Valid achievement ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, achievementId } = req.body;

  try {
    // Check if user and achievement exist
    const userCheck = await req.db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const achievementCheck = await req.db.query('SELECT id FROM achievements WHERE id = $1', [achievementId]);
    if (achievementCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if user already has this achievement
    const existingCheck = await req.db.query(
      'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievementId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already has this achievement' });
    }

    // Award achievement
    const result = await req.db.query(
      `INSERT INTO user_achievements 
       (user_id, achievement_id, date_earned, is_new) 
       VALUES ($1, $2, NOW(), true) 
       RETURNING id`,
      [userId, achievementId]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Achievement awarded successfully' 
    });
  } catch (error) {
    console.error('Error awarding achievement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 