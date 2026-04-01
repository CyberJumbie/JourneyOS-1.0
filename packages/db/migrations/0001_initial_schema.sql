-- Journey OS — Initial Schema Migration
-- Source of truth: tests/fixtures/journey-os-tech-architecture.html
-- Run: supabase db push --linked (production) or supabase db reset (local)
--
-- Tables are organized by migration layer:
--   001: Core (institutions, faculty, lectures, chunks)
--   002: LOD + Assessment (subconcepts, lod_briefs, items, distractors)
--   003: Students + Attempts (students, attempts, mastery)
--   004: Production Hardening (C01-C10, H02-H12 resolutions)
--
-- IMPORTANT: After applying, run: pnpm db:types

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgvector" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_hashids" WITH SCHEMA public;

-- =============================================================================
-- 001: CORE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS institutions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  accreditation   TEXT,           -- 'LCME' | 'ACGME' | etc.
  is_showcase     BOOLEAN DEFAULT FALSE,
  lcme_id         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculty_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('faculty','admin','chair','dean','advisor')),
  courses         UUID[],           -- assigned course UUIDs
  neo4j_uuid      TEXT,             -- bridge to Faculty node (T4)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lectures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  course_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  file_path       TEXT,             -- Supabase Storage path
  file_hash       TEXT UNIQUE,      -- SHA-256 for dedup
  file_type       TEXT CHECK (file_type IN ('pptx','pdf')),
  slide_count     INTEGER,
  status          TEXT DEFAULT 'pending' CHECK (status IN
    ('pending','parsing','chunking','embedding','extracting','enriching',
     'review_pending','complete','failed')),
  neo4j_synced_at   TIMESTAMPTZ,
  neo4j_sync_status TEXT DEFAULT 'pending' CHECK (neo4j_sync_status IN ('pending','synced','failed')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lecture_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  lecture_id      UUID NOT NULL REFERENCES lectures ON DELETE CASCADE,
  slide_number    INTEGER NOT NULL,
  title           TEXT,
  body_text       TEXT NOT NULL,
  neo4j_synced_at   TIMESTAMPTZ,
  neo4j_sync_status TEXT DEFAULT 'pending' CHECK (neo4j_sync_status IN ('pending','synced','failed')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS speaker_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  section_id      UUID NOT NULL REFERENCES lecture_sections ON DELETE CASCADE,
  text            TEXT NOT NULL,
  slide_number    INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  lecture_id      UUID NOT NULL REFERENCES lectures ON DELETE CASCADE,
  section_id      UUID REFERENCES lecture_sections ON DELETE SET NULL,
  chunk_index     INTEGER NOT NULL,
  text            TEXT NOT NULL,
  text_with_context TEXT NOT NULL,    -- heading context prepended for embedding
  heading_context TEXT,
  token_count     INTEGER,            -- 150-250 canonical (D04)
  domain_type     TEXT,               -- 'biomedical' | 'pedagogical' for model selection
  discrimination_flag BOOLEAN DEFAULT FALSE,  -- set by IRT feedback loop
  embedding       vector(768),        -- MedCPT (biomedical)
  embedding_general vector(1536),    -- text-embedding-3-small (pedagogical)
  neo4j_synced_at   TIMESTAMPTZ,
  neo4j_sync_status TEXT DEFAULT 'pending' CHECK (neo4j_sync_status IN ('pending','synced','failed')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW vector indexes for similarity search
CREATE INDEX IF NOT EXISTS chunks_biomedical_hnsw ON content_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX IF NOT EXISTS chunks_general_hnsw ON content_chunks
  USING hnsw (embedding_general vector_cosine_ops) WITH (m = 16, ef_construction = 200);

-- =============================================================================
-- 002: LOD + ASSESSMENT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS subconcept_lod_briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subconcept_uuid TEXT NOT NULL UNIQUE,   -- Neo4j SubConcept UUID (bridge)
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  lod_brief       TEXT NOT NULL,          -- ~200 tokens, Haiku-generated
  lod_brief_version INTEGER NOT NULL DEFAULT 1,
  umls_release    TEXT,                    -- e.g. '2026AA'
  model_version   TEXT DEFAULT 'claude-haiku-4-5-20251001',
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  -- C07: 180-day expiry
  expires_at      TIMESTAMPTZ GENERATED ALWAYS AS (generated_at + INTERVAL '180 days') STORED
);

CREATE TABLE IF NOT EXISTS subconcepts (
  id              TEXT PRIMARY KEY,        -- matches Neo4j SubConcept.uuid
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  name            TEXT NOT NULL,
  cui             TEXT,                    -- UMLS CUI
  status          TEXT DEFAULT 'candidate' CHECK (status IN ('candidate','confirmed','deprecated')),
  embedding_source TEXT DEFAULT 'text_only' CHECK (embedding_source IN ('text_only','graph_augmented','full_gnn')),
  lod_brief_id    UUID REFERENCES subconcept_lod_briefs ON DELETE SET NULL,
  neo4j_synced_at   TIMESTAMPTZ,
  neo4j_sync_status TEXT DEFAULT 'pending' CHECK (neo4j_sync_status IN ('pending','synced','failed')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  stem            TEXT NOT NULL,
  correct_answer  TEXT NOT NULL,
  answer_mechanism TEXT,
  status          TEXT DEFAULT 'candidate' CHECK (status IN
    ('candidate','generation_failed','faculty_pending','approved','rejected','retired')),
  bloom_level     INTEGER CHECK (bloom_level BETWEEN 1 AND 6),
  generation_approach TEXT DEFAULT 'de_novo' CHECK (generation_approach IN
    ('de_novo','remix','import','manual')),
  source_chunk_ids UUID[],
  subconcept_id   TEXT REFERENCES subconcepts ON DELETE SET NULL,
  generation_model TEXT,              -- exact model used (C06)
  qa_score_medical  NUMERIC(3,1),
  qa_score_coherence NUMERIC(3,1),
  qa_score_blueprint NUMERIC(3,1),
  toulmin         JSONB,              -- Toulmin argumentation chain
  generation_cost_usd NUMERIC(8,4),
  -- H11: Clinical confidence tier
  clinical_confidence TEXT NOT NULL DEFAULT 'unverified' CHECK (
    clinical_confidence IN ('unverified','self_verified','peer_reviewed','expert_reviewed')),
  peer_reviewer_id UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  peer_reviewed_at TIMESTAMPTZ,
  requires_expert_review BOOLEAN DEFAULT FALSE,
  -- G08: Dual-write tracking
  neo4j_synced_at   TIMESTAMPTZ,
  neo4j_sync_status TEXT DEFAULT 'pending' CHECK (neo4j_sync_status IN ('pending','synced','failed')),
  approved_by       UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distractors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES assessment_items ON DELETE CASCADE,
  option_letter   CHAR(1) NOT NULL CHECK (option_letter IN ('A','B','C','D','E')),
  text            TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  evidence_rule   TEXT,                -- ECD: what mastery/misconception this option targets
  misconception_id TEXT               -- bridge to MisconceptionCategory Neo4j node
);

-- =============================================================================
-- 003: STUDENTS + ATTEMPTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  enrollment_year INTEGER,
  cohort          TEXT,               -- 'M1-2025' etc.
  status          TEXT DEFAULT 'pending_approval' CHECK (status IN
    ('pending_approval','active','suspended','graduated'))
);

CREATE TABLE IF NOT EXISTS exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  course_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  blueprint_id    UUID,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  passing_score   NUMERIC(5,2),       -- Angoff-derived
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','deployed','active','completed','archived')),
  available_from  TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  results_release_at TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_blueprints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  course_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  bloom_distribution JSONB NOT NULL DEFAULT '{}',     -- { "1": 0.10, "2": 0.20, ... }
  system_proportions JSONB NOT NULL DEFAULT '{}',     -- { "cardiovascular": 0.15, ... }
  difficulty_distribution JSONB NOT NULL DEFAULT '{}', -- { "easy": 0.20, "medium": 0.60, ... }
  equity_item_min_pct NUMERIC(3,2) DEFAULT 0.15,     -- minimum 15% equity items
  total_items     INTEGER NOT NULL DEFAULT 40,
  created_by      UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES student_profiles ON DELETE CASCADE,
  exam_id         UUID REFERENCES exams ON DELETE SET NULL,
  mode            TEXT NOT NULL DEFAULT 'practice' CHECK (mode IN ('practice','summative','formative')),
  item_count      INTEGER NOT NULL,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  score           NUMERIC(5,2),
  item_order_seed TEXT,               -- H05: deterministic scramble seed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- C01: Exam answer auto-save (mutable draft state)
CREATE TABLE IF NOT EXISTS session_answers (
  session_id      UUID NOT NULL REFERENCES sessions ON DELETE CASCADE,
  item_order      INTEGER NOT NULL,
  selected_index  INTEGER,            -- null = skipped
  flagged         BOOLEAN DEFAULT FALSE,  -- student flagged for review
  answered_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, item_order)
);

-- H05: Per-student scrambled item + option order
CREATE TABLE IF NOT EXISTS session_items (
  session_id      UUID NOT NULL REFERENCES sessions ON DELETE CASCADE,
  display_order   INTEGER NOT NULL,
  item_id         UUID NOT NULL REFERENCES assessment_items ON DELETE CASCADE,
  item_version    INTEGER NOT NULL DEFAULT 1,   -- version used at exam time
  option_order    INTEGER[] NOT NULL,            -- e.g. [3,0,1,4,2] = shuffled indices
  correct_option_pos INTEGER NOT NULL,           -- correct answer's position after shuffle
  PRIMARY KEY (session_id, display_order),
  UNIQUE (session_id, item_id)
);

-- Immutable final record (created atomically on submit)
CREATE TABLE IF NOT EXISTS attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES assessment_items ON DELETE CASCADE,
  session_id      UUID REFERENCES sessions ON DELETE SET NULL,
  is_correct      BOOLEAN NOT NULL,
  selected_option CHAR(1),
  selected_distractor_id UUID REFERENCES distractors ON DELETE SET NULL,
  response_ms     INTEGER,
  mode            TEXT DEFAULT 'practice' CHECK (mode IN ('practice','summative','formative')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mastery_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  student_id      UUID NOT NULL REFERENCES student_profiles ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  subconcept_id   TEXT NOT NULL,      -- Neo4j bridge
  p_mastery       NUMERIC(5,4) NOT NULL,
  p_transit       NUMERIC(5,4),
  p_slip          NUMERIC(5,4),
  p_guess         NUMERIC(5,4),
  review_count    INTEGER DEFAULT 0,
  next_review_at  TIMESTAMPTZ,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 004: PRODUCTION HARDENING (C01-C10, H02-H12)
-- =============================================================================

-- H02: Item version history (audit trail)
CREATE TABLE IF NOT EXISTS item_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES assessment_items ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  stem            TEXT NOT NULL,
  correct_answer  TEXT NOT NULL,
  distractors     JSONB NOT NULL,     -- [{text, evidence_rule, misconception_code}]
  edited_by       UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  edit_reason     TEXT,
  edited_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_id, version_number)
);

