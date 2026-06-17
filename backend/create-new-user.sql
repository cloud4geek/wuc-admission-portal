-- Run this in pgAdmin Query Tool or any PostgreSQL client you can access

-- Create new user for WUC application
CREATE USER wuc_admin WITH PASSWORD 'wuc123';

-- Create database
CREATE DATABASE wuc_admissions OWNER wuc_admin;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions TO wuc_admin;

-- Connect to wuc_admissions database and grant schema privileges
\c wuc_admissions
GRANT ALL ON SCHEMA public TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO wuc_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO wuc_admin;
