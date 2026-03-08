-- Useful functions and procedures

-- ============================================
-- FUNCTION: Calculate Grade from Marks
-- ============================================
CREATE OR REPLACE FUNCTION calculate_grade(marks NUMERIC)
RETURNS VARCHAR(5) AS $$
BEGIN
    IF marks >= 90 THEN
        RETURN 'A+';
    ELSIF marks >= 80 THEN
        RETURN 'A';
    ELSIF marks >= 70 THEN
        RETURN 'B';
    ELSIF marks >= 60 THEN
        RETURN 'C';
    ELSIF marks >= 50 THEN
        RETURN 'D';
    ELSE
        RETURN 'F';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Get Student Full Name
-- ============================================
CREATE OR REPLACE FUNCTION get_student_full_name(student_id INTEGER)
RETURNS VARCHAR(255) AS $$
DECLARE
    full_name VARCHAR(255);
BEGIN
    SELECT first_name || ' ' || last_name INTO full_name
    FROM students
    WHERE id = student_id;
    
    RETURN full_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get Active Term
-- ============================================
CREATE OR REPLACE FUNCTION get_active_term()
RETURNS INTEGER AS $$
DECLARE
    term_id INTEGER;
BEGIN
    SELECT id INTO term_id
    FROM terms
    WHERE is_active = TRUE
    LIMIT 1;
    
    RETURN term_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Calculate Student Average
-- ============================================
CREATE OR REPLACE FUNCTION calculate_student_average(
    p_student_id INTEGER,
    p_term_id INTEGER
)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    avg_marks NUMERIC(5,2);
BEGIN
    SELECT AVG(marks) INTO avg_marks
    FROM marks
    WHERE student_id = p_student_id
    AND term_id = p_term_id;
    
    RETURN COALESCE(avg_marks, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get Class Ranking
-- ============================================
CREATE OR REPLACE FUNCTION get_class_ranking(
    p_class_id INTEGER,
    p_term_id INTEGER
)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR(255),
    average_marks NUMERIC(5,2),
    rank_position INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH student_averages AS (
        SELECT 
            s.id,
            s.first_name || ' ' || s.last_name as name,
            AVG(m.marks) as avg_marks
        FROM students s
        JOIN marks m ON s.id = m.student_id
        WHERE s.class_assigned_id = p_class_id
        AND m.term_id = p_term_id
        GROUP BY s.id, s.first_name, s.last_name
    )
    SELECT 
        id,
        name,
        avg_marks,
        ROW_NUMBER() OVER (ORDER BY avg_marks DESC)::INTEGER as rank_position
    FROM student_averages
    ORDER BY avg_marks DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get Attendance Percentage
-- ============================================
CREATE OR REPLACE FUNCTION get_attendance_percentage(
    p_student_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    total_days INTEGER;
    present_days INTEGER;
    percentage NUMERIC(5,2);
BEGIN
    SELECT COUNT(*) INTO total_days
    FROM attendance
    WHERE student_id = p_student_id
    AND date BETWEEN p_start_date AND p_end_date;
    
    SELECT COUNT(*) INTO present_days
    FROM attendance
    WHERE student_id = p_student_id
    AND date BETWEEN p_start_date AND p_end_date
    AND status IN ('present', 'late');
    
    IF total_days = 0 THEN
        RETURN 0;
    END IF;
    
    percentage := (present_days::NUMERIC / total_days::NUMERIC) * 100;
    RETURN ROUND(percentage, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-calculate grade on mark insert/update
-- ============================================
CREATE OR REPLACE FUNCTION auto_calculate_grade()
RETURNS TRIGGER AS $$
BEGIN
    NEW.grade := calculate_grade(NEW.marks);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_grade
BEFORE INSERT OR UPDATE ON marks
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_grade();

-- ============================================
-- TRIGGER: Ensure only one active term
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_active_term()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE terms SET is_active = FALSE WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_active_term
AFTER INSERT OR UPDATE ON terms
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION ensure_single_active_term();

-- ============================================
-- TRIGGER: Ensure only one default template
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE report_templates SET is_default = FALSE WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_template
AFTER INSERT OR UPDATE ON report_templates
FOR EACH ROW
WHEN (NEW.is_default = TRUE)
EXECUTE FUNCTION ensure_single_default_template();
