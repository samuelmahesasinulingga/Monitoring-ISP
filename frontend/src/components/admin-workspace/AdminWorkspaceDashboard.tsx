import React, { useState, useEffect } from "react";
import WorkspaceDashboardSection from "./WorkspaceDashboardSection";
import MonitoringSection from "./MonitoringSection";
import SLAReportSection from "./SLAReportSection";
import BillingSection from "./BillingSection";
import WorkspaceSettingsSection from "./WorkspaceSettingsSection";
import DevicesSection from "./DeviceSection";
import TopologySection from "./TopologySection";
import CustomerSection from "./CustomerSection";
import TrafficAnalyticsSection from "./TrafficAnalyticsSection";

type MenuKey = "dashboard" | "monitoring" | "analytics" | "devices" | "topology" | "slaReport" | "customers" | "billing" | "settings";
type MonitoringTabKey = "ping" | "alerts" | "interface" | "queue";

type Workspace = {
  id: number;
  name: string;
  address: string;
  iconUrl?: string;
};

type AdminWorkspaceDashboardProps = {
  workspaceName?: string;
  workspaceId?: number;
  onBackToSuperAdmin?: () => void;
  onChangeWorkspace?: (ws: Workspace) => void;
  onLogout?: () => void;
  currentUserEmail?: string;
  currentUserRole?: string;
};

const AdminWorkspaceDashboard: React.FC<AdminWorkspaceDashboardProps> = ({
  workspaceName,
  workspaceId,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          workspaceId={workspaceId}
          initialTab={monitoringTab}
        />
      );
    }

    if (activeMenu === "analytics") {
      return (
        <TrafficAnalyticsSection
          workspaceName={workspaceName}
          workspaceId={workspaceId}
        />
      );
    }

    if (activeMenu === "devices") {
      return <DevicesSection workspaceName={workspaceName} workspaceId={workspaceId} />;
    }

    if (activeMenu === "topology") {
      return <TopologySection workspaceName={workspaceName} workspaceId={workspaceId} />;
    }

    if (activeMenu === "slaReport") {
      return <SLAReportSection />;
    }

    if (activeMenu === "customers") {
      return (
        <CustomerSection workspaceName={workspaceName} workspaceId={workspaceId} />
      );
    }

    if (activeMenu === "billing") {
      return (
        <BillingSection workspaceName={workspaceName} workspaceId={workspaceId} />
      );
    }

    if (activeMenu === "settings") {
      return <WorkspaceSettingsSection workspaceName={workspaceName} workspaceId={workspaceId} />;
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
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950 z-20 flex items-center justify-between px-4 shadow-[0_4px_20px_rgba(15,23,42,0.4)]">
        <div className="font-bold text-slate-100 text-[14px] flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-indigo-600 inline-flex items-center justify-center text-white text-[10px] font-bold">
            {(workspaceName || "W")[0].toUpperCase()}
          </span>
          {workspaceName ?? "Dashboard"}
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 z-30 h-screen w-64 px-4 py-5 bg-slate-950 text-slate-100 shadow-[4px_0_20px_rgba(15,23,42,0.4)] flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="lg:hidden absolute top-3 right-3 z-40">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/50 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 mt-2 lg:mt-0">
          <button
            type="button"
            onClick={() => { setActiveMenu("dashboard"); setIsSidebarOpen(false); }}
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
                    setIsSidebarOpen(false);
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
                    setIsSidebarOpen(false);
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
                    setIsSidebarOpen(false);
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
                    setIsSidebarOpen(false);
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
            onClick={() => { setActiveMenu("analytics"); setIsSidebarOpen(false); }}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer text-[13px] ${
              activeMenu === "analytics"
                ? "bg-slate-950 text-slate-50 shadow-lg shadow-blue-900/20"
                : "bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
            }`}
          >
            🔥 Traffic Analytics
          </button>
          <button
            type="button"
            onClick={() => { setActiveMenu("devices"); setIsSidebarOpen(false); }}
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
            onClick={() => { setActiveMenu("topology"); setIsSidebarOpen(false); }}
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
            onClick={() => { setActiveMenu("slaReport"); setIsSidebarOpen(false); }}
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
            onClick={() => { setActiveMenu("customers"); setIsSidebarOpen(false); }}
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
            onClick={() => { setActiveMenu("billing"); setIsSidebarOpen(false); }}
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
            onClick={() => { setActiveMenu("settings"); setIsSidebarOpen(false); }}
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

      <main className="flex-1 p-4 pt-20 lg:p-6 lg:ml-64">{renderContent()}</main>
    </div>
  );
};

export default AdminWorkspaceDashboard;
