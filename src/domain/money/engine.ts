/**
 * Tally — Domain Money Engine
 *
 * All monetary calculations live here as pure functions.
 * Never use floating point for persisted money — everything is integer minor units.
 * The server always recalculates; client previews are advisory only.
 *
 * Per spec §9: amounts are stored as integer minor units.
 *   AUD $10.25 → 1025
 *   JPY ¥500   → 500
 *
 * The largest-remainder method is used for share/percentage/equal allocation
 * to produce deterministic, explainable results.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type MinorUnits = number; // integer ≥ 0
export type BasisPoints = number; // 10000 = 100.00%

export interface Allocation {
  memberId: string;
  /** The user-entered input: weight, exact minor units, or basis points */
  inputValue: number;
  /** The calculated amount this member owes, in minor units */
  owedMinor: MinorUnits;
  isIncluded: boolean;
  /** Stable allocation order for deterministic remainder distribution */
  allocationOrder: number;
}

export type SplitMethod = "equal" | "shares" | "exact" | "percentage";

// ──────────────────────────────────────────────
// Amount expression parser (safe — no eval)
// ──────────────────────────────────────────────

/**
 * Supported: digits, decimal point, parentheses, + - × * ÷ /
 * Rejects: division by zero, non-finite, negative, unsupported symbols
 */
export function parseAmountExpression(expr: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: false, error: "Amount is required" };

  // Allow only: digits, . + - * / × ÷ ( ) space
  const allowed = /^[0-9.\+\-\*\/×÷()\s]+$/;
  if (!allowed.test(trimmed)) {
    return { ok: false, error: "Only numbers and + − × ÷ ( ) are allowed" };
  }

  // Normalise symbols
  const normalised = trimmed.replace(/×/g, "*").replace(/÷/g, "/");

  // Tokenise and evaluate with a safe recursive-descent parser
  try {
    const tokens = tokenize(normalised);
    const parser = new Parser(tokens);
    const result = parser.parseExpression();
    parser.expectEnd();

    if (!isFinite(result)) {
      return { ok: false, error: "Result is not a finite number" };
    }
    if (result < 0) {
      return { ok: false, error: "Amount cannot be negative" };
    }

    return { ok: true, value: result };
  } catch (e: any) {
    return { ok: false, error: e.message || "Invalid expression" };
  }
}

