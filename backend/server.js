require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { autoMigrate } = require('./scripts/auto-migrate');
const { startPeriodicCheck } = require('./services/paystackKeyService');

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const isProd = process.env.NODE_ENV === 'production';

/* ── Security ── */
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.set('trust proxy', 1);

// Disable X-Powered-By header
app.disable('x-powered-by');

/* ── Rate Limiting ── */
const isDev = process.env.NODE_ENV === 'development';

// Exempt Paystack webhook from rate limiting
app.use('/api/vouchers/webhook', (req, res, next) => next());
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: isDev ? 1000 : 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: isDev ? 100 : 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Wait 15 minutes.' },
});

const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: isDev ? 100 : 5,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many purchase attempts. Try again later.' },
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: isDev ? 100 : 3,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Try again later.' },
});

const studentLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: isDev ? 100 : 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Wait 15 minutes.' },
});

/* ── Body parsing & static files ── */
/* -- Raw body capture for Paystack webhook signature verification -- */
/* Uses express.json verify callback so body is parsed AND rawBody is available */
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Public files — admission letters and application forms (shared with applicants)
app.use('/uploads/admission-letters', express.static('uploads/admission-letters'));
app.use('/uploads/application-forms', express.static('uploads/application-forms'));
app.use('/uploads/templates', express.static('uploads/templates'));

// Protected files — documents and photos require admin auth or valid token
const jwtUtil = require('./utils/jwt');
app.use('/uploads/documents', (req, res, next) => {
  try {
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    jwtUtil.verifyAdminToken(token);
    next();
  } catch { return res.status(403).json({ error: 'Invalid token' }); }
}, express.static('uploads/documents'));

app.use('/uploads/photos', (req, res, next) => {
  try {
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    jwtUtil.verifyAdminToken(token);
    next();
  } catch { return res.status(403).json({ error: 'Invalid token' }); }
}, express.static('uploads/photos'));

// Catch-all for other uploads (fallback - no auth)
app.use('/uploads', express.static('uploads'));

/* ── Routes ── */
const authRoutes = require('./routes/auth');
const voucherRoutes = require('./routes/vouchers');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const studentRoutes = require('./routes/students');

app.use('/api/auth/admin/login', loginLimiter);
app.use('/api/students/login', studentLoginLimiter);
app.use('/api/vouchers/purchase', purchaseLimiter);
app.use('/api/applications/submit', submitLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/portal', require('./routes/adminPortal'));
app.use('/api/webhooks', webhookRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/lecturers', require('./routes/lecturers'));

app.get('/', (req, res) => {
  res.json({ message: 'WUC Admission Portal API', version: '2.1.0', status: 'running', environment: process.env.NODE_ENV });
});

app.get('/api/health', async (req, res) => {
  const { getStatus } = require('./services/paystackKeyService');
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;
    const ps = getStatus();
    res.json({
      status: 'healthy',
      database: 'connected',
      dbLatencyMs: dbLatency,
      uptime: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      paystack: { valid: ps.valid, isLive: ps.isLive || false, checkedAt: ps.checkedAt },
      timestamp: new Date().toISOString(),
      version: '2.1.0',
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// 404 handler for unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
  }
  next();
});

app.use(errorHandler);

/* ── Graceful startup ── */
const server = app.listen(PORT, '127.0.0.1', async () => {
  await autoMigrate();
  startPeriodicCheck(); // validate Paystack key on startup + every 6 hours
  logger.info(`WUC API running on port ${PORT} [${process.env.NODE_ENV}]`);
  logger.info(`CORS origins: ${allowedOrigins.join(', ')}`);
  if (isProd) {
    // Signal PM2 that app is ready
    if (process.send) process.send('ready');
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    pool.end().then(() => {
      logger.info('DB pool closed');
      process.exit(0);
    });
  });
  // Force close after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (process.env.SSL_ENABLED === 'true') {
  try {
    const sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
      logger.info(`WUC API (HTTPS) running on port ${HTTPS_PORT}`);
    });
  } catch (error) {
    logger.error('SSL Error', { error: error.message });
  }
} else if (!isProd) {
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`✅ Student Portal API: http://localhost:${PORT}/api/students`);
}

module.exports = app;
