"use server";

import { db } from "@/db/client";
import { schema } from "@/db/client";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import {
  parseAmountExpression,
  toMinorUnits,
  allocateEqual,
  allocateShares,
  allocatePercentages,
  validateExactSplit,
  type SplitMethod,
} from "@/domain/money/engine";

interface SaveExpenseInput {
  groupSlug: string;
  expenseId?: string;
  expectedVersion?: number;
  clientMutationId: string;
  description: string;
  amountExpression: string;
  expenseDate: string;
  categoryId?: string;
  note?: string;
  payers: Array<{ memberId: string; amountMinor: number }>;
  split: SplitData;
}

type SplitData =
  | { method: "equal"; participants: Array<{ memberId: string; included: boolean }> }
  | { method: "shares"; participants: Array<{ memberId: string; shares: string }> }
  | { method: "exact"; participants: Array<{ memberId: string; amountMinor: number }> }
  | { method: "percentage"; participants: Array<{ memberId: string; basisPoints: number }> };

export type ExpenseResult =
  | { ok: true; expenseId: string }
  | { ok: false; error: string; type?: "validation" | "forbidden" | "conflict" | "not_found" };

export async function saveExpenseAction(input: SaveExpenseInput): Promise<ExpenseResult> {
  const session = await getSession();
  if (!session) redirect("/");

  // Get group and verify membership
  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.slug, input.groupSlug))
    .limit(1);
  if (groups.length === 0) return { ok: false, error: "Group not found", type: "not_found" };
  const group = groups[0];

  const members = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.userId, session.userId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .limit(1);
  if (members.length === 0) return { ok: false, error: "Not a member", type: "forbidden" };
  const caller = members[0];

  // Parse amount
  const amountResult = parseAmountExpression(input.amountExpression);
  if (!amountResult.ok) return { ok: false, error: amountResult.error, type: "validation" };
  const totalMinor = toMinorUnits(amountResult.value);
  if (totalMinor <= 0) return { ok: false, error: "Amount must be greater than zero", type: "validation" };

  // Verify payer sums = total
  const payerSum = input.payers.reduce((s, p) => s + p.amountMinor, 0);
  if (payerSum !== totalMinor) {
    const diff = totalMinor - payerSum;
    const sign = diff > 0 ? "short" : "over";
    return {
      ok: false,
      error: `Payer amounts are $${Math.abs(diff / 100).toFixed(2)} ${sign}`,
      type: "validation",
    };
  }

  // Get all active members for validation + sort order
  const allMembers = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.status, "active"),
        sql`${schema.groupMembers.role} != 'viewer'`
      )
    )
    .orderBy(schema.groupMembers.sortOrder);

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));

  // Validate all member IDs belong to this group
  for (const p of input.payers) {
    if (!memberMap.has(p.memberId)) return { ok: false, error: "Invalid payer", type: "validation" };
  }

  // Calculate allocations using the money engine
  let allocations: Array<{ memberId: string; inputValue: number; owedMinor: number; isIncluded: boolean; allocationOrder: number }>;

  if (input.split.method === "equal") {
    const inputs = input.split.participants.map((p, i) => ({
      memberId: p.memberId,
      value: p.included ? 1 : 0,
      sortOrder: i,
    }));
    allocations = allocateEqual(totalMinor, inputs);
  } else if (input.split.method === "shares") {
    const inputs = input.split.participants.map((p, i) => ({
      memberId: p.memberId,
      value: parseFloat(p.shares) || 0,
      sortOrder: i,
    }));
    try {
      allocations = allocateShares(totalMinor, inputs);
    } catch (e: any) {
      return { ok: false, error: e.message, type: "validation" };
    }
  } else if (input.split.method === "percentage") {
    const inputs = input.split.participants.map((p, i) => ({
      memberId: p.memberId,
      value: p.basisPoints,
      sortOrder: i,
    }));
    try {
      allocations = allocatePercentages(totalMinor, inputs);
    } catch (e: any) {
      return { ok: false, error: e.message, type: "validation" };
    }
  } else {
    // exact
    const inputs = input.split.participants.map((p, i) => ({
      memberId: p.memberId,
      value: p.amountMinor,
      sortOrder: i,
    }));
    const result = validateExactSplit(totalMinor, inputs);
    if (!result.ok) return { ok: false, error: result.error, type: "validation" };
    allocations = result.allocations;
  }

  // Check for idempotency — if clientMutationId already exists, return the original
  const existing = await db
    .select({ id: schema.expenses.id })
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.groupId, group.id),
        eq(schema.expenses.clientMutationId, input.clientMutationId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { ok: true, expenseId: existing[0].id };
  }

  // Write in a transaction
  const result = await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(schema.expenses)
      .values({
        groupId: group.id,
        description: input.description.trim().slice(0, 120),
        totalMinor,
        currency: group.baseCurrency,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId || null,
        note: input.note?.trim().slice(0, 2000) || null,
        splitMethod: input.split.method,
        createdByMemberId: caller.id,
        status: "active",
        version: 1,
        clientMutationId: input.clientMutationId,
      })
      .returning({ id: schema.expenses.id });

    // Insert payers
    for (const p of input.payers) {
      await tx.insert(schema.expensePayers).values({
        expenseId: expense.id,
        memberId: p.memberId,
        paidMinor: p.amountMinor,
      });
    }

    // Insert participants
    for (const a of allocations) {
      await tx.insert(schema.expenseParticipants).values({
        expenseId: expense.id,
        memberId: a.memberId,
        inputValue: a.inputValue.toString(),
        owedMinor: a.owedMinor,
        isIncluded: a.isIncluded,
        allocationOrder: a.allocationOrder,
      });
    }

    // Revision snapshot
    await tx.insert(schema.entityRevisions).values({
      groupId: group.id,
      entityType: "expense",
      entityId: expense.id,
      version: 1,
      action: "create",
      snapshot: {
        description: input.description,
        totalMinor,
        payers: input.payers,
        split: input.split,
        allocations,
      },
      changedByMemberId: caller.id,
    });

    // Activity event
    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "expense",
      entityId: expense.id,
      action: "created",
      summaryPayload: {
        summary: `${caller.displayName} added "${input.description}" for $${(totalMinor / 100).toFixed(2)}`,
        amount: totalMinor,
        description: input.description,
      },
    });

    return expense;
  });

  revalidatePath(`/g/${input.groupSlug}`);
  return { ok: true, expenseId: result.id };
}

