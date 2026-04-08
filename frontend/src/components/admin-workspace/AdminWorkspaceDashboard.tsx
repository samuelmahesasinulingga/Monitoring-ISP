import React, { useState, useEffect } from "react";
import WorkspaceDashboardSection from "./WorkspaceDashboardSection";
import MonitoringSection from "./MonitoringSection";
import SLAReportSection from "./SLAReportSection";
import BillingSection from "./BillingSection";
import WorkspaceSettingsSection from "./WorkspaceSettingsSection";
import DevicesSection from "./DeviceSection";
import TopologySection from "./TopologySection";

type MenuKey = "dashboard" | "monitoring" | "devices" | "topology" | "slaReport" | "customers" | "billing" | "settings";
type MonitoringTabKey = "ping" | "alerts" | "interface" | "queue";

type Workspace = {
  id: number;
  name: string;
  address: string;
  iconUrl?: string;
};

type AdminWorkspaceDashboardProps = {
  workspaceName?: string;
  onBackToSuperAdmin?: () => void;
  onChangeWorkspace?: (ws: Workspace) => void;
  onLogout?: () => void;
  currentUserEmail?: string;
  currentUserRole?: string;
};

const AdminWorkspaceDashboard: React.FC<AdminWorkspaceDashboardProps> = ({
  workspaceName,
  onBackToSuperAdmin,
  onChangeWorkspace,
  onLogout,
  currentUserEmail,
  currentUserRole,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(() => {
    return (localStorage.getItem("adminActiveMenu") as MenuKey) || "dashboard";
  });
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showMonitoringMenu, setShowMonitoringMenu] = useState(() => {
    return localStorage.getItem("adminShowMonitoringMenu") === "true";
  });
  const [monitoringTab, setMonitoringTab] = useState<MonitoringTabKey>(() => {
    return (localStorage.getItem("adminMonitoringTab") as MonitoringTabKey) || "ping";
  });

  const [fetchedWorkspaces, setFetchedWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  useEffect(() => {
    if (currentUserRole !== "super_admin") return;

    setIsLoadingWorkspaces(true);
    fetch(`/api/workspaces`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setFetchedWorkspaces(data);
        setIsLoadingWorkspaces(false);
      })
      .catch((err) => {
        console.error("fetch workspaces error", err);
        setIsLoadingWorkspaces(false);
      });
  }, [currentUserRole]);

  useEffect(() => {
    localStorage.setItem("adminActiveMenu", activeMenu);
  }, [activeMenu]);

  useEffect(() => {
    localStorage.setItem("adminShowMonitoringMenu", String(showMonitoringMenu));
  }, [showMonitoringMenu]);

  useEffect(() => {
    localStorage.setItem("adminMonitoringTab", monitoringTab);
  }, [monitoringTab]);

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

    if (activeMenu === "devices") {
      return <DevicesSection workspaceName={workspaceName} />;
    }

    if (activeMenu === "topology") {
      return <TopologySection workspaceName={workspaceName} />;
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

  const canSwitchWorkspace = Boolean(onBackToSuperAdmin || onChangeWorkspace);

  const displayRoleLabel =
    currentUserRole === "super_admin"
      ? "Super Admin"
      : currentUserRole
      ? currentUserRole.split(" ")[0]
      : "Admin";

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 text-slate-900">
      <aside className="w-64 px-4 py-5 bg-slate-950 text-slate-100 shadow-[4px_0_20px_rgba(15,23,42,0.4)] flex flex-col">
        <div className="mb-5 relative">
          {canSwitchWorkspace ? (
            <>
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu((v) => !v)}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-700/80 cursor-pointer text-slate-100 hover:bg-slate-600/80 transition-colors"
              >
                <div className="text-[13px] font-semibold text-slate-100">
                  {workspaceName ?? "Pilih Workspace"}
                </div>
                <div className="text-[11px] text-slate-400">Admin Workspace</div>
              </button>

              {showWorkspaceMenu && (
                <div
                  className="absolute top-full left-0 mt-2 w-full bg-slate-900 rounded-xl shadow-xl shadow-slate-900/40 p-2 text-[12px] z-20 text-slate-100"
                >
                  {onBackToSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onBackToSuperAdmin();
                        setShowWorkspaceMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg border-0 bg-slate-800 cursor-pointer text-[12px] mb-1.5 text-slate-50 hover:bg-slate-700"
                    >
                      Platform Central (Super Admin)
                    </button>
                  )}

                  <div
                    className="px-2 py-1 text-[11px] text-slate-400 uppercase tracking-[0.04em]"
                  >
                    Workspace
                  </div>

                  {fetchedWorkspaces.map((ws) => {
                    const isActive = ws.name === workspaceName;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          if (onChangeWorkspace) {
                            onChangeWorkspace(ws);
                          }
                          setShowWorkspaceMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg border-0 cursor-pointer text-[12px] flex items-center gap-1.5 transition-all ${
                          isActive
                            ? "bg-slate-800 text-slate-50 translate-x-[2px]"
                            : "bg-transparent text-slate-200 hover:bg-slate-800/70"
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-md overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 inline-flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                        >
                          {ws.name
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <span>{ws.name}</span>
                      </button>
                    );
                  })}
                  {isLoadingWorkspaces && (
                    <div className="px-2 py-2 text-[11px] text-slate-500 animate-pulse">
                      Memuat daftar...
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-700/80 text-slate-100">
              <div className="text-[13px] font-semibold text-slate-100">
                {workspaceName ?? "Workspace"}
              </div>
              <div className="text-[11px] text-slate-400">Admin Workspace</div>
            </div>
          )}
        </div>

        {onBackToSuperAdmin && (
          <button
            type="button"
            onClick={onBackToSuperAdmin}
            className="mb-3 px-2.5 py-1.5 rounded-full border border-slate-800 bg-slate-950 text-[11px] text-slate-100 text-left cursor-pointer hover:bg-slate-900"
          >
            ← Kembali ke Super Admin
          </button>
        )}

        <nav className="flex flex-col gap-2 flex-1">
          <button
            type="button"
            onClick={() => setActiveMenu("dashboard")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "dashboard"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
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
              className={`w-full text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] flex items-center justify-between gap-2 ${
                activeMenu === "monitoring"
                  ? "bg-slate-950 text-slate-50"
                  : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
              }`}
            >
              <span>📡 Monitoring</span>
              <span className="text-[11px] text-slate-400">
                {showMonitoringMenu ? "▴" : "▾"}
              </span>
            </button>

            {showMonitoringMenu && activeMenu === "monitoring" && (
              <div
                className="mt-1 ml-2 flex flex-col gap-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("ping");
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-full border-0 cursor-pointer text-[12px] ${
                    monitoringTab === "ping"
                      ? "bg-slate-800 text-slate-50"
                      : "bg-transparent text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  • Monitoring ping
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("alerts");
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-full border-0 cursor-pointer text-[12px] ${
                    monitoringTab === "alerts"
                      ? "bg-slate-800 text-slate-50"
                      : "bg-transparent text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  • Alert monitoring
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("interface");
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-full border-0 cursor-pointer text-[12px] ${
                    monitoringTab === "interface"
                      ? "bg-slate-800 text-slate-50"
                      : "bg-transparent text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  • Monitoring BW per interface
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("monitoring");
                    setMonitoringTab("queue");
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-full border-0 cursor-pointer text-[12px] ${
                    monitoringTab === "queue"
                      ? "bg-slate-800 text-slate-50"
                      : "bg-transparent text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  • Monitoring BW per queue
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveMenu("devices")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "devices"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            🖧 Devices
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("topology")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "topology"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            🗺️ Topology
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("slaReport")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "slaReport"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            📈 SLA & Report
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("customers")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "customers"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            👥 Pelanggan
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("billing")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "billing"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            💳 Tagihan
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu("settings")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "settings"
                ? "bg-slate-950 text-slate-50"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            ⚙️ Pengaturan
          </button>
        </nav>

        {onLogout && (
          <div className="mt-4">
            <div className="px-2.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 bg-transparent border-0 flex-1 text-left">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600">
                  <span className="text-white text-sm font-semibold">
                    {(workspaceName || currentUserEmail || "U")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-100">
                    {displayRoleLabel}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentUserEmail || "Logged in"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-full border-0 bg-red-500 hover:bg-red-600 text-white text-[11px] font-semibold cursor-pointer transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 p-6">{renderContent()}</main>
    </div>
  );
};

export default AdminWorkspaceDashboard;
