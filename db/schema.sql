-- PostgreSQL Schema for K-3 Repeated Reading App

-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS reading_assignments CASCADE;
DROP TABLE IF EXISTS daily_goals CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_rewards CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS reading_errors CASCADE;
DROP TABLE IF EXISTS reading_sessions CASCADE;
DROP TABLE IF EXISTS reading_materials CASCADE;
DROP TABLE IF EXISTS reading_material_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Create extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schools
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    district VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teachers
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_teachers_school ON teachers(school_id);

-- Users (Students)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(10) NOT NULL CHECK (grade_level IN ('K', '1', '2', '3')),
    date_of_birth DATE,
    avatar_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    parent_email VARCHAR(255),
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    current_points INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX idx_users_teacher ON users(teacher_id);

-- Reading Material Categories
CREATE TABLE reading_material_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Reading Materials
CREATE TABLE reading_materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_text TEXT NOT NULL,
    word_count INTEGER NOT NULL CHECK (word_count > 0),
    difficulty_level SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
    grade_level VARCHAR(10) NOT NULL CHECK (grade_level IN ('K', '1', '2', '3')),
    lexile_score INTEGER,
    category_id INTEGER REFERENCES reading_material_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_reading_materials_category ON reading_materials(category_id);
CREATE INDEX idx_reading_materials_difficulty ON reading_materials(difficulty_level);
CREATE INDEX idx_reading_materials_grade ON reading_materials(grade_level);

-- Reading Sessions
CREATE TABLE reading_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_material_id INTEGER NOT NULL REFERENCES reading_materials(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    words_correct_per_minute INTEGER,
    accuracy_percentage DECIMAL(5,2) CHECK (accuracy_percentage BETWEEN 0 AND 100),
    is_completed BOOLEAN DEFAULT FALSE,
    attempt_number SMALLINT DEFAULT 1,
    words_read INTEGER,
    notes TEXT
);

CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_material ON reading_sessions(reading_material_id);
CREATE INDEX idx_reading_sessions_start_time ON reading_sessions(start_time);

-- Reading Errors
CREATE TABLE reading_errors (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    text_position INTEGER NOT NULL,
    error_word TEXT NOT NULL,
    correct_word TEXT NOT NULL,
    was_corrected BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(50) CHECK (error_type IN ('mispronunciation', 'omission', 'substitution', 'addition', 'repetition', 'hesitation', 'other'))
);

CREATE INDEX idx_reading_errors_session ON reading_errors(session_id);

-- Achievements
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    points_value INTEGER DEFAULT 0,
    requirements JSONB
);

-- User Achievements
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Rewards
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    points_cost INTEGER DEFAULT 0,
    category VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- User Rewards
CREATE TABLE user_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX idx_user_rewards_reward ON user_rewards(reward_id);

-- User Progress
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_reading_level SMALLINT NOT NULL CHECK (current_reading_level BETWEEN 1 AND 10),
    total_minutes_read INTEGER DEFAULT 0,
    total_words_read INTEGER DEFAULT 0,
    highest_wcpm_score INTEGER DEFAULT 0,
    average_wcpm_score DECIMAL(6,2) DEFAULT 0,
    improvement_percentage DECIMAL(6,2) DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
);

CREATE INDEX idx_user_progress_user ON user_progress(user_id);

-- Daily Goals
CREATE TABLE daily_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    UNIQUE (user_id, goal_type, date)
);

CREATE INDEX idx_daily_goals_user ON daily_goals(user_id);
CREATE INDEX idx_daily_goals_date ON daily_goals(date);

-- Reading Assignments
CREATE TABLE reading_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_material_id INTEGER NOT NULL REFERENCES reading_materials(id) ON DELETE CASCADE,
    assigned_by_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_by TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reading_assignments_user ON reading_assignments(user_id);
CREATE INDEX idx_reading_assignments_material ON reading_assignments(reading_material_id);
CREATE INDEX idx_reading_assignments_assigned_by ON reading_assignments(assigned_by_id);
CREATE INDEX idx_reading_assignments_due_by ON reading_assignments(due_by);

-- View for student performance analytics
CREATE OR REPLACE VIEW student_performance_view AS
SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.grade_level,
    up.current_reading_level,
    up.highest_wcpm_score,
    up.average_wcpm_score,
    up.improvement_percentage,
    COUNT(rs.id) AS total_sessions,
    AVG(rs.words_correct_per_minute) AS avg_wcpm_last_30_days
FROM 
    users u
LEFT JOIN 
    user_progress up ON u.id = up.user_id
LEFT JOIN 
    reading_sessions rs ON u.id = rs.user_id AND rs.start_time > (CURRENT_TIMESTAMP - INTERVAL '30 days')
GROUP BY 
    u.id, u.first_name, u.last_name, u.grade_level, 
    up.current_reading_level, up.highest_wcpm_score, up.average_wcpm_score, up.improvement_percentage;

-- Function to calculate improvement between reading attempts
CREATE OR REPLACE FUNCTION calculate_improvement() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attempt_number > 1 THEN
        -- Get previous attempt
        DECLARE prev_wcpm INTEGER;
        BEGIN
            SELECT words_correct_per_minute INTO prev_wcpm
            FROM reading_sessions
            WHERE user_id = NEW.user_id 
            AND reading_material_id = NEW.reading_material_id
            AND attempt_number = NEW.attempt_number - 1;
            
            IF prev_wcpm IS NOT NULL AND prev_wcpm > 0 THEN
                -- Update improvement percentage in user_progress
                UPDATE user_progress
                SET improvement_percentage = ((NEW.words_correct_per_minute - prev_wcpm)::DECIMAL / prev_wcpm) * 100
                WHERE user_id = NEW.user_id;
            END IF;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_reading_session_update
AFTER INSERT OR UPDATE ON reading_sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_improvement();
