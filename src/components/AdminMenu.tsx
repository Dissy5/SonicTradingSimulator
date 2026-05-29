"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

export type AdminMenuUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  contributesToValues: boolean;
  createdAt: string;
};

type AdminMenuProps = {
  open: boolean;
  currentUserId: string;
  onClose: () => void;
};

function formatUserLabel(user: AdminMenuUser): string {
  const name = user.displayName?.trim();
  if (name && user.email) return `${name} (${user.email})`;
  return user.email ?? name ?? user.id;
}

export function AdminMenu({ open, currentUserId, onClose }: AdminMenuProps) {
  const [users, setUsers] = useState<AdminMenuUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { users?: AdminMenuUser[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load users");
      }
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    void loadUsers();
  }, [open, loadUsers]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function toggleContributesToValues(user: AdminMenuUser, nextValue: boolean) {
    setBusyUserId(user.id);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributesToValues: nextValue }),
      });
      const data = (await res.json()) as { user?: AdminMenuUser; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update user");
      }
      if (data.user) {
        setUsers((current) => current.map((entry) => (entry.id === data.user!.id ? data.user! : entry)));
      }
      setMessage(
        nextValue
          ? `${formatUserLabel(user)} now contributes to community values.`
          : `${formatUserLabel(user)} is excluded from community values.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(user: AdminMenuUser) {
    setBusyUserId(user.id);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = (await res.json()) as {
        transactions?: number;
        flips?: number;
        shopListings?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete user");
      }
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      setMessage(
        `Removed ${formatUserLabel(user)} and all of their data (${data.transactions ?? 0} transactions, ${data.flips ?? 0} flips, ${data.shopListings ?? 0} shop listings).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      throw err;
    } finally {
      setBusyUserId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-4 w-full max-w-4xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-menu-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="admin-menu-title" className="text-xl font-semibold">
              Admin
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Manage users, control who contributes to community value ranges, and remove accounts
              entirely.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-green-400">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Values</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const busy = busyUserId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-zinc-900 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">{formatUserLabel(user)}</div>
                        {isSelf ? <div className="text-xs text-zinc-500">You</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        {user.isAdmin ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                            Admin
                          </span>
                        ) : (
                          <span className="text-zinc-500">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-zinc-300">
                          <input
                            type="checkbox"
                            checked={user.contributesToValues}
                            disabled={busy}
                            onChange={(event) =>
                              void toggleContributesToValues(user, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                          />
                          <span className="text-xs sm:text-sm">
                            {user.contributesToValues ? "Included" : "Excluded"}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-zinc-500">Cannot delete yourself</span>
                        ) : (
                          <ConfirmDeleteButton
                            label="Delete all data"
                            confirmLabel="Confirm delete"
                            pendingLabel="Deleting…"
                            disabled={busy}
                            onConfirm={() => deleteUser(user)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
