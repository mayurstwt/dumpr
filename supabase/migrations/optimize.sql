-- Performance Optimization Migrations & Automation

-- 1. Enable pg_cron if not enabled for weekly dumps cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Schedule the purge every Monday at 00:00 (Midnight)
  PERFORM cron.schedule(
    'purge-dumps-monday',
    '0 0 * * 1', 
    'TRUNCATE TABLE posts CASCADE;'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Indexes for faster querying in the Feed
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS reactions_post_id_idx ON reactions (post_id);
