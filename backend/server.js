require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth');
const voucherRoutes = require('./routes/vouchers');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'WUC Admission Portal API',
    version: '1.0.0',
    status: 'running',
    reference: 'https://www.wuc.edu.gh'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`🚀 WUC Admission Portal API (HTTP) running on port ${PORT}`);
});

// Start HTTPS server if SSL is enabled
if (process.env.SSL_ENABLED === 'true') {
  try {
    const sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
    
    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
      console.log(`🔒 WUC Admission Portal API (HTTPS) running on port ${HTTPS_PORT}`);
      console.log(`🌐 Reference: https://www.wuc.edu.gh`);
      console.log(`✅ Health: https://localhost:${HTTPS_PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ SSL Error:', error.message);
    console.log('💡 Run generate-ssl.bat to create SSL certificates');
  }
} else {
  console.log(`🌐 Reference: https://www.wuc.edu.gh`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
}

module.exports = app;