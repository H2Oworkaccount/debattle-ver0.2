-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User stats table (for rankings)
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  debates_count INT DEFAULT 0,
  rating FLOAT DEFAULT 1000,
  win_rate FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debate topics table
CREATE TABLE debate_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_text VARCHAR(500) NOT NULL,
  difficulty VARCHAR(50) DEFAULT 'easy',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debates table (stores debate results)
CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL,
  pro_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  con_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES debate_topics(id),
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pro_score FLOAT,
  con_score FLOAT,
  transcript TEXT,
  analysis TEXT,
  status VARCHAR(50) DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spectator codes table (allows streaming/watching)
CREATE TABLE spectator_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '2 hours'
);

-- Spectators table (tracks who's watching)
CREATE TABLE spectators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spectator_code_id UUID NOT NULL REFERENCES spectator_codes(id) ON DELETE CASCADE,
  viewer_ip VARCHAR(50),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_user_stats_rating ON user_stats(rating DESC);
CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_debates_users ON debates(pro_user_id, con_user_id);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_spectator_codes_room_id ON spectator_codes(room_id);
CREATE INDEX idx_spectator_codes_code ON spectator_codes(code);
CREATE INDEX idx_spectators_code_id ON spectators(spectator_code_id);

-- Insert some sample debate topics
INSERT INTO debate_topics (topic_text, difficulty) VALUES
  ('Getting a brain freeze makes you lose brain cells', 'easy'),
  ('Pokemon cards can make you a millionaire', 'easy'),
  ('Pineapple belongs on pizza', 'easy'),
  ('Cats are better than dogs', 'easy'),
  ('Video games make you smarter', 'medium'),
  ('Social media is good for humanity', 'medium'),
  ('Remote work is more productive than office work', 'medium'),
  ('Artificial Intelligence will replace humans', 'hard'),
  ('Climate change is overblown', 'hard'),
  ('Cryptocurrency is the future of money', 'hard');
