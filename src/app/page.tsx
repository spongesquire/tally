import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getDashboardGroups } from "@/server/queries/dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { OnboardingPage } from "@/components/onboarding";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return <OnboardingPage />;
  }

  const groups = await getDashboardGroups(session.userId);
  return <DashboardContent groups={groups} userId={session.userId} />;
}
