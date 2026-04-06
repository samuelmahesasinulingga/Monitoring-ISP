import React, { useEffect, useState } from "react";

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
  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];
  const safeRoles = Array.isArray(roles) ? roles : [];

  const [users, setUsers] = useState<User[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("Admin Workspace");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const [alert, setAlert] = useState<
    | null
    | {
        type: "success" | "error";
        message: string;
      }
  >(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${apiBase}/api/users`);
        if (!res.ok) {
          console.error("failed to load users", await res.text());
          return;
        }
        const data: User[] = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("load users error", err);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!role && safeRoles.length > 0) {
      setRole(safeRoles[1]?.name || safeRoles[0]?.name || "Admin Workspace");
    }

    if (!workspaceId && safeWorkspaces.length > 0) {
      setWorkspaceId(String(safeWorkspaces[0].id));
    }
  }, [role, workspaceId, safeRoles, safeWorkspaces]);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 3000);
    return () => clearTimeout(timer);
  }, [alert]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setWhatsapp("");
    setPassword("");
    setRole("Admin Workspace");
    setWorkspaceId("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    if (editingId == null) {
      try {
        const payload = {
          fullName: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          password: password.trim(),
          role,
          workspaceId: parseInt(workspaceId, 10),
        };

        const res = await fetch(`${apiBase}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.error("failed to create user", await res.text());
          setAlert({ type: "error", message: "Gagal menambahkan pengguna." });
        } else {
          const created: User = await res.json();
          setUsers((prev) => [...prev, created]);
          setAlert({ type: "success", message: "Pengguna berhasil ditambahkan." });
        }
      } catch (err) {
        console.error("create user error", err);
        setAlert({ type: "error", message: "Terjadi error saat menambahkan pengguna." });
      }
    } else {
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
      setAlert({ type: "success", message: "Perubahan pengguna berhasil disimpan." });
    }

    resetForm();
    setEditingId(null);
    setShowModal(false);
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

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBase}/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 404) {
        console.error("failed to delete user", await res.text());
        setAlert({ type: "error", message: "Gagal menghapus pengguna." });
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setAlert({ type: "success", message: "Pengguna berhasil dihapus." });
      setDeleteTarget(null);
    } catch (err) {
      console.error("delete user error", err);
      setAlert({ type: "error", message: "Terjadi error saat menghapus pengguna." });
    } finally {
      setIsDeleting(false);
    }
  };

  const getWorkspaceName = (id: number | null) => {
    if (!id) return "-";
    const ws = safeWorkspaces.find((w) => w.id === id);
    return ws ? ws.name : "-";
  };

  const totalUsers = users.length;
  const userCountByRole = safeRoles.map((r) => ({
    roleName: r.name,
    count: users.filter((u) => u.role === r.name).length,
  }));

  const filteredUsers =
    roleFilter === "ALL" ? users : users.filter((u) => u.role === roleFilter);

  return (
    <div className="max-w-5xl mx-auto p-2">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[24px] font-bold text-slate-900">
            Pengguna
          </h1>
          <p className="m-0 text-[13px] text-slate-500">
            Kelola akun pengguna yang memiliki akses ke sistem ISP Anda.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>
              Total: <span className="font-semibold text-slate-900">{totalUsers}</span>
            </span>
            {userCountByRole.map((item) => (
              <span key={item.roleName}>
                | {item.roleName}: <span className="font-semibold text-slate-900">{item.count}</span>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-3.5 py-2 rounded-full border-0 bg-blue-600 text-white text-[12px] font-semibold shadow-sm hover:bg-blue-700 transition-colors"
        >
          + Tambah Pengguna
        </button>
      </header>

      <div className="mt-4 rounded-2xl bg-white/95 border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-slate-100">
            <tr className="text-left text-slate-500">
              <th className="px-3 py-2.5 font-medium">Nama Lengkap</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">No. WhatsApp</th>
              <th className="px-3 py-2.5 font-medium">Workspace</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium w-[130px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 border-t border-slate-200 font-medium text-slate-900">
                  {user.fullName}
                </td>
                <td className="px-3 py-2.5 border-t border-slate-200 text-slate-600">
                  {user.email}
                </td>
                <td className="px-3 py-2.5 border-t border-slate-200 text-slate-600">
                  {user.whatsapp}
                </td>
                <td className="px-3 py-2.5 border-t border-slate-200 text-slate-600">
                  {getWorkspaceName(user.workspaceId)}
                </td>
                <td className="px-3 py-2.5 border-t border-slate-200 text-slate-700">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      user.role === "Super Admin"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-3 py-2.5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => openEditModal(user)}
                    className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] text-slate-700 hover:bg-slate-50 mr-1.5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(user)}
                    className="px-2.5 py-1 rounded-full border-0 bg-red-500 text-white text-[11px] hover:bg-red-600"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-[12px] text-slate-400">
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl shadow-slate-900/50 border border-slate-200">
            <div className="mb-4 border-b border-slate-200 pb-3">
              <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
                {editingId == null ? "Tambah Pengguna" : "Edit Pengguna"}
              </h2>
              <p className="m-0 text-[12px] text-slate-500">
                Isi data lengkap pengguna, lalu simpan.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid gap-3 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-600 mb-1">
                  Nama Lengkap
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@isp.co.id"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                >
                  {safeRoles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Workspace
                </label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                >
                  <option value="">Pilih Workspace</option>
                  {safeWorkspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-full border-0 bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 transform transition-all duration-200">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 text-sm animate-pulse">
                !
              </div>
              <div>
                <h2 className="m-0 text-[14px] font-semibold text-slate-900">
                  Hapus pengguna?
                </h2>
                <p className="m-0 mt-0.5 text-[11px] text-slate-500">
                  Pengguna <strong>{deleteTarget.fullName}</strong> dengan email {" "}
                  <span className="font-mono text-[11px]">{deleteTarget.email}</span> akan dihapus.
                </p>
              </div>
            </div>
            <p className="m-0 mb-3 text-[11px] text-slate-500">
              Apakah Anda yakin ingin menghapus pengguna ini?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] cursor-pointer hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-full border-0 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Menghapus..." : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alert && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50">
          <div
            className={`w-full max-w-sm rounded-2xl border px-4 py-3 text-[11px] shadow-2xl backdrop-blur-sm transform transition-all duration-200 ${
              alert.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : "bg-red-50/95 border-red-200 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold animate-pulse ${
                  alert.type === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {alert.type === "success" ? "✔" : "⚠"}
              </div>
              <div>
                <p className="m-0 text-[12px] font-semibold">
                  {alert.type === "success" ? "Berhasil" : "Terjadi kesalahan"}
                </p>
                <p className="m-0 mt-0.5 text-[11px]">{alert.message}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setAlert(null)}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
