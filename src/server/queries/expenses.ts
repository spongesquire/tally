import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq, and, desc, sql } from "drizzle-orm";

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
