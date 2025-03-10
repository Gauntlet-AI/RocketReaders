const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher } = require('../middleware/auth');

/**
 * @route GET /api/reading-materials
 * @desc Get all reading materials with filters
 * @access Private
 */
router.get('/', [
  verifyToken,
  query('gradeLevel').optional().isIn(['K', '1', '2', '3']).withMessage('Valid grade level is required'),
  query('difficulty').optional().isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']).withMessage('Valid difficulty level is required'),
  query('categoryId').optional().isInt().withMessage('Valid category ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('search').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const gradeLevel = req.query.gradeLevel;
  const difficulty = req.query.difficulty;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const search = req.query.search;

  try {
    // Build dynamic query with filters
    let query = `
      SELECT rm.*, rmc.name as category_name
      FROM reading_materials rm
      LEFT JOIN reading_material_categories rmc ON rm.category_id = rmc.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (gradeLevel) {
      query += ` AND rm.grade_level = $${paramCount}`;
      queryParams.push(gradeLevel);
      paramCount++;
    }

    if (difficulty) {
      query += ` AND rm.difficulty_level = $${paramCount}`;
      queryParams.push(difficulty);
      paramCount++;
    }

    if (categoryId) {
      query += ` AND rm.category_id = $${paramCount}`;
      queryParams.push(categoryId);
      paramCount++;
    }

    if (search) {
      query += ` AND (rm.title ILIKE $${paramCount} OR rm.description ILIKE $${paramCount} OR rm.author ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Add pagination
    query += ` ORDER BY rm.grade_level, rm.difficulty_level LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await req.db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM reading_materials rm
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (gradeLevel) {
      countQuery += ` AND rm.grade_level = $${countParamIndex}`;
      countParams.push(gradeLevel);
      countParamIndex++;
    }

    if (difficulty) {
      countQuery += ` AND rm.difficulty_level = $${countParamIndex}`;
      countParams.push(difficulty);
      countParamIndex++;
    }

    if (categoryId) {
      countQuery += ` AND rm.category_id = $${countParamIndex}`;
      countParams.push(categoryId);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (rm.title ILIKE $${countParamIndex} OR rm.description ILIKE $${countParamIndex} OR rm.author ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await req.db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      materials: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reading materials:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-materials/:id
 * @desc Get a reading material by ID
 * @access Private
 */
router.get('/:id', [
  verifyToken,
  param('id').isInt().withMessage('Valid material ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const materialId = parseInt(req.params.id);

  try {
    const result = await req.db.query(
      `SELECT rm.*, rmc.name as category_name
       FROM reading_materials rm
       LEFT JOIN reading_material_categories rmc ON rm.category_id = rmc.id
       WHERE rm.id = $1`,
      [materialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching reading material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/reading-materials
 * @desc Create a new reading material
 * @access Private (Teachers only)
 */
router.post('/', [
  verifyToken,
  isTeacher,
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 255 }),
  body('content').notEmpty().withMessage('Content is required'),
  body('gradeLevel').isIn(['K', '1', '2', '3']).withMessage('Valid grade level is required'),
  body('difficultyLevel').isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']).withMessage('Valid difficulty level is required'),
  body('wordCount').isInt({ min: 1 }).withMessage('Word count must be at least 1'),
  body('author').optional().isString().isLength({ max: 100 }),
  body('description').optional().isString(),
  body('categoryId').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    content,
    gradeLevel,
    difficultyLevel,
    wordCount,
    author = '',
    description = '',
    categoryId = null
  } = req.body;

  try {
    const result = await req.db.query(
      `INSERT INTO reading_materials 
       (title, content, grade_level, difficulty_level, word_count, author, description, category_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [title, content, gradeLevel, difficultyLevel, wordCount, author, description, categoryId]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Reading material created successfully' 
    });
  } catch (error) {
    console.error('Error creating reading material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/reading-materials/:id
 * @desc Update a reading material
 * @access Private (Teachers only)
 */
router.put('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid material ID is required'),
  body('title').optional().isLength({ max: 255 }),
  body('content').optional(),
  body('gradeLevel').optional().isIn(['K', '1', '2', '3']),
  body('difficultyLevel').optional().isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']),
  body('wordCount').optional().isInt({ min: 1 }),
  body('author').optional().isString().isLength({ max: 100 }),
  body('description').optional().isString(),
  body('categoryId').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const materialId = parseInt(req.params.id);
  const updates = req.body;

  // Convert camelCase to snake_case for database
  const dbUpdates = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.gradeLevel) dbUpdates.grade_level = updates.gradeLevel;
  if (updates.difficultyLevel) dbUpdates.difficulty_level = updates.difficultyLevel;
  if (updates.wordCount) dbUpdates.word_count = updates.wordCount;
  if (updates.author) dbUpdates.author = updates.author;
  if (updates.description) dbUpdates.description = updates.description;
  if ('categoryId' in updates) dbUpdates.category_id = updates.categoryId;

  try {
    // Check if material exists
    const checkResult = await req.db.query(
      'SELECT id FROM reading_materials WHERE id = $1',
      [materialId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    // Build dynamic update query
    const keys = Object.keys(dbUpdates);
    if (keys.length === 0) {
      return res.status(400).json({ message: 'No update fields provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [materialId, ...keys.map(key => dbUpdates[key])];

    const result = await req.db.query(
      `UPDATE reading_materials SET ${setClause} WHERE id = $1 RETURNING id`,
      values
    );

    res.json({ 
      id: result.rows[0].id,
      message: 'Reading material updated successfully' 
    });
  } catch (error) {
    console.error('Error updating reading material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/reading-materials/:id
 * @desc Delete a reading material
 * @access Private (Teachers only)
 */
router.delete('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid material ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const materialId = parseInt(req.params.id);

  try {
    // Check if material exists
    const checkResult = await req.db.query(
      'SELECT id FROM reading_materials WHERE id = $1',
      [materialId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    // Delete the material
    await req.db.query('DELETE FROM reading_materials WHERE id = $1', [materialId]);

    res.json({ message: 'Reading material deleted successfully' });
  } catch (error) {
    console.error('Error deleting reading material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-materials/recommended/:userId
 * @desc Get recommended reading materials for a user
 * @access Private
 */
router.get('/recommended/:userId', [
  verifyToken,
  param('userId').isInt().withMessage('Valid user ID is required'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.userId);
  const limit = parseInt(req.query.limit) || 5;

  // Check if user is authorized to view recommendations for this user
  if (req.user.role === 'student' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Not authorized to view recommendations for this user' });
  }

  try {
    // Get user's grade level and recent performance
    const userResult = await req.db.query(
      `SELECT u.grade_level,
              COALESCE(up.current_difficulty_level, 'A') as current_difficulty,
              COALESCE(up.average_accuracy, 95) as avg_accuracy
       FROM users u
       LEFT JOIN user_progress up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Get recently read materials to exclude
    const recentlyReadResult = await req.db.query(
      `SELECT DISTINCT reading_material_id 
       FROM reading_sessions 
       WHERE user_id = $1 
       ORDER BY MAX(start_time) DESC 
       LIMIT 10`,
      [userId]
    );

    const excludedIds = recentlyReadResult.rows.map(row => row.reading_material_id);
    
    // Determine appropriate difficulty range based on user performance
    let difficultyLevels = [user.current_difficulty];
    
    // Add adjacent difficulty levels based on performance
    if (user.avg_accuracy > 98) {
      // If accuracy is very high, suggest slightly harder materials
      const nextLevel = getNextDifficultyLevel(user.current_difficulty);
      if (nextLevel) difficultyLevels.push(nextLevel);
    } else if (user.avg_accuracy < 95) {
      // If accuracy is low, suggest slightly easier materials
      const prevLevel = getPreviousDifficultyLevel(user.current_difficulty);
      if (prevLevel) difficultyLevels = [prevLevel, user.current_difficulty];
    }
    
    // Build query to get recommended materials
    let query = `
      SELECT rm.*, rmc.name as category_name
      FROM reading_materials rm
      LEFT JOIN reading_material_categories rmc ON rm.category_id = rmc.id
      WHERE rm.grade_level = $1
      AND rm.difficulty_level = ANY($2)
    `;
    
    const queryParams = [user.grade_level, difficultyLevels];
    let paramIndex = 3;
    
    // Exclude recently read materials
    if (excludedIds.length > 0) {
      query += ` AND rm.id != ALL($${paramIndex})`;
      queryParams.push(excludedIds);
      paramIndex++;
    }
    
    // Get materials assigned to user first
    query += `
      ORDER BY 
        (EXISTS (
          SELECT 1 FROM reading_assignments ra 
          WHERE ra.reading_material_id = rm.id 
          AND ra.user_id = $${paramIndex} 
          AND ra.is_completed = false
        )) DESC,
        rm.difficulty_level,
        RANDOM()
      LIMIT $${paramIndex + 1}
    `;
    
    queryParams.push(userId, limit);
    
    const result = await req.db.query(query, queryParams);
    
    res.json({
      recommendations: result.rows,
      userLevel: {
        grade: user.grade_level,
        difficulty: user.current_difficulty,
        accuracy: user.avg_accuracy
      }
    });
  } catch (error) {
    console.error('Error getting recommended materials:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reading-materials/categories
 * @desc Get all reading material categories
 * @access Private
 */
router.get('/categories', [
  verifyToken
], async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM reading_material_categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Helper function to get the next difficulty level
 */
function getNextDifficultyLevel(currentLevel) {
  const levels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  const currentIndex = levels.indexOf(currentLevel);
  
  if (currentIndex < 0 || currentIndex >= levels.length - 1) {
    return null;
  }
  
  return levels[currentIndex + 1];
}

/**
 * Helper function to get the previous difficulty level
 */
function getPreviousDifficultyLevel(currentLevel) {
  const levels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  const currentIndex = levels.indexOf(currentLevel);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return levels[currentIndex - 1];
}

module.exports = router; 