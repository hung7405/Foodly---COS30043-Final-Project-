-- Drop everything first (clean slate)
DROP TABLE IF EXISTS analytics_snapshots;
DROP TABLE IF EXISTS activity_events;
DROP TABLE IF EXISTS user_interactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS verification_events;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS deal_status;
DROP TYPE IF EXISTS verification_action;
DROP TYPE IF EXISTS reservation_status;
DROP TYPE IF EXISTS comment_status;
DROP TYPE IF EXISTS payment_provider;
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS interaction_action;

-- Enum types
CREATE TYPE user_role AS ENUM ('guest', 'user', 'moderator', 'admin');
CREATE TYPE deal_status AS ENUM ('active', 'reserved', 'expired', 'removed');
CREATE TYPE verification_action AS ENUM ('verified', 'rejected', 'flagged');
CREATE TYPE reservation_status AS ENUM ('active', 'confirmed', 'cancelled', 'expired');
CREATE TYPE comment_status AS ENUM ('active', 'hidden', 'flagged');
CREATE TYPE payment_provider AS ENUM ('mock', 'stripe', 'momo', 'zalopay', 'vnpay');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'expired');
CREATE TYPE interaction_action AS ENUM ('view', 'like', 'bookmark', 'share', 'report', 'reserve', 'purchase');

-- Table: users
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) NOT NULL,
  username         VARCHAR(255) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  first_name       VARCHAR(255),
  last_name        VARCHAR(255),
  role             user_role NOT NULL DEFAULT 'user',
  trust_score      DECIMAL(3,2) NOT NULL DEFAULT 0,
  reputation_points INTEGER NOT NULL DEFAULT 0,
  avatar_url       VARCHAR(255),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login       TIMESTAMPTZ,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_username UNIQUE (username)
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

-- Table: stores
CREATE TABLE stores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  address          VARCHAR(255),
  latitude         DECIMAL(10,7) NOT NULL,
  longitude        DECIMAL(10,7) NOT NULL,
  category         VARCHAR(255),
  avg_trust_score  DECIMAL(3,2) NOT NULL DEFAULT 0,
  total_deals      INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores (category);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores (is_active);

-- Table: deals
CREATE TABLE deals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL,
  store_id           UUID,
  title              VARCHAR(200) NOT NULL,
  description        TEXT,
  original_price     DECIMAL(10,2) NOT NULL,
  discount_price     DECIMAL(10,2) NOT NULL,
  currency           VARCHAR(3) NOT NULL DEFAULT 'VND',
  remaining_quantity INTEGER NOT NULL DEFAULT 1,
  original_quantity  INTEGER NOT NULL,
  status             deal_status NOT NULL DEFAULT 'active',
  verified           BOOLEAN NOT NULL DEFAULT false,
  verified_by_id     UUID,
  latitude           DECIMAL(10,7) NOT NULL,
  longitude          DECIMAL(10,7) NOT NULL,
  address            VARCHAR(255),
  images             JSONB NOT NULL DEFAULT '[]',
  expires_at         TIMESTAMPTZ NOT NULL,
  tags               JSONB NOT NULL DEFAULT '[]',
  metadata           JSONB,
  version            INTEGER NOT NULL DEFAULT 1,
  like_count         INTEGER NOT NULL DEFAULT 0,
  bookmark_count     INTEGER NOT NULL DEFAULT 0,
  comment_count      INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_deals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deals_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
  CONSTRAINT fk_deals_verified_by FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals (user_id);
CREATE INDEX IF NOT EXISTS idx_deals_store_id ON deals (store_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (status);
CREATE INDEX IF NOT EXISTS idx_deals_expires_at ON deals (expires_at);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals (created_at);
CREATE INDEX IF NOT EXISTS idx_deals_verified ON deals (verified);

-- Table: likes
CREATE TABLE likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  target_id   UUID NOT NULL,
  target_type VARCHAR(255) NOT NULL,
  type        VARCHAR(255) NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_likes_user_target UNIQUE (user_id, target_id, target_type)
);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes (target_id, target_type);

