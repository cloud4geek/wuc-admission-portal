-- Reset password for existing wuc_admin user
ALTER USER wuc_admin WITH PASSWORD 'wuc123';

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions TO wuc_admin;

-- Connect to wuc_admissions and grant schema privileges
\c wuc_admissions
GRANT ALL ON SCHEMA public TO wuc_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO wuc_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO wuc_admin;
