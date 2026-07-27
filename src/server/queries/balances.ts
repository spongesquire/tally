import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq, and, inArray } from "drizzle-orm";
import {
  calculateMemberNets,
  assertBalancedLedger,
  type ExpenseContribution,
  type SettlementContribution,
} from "@/domain/money/engine";

export interface MemberBalanceRow {
  memberId: string;
  displayName: string;
  colourKey: string;
  paid: number;
  share: number;
  sent: number;
  received: number;
  net: number;
}

/**
 * Compute per-member balances for a group using the money engine.
 *
 * Pulls active members, active expenses (with payer + participant rows),
 * and active settlements, then runs `calculateMemberNets` to derive
 * paid / share / sent / received / net for each member.
 *
 * The server always recalculates — clients never persist derived balances.
 */
export async function getGroupBalances(groupId: string): Promise<{
  balances: MemberBalanceRow[];
  currency: string;
}> {
  // Active members, ordered by stable sort order
  const members = await db
    .select({
      id: schema.groupMembers.id,
      displayName: schema.groupMembers.displayName,
      colourKey: schema.groupMembers.colourKey,
      sortOrder: schema.groupMembers.sortOrder,
    })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.status, "active")
      )
    )
    .orderBy(schema.groupMembers.sortOrder);

  // Active expense ids in this group
  const activeExpenses = await db
    .select({ id: schema.expenses.id })
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.groupId, groupId),
        eq(schema.expenses.status, "active")
      )
    );

  const expenseIds = activeExpenses.map((e) => e.id);

  // Flatten payers + participants into ExpenseContribution rows.
  // Each member's `paid` comes from expense_payers; `share` (owed) comes
  // from expense_participants. A member may appear in either, both, or neither
  // for a given expense, so we accumulate by memberId.
  const expenseContributions: ExpenseContribution[] = [];

  if (expenseIds.length > 0) {
    const payers = await db
      .select({
        memberId: schema.expensePayers.memberId,
        paidMinor: schema.expensePayers.paidMinor,
      })
      .from(schema.expensePayers)
      .where(inArray(schema.expensePayers.expenseId, expenseIds));

    const payerSet = new Map<string, number>();
    for (const p of payers) {
      payerSet.set(p.memberId, (payerSet.get(p.memberId) ?? 0) + p.paidMinor);
    }

    const participants = await db
      .select({
        memberId: schema.expenseParticipants.memberId,
        owedMinor: schema.expenseParticipants.owedMinor,
      })
      .from(schema.expenseParticipants)
      .where(inArray(schema.expenseParticipants.expenseId, expenseIds));

    const owedSet = new Map<string, number>();
    for (const p of participants) {
      owedSet.set(p.memberId, (owedSet.get(p.memberId) ?? 0) + p.owedMinor);
    }

    // Merge into contributions — every member who paid or owed anything
    const contributionMemberIds = new Set<string>([
      ...payerSet.keys(),
      ...owedSet.keys(),
    ]);
    for (const memberId of contributionMemberIds) {
      expenseContributions.push({
        memberId,
        paidMinor: payerSet.get(memberId) ?? 0,
        owedMinor: owedSet.get(memberId) ?? 0,
      });
    }
  }

  // Active settlements
  const settlementRows = await db
    .select({
      fromMemberId: schema.settlements.fromMemberId,
      toMemberId: schema.settlements.toMemberId,
      amountMinor: schema.settlements.amountMinor,
    })
    .from(schema.settlements)
    .where(
      and(
        eq(schema.settlements.groupId, groupId),
        eq(schema.settlements.status, "active")
      )
    );

  const settlements: SettlementContribution[] = settlementRows.map((s) => ({
    fromMemberId: s.fromMemberId,
    toMemberId: s.toMemberId,
    amountMinor: s.amountMinor,
  }));

  // Compute via the money engine
  const memberIds = members.map((m) => m.id);
  const nets = calculateMemberNets(memberIds, expenseContributions, settlements);

  // Defensive invariant check — any violation is a server bug
  assertBalancedLedger(nets);

  const balances: MemberBalanceRow[] = members.map((m) => {
    const b = nets.get(m.id)!;
    return {
      memberId: m.id,
      displayName: m.displayName,
      colourKey: m.colourKey,
      paid: b.paid,
      share: b.share,
      sent: b.sent,
      received: b.received,
      net: b.net,
    };
  });

  // Currency — read once from the group row
  const groupRows = await db
    .select({ baseCurrency: schema.groups.baseCurrency })
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId))
    .limit(1);
  const currency = groupRows[0]?.baseCurrency ?? "AUD";

  return { balances, currency };
}
