import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getInviteInfo } from "@/server/queries/invites";
import { JoinPageContent } from "@/components/invites/join-page";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();

  // If not authenticated, show onboarding first with a redirect back
  if (!session) {
    return <JoinPageContent token={token} authenticated={false} info={null} />;
  }

  const info = await getInviteInfo(token);
  if (!info) {
    return <JoinPageContent token={token} authenticated={true} info={null} />;
  }

  return <JoinPageContent token={token} authenticated={true} info={info} />;
}
