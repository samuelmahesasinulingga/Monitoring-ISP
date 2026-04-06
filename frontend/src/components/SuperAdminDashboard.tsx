import React, { useEffect, useState } from "react";
import DashboardSection from "./super-admin/DashboardSection";
import AdminWorkspaceSection from "./super-admin/AdminWorkspaceSection";
import UsersSection from "./super-admin/UsersSection";
import SettingsSection from "./super-admin/SettingsSection";
import ProfileSection from "./super-admin/ProfileSection";
import RolesSection, { RoleDefinition } from "./super-admin/RolesSection";

type SectionKey =
  | "overview"
  | "adminWorkspace"
  | "users"
  | "roles"
  | "settings"
  | "profile";

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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
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

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const fetchWorkspaces = async () => {
      try {
        const res = await fetch(`${apiBase}/api/workspaces`);
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
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-100 via-slate-50 to-sky-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 px-4 py-6 bg-slate-950 text-slate-200 shadow-2xl shadow-slate-900/70 flex flex-col">
        <div className="mb-8 relative">
          <button
            onClick={() => setShowAccountMenu((v) => !v)}
            className="w-full text-left px-3 py-2.5 rounded-2xl border border-slate-800 bg-slate-800/70 hover:bg-slate-700/80 cursor-pointer text-slate-100 transition-colors"
          >
            <div className="text-[13px] font-semibold text-slate-100">ISP Admin</div>
            <div className="text-[11px] text-slate-400">Super Admin Dashboard</div>
          </button>
          {showAccountMenu && (
            <div
              className="absolute top-full left-0 mt-2 w-full bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/60 px-2 py-2 text-[12px] text-slate-100 z-20"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveSection("overview");
                  setShowAccountMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-0 cursor-pointer text-[12px] mb-1 transition-colors ${
                  activeSection === "overview"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-100 hover:bg-slate-800/70"
                }`}
              >
                Platform Central
              </button>
              {workspaces.length > 0 && (
                <div className="px-2.5 py-1 text-[11px] text-slate-500 uppercase tracking-wide">
                  Workspace
                </div>
              )}
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    if (onOpenWorkspace) {
                      onOpenWorkspace(ws);
                    } else {
                      setActiveSection("adminWorkspace");
                    }
                    setShowAccountMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border-0 cursor-pointer text-[12px] flex items-center gap-2 transition-colors ${
                    activeSection === "adminWorkspace"
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-100 hover:bg-slate-800/70"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-md overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 inline-flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                  >
                    {ws.iconUrl ? (
                      <img
                        src={ws.iconUrl}
                        alt="Icon workspace"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      ws.name
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </span>
                  <span>{ws.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  }
                  setShowAccountMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg border-0 bg-transparent text-red-200 hover:bg-red-900/40 cursor-pointer text-[12px] mt-1"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        <nav className="flex flex-col gap-2 text-[13px]">
          <button
            onClick={() => setActiveSection("overview")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer transition-colors ${
              activeSection === "overview"
                ? "bg-slate-900 text-slate-50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveSection("adminWorkspace")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer transition-colors ${
              activeSection === "adminWorkspace"
                ? "bg-slate-900 text-slate-50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
            }`}
          >
            👥 Workspace
          </button>
          <button
            onClick={() => setActiveSection("roles")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer transition-colors ${
              activeSection === "roles"
                ? "bg-slate-900 text-slate-50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
            }`}
          >
            🔑 Role & Akses
          </button>
          <button
            onClick={() => setActiveSection("users")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer transition-colors ${
              activeSection === "users"
                ? "bg-slate-900 text-slate-50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
            }`}
          >
            👤 Pengguna
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            className={`text-left px-3 py-2.5 rounded-full border-0 cursor-pointer transition-colors ${
              activeSection === "settings"
                ? "bg-slate-900 text-slate-50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
            }`}
          >
            ⚙️ Pengaturan Sistem
          </button>
        </nav>
        <div className="mt-auto">
          <div className="mt-4 px-2.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveSection("profile")}
              className="flex items-center gap-2 bg-transparent border-0 flex-1 text-left cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600"
              >
                {superAdminProfile.avatarUrl ? (
                  <img
                    src={superAdminProfile.avatarUrl}
                    alt="Foto profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">SA</span>
                )}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-slate-100">
                  {superAdminProfile.name}
                </div>
                <div className="text-[11px] text-slate-400">Logged in</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                }
              }}
              className="px-3 py-1.5 rounded-full border-0 bg-red-500 hover:bg-red-600 text-white text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {activeSection === "overview" && <DashboardSection />}
        {activeSection === "adminWorkspace" && (
          <AdminWorkspaceSection
            workspaces={workspaces}
            setWorkspaces={setWorkspaces}
          />
        )}
        {activeSection === "users" && (
          <UsersSection workspaces={workspaces} roles={roles} />
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
