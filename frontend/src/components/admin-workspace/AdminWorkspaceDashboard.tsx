import React from "react";

const AdminWorkspaceDashboard: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #eff6ff 0, #f9fafb 50%, #e0f2fe 100%)",
        color: "#111827",
      }}
    >
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: "rgba(255,255,255,0.96)",
          boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, marginBottom: 8 }}>
          Admin Workspace Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Halaman ini nantinya digunakan untuk role Admin Workspace
          (bukan Super Admin) dengan menu dan akses yang lebih terbatas.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
          Untuk sekarang ini hanya placeholder agar struktur folder per role sudah siap.
        </p>
      </div>
    </div>
  );
};

export default AdminWorkspaceDashboard;
