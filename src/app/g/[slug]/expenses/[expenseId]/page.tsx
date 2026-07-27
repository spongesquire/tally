import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { getExpenseDetail } from "@/server/queries/expenses";
import { ExpenseDetail } from "@/components/expenses/expense-detail";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; expenseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug, expenseId } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  const detail = await getExpenseDetail(expenseId, data.currentUserMember.id);

  // If the expense exists but belongs to a different group, treat as not found.
  if (!detail || detail.expense.groupId !== data.group.id) notFound();

  const canMutate =
    detail.expense.createdByMemberId === data.currentUserMember.id ||
    data.currentUserMember.role === "owner";

  const isOwner = data.currentUserMember.role === "owner";

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <ExpenseDetail
          groupSlug={slug}
          detail={detail}
          canMutate={canMutate}
          isOwner={isOwner}
          currentMemberId={data.currentUserMember.id}
        />
      </div>
    </div>
  );
}
