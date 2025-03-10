const express = require('express');
const router = express.Router();
const { version } = require('../../package.json');

/**
 * @route GET /api/healthcheck
 * @desc Basic healthcheck endpoint to verify server is running
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await req.db.query('SELECT NOW()');
    const dbTime = dbResult.rows[0].now;
    
    res.json({
      status: 'ok',
      version,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        time: dbTime
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Healthcheck error:', error);
    res.status(500).json({
      status: 'error',
      version,
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      },
      uptime: process.uptime()
    });
  }
});

module.exports = router; 