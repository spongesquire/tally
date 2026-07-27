"use server";

import { db } from "@/db/client";
import { schema } from "@/db/client";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
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
