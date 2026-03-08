-- Reset Database Script
-- This will drop and recreate the database cleanly
-- Run this in pgAdmin or psql as postgres user

-- Terminate all connections to the database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'school_management'
  AND pid <> pg_backend_pid();

-- Drop the database
DROP DATABASE IF EXISTS school_management;

-- Drop the user if exists
DROP USER IF EXISTS school_admin;

-- Recreate the user
CREATE USER school_admin WITH PASSWORD 'P@$.321';

-- Recreate the database
CREATE DATABASE school_management
    WITH 
    OWNER = school_admin
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_Zambia.1252'
    LC_CTYPE = 'English_Zambia.1252'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE school_management TO school_admin;
