const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, isTeacher, isAuthorizedForUser } = require('../middleware/auth');

/**
 * @route GET /api/assignments
 * @desc Get all assignments with filters
 * @access Private (Teachers only)
 */
router.get('/', [
  verifyToken,
  isTeacher,
  query('userId').optional().isInt().withMessage('Valid user ID is required'),
  query('teacherId').optional().isInt().withMessage('Valid teacher ID is required'),
  query('status').optional().isIn(['pending', 'completed', 'all']).withMessage('Valid status is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.query.userId ? parseInt(req.query.userId) : null;
  const teacherId = req.query.teacherId ? parseInt(req.query.teacherId) : null;
  const status = req.query.status || 'all';
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  // Teachers can only view assignments they have created or for their students
  if (teacherId && teacherId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Not authorized to view assignments for this teacher' });
  }

  try {
    // Build dynamic query with filters
    let query = `
      SELECT ra.id, ra.user_id, ra.reading_material_id, ra.assigned_by_id,
             ra.assigned_date, ra.due_by, ra.is_completed, ra.completed_at,
             ra.notes, u.first_name as student_first_name, u.last_name as student_last_name,
             u.grade_level, rm.title as material_title, rm.difficulty_level,
             t.first_name as teacher_first_name, t.last_name as teacher_last_name
      FROM reading_assignments ra
      JOIN users u ON ra.user_id = u.id
      JOIN reading_materials rm ON ra.reading_material_id = rm.id
      JOIN teachers t ON ra.assigned_by_id = t.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    // Add filters
    if (userId) {
      query += ` AND ra.user_id = $${paramCount}`;
      queryParams.push(userId);
      paramCount++;
    }

    if (teacherId) {
      query += ` AND ra.assigned_by_id = $${paramCount}`;
      queryParams.push(teacherId);
      paramCount++;
    }

    // If teacher is not admin, only show assignments they created or for their students
    if (!req.user.isAdmin) {
      query += ` AND (ra.assigned_by_id = $${paramCount} OR u.teacher_id = $${paramCount})`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    if (status === 'pending') {
      query += ' AND ra.is_completed = false';
    } else if (status === 'completed') {
      query += ' AND ra.is_completed = true';
    }

    // Add pagination and ordering
    query += ` ORDER BY ra.due_by ASC, ra.assigned_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await req.db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*)
      FROM reading_assignments ra
      JOIN users u ON ra.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (userId) {
      countQuery += ` AND ra.user_id = $${countParamIndex}`;
      countParams.push(userId);
      countParamIndex++;
    }

    if (teacherId) {
      countQuery += ` AND ra.assigned_by_id = $${countParamIndex}`;
      countParams.push(teacherId);
      countParamIndex++;
    }

    // If teacher is not admin, only count assignments they created or for their students
    if (!req.user.isAdmin) {
      countQuery += ` AND (ra.assigned_by_id = $${countParamIndex} OR u.teacher_id = $${countParamIndex})`;
      countParams.push(req.user.id);
      countParamIndex++;
    }

    if (status === 'pending') {
      countQuery += ' AND ra.is_completed = false';
    } else if (status === 'completed') {
      countQuery += ' AND ra.is_completed = true';
    }

    const countResult = await req.db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      assignments: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/assignments/:id
 * @desc Get a specific assignment by ID
 * @access Private
 */
router.get('/:id', [
  verifyToken,
  param('id').isInt().withMessage('Valid assignment ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const assignmentId = parseInt(req.params.id);

  try {
    const result = await req.db.query(
      `SELECT ra.id, ra.user_id, ra.reading_material_id, ra.assigned_by_id,
              ra.assigned_date, ra.due_by, ra.is_completed, ra.completed_at,
              ra.notes, u.first_name as student_first_name, u.last_name as student_last_name,
              u.grade_level, rm.title as material_title, rm.difficulty_level, rm.content,
              rm.word_count, rm.grade_level as material_grade_level,
              t.first_name as teacher_first_name, t.last_name as teacher_last_name
       FROM reading_assignments ra
       JOIN users u ON ra.user_id = u.id
       JOIN reading_materials rm ON ra.reading_material_id = rm.id
       JOIN teachers t ON ra.assigned_by_id = t.id
       WHERE ra.id = $1`,
      [assignmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const assignment = result.rows[0];

    // Check authorization - teachers can view any assignment for their students or that they created
    // Students can only view their own assignments
    if (req.user.role === 'teacher') {
      if (assignment.assigned_by_id !== req.user.id) {
        // Check if the student belongs to this teacher
        const studentCheck = await req.db.query(
          'SELECT id FROM users WHERE id = $1 AND teacher_id = $2',
          [assignment.user_id, req.user.id]
        );
        
        if (studentCheck.rows.length === 0 && !req.user.isAdmin) {
          return res.status(403).json({ message: 'Not authorized to view this assignment' });
        }
      }
    } else if (req.user.role === 'student' && req.user.id !== assignment.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this assignment' });
    }

    // Get completed session info if assignment is completed
    if (assignment.is_completed) {
      const sessionResult = await req.db.query(
        `SELECT id, words_per_minute, accuracy_percentage, start_time, 
                duration_seconds, improvement_percentage
         FROM reading_sessions
         WHERE user_id = $1 AND reading_material_id = $2
         AND start_time <= $3
         ORDER BY start_time DESC
         LIMIT 1`,
        [assignment.user_id, assignment.reading_material_id, assignment.completed_at]
      );
      
      if (sessionResult.rows.length > 0) {
        assignment.completionSession = sessionResult.rows[0];
      }
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/assignments/:id
 * @desc Update an assignment
 * @access Private (Teachers only)
 */
router.put('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid assignment ID is required'),
  body('dueBy').optional().isISO8601().withMessage('Due date must be a valid date'),
  body('notes').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const assignmentId = parseInt(req.params.id);
  const updates = req.body;

  try {
    // Check if assignment exists and teacher is authorized to update it
    const checkResult = await req.db.query(
      'SELECT id, assigned_by_id FROM reading_assignments WHERE id = $1',
      [assignmentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only the teacher who created the assignment or an admin can update it
    if (checkResult.rows[0].assigned_by_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    if (updates.dueBy) dbUpdates.due_by = updates.dueBy;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    // Build dynamic update query
    const keys = Object.keys(dbUpdates);
    if (keys.length === 0) {
      return res.status(400).json({ message: 'No update fields provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [assignmentId, ...keys.map(key => dbUpdates[key])];

    const result = await req.db.query(
      `UPDATE reading_assignments SET ${setClause} WHERE id = $1 RETURNING id`,
      values
    );

    res.json({ 
      id: result.rows[0].id,
      message: 'Assignment updated successfully' 
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/assignments/:id
 * @desc Delete an assignment
 * @access Private (Teachers only)
 */
router.delete('/:id', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid assignment ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const assignmentId = parseInt(req.params.id);

  try {
    // Check if assignment exists and teacher is authorized to delete it
    const checkResult = await req.db.query(
      'SELECT id, assigned_by_id, is_completed FROM reading_assignments WHERE id = $1',
      [assignmentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const assignment = checkResult.rows[0];

    // Only the teacher who created the assignment or an admin can delete it
    if (assignment.assigned_by_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    // Don't allow deletion of completed assignments
    if (assignment.is_completed) {
      return res.status(400).json({ message: 'Cannot delete a completed assignment' });
    }

    // Delete the assignment
    await req.db.query('DELETE FROM reading_assignments WHERE id = $1', [assignmentId]);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/assignments/:id/complete
 * @desc Mark an assignment as completed (for testing or manual completion)
 * @access Private (Teachers only)
 */
router.put('/:id/complete', [
  verifyToken,
  isTeacher,
  param('id').isInt().withMessage('Valid assignment ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const assignmentId = parseInt(req.params.id);

  try {
    // Check if assignment exists
    const checkResult = await req.db.query(
      'SELECT id, is_completed FROM reading_assignments WHERE id = $1',
      [assignmentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (checkResult.rows[0].is_completed) {
      return res.status(400).json({ message: 'Assignment is already completed' });
    }

    // Mark as completed
    const result = await req.db.query(
      'UPDATE reading_assignments SET is_completed = true, completed_at = NOW() WHERE id = $1 RETURNING id',
      [assignmentId]
    );

    res.json({ 
      id: result.rows[0].id,
      message: 'Assignment marked as completed' 
    });
  } catch (error) {
    console.error('Error completing assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/assignments/user/:userId/summary
 * @desc Get summary of assignments for a user
 * @access Private
 */
router.get('/user/:userId/summary', [
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
    // Get assignment statistics
    const statsResult = await req.db.query(
      `SELECT 
         COUNT(*) as total_assignments,
         COUNT(*) FILTER (WHERE is_completed = true) as completed_assignments,
         COUNT(*) FILTER (WHERE is_completed = false AND due_by < NOW()) as overdue_assignments,
         COUNT(*) FILTER (WHERE is_completed = false AND due_by >= NOW()) as pending_assignments,
         COUNT(*) FILTER (WHERE assigned_date >= NOW() - INTERVAL '7 days') as recent_assignments
       FROM reading_assignments
       WHERE user_id = $1`,
      [userId]
    );

    // Get upcoming assignments
    const upcomingResult = await req.db.query(
      `SELECT ra.id, ra.reading_material_id, ra.assigned_date, ra.due_by,
              rm.title as material_title, rm.difficulty_level,
              t.first_name as teacher_first_name, t.last_name as teacher_last_name
       FROM reading_assignments ra
       JOIN reading_materials rm ON ra.reading_material_id = rm.id
       JOIN teachers t ON ra.assigned_by_id = t.id
       WHERE ra.user_id = $1 AND ra.is_completed = false
       ORDER BY ra.due_by ASC
       LIMIT 5`,
      [userId]
    );

    // Get completion rate by week
    const weeklyResult = await req.db.query(
      `SELECT 
         date_trunc('week', assigned_date) as week,
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE is_completed = true) as completed
       FROM reading_assignments
       WHERE user_id = $1 AND assigned_date > NOW() - INTERVAL '8 weeks'
       GROUP BY date_trunc('week', assigned_date)
       ORDER BY week ASC`,
      [userId]
    );

    const stats = statsResult.rows[0];
    
    res.json({
      statistics: {
        totalAssignments: parseInt(stats.total_assignments),
        completedAssignments: parseInt(stats.completed_assignments),
        overdueAssignments: parseInt(stats.overdue_assignments),
        pendingAssignments: parseInt(stats.pending_assignments),
        recentAssignments: parseInt(stats.recent_assignments),
        completionRate: stats.total_assignments > 0 
          ? Math.round((stats.completed_assignments / stats.total_assignments) * 100) 
          : 0
      },
      upcomingAssignments: upcomingResult.rows,
      weeklyCompletion: weeklyResult.rows.map(week => ({
        week: week.week,
        total: parseInt(week.total),
        completed: parseInt(week.completed),
        rate: week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0
      }))
    });
  } catch (error) {
    console.error('Error fetching assignment summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 