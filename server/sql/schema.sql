-- server/sql/schema.sql
-- Full DDL for Forum Project (users, threads, comments, votes, tags, reports, notifications)
-- Run as a DB superuser or a user that can CREATE EXTENSION, SEQUENCE, TABLE, FUNCTION, TRIGGER.
-- ------------------------------------------------------------------------------

-- Extensions (helpful for full-text search and trigram search)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Global numeric id sequence (visible numeric IDs)
CREATE SEQUENCE IF NOT EXISTS global_id_seq START 1000000000;
-- i later discarded this global_id_seq, but keeping it here for reference
CREATE SEQUENCE users_id_seq START WITH 1000000000 OWNED BY users.id;
CREATE SEQUENCE threads_id_seq START WITH 1000000000 OWNED BY threads.id;
CREATE SEQUENCE comments_id_seq START WITH 1000000000 OWNED BY comments.id;
CREATE SEQUENCE votes_id_seq START WITH 1000000000 OWNED BY votes.id;
CREATE SEQUENCE reports_id_seq START WITH 1000000000 OWNED BY reports.id;
CREATE SEQUENCE notifications_id_seq START WITH 1000000000 OWNED BY notifications.id;




-- Utility function to get next global id (optional convenience)
CREATE OR REPLACE FUNCTION next_global_id() RETURNS BIGINT AS $$
BEGIN
  RETURN nextval('global_id_seq');
END;
$$ LANGUAGE plpgsql;

-- Generic timestamp update trigger (sets updated_at = now() on UPDATE)
CREATE OR REPLACE FUNCTION fn_set_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY DEFAULT nextval('global_id_seq'),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  roles TEXT[] NOT NULL DEFAULT ARRAY['user']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TRIGGER trg_users_set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE fn_set_timestamp();

-- altering users table to replace global_id_seq with users_id_seq
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');


