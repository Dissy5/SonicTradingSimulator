"use client";

import { useEffect, useState } from "react";

type ConfirmDeleteButtonProps = {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
  confirmingClassName?: string;
  onPendingChange?: (pending: boolean) => void;
};

export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Confirm",
  pendingLabel = "Deleting…",
  disabled = false,
  className = "rounded-md bg-red-600/90 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50",
  confirmingClassName,
  onPendingChange,
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  async function handleClick() {
    if (pending || disabled) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setPending(true);
    try {
      await onConfirm();
      setConfirming(false);
    } catch {
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  const text = pending ? pendingLabel : confirming ? confirmLabel : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className={confirming && confirmingClassName ? confirmingClassName : className}
    >
      {text}
    </button>
  );
}
