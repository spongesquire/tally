"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateExpenseAction } from "@/server/actions/expenses";
import {
  parseAmountExpression,
  toMinorUnits,
  formatMoney,
  allocateEqual,
  allocateShares,
  allocatePercentages,
  validateExactSplit,
} from "@/domain/money/engine";
import { Avatar } from "@/components/shared/ui";

interface Member {
  id: string;
  displayName: string;
  colourKey: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
  iconKey: string;
}

interface GroupData {
  id: string;
  slug: string;
  name: string;
  baseCurrency: string;
}

interface ExpenseDetail {
  expense: {
    id: string;
    description: string;
    totalMinor: number;
    version: number;
    splitMethod: string;
    expenseDate: string;
    note: string | null;
    categoryId: string | null;
  };
  payers: Array<{ memberId: string; paidMinor: number }>;
  participants: Array<{ memberId: string; inputValue: string; owedMinor: number; isIncluded: boolean }>;
}

type SplitMethod = "equal" | "shares" | "exact" | "percentage";

export function EditExpenseForm({
  group,
  currentUserMember,
  members,
  categories,
  detail,
}: {
  group: GroupData;
  currentUserMember: Member;
  members: Member[];
  categories: Category[];
  detail: ExpenseDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const exp = detail.expense;
  const currentMethod = exp.splitMethod as SplitMethod;

  // Pre-fill fields from stored data
  const [amountExpr, setAmountExpr] = useState((exp.totalMinor / 100).toString());
  const [description, setDescription] = useState(exp.description);
  const [showDetails, setShowDetails] = useState(true);
  const [date, setDate] = useState(exp.expenseDate);
  const [categoryId, setCategoryId] = useState(exp.categoryId ?? "");
  const [note, setNote] = useState(exp.note ?? "");

  // Payers — restore from stored payers
  const [payers, setPayers] = useState<Array<{ memberId: string; amountMinor: number }>>(
    detail.payers.map((p) => ({ memberId: p.memberId, amountMinor: p.paidMinor }))
  );

  // Split state — restore from stored participants
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(currentMethod);
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(() => {
    if (currentMethod === "equal") {
      return new Set(detail.participants.filter((p) => p.isIncluded).map((p) => p.memberId));
    }
    return new Set(members.map((m) => m.id));
  });
  const [shares, setShares] = useState<Record<string, string>>(() => {
    if (currentMethod === "shares") {
      return Object.fromEntries(detail.participants.map((p) => [p.memberId, p.inputValue]));
    }
    return Object.fromEntries(members.map((m) => [m.id, "1"]));
  });
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    if (currentMethod === "exact") {
      return Object.fromEntries(detail.participants.map((p) => [p.memberId, (parseFloat(p.inputValue) / 100).toFixed(2)]));
    }
    return Object.fromEntries(members.map((m) => [m.id, ""]));
  });
  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    if (currentMethod === "percentage") {
      return Object.fromEntries(detail.participants.map((p) => [p.memberId, (parseFloat(p.inputValue) / 100).toString()]));
    }
    return Object.fromEntries(members.map((m) => [m.id, ""]));
  });

  const amountParsed = useMemo(() => parseAmountExpression(amountExpr), [amountExpr]);
  const totalMinor = amountParsed.ok ? toMinorUnits(amountParsed.value) : 0;

  const preview = useMemo(() => {
    if (totalMinor <= 0) return null;
    const inputs = members.map((m, i) => ({
      memberId: m.id,
      value: splitMethod === "equal" ? (includedMembers.has(m.id) ? 1 : 0)
        : splitMethod === "shares" ? (parseFloat(shares[m.id] || "0"))
        : splitMethod === "percentage" ? (Math.round(parseFloat(percentages[m.id] || "0") * 100))
        : Math.round(parseFloat(exactAmounts[m.id] || "0") * 100),
      sortOrder: i,
    }));
    try {
      if (splitMethod === "equal") return allocateEqual(totalMinor, inputs);
      if (splitMethod === "shares") return allocateShares(totalMinor, inputs);
      if (splitMethod === "percentage") return allocatePercentages(totalMinor, inputs);
      const r = validateExactSplit(totalMinor, inputs);
      return r.ok ? r.allocations : null;
    } catch { return null; }
  }, [totalMinor, splitMethod, includedMembers, shares, exactAmounts, percentages, members]);

  const isValid = useMemo(() => {
    if (!description.trim() || totalMinor <= 0 || !amountParsed.ok || !preview) return false;
    const payerSum = payers.reduce((s, p) => s + p.amountMinor, 0);
    return payerSum === totalMinor;
  }, [description, totalMinor, amountParsed, preview, payers]);

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);

    const clientMutationId = crypto.randomUUID();

    let split: any;
    if (splitMethod === "equal") {
      split = { method: "equal", participants: members.map((m) => ({ memberId: m.id, included: includedMembers.has(m.id) })) };
    } else if (splitMethod === "shares") {
      split = { method: "shares", participants: members.map((m) => ({ memberId: m.id, shares: shares[m.id] || "0" })) };
    } else if (splitMethod === "percentage") {
      split = { method: "percentage", participants: members.map((m) => ({ memberId: m.id, basisPoints: Math.round(parseFloat(percentages[m.id] || "0") * 100) })) };
    } else {
      split = { method: "exact", participants: members.map((m) => ({ memberId: m.id, amountMinor: Math.round(parseFloat(exactAmounts[m.id] || "0") * 100) })) };
    }

    startTransition(async () => {
      const result = await updateExpenseAction({
        groupSlug: group.slug,
        expenseId: exp.id,
        expectedVersion: exp.version,
        clientMutationId,
        description: description.trim(),
        amountExpression: amountExpr,
        expenseDate: date,
        categoryId: categoryId || undefined,
        note: note || undefined,
        payers,
        split,
      });

      if (result.ok) {
        router.push(`/g/${group.slug}/expenses/${exp.id}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // Payer helpers
  function addPayer(memberId: string) {
    if (payers.find((p) => p.memberId === memberId)) return;
    const remaining = totalMinor - payers.reduce((s, p) => s + p.amountMinor, 0);
    setPayers([...payers, { memberId, amountMinor: Math.max(0, remaining) }]);
  }

  function removePayer(memberId: string) {
    setPayers(payers.filter((p) => p.memberId !== memberId));
  }

  function updatePayerAmount(memberId: string, amountMinor: number) {
    setPayers(payers.map((p) => (p.memberId === memberId ? { ...p, amountMinor } : p)));
  }

  function fillRemaining(memberId: string) {
    const remaining = totalMinor - payers.filter((p) => p.memberId !== memberId).reduce((s, p) => s + p.amountMinor, 0);
    updatePayerAmount(memberId, Math.max(0, remaining));
  }

  const payerTotal = payers.reduce((s, p) => s + p.amountMinor, 0);
  const payerRemaining = totalMinor - payerTotal;
  const availableNonPayers = members.filter((m) => !payers.find((p) => p.memberId === m.id));

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/g/${group.slug}/expenses/${exp.id}`} className="text-sm text-[var(--text-2)] hover:text-[var(--text)]">
            ← Cancel
          </Link>
          <h1 className="text-lg font-semibold">Edit expense</h1>
          <div className="w-12" />
        </div>

        {/* Amount */}
        <div className="mb-6">
          <div className="text-center py-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-medium text-[var(--text-2)]">
                {group.baseCurrency === "AUD" || group.baseCurrency === "USD" ? "$" : group.baseCurrency}
              </span>
              <input
                type="text"
                value={amountExpr}
                onChange={(e) => setAmountExpr(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="text-5xl font-semibold tnum bg-transparent border-none outline-none text-center w-full max-w-[280px] placeholder:text-[var(--text-3)]"
              />
            </div>
            {amountExpr && amountParsed.ok && (
              <p className="text-sm text-[var(--text-2)] mt-1 tnum">= {formatMoney(totalMinor, group.baseCurrency)}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            maxLength={120}
            className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none transition-colors"
          />
        </div>

        {/* Multiple Payers */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--text-2)]">Paid by</label>
            {availableNonPayers.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && addPayer(e.target.value)}
                className="text-xs text-[var(--primary)] bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="">+ Add payer</option>
                {availableNonPayers.map((m) => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            {payers.map((p) => {
              const member = members.find((m) => m.id === p.memberId);
              if (!member) return null;
              return (
                <div key={p.memberId} className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface)]">
                  <Avatar name={member.displayName} colourKey={member.colourKey} size={32} />
                  <span className="flex-1 text-sm font-medium">
                    {member.id === currentUserMember.id ? "You" : member.displayName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[var(--text-3)]">{group.baseCurrency === "AUD" ? "$" : ""}</span>
                    <input
                      type="text"
                      value={(p.amountMinor / 100).toFixed(2)}
                      onChange={(e) => {
                        const val = Math.round(parseFloat(e.target.value || "0") * 100);
                        updatePayerAmount(p.memberId, isNaN(val) ? 0 : val);
                      }}
                      inputMode="decimal"
                      className="w-20 text-right text-sm font-medium tnum bg-transparent border-b border-[var(--border)] outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  {payers.length > 1 && (
                    <button onClick={() => removePayer(p.memberId)} className="text-[var(--text-3)] hover:text-[var(--danger)] p-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Payer total status */}
          {payers.length > 1 && (
            <div className="flex items-center justify-between mt-2 px-2 text-xs">
              <span className={payerRemaining === 0 ? "text-[var(--success)]" : "text-[var(--warning)]"}>
                {payerRemaining === 0 ? "✓ Payer amounts match total" : `$${Math.abs(payerRemaining / 100).toFixed(2)} ${payerRemaining > 0 ? "short" : "over"}`}
              </span>
              {payerRemaining !== 0 && payers.length > 0 && (
                <button onClick={() => fillRemaining(payers[payers.length - 1].memberId)} className="text-[var(--primary)] hover:underline font-medium">
                  Fill remaining
                </button>
              )}
            </div>
          )}
        </div>

        {/* Split method */}
        <div className="mb-4">
          <label className="text-sm font-medium text-[var(--text-2)] mb-2 block">Split</label>
          <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-[var(--radius)]">
            {(["equal", "shares", "exact", "percentage"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSplitMethod(m)}
                className={`flex-1 py-2 px-2 rounded-[var(--radius-sm)] text-sm font-medium capitalize transition-all ${
                  splitMethod === m ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Split controls with Fill remaining for exact/percentage */}
        <div className="mb-4 space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface)]">
              <Avatar name={m.displayName} colourKey={m.colourKey} size={32} />
              <span className="flex-1 text-sm font-medium">{m.id === currentUserMember.id ? "You" : m.displayName}</span>

              {splitMethod === "equal" && (
                <button
                  onClick={() => { const n = new Set(includedMembers); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setIncludedMembers(n); }}
                  className={`w-12 h-7 rounded-full transition-colors relative ${includedMembers.has(m.id) ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
                >
                  <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform" style={{ left: includedMembers.has(m.id) ? "26px" : "4px" }} />
                </button>
              )}

              {splitMethod === "shares" && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { const v = parseFloat(shares[m.id] || "0"); setShares({ ...shares, [m.id]: String(Math.max(0, v - 1)) }); }} className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm hover:bg-[var(--border)]">−</button>
                  <input type="text" value={shares[m.id] || "0"} onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })} inputMode="decimal" className="w-12 text-center text-sm font-medium tnum bg-transparent border-b border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                  <button onClick={() => { const v = parseFloat(shares[m.id] || "0"); setShares({ ...shares, [m.id]: String(v + 1) }); }} className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm hover:bg-[var(--border)]">+</button>
                </div>
              )}

              {splitMethod === "exact" && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[var(--text-3)]">{group.baseCurrency === "AUD" ? "$" : ""}</span>
                  <input type="text" value={exactAmounts[m.id] || ""} onChange={(e) => setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })} placeholder="0.00" inputMode="decimal" className="w-20 text-right text-sm font-medium tnum bg-transparent border-b border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                  <button onClick={() => {
                    const remaining = totalMinor - members.filter((x) => x.id !== m.id).reduce((s, x) => s + Math.round(parseFloat(exactAmounts[x.id] || "0") * 100), 0);
                    setExactAmounts({ ...exactAmounts, [m.id]: (Math.max(0, remaining) / 100).toFixed(2) });
                  }} className="text-xs text-[var(--primary)] hover:underline">Fill</button>
                </div>
              )}

              {splitMethod === "percentage" && (
                <div className="flex items-center gap-1">
                  <input type="text" value={percentages[m.id] || ""} onChange={(e) => setPercentages({ ...percentages, [m.id]: e.target.value })} placeholder="0" inputMode="numeric" className="w-12 text-right text-sm font-medium tnum bg-transparent border-b border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                  <span className="text-sm text-[var(--text-3)]">%</span>
                  <button onClick={() => {
                    const used = members.filter((x) => x.id !== m.id).reduce((s, x) => s + parseFloat(percentages[x.id] || "0"), 0);
                    setPercentages({ ...percentages, [m.id]: String(Math.max(0, 100 - used)) });
                  }} className="text-xs text-[var(--primary)] hover:underline">Fill</button>
                </div>
              )}

              {preview && (() => {
                const a = preview.find((p) => p.memberId === m.id);
                return a && a.owedMinor > 0 ? <span className="text-xs text-[var(--text-3)] tnum w-16 text-right">{formatMoney(a.owedMinor, group.baseCurrency)}</span> : <span className="text-xs text-[var(--text-3)] w-16 text-right">—</span>;
              })()}
            </div>
          ))}
        </div>

        {/* Details */}
        {showDetails && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-2 block">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-2 block">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none">
                <option value="">None</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-2 block">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" maxLength={2000} rows={2} className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none resize-none" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius)] bg-[var(--negative-bg)] px-4 py-3 mb-4">
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || isPending}
          className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium text-base hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] sticky bottom-6"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
