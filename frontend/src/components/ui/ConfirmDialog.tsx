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
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      ),
      iconBg: "bg-red-500/10 text-red-400",
      confirmBtn: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
    },
    warning: {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      iconBg: "bg-amber-500/10 text-amber-400",
      confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20",
    },
    info: {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      iconBg: "bg-blue-500/10 text-blue-400",
      confirmBtn: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200"
        style={{ animationDuration: "150ms" }}
      >
        {/* Top accent line */}
        <div className={`h-0.5 w-full rounded-t-2xl ${variant === "danger" ? "bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" : variant === "warning" ? "bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" : "bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0"}`} />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`flex-shrink-0 p-2.5 rounded-xl ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div className="pt-0.5">
              <h3 className="text-[15px] font-bold text-slate-100 leading-snug">{title}</h3>
              <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[12px] font-semibold border border-slate-700 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${styles.confirmBtn}`}
            >
              {isLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isLoading ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
