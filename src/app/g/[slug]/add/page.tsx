import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { getCategories } from "@/server/queries/expenses";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";

export const dynamic = "force-dynamic";

export default async function AddExpensePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  const categories = await getCategories(data.group.id);

  return (
    <AddExpenseForm
      group={data.group}
      currentUserMember={data.currentUserMember}
      members={data.members}
      categories={categories}
    />
  );
}
