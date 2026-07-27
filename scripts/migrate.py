#!/usr/bin/env python3
"""
Deploy Tally schema to Neon using raw SQL.
Creates the 'tally' schema and all tables with proper constraints.

Usage: python scripts/migrate.py
Requires: DATABASE_URL in .env.local or environment
"""
import os
import sys
import psycopg2

def load_env():
    """Load .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip())

load_env()
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print("ERROR: DATABASE_URL not found")
    sys.exit(1)

SCHEMA_SQL = """
SET search_path TO public;

-- ── Schema ──────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS tally;

-- ── Enum types (using TEXT + CHECK for simplicity) ──

-- ── users ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tally.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    colour_key  TEXT NOT NULL DEFAULT 'green',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

-- ── user_sessions ──────────────────────────────
CREATE TABLE IF NOT EXISTS tally.user_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES tally.users(id),
    token_hash  TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON tally.user_sessions(user_id);

-- ── groups ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tally.groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    icon_key    TEXT,
    base_currency CHAR(3) NOT NULL DEFAULT 'AUD',
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    default_split_method TEXT,
    created_by_user_id UUID NOT NULL REFERENCES tally.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

-- ── group_members ──────────────────────────────
CREATE TABLE IF NOT EXISTS tally.group_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    user_id     UUID REFERENCES tally.users(id),
    display_name TEXT NOT NULL,
    colour_key  TEXT NOT NULL DEFAULT 'green',
    role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member','viewer')),
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left','merged')),
    joined_at   TIMESTAMPTZ,
    claimed_at  TIMESTAMPTZ,
    ready_to_settle_at TIMESTAMPTZ,
    merged_into_member_id UUID,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- At most one active member per (group, user) when user_id is non-null
CREATE UNIQUE INDEX IF NOT EXISTS gm_active_user_idx
    ON tally.group_members(group_id, user_id)
    WHERE status = 'active' AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gm_group_sort_idx
    ON tally.group_members(group_id, sort_order);

