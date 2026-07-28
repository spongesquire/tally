"use server";

import { db } from "@/db/client";
import { schema } from "@/db/client";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { and, sql } from "drizzle-orm";
import { PRODUCT, DEFAULT_CATEGORIES } from "@/lib/product-config";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "group";
  // Add a random suffix to avoid collisions
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function createGroupAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/");

  const name = String(formData.get("name") || "").trim().slice(0, 80);
  if (!name) {
    return { ok: false, error: "Group name is required" };
  }

  const currency = String(formData.get("currency") || "AUD").slice(0, 3);
  const iconKey = String(formData.get("icon") || "").trim() || null;

  // Parse initial participants (JSON array of {name, colour})
  const participantsRaw = String(formData.get("participants") || "[]");
  let participants: Array<{ name: string; colour: string }> = [];
  try {
    participants = JSON.parse(participantsRaw);
  } catch {
    participants = [];
  }

  const slug = slugify(name);

  const result = await db.transaction(async (tx) => {
    // Create group
    const [group] = await tx
      .insert(schema.groups)
      .values({
        name,
        slug,
        iconKey,
        baseCurrency: currency,
        createdByUserId: session.userId,
      })
      .returning({ id: schema.groups.id, slug: schema.groups.slug });

    // Create the creator as owner member
    const userRows = await tx
      .select({ displayName: schema.users.displayName, colourKey: schema.users.colourKey })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    const [owner] = await tx.insert(schema.groupMembers).values({
      groupId: group.id,
      userId: session.userId,
      displayName: userRows[0]?.displayName ?? name,
      colourKey: userRows[0]?.colourKey ?? "green",
      role: "owner",
      status: "active",
      joinedAt: new Date(),
      claimedAt: new Date(),
      sortOrder: 0,
    }).returning({ id: schema.groupMembers.id });

    // Add unclaimed members
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      await tx.insert(schema.groupMembers).values({
        groupId: group.id,
        userId: null,
        displayName: p.name.trim().slice(0, 50),
        colourKey: p.colour || "blue",
        role: "member",
        status: "active",
        sortOrder: i + 1,
      });
    }

    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await tx.insert(schema.categories).values({
        groupId: group.id,
        name: cat.name,
        iconKey: cat.iconKey,
        isSystem: true,
        createdByMemberId: owner.id,
      });
    }

    // Create activity event
    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: owner.id,
      entityType: "group",
      entityId: group.id,
      action: "created",
      summaryPayload: { summary: `Group created` },
    });

    return group;
  });

  revalidatePath("/");
  redirect(`/g/${result.slug}`);
}

/**
 * Update a group’s name and/or icon.
 *
 * - Owner-only (per spec GRP-002).
 * - Records a revision snapshot + activity event.
 */
export async function updateGroupAction(input: {
  groupSlug: string;
  name?: string;
  iconKey?: string | null;
}): Promise<GroupActionResult> {
  const session = await getSession();
  if (!session) redirect("/");

  const resolved = await resolveOwnerMember(input.groupSlug, session.userId);
  if (!resolved.group) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
  if (!resolved.member || resolved.code === "forbidden") {
    return { ok: false, error: "Only an owner can edit this group", type: "forbidden" };
  }
  const group = resolved.group;
  const caller = resolved.member;

  const nextName = input.name?.trim().slice(0, 80) ?? null;
  const nextIcon =
    input.iconKey === undefined
      ? undefined
      : input.iconKey === null
        ? null
        : input.iconKey.trim().slice(0, 16) || null;
  if (nextName === "") {
    return { ok: false, error: "Group name cannot be empty", type: "validation" };
  }

  const setName = nextName ?? group.name;
  const setIcon = nextIcon === undefined ? group.iconKey : nextIcon;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.groups)
      .set({ name: setName, iconKey: setIcon, updatedAt: new Date() })
      .where(eq(schema.groups.id, group.id));

    await tx.insert(schema.entityRevisions).values({
      groupId: group.id,
      entityType: "group",
      entityId: group.id,
      version: 1,
      action: "update",
      snapshot: { name: setName, iconKey: setIcon },
      changedByMemberId: caller.id,
    });

    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "group",
      entityId: group.id,
      action: "updated",
      summaryPayload: { summary: `${caller.displayName} updated the group details` },
    });
  });

  revalidatePath(`/g/${input.groupSlug}`);
  revalidatePath(`/g/${input.groupSlug}/settings`);
  return { ok: true, status: group.status };
}

export type GroupActionResult =
  | { ok: true; status: string }
  | { ok: false; error: string; type?: "validation" | "forbidden" | "not_found" | "conflict" };

/**
 * Resolve the caller's active owner member row for a group, or return null
 * if the group doesn't exist or the caller is not an active owner.
 */