-- ADA compliance
CREATE TABLE IF NOT EXISTS student_accommodations (
  student_id      UUID NOT NULL REFERENCES student_profiles ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES exams ON DELETE CASCADE,
  time_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,  -- 1.5 = 50% extra time
  accommodation_type TEXT[],           -- ['extended_time','screen_reader']
  approved_by     UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  PRIMARY KEY (student_id, exam_id)
);

-- C10: Generation rate limits
CREATE TABLE IF NOT EXISTS generation_daily_usage (
  faculty_id      UUID NOT NULL REFERENCES faculty_profiles ON DELETE CASCADE,
  usage_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  items_generated INTEGER NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(8,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (faculty_id, usage_date)
);

CREATE TABLE IF NOT EXISTS institution_generation_limits (
  institution_id  UUID PRIMARY KEY REFERENCES institutions ON DELETE CASCADE,
  daily_limit_per_faculty INTEGER NOT NULL DEFAULT 100,
  monthly_budget_usd NUMERIC(8,2),
  alert_threshold_pct INTEGER DEFAULT 80
);

-- H11: Item flags for clinical review
CREATE TABLE IF NOT EXISTS item_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES assessment_items ON DELETE CASCADE,
  flagged_by      UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  flag_reason     TEXT NOT NULL,
  flag_type       TEXT CHECK (flag_type IN (
    'clinical_accuracy','outdated_guideline','needs_peer_review','student_complaint')),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES faculty_profiles ON DELETE SET NULL,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- C07: LOD brief history (prior versions before regeneration)
CREATE TABLE IF NOT EXISTS lod_brief_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subconcept_uuid TEXT NOT NULL,
  lod_brief       TEXT NOT NULL,
  umls_release    TEXT,
  superseded_at   TIMESTAMPTZ DEFAULT NOW(),
  superseded_by   UUID REFERENCES subconcept_lod_briefs ON DELETE SET NULL
);

