import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmKeyword?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  requireReason = false,
  reasonLabel = 'Administrative Reason (Logged to Audit Trail)',
  reasonPlaceholder = 'Provide clear justification for this administrative action...',
  confirmKeyword,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setKeywordInput('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const toneClasses = {
    danger: 'bg-rose-700 hover:bg-rose-800 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    primary: 'bg-emerald-700 hover:bg-emerald-800 text-white',
  }[tone];

  const iconTone = {
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    primary: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[tone];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (requireReason && reason.trim().length < 3) {
      setError('Please enter at least 3 characters describing the reason for the audit log.');
      return;
    }

    if (confirmKeyword && keywordInput.trim().toUpperCase() !== confirmKeyword.toUpperCase()) {
      setError(`Type "${confirmKeyword}" to confirm this destructive action.`);
      return;
    }

    await onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden"
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-md border flex items-center justify-center shrink-0 ${iconTone}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

          {requireReason && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{reasonLabel}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={reasonPlaceholder}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          {confirmKeyword && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type <span className="font-mono text-rose-700">{confirmKeyword}</span> to proceed
              </label>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder={confirmKeyword}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-3.5 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${toneClasses}`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
