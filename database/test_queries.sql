-- WUC Admission Portal - Database Test Queries
-- Run these in pgAdmin Query Tool

-- 1. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 7 tables (admin_users, applications, audit_logs, documents, notifications, payments, vouchers)

-- 2. Count records in all tables
SELECT 'vouchers' as table_name, COUNT(*) as record_count FROM vouchers
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- 3. View default admin user
SELECT id, username, email, role, is_active, created_at 
FROM admin_users;

-- Expected: 1 admin user (username: admin, email: admin@wuc.edu.gh)

-- 4. View all vouchers (if any)
SELECT voucher_code, first_name, last_name, email, phone, 
       status, amount, created_at, expires_at
FROM vouchers
ORDER BY created_at DESC;

-- 5. View all applications (if any)
SELECT application_id, first_name, last_name, email, 
       program_choice, status, submitted_at
FROM applications
ORDER BY submitted_at DESC;

-- 6. View all documents (if any)
SELECT d.document_type, d.document_name, d.status, 
       a.application_id, a.first_name, a.last_name
FROM documents d
JOIN applications a ON d.application_id = a.id
ORDER BY d.created_at DESC;

-- 7. Check database size
SELECT pg_size_pretty(pg_database_size('wuc_admissions')) as database_size;

-- 8. Test insert voucher (optional)
INSERT INTO vouchers (voucher_code, first_name, last_name, email, phone, payment_method, amount, expires_at)
VALUES ('WUC99999999', 'Test', 'User', 'test@example.com', '+233241234567', 'mtn', 220.00, NOW() + INTERVAL '30 days')
RETURNING *;

-- 9. Delete test voucher (cleanup)
DELETE FROM vouchers WHERE voucher_code = 'WUC99999999';

-- 10. Verify database health
SELECT 
    (SELECT COUNT(*) FROM vouchers) as total_vouchers,
    (SELECT COUNT(*) FROM applications) as total_applications,
    (SELECT COUNT(*) FROM documents) as total_documents,
    (SELECT COUNT(*) FROM admin_users) as total_admins;
