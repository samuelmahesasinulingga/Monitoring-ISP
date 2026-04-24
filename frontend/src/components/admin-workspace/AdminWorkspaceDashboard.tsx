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
import IPManagementSection from "./IPManagementSection";
import Sidebar, { MenuKey } from "../Sidebar";


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
    const saved = localStorage.getItem("activeMenu");
    return (saved as MenuKey) || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("activeMenu", activeMenu);
  }, [activeMenu]);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [monitoringTab, setMonitoringTab] = useState<MonitoringTabKey>("ping");
  const [fetchedWorkspaces, setFetchedWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  useEffect(() => {
    const loadWorkspaces = async () => {
      setIsLoadingWorkspaces(true);
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          setFetchedWorkspaces(data);
        }
      } catch (err) {
        console.error("load workspaces err", err);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };
    loadWorkspaces();
  }, []);

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <WorkspaceDashboardSection
            workspaceName={workspaceName}
            workspaceId={workspaceId}
          />
        );
      case "monitoring":
        return (
          <MonitoringSection
            initialTab={monitoringTab}
            workspaceId={workspaceId}
          />
        );
      case "analytics":
        return <TrafficAnalyticsSection workspaceId={workspaceId} />;
      case "devices":
        return <DevicesSection workspaceId={workspaceId} />;
      case "topology":
        return <TopologySection workspaceId={workspaceId} />;
      case "ipManagement":
        return <IPManagementSection workspaceId={workspaceId} />;
      case "slaReport":
        return <SLAReportSection workspaceId={workspaceId} />;
      case "customers":
        return <CustomerSection workspaceId={workspaceId} />;
      case "billing":
        return <BillingSection workspaceId={workspaceId} />;
      case "settings":
        return <WorkspaceSettingsSection workspaceId={workspaceId} />;
      default:
        return (
          <div className="p-8 text-center text-slate-400">
            Section "{activeMenu}" is under construction.
          </div>
        );
    }
  };

  const displayRoleLabel =
    currentUserRole === "super_admin"
      ? "Super Admin"
      : currentUserRole
      ? currentUserRole.split(" ")[0]
      : "Admin";

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
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
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Sidebar Component */}
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
          setIsSidebarOpen(false);
        }}
        activeTab={monitoringTab}
        onTabChange={setMonitoringTab}
        workspaceName={workspaceName}
        workspaceId={workspaceId}
        fetchedWorkspaces={fetchedWorkspaces}
        isLoadingWorkspaces={isLoadingWorkspaces}
        onChangeWorkspace={onChangeWorkspace}
        onLogout={onLogout || (() => {})}
        currentUserEmail={currentUserEmail}
        currentUserRole={displayRoleLabel}
        onBackToSuperAdmin={onBackToSuperAdmin}
        sideMode="admin"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 p-4 pt-20 lg:p-6 lg:ml-[280px]">{renderContent()}</main>
    </div>
  );
};

export default AdminWorkspaceDashboard;