-- =========================
-- THREADS (OP posts)
-- =========================
CREATE TABLE IF NOT EXISTS threads (
  id BIGINT PRIMARY KEY DEFAULT nextval('global_id_seq'),
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],   -- quick tags array
  comments_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, archived, deleted
  search_vector tsvector,       -- full-text search vector
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_last_activity ON threads (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_tags ON threads USING GIN (tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_threads_search ON threads USING GIN (search_vector);

CREATE TRIGGER trg_threads_set_timestamp
BEFORE UPDATE ON threads
FOR EACH ROW
EXECUTE PROCEDURE fn_set_timestamp();

-- Trigger function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION fn_threads_update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')), 'A')
    || setweight(to_tsvector('pg_catalog.english', coalesce(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_threads_search_vector
BEFORE INSERT OR UPDATE ON threads
FOR EACH ROW
EXECUTE PROCEDURE fn_threads_update_search_vector();

-- Altering threads table to replace global_id_seq with threads_id_seq
ALTER TABLE threads ALTER COLUMN id SET DEFAULT nextval('threads_id_seq');
global_id_seq

-- =========================
-- TAGS (optional normalized)
-- =========================
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS thread_tags (
  thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, tag_id)
);

-- Index for tag lookups
CREATE INDEX IF NOT EXISTS idx_tag_name ON tags (name);


-- =========================
-- COMMENTS (hierarchical)
-- =========================
CREATE TABLE IF NOT EXISTS comments (
  id BIGINT PRIMARY KEY DEFAULT nextval('global_id_seq'),
  thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  edited BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments (thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments (author_id);

CREATE TRIGGER trg_comments_set_timestamp
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE fn_set_timestamp();


-- When a comment is inserted -> increment threads.comments_count and update last_activity_at
CREATE OR REPLACE FUNCTION fn_inc_comments_count() RETURNS trigger AS $$
BEGIN
  UPDATE threads
  SET comments_count = COALESCE(comments_count,0) + 1,
      last_activity_at = now(),
      updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inc_comments_count
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE PROCEDURE fn_inc_comments_count();

-- When a comment is deleted -> decrement comments_count (only for physical delete)
CREATE OR REPLACE FUNCTION fn_dec_comments_count() RETURNS trigger AS $$
BEGIN
  UPDATE threads
  SET comments_count = GREATEST(COALESCE(comments_count,0) - 1, 0),
      last_activity_at = now(),
      updated_at = now()
  WHERE id = OLD.thread_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dec_comments_count
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE PROCEDURE fn_dec_comments_count();

-- Altering comments table to replace global_id_seq with comments_id_seq
ALTER TABLE comments ALTER COLUMN id SET DEFAULT nextval('comments_id_seq');



-- =========================
-- VOTES
-- =========================
-- post_type: 'thread' or 'comment'
CREATE TABLE IF NOT EXISTS votes (
  id BIGINT PRIMARY KEY DEFAULT nextval('global_id_seq'),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('thread', 'comment')),
  post_id BIGINT NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 0, 1)), -- 0 = removed / neutral
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, post_type, post_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_post ON votes (post_type, post_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes (user_id);

CREATE TRIGGER trg_votes_set_timestamp
BEFORE UPDATE ON votes
FOR EACH ROW
EXECUTE PROCEDURE fn_set_timestamp();

-- Refresh aggregated score on post when votes change (insert/update/delete)
CREATE OR REPLACE FUNCTION fn_refresh_post_score() RETURNS trigger AS $$
DECLARE
  s INTEGER;
BEGIN
  -- compute sum of votes for the given post_type & post_id
  SELECT COALESCE(SUM(vote), 0) INTO s FROM votes WHERE post_type = NEW.post_type AND post_id = COALESCE(NEW.post_id, OLD.post_id);

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.post_type = 'thread' THEN
      UPDATE threads SET score = s, updated_at = now() WHERE id = NEW.post_id;
    ELSE
      UPDATE comments SET score = s, updated_at = now() WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- OLD contains post info
    SELECT COALESCE(SUM(vote), 0) INTO s FROM votes WHERE post_type = OLD.post_type AND post_id = OLD.post_id;
    IF OLD.post_type = 'thread' THEN
      UPDATE threads SET score = s, updated_at = now() WHERE id = OLD.post_id;
    ELSE
      UPDATE comments SET score = s, updated_at = now() WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_votes_refresh_score
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW
EXECUTE PROCEDURE fn_refresh_post_score();

-- Altering votes table to replace global_id_seq with votes_id_seq
ALTER TABLE votes ALTER COLUMN id SET DEFAULT nextval('votes_id_seq');


-- =========================
-- REPORTS
-- =========================
CREATE TABLE IF NOT EXISTS reports (
  id BIGINT PRIMARY KEY DEFAULT nextval('global_id_seq'),
  reporter_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('thread', 'comment')),
  post_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'open', -- open, reviewed, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);


-- Altering reports table to replace global_id_seq with reports_id_seq
ALTER TABLE reports ALTER COLUMN id SET DEFAULT nextval('reports_id_seq');


-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY DEFAULT nextval('global_id_seq'),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB DEFAULT '{}'::JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read);


-- Altering notifications table to replace global_id_seq with notifications_id_seq
ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq');

-- =========================
-- MATERIALIZED VIEW: popular_threads
-- (refresh periodically via a job or manual refresh)
-- =========================
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_threads AS
SELECT id, title, score, comments_count, last_activity_at, updated_at
FROM threads
ORDER BY score DESC NULLS LAST
LIMIT 100;

-- Create function to refresh materialized view (to be called by cron/job)
CREATE OR REPLACE FUNCTION fn_refresh_popular_threads() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_threads;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- Useful helper views / functions
-- =========================

-- Example: view mapping thread metadata (join author)
CREATE OR REPLACE VIEW vw_thread_summary AS
SELECT t.id, t.title, t.excerpt, t.tags, t.comments_count, t.score, t.last_activity_at, t.created_at,
       u.id AS author_id, u.username AS author_username, u.display_name AS author_display_name
FROM threads t
JOIN users u ON u.id = t.author_id;


-- =========================
-- =========================
-- some changes to the schema
CREATE TABLE boards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Update threads table to include board reference
ALTER TABLE threads
ADD COLUMN board_id INT REFERENCES boards(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------
-- End of DDL
-- ----------------------------------------------------------------------