-- C04: Dead letter queue for pipeline failures
CREATE TABLE IF NOT EXISTS pipeline_dead_letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline        TEXT NOT NULL CHECK (pipeline IN ('p1','p2','p3')),
  entity_id       UUID NOT NULL,
  inngest_run_id  TEXT,
  trigger_event   TEXT NOT NULL,
  trigger_data    JSONB,
  error_message   TEXT,
  step_name       TEXT,               -- which step failed
  retry_count     INTEGER DEFAULT 0,
  last_retried_at TIMESTAMPTZ,
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- C09: SAME_AS conflict log
CREATE TABLE IF NOT EXISTS entity_resolution_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uuid     TEXT NOT NULL,      -- SubConcept A
  target_uuid     TEXT NOT NULL,      -- SubConcept B (would create cycle)
  conflict_type   TEXT NOT NULL,      -- 'cycle_prevention' | 'low_confidence'
  detected_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolution      TEXT                -- human review outcome
);

-- FERPA audit log (NO RLS — readable only by service_role)
CREATE TABLE IF NOT EXISTS ferpa_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  actor_id        UUID,
  actor_role      TEXT,
  action          TEXT NOT NULL,       -- 'item.approved' | 'exam.deployed' | 'student.data_accessed' etc.
  resource_type   TEXT,
  resource_id     TEXT,
  metadata        JSONB,
  ip_address      INET,
  -- Hash chain for tamper detection (C01/security)
  prev_hash       TEXT NOT NULL,
  row_hash        TEXT NOT NULL,       -- SHA256(prev_hash || id || action || actor_id || created_at)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline run tracking
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions ON DELETE CASCADE,
  pipeline        TEXT NOT NULL CHECK (pipeline IN ('p1','p2','p3')),
  entity_id       UUID NOT NULL,       -- lecture_id, subconcept_id, or batch_id
  inngest_run_id  TEXT,
  status          TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  step_log        JSONB DEFAULT '[]'   -- [{step, status, started_at, completed_at, error?}]
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Content chunks
CREATE INDEX IF NOT EXISTS chunks_lecture_idx ON content_chunks (lecture_id);
CREATE INDEX IF NOT EXISTS chunks_section_idx ON content_chunks (section_id);
CREATE INDEX IF NOT EXISTS chunks_institution_idx ON content_chunks (institution_id);

