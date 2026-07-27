import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { getGroupBalances } from "@/server/queries/balances";
import { BalancesView } from "@/components/balances/balances-view";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BalancesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  const { balances, currency } = await getGroupBalances(data.group.id);

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/g/${slug}`} className="text-sm text-[var(--text-2)] hover:text-[var(--text)]">
            ← Back
          </Link>
          <h1 className="text-base font-semibold tracking-tight">Balances</h1>
          <span className="w-10" />
        </div>

        <BalancesView
          groupSlug={slug}
          balances={balances}
          currency={currency}
          currentUserMemberId={data.currentUserMember.id}
        />
      </div>
    </div>
  );
}