-- ── group_invites ──────────────────────────────
CREATE TABLE IF NOT EXISTS tally.group_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    token_hash  TEXT NOT NULL UNIQUE,
    invite_type TEXT NOT NULL CHECK (invite_type IN ('general','claim_member','readonly')),
    target_member_id UUID REFERENCES tally.group_members(id),
    created_by_member_id UUID NOT NULL REFERENCES tally.group_members(id),
    max_uses    INTEGER,
    use_count   INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── categories ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tally.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID REFERENCES tally.groups(id),
    name        TEXT NOT NULL,
    icon_key    TEXT NOT NULL DEFAULT 'tag',
    colour_key  TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT false,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    created_by_member_id UUID REFERENCES tally.group_members(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── expenses ───────────────────────────────────
CREATE TABLE IF NOT EXISTS tally.expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    description TEXT NOT NULL,
    total_minor BIGINT NOT NULL CHECK (total_minor > 0),
    currency    CHAR(3) NOT NULL,
    expense_date DATE NOT NULL,
    category_id UUID REFERENCES tally.categories(id),
    note        TEXT,
    split_method TEXT NOT NULL CHECK (split_method IN ('equal','shares','exact','percentage')),
    created_by_member_id UUID NOT NULL REFERENCES tally.group_members(id),
    recurring_rule_id UUID,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
    version     INTEGER NOT NULL DEFAULT 1,
    client_mutation_id UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS exp_idem_idx
    ON tally.expenses(group_id, client_mutation_id);
CREATE INDEX IF NOT EXISTS exp_active_date_idx
    ON tally.expenses(group_id, expense_date, created_at);

-- ── expense_payers ─────────────────────────────
CREATE TABLE IF NOT EXISTS tally.expense_payers (
    expense_id  UUID NOT NULL REFERENCES tally.expenses(id),
    member_id   UUID NOT NULL REFERENCES tally.group_members(id),
    paid_minor  BIGINT NOT NULL CHECK (paid_minor >= 0),
    PRIMARY KEY (expense_id, member_id)
);
CREATE INDEX IF NOT EXISTS ep_member_idx ON tally.expense_payers(member_id);

-- ── expense_participants ───────────────────────
CREATE TABLE IF NOT EXISTS tally.expense_participants (
    expense_id  UUID NOT NULL REFERENCES tally.expenses(id),
    member_id   UUID NOT NULL REFERENCES tally.group_members(id),
    input_value NUMERIC(20,8) NOT NULL,
    owed_minor  BIGINT NOT NULL CHECK (owed_minor >= 0),
    is_included BOOLEAN NOT NULL,
    allocation_order INTEGER NOT NULL,
    PRIMARY KEY (expense_id, member_id)
);
CREATE INDEX IF NOT EXISTS ept_member_idx ON tally.expense_participants(member_id);

-- ── settlements ────────────────────────────────
CREATE TABLE IF NOT EXISTS tally.settlements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    from_member_id UUID NOT NULL REFERENCES tally.group_members(id),
    to_member_id   UUID NOT NULL REFERENCES tally.group_members(id),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency    CHAR(3) NOT NULL,
    settled_on  DATE NOT NULL,
    note        TEXT,
    created_by_member_id UUID NOT NULL REFERENCES tally.group_members(id),
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
    version     INTEGER NOT NULL DEFAULT 1,
    client_mutation_id UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT set_from_neq_to CHECK (from_member_id <> to_member_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS set_idem_idx
    ON tally.settlements(group_id, client_mutation_id);
CREATE INDEX IF NOT EXISTS set_active_date_idx
    ON tally.settlements(group_id, settled_on);

-- ── settlement_allocations (R1.1) ──────────────
CREATE TABLE IF NOT EXISTS tally.settlement_allocations (
    settlement_id UUID NOT NULL REFERENCES tally.settlements(id),
    expense_id    UUID NOT NULL REFERENCES tally.expenses(id),
    amount_minor  BIGINT NOT NULL CHECK (amount_minor > 0),
    PRIMARY KEY (settlement_id, expense_id)
);

-- ── entity_revisions ───────────────────────────
CREATE TABLE IF NOT EXISTS tally.entity_revisions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    version     INTEGER NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('create','update','delete','restore','merge')),
    snapshot    JSONB NOT NULL,
    changed_by_member_id UUID NOT NULL REFERENCES tally.group_members(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rev_entity_version_idx
    ON tally.entity_revisions(entity_type, entity_id, version);

-- ── activity_events ────────────────────────────
CREATE TABLE IF NOT EXISTS tally.activity_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    actor_member_id UUID REFERENCES tally.group_members(id),
    entity_type TEXT NOT NULL,
    entity_id   UUID,
    action      TEXT NOT NULL,
    summary_payload JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS act_group_created_idx
    ON tally.activity_events(group_id, created_at);

-- ── recurring_rules (R1.1) ─────────────────────
CREATE TABLE IF NOT EXISTS tally.recurring_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES tally.groups(id),
    name        TEXT NOT NULL,
    cadence     TEXT NOT NULL,
    interval_value INTEGER NOT NULL DEFAULT 1,
    next_due_on DATE NOT NULL,
    amount_mode TEXT NOT NULL CHECK (amount_mode IN ('fixed','prompt')),
    fixed_amount_minor BIGINT,
    template_payload JSONB NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
    created_by_member_id UUID NOT NULL REFERENCES tally.group_members(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

def main():
    print("Connecting to Neon...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    print("Deploying Tally schema...")
    cur.execute(SCHEMA_SQL)
    print("Schema deployed successfully.")

    # Verify
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'tally' ORDER BY table_name
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"\nTables in 'tally' schema ({len(tables)}):")
    for t in tables:
        print(f"  ✓ {t}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
