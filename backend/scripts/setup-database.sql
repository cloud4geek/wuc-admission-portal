-- ============================================================
-- WUC Admission & Student Portal — Database Setup (PostgreSQL)
-- Run this ONCE on a fresh server as the postgres superuser:
--   sudo -u postgres psql -f setup-database.sql
-- ============================================================

-- 1. Create the database user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'wuc_admin') THEN
    CREATE ROLE wuc_admin WITH LOGIN PASSWORD 'WUC@Prod2025!Secure' CREATEDB;
    RAISE NOTICE 'Created role wuc_admin';
  ELSE
    RAISE NOTICE 'Role wuc_admin already exists';
  END IF;
END
$$;

-- 2. Create the database
SELECT 'CREATE DATABASE wuc_admissions OWNER wuc_admin'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wuc_admissions')\gexec

-- 3. Connect to the database and set up schema
\c wuc_admissions

-- 4. Create wuc schema owned by wuc_admin
CREATE SCHEMA IF NOT EXISTS wuc AUTHORIZATION wuc_admin;

-- 5. Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA wuc TO wuc_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wuc TO wuc_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA wuc TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA wuc GRANT ALL ON TABLES TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA wuc GRANT ALL ON SEQUENCES TO wuc_admin;

-- 6. Set search path
ALTER DATABASE wuc_admissions SET search_path TO wuc, public;

-- Done! The Node.js auto-migration will create all tables on first server start.
-- ============================================================
-- IMPORTANT: Change the password above before running in production!
-- Generate a strong password: openssl rand -base64 32
-- ============================================================
