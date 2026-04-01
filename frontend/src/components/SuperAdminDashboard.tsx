import React, { useState } from "react";
import DashboardSection from "./super-admin/DashboardSection";
import AdminWorkspaceSection from "./super-admin/AdminWorkspaceSection";
import UsersSection from "./super-admin/UsersSection";
import SettingsSection from "./super-admin/SettingsSection";
import ProfileSection from "./super-admin/ProfileSection";
import RolesSection from "./super-admin/RolesSection";

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

type RoleDefinition = {
  id: number;
  name: string;
  description: string;
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    {
      id: 1,
      name: "Kantor Pusat ISP",
      address: "Jl. Utama No. 1, Jakarta",
      iconUrl: "",
    },
    {
      id: 2,
      name: "POP Bandung",
      address: "Jl. Telekomunikasi No. 10, Bandung",
      iconUrl: "",
    },
  ]);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background:
          "linear-gradient(135deg, #edf2ff 0, #f9fafb 40%, #e0f2fe 100%)",
        color: "#111827",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          padding: "24px 16px",
          background: "rgba(255,255,255,0.9)",
          boxShadow: "4px 0 20px rgba(15,23,42,0.06)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: 32, position: "relative" }}>
          <button
            onClick={() => setShowAccountMenu((v) => !v)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>ISP Admin</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Super Admin Dashboard</div>
          </button>
          {showAccountMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 8,
                width: "100%",
                background: "#ffffff",
                borderRadius: 12,
                boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
                padding: 8,
                fontSize: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveSection("overview");
                  setShowAccountMenu(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Platform Central
              </button>
              {workspaces.length > 0 && (
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
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
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
                    {ws.iconUrl ? (
                      <img
                        src={ws.iconUrl}
                        alt="Icon workspace"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
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
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#b91c1c",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setActiveSection("overview")}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeSection === "overview"
                  ? "linear-gradient(135deg, #dbeafe, #bfdbfe)"
                  : "transparent",
              color: activeSection === "overview" ? "#1d4ed8" : "#4b5563",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveSection("adminWorkspace")}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeSection === "adminWorkspace" ? "#e5e7eb" : "transparent",
              color: activeSection === "adminWorkspace" ? "#111827" : "#4b5563",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            👥 Workspace
          </button>
          <button
            onClick={() => setActiveSection("roles")}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeSection === "roles" ? "#e5e7eb" : "transparent",
              color: activeSection === "roles" ? "#111827" : "#4b5563",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            🔑 Role & Akses
          </button>
          <button
            onClick={() => setActiveSection("users")}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeSection === "users" ? "#e5e7eb" : "transparent",
              color: activeSection === "users" ? "#111827" : "#4b5563",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            👤 Pengguna
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background:
                activeSection === "settings" ? "#e5e7eb" : "transparent",
              color: activeSection === "settings" ? "#111827" : "#4b5563",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ⚙️ Pengaturan Sistem
          </button>
        </nav>
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              marginTop: 16,
              padding: 10,
              borderRadius: 10,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveSection("profile")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 0,
                background: "transparent",
                border: "none",
                flex: 1,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, #2563eb, #4f46e5)",
                }}
              >
                {superAdminProfile.avatarUrl ? (
                  <img
                    src={superAdminProfile.avatarUrl}
                    alt="Foto profil"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    SA
                  </span>
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {superAdminProfile.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  Logged in
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                }
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 24 }}>
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
