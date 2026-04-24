import React from "react";
import "./Sidebar.css";

export type MenuKey = 
  | "dashboard" | "monitoring" | "analytics" | "devices" | "topology" | "slaReport" | "customers" | "billing" | "settings" | "ipManagement"
  | "overview" | "workspace" | "roles" | "users" | "profile";

interface SidebarProps {
  activeMenu: MenuKey;
  onMenuChange: (menu: MenuKey) => void;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  workspaceName?: string;
  workspaceId?: number;
  fetchedWorkspaces?: any[];
  isLoadingWorkspaces?: boolean;
  onChangeWorkspace?: (ws: any) => void;
  onLogout: () => void;
  currentUserEmail?: string;
  currentUserRole?: string;
  onBackToSuperAdmin?: () => void;
  sideMode?: "admin" | "superAdmin";
  isOpen?: boolean;
  onClose?: () => void;
}

const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
  ),
  Monitoring: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
  ),
  Analytics: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  ),
  Devices: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
  ),
  Topology: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
  ),
  SLAReport: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  Customers: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Billing: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  Diagnostics: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="8" x="2" y="2" rx="2"/><path d="M10 10 2 2"/><rect width="8" height="8" x="14" y="14" rx="2"/><path d="m22 22-8-8"/><rect width="8" height="8" x="2" y="14" rx="2"/><path d="m10 14-8 8"/><rect width="8" height="8" x="14" y="2" rx="2"/><path d="M14 10 22 2"/></svg>
  ),
  Roles: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  IP: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><path d="M7 22V14"/><path d="M17 22V14"/><path d="M2 14h20"/></svg>
  )
};

