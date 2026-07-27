"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarStack } from "@/components/shared/ui";
import { acceptInviteAction } from "@/server/actions/invites";

interface InviteInfo {
  groupName: string;
  iconKey: string | null;
  inviteType: string;
  targetMember: { displayName: string; colourKey: string } | null;
  members: Array<{ displayName: string; colourKey: string }>;
}

export function JoinPageContent({
  token,
  authenticated,
  info,
}: {
  token: string;
  authenticated: boolean;
  info: InviteInfo | { error: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Not authenticated — need to onboard first
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Almost there!</h1>
          <p className="text-sm text-[var(--text-2)] mb-6">
            Create a profile to join {info && "groupName" in info ? info.groupName : "the group"}.
            The invite link is saved — you'll join automatically after.
          </p>
          <a
            href={`/?next=/join/${token}`}
            className="inline-block px-6 py-3.5 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:bg-[var(--primary-hover)] transition-all"
          >
            Get started
          </a>
        </div>
      </div>
    );
  }

  // Invalid/expired invite
  if (!info || "error" in info) {
    const errorMsg = info
      ? info.error === "revoked"
        ? "This invite has been revoked."
        : info.error === "expired"
        ? "This invite has expired."
        : info.error === "used"
        ? "This invite link has already been used."
        : "Invalid invite."
      : "Invalid invite link.";

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Can't join</h1>
          <p className="text-sm text-[var(--text-2)] mb-6">{errorMsg}</p>
          <a href="/" className="text-sm text-[var(--primary)] hover:underline">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  function handleJoin() {
    startTransition(async () => {
      await acceptInviteAction(token);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {info.iconKey && <div className="text-4xl mb-3">{info.iconKey}</div>}
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{info.groupName}</h1>

        {info.targetMember ? (
          <p className="text-sm text-[var(--text-2)] mb-4">
            You're claiming the spot for{" "}
            <span className="font-medium text-[var(--text)]">{info.targetMember.displayName}</span>
          </p>
        ) : (
          <p className="text-sm text-[var(--text-2)] mb-4">You've been invited to join this group.</p>
        )}

        <div className="mb-6">
          <AvatarStack members={info.members} max={6} size={36} />
        </div>

        <button
          onClick={handleJoin}
          disabled={isPending}
          className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:bg-[var(--primary-hover)] disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          {isPending ? "Joining…" : info.targetMember ? "Claim my spot" : "Join group"}
        </button>
      </div>
    </div>
  );
}
