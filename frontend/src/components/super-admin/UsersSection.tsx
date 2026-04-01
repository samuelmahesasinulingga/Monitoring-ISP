import React, { useState } from "react";

type User = {
  id: number;
  fullName: string;
  email: string;
  whatsapp: string;
  role: string;
  workspaceId: number | null;
};

type UsersSectionProps = {
  workspaces: { id: number; name: string; address: string }[];
  roles: { id: number; name: string; description: string }[];
};

const UsersSection: React.FC<UsersSectionProps> = ({ workspaces, roles }) => {
  const [users, setUsers] = useState<User[]>(() => [
    {
      id: 1,
      fullName: "Super Admin Default",
      email: "admin@isp.co.id",
      whatsapp: "0812-0000-0000",
      role: roles[0]?.name ?? "Super Admin",
      workspaceId: workspaces[0]?.id ?? null,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(
    roles[1]?.name || roles[0]?.name || "Admin Workspace"
  );
  const [workspaceId, setWorkspaceId] = useState<string>(
    workspaces[0] ? String(workspaces[0].id) : ""
  );
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setWhatsapp("");
    setPassword("");
    setRole("Admin Workspace");
    setWorkspaceId(workspaces[0] ? String(workspaces[0].id) : "");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !fullName.trim() ||
      !email.trim() ||
      !whatsapp.trim() ||
      !password.trim() ||
      !workspaceId
    ) {
      return;
    }

    if (editingId == null) {
      // tambah user baru
      setUsers((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          fullName: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          role,
          workspaceId: parseInt(workspaceId, 10),
        },
      ]);
    } else {
      // update user yang sedang di-edit
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? {
                ...u,
                fullName: fullName.trim(),
                email: email.trim(),
                whatsapp: whatsapp.trim(),
                role,
                workspaceId: parseInt(workspaceId, 10),
              }
            : u
        )
      );
    }

    resetForm();
    setEditingId(null);
    setShowModal(false);
  };

  const handleChangeRoleInline = (id: number, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
  };

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setFullName(user.fullName);
    setEmail(user.email);
    setWhatsapp(user.whatsapp);
    setPassword("");
    setRole(user.role);
    setWorkspaceId(user.workspaceId != null ? String(user.workspaceId) : "");
    setShowModal(true);
  };

  const handleDeleteUser = (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const getWorkspaceName = (id: number | null) => {
    if (!id) return "-";
    const ws = workspaces.find((w) => w.id === id);
    return ws ? ws.name : "-";
  };

  const totalUsers = users.length;
  const userCountByRole = roles.map((r) => ({
    roleName: r.name,
    count: users.filter((u) => u.role === r.name).length,
  }));

  const filteredUsers =
    roleFilter === "ALL"
      ? users
      : users.filter((u) => u.role === roleFilter);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 8 }}>
      <header
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 4,
            }}
          >
            Pengguna
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Kelola akun pengguna yang memiliki akses ke sistem ISP Anda.
          </p>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            <span>
              Total: <strong>{totalUsers}</strong>
            </span>
            {userCountByRole.map((item) => (
              <span key={item.roleName}>
                | {item.roleName}: <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Tambah Pengguna
        </button>
      </header>

      <div
        style={{
          borderRadius: 16,
          background: "rgba(255,255,255,0.95)",
          border: "1px solid #e5e7eb",
          boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead style={{ background: "#f3f4f6" }}>
            <tr style={{ color: "#6b7280", textAlign: "left" }}>
              <th style={{ padding: "10px 10px" }}>Nama Lengkap</th>
              <th style={{ padding: "10px 10px" }}>Email</th>
              <th style={{ padding: "10px 10px" }}>No. WhatsApp</th>
              <th style={{ padding: "10px 10px" }}>Workspace</th>
              <th style={{ padding: "10px 10px" }}>Role</th>
              <th style={{ padding: "10px 10px", width: 130 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  {user.fullName}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#4b5563",
                  }}
                >
                  {user.email}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#4b5563",
                  }}
                >
                  {user.whatsapp}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#4b5563",
                  }}
                >
                  {getWorkspaceName(user.workspaceId)}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#374151",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor:
                          user.role === "Super Admin"
                            ? "#dbeafe"
                            : "#d1fae5",
                        color:
                          user.role === "Super Admin"
                            ? "#1d4ed8"
                            : "#047857",
                        border:
                          user.role === "Super Admin"
                            ? "1px solid #bfdbfe"
                            : "1px solid #bbf7d0",
                      }}
                    >
                      {user.role}
                    </span>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleChangeRoleInline(user.id, e.target.value)
                      }
                      style={{
                        width: "100%",
                        height: 28,
                        padding: "0 8px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        fontSize: 11,
                        boxSizing: "border-box",
                        background: "#ffffff",
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(user)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      fontSize: 11,
                      cursor: "pointer",
                      marginRight: 6,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  {roleFilter === "ALL"
                    ? "Belum ada pengguna terdaftar."
                    : "Belum ada pengguna dengan role ini."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#ffffff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 24px 70px rgba(15,23,42,0.35)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                marginBottom: 16,
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: 10,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {editingId == null ? "Tambah Pengguna" : "Edit Pengguna"}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                Isi data lengkap pengguna, lalu simpan.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Nama Lengkap
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@isp.co.id"
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Nomor WhatsApp
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                    background: "#ffffff",
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Workspace
                </label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                    background: "#ffffff",
                  }}
                >
                  <option value="">Pilih Workspace</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
