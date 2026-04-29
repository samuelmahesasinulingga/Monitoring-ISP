import { useState } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import React from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogState extends ConfirmOptions {
  isOpen: boolean;
  isLoading: boolean;
}

const DEFAULT_STATE: ConfirmDialogState = {
  isOpen: false,
  isLoading: false,
  title: "",
  message: "",
  onConfirm: () => {},
};

/**
 * useConfirmDialog
 *
 * Custom hook yang mengelola state untuk ConfirmDialog.
 * Menghilangkan boilerplate ~20 baris di setiap komponen yang
 * membutuhkan dialog konfirmasi.
 *
 * @example
 * const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * // Tampilkan dialog:
 * showConfirm({
 *   title: "Hapus Data",
 *   message: "Apakah Anda yakin?",
 *   variant: "danger",
 *   onConfirm: async () => { await deleteItem(id); }
 * });
 *
 * // Di JSX:
 * return <>{ConfirmDialogComponent}</>;
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>(DEFAULT_STATE);

  const showConfirm = (opts: ConfirmOptions) => {
    setState({ ...opts, isOpen: true, isLoading: false });
  };

  const closeConfirm = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await state.onConfirm();
    } finally {
      closeConfirm();
    }
  };

  // Pre-built component ready to drop into any JSX
  const ConfirmDialogComponent = React.createElement(ConfirmDialog, {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    isLoading: state.isLoading,
    onConfirm: handleConfirm,
    onCancel: closeConfirm,
  });

  return {
    showConfirm,
    closeConfirm,
    ConfirmDialogComponent,
    // Expose raw props for manual usage if needed
    confirmDialogProps: {
      isOpen: state.isOpen,
      title: state.title,
      message: state.message,
      confirmLabel: state.confirmLabel,
      variant: state.variant,
      isLoading: state.isLoading,
      onConfirm: handleConfirm,
      onCancel: closeConfirm,
    },
  };
}
