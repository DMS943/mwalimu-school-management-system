-- Create database and user
-- Run this as postgres superuser
-- Usage: psql -U postgres -f 01_create_database.sql

-- Create database
CREATE DATABASE school_management;

-- Create user (CHANGE THIS PASSWORD!)
CREATE USER school_admin WITH PASSWORD 'P@$.321';

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE school_management TO school_admin;
