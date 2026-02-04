const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('========================================');
console.log('Generating Self-Signed SSL Certificates');
console.log('========================================\n');

const sslDir = path.join(__dirname, 'backend', 'ssl');

// Ensure ssl directory exists
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

try {
  // Try using Node.js built-in crypto
  const crypto = require('crypto');
  const forge = require('node-forge');
  
  console.log('Using node-forge to generate certificates...\n');
  
  // Generate key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [{
    name: 'commonName',
    value: 'localhost'
  }, {
    name: 'countryName',
    value: 'GH'
  }, {
    shortName: 'ST',
    value: 'Greater Accra'
  }, {
    name: 'localityName',
    value: 'Accra'
  }, {
    name: 'organizationName',
    value: 'Withrow University College'
  }, {
    shortName: 'OU',
    value: 'IT Department'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);
  
  // Convert to PEM format
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certPem = forge.pki.certificateToPem(cert);
  
  // Write files
  fs.writeFileSync(path.join(sslDir, 'private-key.pem'), privateKeyPem);
  fs.writeFileSync(path.join(sslDir, 'certificate.pem'), certPem);
  
  console.log('✅ SSL Certificates Generated Successfully!\n');
  console.log('Location: backend/ssl/');
  console.log('Files:');
  console.log('  - private-key.pem');
  console.log('  - certificate.pem\n');
  console.log('Valid for: 365 days\n');
  console.log('To enable SSL, update backend/.env:');
  console.log('SSL_ENABLED=true\n');
  console.log('========================================');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Installing node-forge...');
  
  try {
    execSync('npm install node-forge', { cwd: __dirname, stdio: 'inherit' });
    console.log('\n✅ node-forge installed. Please run this script again.');
  } catch (installError) {
    console.error('❌ Failed to install node-forge');
    console.log('\nManual installation:');
    console.log('1. Run: npm install node-forge');
    console.log('2. Run: node generate-ssl-certs.js');
  }
}
