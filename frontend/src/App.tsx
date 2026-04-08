import React, { useEffect, useState } from "react";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import AdminWorkspaceDashboard from "./components/admin-workspace/AdminWorkspaceDashboard";
import LoginPage from "./components/LoginPage";

type Workspace = {
  id: number;
  name: string;
  address: string;
  iconUrl?: string;
};

type ViewMode = "login" | "superAdmin" | "workspace";

type AuthInfo = {
  email: string;
  role: string;
  workspaceId?: number | null;
  workspaceName?: string | null;
  workspaceAddress?: string | null;
};

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "login";
    const stored = window.localStorage.getItem("viewMode");
    return stored === "superAdmin" || stored === "workspace" ? (stored as ViewMode) : "login";
  });

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("activeWorkspace");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Workspace;
    } catch {
      return null;
    }
  });

  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("authInfo");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthInfo;
    } catch {
      return null;
    }
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeWorkspace) {
      window.localStorage.setItem("activeWorkspace", JSON.stringify(activeWorkspace));
    } else {
      window.localStorage.removeItem("activeWorkspace");
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authInfo) {
      window.localStorage.setItem("authInfo", JSON.stringify(authInfo));
    } else {
      window.localStorage.removeItem("authInfo");
    }
  }, [authInfo]);
  const performLogout = () => {
    setActiveWorkspace(null);
    setAuthInfo(null);
    setViewMode("login");
    setShowLogoutConfirm(false);
  };

  let content: JSX.Element;

  if (viewMode === "login") {
    content = (
      <LoginPage
		onLoginSuccess={(payload) => {
		  setAuthInfo(payload);
		  if (payload.role === "super_admin") {
			setViewMode("superAdmin");
			setActiveWorkspace(null);
		  } else {
			// Admin Workspace: langsung ke workspace yang dimiliki
			if (payload.workspaceId) {
			  setActiveWorkspace({
				id: payload.workspaceId,
				name: payload.workspaceName || "Workspace",
				address: payload.workspaceAddress || "",
				iconUrl: undefined,
			  });
			} else {
			  setActiveWorkspace(null);
			}
			setViewMode("workspace");
		  }
		}}
      />
    );
  } else if (viewMode === "workspace") {
    const isSuperAdmin = authInfo?.role === "super_admin";
    content = (
      <AdminWorkspaceDashboard
        workspaceName={activeWorkspace?.name}
        onChangeWorkspace={
          isSuperAdmin
            ? (ws) => setActiveWorkspace(ws)
            : undefined
        }
        onBackToSuperAdmin={
          isSuperAdmin
            ? () => setViewMode("superAdmin")
            : undefined
        }
        onLogout={() => setShowLogoutConfirm(true)}
        currentUserEmail={authInfo?.email}
        currentUserRole={authInfo?.role}
      />
    );
  } else {
    content = (
      <SuperAdminDashboard
        onOpenWorkspace={(ws) => {
          setActiveWorkspace(ws);
          setViewMode("workspace");
        }}
        onLogout={() => setShowLogoutConfirm(true)}
      />
    );
  }

  return (
    <>
      {content}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 p-5 animate-[fadeIn_0.18s_ease-out]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 text-xl">
                !
              </div>
              <div>
                <h2 className="m-0 text-sm font-semibold">Konfirmasi Logout</h2>
                <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                  Apakah Anda yakin ingin keluar dari sesi ini?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={performLogout}
                className="px-3 py-1.5 rounded-full border-0 bg-red-500 hover:bg-red-600 text-[11px] text-white font-semibold cursor-pointer"
              >
                Ya, logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
