-- Sample Zambian Data for School Management System
-- Run this after migrations: python manage.py migrate
-- Note: This uses Django's database, so run via pgAdmin or psql

-- ============================================
-- 1. ACADEMIC TERMS
-- ============================================
INSERT INTO terms (name, start_date, end_date, is_active, created_at) VALUES
('Term 1 2024', '2024-01-15', '2024-04-12', true, NOW()),
('Term 2 2024', '2024-05-06', '2024-08-16', false, NOW()),
('Term 3 2024', '2024-09-02', '2024-12-06', false, NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. DEPARTMENTS (without HOD first)
-- ============================================
INSERT INTO departments (id, name, description, head_of_department_id, created_at) VALUES
(1, 'Mathematics', 'Mathematics and Statistics Department', NULL, NOW()),
(2, 'Sciences', 'Natural Sciences Department', NULL, NOW()),
(3, 'Languages', 'Languages and Literature Department', NULL, NOW()),
(4, 'Social Studies', 'Social Sciences and Humanities', NULL, NOW()),
(5, 'Creative Arts', 'Arts, Music and Physical Education', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for departments
SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));

-- ============================================
-- 3. USERS (Teachers and Staff)
-- ============================================
-- Note: Passwords need to be hashed properly via Django
-- For now, use Django admin or management command to set passwords
INSERT INTO users (id, username, password, email, full_name, role, department_id, is_active, is_staff, is_superuser, date_joined, created_at, first_name, last_name) VALUES
-- Teachers
(10, 'cmwamba', 'pbkdf2_sha256$600000$salt$hash', 'c.mwamba@lusakaboys.edu.zm', 'Chanda Mwamba', 'teacher', 1, true, true, false, NOW(), NOW(), 'Chanda', 'Mwamba'),
(11, 'kmulenga', 'pbkdf2_sha256$600000$salt$hash', 'k.mulenga@lusakaboys.edu.zm', 'Kabwe Mulenga', 'teacher', 1, true, true, false, NOW(), NOW(), 'Kabwe', 'Mulenga'),
(12, 'tbanda', 'pbkdf2_sha256$600000$salt$hash', 't.banda@lusakaboys.edu.zm', 'Thandiwe Banda', 'teacher', 2, true, true, false, NOW(), NOW(), 'Thandiwe', 'Banda'),
(13, 'pphiri', 'pbkdf2_sha256$600000$salt$hash', 'p.phiri@lusakaboys.edu.zm', 'Patrick Phiri', 'teacher', 2, true, true, false, NOW(), NOW(), 'Patrick', 'Phiri'),
(14, 'mchilufya', 'pbkdf2_sha256$600000$salt$hash', 'm.chilufya@lusakaboys.edu.zm', 'Mutale Chilufya', 'teacher', 3, true, true, false, NOW(), NOW(), 'Mutale', 'Chilufya'),
(15, 'nsakala', 'pbkdf2_sha256$600000$salt$hash', 'n.sakala@lusakaboys.edu.zm', 'Natasha Sakala', 'teacher', 3, true, true, false, NOW(), NOW(), 'Natasha', 'Sakala'),
(16, 'jzulu', 'pbkdf2_sha256$600000$salt$hash', 'j.zulu@lusakaboys.edu.zm', 'Joseph Zulu', 'teacher', 4, true, true, false, NOW(), NOW(), 'Joseph', 'Zulu'),
(17, 'schisanga', 'pbkdf2_sha256$600000$salt$hash', 's.chisanga@lusakaboys.edu.zm', 'Sarah Chisanga', 'teacher', 4, true, true, false, NOW(), NOW(), 'Sarah', 'Chisanga'),
(18, 'lkunda', 'pbkdf2_sha256$600000$salt$hash', 'l.kunda@lusakaboys.edu.zm', 'Lweendo Kunda', 'teacher', 5, true, true, false, NOW(), NOW(), 'Lweendo', 'Kunda'),
(19, 'bmwape', 'pbkdf2_sha256$600000$salt$hash', 'b.mwape@lusakaboys.edu.zm', 'Bwalya Mwape', 'teacher', 5, true, true, false, NOW(), NOW(), 'Bwalya', 'Mwape'),
-- Head of Departments
(20, 'dmusonda', 'pbkdf2_sha256$600000$salt$hash', 'd.musonda@lusakaboys.edu.zm', 'David Musonda', 'hod', 1, true, true, false, NOW(), NOW(), 'David', 'Musonda'),
(21, 'esimukoko', 'pbkdf2_sha256$600000$salt$hash', 'e.simukoko@lusakaboys.edu.zm', 'Elizabeth Simukoko', 'hod', 2, true, true, false, NOW(), NOW(), 'Elizabeth', 'Simukoko'),
-- Head Teacher
(22, 'rnkhata', 'pbkdf2_sha256$600000$salt$hash', 'r.nkhata@lusakaboys.edu.zm', 'Robert Nkhata', 'headteacher', NULL, true, true, false, NOW(), NOW(), 'Robert', 'Nkhata'),
-- Parent Users
(23, 'pmbewe', 'pbkdf2_sha256$600000$salt$hash', 'p.mbewe@gmail.com', 'Peter Mbewe', 'parent', NULL, true, false, false, NOW(), NOW(), 'Peter', 'Mbewe'),
(24, 'gkambole', 'pbkdf2_sha256$600000$salt$hash', 'g.kambole@gmail.com', 'Grace Kambole', 'parent', NULL, true, false, false, NOW(), NOW(), 'Grace', 'Kambole'),
(25, 'jlubasi', 'pbkdf2_sha256$600000$salt$hash', 'j.lubasi@gmail.com', 'John Lubasi', 'parent', NULL, true, false, false, NOW(), NOW(), 'John', 'Lubasi')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Update departments with HODs
UPDATE departments SET head_of_department_id = 20 WHERE id = 1;
UPDATE departments SET head_of_department_id = 21 WHERE id = 2;

