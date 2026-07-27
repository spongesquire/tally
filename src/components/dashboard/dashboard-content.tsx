import Link from "next/link";
import { AvatarStack, netStatus } from "@/components/shared/ui";

interface DashboardGroup {
  id: string;
  slug: string;
  name: string;
  iconKey: string | null;
  baseCurrency: string;
  members: Array<{ displayName: string; colourKey: string }>;
  userNet: number;
}

export function DashboardContent({
  groups,
  userId: _userId,
}: {
  groups: DashboardGroup[];
  userId: string;
}) {
  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Your tabs</h1>
          <Link
            href="/profile"
            className="text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
          >
            Profile
          </Link>
        </header>

        {/* New group CTA */}
        <Link
          href="/groups/new"
          className="block w-full py-3.5 px-4 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium text-center hover:bg-[var(--primary-hover)] transition-all active:scale-[0.98] mb-8"
        >
          New group
        </Link>

        {/* Groups list */}
        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const status = netStatus(g.userNet);
              return (
                <Link
                  key={g.id}
                  href={`/g/${g.slug}`}
                  className="block p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {g.iconKey && <span className="text-xl">{g.iconKey}</span>}
                      <h2 className="font-semibold text-lg">{g.name}</h2>
                    </div>
                    <AvatarStack members={g.members} max={4} size={28} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium px-2.5 py-1 rounded-full"
                      style={{ color: status.colour, backgroundColor: status.bg }}
                    >
                      {g.userNet === 0
                        ? status.label
                        : `${status.label} ${formatUnsignedAbs(g.userNet, g.baseCurrency)}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
          <path d="M17 20H5a2 2 0 0 1-2-2V9" />
          <path d="M3 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M3 9h18" />
          <path d="M21 9v4a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1" />
        </svg>
      </div>
      <p className="text-[var(--text-2)]">No shared tabs yet. Create a group for a trip, home or night out.</p>
    </div>
  );
}

function formatUnsignedAbs(minor: number, currency: string): string {
  const abs = Math.abs(minor);
  const symbol = currency === "AUD" || currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${(abs / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