/**
 * Update an existing expense with optimistic concurrency control.
 *
 * Per spec EXP-007: Updates include expectedVersion. The database update
 * succeeds only when it matches the current version. On mismatch, return
 * a typed conflict result and do NOT overwrite.
 *
 * Per spec SPLIT-005: Original split inputs (shares, exact amounts,
 * percentages) are preserved and restored on edit.
 *
 * Per spec §10.1: Only creator or owner can edit.
 */
export async function updateExpenseAction(input: SaveExpenseInput & {
  expenseId: string;
  expectedVersion: number;
}): Promise<ExpenseResult> {
  const session = await getSession();
  if (!session) redirect("/");

  // Get group and verify membership
  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.slug, input.groupSlug))
    .limit(1);
  if (groups.length === 0) return { ok: false, error: "Group not found", type: "not_found" };
  const group = groups[0];

  const members = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.userId, session.userId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .limit(1);
  if (members.length === 0) return { ok: false, error: "Not a member", type: "forbidden" };
  const caller = members[0];

  // Get the expense
  const expenseRows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, input.expenseId))
    .limit(1);
  if (expenseRows.length === 0) return { ok: false, error: "Expense not found", type: "not_found" };
  const expense = expenseRows[0];

  // Authorization: creator or owner only
  const isCreator = expense.createdByMemberId === caller.id;
  const isOwner = caller.role === "owner";
  if (!isCreator && !isOwner) {
    return { ok: false, error: "Only the creator or an owner can edit this expense", type: "forbidden" };
  }

  // Optimistic concurrency: check version
  if (expense.version !== input.expectedVersion) {
    return {
      ok: false,
      error: `This expense was edited by someone else. Current version is ${expense.version}; you expected ${input.expectedVersion}.`,
      type: "conflict",
    };
  }

  // Parse amount
  const amountResult = parseAmountExpression(input.amountExpression);
  if (!amountResult.ok) return { ok: false, error: amountResult.error, type: "validation" };
  const totalMinor = toMinorUnits(amountResult.value);
  if (totalMinor <= 0) return { ok: false, error: "Amount must be greater than zero", type: "validation" };

  // Verify payer sums
  const payerSum = input.payers.reduce((s, p) => s + p.amountMinor, 0);
  if (payerSum !== totalMinor) {
    const diff = totalMinor - payerSum;
    return {
      ok: false,
      error: `Payer amounts are $${Math.abs(diff / 100).toFixed(2)} ${diff > 0 ? "short" : "over"}`,
      type: "validation",
    };
  }

  // Get all active members
  const allMembers = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.status, "active"),
        sql`${schema.groupMembers.role} != 'viewer'`
      )
    )
    .orderBy(schema.groupMembers.sortOrder);

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));

  for (const p of input.payers) {
    if (!memberMap.has(p.memberId)) return { ok: false, error: "Invalid payer", type: "validation" };
  }

  // Recalculate allocations
  let allocations: Array<{ memberId: string; inputValue: number; owedMinor: number; isIncluded: boolean; allocationOrder: number }>;

  if (input.split.method === "equal") {
    allocations = allocateEqual(totalMinor, input.split.participants.map((p, i) => ({
      memberId: p.memberId, value: p.included ? 1 : 0, sortOrder: i,
    })));
  } else if (input.split.method === "shares") {
    try {
      allocations = allocateShares(totalMinor, input.split.participants.map((p, i) => ({
        memberId: p.memberId, value: parseFloat(p.shares) || 0, sortOrder: i,
      })));
    } catch (e: any) {
      return { ok: false, error: e.message, type: "validation" };
    }
  } else if (input.split.method === "percentage") {
    try {
      allocations = allocatePercentages(totalMinor, input.split.participants.map((p, i) => ({
        memberId: p.memberId, value: p.basisPoints, sortOrder: i,
      })));
    } catch (e: any) {
      return { ok: false, error: e.message, type: "validation" };
    }
  } else {
    const result = validateExactSplit(totalMinor, input.split.participants.map((p, i) => ({
      memberId: p.memberId, value: p.amountMinor, sortOrder: i,
    })));
    if (!result.ok) return { ok: false, error: result.error, type: "validation" };
    allocations = result.allocations;
  }

  const newVersion = expense.version + 1;

  // Write in a transaction
  await db.transaction(async (tx) => {
    // Update expense header
    await tx
      .update(schema.expenses)
      .set({
        description: input.description.trim().slice(0, 120),
        totalMinor,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId || null,
        note: input.note?.trim().slice(0, 2000) || null,
        splitMethod: input.split.method,
        version: newVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.expenses.id, input.expenseId));

    // Replace payers: delete old, insert new
    await tx.delete(schema.expensePayers).where(eq(schema.expensePayers.expenseId, input.expenseId));
    for (const p of input.payers) {
      await tx.insert(schema.expensePayers).values({
        expenseId: input.expenseId,
        memberId: p.memberId,
        paidMinor: p.amountMinor,
      });
    }

    // Replace participants
    await tx.delete(schema.expenseParticipants).where(eq(schema.expenseParticipants.expenseId, input.expenseId));
    for (const a of allocations) {
      await tx.insert(schema.expenseParticipants).values({
        expenseId: input.expenseId,
        memberId: a.memberId,
        inputValue: a.inputValue.toString(),
        owedMinor: a.owedMinor,
        isIncluded: a.isIncluded,
        allocationOrder: a.allocationOrder,
      });
    }

    // Revision snapshot
    await tx.insert(schema.entityRevisions).values({
      groupId: group.id,
      entityType: "expense",
      entityId: input.expenseId,
      version: newVersion,
      action: "update",
      snapshot: {
        description: input.description,
        totalMinor,
        payers: input.payers,
        split: input.split,
        allocations,
        previousVersion: expense.version,
      },
      changedByMemberId: caller.id,
    });

    // Activity event
    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "expense",
      entityId: input.expenseId,
      action: "updated",
      summaryPayload: {
        summary: `${caller.displayName} edited "${input.description}" for $${(totalMinor / 100).toFixed(2)}`,
        amount: totalMinor,
        description: input.description,
      },
    });
  });

  revalidatePath(`/g/${input.groupSlug}`);
  revalidatePath(`/g/${input.groupSlug}/expenses/${input.expenseId}`);
  return { ok: true, expenseId: input.expenseId };
}