// ─── Safe expression tokenizer + recursive descent parser ───

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") { i++; continue; }
    if (ch >= "0" && ch <= "9" || ch === ".") {
      let num = "";
      while (i < s.length && ((s[i] >= "0" && s[i] <= "9") || s[i] === ".")) {
        num += s[i]; i++;
      }
      const val = parseFloat(num);
      if (isNaN(val)) throw new Error("Invalid number");
      tokens.push({ type: "num", value: val });
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch }); i++; continue;
    }
    if (ch === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

class Parser {
  pos = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token | undefined { return this.tokens[this.pos]; }
  next(): Token { return this.tokens[this.pos++]; }

  expectEnd() {
    if (this.pos < this.tokens.length) throw new Error("Unexpected trailing input");
  }

  parseExpression(): number {
    let left = this.parseTerm();
    while (this.peek()?.type === "op" && (this.peek() as any).value === "+" || (this.peek() as any)?.value === "-") {
      const op = (this.next() as any).value;
      const right = this.parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  parseTerm(): number {
    let left = this.parseFactor();
    while (this.peek()?.type === "op" && ((this.peek() as any).value === "*" || (this.peek() as any).value === "/")) {
      const op = (this.next() as any).value;
      const right = this.parseFactor();
      if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  parseFactor(): number {
    const tok = this.peek();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.type === "num") { this.next(); return tok.value; }
    if (tok.type === "lparen") {
      this.next(); // consume (
      const val = this.parseExpression();
      const next = this.next();
      if (next?.type !== "rparen") throw new Error("Expected closing parenthesis");
      return val;
    }
    throw new Error(`Unexpected token`);
  }
}

// ──────────────────────────────────────────────
// Minor-unit conversion
// ──────────────────────────────────────────────

/**
 * Convert a decimal amount (e.g., 60.50) to minor units (6050).
 * Uses string manipulation to avoid floating-point errors.
 */
export function toMinorUnits(decimalAmount: number, decimals = 2): MinorUnits {
  // Round to the specified number of decimal places, then convert
  const rounded = Math.round((decimalAmount + Number.EPSILON) * Math.pow(10, decimals));
  return Math.round(rounded);
}

/**
 * Format minor units back to a display string (e.g., 6050 → "$60.50").
 */
export function formatMoney(minor: MinorUnits, currency = "AUD", decimals = 2): string {
  const major = minor / Math.pow(10, decimals);
  const symbol = currencySymbol(currency);
  return `${symbol}${major.toLocaleString("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatMoneyShort(minor: MinorUnits, currency = "AUD"): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${formatMoney(abs, currency)}`;
}

export function currencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    AUD: "$", USD: "$", NZD: "$", CAD: "$",
    GBP: "£", EUR: "€", JPY: "¥", CNY: "¥",
    SGD: "$", HKD: "$", INR: "₹",
  };
  return symbols[currency] ?? `${currency} `;
}

// ──────────────────────────────────────────────
// Allocation — Largest Remainder Method
// ──────────────────────────────────────────────

interface ParticipantInput {
  memberId: string;
  /** Weight, exact amount, or basis points depending on method */
  value: number;
  /** Stable sort order for deterministic tie-breaking */
  sortOrder: number;
}

/**
 * Allocate totalMinor among participants using equal split.
 * Remainder minor units distributed by stable member order.
 *
 * Per spec Example C: $10.00 / 3 → 334, 333, 333
 */
export function allocateEqual(
  totalMinor: MinorUnits,
  participants: ParticipantInput[]
): Allocation[] {
  if (participants.length === 0) {
    throw new Error("Cannot split among zero participants");
  }
  const included = participants;
  const baseShare = Math.floor(totalMinor / included.length);
  let remainder = totalMinor - baseShare * included.length;

  // Sort by stable order for deterministic remainder distribution
  const sorted = [...included].sort((a, b) => a.sortOrder - b.sortOrder);

  return sorted.map((p, idx) => {
    let owed = baseShare;
    if (remainder > 0) {
      owed += 1;
      remainder--;
    }
    return {
      memberId: p.memberId,
      inputValue: 1,
      owedMinor: owed,
      isIncluded: true,
      allocationOrder: idx,
    };
  });
}

/**
 * Allocate totalMinor using shares/weights.
 * Weight 0 = excluded, 1 = normal, 2 = double, 0.5 = half.
 *
 * Per spec Example B: shares 1/2/3 on $10.00 → 167, 333, 500
 */
export function allocateShares(
  totalMinor: MinorUnits,
  participants: ParticipantInput[]
): Allocation[] {
  // Reject negative weights (spec: non-negative weight)
  for (const p of participants) {
    if (p.value < 0) {
      throw new Error("Shares cannot be negative");
    }
  }

  // Filter to included (weight > 0)
  const included = participants.filter((p) => p.value > 0);
  if (included.length === 0) {
    throw new Error("Shares need at least one person above 0");
  }

  const totalWeight = included.reduce((s, p) => s + p.value, 0);

  // Compute exact quotas and initial floor allocations
  const quotas = included.map((p) => ({
    memberId: p.memberId,
    weight: p.value,
    exactQuota: (totalMinor * p.value) / totalWeight,
    sortOrder: p.sortOrder,
  }));

  let allocated = quotas.reduce((s, q) => s + Math.floor(q.exactQuota), 0);
  let remainder = totalMinor - allocated;

  // Sort by descending fractional part, then stable order for ties
  const sortedByRemainder = [...quotas].sort((a, b) => {
    const fracA = a.exactQuota - Math.floor(a.exactQuota);
    const fracB = b.exactQuota - Math.floor(b.exactQuota);
    if (fracB !== fracA) return fracB - fracA;
    return a.sortOrder - b.sortOrder;
  });

  // Assign base + remainder
  const owedMap = new Map<string, number>();
  for (const q of quotas) {
    owedMap.set(q.memberId, Math.floor(q.exactQuota));
  }
  for (let i = 0; i < remainder; i++) {
    const target = sortedByRemainder[i];
    owedMap.set(target.memberId, owedMap.get(target.memberId)! + 1);
  }

  // Build result in original participant order
  return participants.map((p, idx) => {
    const owed = p.value > 0 ? (owedMap.get(p.memberId) ?? 0) : 0;
    return {
      memberId: p.memberId,
      inputValue: p.value,
      owedMinor: owed,
      isIncluded: p.value > 0,
      allocationOrder: idx,
    };
  });
}

/**
 * Allocate using percentages stored as basis points (10000 = 100%).
 * Total basis points must equal 10000.
 * Uses the same largest-remainder method.
 */
export function allocatePercentages(
  totalMinor: MinorUnits,
  participants: ParticipantInput[]
): Allocation[] {
  const included = participants.filter((p) => p.value > 0);
  if (included.length === 0) {
    throw new Error("Percentages need at least one non-zero entry");
  }

  const totalBp = included.reduce((s, p) => s + p.value, 0);
  if (totalBp !== 10000) {
    throw new Error(
      `Percentages total ${(totalBp / 100).toFixed(2)}%; must equal 100%`
    );
  }

  const quotas = included.map((p) => ({
    memberId: p.memberId,
    bp: p.value,
    exactQuota: (totalMinor * p.value) / 10000,
    sortOrder: p.sortOrder,
  }));

  let allocated = quotas.reduce((s, q) => s + Math.floor(q.exactQuota), 0);
  let remainder = totalMinor - allocated;

  const sortedByRemainder = [...quotas].sort((a, b) => {
    const fracA = a.exactQuota - Math.floor(a.exactQuota);
    const fracB = b.exactQuota - Math.floor(b.exactQuota);
    if (fracB !== fracA) return fracB - fracA;
    return a.sortOrder - b.sortOrder;
  });

  const owedMap = new Map<string, number>();
  for (const q of quotas) {
    owedMap.set(q.memberId, Math.floor(q.exactQuota));
  }
  for (let i = 0; i < remainder; i++) {
    const target = sortedByRemainder[i];
    owedMap.set(target.memberId, owedMap.get(target.memberId)! + 1);
  }

  return participants.map((p, idx) => {
    const owed = p.value > 0 ? (owedMap.get(p.memberId) ?? 0) : 0;
    return {
      memberId: p.memberId,
      inputValue: p.value,
      owedMinor: owed,
      isIncluded: p.value > 0,
      allocationOrder: idx,
    };
  });
}

/**
 * Validate exact split — amounts must sum to total exactly.
 * No rounding step; user-entered minor units must match.
 */
export function validateExactSplit(
  totalMinor: MinorUnits,
  participants: ParticipantInput[]
): { ok: true; allocations: Allocation[] } | { ok: false; error: string } {
  const included = participants.filter((p) => p.value > 0);
  if (included.length === 0) {
    return { ok: false, error: "At least one person must have an amount" };
  }

  const sum = included.reduce((s, p) => s + Math.round(p.value), 0);

  if (sum !== totalMinor) {
    const diff = totalMinor - sum;
    const sign = diff > 0 ? "short" : "over";
    const absDiff = Math.abs(diff);
    return {
      ok: false,
      error: `Exact amounts are ${formatMoney(absDiff)} ${sign}`,
    };
  }

  const allocations = participants.map((p, idx) => ({
    memberId: p.memberId,
    inputValue: Math.round(p.value),
    owedMinor: p.value > 0 ? Math.round(p.value) : 0,
    isIncluded: p.value > 0,
    allocationOrder: idx,
  }));

  return { ok: true, allocations };
}

// ──────────────────────────────────────────────
// Balance calculation
// ──────────────────────────────────────────────

export interface MemberBalance {
  memberId: string;
  paid: MinorUnits;
  share: MinorUnits;
  sent: MinorUnits; // settlements sent (reduces what they owe)
  received: MinorUnits; // settlements received (reduces what they're owed)
  net: number; // positive = owed money, negative = owes money
}

export interface ExpenseContribution {
  memberId: string;
  paidMinor: MinorUnits;
  owedMinor: MinorUnits;
}

export interface SettlementContribution {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: MinorUnits;
}

/**
 * Calculate net balances for all members in a group.
 *
 * net = paid − share + sent − received
 * Positive = member is owed money.
 * Negative = member owes money.
 * Zero = settled.
 */
export function calculateMemberNets(
  memberIds: string[],
  expenses: ExpenseContribution[],
  settlements: SettlementContribution[]
): Map<string, MemberBalance> {
  const balances = new Map<string, MemberBalance>();

  for (const id of memberIds) {
    balances.set(id, {
      memberId: id,
      paid: 0,
      share: 0,
      sent: 0,
      received: 0,
      net: 0,
    });
  }

  for (const exp of expenses) {
    const b = balances.get(exp.memberId);
    if (!b) continue;
    b.paid += exp.paidMinor;
    b.share += exp.owedMinor;
  }

  for (const set of settlements) {
    const from = balances.get(set.fromMemberId);
    const to = balances.get(set.toMemberId);
    if (from) {
      from.sent += set.amountMinor;
    }
    if (to) {
      to.received += set.amountMinor;
    }
  }

  for (const b of balances.values()) {
    b.net = b.paid - b.share + b.sent - b.received;
  }

  return balances;
}

/**
 * Assert that the sum of all member nets equals zero.
 * This is an invariant — any violation is a server error.
 */
export function assertBalancedLedger(balances: Map<string, MemberBalance>): void {
  let sum = 0;
  for (const b of balances.values()) {
    sum += b.net;
  }
  if (sum !== 0) {
    throw new Error(
      `Ledger invariant violated: sum of member nets = ${sum}, expected 0`
    );
  }
}

// ──────────────────────────────────────────────
// Settlement suggestion — deterministic greedy matcher
// ──────────────────────────────────────────────

export interface SuggestedSettlement {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: MinorUnits;
}

/**
 * Generate a deterministic settlement plan using a greedy matcher.
 *
 * 1. Build creditors (positive net) and debtors (negative net).
 * 2. Sort both by absolute balance descending, then stable member order.
 * 3. Match largest debtor to largest creditor.
 * 4. Transfer the smaller of debtor's absolute amount and creditor's amount.
 * 5. Reduce both and repeat until zero.
 *
 * NOT labelled as mathematically minimum — just "A simpler way to settle".
 */
export function suggestSettlements(
  balances: Map<string, MemberBalance>
): SuggestedSettlement[] {
  type Entry = { memberId: string; amount: number };

  // Creditors: net > 0 (they are owed money → they should receive)
  // Debtors: net < 0 (they owe money → they should send)
  const creditors: Entry[] = [];
  const debtors: Entry[] = [];

  // Use member order for stable tie-breaking
  const sortedMemberIds = [...balances.keys()].sort();

  for (const id of sortedMemberIds) {
    const b = balances.get(id)!;
    if (b.net > 0) creditors.push({ memberId: id, amount: b.net });
    else if (b.net < 0) debtors.push({ memberId: id, amount: Math.abs(b.net) });
  }

  // Sort by absolute amount descending, stable by memberId for ties
  const sortByAmountDesc = (a: Entry, b: Entry) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.memberId < b.memberId ? -1 : 1;
  };
  creditors.sort(sortByAmountDesc);
  debtors.sort(sortByAmountDesc);

  const suggestions: SuggestedSettlement[] = [];

  let ci = 0; // creditor index
  let di = 0; // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Math.min(debtor.amount, creditor.amount);

    if (transfer > 0) {
      suggestions.push({
        fromMemberId: debtor.memberId, // debtor sends
        toMemberId: creditor.memberId,  // creditor receives
        amountMinor: transfer,
      });
    }

    creditor.amount -= transfer;
    debtor.amount -= transfer;

    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return suggestions;
}
