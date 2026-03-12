-- Create schedules table manually
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    class_assigned_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    term_id INTEGER REFERENCES terms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_assigned_id, day_of_week, start_time, term_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON schedules(class_assigned_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_time ON schedules(day_of_week, start_time);

-- Insert sample schedule data
INSERT INTO schedules (class_assigned_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, term_id) VALUES
-- Get IDs from existing data
(1, 1, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'monday', '08:00:00', '09:00:00', 'Room 101', 1),
(1, 2, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'monday', '09:00:00', '10:00:00', 'Room 102', 1),
(1, 3, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'tuesday', '08:00:00', '09:00:00', 'Room 103', 1),
(1, 1, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'wednesday', '10:00:00', '11:00:00', 'Room 101', 1),
(1, 2, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'friday', '14:00:00', '15:00:00', 'Room 102', 1)
ON CONFLICT (class_assigned_id, day_of_week, start_time, term_id) DO NOTHING;

-- Show results
SELECT 
    s.day_of_week,
    s.start_time,
    s.end_time,
    sub.name as subject_name,
    c.name as class_name,
    s.room
FROM schedules s
JOIN subjects sub ON s.subject_id = sub.id
JOIN classes c ON s.class_assigned_id = c.id
ORDER BY s.day_of_week, s.start_time;