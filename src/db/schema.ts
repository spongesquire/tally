import {
  pgSchema,
  uuid,
  text,
  timestamp,
  date,
  integer,
  bigint,
  boolean,
  jsonb,
  numeric,
  uniqueIndex,
  index,
  check,
  char,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tallySchema = pgSchema("tally");

// ──────────────────────────────────────────────
// Users — lightweight device profiles
// ──────────────────────────────────────────────
export const users = tallySchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  colourKey: text("colour_key").notNull().default("green"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ──────────────────────────────────────────────
// Sessions — only store token hash, never raw token
// ──────────────────────────────────────────────
export const userSessions = tallySchema.table("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  userAgentHash: text("user_agent_hash"),
});

// ──────────────────────────────────────────────
// Groups
// ──────────────────────────────────────────────
export const groups = tallySchema.table("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  iconKey: text("icon_key"),
  baseCurrency: char("base_currency", { length: 3 }).notNull().default("AUD"),
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  defaultSplitMethod: text("default_split_method"),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

// ──────────────────────────────────────────────
// Group members — the stable financial identity inside a group
// ──────────────────────────────────────────────
export const groupMembers = tallySchema.table("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  userId: uuid("user_id").references(() => users.id),
  displayName: text("display_name").notNull(),
  colourKey: text("colour_key").notNull().default("green"),
  role: text("role").notNull().default("member"), // 'owner' | 'member' | 'viewer'
  status: text("status").notNull().default("active"), // 'active' | 'left' | 'merged'
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  readyToSettleAt: timestamp("ready_to_settle_at", { withTimezone: true }), // R1.1
  mergedIntoMemberId: uuid("merged_into_member_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // At most one active member per (group, user) when user_id is non-null
  activeMemberIdx: uniqueIndex("gm_active_user_idx")
    .on(t.groupId, t.userId)
    .where(sql`status = 'active' AND user_id IS NOT NULL`),
  groupSortIdx: index("gm_group_sort_idx").on(t.groupId, t.sortOrder),
}));

// ──────────────────────────────────────────────
// Invites — only store token hash
// ──────────────────────────────────────────────
export const groupInvites = tallySchema.table("group_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  tokenHash: text("token_hash").notNull().unique(),
  inviteType: text("invite_type").notNull(), // 'general' | 'claim_member' | 'readonly'
  targetMemberId: uuid("target_member_id").references(() => groupMembers.id),
  createdByMemberId: uuid("created_by_member_id").notNull().references(() => groupMembers.id),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────
export const categories = tallySchema.table("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id),
  name: text("name").notNull(),
  iconKey: text("icon_key").notNull().default("tag"),
  colourKey: text("colour_key"),
  isSystem: boolean("is_system").notNull().default(false),
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  createdByMemberId: uuid("created_by_member_id").references(() => groupMembers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────
export const expenses = tallySchema.table("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  description: text("description").notNull(),
  totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  note: text("note"),
  splitMethod: text("split_method").notNull(), // 'equal' | 'shares' | 'exact' | 'percentage'
  createdByMemberId: uuid("created_by_member_id").notNull().references(() => groupMembers.id),
  recurringRuleId: uuid("recurring_rule_id"), // R1.1
  status: text("status").notNull().default("active"), // 'active' | 'deleted'
  version: integer("version").notNull().default(1),
  clientMutationId: uuid("client_mutation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  // Idempotency: unique (group_id, client_mutation_id)
  idemIdx: uniqueIndex("exp_idem_idx").on(t.groupId, t.clientMutationId),
  activeDateIdx: index("exp_active_date_idx")
    .on(t.groupId, t.expenseDate, t.createdAt),
}));

export const expensePayers = tallySchema.table("expense_payers", {
  expenseId: uuid("expense_id").notNull().references(() => expenses.id),
  memberId: uuid("member_id").notNull().references(() => groupMembers.id),
  paidMinor: bigint("paid_minor", { mode: "number" }).notNull(),
});

export const expenseParticipants = tallySchema.table("expense_participants", {
  expenseId: uuid("expense_id").notNull().references(() => expenses.id),
  memberId: uuid("member_id").notNull().references(() => groupMembers.id),
  // Meaning depends on split_method:
  //   equal: 1 or 0 (included flag)
  //   shares: weight (decimal)
  //   exact: minor-unit amount
  //   percentage: basis points
  inputValue: numeric("input_value", { precision: 20, scale: 8 }).notNull(),
  owedMinor: bigint("owed_minor", { mode: "number" }).notNull(),
  isIncluded: boolean("is_included").notNull(),
  allocationOrder: integer("allocation_order").notNull(),
});

// ───────────────────────── domain/data-validation: paid >= 0, owed >= 0 ─────────────────────────
export const expensePayersConstraints = check(
  "ep_paid_nonneg",
  sql`paid_minor >= 0`
);

export const expenseParticipantsConstraints = check(
  "ept_owed_nonneg",
  sql`owed_minor >= 0`
);

// ──────────────────────────────────────────────
// Settlements
// ──────────────────────────────────────────────
export const settlements = tallySchema.table("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  fromMemberId: uuid("from_member_id").notNull().references(() => groupMembers.id),
  toMemberId: uuid("to_member_id").notNull().references(() => groupMembers.id),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  settledOn: date("settled_on").notNull(),
  note: text("note"),
  createdByMemberId: uuid("created_by_member_id").notNull().references(() => groupMembers.id),
  status: text("status").notNull().default("active"), // 'active' | 'deleted'
  version: integer("version").notNull().default(1),
  clientMutationId: uuid("client_mutation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  idemIdx: uniqueIndex("set_idem_idx").on(t.groupId, t.clientMutationId),
  activeDateIdx: index("set_active_date_idx").on(t.groupId, t.settledOn),
  // from ≠ to
  diffCheck: check("set_from_neq_to", sql`from_member_id <> to_member_id`),
}));

// ──────────────────────────────────────────────
// Settlement allocations — R1.1
// ──────────────────────────────────────────────
export const settlementAllocations = tallySchema.table("settlement_allocations", {
  settlementId: uuid("settlement_id").notNull().references(() => settlements.id),
  expenseId: uuid("expense_id").notNull().references(() => expenses.id),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
});

// ──────────────────────────────────────────────
// Entity revisions — immutable audit trail
// ──────────────────────────────────────────────
export const entityRevisions = tallySchema.table("entity_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  version: integer("version").notNull(),
  action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'restore' | 'merge'
  snapshot: jsonb("snapshot").notNull(),
  changedByMemberId: uuid("changed_by_member_id").notNull().references(() => groupMembers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entityVersionIdx: uniqueIndex("rev_entity_version_idx")
    .on(t.entityType, t.entityId, t.version),
}));

// ──────────────────────────────────────────────
// Activity events
// ──────────────────────────────────────────────
export const activityEvents = tallySchema.table("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  actorMemberId: uuid("actor_member_id").references(() => groupMembers.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  summaryPayload: jsonb("summary_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  groupCreatedIdx: index("act_group_created_idx").on(t.groupId, t.createdAt),
}));

// ──────────────────────────────────────────────
// Recurring rules — R1.1
// ──────────────────────────────────────────────
export const recurringRules = tallySchema.table("recurring_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  cadence: text("cadence").notNull(), // 'weekly' | 'fortnightly' | 'monthly' | 'yearly'
  intervalValue: integer("interval_value").notNull().default(1),
  nextDueOn: date("next_due_on").notNull(),
  amountMode: text("amount_mode").notNull(), // 'fixed' | 'prompt'
  fixedAmountMinor: bigint("fixed_amount_minor", { mode: "number" }),
  templatePayload: jsonb("template_payload").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'paused' | 'ended'
  createdByMemberId: uuid("created_by_member_id").notNull().references(() => groupMembers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
