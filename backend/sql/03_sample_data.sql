-- Sample data for testing
-- Run this after creating tables

-- ============================================
-- SCHOOL SETTINGS
-- ============================================
INSERT INTO school_settings (name, school_type, location, contact_email, contact_phone)
VALUES ('ABC Secondary School', 'secondary', 'Lusaka, Zambia', 'info@abcschool.zm', '+260-XXX-XXXX');

-- ============================================
-- DEPARTMENTS
-- ============================================
INSERT INTO departments (name, description) VALUES
('Mathematics', 'Mathematics Department'),
('Sciences', 'Science Department - Physics, Chemistry, Biology'),
('Languages', 'Languages Department - English, Local Languages'),
('Social Studies', 'Social Studies Department - History, Geography'),
('Arts', 'Arts and Creative Studies');

-- ============================================
-- SUBJECTS
-- ============================================
INSERT INTO subjects (name, code, department_id) VALUES
-- Mathematics
('Mathematics', 'MATH', 1),
-- Sciences
('Physics', 'PHY', 2),
('Chemistry', 'CHEM', 2),
('Biology', 'BIO', 2),
('General Science', 'SCI', 2),
-- Languages
('English', 'ENG', 3),
('Local Language', 'LL', 3),
-- Social Studies
('History', 'HIST', 4),
('Geography', 'GEO', 4),
('Civic Education', 'CIV', 4),
-- Others
('Physical Education', 'PE', NULL),
('Computer Studies', 'CS', NULL);

-- ============================================
-- CLASSES (Grades 8-12 for Secondary)
-- ============================================
INSERT INTO classes (name, grade_level) VALUES
('Grade 8A', 8),
('Grade 8B', 8),
('Grade 9A', 9),
('Grade 9B', 9),
('Grade 10A', 10),
('Grade 10B', 10),
('Grade 11A', 11),
('Grade 11B', 11),
('Grade 12A', 12),
('Grade 12B', 12);

-- ============================================
-- TERMS
-- ============================================
INSERT INTO terms (name, start_date, end_date, is_active) VALUES
('Term 1 2024', '2024-01-15', '2024-04-30', TRUE),
('Term 2 2024', '2024-05-15', '2024-08-31', FALSE),
('Term 3 2024', '2024-09-15', '2024-12-15', FALSE);

-- ============================================
-- SAMPLE ADMIN USER
-- Note: Password is 'admin123' hashed with Django's PBKDF2
-- You should create users through Django's createsuperuser command
-- ============================================
-- This is just for reference - use Django management command instead
-- python manage.py createsuperuser

-- ============================================
-- SAMPLE STUDENTS
-- ============================================
INSERT INTO students (student_number, first_name, last_name, date_of_birth, gender, class_assigned_id, guardian_name, guardian_phone, is_active)
VALUES
('S2024001', 'John', 'Banda', '2008-03-15', 'M', 1, 'Mary Banda', '+260-XXX-0001', TRUE),
('S2024002', 'Grace', 'Mwale', '2008-07-22', 'F', 1, 'Peter Mwale', '+260-XXX-0002', TRUE),
('S2024003', 'David', 'Phiri', '2008-11-10', 'M', 1, 'Sarah Phiri', '+260-XXX-0003', TRUE),
('S2024004', 'Ruth', 'Zulu', '2008-05-18', 'F', 2, 'James Zulu', '+260-XXX-0004', TRUE),
('S2024005', 'Moses', 'Tembo', '2008-09-25', 'M', 2, 'Alice Tembo', '+260-XXX-0005', TRUE);

-- ============================================
-- REPORT TEMPLATE
-- ============================================
INSERT INTO report_templates (name, is_default, header_text, show_position, show_attendance, show_grade_scale, grading_scale)
VALUES (
    'Standard Report Card',
    TRUE,
    'ABC Secondary School - Student Report Card',
    TRUE,
    TRUE,
    TRUE,
    '{"A+": "90-100", "A": "80-89", "B": "70-79", "C": "60-69", "D": "50-59", "F": "0-49"}'::jsonb
);

-- ============================================
-- GRADING SCALE REFERENCE
-- ============================================
-- A+ : 90-100
-- A  : 80-89
-- B  : 70-79
-- C  : 60-69
-- D  : 50-59
-- F  : 0-49
