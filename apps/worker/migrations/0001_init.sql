-- OpenQuest D1 schema
--
-- Tables:
--   users              — GitHub OAuth users (optional, for cross-device sync)
--   sessions           — session cookies for authenticated users
--   finds              — pending/judged photo finds from the mailbox
--   daily_completions  — derived per-day completion stats

CREATE TABLE IF NOT EXISTS users (
  github_id      INTEGER PRIMARY KEY,
  github_login   TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  github_id    INTEGER NOT NULL REFERENCES users(github_id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_github_id ON sessions(github_id);

CREATE TABLE IF NOT EXISTS finds (
  id                  TEXT PRIMARY KEY,
  quest_id            TEXT NOT NULL,
  user_id             INTEGER REFERENCES users(github_id) ON DELETE CASCADE,
  photo_key           TEXT NOT NULL,
  quest_prompt        TEXT NOT NULL,
  verification_hint   TEXT NOT NULL,
  place_name          TEXT NOT NULL,
  category            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'in_progress' | 'passed' | 'failed'
  passed              INTEGER,
  reason              TEXT,
  observations        TEXT,
  created_at          INTEGER NOT NULL,
  claimed_at          INTEGER,
  judged_at           INTEGER
);

CREATE INDEX IF NOT EXISTS idx_finds_status ON finds(status);
CREATE INDEX IF NOT EXISTS idx_finds_quest_id ON finds(quest_id);
CREATE INDEX IF NOT EXISTS idx_finds_user_id ON finds(user_id);

CREATE TABLE IF NOT EXISTS daily_completions (
  github_id   INTEGER NOT NULL REFERENCES users(github_id) ON DELETE CASCADE,
  date        TEXT NOT NULL,  -- YYYY-MM-DD
  count       INTEGER NOT NULL DEFAULT 0,
  categories  TEXT NOT NULL DEFAULT '{}',  -- JSON object
  PRIMARY KEY (github_id, date)
);
