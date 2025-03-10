-- Development Seed Data for K-3 Repeated Reading App
-- Make sure to run this after schema.sql

-- Clean existing data (if any)
TRUNCATE TABLE user_rewards, rewards, 
             user_achievements, achievements, 
             reading_errors, reading_sessions, 
             reading_assignments, daily_goals, 
             user_progress, reading_materials, 
             reading_material_categories, users, 
             teachers, schools CASCADE;

-- Reset sequences
ALTER SEQUENCE schools_id_seq RESTART WITH 1;
ALTER SEQUENCE teachers_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE reading_material_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE reading_materials_id_seq RESTART WITH 1;
ALTER SEQUENCE reading_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE reading_errors_id_seq RESTART WITH 1;
ALTER SEQUENCE achievements_id_seq RESTART WITH 1;
ALTER SEQUENCE user_achievements_id_seq RESTART WITH 1;
ALTER SEQUENCE rewards_id_seq RESTART WITH 1;
ALTER SEQUENCE user_rewards_id_seq RESTART WITH 1;
ALTER SEQUENCE user_progress_id_seq RESTART WITH 1;
ALTER SEQUENCE daily_goals_id_seq RESTART WITH 1;
ALTER SEQUENCE reading_assignments_id_seq RESTART WITH 1;

-- Seed data for schools
INSERT INTO schools (name, address, district) VALUES 
('Lincoln Elementary', '123 Education St, Springfield, IL', 'Springfield District 1'),
('Washington Primary', '456 Learning Ave, Springfield, IL', 'Springfield District 1'),
('Jefferson Academy', '789 Knowledge Blvd, Shelbyville, IL', 'Shelbyville District 2');

