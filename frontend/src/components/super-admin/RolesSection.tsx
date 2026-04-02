import React, { useState } from "react";

export type PermissionKey =
  | "view_dashboard"
  | "manage_workspaces"
  | "manage_users"
  | "manage_roles"
  | "view_monitoring"
  | "view_sla_reports"
  | "manage_billing";

export type RoleDefinition = {
  id: number;
  name: string;
  description: string;
  permissions?: PermissionKey[];
};

type RolesSectionProps = {
  roles: RoleDefinition[];
  setRoles: React.Dispatch<React.SetStateAction<RoleDefinition[]>>;
};

const ALL_PERMISSIONS: { key: PermissionKey; label: string; description: string }[] = [
  {
    key: "view_dashboard",
    label: "Lihat dashboard platform",
    description: "Bisa melihat ringkasan utama dan statistik global.",
  },
  {
    key: "manage_workspaces",
    label: "Kelola workspace",
    description: "Bisa menambah, edit, dan menonaktifkan workspace.",
  },
  {
    key: "manage_users",
    label: "Kelola pengguna",
    description: "Bisa menambah user baru, reset password, dan mengatur role.",
  },
  {
    key: "manage_roles",
    label: "Kelola role & hak akses",
    description: "Bisa membuat dan mengubah definisi role dan hak aksesnya.",
  },
  {
    key: "view_monitoring",
    label: "Lihat monitoring jaringan",
    description: "Bisa mengakses halaman monitoring ping, alert, dan bandwidth.",
  },
  {
    key: "view_sla_reports",
    label: "Lihat SLA & report",
    description: "Bisa melihat laporan SLA dan penggunaan bandwidth.",
  },
  {
    key: "manage_billing",
    label: "Kelola billing & invoice",
    description: "Bisa membuat dan mengirim invoice ke pelanggan.",
  },
];

const RolesSection: React.FC<RolesSectionProps> = ({ roles, setRoles }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPermissionSearch("");
    setSelectedPermissions([]);
  };

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (role: RoleDefinition) => {
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description);
    setPermissionSearch("");
    setSelectedPermissions(role.permissions ?? []);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId == null) {
      setRoles((prev) => [
        ...prev,
        {
          id: prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
          name: name.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
        },
      ]);
    } else {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: name.trim(),
                description: description.trim(),
                permissions: selectedPermissions,
              }
            : r
        )
      );
    }

    resetForm();
    setEditingId(null);
    setShowModal(false);
  };

  const handleDeleteRole = (id: number) => {
    // Proteksi agar role Super Admin (id 1) tidak terhapus tidak sengaja
    if (id === 1) {
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto p-2">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Role & Akses
          </h1>
          <p className="text-[13px] text-slate-500 m-0">
            Atur jenis role dan deskripsi akses yang tersedia di platform.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-3 py-2 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
        >
          + Tambah Role
        </button>
      </header>

      <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-xl shadow-slate-900/10 overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-slate-100/80">
            <tr className="text-slate-500 text-left">
              <th className="py-2.5 px-2 w-20">ID</th>
              <th className="py-2.5 px-2 w-56">Nama Role</th>
              <th className="py-2.5 px-2">Deskripsi</th>
              <th className="py-2.5 px-2 w-32">Action</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="py-2.5 px-2 border-t border-slate-200 text-slate-500">
                  #{role.id}
                </td>
                <td className="py-2.5 px-2 border-t border-slate-200 font-semibold text-slate-900">
                  {role.name}
                </td>
                <td className="py-2.5 px-2 border-t border-slate-200 text-slate-600">
                  {role.description || "-"}
                </td>
                <td className="py-2.5 px-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => openEditModal(role)}
                    className="px-2.5 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] cursor-pointer mr-1.5 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(role.id)}
                    className={`px-2.5 py-1.5 rounded-full border-0 text-[11px] ${
                      role.id === 1
                        ? "bg-slate-200 text-slate-500 cursor-default"
                        : "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                    }`}
                    disabled={role.id === 1}
                  >
                    {role.id === 1 ? "Default" : "Hapus"}
                  </button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 px-4 text-center text-slate-400 text-[11px]"
                >
                  Belum ada role terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200"
          >
            <div
              className="mb-4 pb-2.5 border-b border-slate-200"
            >
              <h2
                className="m-0 mb-1 text-lg font-semibold text-slate-900"
              >
                {editingId == null ? "Tambah Role" : "Edit Role"}
              </h2>
              <p className="m-0 text-xs text-slate-500">
                Tentukan nama role dan deskripsi singkat hak aksesnya.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
            >
              <div>
                <label
                  className="block text-[11px] text-slate-600 mb-1"
                >
                  Nama Role
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: NOC Engineer, Billing, Support"
                  className="w-full h-9 px-3.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label
                  className="block text-[11px] text-slate-600 mb-1"
                >
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Dapat melihat monitoring dan SLA di workspace tertentu."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-[12px] bg-white outline-none resize-y focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Hak akses untuk role ini
                </label>
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder="Cari hak akses (misal: monitoring, billing)"
                    className="flex-1 h-8 px-3 rounded-full border border-slate-200 text-[11px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                  />
                  <span className="text-[11px] text-slate-400">
                    {selectedPermissions.length} dipilih
                  </span>
                </div>

                <div className="max-h-40 overflow-auto rounded-xl border border-slate-100 bg-slate-50/60 p-2 space-y-1.5">
                  {ALL_PERMISSIONS.filter((p) => {
                    const q = permissionSearch.toLowerCase();
                    if (!q) return true;
                    return (
                      p.label.toLowerCase().includes(q) ||
                      p.description.toLowerCase().includes(q)
                    );
                  }).map((perm) => {
                    const active = selectedPermissions.includes(perm.key);
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 bg-white"
                      >
                        <div>
                          <div className="text-[11px] font-semibold text-slate-800">
                            {perm.label}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {perm.description}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPermissions((prev) =>
                              prev.includes(perm.key)
                                ? prev.filter((k) => k !== perm.key)
                                : [...prev, perm.key]
                            );
                          }}
                          className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-0 bg-transparent p-0 align-middle"
                        >
                          <span className="sr-only">Toggle permission</span>
                          <span
                            className={`inline-flex h-4 w-8 items-center rounded-full transition-colors duration-150 ${
                              active ? "bg-emerald-500" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-150 ${
                                active ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="flex justify-end gap-2 mt-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] cursor-pointer hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold cursor-pointer"
                >
                  Simpan Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesSection;
