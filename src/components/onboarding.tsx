"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEMBER_COLOURS, getColour } from "@/lib/product-config";

export function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [colour, setColour] = useState("green");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colourStyle = getColour(colour);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), colourKey: colour }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold transition-all duration-200"
            style={{ backgroundColor: colourStyle.fill, color: colourStyle.fg }}
          >
            {initials || "?"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-center mb-1">
              What should your friends call you?
            </h1>
            <p className="text-sm text-[var(--text-2)] text-center">
              This creates a profile on this device. No password or email required.
            </p>
          </div>

          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              autoFocus
              className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none transition-colors"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Pick a colour</p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {MEMBER_COLOURS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColour(c.key)}
                  aria-label={c.key}
                  aria-pressed={colour === c.key}
                  className="w-10 h-10 rounded-full transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)]"
                  style={{
                    backgroundColor: c.fill,
                    transform: colour === c.key ? "scale(1.15)" : "scale(1)",
                    boxShadow: colour === c.key ? `0 0 0 3px var(--surface), 0 0 0 5px ${c.fill}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium text-base hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isPending ? "Starting…" : "Start"}
          </button>
        </form>
      </div>
    </div>
  );
}
