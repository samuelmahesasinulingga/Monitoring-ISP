import React, { useState } from "react";
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

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null
  );

  if (viewMode === "login") {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setViewMode("superAdmin");
        }}
      />
    );
  }

  if (viewMode === "workspace") {
    return (
      <AdminWorkspaceDashboard
        workspaceName={activeWorkspace?.name}
        onChangeWorkspaceName={(name: string) =>
          setActiveWorkspace((prev) =>
            prev
              ? { ...prev, name }
              : { id: 0, name, address: "", iconUrl: "" }
          )
        }
        onBackToSuperAdmin={() => setViewMode("superAdmin")}
      />
    );
  }

  return (
    <SuperAdminDashboard
      onOpenWorkspace={(ws) => {
        setActiveWorkspace(ws);
        setViewMode("workspace");
      }}
      onLogout={() => {
        setActiveWorkspace(null);
        setViewMode("login");
      }}
    />
  );
}

export default App;
