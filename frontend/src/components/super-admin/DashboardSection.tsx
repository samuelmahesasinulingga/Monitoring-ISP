import React from "react";

const DashboardSection: React.FC = () => {
  const totalWorkspace = 4; // ganti dengan data nyata nanti
  const totalUsers = 1280; // ganti dengan data nyata nanti

  return (
    <section
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 8,
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 4,
          }}
        >
          Ringkasan Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Gambaran singkat jumlah workspace dan total pengguna ISP.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(129,140,248,0.18))",
            border: "1px solid rgba(59,130,246,0.18)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>
              Total Workspace
            </span>
            <span style={{ fontSize: 20 }}>🏢</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
            {totalWorkspace}
          </div>
          <p style={{ margin: 0, marginTop: 6, fontSize: 11, color: "#6b7280" }}>
            Jumlah workspace.
          </p>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(45,212,191,0.18))",
            border: "1px solid rgba(16,185,129,0.18)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "#047857", fontWeight: 600 }}>
              Total Pengguna
            </span>
            <span style={{ fontSize: 20 }}>👤</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
            {totalUsers}
          </div>
          <p style={{ margin: 0, marginTop: 6, fontSize: 11, color: "#6b7280" }}>
            Jumlah pengguna.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardSection;
