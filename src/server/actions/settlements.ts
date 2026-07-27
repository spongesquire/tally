"use server";

import { db } from "@/db/client";
import { schema } from "@/db/client";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

interface SaveSettlementInput {
  groupSlug: string;
  clientMutationId: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  settledOn?: string;
  note?: string;
}

export type SettlementResult =
  | { ok: true; settlementId: string }
  | {
      ok: false;
      error: string;
      type?: "validation" | "forbidden" | "conflict" | "not_found";
    };

/**
 * Record a settlement payment between two members.
 *
 * - Authenticates the caller and verifies group membership.
 * - Validates: from ≠ to, amount > 0, both members belong to the group.
 * - Uses clientMutationId for idempotency.
 * - Writes a revision snapshot + activity event in the same transaction.
 */
export async function saveSettlementAction(
  input: SaveSettlementInput
): Promise<SettlementResult> {
  const session = await getSession();
  if (!session) redirect("/");

  // Resolve group by slug
  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.slug, input.groupSlug))
    .limit(1);
  if (groups.length === 0) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
  const group = groups[0];

  // Verify caller is an active member
  const callerMembers = await db
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
  if (callerMembers.length === 0) {
    return { ok: false, error: "Not a member", type: "forbidden" };
  }
  const caller = callerMembers[0];

  // Validation: from ≠ to
  if (input.fromMemberId === input.toMemberId) {
    return {
      ok: false,
      error: "Sender and receiver must be different",
      type: "validation",
    };
  }

  // Validation: amount > 0
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return {
      ok: false,
      error: "Amount must be greater than zero",
      type: "validation",
    };
  }

  // Fetch all active members for this group, then validate both endpoints
  const activeMembers = await db
    .select({ id: schema.groupMembers.id, displayName: schema.groupMembers.displayName })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.status, "active")
      )
    );

  const memberMap = new Map(activeMembers.map((m) => [m.id, m]));
  const fromMember = memberMap.get(input.fromMemberId);
  const toMember = memberMap.get(input.toMemberId);
  if (!fromMember || !toMember) {
    return {
      ok: false,
      error: "Both members must belong to this group",
      type: "validation",
    };
  }

  // Idempotency — if clientMutationId already exists, return the original
  const existing = await db
    .select({ id: schema.settlements.id })
    .from(schema.settlements)
    .where(
      and(
        eq(schema.settlements.groupId, group.id),
        eq(schema.settlements.clientMutationId, input.clientMutationId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { ok: true, settlementId: existing[0].id };
  }

  const settledOn = input.settledOn ?? new Date().toISOString().slice(0, 10);

  const result = await db.transaction(async (tx) => {
    const [settlement] = await tx
      .insert(schema.settlements)
      .values({
        groupId: group.id,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        amountMinor: input.amountMinor,
        currency: group.baseCurrency,
        settledOn,
        note: input.note?.trim().slice(0, 2000) || null,
        createdByMemberId: caller.id,
        status: "active",
        version: 1,
        clientMutationId: input.clientMutationId,
      })
      .returning({ id: schema.settlements.id });

    // Revision snapshot — immutable audit trail
    await tx.insert(schema.entityRevisions).values({
      groupId: group.id,
      entityType: "settlement",
      entityId: settlement.id,
      version: 1,
      action: "create",
      snapshot: {
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        amountMinor: input.amountMinor,
        currency: group.baseCurrency,
        settledOn,
      },
      changedByMemberId: caller.id,
    });

    // Activity event
    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "settlement",
      entityId: settlement.id,
      action: "created",
      summaryPayload: {
        summary: `${fromMember.displayName} paid ${toMember.displayName} $${(
          input.amountMinor / 100
        ).toFixed(2)}`,
        amount: input.amountMinor,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
      },
    });

    return settlement;
  });

  revalidatePath(`/g/${input.groupSlug}`);
  revalidatePath(`/g/${input.groupSlug}/balances`);
  return { ok: true, settlementId: result.id };
}
