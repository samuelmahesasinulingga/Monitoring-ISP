import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Elemen di sisi kanan (tombol, badge, dsb.) */
  action?: React.ReactNode;
  /** Ikon emoji atau elemen custom di depan judul */
  icon?: string;
}

/**
 * PageHeader
 *
 * Komponen header standar yang digunakan di semua section.
 * Konsisten dalam styling `<h1>`, deskripsi, dan tombol action.
 *
 * @example
 * <PageHeader
 *   icon="💳"
 *   title="Billing & Invoice"
 *   description="Kelola tagihan dan daftar paket layanan ISP."
 *   action={<button ...>+ Buat Tagihan</button>}
 * />
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action, icon }) => {
  return (
    <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="m-0 mb-1 text-[20px] font-bold text-[var(--text-main-primary)] flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="m-0 text-[12px] text-[var(--text-main-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </header>
  );
};

export default PageHeader;
