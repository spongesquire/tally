import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { getGroupBalances } from "@/server/queries/balances";
import { GroupSettings } from "@/components/groups/group-settings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  // Compute balances so the archive action can warn about non-zero nets.
  const { balances } = await getGroupBalances(data.group.id);
  const hasNonZeroBalances = balances.some((b) => b.net !== 0);

  const isOwner = data.currentUserMember.role === "owner";

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/g/${slug}`} className="text-sm text-[var(--text-2)] hover:text-[var(--text)]">
            ← Back
          </Link>
          <h1 className="text-base font-semibold tracking-tight">Settings</h1>
          <span className="w-10" />
        </div>

        <GroupSettings
          group={data.group}
          members={data.members}
          currentMemberId={data.currentUserMember.id}
          isOwner={isOwner}
          hasNonZeroBalances={hasNonZeroBalances}
        />
      </div>
    </div>
  );
}
