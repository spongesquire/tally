"use server";

import { db } from "@/db/client";
import { schema } from "@/db/client";
import { getSession } from "@/server/auth/session";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { redirect } from "next/navigation";

function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(token)
    .digest("hex");
}

/**
 * Create a general invite link for a group.
 * Returns the full URL with the raw token (token hash stored in DB).
 */
export async function createInvite(params: {
  groupSlug: string;
  inviteType: "general" | "claim_member" | "readonly";
  targetMemberId?: string;
}): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Unauthenticated" };

  // Find the group and verify the user is a member with owner/member role
  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.slug, params.groupSlug))
    .limit(1);

  if (groups.length === 0) return { ok: false, error: "Group not found" };
  const group = groups[0];

  // Get the caller's member record
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

  if (callerMembers.length === 0) return { ok: false, error: "Not a member" };
  const caller = callerMembers[0];

  // Validate target member for claim invites
  if (params.inviteType === "claim_member" && params.targetMemberId) {
    const targetMembers = await db
      .select()
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.id, params.targetMemberId),
          eq(schema.groupMembers.groupId, group.id),
          isNull(schema.groupMembers.userId)
        )
      )
      .limit(1);

    if (targetMembers.length === 0) return { ok: false, error: "Target member not found or already claimed" };
  }

  const token = generateInviteToken();
  const tokenHash = hashToken(token);

  await db.insert(schema.groupInvites).values({
    groupId: group.id,
    tokenHash,
    inviteType: params.inviteType,
    targetMemberId: params.targetMemberId ?? null,
    createdByMemberId: caller.id,
    maxUses: params.inviteType === "claim_member" ? 1 : null,
    useCount: 0,
    expiresAt: null,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL ||
    (process.env.NODE_ENV === "production" ? "https://tally-zeta-nine.vercel.app" : "http://localhost:3000");
  const link = `${baseUrl}/join/${token}`;

  return { ok: true, link };
}

/**
 * Accept an invite — either join as a new member (general) or claim an existing slot.
 */
export async function acceptInviteAction(token: string) {
  const session = await getSession();
  if (!session) redirect("/");

  const tokenHash = hashToken(token);

  const invites = await db
    .select()
    .from(schema.groupInvites)
    .where(eq(schema.groupInvites.tokenHash, tokenHash))
    .limit(1);

  if (invites.length === 0) return { ok: false, error: "Invalid invite link" };
  const invite = invites[0];

  // Check if revoked
  if (invite.revokedAt) return { ok: false, error: "This invite has been revoked" };

  // Check if expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: "This invite has expired" };
  }

  // Check max uses
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return { ok: false, error: "This invite link has already been used" };
  }

  const result = await db.transaction(async (tx) => {
    // Get the group
    const groups = await tx
      .select()
      .from(schema.groups)
      .where(eq(schema.groups.id, invite.groupId))
      .limit(1);
    if (groups.length === 0) throw new Error("Group not found");
    const group = groups[0];

    // Get user profile for name/colour defaults
    const users = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);
    const user = users[0];

    if (invite.inviteType === "claim_member" && invite.targetMemberId) {
      // Claim an existing member slot
      const targetMembers = await tx
        .select()
        .from(schema.groupMembers)
        .where(
          and(
            eq(schema.groupMembers.id, invite.targetMemberId),
            isNull(schema.groupMembers.userId)
          )
        )
        .limit(1);

      if (targetMembers.length === 0) throw new Error("Member slot already claimed");
      const target = targetMembers[0];

      await tx
        .update(schema.groupMembers)
        .set({
          userId: session.userId,
          claimedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.groupMembers.id, target.id));

      // Activity event
      await tx.insert(schema.activityEvents).values({
        groupId: group.id,
        actorMemberId: target.id,
        entityType: "member",
        entityId: target.id,
        action: "claimed",
        summaryPayload: { summary: `${target.displayName} joined the group` },
      });

      return { group, member: target };
    } else {
      // General invite — join as new member
      // Check if already a member
      const existing = await tx
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

      if (existing.length > 0) {
        return { group, member: existing[0] };
      }

      // Get next sort order
      const existingCount = await tx
        .select({ id: schema.groupMembers.id })
        .from(schema.groupMembers)
        .where(eq(schema.groupMembers.groupId, group.id));

      const [newMember] = await tx
        .insert(schema.groupMembers)
        .values({
          groupId: group.id,
          userId: session.userId,
          displayName: user.displayName,
          colourKey: user.colourKey,
          role: "member",
          status: "active",
          joinedAt: new Date(),
          claimedAt: new Date(),
          sortOrder: existingCount.length,
        })
        .returning();

      await tx.insert(schema.activityEvents).values({
        groupId: group.id,
        actorMemberId: newMember.id,
        entityType: "member",
        entityId: newMember.id,
        action: "joined",
        summaryPayload: { summary: `${user.displayName} joined the group` },
      });

      return { group, member: newMember };
    }
  });

  // Increment use count
  await db
    .update(schema.groupInvites)
    .set({ useCount: invite.useCount + 1 })
    .where(eq(schema.groupInvites.id, invite.id));

  redirect(`/g/${result.group.slug}`);
}


