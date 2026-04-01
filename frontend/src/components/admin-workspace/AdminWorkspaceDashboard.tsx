import React, { useState } from "react";
import WorkspaceDashboardSection from "./WorkspaceDashboardSection";
import MonitoringSection from "./MonitoringSection";
import SLAReportSection from "./SLAReportSection";
import BillingSection from "./BillingSection";
import WorkspaceSettingsSection from "./WorkspaceSettingsSection";

type MenuKey = "dashboard" | "monitoring" | "slaReport" | "customers" | "billing" | "settings";
type MonitoringTabKey = "ping" | "alerts" | "interface" | "queue";

type AdminWorkspaceDashboardProps = {
  workspaceName?: string;
  onBackToSuperAdmin?: () => void;
  onChangeWorkspaceName?: (name: string) => void;
};

const AdminWorkspaceDashboard: React.FC<AdminWorkspaceDashboardProps> = ({
  workspaceName,
  onBackToSuperAdmin,
  onChangeWorkspaceName,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showMonitoringMenu, setShowMonitoringMenu] = useState(false);
  const [monitoringTab, setMonitoringTab] = useState<MonitoringTabKey>("ping");

  const renderContent = () => {
    if (activeMenu === "dashboard") {
      return <WorkspaceDashboardSection workspaceName={workspaceName} />;
    }

    if (activeMenu === "monitoring") {
      return (
        <MonitoringSection
          workspaceName={workspaceName}
          initialTab={monitoringTab}
          key={monitoringTab}
        />
      );
    }

    if (activeMenu === "slaReport") {
      return <SLAReportSection />;
    }

    if (activeMenu === "customers") {
      return (
        <section style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            Data Pelanggan
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Halaman ini nantinya berisi daftar pelanggan untuk workspace ini.
          </p>
        </section>
      );
    }

    if (activeMenu === "billing") {
      return (
        <BillingSection workspaceName={workspaceName} />
      );
    }

    if (activeMenu === "settings") {
      return <WorkspaceSettingsSection workspaceName={workspaceName} />;
    }

    return null;
  };

  const baseWorkspaceOptions = [
    "Kantor Pusat ISP",
    "POP Bandung",
    "POP Surabaya",
  ];

  const workspaceOptions = workspaceName
    ? [
        workspaceName,
        ...baseWorkspaceOptions.filter((n) => n !== workspaceName),
      ]
    : baseWorkspaceOptions;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background:
          "linear-gradient(135deg, #eff6ff 0, #f9fafb 50%, #e0f2fe 100%)",
        color: "#111827",
      }}
    >
      <aside
        style={{
          width: 250,
          padding: "20px 16px",
          background: "#020617",
          boxShadow: "4px 0 20px rgba(15,23,42,0.4)",
          display: "flex",
          flexDirection: "column",
          color: "#e5e7eb",
        }}
      >
        <div style={{ marginBottom: 20, position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu((v) => !v)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #1f2937",
              background: "#111827",
              cursor: "pointer",
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#e5e7eb",
              }}
            >
              {workspaceName ?? "Pilih Workspace"}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              Admin Workspace
            </div>
          </button>

          {showWorkspaceMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 8,
                width: "100%",
                background: "#111827",
                borderRadius: 12,
                boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
                padding: 8,
                fontSize: 12,
                zIndex: 20,
                color: "#e5e7eb",
              }}
            >
              {onBackToSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onBackToSuperAdmin();
                    setShowWorkspaceMenu(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "none",
                    background: "#1f2937",
                    cursor: "pointer",
                    fontSize: 12,
                    marginBottom: 4,
                    color: "#f9fafb",
                  }}
                >
                  Platform Central (Super Admin)
                </button>
              )}

              <div
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Workspace
              </div>

              {workspaceOptions.map((name) => {
                const isActive = name === workspaceName;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      if (onChangeWorkspaceName) {
                        onChangeWorkspaceName(name);
                      }
                      setShowWorkspaceMenu(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "none",
                      background: isActive ? "#1f2937" : "transparent",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition:
                        "background 0.18s ease, transform 0.18s ease",
                      transform: isActive ? "translateX(2px)" : "none",
                      color: isActive ? "#f9fafb" : "#e5e7eb",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        overflow: "hidden",
                        background:
                          "linear-gradient(135deg, #2563eb, #4f46e5)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {name
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <span>{name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#fecaca",
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                Logout (dummy)
              </button>
            </div>
          )}
        </div>

        {onBackToSuperAdmin && (
          <button
            type="button"
            onClick={onBackToSuperAdmin}
            style={{
              marginBottom: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #1f2937",
              background: "#020617",
              fontSize: 11,
              cursor: "pointer",
              textAlign: "left",
              color: "#e5e7eb",
            }}
          >
            ← Kembali ke Super Admin
          </button>
        )}

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveMenu("dashboard")}
            style={{
              textAlign: "left",
              padding: "9px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeMenu === "dashboard" ? "#020617" : "transparent",
              color:
                activeMenu === "dashboard" ? "#f9fafb" : "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            📊 Dashboard
          </button>
          <div>
            <button
              type="button"
              onClick={() => {
                setActiveMenu("monitoring");
                setShowMonitoringMenu((v) => !v);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  activeMenu === "monitoring" ? "#020617" : "transparent",
                color:
                  activeMenu === "monitoring" ? "#f9fafb" : "#9ca3af",
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>📡 Monitoring</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                {showMonitoringMenu ? "▴" : "▾"}
              </span>
            </button>

            {showMonitoringMenu && activeMenu === "monitoring" && (
              <div
                style={{
                  marginTop: 4,
                  marginLeft: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("ping");
                  }}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      monitoringTab === "ping" ? "#1f2937" : "transparent",
                    color:
                      monitoringTab === "ping" ? "#f9fafb" : "#e5e7eb",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  • Monitoring ping
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("alerts");
                  }}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      monitoringTab === "alerts" ? "#1f2937" : "transparent",
                    color:
                      monitoringTab === "alerts" ? "#f9fafb" : "#e5e7eb",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  • Alert monitoring
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("interface");
                  }}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      monitoringTab === "interface"
                        ? "#1f2937"
                        : "transparent",
                    color:
                      monitoringTab === "interface"
                        ? "#f9fafb"
                        : "#e5e7eb",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  • Monitoring BW per interface
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("queue");
                  }}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      monitoringTab === "queue" ? "#1f2937" : "transparent",
                    color:
                      monitoringTab === "queue" ? "#f9fafb" : "#e5e7eb",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  • Monitoring BW per queue
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveMenu("slaReport")}
            style={{
              textAlign: "left",
              padding: "9px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeMenu === "slaReport" ? "#020617" : "transparent",
              color:
                activeMenu === "slaReport" ? "#f9fafb" : "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            📈 SLA & Report
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("customers")}
            style={{
              textAlign: "left",
              padding: "9px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeMenu === "customers" ? "#020617" : "transparent",
              color:
                activeMenu === "customers" ? "#f9fafb" : "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            👥 Pelanggan
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("billing")}
            style={{
              textAlign: "left",
              padding: "9px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeMenu === "billing" ? "#020617" : "transparent",
              color:
                activeMenu === "billing" ? "#f9fafb" : "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            💳 Tagihan
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("settings")}
            style={{
              textAlign: "left",
              padding: "9px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeMenu === "settings" ? "#020617" : "transparent",
              color:
                activeMenu === "settings" ? "#f9fafb" : "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ⚙️ Pengaturan
          </button>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{renderContent()}</main>
    </div>
  );
};

export default AdminWorkspaceDashboard;
