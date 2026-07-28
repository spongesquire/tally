import Link from "next/link";
import { AvatarStack, netStatus } from "@/components/shared/ui";
import { PlusIcon, ReceiptIcon } from "@/components/shared/icons";

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
        <header className="flex items-center justify-between mb-8 animate-fade-up">
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
          className="pressable block w-full py-3.5 px-4 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium text-center hover:bg-[var(--primary-hover)] transition-all active:scale-[0.98] mb-8 animate-fade-up flex items-center justify-center gap-2"
          style={{ animationDelay: '50ms' }}
        >
          <PlusIcon size={20} />
          New group
        </Link>

        {/* Groups list */}
        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {groups.map((g, i) => {
              const status = netStatus(g.userNet);
              return (
                <Link
                  key={g.id}
                  href={`/g/${g.slug}`}
                  className="pressable block p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm transition-all animate-stagger"
                  style={{ animationDelay: `${100 + i * 50}ms` }}
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
    <div className="text-center py-16 animate-fade-up" style={{ animationDelay: '100ms' }}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-3)]">
        <ReceiptIcon size={28} />
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
