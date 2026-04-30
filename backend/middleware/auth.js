const jwtUtil = require('../utils/jwt');
const logger = require('../utils/logger');

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
};

const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }
    req.user = jwtUtil.verifyToken(token);
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { ip: req.ip, error: error.message });
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

const authenticateAdmin = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }
    req.admin = jwtUtil.verifyAdminToken(token);
    next();
  } catch (error) {
    logger.warn('Invalid admin token attempt', { ip: req.ip, error: error.message });
    return res.status(403).json({ success: false, error: 'Invalid or expired admin token' });
  }
};

module.exports = { authenticate, authenticateAdmin };
