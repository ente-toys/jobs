CREATE TABLE IF NOT EXISTS jobs (
  slug TEXT PRIMARY KEY,
  team TEXT NOT NULL,
  title TEXT NOT NULL,
  card_description TEXT NOT NULL,
  intro_eyebrow TEXT NOT NULL,
  intro_title TEXT NOT NULL,
  intro_description TEXT NOT NULL,
  questions_json TEXT NOT NULL CHECK (json_valid(questions_json)),
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_active_sort
  ON jobs (is_active, sort_order, created_at);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_slug TEXT NOT NULL,
  answers_json TEXT NOT NULL CHECK (json_valid(answers_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_slug) REFERENCES jobs(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_job_slug_created
  ON applications (job_slug, created_at DESC);
