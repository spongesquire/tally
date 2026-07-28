"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarStack, netStatus, formatDateShort, formatUnsigned } from "@/components/shared/ui";
import { CategoryIcon, SettingsIcon, SearchIcon, CloseIcon, PlusIcon, LinkIcon, CheckIcon } from "@/components/shared/icons";

interface Member {
  id: string;
  displayName: string;
  colourKey: string;
  role: string;
  status: string;
  userId: string | null;
}

interface GroupData {
  id: string;
  slug: string;
  name: string;
  iconKey: string | null;
  baseCurrency: string;
  status: string;
}

interface ExpenseRow {
  id: string;
  description: string;
  totalMinor: number;
  currency: string;
  expenseDate: Date | string;
  splitMethod: string;
  categoryName: string | null;
  categoryIcon: string | null;
  createdByMemberId: string;
  creatorName: string | null;
  status: string;
}

export function GroupOverview({
  group,
  currentUserMember,
  members,
  expenses = [],
}: {
  group: GroupData;
  currentUserMember: Member;
  members: Member[];
  expenses?: ExpenseRow[];
}) {
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [query, setQuery] = useState("");
  const status = netStatus(0);

  const trimmedQuery = query.trim().toLowerCase();
  const filteredExpenses = trimmedQuery
    ? expenses.filter(
        (e) =>
          e.description.toLowerCase().includes(trimmedQuery)
      )
    : expenses;

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <Link href="/" className="text-sm text-[var(--text-2)] hover:text-[var(--text)] flex items-center gap-1">
            ← Dashboard
          </Link>
          <Link
            href={`/g/${group.slug}/settings`}
            className="p-2 text-[var(--text-2)] hover:text-[var(--text)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </Link>
        </div>

        {/* Group header card */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            {group.iconKey && <span className="text-3xl">{group.iconKey}</span>}
            <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
          </div>
          <AvatarStack members={members} max={5} size={32} />
        </div>

        {/* Balance summary */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-5 mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <p className="text-sm text-[var(--text-2)] mb-1">Your balance</p>
          <p className="text-3xl font-semibold tnum animate-count" style={{ color: status.colour }}>
            Settled up
          </p>
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="text-[var(--text-3)] text-xs">You paid</p>
              <p className="font-medium tnum">$0.00</p>
            </div>
            <div>
              <p className="text-[var(--text-3)] text-xs">Your share</p>
              <p className="font-medium tnum">$0.00</p>
            </div>
          </div>
        </div>

        {/* Invite button */}
        <button
          onClick={() => setShowInvitePanel(!showInvitePanel)}
          className="w-full py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-sm font-medium hover:border-[var(--border-strong)] transition-colors mb-6"
        >
          {showInvitePanel ? "Hide invites" : "Invite people"}
        </button>

        {showInvitePanel && <InvitePanel groupSlug={group.slug} members={members} />}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] mb-4">
          <Link
            href={`/g/${group.slug}`}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative text-[var(--primary)]"
          >
            Expenses
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
          </Link>
          <Link
            href={`/g/${group.slug}/balances`}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative text-[var(--text-2)] hover:text-[var(--text)]"
          >
            Balances
          </Link>
          <Link
            href={`/g/${group.slug}/activity`}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative text-[var(--text-2)] hover:text-[var(--text)]"
          >
            Activity
          </Link>
        </div>

        {/* Search input */}
        {expenses.length > 0 && (
          <div className="relative mb-4">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-3)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search expenses"
              className="w-full pl-9 pr-9 py-2.5 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-3)] hover:text-[var(--text)]"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        )}

        {/* Expenses list */}
        {expenses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <p className="text-[var(--text-2)] text-sm">No expenses yet. Add the first one.</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-2)] text-sm">
              No expenses match “<span className="text-[var(--text)]">{query}</span>”.
            </p>
            <button
              onClick={() => setQuery("")}
              className="text-sm text-[var(--primary)] hover:underline mt-1"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((exp, i) => (
              <Link
                key={exp.id}
                href={`/g/${group.slug}/expenses/${exp.id}`}
                className="pressable block p-4 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm transition-all animate-stagger"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-2)]">
                    <CategoryIcon iconKey={exp.categoryIcon ?? "tag"} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{exp.description}</p>
                    <p className="text-xs text-[var(--text-2)] mt-0.5">
                      {exp.creatorName} paid · {formatDateShort(exp.expenseDate)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tnum shrink-0">
                    {formatUnsigned(exp.totalMinor, exp.currency)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Expense button */}
      <Link
        href={`/g/${group.slug}/add`}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] font-medium shadow-lg hover:bg-[var(--primary-hover)] transition-all active:scale-[0.98] flex items-center gap-2 z-10 animate-fade-up"
        style={{ animationDelay: '200ms' }}
      >
        <PlusIcon size={20} />
        Add expense
      </Link>
    </div>
  );
}

function InvitePanel({
  groupSlug,
  members,
}: {
  groupSlug: string;
  members: Member[];
}) {
  const [generalLink, setGeneralLink] = useState<string | null>(null);
  const [claimLinks, setClaimLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function generateGeneralInvite() {
    const res = await fetch(`/api/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupSlug, inviteType: "general" }),
    });
    const data = await res.json();
    if (data.ok) {
      setGeneralLink(data.link);
      setCopied("general");
    }
  }

  async function generateClaimInvite(memberId: string) {
    const res = await fetch(`/api/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupSlug, inviteType: "claim_member", targetMemberId: memberId }),
    });
    const data = await res.json();
    if (data.ok) {
      setClaimLinks({ ...claimLinks, [memberId]: data.link });
      setCopied(memberId);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const unclaimed = members.filter((m) => !m.userId && m.status === "active");

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-4 mb-6 space-y-4">
      {/* General invite */}
      <div>
        <p className="text-sm font-medium mb-2">Group invite link</p>
        <p className="text-xs text-[var(--text-3)] mb-3">
          Anyone with this link can join the group.
        </p>
        {!generalLink ? (
          <button
            onClick={generateGeneralInvite}
            className="text-sm text-[var(--primary)] hover:underline font-medium"
          >
            Generate link
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={generalLink}
              readOnly
              className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs truncate"
            />
            <button
              onClick={() => copyToClipboard(generalLink, "general")}
              className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-medium flex items-center gap-1.5"
            >
              {copied === "general" ? <><CheckIcon size={14} /> Copied</> : <><LinkIcon size={14} /> Copy</>}
            </button>
          </div>
        )}
      </div>

      {/* Personal claim links for unclaimed members */}
      {unclaimed.length > 0 && (
        <div className="pt-4 border-t border-[var(--border)]">
          <p className="text-sm font-medium mb-2">Personal claim links</p>
          <p className="text-xs text-[var(--text-3)] mb-3">
            Send a one-use link to each person so they can claim their spot.
          </p>
          <div className="space-y-2">
            {unclaimed.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar name={m.displayName} colourKey={m.colourKey} size={28} />
                <span className="flex-1 text-sm">{m.displayName}</span>
                {!claimLinks[m.id] ? (
                  <button
                    onClick={() => generateClaimInvite(m.id)}
                    className="text-xs text-[var(--primary)] hover:underline font-medium"
                  >
                    Generate
                  </button>
                ) : (
                  <button
                    onClick={() => copyToClipboard(claimLinks[m.id], m.id)}
                    className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium"
                  >
                    {copied === m.id ? "Copied ✓" : "Copy link"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
