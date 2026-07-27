"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/shared/ui";
import {
  updateGroupAction,
  archiveGroupAction,
  restoreGroupAction,
} from "@/server/actions/groups";

interface GroupData {
  id: string;
  slug: string;
  name: string;
  iconKey: string | null;
  baseCurrency: string;
  status: string;
}

interface MemberRow {
  id: string;
  displayName: string;
  colourKey: string;
  role: string;
  status: string;
  userId: string | null;
}

export function GroupSettings({
  group,
  members,
  currentMemberId,
  isOwner,
  hasNonZeroBalances,
}: {
  group: GroupData;
  members: MemberRow[];
  currentMemberId: string;
  isOwner: boolean;
  hasNonZeroBalances: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [icon, setIcon] = useState(group.iconKey ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const dirty = name !== group.name || (icon || null) !== (group.iconKey ?? null);

  async function handleSave() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updateGroupAction({
        groupSlug: group.slug,
        name: name.trim(),
        iconKey: icon.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleArchive() {
    setError(null);
    startTransition(async () => {
      const res = await archiveGroupAction(group.slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowArchiveConfirm(false);
      router.refresh();
    });
  }

  async function handleRestore() {
    setError(null);
    startTransition(async () => {
      const res = await restoreGroupAction(group.slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--negative-bg)] border border-[var(--border)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Group identity — owner editable */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2 px-1">
          Group details
        </h2>
        <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              disabled={!isOwner}
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none transition-colors disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1.5">
              Icon (emoji or short text)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={16}
              disabled={!isOwner}
              placeholder="Optional"
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none transition-colors disabled:opacity-60"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
            <span>Currency</span>
            <span className="tnum">{group.baseCurrency} (immutable)</span>
          </div>

          {isOwner && (
            <button
              onClick={handleSave}
              disabled={!dirty || pending || !name.trim()}
              className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saved ? "Saved ✓" : pending ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2 px-1">
          Members
        </h2>
        <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)]">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <Avatar name={m.displayName} colourKey={m.colourKey} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.displayName}
                  {m.id === currentMemberId && (
                    <span className="text-[var(--text-3)] ml-1.5">(you)</span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-3)]">
                  {m.userId ? "Claimed" : "Pending claim"}
                </p>
              </div>
              <RoleBadge role={m.role} />
            </div>
          ))}
        </div>
      </section>

      {/* Lifecycle — owner only */}
      {isOwner && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2 px-1">
            Lifecycle
          </h2>
          <div className="rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-4">
            {group.status === "active" ? (
              !showArchiveConfirm ? (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="w-full py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--danger)] border border-[var(--border)] hover:bg-[var(--negative-bg)] transition-colors"
                >
                  Archive group
                </button>
              ) : (
                <div>
                  <p className="text-sm font-medium text-[var(--text)] mb-1">Archive this group?</p>
                  <p className="text-xs text-[var(--text-2)] mb-3">
                    An archived group leaves the active dashboard and rejects new expenses,
                    but its records stay searchable and exportable. Archive does not alter money
                    or generate settlements.
                  </p>
                  {hasNonZeroBalances && (
                    <div className="rounded-[var(--radius-sm)] bg-[var(--warning-bg)] border border-[var(--border)] p-3 mb-3">
                      <p className="text-xs text-[var(--warning)] font-medium mb-0.5">
                        Some balances are non-zero
                      </p>
                      <p className="text-xs text-[var(--text-2)]">
                        Members still owe or are owed money. Consider settling before archiving.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleArchive}
                      disabled={pending}
                      className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--danger)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
                    >
                      {pending ? "Archiving…" : "Archive group"}
                    </button>
                    <button
                      onClick={() => setShowArchiveConfirm(false)}
                      disabled={pending}
                      className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--text-2)] border border-[var(--border)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div>
                <p className="text-xs text-[var(--text-2)] mb-3">
                  This group is archived. Restore it to resume adding expenses and return it
                  to the dashboard.
                </p>
                <button
                  onClick={handleRestore}
                  disabled={pending}
                  className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {pending ? "Restoring…" : "Restore group"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    owner: { bg: "var(--positive-bg)", fg: "var(--success)", label: "Owner" },
    member: { bg: "var(--surface-2)", fg: "var(--text-2)", label: "Member" },
    viewer: { bg: "var(--surface-2)", fg: "var(--text-3)", label: "Viewer" },
  };
  const s = styles[role] ?? styles.member;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
