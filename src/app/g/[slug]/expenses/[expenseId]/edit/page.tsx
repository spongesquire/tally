import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { getCategories, getExpenseDetail } from "@/server/queries/expenses";
import { EditExpenseForm } from "@/components/expenses/edit-expense-form";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ slug: string; expenseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug, expenseId } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  const categories = await getCategories(data.group.id);
  const detail = await getExpenseDetail(expenseId, data.currentUserMember.id);
  if (!detail) notFound();

  // Check edit permission
  const isCreator = detail.expense.createdByMemberId === data.currentUserMember.id;
  const isOwner = data.currentUserMember.role === "owner";
  if (!isCreator && !isOwner) {
    notFound();
  }

  return (
    <EditExpenseForm
      group={data.group}
      currentUserMember={data.currentUserMember}
      members={data.members}
      categories={categories}
      detail={detail}
    />
  );
}
