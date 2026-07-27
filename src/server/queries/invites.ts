import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(token)
    .digest("hex");
}

export async function getInviteInfo(token: string) {
  const tokenHash = hashToken(token);

  const invites = await db
    .select()
    .from(schema.groupInvites)
    .where(eq(schema.groupInvites.tokenHash, tokenHash))
    .limit(1);

  if (invites.length === 0) return null;
  const invite = invites[0];

  if (invite.revokedAt) return { error: "revoked" as const };
  if (invite.expiresAt && invite.expiresAt < new Date()) return { error: "expired" as const };
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return { error: "used" as const };
  }

  const groups = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.id, invite.groupId))
    .limit(1);

  if (groups.length === 0) return null;
  const group = groups[0];

  const members = await db
    .select({
      displayName: schema.groupMembers.displayName,
      colourKey: schema.groupMembers.colourKey,
    })
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.groupId, group.id))
    .orderBy(schema.groupMembers.sortOrder);

  let targetMember = null;
  if (invite.inviteType === "claim_member" && invite.targetMemberId) {
    const targets = await db
      .select()
      .from(schema.groupMembers)
      .where(eq(schema.groupMembers.id, invite.targetMemberId))
      .limit(1);
    targetMember = targets[0] ?? null;
  }

  return {
    groupName: group.name,
    iconKey: group.iconKey,
    inviteType: invite.inviteType,
    targetMember,
    members,
  };
}