-- Table: bookmarks
CREATE TABLE bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  deal_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_bookmarks_user_deal UNIQUE (user_id, deal_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_deal_id ON bookmarks (deal_id);

-- Table: verification_events
CREATE TABLE verification_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL,
  moderator_id  UUID NOT NULL,
  action        verification_action NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_verification_events_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_verification_events_moderator FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_verification_events_deal_id ON verification_events (deal_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_moderator_id ON verification_events (moderator_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_action ON verification_events (action);

-- Table: reservations
CREATE TABLE reservations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id            UUID NOT NULL,
  user_id            UUID NOT NULL,
  status             reservation_status NOT NULL DEFAULT 'active',
  reserved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  confirmed_at       TIMESTAMPTZ,
  reservation_code   VARCHAR(20),
  quantity_reserved  INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT fk_reservations_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_reservations_code UNIQUE (reservation_code)
);
CREATE INDEX IF NOT EXISTS idx_reservations_deal_id ON reservations (deal_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations (user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations (expires_at);

-- Table: comments
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    UUID NOT NULL,
  user_id    UUID NOT NULL,
  parent_id  UUID,
  content    TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  status     comment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_comments_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments (deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments (status);

-- Table: payments
CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  reservation_id          UUID NOT NULL,
  amount                  DECIMAL(12,2) NOT NULL,
  currency                VARCHAR(3) NOT NULL DEFAULT 'VND',
  provider                payment_provider NOT NULL DEFAULT 'mock',
  status                  payment_status NOT NULL DEFAULT 'pending',
  provider_transaction_id VARCHAR(255),
  provider_reference_id   VARCHAR(255),
  payment_url             VARCHAR(255),
  qr_code_url             VARCHAR(255),
  paid_at                 TIMESTAMPTZ,
  provider_response       JSONB,
  failure_reason          TEXT,
  refunded_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments (reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments (provider);

-- Table: user_interactions
CREATE TABLE user_interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  deal_id    UUID NOT NULL,
  action     interaction_action NOT NULL,
  weight     REAL NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_deal_action ON user_interactions (user_id, deal_id, action);
CREATE INDEX IF NOT EXISTS idx_user_interactions_deal_id ON user_interactions (deal_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions (action);

-- Table: activity_events
CREATE TABLE activity_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  deal_id    UUID,
  event_type VARCHAR(255) NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON activity_events (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_deal_id ON activity_events (deal_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON activity_events (event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON activity_events (created_at);

-- Table: analytics_snapshots
CREATE TABLE analytics_snapshots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_users             INTEGER NOT NULL DEFAULT 0,
  reservations_per_minute  DECIMAL(10,2) NOT NULL DEFAULT 0,
  deals_per_minute         DECIMAL(10,2) NOT NULL DEFAULT 0,
  verifications_total      INTEGER NOT NULL DEFAULT 0,
  comments_total           INTEGER NOT NULL DEFAULT 0,
  captured_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_captured_at ON analytics_snapshots (captured_at);

-- ==========================================================================
-- AI / Vector Search (pgvector) — RAG-lite layer
-- Requires the pgvector extension (enabled by default on Supabase free tier).
-- The recommendation engine uses these only when OPENAI_API_KEY is configured;
-- otherwise it falls back to the weighted heuristic scorer.
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS deal_embeddings (
  deal_id    UUID PRIMARY KEY REFERENCES deals(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  model      TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding  vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_embeddings_hnsw_idx
  ON deal_embeddings USING hnsw (embedding vector_cosine_ops);

-- Semantic similarity search over deals (cosine distance).
CREATE OR REPLACE FUNCTION match_deals(
  query_embedding vector(1536),
  match_count int DEFAULT 20
)
RETURNS TABLE (deal_id uuid, similarity real)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT de.deal_id, 1 - (de.embedding <=> query_embedding)::real AS similarity
    FROM deal_embeddings de
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Merchant Platform (incremental additions — run AFTER the base
-- script if it was applied before this section existed)
-- ─────────────────────────────────────────────────────────────

-- New user role for store owners. Supabase runs Postgres 15+, which
-- supports ALTER TYPE ... ADD VALUE IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('guest', 'user', 'moderator', 'admin');
  ELSE
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'merchant';
  END IF;
END $$;

-- Link stores to their owner (merchant). Deals already reference
-- stores via store_id, so merchant orders can be derived through
-- reservations -> deals -> stores.user_id.
ALTER TABLE stores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores (user_id);

-- ─────────────────────────────────────────────────────────────
-- Delivery address for users (incremental — run AFTER the base
-- script if it was applied before this section existed)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- ─────────────────────────────────────────────────────────────
-- Support tickets (rule-based support chatbot escalation)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  category   VARCHAR(50) NOT NULL DEFAULT 'general',
  subject    VARCHAR(120),
  message    TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);

-- �������������������������������������������������������������
-- Chat satisfaction feedback (post-chat star rating)
-- �������������������������������������������������������������
CREATE TABLE IF NOT EXISTS support_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category   VARCHAR(50),
  ref_code   VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_feedback_user_id ON support_feedback (user_id);
