ALTER TABLE jobs ADD COLUMN archived_at TIMESTAMPTZ;
CREATE INDEX idx_jobs_archived_at ON jobs(archived_at);
