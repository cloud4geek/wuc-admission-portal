# Local Testing Guide - Before Deployment

Test everything locally before deploying to Lightsail.

---

## SETUP FOR LOCAL TESTING

### Step 1: Update SMS Service to Arkesel
**Time: 2 minutes**

```bash
cd backend/services

# Backup old SMS service
mv smsService.js smsService-aws.js.backup

# Use Arkesel SMS service
cp smsService-arkesel.js smsService.js
```

---

### Step 2: Get Arkesel Test API Key
**Time: 5 minutes**

1. Go to https://sms.arkesel.com
2. Sign up / Login
3. Go to Dashboard → API Keys
4. Copy your API Key
5. Note: Arkesel gives free test credits

---

### Step 3: Update .env for Testing
**Time: 3 minutes**

Edit `backend/.env`:

```env
# Keep these as is for local testing
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=wuc_admin
DB_PASSWORD=wuc123

# SMS (Arkesel)
ARKESEL_API_KEY=paste_your_arkesel_api_key_here
SMS_SENDER_ID=WUC-ADM

# Payment (Flutterwave Test Mode)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-test-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-test-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=test-xxxxxxxxxxxx

# URLs (Local)
APP_URL=http://localhost:3000
API_URL=http://localhost:5000
```

---

## TEST 1: PAYMENT FLOW (Flutterwave Test Mode)

### Start Application
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

### Test Steps:

**1. Purchase Voucher**
- Go to http://localhost:3000
- Click "Purchase Voucher"
- Fill form:
  - First Name: Test
  - Last Name: User
  - Email: test@example.com
  - Phone: +233241234567
  - Payment Method: MTN Mobile Money
- Click "Pay GHS 200.00"

**Expected Result:**
```
✅ Voucher code displayed on screen
✅ Console shows: "💳 Test mode: Simulating payment success"
✅ Voucher saved in database
```

**2. Check Backend Logs**
```bash
# In backend terminal, you should see:
💳 Test mode: Simulating payment success
📱 [DEV SMS] To: +233241234567
📱 [DEV SMS] Message: WUC Admission: Your voucher code is WUC12345678...
```

---

## TEST 2: SMS DELIVERY (Arkesel Test)

### Option A: Test with Real Phone Number

**Update .env with real Arkesel API key:**
```env
ARKESEL_API_KEY=your_real_arkesel_api_key
```

**Test:**
1. Purchase voucher with YOUR real phone number
2. Check your phone for SMS
3. Should receive: "WUC Admission: Your voucher code is WUC12345678..."

### Option B: Test with Arkesel Dashboard

1. Go to https://sms.arkesel.com/dashboard
2. Check "SMS History" or "Sent Messages"
3. Verify SMS was sent

### Manual SMS Test Script

Create `backend/test-arkesel-sms.js`:

```javascript
require('dotenv').config();
const { sendSMS } = require('./services/smsService');

async function testSMS() {
  console.log('Testing Arkesel SMS...');
  
  const result = await sendSMS(
    '+233241234567', // Replace with your phone
    'Test message from WUC Admission Portal'
  );
  
  console.log('Result:', result);
}

testSMS();
```

**Run test:**
```bash
node backend/test-arkesel-sms.js
```

**Expected output:**
```
Testing Arkesel SMS...
✅ SMS sent to +233241234567 via Arkesel
Result: { success: true, messageId: 'ARKESEL-...' }
```

---

## TEST 3: COMPLETE APPLICATION FLOW

### 1. Purchase Voucher
- Go to http://localhost:3000
- Purchase voucher
- Save the voucher code

### 2. Submit Application
- Click "Apply Now"
- Enter voucher code
- Fill all form steps:
  - Personal Information
  - Academic Information
  - Upload Documents (use test files)
- Submit

**Expected:**
```
✅ Application submitted
✅ Application ID generated
✅ SMS sent (if Arkesel configured)
✅ Email sent (if SES configured)
```

