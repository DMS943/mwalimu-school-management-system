@echo off
REM Complete database setup script for Windows
REM Run this to set up everything at once

echo ==========================================
echo School Management System - Database Setup
echo ==========================================
echo.

echo Step 1: Creating database and user...
psql -U postgres -f 01_create_database.sql

if %ERRORLEVEL% NEQ 0 (
    echo Error creating database
    exit /b 1
)

echo.
echo Step 2: Creating tables...
psql -U postgres -d school_management -f 02_create_tables.sql

if %ERRORLEVEL% NEQ 0 (
    echo Error creating tables
    exit /b 1
)

echo.
echo Step 3: Granting privileges...
psql -U postgres -d school_management -f 01b_grant_privileges.sql

if %ERRORLEVEL% NEQ 0 (
    echo Error granting privileges
    exit /b 1
)

echo.
echo Step 4: Creating functions and triggers...
psql -U postgres -d school_management -f 04_functions.sql

if %ERRORLEVEL% NEQ 0 (
    echo Error creating functions
    exit /b 1
)

echo.
set /p SAMPLE_DATA="Do you want to insert sample data? (y/n): "
if /i "%SAMPLE_DATA%"=="y" (
    echo Step 5: Inserting sample data...
    psql -U postgres -d school_management -f 03_sample_data.sql
)

echo.
echo ==========================================
echo Database setup complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Update backend/.env with database credentials
echo 2. Run Django migrations: python manage.py migrate
echo 3. Create superuser: python manage.py createsuperuser
echo 4. Start server: python manage.py runserver

pause
