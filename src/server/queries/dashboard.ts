import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq, and, isNull, desc, sql, ne, inArray } from "drizzle-orm";

/**
 * Get all groups for the dashboard — active groups where the current user
 * has an active claimed member.
 */
export async function getDashboardGroups(userId: string) {
  // Join groups → group_members where user is an active member
  const rows = await db
    .select({
      group: {
        id: schema.groups.id,
        slug: schema.groups.slug,
        name: schema.groups.name,
        iconKey: schema.groups.iconKey,
        baseCurrency: schema.groups.baseCurrency,
        status: schema.groups.status,
      },
      member: {
        id: schema.groupMembers.id,
        displayName: schema.groupMembers.displayName,
        colourKey: schema.groupMembers.colourKey,
        role: schema.groupMembers.role,
      },
    })
    .from(schema.groups)
    .innerJoin(
      schema.groupMembers,
      and(
        eq(schema.groupMembers.groupId, schema.groups.id),
        eq(schema.groupMembers.userId, userId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .where(eq(schema.groups.status, "active"));

  // Get all active members for each group (for avatar stacks)
  const groupIds = rows.map((r) => r.group.id);
  const allMembers =
    groupIds.length > 0
      ? await db
          .select({
            groupId: schema.groupMembers.groupId,
            displayName: schema.groupMembers.displayName,
            colourKey: schema.groupMembers.colourKey,
            sortOrder: schema.groupMembers.sortOrder,
          })
          .from(schema.groupMembers)
          .where(
            and(
              inArray(schema.groupMembers.groupId, groupIds),
              eq(schema.groupMembers.status, "active")
            )
          )
          .orderBy(schema.groupMembers.sortOrder)
      : [];

  const membersByGroup = new Map<string, typeof allMembers>();
  for (const m of allMembers) {
    const list = membersByGroup.get(m.groupId) ?? [];
    list.push(m);
    membersByGroup.set(m.groupId, list);
  }

  const groupsWithNets = await Promise.all(
    rows.map(async (r) => ({
      ...r.group,
      currentUserMember: r.member,
      members: membersByGroup.get(r.group.id) ?? [],
      userNet: await computeUserNet(r.member.id, r.group.id),
    }))
  );
  return groupsWithNets;
}

/** Quick net computation for dashboard display */
async function computeUserNet(memberId: string, groupId: string): Promise<number> {
  const { getGroupBalances } = await import("@/server/queries/balances");
  const { balances } = await getGroupBalances(groupId);
  const b = balances.find((x) => x.memberId === memberId);
  return b?.net ?? 0;
}

/**
 * Get a single group by slug, with the current user's member info.
 */
export async function getGroupBySlug(slug: string, userId: string) {
  const groups = await db
    .select()
    .from(schema.groups)
    .where(and(eq(schema.groups.slug, slug), ne(schema.groups.status, "deleted")))
    .limit(1);

  if (groups.length === 0) return null;
  const group = groups[0];

  // Get current user's member in this group
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

  if (members.length === 0) return null;

  // Get all active members
  const allMembers = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.status, "active")
      )
    )
    .orderBy(schema.groupMembers.sortOrder);

  return { group, currentUserMember: members[0], members: allMembers };
}

/**
 * Get a group by slug for public/preview views (no auth required).
 */
export async function getGroupBySlugPublic(slug: string) {
  const groups = await db
    .select({
      id: schema.groups.id,
      slug: schema.groups.slug,
      name: schema.groups.name,
      iconKey: schema.groups.iconKey,
      baseCurrency: schema.groups.baseCurrency,
    })
    .from(schema.groups)
    .where(and(eq(schema.groups.slug, slug), eq(schema.groups.status, "active")))
    .limit(1);

  if (groups.length === 0) return null;

  const members = await db
    .select({
      displayName: schema.groupMembers.displayName,
      colourKey: schema.groupMembers.colourKey,
    })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groups[0].id),
        eq(schema.groupMembers.status, "active"),
        ne(schema.groupMembers.role, "viewer")
      )
    )
    .orderBy(schema.groupMembers.sortOrder);

  return { ...groups[0], members };
}
