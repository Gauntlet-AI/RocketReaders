const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

/**
 * @route POST /api/auth/teacher/login
 * @desc Authenticate teacher and get token
 * @access Public
 */
router.post('/teacher/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Check if teacher exists
    const result = await req.db.query(
      'SELECT id, username, password_hash, first_name, last_name FROM teachers WHERE username = $1',
      [username]
    );

    const teacher = result.rows[0];
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, teacher.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT token
    const payload = {
      id: teacher.id,
      username: teacher.username,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      role: 'teacher'
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error('Error in teacher login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/teacher/register
 * @desc Register a new teacher
 * @access Public
 */
router.post('/teacher/register', [
  body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('schoolId').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, firstName, lastName, email, schoolId } = req.body;

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
      [username, hashedPassword, firstName, lastName, email, schoolId || null]
    );

    const newTeacher = result.rows[0];

    // Create and return JWT token
    const payload = {
      id: newTeacher.id,
      username: newTeacher.username,
      firstName: newTeacher.first_name,
      lastName: newTeacher.last_name,
      role: 'teacher'
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, teacher: newTeacher });
      }
    );
  } catch (error) {
    console.error('Error in teacher registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/student/login
 * @desc Authenticate student user and get token
 * @access Public
 */
router.post('/student/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Check if student exists
    const result = await req.db.query(
      'SELECT id, username, password_hash, first_name, last_name FROM users WHERE username = $1',
      [username]
    );

    const student = result.rows[0];
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT token
    const payload = {
      id: student.id,
      username: student.username,
      firstName: student.first_name,
      lastName: student.last_name,
      role: 'student'
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error('Error in student login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/student/register
 * @desc Register a new student
 * @access Public
 */
router.post('/student/register', [
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

  const { username, password, firstName, lastName, gradeLevel, teacherId } = req.body;

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
      [username, hashedPassword, firstName, lastName, gradeLevel, teacherId || null]
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

    // Create and return JWT token
    const payload = {
      id: userId,
      username: username,
      firstName: firstName,
      lastName: lastName,
      role: 'student'
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ 
          token, 
          id: userId,
          message: 'Student registered successfully' 
        });
      }
    );
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 