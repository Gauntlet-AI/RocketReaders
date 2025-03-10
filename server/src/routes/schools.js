const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher } = require('../middleware/auth');

/**
 * @route GET /api/schools
 * @desc Get all schools
 * @access Private (Teachers only)
 */
router.get('/', [
  verifyToken,
  isTeacher
], async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM schools ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/schools/:id
 * @desc Get a school by ID
 * @access Private (Teachers only)
 */
router.get('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid school ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const schoolId = parseInt(req.params.id);

  try {
    const result = await req.db.query('SELECT * FROM schools WHERE id = $1', [schoolId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/schools
 * @desc Create a new school
 * @access Private (Teachers only)
 */
router.post('/', [
  verifyToken,
  isTeacher,
  body('name').notEmpty().withMessage('Name is required'),
  body('address').optional().isString(),
  body('district').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, address = null, district = null } = req.body;

  try {
    const result = await req.db.query(
      'INSERT INTO schools (name, address, district) VALUES ($1, $2, $3) RETURNING id',
      [name, address, district]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'School created successfully' 
    });
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 