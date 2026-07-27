"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarStack, netStatus } from "@/components/shared/ui";

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

export function GroupOverview({
  group,
  currentUserMember,
  members,
}: {
  group: GroupData;
  currentUserMember: Member;
  members: Member[];
}) {
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const status = netStatus(0);

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-[var(--text-2)] hover:text-[var(--text)]">
            ← Dashboard
          </Link>
          <Link
            href={`/g/${group.slug}/settings`}
            className="p-2 text-[var(--text-2)] hover:text-[var(--text)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
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
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-5 mb-6">
          <p className="text-sm text-[var(--text-2)] mb-1">Your balance</p>
          <p className="text-3xl font-semibold tnum" style={{ color: status.colour }}>
            Settled up
          </p>
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="text-[var(--text-3)]">You paid</p>
              <p className="font-medium tnum">$0.00</p>
            </div>
            <div>
              <p className="text-[var(--text-3)]">Your share</p>
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
          {["Expenses", "Balances", "Activity"].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                i === 0
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-2)] hover:text-[var(--text)]"
              }`}
            >
              {tab}
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Expenses empty state */}
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <p className="text-[var(--text-2)] text-sm">No expenses yet. Add the first one.</p>
        </div>
      </div>

      {/* Floating Add Expense button */}
      <button className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] font-medium shadow-lg hover:bg-[var(--primary-hover)] transition-all active:scale-[0.98] flex items-center gap-2 z-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add expense
      </button>
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
              className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono"
            />
            <button
              onClick={() => copyToClipboard(generalLink, "general")}
              className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-medium"
            >
              {copied === "general" ? "Copied ✓" : "Copy"}
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
