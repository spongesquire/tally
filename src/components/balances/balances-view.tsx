"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, netStatus, formatSigned, formatUnsigned } from "@/components/shared/ui";
import { suggestSettlements, type MemberBalance } from "@/domain/money/engine";

interface BalanceRow {
  memberId: string;
  displayName: string;
  colourKey: string;
  paid: number;
  share: number;
  sent: number;
  received: number;
  net: number;
}

interface Suggestion {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}

export function BalancesView({
  groupSlug,
  balances,
  currency,
  currentUserMemberId,
}: {
  groupSlug: string;
  balances: BalanceRow[];
  currency: string;
  currentUserMemberId: string;
}) {
  const me = balances.find((b) => b.memberId === currentUserMemberId);
  const myStatus = me ? netStatus(me.net) : netStatus(0);

  // Derive settlement suggestions from current nets via the money engine.
  // Rebuild a MemberBalance map so we can reuse the engine function directly.
  const netsMap = new Map<string, MemberBalance>();
  for (const b of balances) {
    netsMap.set(b.memberId, {
      memberId: b.memberId,
      paid: b.paid,
      share: b.share,
      sent: b.sent,
      received: b.received,
      net: b.net,
    });
  }
  const suggestions: Suggestion[] = suggestSettlements(netsMap);

  const memberName = (id: string) =>
    balances.find((b) => b.memberId === id)?.displayName ?? "—";

  return (
    <div className="space-y-6">
      {/* Current user summary card */}
      {me && (
        <div
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ backgroundColor: myStatus.bg, borderColor: "var(--border)" }}
        >
          <p className="text-sm text-[var(--text-2)] mb-1">{myStatus.label}</p>
          <p className="text-3xl font-semibold tnum" style={{ color: myStatus.colour }}>
            {me.net === 0
              ? "Settled up"
              : formatUnsigned(Math.abs(me.net), currency)}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <SummaryStat label="You paid" value={me.paid} currency={currency} />
            <SummaryStat label="Your share" value={me.share} currency={currency} />
            <SummaryStat label="You sent" value={me.sent} currency={currency} />
            <SummaryStat label="You received" value={me.received} currency={currency} />
          </div>
        </div>
      )}

      {/* Suggested settlements */}
      {suggestions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-3">
            Suggested payments
          </h2>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <SuggestionRow
                key={`${s.fromMemberId}-${s.toMemberId}-${i}`}
                suggestion={s}
                fromName={memberName(s.fromMemberId)}
                toName={memberName(s.toMemberId)}
                currency={currency}
                groupSlug={groupSlug}
              />
            ))}
          </div>
        </section>
      )}

      {/* All members breakdown */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-3">
          Member breakdown
        </h2>
        <div className="space-y-2">
          {balances.map((b) => (
            <MemberRow
              key={b.memberId}
              row={b}
              currency={currency}
              isMe={b.memberId === currentUserMemberId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <div>
      <p className="text-[var(--text-3)] text-xs">{label}</p>
      <p className="font-medium tnum">{formatUnsigned(value, currency)}</p>
    </div>
  );
}

function MemberRow({
  row,
  currency,
  isMe,
}: {
  row: BalanceRow;
  currency: string;
  isMe: boolean;
}) {
  const status = netStatus(row.net);
  return (
    <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-3.5">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={row.displayName} colourKey={row.colourKey} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {row.displayName}
            {isMe && <span className="text-[var(--text-3)] ml-1.5">(you)</span>}
          </p>
        </div>
        <span className="text-sm font-semibold tnum" style={{ color: status.colour }}>
          {formatSigned(row.net, currency)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <BreakdownStat label="Paid" value={row.paid} currency={currency} />
        <BreakdownStat label="Share" value={row.share} currency={currency} />
        <BreakdownStat label="Sent" value={row.sent} currency={currency} />
        <BreakdownStat label="Received" value={row.received} currency={currency} />
      </div>
    </div>
  );
}

function BreakdownStat({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-3)]">{label}</span>
      <span className="tnum text-[var(--text-2)]">{formatUnsigned(value, currency)}</span>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  fromName,
  toName,
  currency,
  groupSlug,
}: {
  suggestion: Suggestion;
  fromName: string;
  toName: string;
  currency: string;
  groupSlug: string;
}) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function recordPayment() {
    setState("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupSlug,
          clientMutationId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          fromMemberId: suggestion.fromMemberId,
          toMemberId: suggestion.toMemberId,
          amountMinor: suggestion.amountMinor,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setState("done");
        router.refresh();
      } else {
        setState("error");
        setError(data.error ?? "Could not record payment");
      }
    } catch {
      setState("error");
      setError("Network error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-3.5 flex items-center justify-between">
        <p className="text-sm text-[var(--text-2)]">
          {fromName} paid {toName} {formatUnsigned(suggestion.amountMinor, currency)}
        </p>
        <span className="text-xs text-[var(--success)] font-medium">Recorded ✓</span>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{fromName}</span>
            <span className="text-[var(--text-3)]"> pays </span>
            <span className="font-medium">{toName}</span>
          </p>
          <p className="text-base font-semibold tnum mt-0.5">
            {formatUnsigned(suggestion.amountMinor, currency)}
          </p>
          {error && <p className="text-xs text-[var(--danger)] mt-1">{error}</p>}
        </div>
        <button
          onClick={recordPayment}
          disabled={state === "submitting"}
          className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60"
        >
          {state === "submitting" ? "Recording…" : "Record payment"}
        </button>
      </div>
    </div>
  );
}
