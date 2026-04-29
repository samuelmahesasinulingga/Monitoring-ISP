import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Lebar maksimum modal. Default: "max-w-sm" */
  maxWidth?: string;
  children: React.ReactNode;
  /** Footer custom (tombol-tombol aksi) */
  footer?: React.ReactNode;
}

/**
 * Modal
 *
 * Reusable modal wrapper yang menggantikan boilerplate
 * `fixed inset-0 z-50 flex items-center justify-center bg-black/60...`
 * yang duplikat di 8+ tempat.
 *
 * @example
 * <Modal
 *   isOpen={isPackageModalOpen}
 *   onClose={() => setIsPackageModalOpen(false)}
 *   title="Kelola Paket"
 *   maxWidth="max-w-xl"
 * >
 *   ...konten...
 * </Modal>
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  maxWidth = "max-w-sm",
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Backdrop klik untuk tutup */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        {title && (
          <div className="flex justify-between items-center p-5 border-b border-[var(--border-main)] shrink-0">
            <h3 className="m-0 text-[16px] font-bold text-[var(--text-main-primary)]">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-secondary)] hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer text-[12px] font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-[var(--border-main)] flex justify-end gap-2 bg-[var(--bg-main)]/30 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
