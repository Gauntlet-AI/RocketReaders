require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const winston = require('winston');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const teacherRoutes = require('./routes/teachers');
const userRoutes = require('./routes/users');
const readingMaterialRoutes = require('./routes/readingMaterials');
const readingSessionRoutes = require('./routes/readingSessions');
const achievementRoutes = require('./routes/achievements');
const rewardRoutes = require('./routes/rewards');
const progressRoutes = require('./routes/progress');
const goalRoutes = require('./routes/goals');
const assignmentRoutes = require('./routes/assignments');
const errorRoutes = require('./routes/readingErrors');
const healthcheckRoutes = require('./routes/healthcheck');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'repeated_reading',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error', { error: err.message });
  } else {
    logger.info('Database connected successfully');
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : null
  });
  next();
});

// Make db pool available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// API Routes
app.use('/api/healthcheck', healthcheckRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reading-materials', readingMaterialRoutes);
app.use('/api/reading-sessions', readingSessionRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reading-errors', errorRoutes);

// API Playground route
app.get('/api-playground', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/api-playground.html'));
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the K-3 Repeated Reading API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, pool }; 