### 3. Check Application Status
- Go to "Check Status"
- Enter application ID or email
- View application details

### 4. Admin Approval (Optional)
- Go to http://localhost:3000/admin
- Login (if admin user created)
- Approve application
- Generate admission letter

---

## TEST 4: DATABASE VERIFICATION

```bash
# Connect to database
psql -U wuc_admin -d wuc_admissions

# Check vouchers
SELECT voucher_code, email, phone, status, created_at 
FROM vouchers 
ORDER BY created_at DESC 
LIMIT 5;

# Check applications
SELECT application_id, first_name, last_name, email, status, created_at 
FROM applications 
ORDER BY created_at DESC 
LIMIT 5;

# Exit
\q
```

---

## TEST 5: EMAIL TESTING (Optional)

If you want to test emails locally:

### Option A: Use Mailtrap (Recommended for Testing)

1. Sign up at https://mailtrap.io (free)
2. Get SMTP credentials
3. Update `.env`:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM=admissions@wuc.edu.gh
```

4. All emails will be caught by Mailtrap (not sent to real addresses)

### Option B: Skip Email Testing

Emails will just log to console in dev mode.

---

## TESTING CHECKLIST

Before deploying to Lightsail, verify:

- [ ] **Backend starts without errors**
  ```bash
  cd backend && npm start
  # Should show: "WUC API running on port 5000"
  ```

- [ ] **Frontend builds successfully**
  ```bash
  cd frontend && npm run build
  # Should create build/ folder
  ```

- [ ] **Database connection works**
  ```bash
  curl http://localhost:5000/api/health
  # Should return: {"status":"healthy","database":"connected"}
  ```

- [ ] **Voucher purchase works**
  - Purchase voucher
  - Voucher code displayed
  - Saved in database

- [ ] **SMS sends (if Arkesel configured)**
  - Real SMS received on phone
  - OR shows in Arkesel dashboard

- [ ] **Application submission works**
  - Form submits successfully
  - Application ID generated
  - Saved in database

- [ ] **File uploads work**
  - Documents upload successfully
  - Files saved in uploads/ folder

- [ ] **Application status check works**
  - Can search by application ID
  - Can search by email
  - Shows correct status

---

## COMMON ISSUES & FIXES

### Issue: "Database connection failed"
```bash
# Check PostgreSQL is running
psql -U wuc_admin -d wuc_admissions

# If fails, check password in .env matches database
```

### Issue: "SMS not sending"
```bash
# Check Arkesel API key is correct
# Check phone number format: +233XXXXXXXXX
# Check Arkesel dashboard for errors
```

### Issue: "Port 5000 already in use"
```bash
# Kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env:
PORT=5001
```

### Issue: "Frontend can't connect to backend"
```bash
# Check backend is running on port 5000
# Check CORS_ORIGINS in backend/.env includes http://localhost:3000
```

---

## ARKESEL SMS PRICING (Ghana)

- **Test Credits**: Free credits on signup
- **Production**: ~GHS 0.03 per SMS
- **Bulk SMS**: Discounts available
- **Sender ID**: Free (WUC-ADM)

**Estimate for 1000 applications:**
- 1000 voucher SMS = GHS 30
- 1000 application confirmations = GHS 30
- 500 admission approvals = GHS 15
- **Total: ~GHS 75/month**

---

## NEXT STEPS

Once local testing is complete:

1. ✅ All tests passing locally
2. 📝 Get production Arkesel API key
3. 📝 Get production Flutterwave keys
4. 🚀 Deploy to Lightsail (follow LIGHTSAIL_DEPLOYMENT.md)

---

## QUICK TEST COMMAND

Run all tests at once:

```bash
# Test backend health
curl http://localhost:5000/api/health

# Test SMS (if configured)
node backend/test-arkesel-sms.js

# Test database
psql -U wuc_admin -d wuc_admissions -c "SELECT COUNT(*) FROM vouchers;"
```

---

**Happy Testing! 🧪**

Once everything works locally, deployment will be smooth! 🚀
