import { useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="text-sm text-slate-300">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          data-autofocus
          className="btn-primary bg-rose-500 hover:bg-rose-400 focus-visible:ring-rose-400/60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