const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onMenuChange,
  activeTab,
  onTabChange,
  workspaceName,
  workspaceId,
  fetchedWorkspaces = [],
  isLoadingWorkspaces = false,
  onChangeWorkspace,
  onLogout,
  currentUserEmail,
  currentUserRole,
  onBackToSuperAdmin,
  sideMode = "admin",
  isOpen = false,
  onClose
}) => {
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({
    monitoring: activeMenu === "monitoring"
  });
  const [showWSMenu, setShowWSMenu] = React.useState(false);

  const initials = (workspaceName || currentUserEmail || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const adminMenuItems = [
    { key: "dashboard", label: "Dashboard", icon: Icons.Dashboard, color: "#3b82f6", group: "OPERATIONS" },
    { 
      key: "monitoring", 
      label: "Monitoring", 
      icon: Icons.Monitoring, 
      color: "#10b981", 
      group: "OPERATIONS",
      subItems: [
        { key: "ping", label: "Monitoring ping" },
        { key: "alerts", label: "Alert monitoring" },
        { key: "interface", label: "Monitoring BW per interface" },
        { key: "queue", label: "Monitoring BW per queue" },
      ]
    },
    { key: "analytics", label: "Traffic Analytics", icon: Icons.Analytics, color: "#f43f5e", group: "OPERATIONS" },
    { key: "devices", label: "Devices", icon: Icons.Devices, color: "#14b8a6", group: "SYSTEM" },
    { key: "topology", label: "Topology", icon: Icons.Topology, color: "#6366f1", group: "SYSTEM" },
    { key: "ipManagement", label: "IP Management", icon: Icons.IP, color: "#8b5cf6", group: "SYSTEM" },
    { key: "slaReport", label: "SLA & Report", icon: Icons.SLAReport, color: "#f59e0b", group: "SYSTEM" },
    { key: "customers", label: "Pelanggan", icon: Icons.Customers, color: "#06b6d4", group: "SYSTEM" },
    { key: "billing", label: "Tagihan", icon: Icons.Billing, color: "#eab308", group: "SYSTEM" },
    { key: "settings", label: "Pengaturan", icon: Icons.Settings, color: "#94a3b8", group: "SYSTEM" },
  ];

  const superAdminMenuItems = [
    { key: "overview", label: "Dashboard", icon: Icons.Dashboard, color: "#3b82f6", group: "CENTRAL" },
    { key: "workspace", label: "Workspace", icon: Icons.Devices, color: "#10b981", group: "MANAGEMENT" },
    { key: "roles", label: "Role & Akses", icon: Icons.Roles, color: "#f59e0b", group: "MANAGEMENT" },
    { key: "users", label: "Pengguna", icon: Icons.User, color: "#6366f1", group: "MANAGEMENT" },
    { key: "settings", label: "Pengaturan Sistem", icon: Icons.Settings, color: "#94a3b8", group: "SYSTEM" },
    { key: "profile", label: "Profil Saya", icon: Icons.User, color: "#ec4899", group: "SYSTEM" },
  ];

  const menuItems = sideMode === "superAdmin" ? superAdminMenuItems : adminMenuItems;

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <aside 
        className={`sidebar-container ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-text">NOCS</span>
        </div>
        <div className="header-info" style={{ position: "relative" }}>
          <h1 className="app-title">NOC System</h1>
          {onBackToSuperAdmin || onChangeWorkspace ? (
            <button 
              className="org-select-btn" 
              onClick={() => setShowWSMenu(!showWSMenu)}
              style={{ marginTop: "4px" }}
            >
              <div style={{ minWidth: 0 }}>
                <p className="org-name" style={{ color: "#f8fafc", fontWeight: 600 }}>{workspaceName || "Pilih Workspace"}</p>
                <p className="user-role" style={{ fontSize: "10px" }}>Admin Workspace</p>
              </div>
              <Icons.ChevronDown />
            </button>
          ) : (
            <div style={{ marginTop: "4px" }}>
              <p className="org-name">{workspaceName || "PT. Jaringan Datamedia"}</p>
              <span className="app-version">v1.0.12</span>
            </div>
          )}

          {showWSMenu && (
            <div className="workspace-dropdown">
              {onBackToSuperAdmin && (
                <button 
                  className="platform-central-btn"
                  onClick={() => {
                    onBackToSuperAdmin();
                    setShowWSMenu(false);
                  }}
                >
                  ← Platform Central (Super Admin)
                </button>
              )}
              
              <div className="ws-label">Workspaces</div>
              
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {fetchedWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className={`workspace-item ${ws.id === workspaceId ? "active" : ""}`}
                    onClick={() => {
                      onChangeWorkspace && onChangeWorkspace(ws);
                      setShowWSMenu(false);
                    }}
                  >
                    <div className="ws-avatar-sm">{ws.name.charAt(0).toUpperCase()}</div>
                    <span style={{ fontSize: "12px" }}>{ws.name}</span>
                  </button>
                ))}
                {isLoadingWorkspaces && <div className="ws-label" style={{ textAlign: "center" }}>Memuat...</div>}
              </div>
            </div>
          )}
        </div>
        {onBackToSuperAdmin && (
          <button className="back-button" onClick={onBackToSuperAdmin}>
            <Icons.ChevronLeft />
          </button>
        )}
      </div>

      <div className="nav-scroll">
        {Object.entries(groupedItems).map(([group, items]) => (
          <React.Fragment key={group}>
            <div className="nav-group-label">{group}</div>
            {items.map((item) => (
              <React.Fragment key={item.key}>
                <div
                  className={`nav-item ${activeMenu === item.key ? "active" : ""}`}
                  onClick={(e) => {
                    onMenuChange(item.key as MenuKey);
                    if (item.subItems) {
                      setExpandedMenus(prev => ({
                        ...prev,
                        [item.key]: !prev[item.key]
                      }));
                    }
                  }}
                >
                  <div 
                    className="icon-box" 
                    style={{ 
                      backgroundColor: `${item.color}1a`, 
                      color: item.color 
                    }}
                  >
                    <item.icon />
                  </div>
                  <span className="nav-text">{item.label}</span>
                  {item.subItems && (
                    <span 
                      style={{ 
                        marginLeft: "auto", 
                        opacity: 0.5, 
                        transform: expandedMenus[item.key] ? "rotate(180deg)" : "none", 
                        transition: "transform 0.2s",
                        padding: "4px"
                      }}
                    >
                      <Icons.ChevronDown />
                    </span>
                  )}
                  {item.key === "settings" && <span className="license-pro">PRO</span>}
                </div>
                
                {item.subItems && expandedMenus[item.key] && (
                  <div className="nav-sub-menu">
                    {item.subItems.map((sub: any) => (
                      <div
                        key={sub.key}
                        className={`sub-nav-item ${activeTab === sub.key && activeMenu === item.key ? "active" : ""}`}
                        onClick={() => {
                          onMenuChange(item.key as MenuKey);
                          onTabChange && onTabChange(sub.key);
                        }}
                      >
                        {sub.label}
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-card">
          <div 
            className="user-avatar" 
            style={{ 
              cursor: "pointer",
              background: sideMode === "superAdmin" ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" : undefined 
            }}
            onClick={() => sideMode === "superAdmin" && onMenuChange("profile")}
          >
            {initials}
          </div>
          <div className="user-info">
            <p className="user-name">{sideMode === "superAdmin" ? "Super Admin" : "IDN"}</p>
            <p className="user-role">{currentUserRole || "Admin"}</p>
          </div>
          <div className="footer-actions">
            <div className="action-btn">
              <Icons.Bell />
              <span className="badge">99+</span>
            </div>
            <div className="action-btn" onClick={onLogout}>
              <Icons.Logout />
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
