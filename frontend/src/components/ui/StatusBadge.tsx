import React from "react";

type StatusVariant =
  // Invoice / Billing
  | "paid"
  | "unpaid"
  // Network / Device
  | "up"
  | "down"
  | "warning"
  // IP Address
  | "available"
  | "assigned"
  | "reserved"
  // Generic
  | "active"
  | "inactive"
  | "unknown";

interface StatusBadgeProps {
  status: StatusVariant | string;
  /** Override label teks. Default: status huruf kapital */
  label?: string;
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  up: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  down: "bg-red-500/10 text-red-500 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  available: "bg-green-500/10 text-green-500 border-green-500/20",
  assigned: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  reserved: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  unknown: "bg-[var(--bg-main)] text-[var(--text-main-secondary)] border-[var(--border-main)]",
};

const LABEL_MAP: Record<string, string> = {
  paid: "LUNAS",
  unpaid: "BELUM LUNAS",
  up: "UP",
  down: "DOWN",
  available: "AVAILABLE",
  assigned: "ASSIGNED",
  reserved: "RESERVED",
  active: "AKTIF",
  inactive: "NONAKTIF",
};

/**
 * StatusBadge
 *
 * Badge status kecil yang konsisten untuk seluruh halaman.
 * Menggantikan inline className yang berbeda-beda di setiap komponen.
 *
 * @example
 * <StatusBadge status="paid" />
 * <StatusBadge status="down" label="Offline" />
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = "" }) => {
  const key = status.toLowerCase();
  const styles = VARIANT_STYLES[key] ?? VARIANT_STYLES["unknown"];
  const displayLabel = label ?? LABEL_MAP[key] ?? status.toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${styles} ${className}`}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
