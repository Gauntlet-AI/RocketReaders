const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No authentication token provided' });
  }
  
  const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user is a teacher
 */
const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access denied. Teacher role required.' });
  }
  
  next();
};

/**
 * Middleware to check if user is authorized for the requested user data
 */
const isAuthorizedForUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }
  
  // Teachers can access any user data
  if (req.user.role === 'teacher') {
    next();
    return;
  }
  
  // Students can only access their own data
  if (req.user.role === 'student' && req.user.id === userId) {
    next();
    return;
  }
  
  return res.status(403).json({ message: 'Access denied. Not authorized for this user data.' });
};

module.exports = {
  verifyToken,
  isTeacher,
  isAuthorizedForUser
}; 