# Quick Setup: Test Arkesel SMS

## Step 1: Get Arkesel API Key (5 minutes)

1. Go to https://sms.arkesel.com
2. Sign up or login
3. Go to **Settings** → **API Keys**
4. Copy your API Key

## Step 2: Update .env File (1 minute)

Edit `backend/.env` and add:

```env
# SMS Configuration (Arkesel)
ARKESEL_API_KEY=paste_your_api_key_here
SMS_SENDER_ID=WUC-ADM
```

## Step 3: Switch to Arkesel SMS Service (1 minute)

```bash
cd backend/services

# Backup current SMS service
mv smsService.js smsService-aws-backup.js

# Use Arkesel SMS service
cp smsService-arkesel.js smsService.js
```

## Step 4: Test SMS (2 minutes)

```bash
cd backend

# Test with your phone number (Ghana format)
node test-arkesel-sms.js 233241234567

# Or just run (uses default test number)
node test-arkesel-sms.js
```

**Expected Output:**
```
========================================
Testing Arkesel SMS API
========================================

✅ API Key found
Sender ID: WUC-ADM

Sending test SMS...
To: 233241234567
Message: Test message from WUC Admission Portal...

Response: { code: '200', message: 'SMS sent successfully' }

✅ SUCCESS! SMS sent successfully

Check your phone for the message.
```

## Step 5: Test Full Application (5 minutes)

```bash
# Terminal 1 - Start Backend
cd backend
npm start

# Terminal 2 - Start Frontend
cd frontend
npm start
```

**Test Flow:**
1. Open http://localhost:3000
2. Click "Purchase Voucher"
3. Fill form with YOUR phone number (233XXXXXXXXX)
4. Submit
5. Check your phone for SMS with voucher code

## Troubleshooting

### Issue: "API Key not set"
- Make sure you added `ARKESEL_API_KEY` to `backend/.env`
- Restart backend server after updating .env

### Issue: "SMS not sent"
- Check you have SMS credits in Arkesel account
- Check phone number format: 233XXXXXXXXX (no + or spaces)
- Check Sender ID "WUC-ADM" is approved in Arkesel dashboard

### Issue: "Invalid API Key"
- Copy API key again from Arkesel dashboard
- Make sure no extra spaces in .env file

### Issue: "Sender ID not approved"
- Go to Arkesel dashboard → Sender IDs
- Request approval for "WUC-ADM"
- Or use default sender ID (remove SMS_SENDER_ID from .env)

## Phone Number Formats

**Accepted formats:**
- `233241234567` ✅ (Recommended)
- `0241234567` ✅ (Auto-converted to 233241234567)
- `+233241234567` ✅ (+ removed automatically)

**Not accepted:**
- `024 123 4567` ❌ (spaces)
- `241234567` ❌ (missing country code)

## Arkesel Dashboard

Check SMS status:
1. Go to https://sms.arkesel.com/dashboard
2. Click "SMS History" or "Sent Messages"
3. View delivery status

## Cost Estimate

**Arkesel Pricing (Ghana):**
- Test credits: Free on signup
- Production: ~GHS 0.03 per SMS
- Bulk discounts available

**For 1000 applications:**
- 1000 voucher SMS = GHS 30
- 1000 application confirmations = GHS 30
- 500 admission approvals = GHS 15
- **Total: ~GHS 75/month**

## Next Steps

Once SMS testing works:

1. ✅ Test complete voucher purchase flow
2. ✅ Test application submission
3. ✅ Verify SMS delivery
4. 🚀 Deploy to Lightsail (follow LIGHTSAIL_DEPLOYMENT.md)

---

**Need Help?**
- Arkesel Support: https://sms.arkesel.com/support
- Arkesel API Docs: https://developers.arkesel.com
