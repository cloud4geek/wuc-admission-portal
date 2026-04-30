const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'wuc_admissions',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: 2000,
});

// Set search_path so wuc schema is used first (owned by wuc_admin)
pool.on('connect', (client) => {
  client.query("SET search_path TO wuc, public;");
});

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { error: err.message, stack: err.stack });
  // Exit so the process manager (PM2/systemd) can restart cleanly
  process.exit(1);
});

// Graceful shutdown — drain pool before process exits
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Closing DB pool...`);
  try {
    await pool.end();
    logger.info('DB pool closed.');
  } catch (err) {
    logger.error('Error closing DB pool', { error: err.message });
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { pool };
