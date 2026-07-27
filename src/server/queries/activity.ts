import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq, desc } from "drizzle-orm";

export interface ActivityRow {
  id: string;
  actorMemberId: string | null;
  actorDisplayName: string | null;
  actorColourKey: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  summaryPayload: unknown;
  createdAt: Date;
}

/**
 * All activity events for a group, newest first.
 *
 * Release 1 ships the "All" filter only (per spec §11.8), but the entityType
 * + action fields are returned so future filters (Expenses / Payments /
 * Members) can be applied without reshaping the data.
 */
export async function getGroupActivity(groupId: string): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      id: schema.activityEvents.id,
      actorMemberId: schema.activityEvents.actorMemberId,
      actorDisplayName: schema.groupMembers.displayName,
      actorColourKey: schema.groupMembers.colourKey,
      entityType: schema.activityEvents.entityType,
      entityId: schema.activityEvents.entityId,
      action: schema.activityEvents.action,
      summaryPayload: schema.activityEvents.summaryPayload,
      createdAt: schema.activityEvents.createdAt,
    })
    .from(schema.activityEvents)
    .leftJoin(schema.groupMembers, eq(schema.groupMembers.id, schema.activityEvents.actorMemberId))
    .where(eq(schema.activityEvents.groupId, groupId))
    .orderBy(desc(schema.activityEvents.createdAt));

  return rows.map((r) => ({
    id: r.id,
    actorMemberId: r.actorMemberId,
    actorDisplayName: r.actorDisplayName,
    actorColourKey: r.actorColourKey,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    summaryPayload: r.summaryPayload,
    createdAt: r.createdAt,
  }));
}
