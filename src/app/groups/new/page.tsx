import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { CreateGroupForm } from "@/components/groups/create-group-form";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-32">
        <a href="/" className="text-sm text-[var(--text-2)] hover:text-[var(--text)] mb-6 inline-block">
          ← Back
        </a>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">New group</h1>
        <p className="text-sm text-[var(--text-2)] mb-8">
          Create a shared tab for a trip, home, or night out.
        </p>
        <CreateGroupForm />
      </div>
    </div>
  );
}
