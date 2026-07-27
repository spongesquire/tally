import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export async function getExpenses(groupId: string) {
  const expenses = await db
    .select({
      id: schema.expenses.id,
      description: schema.expenses.description,
      totalMinor: schema.expenses.totalMinor,
      currency: schema.expenses.currency,
      expenseDate: schema.expenses.expenseDate,
      splitMethod: schema.expenses.splitMethod,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.iconKey,
      createdByMemberId: schema.expenses.createdByMemberId,
      creatorName: schema.groupMembers.displayName,
      status: schema.expenses.status,
    })
    .from(schema.expenses)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.expenses.categoryId))
    .leftJoin(schema.groupMembers, eq(schema.groupMembers.id, schema.expenses.createdByMemberId))
    .where(
      and(
        eq(schema.expenses.groupId, groupId),
        eq(schema.expenses.status, "active")
      )
    )
    .orderBy(desc(schema.expenses.expenseDate), desc(schema.expenses.createdAt));

  return expenses;
}

/** Get a member's share of a specific expense */
export async function getExpenseParticipant(expenseId: string, memberId: string) {
  const rows = await db
    .select()
    .from(schema.expenseParticipants)
    .where(
      and(
        eq(schema.expenseParticipants.expenseId, expenseId),
        eq(schema.expenseParticipants.memberId, memberId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Get what the current user paid for a specific expense */
export async function getExpensePayer(expenseId: string, memberId: string) {
  const rows = await db
    .select()
    .from(schema.expensePayers)
    .where(
      and(
        eq(schema.expensePayers.expenseId, expenseId),
        eq(schema.expensePayers.memberId, memberId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Get all active categories for a group */
export async function getCategories(groupId: string) {
  return db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.groupId, groupId),
        eq(schema.categories.status, "active")
      )
    )
    .orderBy(schema.categories.name);
}

/**
 * Case-insensitive search on expense description for a group.
 * Only returns active (non-deleted) expenses, newest first.
 */
export async function searchExpenses(groupId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return getExpenses(groupId);
  }

  // Use ILIKE for case-insensitive containment. Escape %, _ and \ so user
  // input cannot act as wildcard pattern.
  const escaped = trimmed.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;

  return db
    .select({
      id: schema.expenses.id,
      description: schema.expenses.description,
      totalMinor: schema.expenses.totalMinor,
      currency: schema.expenses.currency,
      expenseDate: schema.expenses.expenseDate,
      splitMethod: schema.expenses.splitMethod,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.iconKey,
      createdByMemberId: schema.expenses.createdByMemberId,
      creatorName: schema.groupMembers.displayName,
      status: schema.expenses.status,
    })
    .from(schema.expenses)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.expenses.categoryId))
    .leftJoin(schema.groupMembers, eq(schema.groupMembers.id, schema.expenses.createdByMemberId))
    .where(
      and(
        eq(schema.expenses.groupId, groupId),
        eq(schema.expenses.status, "active"),
        or(
          ilike(schema.expenses.description, pattern),
          ilike(schema.expenses.note, pattern)
        )
      )
    )
    .orderBy(desc(schema.expenses.expenseDate), desc(schema.expenses.createdAt));
}

export interface ExpensePayerRow {
  memberId: string;
  memberDisplayName: string;
  memberColourKey: string;
  paidMinor: number;
}

export interface ExpenseParticipantRow {
  memberId: string;
  memberDisplayName: string;
  memberColourKey: string;
  inputValue: string;
  owedMinor: number;
  isIncluded: boolean;
  allocationOrder: number;
}

export interface ExpenseRevisionRow {
  id: string;
  version: number;
  action: string;
  changedByMemberId: string;
  changedByName: string | null;
  createdAt: Date;
  snapshot: unknown;
}

/**
 * Get the full detail of a single expense: header, payers, participants,
 * category and the current-user's paid/owed figures.
 *
 * Includes deleted expenses so the detail page can render a tombstone.
 */
export async function getExpenseDetail(expenseId: string, currentMemberId: string) {
  const expenseRows = await db
    .select({
      id: schema.expenses.id,
      groupId: schema.expenses.groupId,
      description: schema.expenses.description,
      totalMinor: schema.expenses.totalMinor,
      currency: schema.expenses.currency,
      expenseDate: schema.expenses.expenseDate,
      categoryId: schema.expenses.categoryId,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.iconKey,
      note: schema.expenses.note,
      splitMethod: schema.expenses.splitMethod,
      status: schema.expenses.status,
      version: schema.expenses.version,
      createdByMemberId: schema.expenses.createdByMemberId,
      creatorName: schema.groupMembers.displayName,
      creatorColourKey: schema.groupMembers.colourKey,
      createdAt: schema.expenses.createdAt,
      updatedAt: schema.expenses.updatedAt,
      deletedAt: schema.expenses.deletedAt,
    })
    .from(schema.expenses)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.expenses.categoryId))
    .leftJoin(schema.groupMembers, eq(schema.groupMembers.id, schema.expenses.createdByMemberId))
    .where(eq(schema.expenses.id, expenseId))
    .limit(1);

  if (expenseRows.length === 0) return null;
  const exp = expenseRows[0];

  // Payers with member display info
  const payerRows = await db
    .select({
      memberId: schema.expensePayers.memberId,
      paidMinor: schema.expensePayers.paidMinor,
      memberDisplayName: schema.groupMembers.displayName,
      memberColourKey: schema.groupMembers.colourKey,
    })
    .from(schema.expensePayers)
    .leftJoin(schema.groupMembers, eq(schema.groupMembers.id, schema.expensePayers.memberId))
    .where(eq(schema.expensePayers.expenseId, expenseId));

  const payers: ExpensePayerRow[] = payerRows.map((p) => ({
    memberId: p.memberId,
    paidMinor: p.paidMinor,
    memberDisplayName: p.memberDisplayName ?? "—",
    memberColourKey: p.memberColourKey ?? "green",
  }));

  // Participants with member display info, ordered by allocation_order
  const participantRows = await db
    .select({
      memberId: schema.expenseParticipants.memberId,
      inputValue: schema.expenseParticipants.inputValue,
      owedMinor: schema.expenseParticipants.owedMinor,
      isIncluded: schema.expenseParticipants.isIncluded,
      allocationOrder: schema.expenseParticipants.allocationOrder,
      memberDisplayName: schema.groupMembers.displayName,
      memberColourKey: schema.groupMembers.colourKey,
    })
    .from(schema.expenseParticipants)
    .leftJoin(schema.groupMembers, eq(schema.groupMembers.id, schema.expenseParticipants.memberId))
    .where(eq(schema.expenseParticipants.expenseId, expenseId))
    .orderBy(schema.expenseParticipants.allocationOrder);

  const participants: ExpenseParticipantRow[] = participantRows.map((p) => ({
    memberId: p.memberId,
    inputValue: p.inputValue,
    owedMinor: p.owedMinor,
    isIncluded: p.isIncluded,
    allocationOrder: p.allocationOrder,
    memberDisplayName: p.memberDisplayName ?? "—",
    memberColourKey: p.memberColourKey ?? "green",
  }));

  // Current user's paid + owed for this specific expense
  const myPayer = payers.find((p) => p.memberId === currentMemberId);
  const myParticipant = participants.find((p) => p.memberId === currentMemberId);
  const currentUser = {
    paidMinor: myPayer?.paidMinor ?? 0,
    owedMinor: myParticipant?.owedMinor ?? 0,
    isIncluded: myParticipant?.isIncluded ?? false,
  };

  // Revision history
  const revisionRows = await db
    .select({
      id: schema.entityRevisions.id,
      version: schema.entityRevisions.version,
      action: schema.entityRevisions.action,
      changedByMemberId: schema.entityRevisions.changedByMemberId,
      changedByName: schema.groupMembers.displayName,
      createdAt: schema.entityRevisions.createdAt,
      snapshot: schema.entityRevisions.snapshot,
    })
    .from(schema.entityRevisions)
    .leftJoin(
      schema.groupMembers,
      eq(schema.groupMembers.id, schema.entityRevisions.changedByMemberId)
    )
    .where(
      and(
        eq(schema.entityRevisions.entityType, "expense"),
        eq(schema.entityRevisions.entityId, expenseId)
      )
    )
    .orderBy(schema.entityRevisions.version);

  const revisions: ExpenseRevisionRow[] = revisionRows.map((r) => ({
    id: r.id,
    version: r.version,
    action: r.action,
    changedByMemberId: r.changedByMemberId,
    changedByName: r.changedByName,
    createdAt: r.createdAt,
    snapshot: r.snapshot,
  }));

  return { expense: exp, payers, participants, currentUser, revisions };
}
