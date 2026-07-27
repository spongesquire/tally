"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEMBER_COLOURS, getColour } from "@/lib/product-config";
import { Avatar } from "@/components/shared/ui";

export function ProfileContent({
  user,
}: {
  user: { id: string; displayName: string; colourKey: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(user.displayName);
  const [colour, setColour] = useState(user.colourKey);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const dirty = name !== user.displayName || colour !== user.colourKey;

  async function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), colourKey: colour }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto pt-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Your profile</h1>
        <p className="text-sm text-[var(--text-2)] mb-8">
          Your profile lives on this browser. Clearing browser data or using another device
          will create a new profile unless you transfer it first.
        </p>

        {/* Avatar preview */}
        <div className="flex justify-center mb-8">
          <Avatar name={name} colourKey={colour} size={80} />
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none transition-colors"
          />
        </div>

        {/* Colour */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-3">Colour</label>
          <div className="flex flex-wrap gap-2.5">
            {MEMBER_COLOURS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColour(c.key)}
                aria-label={c.key}
                aria-pressed={colour === c.key}
                className="w-10 h-10 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: c.fill,
                  transform: colour === c.key ? "scale(1.15)" : "scale(1)",
                  boxShadow: colour === c.key ? `0 0 0 3px var(--surface), 0 0 0 5px ${c.fill}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!dirty || isPending || !name.trim()}
          className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] mb-2"
        >
          {saved ? "Saved ✓" : isPending ? "Saving…" : "Save changes"}
        </button>

        {/* Sign out */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          {!showSignOutConfirm ? (
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="text-sm text-[var(--danger)] hover:underline"
            >
              Sign out
            </button>
          ) : (
            <div className="rounded-[var(--radius)] bg-[var(--negative-bg)] p-4">
              <p className="text-sm text-[var(--text)] mb-3">
                Signing out disconnects this browser from your profile. Your group records stay
                in place, but you may not be able to reclaim the same profile without help from
                a group owner.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--danger)] text-white text-sm font-medium hover:opacity-90"
                >
                  Sign out
                </button>
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--text-2)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6">
          <a href="/" className="text-sm text-[var(--text-2)] hover:text-[var(--text)]">
            ← Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
