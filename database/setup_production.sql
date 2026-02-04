-- Production Database Setup Script
-- Run this script to create production database and user

-- Create production database
CREATE DATABASE wuc_admissions_prod;

-- Create dedicated user for the application
CREATE USER wuc_admin WITH PASSWORD 'wuc1234';

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions_prod TO wuc_admin;

-- Connect to the production database
\c wuc_admissions_prod;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO wuc_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wuc_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wuc_admin;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO wuc_admin;