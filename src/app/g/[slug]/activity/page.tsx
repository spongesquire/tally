import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { getGroupActivity } from "@/server/queries/activity";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  const events = await getGroupActivity(data.group.id);

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/g/${slug}`}
            className="text-sm text-[var(--text-2)] hover:text-[var(--text)]"
          >
            ← Back
          </Link>
          <h1 className="text-base font-semibold tracking-tight">Activity</h1>
          <span className="w-10" />
        </div>

        {/* Filter strip — Release 1 ships All only (spec §11.8) */}
        <div className="flex gap-1 border-b border-[var(--border)] mb-4">
          <span className="px-4 py-2.5 text-sm font-medium relative text-[var(--primary)]">
            All
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
          </span>
        </div>

        <ActivityTimeline groupSlug={slug} events={events} />
      </div>
    </div>
  );
}
