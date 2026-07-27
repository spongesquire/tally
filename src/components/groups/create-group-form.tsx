"use client";

import { useState, useTransition, useRef } from "react";
import { createGroupAction } from "@/server/actions/groups";
import { MEMBER_COLOURS } from "@/lib/product-config";

interface Participant {
  name: string;
  colour: string;
}

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function addParticipant() {
    setParticipants([...participants, { name: "", colour: "blue" }]);
  }

  function updateParticipant(index: number, field: keyof Participant, value: string) {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  }

  function removeParticipant(index: number) {
    setParticipants(participants.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("currency", currency);
    formData.set("icon", icon);
    // Only include participants with names
    const valid = participants.filter((p) => p.name.trim());
    formData.set("participants", JSON.stringify(valid));

    startTransition(async () => {
      const result = await createGroupAction(formData);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Group name */}
      <div>
        <label className="block text-sm font-medium mb-2">Group name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Great Ocean Road"
          maxLength={80}
          autoFocus
          className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none transition-colors"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Icon <span className="text-[var(--text-3)] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🚗"
          maxLength={4}
          className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none transition-colors"
        />
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium mb-2">Currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full px-4 py-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-base focus:border-[var(--primary)] outline-none transition-colors"
        >
          <option value="AUD">AUD $ (Australian Dollar)</option>
          <option value="USD">USD $ (US Dollar)</option>
          <option value="NZD">NZD $ (New Zealand Dollar)</option>
          <option value="GBP">GBP £ (British Pound)</option>
          <option value="EUR">EUR € (Euro)</option>
          <option value="JPY">JPY ¥ (Japanese Yen)</option>
        </select>
      </div>

      {/* Initial participants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">
            People <span className="text-[var(--text-3)] font-normal">(optional)</span>
          </label>
          <button
            type="button"
            onClick={addParticipant}
            className="text-sm text-[var(--primary)] hover:underline font-medium"
          >
            + Add person
          </button>
        </div>
        <p className="text-xs text-[var(--text-3)] mb-3">
          Add people now — they can claim their spot later with a personal link.
        </p>
        <div className="space-y-2">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={p.name}
                onChange={(e) => updateParticipant(i, "name", e.target.value)}
                placeholder="Name"
                maxLength={50}
                className="flex-1 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none transition-colors"
              />
              <select
                value={p.colour}
                onChange={(e) => updateParticipant(i, "colour", e.target.value)}
                className="px-2 py-2.5 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-sm focus:border-[var(--primary)] outline-none"
              >
                {MEMBER_COLOURS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.key}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeParticipant(i)}
                className="p-2 text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"
                aria-label="Remove"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius)] bg-[var(--negative-bg)] px-4 py-3">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium text-base hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
      >
        {isPending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