-- Assessment items
CREATE INDEX IF NOT EXISTS items_institution_status ON assessment_items (institution_id, status);
CREATE INDEX IF NOT EXISTS items_subconcept_status ON assessment_items (subconcept_id, status);
CREATE INDEX IF NOT EXISTS items_clinical_confidence ON assessment_items (clinical_confidence)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS items_approval_queue ON assessment_items (approved_by, status, created_at DESC)
  WHERE status = 'faculty_pending';

-- Attempts
CREATE INDEX IF NOT EXISTS attempts_student_idx ON attempts (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS attempts_item_idx ON attempts (item_id, created_at DESC);

-- Mastery
CREATE INDEX IF NOT EXISTS mastery_student_concept ON mastery_snapshots (student_id, subconcept_id);
CREATE INDEX IF NOT EXISTS mastery_low ON mastery_snapshots (student_id, p_mastery)
  WHERE p_mastery < 0.5;  -- partial index for at-risk queries

-- Audit log
CREATE INDEX IF NOT EXISTS audit_actor_idx ON ferpa_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_institution_idx ON ferpa_audit_log (institution_id, created_at DESC);

-- Lectures
CREATE INDEX IF NOT EXISTS lectures_institution_idx ON lectures (institution_id, status);
CREATE INDEX IF NOT EXISTS lectures_course_idx ON lectures (course_id);

-- Sessions
CREATE INDEX IF NOT EXISTS sessions_student_idx ON sessions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_exam_idx ON sessions (exam_id);

-- Pipeline tracking
CREATE INDEX IF NOT EXISTS pipeline_runs_entity ON pipeline_runs (entity_id, pipeline);
CREATE INDEX IF NOT EXISTS dead_letters_unresolved ON pipeline_dead_letters (pipeline, created_at DESC)
  WHERE resolved = FALSE;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subconcept_lod_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subconcepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE distractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
-- ferpa_audit_log: NO RLS — readable only by service_role

-- Institution isolation (applied to every user-facing table via institution_id)
-- Faculty can access their institution's data
CREATE POLICY faculty_institution_isolation ON lectures
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON content_chunks
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON assessment_items
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON subconcepts
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON subconcept_lod_briefs
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON exams
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON exam_blueprints
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON lecture_sections
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

CREATE POLICY faculty_institution_isolation ON speaker_notes
  FOR ALL USING (institution_id = (
    SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
  ));

-- Student own data (FERPA)
CREATE POLICY student_own_data ON attempts
  FOR ALL USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
      AND fp.institution_id = attempts.institution_id
    )
  );

