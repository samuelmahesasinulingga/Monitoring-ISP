import React, { useEffect, useState } from "react";
import AdminWorkspaceDashboard from "./components/admin-workspace/AdminWorkspaceDashboard";
import LoginPage from "./components/LoginPage";
import CustomerPortal from "./components/CustomerPortal";

type Workspace = {
  id: number;
  name: string;
  address: string;
  iconUrl?: string;
};

type ViewMode = "login" | "workspace" | "customer";

type AuthInfo = {
  email: string;
  role: string;
  workspaceId?: number | null;
  workspaceName?: string | null;
  workspaceAddress?: string | null;
  id?: number; // Added for customer ID
};

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "login";
    const stored = window.sessionStorage.getItem("viewMode");
    return stored === "workspace" ? "workspace" : "login";
  });

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("activeWorkspace");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Workspace;
    } catch {
      return null;
    }
  });

  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("authInfo");
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
    window.sessionStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeWorkspace) {
      window.sessionStorage.setItem("activeWorkspace", JSON.stringify(activeWorkspace));
    } else {
      window.sessionStorage.removeItem("activeWorkspace");
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authInfo) {
      window.sessionStorage.setItem("authInfo", JSON.stringify(authInfo));
    } else {
      window.sessionStorage.removeItem("authInfo");
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
          if (payload.role === "customer") {
            setViewMode("customer");
          } else {
            setActiveWorkspace({
              id: payload.workspaceId || 1,
              name: payload.workspaceName || "Main Workspace",
              address: payload.workspaceAddress || "",
              iconUrl: undefined,
            });
            setViewMode("workspace");
          }
        }}
      />
    );
  } else if (viewMode === "customer") {
    content = (
      <CustomerPortal
        customerId={authInfo?.id || 0}
        onLogout={() => setShowLogoutConfirm(true)}
      />
    );
  } else {
    content = (
      <AdminWorkspaceDashboard
        workspaceName={activeWorkspace?.name}
        workspaceId={activeWorkspace?.id}
        onLogout={() => setShowLogoutConfirm(true)}
        currentUserEmail={authInfo?.email}
        currentUserRole={authInfo?.role}
      />
    );
  }

  return (
    <>
      {content}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-[var(--card-main-bg)] text-[var(--text-main-primary)] rounded-2xl shadow-2xl border border-[var(--border-main)] p-5 animate-[fadeIn_0.18s_ease-out]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 text-xl">
                !
              </div>
              <div>
                <h2 className="m-0 text-sm font-semibold">Konfirmasi Logout</h2>
                <p className="m-0 mt-0.5 text-[11px] text-[var(--text-main-secondary)]">
                  Apakah Anda yakin ingin keluar dari sesi ini?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[11px] text-[var(--text-main-secondary)] hover:opacity-80 cursor-pointer"
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
