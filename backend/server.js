require('dotenv').config();
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

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

/* ── Security ── */
app.use(helmet());

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

/* ── Rate Limiting ── */
const isDev = process.env.NODE_ENV === 'development';

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

/* ── Body parsing & static files ── */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static('uploads'));
app.use('/uploads/photos', express.static('uploads/photos'));
app.use('/uploads/admission-letters', express.static('uploads/admission-letters'));
app.use('/uploads/application-forms', express.static('uploads/application-forms'));
app.use('/uploads/templates', express.static('uploads/templates'));

/* ── Routes ── */
const authRoutes = require('./routes/auth');
const voucherRoutes = require('./routes/vouchers');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

app.use('/api/auth/admin/login', loginLimiter);
app.use('/api/vouchers/purchase', purchaseLimiter);
app.use('/api/applications/submit', submitLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'WUC Admission Portal API', version: '2.0.0', status: 'running' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

app.use(errorHandler);

app.listen(PORT, async () => {
  await autoMigrate();
  logger.info(`WUC API running on port ${PORT} [${process.env.NODE_ENV}]`);
  logger.info(`CORS origins: ${allowedOrigins.join(', ')}`);
});

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
} else {
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
}

module.exports = app;