CREATE POLICY student_own_mastery ON mastery_snapshots
  FOR ALL USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
      AND fp.institution_id = mastery_snapshots.institution_id
    )
  );

CREATE POLICY student_own_sessions ON sessions
  FOR ALL USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
      AND fp.institution_id = sessions.institution_id
    )
  );

CREATE POLICY student_own_answers ON session_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_answers.session_id
      AND s.student_id = auth.uid()
    )
  );

CREATE POLICY student_own_session_items ON session_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_items.session_id
      AND (s.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM faculty_profiles fp
          WHERE fp.id = auth.uid()
          AND fp.institution_id = s.institution_id
        ))
    )
  );

-- C02: Time-windowed item access for students during active exam
CREATE POLICY student_active_exam_items ON assessment_items
  FOR SELECT USING (
    -- Faculty can always see items in their institution
    EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
      AND fp.institution_id = assessment_items.institution_id
    )
    OR
    -- Students can only see items during active exam session
    EXISTS (
      SELECT 1 FROM session_items si
      JOIN sessions s ON s.id = si.session_id
      WHERE si.item_id = assessment_items.id
      AND s.student_id = auth.uid()
      AND s.completed_at IS NULL
      AND s.started_at > NOW() - INTERVAL '4 hours'
    )
  );

-- Student profile access
CREATE POLICY student_own_profile ON student_profiles
  FOR ALL USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
      AND fp.institution_id = student_profiles.institution_id
    )
  );

-- Faculty profile access
CREATE POLICY faculty_own_profile ON faculty_profiles
  FOR ALL USING (
    id = auth.uid()
    OR institution_id = (
      SELECT fp.institution_id FROM faculty_profiles fp WHERE fp.id = auth.uid()
    )
  );

-- Institution access
CREATE POLICY institution_member ON institutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM faculty_profiles fp WHERE fp.id = auth.uid() AND fp.institution_id = institutions.id
    )
    OR EXISTS (
      SELECT 1 FROM student_profiles sp WHERE sp.id = auth.uid() AND sp.institution_id = institutions.id
    )
  );

-- Distractors follow their parent item's access
CREATE POLICY distractor_via_item ON distractors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_items ai
      WHERE ai.id = distractors.item_id
      AND (
        EXISTS (SELECT 1 FROM faculty_profiles fp WHERE fp.id = auth.uid() AND fp.institution_id = ai.institution_id)
        OR EXISTS (
          SELECT 1 FROM session_items si JOIN sessions s ON s.id = si.session_id
          WHERE si.item_id = ai.id AND s.student_id = auth.uid() AND s.completed_at IS NULL
        )
      )
    )
  );

