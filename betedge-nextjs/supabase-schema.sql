-- ═══════════════════════════════════════════════════════════
-- BETEDGE — Schéma Supabase
-- Coller dans l'éditeur SQL de Supabase (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- ─── Settings (config utilisateur) ──────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'default',
  bankroll    NUMERIC(12,2) NOT NULL DEFAULT 1000,
  kelly_mode  NUMERIC(4,2)  NOT NULL DEFAULT 0.5,
  edge_min    NUMERIC(5,2)  NOT NULL DEFAULT 5.0,
  arb_min     NUMERIC(5,2)  NOT NULL DEFAULT 1.0,
  sl_day_pct  NUMERIC(5,2)  NOT NULL DEFAULT 5.0,
  tg_token    TEXT,
  tg_chat_id  TEXT,
  tg_enabled  BOOLEAN       NOT NULL DEFAULT false,
  scan_interval INT         NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ  DEFAULT now(),
  updated_at  TIMESTAMPTZ  DEFAULT now(),
  UNIQUE(user_id)
);

-- ─── Bets (historique des paris) ─────────────────────────────
CREATE TABLE IF NOT EXISTS bets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL DEFAULT 'default',
  match_name   TEXT NOT NULL,
  competition  TEXT,
  bet_date     DATE,
  selection    TEXT NOT NULL,
  odd          NUMERIC(8,3) NOT NULL,
  stake        NUMERIC(10,2) NOT NULL,
  bet_type     TEXT DEFAULT 'value',   -- value | arb | matched | ia
  result       TEXT DEFAULT 'pending', -- pending | win | loss
  pnl          NUMERIC(10,2),
  edge_pct     NUMERIC(6,2),
  kelly_pct    NUMERIC(6,4),
  bookmaker    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── IA Analyses ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ia_analyses (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        TEXT NOT NULL DEFAULT 'default',
  match_name     TEXT NOT NULL,
  competition    TEXT,
  match_date     TEXT,
  odd_home       NUMERIC(8,3),
  odd_draw       NUMERIC(8,3),
  odd_away       NUMERIC(8,3),
  prob_home      NUMERIC(5,2),
  prob_draw      NUMERIC(5,2),
  prob_away      NUMERIC(5,2),
  recommendation TEXT,
  confidence     INT,
  edge_ia        NUMERIC(6,2),
  kelly_stake    NUMERIC(10,2),
  ev             NUMERIC(10,2),
  analyse_text   TEXT,
  forces_home    TEXT,
  forces_away    TEXT,
  justification  TEXT,
  risques        TEXT,
  result         TEXT DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─── Scans (historique des scans automatiques) ───────────────
CREATE TABLE IF NOT EXISTS scans (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL DEFAULT 'default',
  sport        TEXT,
  matches_loaded INT DEFAULT 0,
  vb_found     INT DEFAULT 0,
  arb_found    INT DEFAULT 0,
  alerts_sent  INT DEFAULT 0,
  scan_duration_ms INT,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Alerts log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL DEFAULT 'default',
  alert_type   TEXT NOT NULL, -- vb | arb | ia | stoplos | digest
  match_name   TEXT,
  message      TEXT,
  sent_at      TIMESTAMPTZ DEFAULT now(),
  success      BOOLEAN DEFAULT true
);

-- ─── Insert settings par défaut ──────────────────────────────
INSERT INTO settings (user_id)
VALUES ('default')
ON CONFLICT (user_id) DO NOTHING;

-- ─── RLS (Row Level Security) — désactivé pour usage solo ────
-- Active si tu veux multi-utilisateurs avec auth Supabase
ALTER TABLE settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets          DISABLE ROW LEVEL SECURITY;
ALTER TABLE ia_analyses   DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans         DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts        DISABLE ROW LEVEL SECURITY;

-- ─── Index pour perf ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bets_user_id_idx        ON bets(user_id);
CREATE INDEX IF NOT EXISTS bets_created_at_idx     ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS ia_analyses_user_idx    ON ia_analyses(user_id);
CREATE INDEX IF NOT EXISTS scans_created_at_idx    ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_sent_at_idx      ON alerts(sent_at DESC);
