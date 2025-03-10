// School model
export interface School {
  id: number;
  name: string;
  address?: string;
  district?: string;
  created_at: Date;
}

// Teacher model
export interface Teacher {
  id: number;
  username: string;
  password_hash?: string; // Only used internally, should not be exposed to client
  first_name: string;
  last_name: string;
  email: string;
  school_id?: number; // Optional as it can be null
  created_at: Date;
}

// User (Student) model
export interface User {
  id: number;
  username: string;
  password_hash?: string; // Only used internally, should not be exposed to client
  first_name: string;
  last_name: string;
  teacher_id?: number; // Optional as it can be null
  grade_level: number;
  avatar?: string;
  created_at: Date;
}

// Reading Material Category model
export interface ReadingMaterialCategory {
  id: number;
  name: string;
  description?: string;
}

// Reading Material model
export interface ReadingMaterial {
  id: number;
  title: string;
  content: string;
  category_id: number;
  author?: string;
  difficulty_level: number;
  word_count: number;
  grade_level: number;
  created_at: Date;
}

// Reading Session model
export interface ReadingSession {
  id: number;
  user_id: number;
  reading_material_id: number;
  start_time: Date;
  end_time?: Date;
  words_read: number;
  accuracy_percentage: number;
  words_correct_per_minute: number;
  is_completed: boolean;
  notes?: string;
  created_at: Date;
}

// Reading Error model
export interface ReadingError {
  id: number;
  session_id: number;
  word: string;
  context: string;
  position_in_text: number;
  error_type: string;
  created_at: Date;
}

// Achievement model
export interface Achievement {
  id: number;
  name: string;
  description: string;
  criteria: string;
  points: number;
  badge_image_url?: string;
  created_at: Date;
}

// User Achievement model
export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  earned_at: Date;
  created_at: Date;
}

// Reward model
export interface Reward {
  id: number;
  name: string;
  description: string;
  point_cost: number;
  image_url?: string;
  is_active: boolean;
  created_at: Date;
}

// User Reward model
export interface UserReward {
  id: number;
  user_id: number;
  reward_id: number;
  redeemed_at: Date;
  created_at: Date;
}

// User Progress model
export interface UserProgress {
  id: number;
  user_id: number;
  total_minutes_read: number;
  total_words_read: number;
  average_wcpm: number;
  current_level: number;
  total_points: number;
  streak_days: number;
  last_activity_date: Date;
  created_at: Date;
  updated_at: Date;
}

// Daily Goal model
export interface DailyGoal {
  id: number;
  user_id: number;
  date: Date;
  target_minutes: number;
  target_words: number;
  is_achieved: boolean;
  actual_minutes?: number;
  actual_words?: number;
  created_at: Date;
}

// Reading Assignment model
export interface ReadingAssignment {
  id: number;
  user_id: number;
  reading_material_id: number;
  assigned_by_id: number;
  assigned_at: Date;
  due_by: Date;
  is_completed: boolean;
  completed_at?: Date;
  notes?: string;
  created_at: Date;
} 