-- Admin-only tables (faculty with admin/dean role)
CREATE POLICY admin_pipeline_dead_letters ON pipeline_dead_letters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid() AND fp.role IN ('admin','dean')
    )
  );

CREATE POLICY admin_pipeline_runs ON pipeline_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
      AND fp.institution_id = pipeline_runs.institution_id
    )
  );

-- Generation usage (faculty own data)
CREATE POLICY faculty_own_usage ON generation_daily_usage
  FOR ALL USING (faculty_id = auth.uid());

-- Item flags (institution-scoped)
CREATE POLICY item_flags_institution ON item_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessment_items ai
      JOIN faculty_profiles fp ON fp.institution_id = ai.institution_id
      WHERE ai.id = item_flags.item_id AND fp.id = auth.uid()
    )
  );

-- Item versions (institution-scoped)
CREATE POLICY item_versions_institution ON item_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessment_items ai
      JOIN faculty_profiles fp ON fp.institution_id = ai.institution_id
      WHERE ai.id = item_versions.item_id AND fp.id = auth.uid()
    )
  );

-- Accommodations (admin + own student, institution-scoped)
CREATE POLICY accommodations_access ON student_accommodations
  FOR ALL USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM faculty_profiles fp
      JOIN student_profiles sp ON sp.institution_id = fp.institution_id
      WHERE fp.id = auth.uid()
      AND fp.role IN ('admin','dean','advisor')
      AND sp.id = student_accommodations.student_id
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- H02: Auto-version items on edit
CREATE OR REPLACE FUNCTION version_item_on_edit() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'approved'
    AND (OLD.stem IS DISTINCT FROM NEW.stem OR OLD.correct_answer IS DISTINCT FROM NEW.correct_answer)
  THEN
    INSERT INTO item_versions (item_id, version_number, stem, correct_answer, distractors, edited_by)
    SELECT OLD.id,
      COALESCE((SELECT MAX(version_number) FROM item_versions WHERE item_id = OLD.id), 0) + 1,
      OLD.stem,
      OLD.correct_answer,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'text', d.text,
        'option_letter', d.option_letter,
        'is_correct', d.is_correct,
        'evidence_rule', d.evidence_rule
      )), '[]'::jsonb) FROM distractors d WHERE d.item_id = OLD.id),
      NEW.approved_by;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER item_version_trigger
  BEFORE UPDATE ON assessment_items
  FOR EACH ROW EXECUTE FUNCTION version_item_on_edit();

-- FERPA audit log hash chain trigger
CREATE OR REPLACE FUNCTION audit_log_hash_chain() RETURNS TRIGGER AS $$
DECLARE
  prev TEXT;
