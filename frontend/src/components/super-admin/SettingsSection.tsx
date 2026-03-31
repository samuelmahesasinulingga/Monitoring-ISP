import React from "react";

const SettingsSection: React.FC = () => {
  return (
    <section
      style={{
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        padding: 16,
        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20, marginBottom: 8 }}>Pengaturan Sistem</h1>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
        Placeholder untuk pengaturan global ISP (nanti bisa diisi limit bandwidth default,
        notifikasi, dan lain-lain).
      </p>
    </section>
  );
};

export default SettingsSection;
