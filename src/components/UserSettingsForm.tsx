"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { applySiteTheme } from "@/components/ThemeProvider";
import { notifySettingsUpdated } from "@/lib/settings-events";
import type { SiteTheme } from "@/lib/theme";
import type { UserSettings } from "@/lib/user-settings";

type UserSettingsFormProps = {
  initialSettings: UserSettings;
};

export function UserSettingsForm({ initialSettings }: UserSettingsFormProps) {
  const router = useRouter();
  const [displayNameInput, setDisplayNameInput] = useState(
    initialSettings.displayName ?? ""
  );
  const [theme, setTheme] = useState<SiteTheme>(initialSettings.theme);
  const [busy, setBusy] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayNameInput(initialSettings.displayName ?? "");
    setTheme(initialSettings.theme);
  }, [initialSettings]);

  async function saveDisplayName(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayNameInput.trim() === "" ? null : displayNameInput,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to save display name");
      }
      setMessage("Display name saved.");
      notifySettingsUpdated();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save display name");
    } finally {
      setBusy(false);
    }
  }

  async function saveTheme(nextTheme: SiteTheme) {
    setTheme(nextTheme);
    applySiteTheme(nextTheme);
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to save theme");
      }
      setMessage("Theme saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme");
      applySiteTheme(initialSettings.theme);
      setTheme(initialSettings.theme);
    } finally {
      setBusy(false);
    }
  }

  async function deletePersonalData() {
    setDeletingData(true);
    setError(null);
    setDeleteMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to delete data");
      }
      setDeleteMessage(
        `Removed ${body.transactions ?? 0} transactions, ${body.flips ?? 0} flips, and ${body.shopListings ?? 0} shop listings.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete data");
      throw err;
    } finally {
      setDeletingData(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h3 className="text-lg font-semibold">Display name</h3>
        <p className="mt-1 text-sm text-zinc-400">
          This is the name shown in the header and on records you create. Leave blank to use your
          Google name ({initialSettings.defaultDisplayName}).
        </p>
        <form onSubmit={saveDisplayName} className="mt-4 space-y-4">
          <label className="block text-sm text-zinc-400">
            Display name
            <input
              type="text"
              maxLength={64}
              placeholder={initialSettings.defaultDisplayName}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={displayNameInput}
              onChange={(event) => setDisplayNameInput(event.currentTarget.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Save display name
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h3 className="text-lg font-semibold">Theme</h3>
        <p className="mt-1 text-sm text-zinc-400">Choose how the site looks on this device.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ThemeOption
            label="Dark"
            selected={theme === "dark"}
            disabled={busy}
            onSelect={() => saveTheme("dark")}
          />
          <ThemeOption
            label="Light"
            selected={theme === "light"}
            disabled={busy}
            onSelect={() => saveTheme("light")}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6">
        <h3 className="text-lg font-semibold text-red-200">Delete personal data</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Permanently remove all transactions, flips, and shop listings you recorded. This cannot be
          undone. Your account and settings stay intact.
        </p>
        {deleteMessage && <p className="mt-3 text-sm text-green-400">{deleteMessage}</p>}
        <div className="mt-4">
          <ConfirmDeleteButton
            label="Delete all my data"
            confirmLabel="Confirm delete"
            pendingLabel="Deleting…"
            disabled={busy || deletingData}
            onConfirm={deletePersonalData}
            className="rounded-lg border border-red-900 bg-red-950/30 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50"
            confirmingClassName="rounded-lg border border-red-600 bg-red-600/20 px-4 py-2 text-sm text-red-200 disabled:opacity-50"
          />
        </div>
      </section>
    </div>
  );
}

function ThemeOption({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-lg border px-4 py-2 text-sm disabled:opacity-50 ${
        selected
          ? "border-blue-500 bg-blue-600/20 text-blue-200"
          : "border-zinc-700 text-zinc-200 hover:bg-zinc-900"
      }`}
    >
      {label}
    </button>
  );
}
