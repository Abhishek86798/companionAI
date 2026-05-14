-- 001_initial.sql — core schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT        UNIQUE NOT NULL,
    tier        TEXT        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fcm_token   TEXT,
    notif_time  TIME        NOT NULL DEFAULT '21:00:00'
);

CREATE TABLE messages (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role           TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content        TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    safety_flagged BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE memories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fact        TEXT        NOT NULL,
    category    TEXT        NOT NULL CHECK (category IN ('name', 'city', 'job', 'relationship', 'situation', 'other')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_msg  UUID        REFERENCES messages(id) ON DELETE SET NULL,
    UNIQUE (user_id, category)
);

CREATE TABLE daily_usage (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        DATE    NOT NULL,
    msg_count   INT     NOT NULL DEFAULT 0,
    UNIQUE (user_id, date)
);

-- Indexes
CREATE INDEX idx_messages_user_created  ON messages(user_id, created_at DESC);
CREATE INDEX idx_memories_user_id       ON memories(user_id);
CREATE INDEX idx_daily_usage_user_date  ON daily_usage(user_id, date);
