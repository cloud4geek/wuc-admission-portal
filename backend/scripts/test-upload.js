/**
 * Test document upload endpoint directly.
 * Run: node scripts/test-upload.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

async function test() {
  const API = 'http://localhost:5000';

  // Find an application to test with
  const { pool } = require('../config/database');
  const apps = await pool.query("SELECT application_id FROM applications ORDER BY submitted_at DESC LIMIT 1");
  if (apps.rows.length === 0) { console.log('No applications found'); await pool.end(); return; }
  const appId = apps.rows[0].application_id;
  console.log('Testing upload for:', appId);

  // Create a tiny test image (1x1 red pixel PNG)
  const testImagePath = path.join(__dirname, 'test-photo.png');
  // Minimal valid PNG
  const pngBuffer = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cf00000002000160e7254e000000004945' +
    '4e44ae426082', 'hex'
  );
  fs.writeFileSync(testImagePath, pngBuffer);
  console.log('Test image created:', pngBuffer.length, 'bytes');

  // Upload using fetch with FormData (Node 18+)
  const formData = new FormData();
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('photo', blob, 'test-photo.png');

  try {
    const res = await fetch(`${API}/api/applications/${appId}/documents`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    console.log('Upload response:', res.status, JSON.stringify(data));
  } catch (err) {
    console.error('Upload error:', err.message);
  }

  // Check if it was saved to DB
  const docs = await pool.query("SELECT document_type, file_path, mime_type FROM documents WHERE application_id = (SELECT id FROM applications WHERE application_id = $1)", [appId]);
  console.log('Documents in DB:', docs.rows.length);
  docs.rows.forEach(d => console.log(' ', d.document_type, d.file_path, d.mime_type));

  // Check files on disk
  const photosDir = path.join(__dirname, '..', 'uploads', 'photos');
  const docsDir = path.join(__dirname, '..', 'uploads', 'documents');
  console.log('\nFiles in uploads/photos:', fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter(f => f !== '.gitkeep') : 'DIR NOT FOUND');
  console.log('Files in uploads/documents:', fs.existsSync(docsDir) ? fs.readdirSync(docsDir).filter(f => f !== '.gitkeep') : 'DIR NOT FOUND');

  // Cleanup
  fs.unlinkSync(testImagePath);
  await pool.end();
}

test();