/**
 * Soft-delete an expense.
 *
 * - Caller must be the creator or a group owner.
 * - Sets status='deleted', deleted_at=now().
 * - Captures a 'delete' revision snapshot + activity event atomically.
 * - Never hard-deletes financial records.
 */
export async function removeExpenseAction(
  expenseId: string,
  memberId: string
): Promise<ExpenseResult> {
  const session = await getSession();
  if (!session) redirect("/");

  const expenseRows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, expenseId))
    .limit(1);
  if (expenseRows.length === 0) {
    return { ok: false, error: "Expense not found", type: "not_found" };
  }
  const expense = expenseRows[0];

  if (expense.status === "deleted") {
    return { ok: false, error: "Expense is already deleted", type: "conflict" };
  }

  // Resolve caller's active member row in this group
  const callerRows = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, memberId),
        eq(schema.groupMembers.userId, session.userId),
        eq(schema.groupMembers.groupId, expense.groupId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .limit(1);
  if (callerRows.length === 0) {
    return { ok: false, error: "Not a member", type: "forbidden" };
  }
  const caller = callerRows[0];

  // Authorisation: creator or owner only
  const isCreator = expense.createdByMemberId === caller.id;
  const isOwner = caller.role === "owner";
  if (!isCreator && !isOwner) {
    return { ok: false, error: "Only the creator or an owner can remove this expense", type: "forbidden" };
  }

  const nextVersion = expense.version + 1;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.expenses)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.expenses.id, expense.id));

    await tx.insert(schema.entityRevisions).values({
      groupId: expense.groupId,
      entityType: "expense",
      entityId: expense.id,
      version: nextVersion,
      action: "delete",
      snapshot: {
        priorVersion: expense.version,
        totalMinor: expense.totalMinor,
        description: expense.description,
      },
      changedByMemberId: caller.id,
    });

    await tx.insert(schema.activityEvents).values({
      groupId: expense.groupId,
      actorMemberId: caller.id,
      entityType: "expense",
      entityId: expense.id,
      action: "deleted",
      summaryPayload: {
        summary: `${caller.displayName} removed "${expense.description}"`,
        description: expense.description,
        amount: expense.totalMinor,
      },
    });
  });

  // Resolve slug for revalidation
  const groupRows = await db
    .select({ slug: schema.groups.slug })
    .from(schema.groups)
    .where(eq(schema.groups.id, expense.groupId))
    .limit(1);
  const slug = groupRows[0]?.slug;
  if (slug) {
    revalidatePath(`/g/${slug}`);
    revalidatePath(`/g/${slug}/balances`);
    revalidatePath(`/g/${slug}/expenses/${expense.id}`);
  }

  return { ok: true, expenseId: expense.id };
}

