import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      ),
      iconBg: "bg-rose-500/10 text-rose-500",
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20",
    },
    warning: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        </svg>
      ),
      iconBg: "bg-amber-500/10 text-amber-600",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20",
    },
    info: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
      ),
      iconBg: "bg-blue-500/10 text-blue-600",
      confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-3xl border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ animationDuration: "150ms" }}
      >
        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[var(--text-main-primary)] leading-tight">{title}</h3>
              <p className="mt-2 text-[13px] text-[var(--text-main-secondary)] leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--bg-main)] hover:bg-[var(--border-main)] text-[var(--text-main-primary)] text-[13px] font-bold border border-[var(--border-main)] transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${styles.confirmBtn}`}
            >
              {isLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isLoading ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
