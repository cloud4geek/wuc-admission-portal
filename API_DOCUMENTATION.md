# WUC Admission Portal - API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

Most admin endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Voucher Endpoints

### Purchase Voucher
**POST** `/vouchers/purchase`

Purchase application voucher with payment.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+233241234567",
  "paymentMethod": "mtn"
}
```

**Payment Methods:** `mtn`, `telecel`, `visa`, `mastercard`

**Response:**
```json
{
  "success": true,
  "voucherCode": "WUC12345678",
  "message": "Voucher purchased successfully",
  "paymentUrl": "https://payment-link.com"
}
```

### Verify Voucher
**POST** `/vouchers/verify`

Verify if voucher is valid and unused.

**Request Body:**
```json
{
  "voucherCode": "WUC12345678"
}
```

**Response:**
```json
{
  "success": true,
  "voucher": {
    "id": "uuid",
    "voucher_code": "WUC12345678",
    "status": "unused",
    "expires_at": "2024-02-15T00:00:00Z"
  }
}
```

### Resend Voucher (Admin)
**POST** `/vouchers/resend`

Resend voucher to email and phone.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "voucherId": "uuid"
}
```

---

## Application Endpoints

### Submit Application
**POST** `/applications/submit`

Submit complete application form.

**Request Body:**
```json
{
  "voucherCode": "WUC12345678",
  "firstName": "John",
  "lastName": "Doe",
  "otherNames": "Michael",
  "dateOfBirth": "2000-01-15",
  "gender": "male",
  "nationality": "Ghanaian",
  "region": "Greater Accra",
  "hometown": "Accra",
  "email": "john@example.com",
  "phone": "+233241234567",
  "address": "123 Main St, Accra",
  "programChoice": "nursing",
  "previousSchool": "Accra High School",
  "yearCompleted": 2020,
  "guardianName": "Jane Doe",
  "guardianPhone": "+233241234568",
  "guardianEmail": "jane@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "applicationId": "APP123456",
  "message": "Application submitted successfully"
}
```

### Check Application Status
**GET** `/applications/status?searchType=application&searchValue=APP123456`

**Query Parameters:**
- `searchType`: `application`, `email`, or `voucher`
- `searchValue`: Corresponding value

**Response:**
```json
{
  "success": true,
  "application": {
    "application_id": "APP123456",
    "first_name": "John",
    "last_name": "Doe",
    "program_choice": "nursing",
    "status": "pending",
    "submitted_at": "2024-01-15T10:30:00Z",
    "admission_letter_url": null
  }
}
```

### Upload Documents
**POST** `/applications/:applicationId/documents`

Upload required documents (multipart/form-data).

**Form Fields:**
- `photo`: Passport photo (JPG/PNG, max 2MB)
- `birthCert`: Birth certificate (PDF, max 5MB)
- `wassce`: WASSCE certificate (PDF, max 5MB)
- `nmcPin`: NMC Pin for top-up applicants (PDF, max 5MB, optional)
- `recommendation`: Recommendation letter (PDF, max 5MB, optional)

**Response:**
```json
{
  "success": true,
  "message": "Documents uploaded successfully"
}
```

---

## Admin Endpoints

All admin endpoints require authentication.

### Dashboard Statistics
**GET** `/admin/dashboard/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalApplications": 150,
    "pendingApplications": 25,
    "approvedApplications": 100,
    "totalVouchers": 200
  }
}
```

### Get All Applications
**GET** `/admin/applications`

**Response:**
```json
{
  "success": true,
  "applications": [
    {
      "application_id": "APP123456",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "program_choice": "nursing",
      "status": "pending",
      "submitted_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Approve Application
**POST** `/admin/applications/:applicationId/approve`

Approve application and generate admission letter.

**Response:**
```json
{
  "success": true,
  "message": "Application approved and admission letter sent"
}
```

### Get All Vouchers
**GET** `/admin/vouchers`

**Response:**
```json
{
  "success": true,
  "vouchers": [
    {
      "voucher_code": "WUC12345678",
      "email": "john@example.com",
      "phone": "+233241234567",
      "status": "used",
      "created_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **Payment endpoints**: 10 requests per 15 minutes
- **Admin endpoints**: 200 requests per 15 minutes

---

## Webhooks

### Payment Callback
**POST** `/webhooks/payment`

Flutterwave payment webhook for processing completed payments.

---

## Testing with cURL

### Purchase Voucher
```bash
curl -X POST http://localhost:5000/api/vouchers/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+233241234567",
    "paymentMethod": "mtn"
  }'
```

### Check Application Status
```bash
curl "http://localhost:5000/api/applications/status?searchType=application&searchValue=APP123456"
```

### Admin - Get Applications
```bash
curl http://localhost:5000/api/admin/applications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Support

For API support:
- Email: dev@wuc.edu.gh
- Documentation: https://api.wuc.edu.gh/docs
- Status: https://status.wuc.edu.gh

**Withrow University College © 2024**