BEGIN
  -- Get the previous hash (or genesis sentinel)
  SELECT row_hash INTO prev FROM ferpa_audit_log
    WHERE institution_id = NEW.institution_id
    ORDER BY id DESC LIMIT 1;

  IF prev IS NULL THEN
    prev := encode(sha256(('GENESIS:' || NEW.institution_id)::bytea), 'hex');
  END IF;

  NEW.prev_hash := prev;
  NEW.row_hash := encode(sha256(
    (prev || NEW.id || NEW.action || COALESCE(NEW.actor_id::text, '') || NEW.created_at::text)::bytea
  ), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ferpa_audit_hash_chain
  BEFORE INSERT ON ferpa_audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_hash_chain();

-- C01: Auto-save upsert helper (updated_at tracking)
CREATE OR REPLACE FUNCTION update_session_answer_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_answer_updated
  BEFORE UPDATE ON session_answers
  FOR EACH ROW EXECUTE FUNCTION update_session_answer_timestamp();

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lectures_updated_at
  BEFORE UPDATE ON lectures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RPC FUNCTIONS (for atomic multi-table operations — AP-17 prevention)
-- =============================================================================

-- C01 + AP-17: Create exam session atomically (sessions + session_items)
CREATE OR REPLACE FUNCTION create_exam_session(
  p_session_id UUID,
  p_exam_id UUID,
  p_student_id UUID,
  p_institution_id UUID,
  p_item_count INTEGER,
  p_items JSONB  -- [{item_id, display_order, item_version, option_order, correct_option_pos}]
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Insert session
  INSERT INTO sessions (id, institution_id, student_id, exam_id, mode, item_count)
  VALUES (p_session_id, p_institution_id, p_student_id, p_exam_id, 'summative', p_item_count)
  RETURNING id INTO v_session_id;

  -- Insert all session items atomically
  INSERT INTO session_items (session_id, display_order, item_id, item_version, option_order, correct_option_pos)
  SELECT
    v_session_id,
    (item->>'display_order')::int,
    (item->>'item_id')::uuid,
    (item->>'item_version')::int,
    ARRAY(SELECT jsonb_array_elements_text(item->'option_order'))::int[],
    (item->>'correct_option_pos')::int
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit exam atomically: create attempts from session_answers
CREATE OR REPLACE FUNCTION submit_exam_session(
  p_session_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Create immutable attempt records from draft answers
  INSERT INTO attempts (student_id, institution_id, item_id, session_id, is_correct, selected_option, mode)
  SELECT
    s.student_id,
    s.institution_id,
    si.item_id,
    s.id,
    (sa.selected_index = si.correct_option_pos),
    chr(65 + sa.selected_index),  -- A=0, B=1, etc.
    s.mode
  FROM sessions s
  JOIN session_items si ON si.session_id = s.id
  LEFT JOIN session_answers sa ON sa.session_id = s.id AND sa.item_order = si.display_order
  WHERE s.id = p_session_id
  AND s.completed_at IS NULL;

  -- Mark session complete with score
  UPDATE sessions SET
    completed_at = NOW(),
    score = (
      SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.is_correct) / NULLIF(COUNT(*), 0), 2)
      FROM attempts a WHERE a.session_id = p_session_id
    )
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- REALTIME (enable for specific tables)
-- =============================================================================

-- Enable Realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE lectures;
ALTER PUBLICATION supabase_realtime ADD TABLE mastery_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE session_answers;

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('lectures', 'lectures', false),
  ('syllabi', 'syllabi', false),
  ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: faculty can upload to their institution's folder
CREATE POLICY faculty_lecture_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lectures'
    AND EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
    )
  );

CREATE POLICY faculty_lecture_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lectures'
    AND EXISTS (
      SELECT 1 FROM faculty_profiles fp
      WHERE fp.id = auth.uid()
    )
  );

-- =============================================================================
-- E01 HARDENING: RLS on admin tables + distractor UPDATE policy
-- =============================================================================

-- Enable RLS on admin tables (defense-in-depth)
ALTER TABLE institution_generation_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_generation_limits ON institution_generation_limits
  FOR ALL USING (
    institution_id IN (
      SELECT fp.institution_id FROM faculty_profiles fp
      WHERE fp.id = auth.uid() AND fp.role IN ('admin', 'dean')
    )
  );

-- lod_brief_history has no institution_id; scope via subconcept_uuid -> subconcepts
ALTER TABLE lod_brief_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY faculty_lod_brief_history ON lod_brief_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subconcepts sc
      JOIN faculty_profiles fp ON fp.institution_id = sc.institution_id
      WHERE sc.id = lod_brief_history.subconcept_uuid
      AND fp.id = auth.uid()
    )
  );

-- entity_resolution_conflicts has no institution_id; scope via source_uuid -> subconcepts
ALTER TABLE entity_resolution_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_entity_conflicts ON entity_resolution_conflicts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM subconcepts sc
      JOIN faculty_profiles fp ON fp.institution_id = sc.institution_id
      WHERE sc.id = entity_resolution_conflicts.source_uuid
      AND fp.id = auth.uid()
      AND fp.role IN ('admin', 'dean')
    )
  );

-- Faculty distractor UPDATE (for review UI edits)
CREATE POLICY faculty_distractor_update ON distractors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assessment_items ai
      JOIN faculty_profiles fp ON fp.institution_id = ai.institution_id
      WHERE ai.id = distractors.item_id
      AND fp.id = auth.uid()
    )
  );
