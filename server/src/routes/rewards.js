const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { verifyToken, isTeacher } = require('../middleware/auth');

/**
 * @route GET /api/rewards
 * @desc Get all available rewards
 * @access Private
 */
router.get('/', [
  verifyToken
], async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM rewards ORDER BY points_cost');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/rewards
 * @desc Create a new reward
 * @access Private (Teachers only)
 */
router.post('/', [
  verifyToken,
  isTeacher,
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be a valid URL'),
  body('pointsCost').isInt({ min: 1 }).withMessage('Points cost must be a positive integer'),
  body('rewardType').isIn(['virtual', 'physical', 'privilege']).withMessage('Valid reward type is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, imageUrl = null, pointsCost, rewardType } = req.body;

  try {
    const result = await req.db.query(
      `INSERT INTO rewards 
       (name, description, image_url, points_cost, reward_type) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [name, description, imageUrl, pointsCost, rewardType]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Reward created successfully' 
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/rewards/redeem
 * @desc Redeem a reward for a user
 * @access Private
 */
router.post('/redeem', [
  verifyToken,
  body('userId').isInt().withMessage('Valid user ID is required'),
  body('rewardId').isInt().withMessage('Valid reward ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, rewardId } = req.body;

  // Students can only redeem rewards for themselves
  if (req.user.role === 'student' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Not authorized to redeem rewards for other users' });
  }

  try {
    // Start transaction
    await req.db.query('BEGIN');

    // Check if user exists
    const userCheck = await req.db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if reward exists and get its cost
    const rewardCheck = await req.db.query(
      'SELECT id, points_cost FROM rewards WHERE id = $1',
      [rewardId]
    );

    if (rewardCheck.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({ message: 'Reward not found' });
    }

    const pointsCost = rewardCheck.rows[0].points_cost;

    // Calculate user's available points
    const achievementsResult = await req.db.query(
      `SELECT SUM(a.points) as total_points
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1`,
      [userId]
    );

    const totalPoints = parseInt(achievementsResult.rows[0].total_points || 0);

    // Calculate already spent points
    const spentPointsResult = await req.db.query(
      `SELECT SUM(r.points_cost) as spent_points
       FROM user_rewards ur
       JOIN rewards r ON ur.reward_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    const spentPoints = parseInt(spentPointsResult.rows[0].spent_points || 0);
    const availablePoints = totalPoints - spentPoints;

    // Check if user has enough points
    if (availablePoints < pointsCost) {
      await req.db.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Insufficient points',
        available: availablePoints,
        required: pointsCost
      });
    }

    // Redeem reward
    const result = await req.db.query(
      `INSERT INTO user_rewards 
       (user_id, reward_id, redeemed_date, is_fulfilled) 
       VALUES ($1, $2, NOW(), false) 
       RETURNING id`,
      [userId, rewardId]
    );

    await req.db.query('COMMIT');

    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Reward redeemed successfully',
      remainingPoints: availablePoints - pointsCost
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    console.error('Error redeeming reward:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 