import { getSession, getCurrentUser, updateDeviceProfile, signOut } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/profile/profile-content";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const user = await getCurrentUser(session.userId);
  if (!user) redirect("/");

  return <ProfileContent user={user} />;
}
