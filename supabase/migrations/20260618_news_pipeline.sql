-- Deduplication log for the automated news pipeline.
-- Tracks every source URL that's been posted to WordPress so we never double-post.
-- Service-role only — not exposed in public views.

CREATE TABLE IF NOT EXISTS news_pipeline_log (
  source_url   TEXT        PRIMARY KEY,
  posted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wp_post_id   INTEGER,
  title        TEXT
);

-- Index for fast date-based cleanup queries
CREATE INDEX IF NOT EXISTS news_pipeline_log_posted_at_idx
  ON news_pipeline_log (posted_at DESC);

-- RLS: only service role can read/write (this table is internal)
ALTER TABLE news_pipeline_log ENABLE ROW LEVEL SECURITY;
-- No public policies = locked to service role only
