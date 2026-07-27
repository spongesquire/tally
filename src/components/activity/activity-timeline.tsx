import Link from "next/link";
import { Avatar, formatDate } from "@/components/shared/ui";
import type { ActivityRow } from "@/server/queries/activity";

function summaryText(payload: unknown): string {
  if (payload && typeof payload === "object" && "summary" in payload) {
    const s = (payload as { summary: unknown }).summary;
    if (typeof s === "string" && s.trim()) return s;
  }
  return "Activity recorded";
}

function entityHref(groupSlug: string, e: ActivityRow): string | null {
  if (!e.entityId) return null;
  switch (e.entityType) {
    case "expense":
      return `/g/${groupSlug}/expenses/${e.entityId}`;
    case "settlement":
    case "member":
    case "group":
    default:
      return null;
  }
}

export function ActivityTimeline({
  groupSlug,
  events,
}: {
  groupSlug: string;
  events: ActivityRow[];
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <p className="text-[var(--text-2)] text-sm">No activity yet.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-3">
      {events.map((e, i) => {
        const text = summaryText(e.summaryPayload);
        const href = entityHref(groupSlug, e);
        const isLast = i === events.length - 1;
        return (
          <li key={e.id} className="relative flex gap-3">
            {/* Timeline rail */}
            <div className="flex flex-col items-center">
              {e.actorMemberId ? (
                <Avatar
                  name={e.actorDisplayName ?? "?"}
                  colourKey={e.actorColourKey ?? "green"}
                  size={32}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-3)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
              )}
              {!isLast && <div className="w-px flex-1 bg-[var(--border)] mt-1.5" />}
            </div>

            <div className="flex-1 pb-3 min-w-0">
              <div
                className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 ${
                  href ? "hover:border-[var(--border-strong)] transition-colors" : ""
                }`}
              >
                {href ? (
                  <Link href={href} className="block">
                    <p className="text-sm text-[var(--text)] leading-snug">{text}</p>
                  </Link>
                ) : (
                  <p className="text-sm text-[var(--text)] leading-snug">{text}</p>
                )}
                <p className="text-xs text-[var(--text-3)] mt-1">
                  {formatDate(e.createdAt)}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
