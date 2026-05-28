"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function AddCharacterForm() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/catalog/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to add character");
      }

      setName("");
      setMessage(`Added character "${trimmed}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add character");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md">
      <Link href="/add" className="mb-4 inline-block text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to catalog
      </Link>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
      >
        <h2 className="mb-4 text-lg font-semibold">Add a character</h2>
        <label className="block text-sm text-zinc-400">
          Character name
          <input
            type="text"
            required
            placeholder="e.g. Blaze"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save character"}
        </button>
        {message && <p className="mt-3 text-sm text-green-400">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
