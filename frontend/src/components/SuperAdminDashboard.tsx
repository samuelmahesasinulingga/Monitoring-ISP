import React, { useEffect, useState } from "react";
import DashboardSection from "./super-admin/DashboardSection";
import AdminWorkspaceSection from "./super-admin/AdminWorkspaceSection";
import UsersSection from "./super-admin/UsersSection";
import SettingsSection from "./super-admin/SettingsSection";
import ProfileSection from "./super-admin/ProfileSection";
import RolesSection, { RoleDefinition } from "./super-admin/RolesSection";
import Sidebar, { MenuKey } from "./Sidebar";

type Workspace = {
  id: number;
  name: string;
  address: string;
  iconUrl?: string;
};

type SuperAdminProfile = {
  name: string;
  email: string;
  whatsapp: string;
  avatarUrl?: string;
};

type SuperAdminDashboardProps = {
  onOpenWorkspace?: (workspace: Workspace) => void;
  onLogout?: () => void;
};

function SuperAdminDashboard({ onOpenWorkspace, onLogout }: SuperAdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<MenuKey>("overview");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [superAdminProfile, setSuperAdminProfile] = useState<SuperAdminProfile>({
    name: "Super Admin",
    email: "admin@isp.co.id",
    whatsapp: "0812-0000-0000",
    avatarUrl: "",
  });
  const [roles, setRoles] = useState<RoleDefinition[]>([
    {
      id: 1,
      name: "Super Admin",
      description: "Akses penuh ke seluruh sistem dan semua workspace.",
    },
    {
      id: 2,
      name: "Admin Workspace",
      description: "Mengelola 1 workspace, pelanggan, dan monitoring di dalamnya.",
    },
  ]);

  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch(`/api/workspaces`);
        if (!res.ok) {
          console.error("failed to load workspaces", await res.text());
          return;
        }
        const data: Workspace[] = await res.json();
        setWorkspaces(data);
      } catch (err) {
        console.error("load workspaces error", err);
      }
    };

    fetchWorkspaces();
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950 z-20 flex items-center justify-between px-4 shadow-[0_4px_20px_rgba(15,23,42,0.4)]">
        <div className="font-bold text-slate-100 text-[14px] flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-gradient-to-br from-indigo-600 to-purple-600 inline-flex items-center justify-center text-white text-[10px] font-bold">
            P
          </span>
          Platform Central
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      <Sidebar
        sideMode="superAdmin"
        activeMenu={activeSection as any}
        onMenuChange={(menu) => {
          setActiveSection(menu as any);
          setIsSidebarOpen(false);
        }}
        workspaceName="Platform Central"
        onLogout={onLogout || (() => {})}
        currentUserEmail={superAdminProfile.email}
        currentUserRole="Super Admin"
        fetchedWorkspaces={safeWorkspaces}
        onChangeWorkspace={onOpenWorkspace}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 p-4 pt-20 lg:p-6 lg:ml-[280px]">
        {activeSection === "overview" && <DashboardSection />}
        {activeSection === "workspace" && (
          <AdminWorkspaceSection
            workspaces={safeWorkspaces}
            setWorkspaces={setWorkspaces}
          />
        )}
        {activeSection === "users" && (
          <UsersSection workspaces={safeWorkspaces} roles={roles} />
        )}
        {activeSection === "roles" && (
          <RolesSection roles={roles} setRoles={setRoles} />
        )}
        {activeSection === "profile" && (
          <ProfileSection
            profile={superAdminProfile}
            setProfile={setSuperAdminProfile}
          />
        )}
        {activeSection === "settings" && <SettingsSection />}
      </main>
    </div>
  );
}

export default SuperAdminDashboard;
