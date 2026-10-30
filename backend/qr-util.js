// QR code generation for admission letter authenticity/verification.
// Encodes a verification URL containing the application ID and a short
// HMAC-based signature so the QR can be validated as genuine.
const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Build the verification payload string the QR encodes.
 * Format: https://apply.wuc.edu.gh/verify-letter?id=<appId>&sig=<sig>
 * The signature is an HMAC-SHA256 (first 16 hex chars) of the appId using
 * a server secret, so a forged QR with a made-up appId won't validate.
 */
function buildVerificationUrl(appId) {
  const secret = process.env.LETTER_VERIFY_SECRET || process.env.JWT_SECRET || 'wuc-letter-verify';
  const sig = crypto.createHmac('sha256', secret).update(String(appId)).digest('hex').slice(0, 16);
  const base = process.env.APP_URL || 'https://apply.wuc.edu.gh';
  return `${base.replace(/\/$/, '')}/verify-letter?id=${encodeURIComponent(appId)}&sig=${sig}`;
}

/**
 * Returns a PNG Buffer of the QR code for the given application ID.
 * Buffer can be passed straight to PDFKit's doc.image().
 */
async function generateLetterQR(appId) {
  const url = buildVerificationUrl(appId);
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,          // rendered small in the PDF; high res keeps it crisp
    color: { dark: '#0a2240', light: '#ffffff' },
  });
}

module.exports = { generateLetterQR, buildVerificationUrl };