-- ============================================
-- 4. SUBJECTS
-- ============================================
INSERT INTO subjects (name, code, department_id, created_at) VALUES
-- Mathematics
('Mathematics', 'MATH', 1, NOW()),
('Additional Mathematics', 'ADDMATH', 1, NOW()),
('Statistics', 'STATS', 1, NOW()),
-- Sciences
('Physics', 'PHYS', 2, NOW()),
('Chemistry', 'CHEM', 2, NOW()),
('Biology', 'BIO', 2, NOW()),
('General Science', 'GSCI', 2, NOW()),
-- Languages
('English Language', 'ENG', 3, NOW()),
('Literature in English', 'LIT', 3, NOW()),
('Bemba', 'BEMBA', 3, NOW()),
-- Social Studies
('History', 'HIST', 4, NOW()),
('Geography', 'GEO', 4, NOW()),
('Civic Education', 'CIV', 4, NOW()),
('Religious Education', 'RE', 4, NOW()),
-- Creative Arts
('Art and Design', 'ART', 5, NOW()),
('Music', 'MUSIC', 5, NOW()),
('Physical Education', 'PE', 5, NOW()),
('Computer Studies', 'COMP', 5, NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 5. CLASSES
-- ============================================
INSERT INTO classes (id, name, grade_level, department_id, class_teacher, class_teacher_id, created_at) VALUES
(1, '8A', 8, 1, 'Chanda Mwamba', 10, NOW()),
(2, '8B', 8, 2, 'Thandiwe Banda', 12, NOW()),
(3, '9A', 9, 1, 'Kabwe Mulenga', 11, NOW()),
(4, '9B', 9, 3, 'Mutale Chilufya', 14, NOW()),
(5, '10A', 10, 2, 'Patrick Phiri', 13, NOW()),
(6, '10B', 10, 4, 'Joseph Zulu', 16, NOW()),
(7, '11A', 11, 1, 'David Musonda', 20, NOW()),
(8, '11B', 11, 3, 'Natasha Sakala', 15, NOW()),
(9, '12A', 12, 2, 'Elizabeth Simukoko', 21, NOW()),
(10, '12B', 12, 4, 'Sarah Chisanga', 17, NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for classes
SELECT setval('classes_id_seq', (SELECT MAX(id) FROM classes));

-- ============================================
-- 6. STUDENTS
-- ============================================
INSERT INTO students (student_number, first_name, last_name, date_of_birth, gender, address, guardian_name, guardian_phone, guardian_email, class_assigned_id, parent_user_id, is_active, created_at, updated_at) VALUES
-- Grade 8 Students
('LBS2024001', 'Mwansa', 'Chanda', '2010-03-15', 'M', 'Kabulonga, Lusaka', 'Peter Mbewe', '+260977123456', 'p.mbewe@gmail.com', 1, 23, true, NOW(), NOW()),
('LBS2024002', 'Chipo', 'Banda', '2010-05-22', 'F', 'Chelston, Lusaka', 'Grace Kambole', '+260966234567', 'g.kambole@gmail.com', 1, 24, true, NOW(), NOW()),
('LBS2024003', 'Kabwe', 'Mulenga', '2010-07-10', 'M', 'Woodlands, Lusaka', 'John Lubasi', '+260955345678', 'j.lubasi@gmail.com', 1, 25, true, NOW(), NOW()),
('LBS2024004', 'Natasha', 'Phiri', '2010-02-18', 'F', 'Roma, Lusaka', 'Mary Phiri', '+260977456789', 'mary.phiri@gmail.com', 2, NULL, true, NOW(), NOW()),
('LBS2024005', 'Bwalya', 'Zulu', '2010-09-05', 'M', 'Kalingalinga, Lusaka', 'James Zulu', '+260966567890', 'j.zulu@gmail.com', 2, NULL, true, NOW(), NOW()),
('LBS2024006', 'Mutale', 'Sakala', '2010-11-30', 'F', 'Mtendere, Lusaka', 'Susan Sakala', '+260955678901', 's.sakala@gmail.com', 2, NULL, true, NOW(), NOW()),

-- Grade 9 Students
('LBS2024007', 'Chanda', 'Musonda', '2009-04-12', 'M', 'Chilenje, Lusaka', 'Patrick Musonda', '+260977789012', 'p.musonda@gmail.com', 3, NULL, true, NOW(), NOW()),
('LBS2024008', 'Thandiwe', 'Nkhata', '2009-06-25', 'F', 'Kamwala, Lusaka', 'Ruth Nkhata', '+260966890123', 'r.nkhata@gmail.com', 3, NULL, true, NOW(), NOW()),
('LBS2024009', 'Joseph', 'Chilufya', '2009-08-14', 'M', 'Garden, Lusaka', 'David Chilufya', '+260955901234', 'd.chilufya@gmail.com', 3, NULL, true, NOW(), NOW()),
('LBS2024010', 'Lweendo', 'Kunda', '2009-01-20', 'F', 'Libala, Lusaka', 'Grace Kunda', '+260977012345', 'g.kunda@gmail.com', 4, NULL, true, NOW(), NOW()),
('LBS2024011', 'Patrick', 'Mwape', '2009-03-08', 'M', 'Matero, Lusaka', 'John Mwape', '+260966123456', 'j.mwape@gmail.com', 4, NULL, true, NOW(), NOW()),
('LBS2024012', 'Sarah', 'Simukoko', '2009-10-17', 'F', 'Ngombe, Lusaka', 'Elizabeth Simukoko', '+260955234567', 'e.simukoko@gmail.com', 4, NULL, true, NOW(), NOW()),

-- Grade 10 Students
('LBS2024013', 'David', 'Chisanga', '2008-05-03', 'M', 'Olympia, Lusaka', 'Michael Chisanga', '+260977345678', 'm.chisanga@gmail.com', 5, NULL, true, NOW(), NOW()),
('LBS2024014', 'Elizabeth', 'Mbewe', '2008-07-19', 'F', 'Meanwood, Lusaka', 'Peter Mbewe', '+260966456789', 'p.mbewe2@gmail.com', 5, NULL, true, NOW(), NOW()),
('LBS2024015', 'Robert', 'Banda', '2008-09-28', 'M', 'Avondale, Lusaka', 'Joseph Banda', '+260955567890', 'j.banda@gmail.com', 5, NULL, true, NOW(), NOW()),
('LBS2024016', 'Grace', 'Zulu', '2008-02-11', 'F', 'Northmead, Lusaka', 'Sarah Zulu', '+260977678901', 's.zulu@gmail.com', 6, NULL, true, NOW(), NOW()),
('LBS2024017', 'John', 'Phiri', '2008-04-22', 'M', 'Emmasdale, Lusaka', 'Patrick Phiri', '+260966789012', 'p.phiri2@gmail.com', 6, NULL, true, NOW(), NOW()),
('LBS2024018', 'Mary', 'Mulenga', '2008-11-05', 'F', 'Kabwata, Lusaka', 'Grace Mulenga', '+260955890123', 'g.mulenga@gmail.com', 6, NULL, true, NOW(), NOW()),

-- Grade 11 Students
('LBS2024019', 'Peter', 'Musonda', '2007-06-15', 'M', 'Rhodes Park, Lusaka', 'David Musonda', '+260977901234', 'd.musonda2@gmail.com', 7, NULL, true, NOW(), NOW()),
('LBS2024020', 'Ruth', 'Nkhata', '2007-08-30', 'F', 'Longacres, Lusaka', 'Robert Nkhata', '+260966012345', 'r.nkhata2@gmail.com', 7, NULL, true, NOW(), NOW()),
('LBS2024021', 'James', 'Chilufya', '2007-10-12', 'M', 'Fairview, Lusaka', 'Joseph Chilufya', '+260955123456', 'j.chilufya@gmail.com', 7, NULL, true, NOW(), NOW()),
('LBS2024022', 'Susan', 'Kunda', '2007-03-25', 'F', 'Kalundu, Lusaka', 'John Kunda', '+260977234567', 'j.kunda@gmail.com', 8, NULL, true, NOW(), NOW()),
('LBS2024023', 'Michael', 'Mwape', '2007-05-18', 'M', 'Lilayi, Lusaka', 'Peter Mwape', '+260966345678', 'p.mwape@gmail.com', 8, NULL, true, NOW(), NOW()),
('LBS2024024', 'Joyce', 'Simukoko', '2007-12-08', 'F', 'Makeni, Lusaka', 'David Simukoko', '+260955456789', 'd.simukoko@gmail.com', 8, NULL, true, NOW(), NOW()),

-- Grade 12 Students
('LBS2024025', 'Daniel', 'Chisanga', '2006-07-20', 'M', 'Chainda, Lusaka', 'Sarah Chisanga', '+260977567890', 's.chisanga@gmail.com', 9, NULL, true, NOW(), NOW()),
('LBS2024026', 'Faith', 'Mbewe', '2006-09-14', 'F', 'Chamba Valley, Lusaka', 'Grace Mbewe', '+260966678901', 'g.mbewe@gmail.com', 9, NULL, true, NOW(), NOW()),
('LBS2024027', 'George', 'Banda', '2006-11-22', 'M', 'Chelstone, Lusaka', 'Patrick Banda', '+260955789012', 'p.banda@gmail.com', 9, NULL, true, NOW(), NOW()),
('LBS2024028', 'Helen', 'Zulu', '2006-04-05', 'F', 'Chawama, Lusaka', 'John Zulu', '+260977890123', 'j.zulu2@gmail.com', 10, NULL, true, NOW(), NOW()),
('LBS2024029', 'Isaac', 'Phiri', '2006-06-18', 'M', 'George, Lusaka', 'David Phiri', '+260966901234', 'd.phiri@gmail.com', 10, NULL, true, NOW(), NOW()),
('LBS2024030', 'Jane', 'Mulenga', '2006-08-27', 'F', 'Kanyama, Lusaka', 'Mary Mulenga', '+260955012345', 'm.mulenga@gmail.com', 10, NULL, true, NOW(), NOW())
ON CONFLICT (student_number) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Sample data loaded successfully!';
    RAISE NOTICE 'Created: % terms, % departments, % subjects, % classes, % students', 
        (SELECT COUNT(*) FROM terms),
        (SELECT COUNT(*) FROM departments),
        (SELECT COUNT(*) FROM subjects),
        (SELECT COUNT(*) FROM classes),
        (SELECT COUNT(*) FROM students);
    RAISE NOTICE 'Note: User passwords are not properly hashed. Use Django admin to set passwords.';
END $$;