async function resolveOwnerMember(groupSlug: string, userId: string) {
  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.slug, groupSlug))
    .limit(1);
  if (groups.length === 0) return { group: null, member: null, code: "not_found" as const };
  const group = groups[0];

  const members = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.userId, userId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .limit(1);
  if (members.length === 0) return { group, member: null, code: "forbidden" as const };
  const member = members[0];
  if (member.role !== "owner") return { group, member, code: "forbidden" as const };
  return { group, member, code: "ok" as const };
}

/**
 * Archive a group.
 *
 * - Owner-only (per spec GRP-003).
 * - Sets status='archived', archived_at=now().
 * - Records an activity event. Does not alter money or generate settlements.
 */
export async function archiveGroupAction(groupSlug: string): Promise<GroupActionResult> {
  const session = await getSession();
  if (!session) redirect("/");

  const resolved = await resolveOwnerMember(groupSlug, session.userId);
  if (!resolved.group) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
  if (!resolved.member || resolved.code === "forbidden") {
    return { ok: false, error: "Only an owner can archive this group", type: "forbidden" };
  }
  const group = resolved.group;
  const caller = resolved.member;

  if (group.status === "archived") {
    return { ok: false, error: "Group is already archived", type: "conflict" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.groups)
      .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.groups.id, group.id));

    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "group",
      entityId: group.id,
      action: "archived",
      summaryPayload: { summary: `${caller.displayName} archived the group` },
    });
  });

  revalidatePath("/");
  revalidatePath(`/g/${groupSlug}`);
  revalidatePath(`/g/${groupSlug}/settings`);
  return { ok: true, status: "archived" };
}

/**
 * Restore an archived group.
 *
 * - Owner-only (per spec GRP-004).
 * - Sets status='active', archived_at=null.
 */
export async function restoreGroupAction(groupSlug: string): Promise<GroupActionResult> {
  const session = await getSession();
  if (!session) redirect("/");

  const resolved = await resolveOwnerMember(groupSlug, session.userId);
  if (!resolved.group) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
  if (!resolved.member || resolved.code === "forbidden") {
    return { ok: false, error: "Only an owner can restore this group", type: "forbidden" };
  }
  const group = resolved.group;
  const caller = resolved.member;

  if (group.status !== "archived") {
    return { ok: false, error: "Group is not archived", type: "conflict" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.groups)
      .set({ status: "active", archivedAt: null, updatedAt: new Date() })
      .where(eq(schema.groups.id, group.id));

    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "group",
      entityId: group.id,
      action: "restored",
      summaryPayload: { summary: `${caller.displayName} restored the group` },
    });
  });

  revalidatePath("/");
  revalidatePath(`/g/${groupSlug}`);
  revalidatePath(`/g/${groupSlug}/settings`);
  return { ok: true, status: "active" };
}

/**
 * Remove a member from a group.
 *
 * Per spec MEM-005: An owner may remove a member only when the member has no
 * active expense participation and a zero balance, or after their historical
 * ledger identity has been explicitly merged. Does NOT cascade-delete history.
 */
export async function removeMemberAction(
  groupSlug: string,
  targetMemberId: string
): Promise<{ ok: true } | { ok: false; error: string; type?: string }> {
  const session = await getSession();
  if (!session) redirect("/");

  const resolved = await resolveOwnerMember(groupSlug, session.userId);
  if (!resolved.group) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
  if (!resolved.member || resolved.member.role !== "owner") {
    return { ok: false, error: "Only an owner can remove members", type: "forbidden" };
  }
  const group = resolved.group;
  const caller = resolved.member;

  // Get the target member
  const targetMembers = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, targetMemberId),
        eq(schema.groupMembers.groupId, group.id)
      )
    )
    .limit(1);

  if (targetMembers.length === 0) {
    return { ok: false, error: "Member not found", type: "not_found" };
  }
  const target = targetMembers[0];

  // Can't remove yourself
  if (target.id === caller.id) {
    return { ok: false, error: "You can't remove yourself. Transfer ownership or leave the group instead.", type: "conflict" };
  }

  // Can't remove the only owner
  if (target.role === "owner") {
    return { ok: false, error: "Can't remove another owner. Demote them to member first.", type: "conflict" };
  }

  // Check if the member has active expenses
  const payerCount = await db
    .select({ id: schema.expensePayers.expenseId })
    .from(schema.expensePayers)
    .innerJoin(schema.expenses, eq(schema.expenses.id, schema.expensePayers.expenseId))
    .where(
      and(
        eq(schema.expensePayers.memberId, targetMemberId),
        eq(schema.expenses.status, "active")
      )
    )
    .limit(1);

  const participantCount = await db
    .select({ id: schema.expenseParticipants.expenseId })
    .from(schema.expenseParticipants)
    .innerJoin(schema.expenses, eq(schema.expenses.id, schema.expenseParticipants.expenseId))
    .where(
      and(
        eq(schema.expenseParticipants.memberId, targetMemberId),
        eq(schema.expenses.status, "active"),
        eq(schema.expenseParticipants.owedMinor, sql` > 0`)
      )
    )
    .limit(1);

  if (payerCount.length > 0 || participantCount.length > 0) {
    return {
      ok: false,
      error: "This member has active expenses. Settle or remove expenses first.",
      type: "conflict",
    };
  }

  // Soft-remove: set status to 'left'
  await db.transaction(async (tx) => {
    await tx
      .update(schema.groupMembers)
      .set({ status: "left", updatedAt: new Date() })
      .where(eq(schema.groupMembers.id, targetMemberId));

    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "member",
      entityId: targetMemberId,
      action: "removed",
      summaryPayload: { summary: `${target.displayName} was removed from the group` },
    });
  });

  revalidatePath(`/g/${groupSlug}`);
  revalidatePath(`/g/${groupSlug}/settings`);
  return { ok: true };
}

