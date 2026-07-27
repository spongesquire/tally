import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getGroupBySlug } from "@/server/queries/dashboard";
import { GroupOverview } from "@/components/groups/group-overview";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await params;
  const data = await getGroupBySlug(slug, session.userId);
  if (!data) notFound();

  return (
    <GroupOverview
      group={data.group}
      currentUserMember={data.currentUserMember}
      members={data.members}
    />
  );
}
