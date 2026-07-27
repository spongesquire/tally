"use server";

import { db } from "@/db/client";
import { schema } from "@/db/client";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
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
