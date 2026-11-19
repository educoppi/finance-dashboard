import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { DatabaseBackup, Download, Loader2, Upload } from 'lucide-react';
import { backupService, getErrorMessage } from '../services';
import type { ImportResult } from '../services';
import { CURRENCIES } from '../../../shared/utils/currency';
import { useCurrency } from '../../../shared/hooks/useCurrency';
import { useToast } from '../../../shared/hooks/useToast';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';

interface BackupMenuProps {
  /** Called after a successful import so screens re-read their data. */
  onImported: () => Promise<void>;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Header action: download a JSON backup or restore one (with an overwrite confirmation). */
export function BackupMenu({ onImported }: BackupMenuProps) {
  const toast = useToast();
  const { setCurrency } = useCurrency();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState<{ raw: string; fileName: string; summary: ImportResult } | null>(null);

  const download = async () => {
    setExporting(true);
    try {
      const payload = await backupService.exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupService.fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(
        `Backup downloaded: ${plural(payload.data.transactions.length, 'transaction')}, ${plural(payload.data.categories.length, 'category', 'categories')}.`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error('This file is too large to be a Fluxo backup.');
      return;
    }
    setReading(true);
    try {
      const raw = await file.text();
      const summary = await backupService.inspectBackup(raw);
      setOpen(false);
      setPending({ raw, fileName: file.name, summary });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReading(false);
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    try {
      const result = await backupService.importBackup(pending.raw);
      await setCurrency(result.currency);
      await onImported();
      setPending(null);
      toast.success(
        `Backup restored: ${plural(result.transactions, 'transaction')}, ${plural(result.categories, 'category', 'categories')}.`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost h-9"
        aria-label="Backup and restore"
        title="Backup and restore"
      >
        <DatabaseBackup className="size-4" />
        <span className="hidden xl:inline">Backup</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Backup & restore"
        description="Your data lives only in this browser. Keep a copy or move it to another device."
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-sm font-medium text-slate-200">Download a backup</p>
            <p className="mt-0.5 text-xs text-slate-400">
              A <span className="money">.json</span> file with your categories, transactions, goals and currency.
            </p>
            <button type="button" onClick={download} disabled={exporting} className="btn-primary mt-3 w-full" data-autofocus>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download backup
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-sm font-medium text-slate-200">Restore from a file</p>
            <p className="mt-0.5 text-xs text-slate-400">Replaces all data in this browser with the backup's contents.</p>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={reading} className="btn-ghost mt-3 w-full">
              {reading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Choose backup file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => void onFile(e)}
              className="sr-only"
              tabIndex={-1}
              aria-label="Backup file"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        title="Replace your data?"
        confirmLabel="Replace my data"
        onClose={() => setPending(null)}
        onConfirm={confirmImport}
        message={
          pending && (
            <>
              <p>
                <strong className="text-slate-100">{pending.fileName}</strong> contains{' '}
                {plural(pending.summary.transactions, 'transaction')}, {plural(pending.summary.categories, 'category', 'categories')},{' '}
                {plural(pending.summary.goals + pending.summary.defaultGoals, 'goal')} and uses{' '}
                {CURRENCIES[pending.summary.currency].name}.
              </p>
              <p className="mt-2">
                Everything currently stored in this browser will be replaced. Download a backup first if you may need it.
              </p>
            </>
          )
        }
      />
    </>
  );
}