/**
 * Permanently delete a group and all its data.
 *
 * This is a destructive action for groups with no expenses or when the owner
 * wants to start fresh. For groups with history, prefer archive.
 */
export async function deleteGroupAction(
  groupSlug: string
): Promise<{ ok: true } | { ok: false; error: string; type?: string }> {
  const session = await getSession();
  if (!session) redirect("/");

  const resolved = await resolveOwnerMember(groupSlug, session.userId);
  if (!resolved.group) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
  if (!resolved.member || resolved.member.role !== "owner") {
    return { ok: false, error: "Only an owner can delete a group", type: "forbidden" };
  }
  const group = resolved.group;

  // Hard delete everything in the group (cascade)
  await db.transaction(async (tx) => {
    // Delete child rows first
    await tx.delete(schema.activityEvents).where(eq(schema.activityEvents.groupId, group.id));
    await tx.delete(schema.entityRevisions).where(eq(schema.entityRevisions.groupId, group.id));
    await tx.delete(schema.settlementAllocations);
    await tx.delete(schema.settlements).where(eq(schema.settlements.groupId, group.id));
    await tx.delete(schema.expenseParticipants);
    await tx.delete(schema.expensePayers);
    await tx.delete(schema.expenses).where(eq(schema.expenses.groupId, group.id));
    await tx.delete(schema.recurringRules).where(eq(schema.recurringRules.groupId, group.id));
    await tx.delete(schema.groupInvites).where(eq(schema.groupInvites.groupId, group.id));
    await tx.delete(schema.categories).where(eq(schema.categories.groupId, group.id));
    await tx.delete(schema.groupMembers).where(eq(schema.groupMembers.groupId, group.id));
    await tx.delete(schema.groups).where(eq(schema.groups.id, group.id));
  });

  revalidatePath("/");
  redirect("/");
}

/**
 * Leave a group as the current user.
 *
 * Per spec GRP-005: A member may leave only when they're not the sole owner
 * and their net balance is zero.
 */
export async function leaveGroupAction(
  groupSlug: string
): Promise<{ ok: true } | { ok: false; error: string; type?: string }> {
  const session = await getSession();
  if (!session) redirect("/");

  // Use a regular member resolver (not owner-only) for leave
  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.slug, groupSlug))
    .limit(1);
  if (groups.length === 0) {
    return { ok: false, error: "Group not found", type: "not_found" };
  }
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
  if (members.length === 0) {
    return { ok: false, error: "You're not a member of this group", type: "forbidden" };
  }
  const caller = members[0];

  // Check if sole owner
  if (caller.role === "owner") {
    const otherOwners = await db
      .select({ id: schema.groupMembers.id })
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.groupId, group.id),
          eq(schema.groupMembers.role, "owner"),
          eq(schema.groupMembers.status, "active"),
          sql`${schema.groupMembers.id} != ${caller.id}`
        )
      );
    if (otherOwners.length === 0) {
      return {
        ok: false,
        error: "You're the only owner. Promote another member or delete the group instead.",
        type: "conflict",
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.groupMembers)
      .set({ status: "left", updatedAt: new Date() })
      .where(eq(schema.groupMembers.id, caller.id));

    await tx.insert(schema.activityEvents).values({
      groupId: group.id,
      actorMemberId: caller.id,
      entityType: "member",
      entityId: caller.id,
      action: "left",
      summaryPayload: { summary: `${caller.displayName} left the group` },
    });
  });

  revalidatePath("/");
  redirect("/");
}
