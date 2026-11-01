/**
 * Paystack Key Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates the Paystack secret key on startup and every 6 hours.
 * Exposes helpers to:
 *   • validate a key against the Paystack API
 *   • hot-swap the key in process.env AND persist it to .env on disk
 *   • get current key status (valid / invalid / unchecked)
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const logger = require('../utils/logger');

const ENV_PATH = path.join(__dirname, '..', '.env');
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let _status = { valid: null, checkedAt: null, keyPrefix: null };

/* ── Validate a key against Paystack /bank (lightweight, no charge) ── */
function validateKey(secretKey) {
  return new Promise((resolve) => {
    if (!secretKey) return resolve(false);

    const options = {
      hostname: 'api.paystack.co', port: 443,
      path: '/bank?perPage=1', method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
      timeout: 8000,
    };

    const req = https.request(options, (res) => {
      // Consume response body to free socket
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/* ── Persist a new key value to the .env file on disk ── */
function persistKeyToEnv(keyName, keyValue) {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      logger.warn(`[Paystack] .env not found at ${ENV_PATH} — key not persisted to disk`);
      return false;
    }
    let content = fs.readFileSync(ENV_PATH, 'utf8');
    const regex = new RegExp(`^(${keyName}=).*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `$1${keyValue}`);
    } else {
      content += `\n${keyName}=${keyValue}\n`;
    }
    fs.writeFileSync(ENV_PATH, content, 'utf8');
    return true;
  } catch (err) {
    logger.error(`[Paystack] Failed to persist key to .env: ${err.message}`);
    return false;
  }
}

/* ── Check current key and update status ── */
async function checkCurrentKey() {
  const key = process.env.PAYSTACK_SECRET_KEY || '';
  const prefix = key.slice(0, 20);
  const isLive = key.startsWith('sk_live_');
  const isTest = key.startsWith('sk_test_');

  if (!key) {
    _status = { valid: false, checkedAt: new Date(), keyPrefix: null, reason: 'No key set' };
    logger.error('[Paystack] ❌ No PAYSTACK_SECRET_KEY set in environment');
    return false;
  }

  if (isTest && process.env.NODE_ENV === 'production') {
    _status = { valid: false, checkedAt: new Date(), keyPrefix: prefix, reason: 'Test key in production' };
    logger.error(`[Paystack] ⚠️  TEST key detected in production (${prefix}...) — set a live key via admin dashboard`);
    return false;
  }

  const valid = await validateKey(key);
  _status = { valid, checkedAt: new Date(), keyPrefix: prefix, isLive, isTest };

  if (valid) {
    logger.info(`[Paystack] ✅ Key valid (${prefix}...${isLive ? ' LIVE' : ' TEST'})`);
  } else {
    logger.error(`[Paystack] ❌ Key INVALID (${prefix}...) — update via admin dashboard: Settings → Paystack Key`);
  }

  return valid;
}

/* ── Hot-swap key: update env + disk + re-validate ── */
async function updateKey(newSecretKey, newPublicKey) {
  // Validate the new secret key first
  const valid = await validateKey(newSecretKey);
  if (!valid) {
    return { success: false, message: 'Key validation failed — Paystack rejected it. Check the key and try again.' };
  }

  // Apply to running process
  process.env.PAYSTACK_SECRET_KEY = newSecretKey;
  if (newPublicKey) process.env.PAYSTACK_PUBLIC_KEY = newPublicKey;

  // Persist to disk
  const persisted = persistKeyToEnv('PAYSTACK_SECRET_KEY', newSecretKey);
  if (newPublicKey) persistKeyToEnv('PAYSTACK_PUBLIC_KEY', newPublicKey);

  _status = {
    valid: true,
    checkedAt: new Date(),
    keyPrefix: newSecretKey.slice(0, 20),
    isLive: newSecretKey.startsWith('sk_live_'),
    isTest: newSecretKey.startsWith('sk_test_'),
  };

  logger.info(`[Paystack] 🔑 Key updated successfully (${newSecretKey.slice(0, 20)}...) persisted=${persisted}`);
  return { success: true, persisted, message: 'Paystack key updated and validated successfully.' };
}

/* ── Get current status (for health/admin endpoints) ── */
function getStatus() {
  return { ..._status };
}

/* ── Start periodic check ── */
function startPeriodicCheck() {
  // Run immediately on startup
  checkCurrentKey();
  // Then every 6 hours
  setInterval(checkCurrentKey, CHECK_INTERVAL_MS);
  logger.info('[Paystack] Key health check scheduled every 6 hours');
}

module.exports = { checkCurrentKey, updateKey, getStatus, validateKey, startPeriodicCheck };
