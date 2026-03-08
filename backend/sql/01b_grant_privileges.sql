-- Grant schema privileges
-- Run this AFTER creating tables, connected to school_management database
-- Usage: psql -U postgres -d school_management -f 01b_grant_privileges.sql

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO school_admin;

-- Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO school_admin;

-- Grant privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO school_admin;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO school_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO school_admin;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO school_admin;
