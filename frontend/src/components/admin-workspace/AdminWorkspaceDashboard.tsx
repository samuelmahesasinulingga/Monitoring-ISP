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
  onLogout?: () => void;
  currentUserEmail?: string;
  currentUserRole?: string;
};

const AdminWorkspaceDashboard: React.FC<AdminWorkspaceDashboardProps> = ({
  workspaceName,
  workspaceId,
  onLogout,
  currentUserEmail,
  currentUserRole,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(() => {
    const saved = localStorage.getItem("activeMenu");
    return (saved as MenuKey) || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth >= 1024;
    return true;
  });

  useEffect(() => {
    localStorage.setItem("activeMenu", activeMenu);
  }, [activeMenu]);

  const [monitoringTab, setMonitoringTab] = useState<MonitoringTabKey>("ping");

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

  const displayRoleLabel = currentUserRole ? currentUserRole.split(" ")[0] : "Admin";

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      {/* Top Bar */}
      <div className={`fixed top-0 right-0 h-14 bg-slate-950/80 backdrop-blur-md z-20 flex items-center px-4 border-b border-slate-800 transition-all duration-300 ${isSidebarOpen ? 'left-0 lg:left-[280px]' : 'left-0'}`}>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 mr-3 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <svg
            width="20"
            height="20"
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
        <div className="font-bold text-slate-100 text-[14px] flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-indigo-600 inline-flex items-center justify-center text-white text-[10px] font-bold">
            {(workspaceName || "W")[0].toUpperCase()}
          </span>
          {workspaceName ?? "Dashboard"}
        </div>
      </div>

      {/* Sidebar Component */}
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }}
        activeTab={monitoringTab}
        onTabChange={setMonitoringTab}
        workspaceName={workspaceName}
        workspaceId={workspaceId}
        onLogout={onLogout || (() => {})}
        currentUserEmail={currentUserEmail}
        currentUserRole={displayRoleLabel}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className={`flex-1 p-4 pt-20 transition-all duration-300 ${isSidebarOpen ? 'lg:p-6 lg:pt-20 lg:ml-[280px]' : 'lg:p-6 lg:pt-20 lg:ml-0'}`}>{renderContent()}</main>
    </div>
  );
};

export default AdminWorkspaceDashboard;