-- Seed data for teachers
INSERT INTO teachers (username, password_hash, first_name, last_name, email, school_id) VALUES 
('jsmith', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'John', 'Smith', 'jsmith@school.edu', 1),
('mjohnson', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Mary', 'Johnson', 'mjohnson@school.edu', 1),
('bwilliams', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Bob', 'Williams', 'bwilliams@school.edu', 2),
('lbrown', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Lisa', 'Brown', 'lbrown@school.edu', 3);

-- Seed data for users (students)
INSERT INTO users (username, password_hash, first_name, last_name, grade_level, date_of_birth, teacher_id, current_points) VALUES 
('alex123', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Alex', 'Adams', 'K', '2018-05-12', 1, 120),
('bella456', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Bella', 'Baker', 'K', '2018-07-23', 1, 85),
('carlos789', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Carlos', 'Cruz', '1', '2017-03-15', 1, 150),
('diana101', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Diana', 'Davis', '1', '2017-09-30', 2, 200),
('ethan202', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Ethan', 'Evans', '2', '2016-11-08', 2, 175),
('fiona303', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Fiona', 'Fisher', '2', '2016-02-29', 3, 135),
('greg404', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Greg', 'Garcia', '3', '2015-06-18', 3, 225),
('hannah505', '$2a$10$xDbsGUkX9jU3FlRglni3T.9F.cM8fS5iJHzYnBw.iBURCC2eiVxaW', 'Hannah', 'Hill', '3', '2015-12-05', 3, 190);

-- Seed data for reading material categories
INSERT INTO reading_material_categories (name, description) VALUES 
('Fiction', 'Fictional stories, fairy tales, and adventures'),
('Non-fiction', 'Factual texts about science, history, and the world'),
('Poetry', 'Poems, rhymes, and verses'),
('Science', 'Texts about scientific concepts and discoveries'),
('History', 'Texts about historical events and figures');

-- Seed data for reading materials
INSERT INTO reading_materials (title, content_text, word_count, difficulty_level, grade_level, lexile_score, category_id) VALUES 
('The Happy Cat', 'The cat is happy. The cat likes to play. The cat jumps and runs all day.', 20, 1, 'K', 100, 1),
('My Family', 'This is my family. I have a mom. I have a dad. I have a dog. We play together.', 22, 1, 'K', 120, 1),
('The Big Tree', 'A big tree is in the park. Birds live in the tree. Squirrels climb the tree. The tree has green leaves.', 25, 2, 'K', 150, 1),
('All About Frogs', 'Frogs are green. Frogs jump. Frogs eat bugs. Frogs live in ponds. Baby frogs are called tadpoles.', 20, 2, '1', 200, 2),
('The Lost Key', 'Tom lost his key. He looked under the bed. He looked in his bag. He looked on the table. The key was in his pocket!', 30, 3, '1', 250, 1),
('Our Solar System', 'Our solar system has eight planets. The sun is a star. Earth is the third planet from the sun. We live on Earth.', 28, 3, '1', 300, 4),
('The Brave Knight', 'Once there was a brave knight. He protected the kingdom. He fought a dragon. The knight saved the princess. Everyone was happy.', 25, 4, '2', 350, 1),
('American Symbols', 'The flag has stars and stripes. The eagle is a symbol too. The Liberty Bell is old. These symbols are important to America.', 30, 4, '2', 380, 5),
('The Weather', 'Weather can change. It can be sunny. It can be rainy. It can be windy. It can be snowy. What weather do you like?', 30, 5, '2', 400, 2),
('Dinosaur World', 'Dinosaurs lived long ago. Some dinosaurs were big. Some dinosaurs were small. T-Rex had sharp teeth. Triceratops had three horns.', 30, 5, '3', 450, 4),
('The Mystery Box', 'Max found a box. The box was locked. What was inside? Max found a key. He opened the box. Inside was a map to treasure!', 35, 6, '3', 500, 1),
('The Water Cycle', 'Water goes up into the sky. It forms clouds. The clouds make rain. The rain falls down. This is called the water cycle.', 30, 6, '3', 520, 4),
('Space Explorers', 'Astronauts explore space. They wear special suits. They travel in rockets. They study the moon and stars. Space exploration is exciting!', 25, 7, '3', 550, 4);

-- Seed data for user progress
INSERT INTO user_progress (user_id, current_reading_level, total_minutes_read, total_words_read, highest_wcpm_score, average_wcpm_score) VALUES 
(1, 1, 60, 300, 15, 12.5),
(2, 1, 45, 200, 12, 10.0),
(3, 2, 90, 500, 25, 22.0),
(4, 3, 120, 800, 35, 30.0),
(5, 4, 150, 1200, 45, 40.0),
(6, 4, 135, 1000, 40, 35.0),
(7, 5, 180, 1500, 60, 55.0),
(8, 6, 200, 1800, 70, 65.0);

-- Seed data for reading sessions
INSERT INTO reading_sessions (user_id, reading_material_id, start_time, end_time, duration_seconds, words_correct_per_minute, accuracy_percentage, is_completed, attempt_number, words_read) VALUES 
(1, 1, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '5 minutes', 300, 12, 85.0, TRUE, 1, 20),
(1, 1, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '4 minutes', 240, 15, 90.0, TRUE, 2, 20),
(2, 2, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '6 minutes', 360, 10, 80.0, TRUE, 1, 22),
(3, 4, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '4 minutes', 240, 20, 88.0, TRUE, 1, 20),
(3, 4, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes', 180, 25, 92.0, TRUE, 2, 20),
(4, 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '5 minutes', 300, 30, 90.0, TRUE, 1, 30),
(5, 7, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '4 minutes', 240, 40, 92.0, TRUE, 1, 25),
(5, 7, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '3 minutes', 180, 45, 95.0, TRUE, 2, 25),
(6, 8, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes', 300, 35, 90.0, TRUE, 1, 30),
(7, 10, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '4 minutes', 240, 55, 93.0, TRUE, 1, 30),
(7, 10, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', 180, 60, 96.0, TRUE, 2, 30),
(8, 12, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '4 minutes', 240, 65, 94.0, TRUE, 1, 30),
(8, 12, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 minutes', 180, 70, 97.0, TRUE, 2, 30);

-- Seed data for reading errors
INSERT INTO reading_errors (session_id, text_position, error_word, correct_word, was_corrected, error_type) VALUES 
(1, 3, 'hapy', 'happy', FALSE, 'mispronunciation'),
(1, 10, 'run', 'runs', FALSE, 'substitution'),
(2, 3, 'hapy', 'happy', TRUE, 'mispronunciation'),
(3, 8, 'has', 'have', FALSE, 'substitution'),
(3, 15, 'play', 'play together', FALSE, 'omission'),
(4, 5, 'green', 'greeen', FALSE, 'mispronunciation'),
(4, 12, 'bug', 'bugs', FALSE, 'substitution'),
(5, 5, 'green', 'green', TRUE, 'hesitation'),
(6, 8, 'under', '', FALSE, 'hesitation'),
(6, 20, 'table', 'table', TRUE, 'repetition'),
(7, 5, 'was', 'is', FALSE, 'substitution'),
(8, 12, 'important', 'important', TRUE, 'hesitation'),
(9, 8, 'change', 'changing', FALSE, 'substitution'),
(10, 15, 'teeth', 'teeths', FALSE, 'addition'),
(11, 25, 'treasure', 'tresure', FALSE, 'mispronunciation'),
(12, 10, 'clouds', 'cloud', FALSE, 'substitution'),
(13, 5, 'explore', 'explorers', FALSE, 'substitution');

-- Seed data for achievements
INSERT INTO achievements (name, description, image_url, points_value, requirements) VALUES 
('First Timer', 'Completed your first reading session', '/images/achievements/first_timer.png', 10, '{"sessions_completed": 1}'),
('Repeat Reader', 'Read the same text twice', '/images/achievements/repeat_reader.png', 15, '{"repeated_readings": 1}'),
('Book Worm', 'Read 5 different texts', '/images/achievements/book_worm.png', 25, '{"unique_materials": 5}'),
('Speed Demon', 'Reached 30 words per minute', '/images/achievements/speed_demon.png', 30, '{"min_wcpm": 30}'),
('Accuracy Master', 'Achieved 95% accuracy', '/images/achievements/accuracy_master.png', 35, '{"min_accuracy": 95}'),
('Reading Champion', 'Read for a total of 2 hours', '/images/achievements/reading_champion.png', 40, '{"total_minutes": 120}'),
('Word Collector', 'Read 1000 words total', '/images/achievements/word_collector.png', 45, '{"total_words": 1000}'),
('Improvement Star', 'Improved reading speed by 25%', '/images/achievements/improvement_star.png', 50, '{"improvement_percentage": 25}');

-- Seed data for user achievements
INSERT INTO user_achievements (user_id, achievement_id, earned_at) VALUES 
(1, 1, NOW() - INTERVAL '7 days'),
(1, 2, NOW() - INTERVAL '6 days'),
(2, 1, NOW() - INTERVAL '5 days'),
(3, 1, NOW() - INTERVAL '7 days'),
(3, 2, NOW() - INTERVAL '5 days'),
(4, 1, NOW() - INTERVAL '6 days'),
(4, 4, NOW() - INTERVAL '6 days'),
(5, 1, NOW() - INTERVAL '7 days'),
(5, 2, NOW() - INTERVAL '4 days'),
(5, 4, NOW() - INTERVAL '7 days'),
(5, 5, NOW() - INTERVAL '4 days'),
(6, 1, NOW() - INTERVAL '5 days'),
(6, 4, NOW() - INTERVAL '5 days'),
(7, 1, NOW() - INTERVAL '6 days'),
(7, 2, NOW() - INTERVAL '3 days'),
(7, 4, NOW() - INTERVAL '6 days'),
(7, 5, NOW() - INTERVAL '3 days'),
(7, 6, NOW() - INTERVAL '3 days'),
(7, 7, NOW() - INTERVAL '3 days'),
(8, 1, NOW() - INTERVAL '4 days'),
(8, 2, NOW() - INTERVAL '2 days'),
(8, 4, NOW() - INTERVAL '4 days'),
(8, 5, NOW() - INTERVAL '2 days'),
(8, 6, NOW() - INTERVAL '2 days'),
(8, 7, NOW() - INTERVAL '2 days');

-- Seed data for rewards
INSERT INTO rewards (name, description, image_url, points_cost, category, is_available) VALUES 
('Extra Playtime', 'Get 10 minutes of extra playtime', '/images/rewards/playtime.png', 50, 'Privilege', TRUE),
('Digital Sticker', 'Cool digital sticker for your profile', '/images/rewards/sticker.png', 25, 'Digital Item', TRUE),
('Animated Avatar', 'Special animated avatar', '/images/rewards/avatar.png', 75, 'Digital Item', TRUE),
('Game Time', 'Unlock 15 minutes of educational game time', '/images/rewards/game.png', 100, 'Privilege', TRUE),
('Reading Certificate', 'Official reading achievement certificate', '/images/rewards/certificate.png', 150, 'Recognition', TRUE),
('Book Selection', 'Choose the next book for class', '/images/rewards/book.png', 200, 'Privilege', TRUE),
('Digital Trophy', 'Shiny digital trophy for your collection', '/images/rewards/trophy.png', 125, 'Digital Item', TRUE);

-- Seed data for user rewards
INSERT INTO user_rewards (user_id, reward_id, acquired_at, is_active) VALUES 
(1, 1, NOW() - INTERVAL '6 days', TRUE),
(1, 2, NOW() - INTERVAL '5 days', TRUE),
(3, 1, NOW() - INTERVAL '4 days', TRUE),
(4, 2, NOW() - INTERVAL '5 days', TRUE),
(4, 3, NOW() - INTERVAL '3 days', TRUE),
(5, 2, NOW() - INTERVAL '6 days', TRUE),
(5, 4, NOW() - INTERVAL '4 days', TRUE),
(7, 2, NOW() - INTERVAL '5 days', TRUE),
(7, 3, NOW() - INTERVAL '3 days', TRUE),
(7, 4, NOW() - INTERVAL '2 days', TRUE),
(8, 2, NOW() - INTERVAL '3 days', TRUE),
(8, 3, NOW() - INTERVAL '2 days', TRUE),
(8, 5, NOW() - INTERVAL '1 day', TRUE);

-- Seed data for daily goals
INSERT INTO daily_goals (user_id, goal_type, target_value, current_value, date, is_completed) VALUES 
(1, 'reading_minutes', 10, 5, CURRENT_DATE, FALSE),
(1, 'texts_read', 1, 0, CURRENT_DATE, FALSE),
(2, 'reading_minutes', 10, 0, CURRENT_DATE, FALSE),
(3, 'reading_minutes', 15, 10, CURRENT_DATE, FALSE),
(3, 'texts_read', 2, 1, CURRENT_DATE, FALSE),
(4, 'reading_minutes', 15, 15, CURRENT_DATE, TRUE),
(4, 'texts_read', 2, 2, CURRENT_DATE, TRUE),
(5, 'reading_minutes', 20, 15, CURRENT_DATE, FALSE),
(5, 'accuracy_percentage', 90, 92, CURRENT_DATE, TRUE),
(6, 'reading_minutes', 20, 20, CURRENT_DATE, TRUE),
(7, 'reading_minutes', 25, 25, CURRENT_DATE, TRUE),
(7, 'texts_read', 3, 3, CURRENT_DATE, TRUE),
(8, 'reading_minutes', 25, 20, CURRENT_DATE, FALSE),
(8, 'words_read', 100, 90, CURRENT_DATE, FALSE);

-- Seed data for reading assignments
INSERT INTO reading_assignments (user_id, reading_material_id, assigned_by_id, assigned_at, due_by, is_completed, completed_at) VALUES 
(1, 3, 1, NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', FALSE, NULL),
(2, 3, 1, NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', FALSE, NULL),
(3, 6, 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', TRUE, NOW() - INTERVAL '2 days'),
(4, 6, 2, NOW() - INTERVAL '4 days', NOW(), TRUE, NOW() - INTERVAL '1 day'),
(5, 9, 2, NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', FALSE, NULL),
(6, 9, 3, NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', FALSE, NULL),
(7, 13, 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', TRUE, NOW() - INTERVAL '2 days'),
(8, 13, 3, NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', FALSE, NULL); 