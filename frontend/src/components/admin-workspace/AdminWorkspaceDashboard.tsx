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
import { useTheme } from "../../context/ThemeContext";


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
  const { theme, toggleTheme } = useTheme();
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
    <div className="min-h-screen flex bg-[var(--bg-main)] text-[var(--text-main-primary)] transition-colors duration-300">
      {/* Top Bar */}
      <div className={`fixed top-0 right-0 h-14 bg-[var(--bg-topbar)] backdrop-blur-md z-20 flex items-center justify-between px-4 border-b border-[var(--border-main)] transition-all duration-300 ${isSidebarOpen ? 'left-0 lg:left-[280px]' : 'left-0'}`}>
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 mr-3 rounded-md text-[var(--text-main-secondary)] hover:text-[var(--text-main-primary)] hover:bg-[var(--border-main)] transition-colors focus:outline-none"
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
          <div className="font-bold text-[var(--text-main-primary)] text-[14px] flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-indigo-600 inline-flex items-center justify-center text-white text-[10px] font-bold">
              {(workspaceName || "W")[0].toUpperCase()}
            </span>
            {workspaceName ?? "Dashboard"}
          </div>
        </div>

        {/* Theme Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-[var(--border-main)] text-[var(--text-main-primary)] hover:opacity-80 transition-all flex items-center justify-center border border-[var(--border-main)] shadow-sm"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Component - ALWAYS DARK */}
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