/**
 * Restore a soft-deleted expense.
 *
 * - Owner-only.
 * - Sets status='active', deleted_at=null.
 * - Records a 'restore' revision + activity event.
 */
export async function restoreExpenseAction(
  expenseId: string,
  memberId: string
): Promise<ExpenseResult> {
  const session = await getSession();
  if (!session) redirect("/");

  const expenseRows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, expenseId))
    .limit(1);
  if (expenseRows.length === 0) {
    return { ok: false, error: "Expense not found", type: "not_found" };
  }
  const expense = expenseRows[0];

  if (expense.status !== "deleted") {
    return { ok: false, error: "Expense is not deleted", type: "conflict" };
  }

  // Resolve caller's active member row in this group
  const callerRows = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, memberId),
        eq(schema.groupMembers.userId, session.userId),
        eq(schema.groupMembers.groupId, expense.groupId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .limit(1);
  if (callerRows.length === 0) {
    return { ok: false, error: "Not a member", type: "forbidden" };
  }
  const caller = callerRows[0];

  // Owner-only restore (per spec ACT-004)
  if (caller.role !== "owner") {
    return { ok: false, error: "Only an owner can restore deleted entries", type: "forbidden" };
  }

  const nextVersion = expense.version + 1;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.expenses)
      .set({
        status: "active",
        deletedAt: null,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.expenses.id, expense.id));

    await tx.insert(schema.entityRevisions).values({
      groupId: expense.groupId,
      entityType: "expense",
      entityId: expense.id,
      version: nextVersion,
      action: "restore",
      snapshot: {
        priorVersion: expense.version,
        totalMinor: expense.totalMinor,
        description: expense.description,
      },
      changedByMemberId: caller.id,
    });

    await tx.insert(schema.activityEvents).values({
      groupId: expense.groupId,
      actorMemberId: caller.id,
      entityType: "expense",
      entityId: expense.id,
      action: "restored",
      summaryPayload: {
        summary: `${caller.displayName} restored "${expense.description}"`,
        description: expense.description,
        amount: expense.totalMinor,
      },
    });
  });

  const groupRows = await db
    .select({ slug: schema.groups.slug })
    .from(schema.groups)
    .where(eq(schema.groups.id, expense.groupId))
    .limit(1);
  const slug = groupRows[0]?.slug;
  if (slug) {
    revalidatePath(`/g/${slug}`);
    revalidatePath(`/g/${slug}/balances`);
    revalidatePath(`/g/${slug}/expenses/${expense.id}`);
    revalidatePath(`/g/${slug}/activity`);
  }

  return { ok: true, expenseId: expense.id };
}
