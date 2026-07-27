"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  formatDate,
  formatUnsigned,
  currencySymbol,
} from "@/components/shared/ui";
import {
  removeExpenseAction,
  restoreExpenseAction,
} from "@/server/actions/expenses";
import type {
  ExpensePayerRow,
  ExpenseParticipantRow,
  ExpenseRevisionRow,
} from "@/server/queries/expenses";

interface ExpenseDetailData {
  expense: {
    id: string;
    groupId: string;
    description: string;
    totalMinor: number;
    currency: string;
    expenseDate: Date | string;
    categoryId: string | null;
    categoryName: string | null;
    categoryIcon: string | null;
    note: string | null;
    splitMethod: string;
    status: string;
    version: number;
    createdByMemberId: string;
    creatorName: string | null;
    creatorColourKey: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    deletedAt: Date | string | null;
  };
  payers: ExpensePayerRow[];
  participants: ExpenseParticipantRow[];
  currentUser: {
    paidMinor: number;
    owedMinor: number;
    isIncluded: boolean;
  };
  revisions: ExpenseRevisionRow[];
}

export function ExpenseDetail({
  groupSlug,
  detail,
  canMutate,
  isOwner,
  currentMemberId,
}: {
  groupSlug: string;
  detail: ExpenseDetailData;
  canMutate: boolean;
  isOwner: boolean;
  currentMemberId: string;
}) {
  const router = useRouter();
  const { expense, payers, participants, currentUser, revisions } = detail;
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDeleted = expense.status === "deleted";
  const symbol = currencySymbol(expense.currency);

  async function handleRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removeExpenseAction(expense.id, currentMemberId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleRestore() {
    setError(null);
    startTransition(async () => {
      const res = await restoreExpenseAction(expense.id, currentMemberId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  // ── Tombstone view for deleted expenses ───────────────────────────
  if (isDeleted) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/g/${groupSlug}`}
            className="text-sm text-[var(--text-2)] hover:text-[var(--text)]"
          >
            ← Back
          </Link>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text)] mb-1">This expense was removed</p>
          <p className="text-xs text-[var(--text-3)] mb-1">{expense.description}</p>
          <p className="text-sm tnum text-[var(--text-2)] mb-4">
            {formatUnsigned(expense.totalMinor, expense.currency)}
          </p>
          {expense.deletedAt && (
            <p className="text-xs text-[var(--text-3)]">
              Removed {formatDate(expense.deletedAt)}
            </p>
          )}

          {error && <p className="text-xs text-[var(--danger)] mt-3">{error}</p>}

          {isOwner && (
            <button
              onClick={handleRestore}
              disabled={pending}
              className="mt-5 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {pending ? "Restoring…" : "Restore expense"}
            </button>
          )}
        </div>

        <RevisionsList revisions={revisions} />
      </div>
    );
  }

  // ── Live expense detail ───────────────────────────────────────────
  const myPaid = currentUser.paidMinor;
  const myOwed = currentUser.owedMinor;
  const effect = myPaid - myOwed;

  const includedCount = participants.filter((p) => p.isIncluded).length;
  const totalShares = participants.reduce((s, p) => {
    return s + (expense.splitMethod === "shares" ? Number(p.inputValue) || 0 : p.isIncluded ? 1 : 0);
  }, 0);
  const myShares =
    expense.splitMethod === "shares"
      ? Number(participants.find((p) => p.memberId === currentMemberId)?.inputValue ?? "0") || 0
      : includedCount > 0 && currentUser.isIncluded
        ? 1
        : 0;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/g/${groupSlug}`}
          className="text-sm text-[var(--text-2)] hover:text-[var(--text)]"
        >
          ← Back
        </Link>
        {canMutate && (
          <div className="flex gap-2">
            <Link
              href={`/g/${groupSlug}/expenses/${expense.id}/edit`}
              className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] text-[var(--danger)] border border-[var(--border)] hover:bg-[var(--negative-bg)] transition-colors"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          {expense.categoryIcon && <span className="text-2xl leading-none">{expense.categoryIcon}</span>}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight mb-1 break-words">
              {expense.description}
            </h1>
            <p className="text-sm text-[var(--text-2)]">
              {expense.categoryName ?? "Uncategorised"} · {formatDate(expense.expenseDate)}
            </p>
          </div>
        </div>
        <p className="text-4xl font-semibold tnum">
          {formatUnsigned(expense.totalMinor, expense.currency)}
        </p>
      </div>

      {/* Current-user effect sentence (spec §11.6) */}
      <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-4 mb-4">
        <p className="text-xs uppercase tracking-wide text-[var(--text-3)] mb-1.5">Your effect</p>
        <CurrentUserEffect
          paid={myPaid}
          owed={myOwed}
          effect={effect}
          splitMethod={expense.splitMethod}
          myShares={myShares}
          totalShares={totalShares}
          currency={expense.currency}
          isIncluded={currentUser.isIncluded}
        />
      </div>

      {/* Paid-by breakdown */}
      <Section title="Paid by">
        <div className="space-y-2">
          {payers.length === 0 ? (
            <EmptyRow label="No payers recorded" />
          ) : (
            payers.map((p) => (
              <MemberLine
                key={p.memberId}
                name={p.memberDisplayName}
                colourKey={p.memberColourKey}
                right={
                  <span className="text-sm font-medium tnum">
                    {formatUnsigned(p.paidMinor, expense.currency)}
                  </span>
                }
                isMe={p.memberId === currentMemberId}
              />
            ))
          )}
        </div>
      </Section>

      {/* Split breakdown */}
      <Section title={`Split (${splitLabel(expense.splitMethod)})`}>
        <div className="space-y-2">
          {participants.length === 0 ? (
            <EmptyRow label="No participants" />
          ) : (
            participants.map((p) => (
              <MemberLine
                key={p.memberId}
                name={p.memberDisplayName}
                colourKey={p.memberColourKey}
                isMe={p.memberId === currentMemberId}
                dimmed={!p.isIncluded}
                right={
                  <div className="text-right">
                    <div className="text-sm font-medium tnum">
                      {formatUnsigned(p.owedMinor, expense.currency)}
                    </div>
                    <div className="text-xs text-[var(--text-3)] tnum">
                      {inputLabel(expense.splitMethod, p.inputValue, p.isIncluded, symbol)}
                    </div>
                  </div>
                }
              />
            ))
          )}
        </div>
      </Section>

      {/* Note */}
      {expense.note && (
        <Section title="Note">
          <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{expense.note}</p>
        </Section>
      )}

      {/* Creator + last updated */}
      <Section title="Details">
        <div className="space-y-1.5 text-sm">
          <MetaRow
            label="Added by"
            value={
              <span className="inline-flex items-center gap-2">
                <Avatar
                  name={expense.creatorName ?? "?"}
                  colourKey={expense.creatorColourKey ?? "green"}
                  size={20}
                />
                {expense.creatorName ?? "—"}
              </span>
            }
          />
          <MetaRow label="Added" value={formatDate(expense.createdAt)} />
          <MetaRow label="Last updated" value={formatDate(expense.updatedAt)} />
        </div>
      </Section>

      {/* Revision history */}
      {revisions.length > 0 && <RevisionsList revisions={revisions} />}

      {/* Remove confirmation dialog */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-5">
            <h3 className="text-base font-semibold mb-2">Remove this expense?</h3>
            <p className="text-sm text-[var(--text-2)] mb-1">
              Removing <span className="font-medium text-[var(--text)]">{expense.description}</span>{" "}
              reverses its effect on everyone’s balances.
            </p>
            <p className="text-sm text-[var(--text-2)] mb-4">
              {isOwner
                ? "You can restore it later from this page because you are an owner."
                : "The group owner can restore it later if needed."}
            </p>
            {error && <p className="text-xs text-[var(--danger)] mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                disabled={pending}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--danger)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Removing…" : "Remove expense"}
              </button>
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setError(null);
                }}
                disabled={pending}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] border border-[var(--border)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function splitLabel(method: string): string {
  switch (method) {
    case "equal": return "equal";
    case "shares": return "by shares";
    case "exact": return "exact amounts";
    case "percentage": return "by percentage";
    default: return method;
  }
}

function inputLabel(
  method: string,
  inputValue: string,
  isIncluded: boolean,
  symbol: string
): string {
  if (!isIncluded) return "excluded";
  switch (method) {
    case "equal":
      return "1 share";
    case "shares":
      return `${trimNumber(inputValue)} shares`;
    case "exact":
      return `${symbol}${(Number(inputValue) / 100).toFixed(2)} input`;
    case "percentage": {
      const pct = Number(inputValue) / 100;
      return `${trimNumber(pct.toFixed(2))}%`;
    }
    default:
      return inputValue;
  }
}

function trimNumber(s: string): string {
  return s.replace(/\.?0+$/, "");
}

function CurrentUserEffect({
  paid,
  owed,
  effect,
  splitMethod,
  myShares,
  totalShares,
  currency,
  isIncluded,
}: {
  paid: number;
  owed: number;
  effect: number;
  splitMethod: string;
  myShares: number;
  totalShares: number;
  currency: string;
  isIncluded: boolean;
}) {
  // Spec §11.6 example:
  //   "You paid $60.50 and your 2 of 4 total shares equal $30.25,
  //    so this expense adds $30.25 to what you are owed."
  if (paid === 0 && owed === 0) {
    return (
      <p className="text-sm text-[var(--text-2)]">
        You’re not involved in this expense.
      </p>
    );
  }

  const effectSign = effect > 0 ? "adds" : effect < 0 ? "reduces" : "changes nothing in";
  const effectAbs = Math.abs(effect);
  const effectColour =
    effect > 0 ? "var(--success)" : effect < 0 ? "var(--danger)" : "var(--text-2)";

  const paidClause = paid > 0 ? `You paid ${formatUnsigned(paid, currency)}` : "";

  let shareClause = "";
  if (isIncluded && owed > 0) {
    if (splitMethod === "equal") {
      shareClause = `your share is ${formatUnsigned(owed, currency)}`;
    } else if (splitMethod === "shares") {
      shareClause = `your ${trimNumber(String(myShares))} of ${trimNumber(String(totalShares))} total shares equal ${formatUnsigned(owed, currency)}`;
    } else if (splitMethod === "exact") {
      shareClause = `your share is ${formatUnsigned(owed, currency)}`;
    } else if (splitMethod === "percentage") {
      shareClause = `your share is ${formatUnsigned(owed, currency)}`;
    }
  } else if (owed === 0 && isIncluded) {
    shareClause = "your share is $0.00";
  }

  const clauses = [paidClause, shareClause].filter(Boolean).join(" and ");

  return (
    <p className="text-sm text-[var(--text)] leading-relaxed">
      {clauses}
      {clauses && ". "}
      <span style={{ color: effectColour }}>
        {effect !== 0
          ? `This expense ${effectSign} `
          : "This expense changes nothing in "}
        {effect !== 0 ? (
          <>
            {formatUnsigned(effectAbs, currency)} {effect > 0 ? "to what you’re owed." : "from what you owe."}
          </>
        ) : (
          "your balance."
        )}
      </span>
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2 px-1">
        {title}
      </h2>
      <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-3.5">
        {children}
      </div>
    </section>
  );
}

function MemberLine({
  name,
  colourKey,
  right,
  isMe,
  dimmed,
}: {
  name: string;
  colourKey: string;
  right?: React.ReactNode;
  isMe?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${dimmed ? "opacity-50" : ""}`}>
      <Avatar name={name} colourKey={colourKey} size={28} />
      <div className="flex-1 min-w-0 text-sm truncate">
        {name}
        {isMe && <span className="text-[var(--text-3)] ml-1.5">(you)</span>}
      </div>
      {right}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-3)]">{label}</span>
      <span className="text-[var(--text)]">{value}</span>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="text-sm text-[var(--text-3)] py-2">{label}</p>;
}

function RevisionsList({ revisions }: { revisions: ExpenseRevisionRow[] }) {
  if (revisions.length === 0) return null;
  return (
    <section className="mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2 px-1">
        Revision history
      </h2>
      <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)]">
        {revisions.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 text-sm">
            <RevisionBadge action={r.action} />
            <div className="flex-1 min-w-0">
              <p className="truncate">
                <span className="font-medium">v{r.version}</span>
                {r.changedByName && (
                  <span className="text-[var(--text-2)]"> · {r.changedByName}</span>
                )}
              </p>
              <p className="text-xs text-[var(--text-3)]">{formatDate(r.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RevisionBadge({ action }: { action: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    create: { bg: "var(--positive-bg)", fg: "var(--success)", label: "Created" },
    update: { bg: "var(--surface-2)", fg: "var(--text-2)", label: "Edited" },
    delete: { bg: "var(--negative-bg)", fg: "var(--danger)", label: "Removed" },
    restore: { bg: "var(--positive-bg)", fg: "var(--success)", label: "Restored" },
  };
  const s = styles[action] ?? { bg: "var(--surface-2)", fg: "var(--text-2)", label: action };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
