import React, { useState } from "react";

type Workspace = {
  id: number;
  name: string;
  address: string;
};

type WorkspaceMember = {
  id: number;
  name: string;
  email: string;
  role: "Admin Workspace" | "Teknisi" | "Viewer";
};

type AdminWorkspaceSectionProps = {
  workspaces: Workspace[];
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
};

const AdminWorkspaceSection: React.FC<AdminWorkspaceSectionProps> = ({
  workspaces,
  setWorkspaces,
}) => {

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceAddress, setNewWorkspaceAddress] = useState("");
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState<string | undefined>(
    undefined
  );

  const [memberModalWorkspaceId, setMemberModalWorkspaceId] = useState<number | null>(null);
  const [membersByWorkspace, setMembersByWorkspace] = useState<Record<number, WorkspaceMember[]>>({});
  const [memberSearch, setMemberSearch] = useState("");

  const handleAddWorkspace = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !newWorkspaceAddress.trim()) return;

    if (editingId == null) {
      // Tambah workspace baru
      setWorkspaces((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          name: newWorkspaceName.trim(),
          address: newWorkspaceAddress.trim(),
          iconUrl: newWorkspaceIcon,
        },
      ]);
    } else {
      // Update workspace yang sedang di-edit
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === editingId
            ? {
                ...ws,
                name: newWorkspaceName.trim(),
                address: newWorkspaceAddress.trim(),
                iconUrl: newWorkspaceIcon,
              }
            : ws
        )
      );
    }

    setNewWorkspaceName("");
    setNewWorkspaceAddress("");
    setNewWorkspaceIcon(undefined);
    setEditingId(null);
    setShowModal(false);
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewWorkspaceName("");
    setNewWorkspaceAddress("");
    setNewWorkspaceIcon(undefined);
    setShowModal(true);
  };

  const openEditModal = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setNewWorkspaceName(workspace.name);
    setNewWorkspaceAddress(workspace.address);
    setNewWorkspaceIcon((workspace as any).iconUrl);
    setShowModal(true);
  };

  const handleDeleteWorkspace = (id: number) => {
    setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
  };

  const handleWorkspaceIconChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewWorkspaceIcon(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const openMemberModal = (workspaceId: number) => {
    setMemberModalWorkspaceId(workspaceId);
    setMemberSearch("");
  };

  const handleChangeMemberRole = (
    workspaceId: number,
    memberId: number,
    role: WorkspaceMember["role"]
  ) => {
    setMembersByWorkspace((prev) => {
      const current = prev[workspaceId] ?? [];
      return {
        ...prev,
        [workspaceId]: current.map((m) =>
          m.id === memberId ? { ...m, role } : m
        ),
      };
    });
  };

  return (
    <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-lg shadow-slate-900/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="m-0 mb-1 text-lg font-semibold text-slate-900">Manajemen Workspace</h1>
          <p className="m-0 text-xs text-slate-500">
            Kelola daftar workspace / lokasi operasional ISP Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-3 py-2 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer box-border shadow-sm"
        >
          + Tambah Workspace
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden mt-2">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-slate-100/80">
            <tr className="text-slate-500 text-left">
              <th className="py-2 px-1.5 w-14">Icon</th>
              <th className="py-2 px-1.5">Nama Workspace</th>
              <th className="py-2 px-1.5">Alamat</th>
              <th className="py-2 px-1.5 w-56">Action</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((workspace) => (
              <tr key={workspace.id}>
                <td className="py-2 px-1.5 border-t border-slate-200">
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[12px] font-semibold">
                    {(workspace as any).iconUrl ? (
                      <img
                        src={(workspace as any).iconUrl}
                        alt="Icon workspace"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{workspace.name.trim().charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-1.5 border-t border-slate-200 font-medium text-slate-900">
                  {workspace.name}
                </td>
                <td className="py-2 px-1.5 border-t border-slate-200 text-slate-600">
                  {workspace.address}
                </td>
                <td className="py-2 px-1.5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => openMemberModal(workspace.id)}
                    className="px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] cursor-pointer mr-1.5 hover:bg-slate-100"
                  >
                    Kelola Anggota
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(workspace)}
                    className="px-2.5 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] cursor-pointer mr-1.5 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkspace(workspace.id)}
                    className="px-2.5 py-1.5 rounded-full border-0 bg-red-500 hover:bg-red-600 text-white text-[11px] cursor-pointer"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
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
                {editingId == null ? "Tambah Workspace" : "Edit Workspace"}
              </h2>
              <p className="m-0 text-xs text-slate-500">
                Isi nama workspace dan alamat lengkapnya, lalu simpan.
              </p>
            </div>
            <form
              onSubmit={handleAddWorkspace}
              className="flex flex-col gap-3"
            >
              <div>
                <label
                  className="block text-[11px] text-slate-600 mb-1"
                >
                  Nama Workspace
                </label>
                <input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Misal: POP Surabaya"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
                />
              </div>
              <div>
                <label
                  className="block text-[11px] text-slate-600 mb-1"
                >
                  Alamat Workspace
                </label>
                <textarea
                  value={newWorkspaceAddress}
                  onChange={(e) => setNewWorkspaceAddress(e.target.value)}
                  placeholder="Jl. Contoh Raya No. 123, Kota"
                  rows={3}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none resize-y focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
                />
              </div>
              <div>
                <label
                  className="block text-[11px] text-slate-600 mb-1"
                >
                  Icon Workspace (opsional)
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[12px] font-semibold">
                    {newWorkspaceIcon ? (
                      <img
                        src={newWorkspaceIcon}
                        alt="Preview icon"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {newWorkspaceName.trim()
                          ? newWorkspaceName.trim().charAt(0).toUpperCase()
                          : "W"}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWorkspaceIconChange}
                    className="text-[11px]"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Tidak wajib diisi, hanya untuk tampilan icon di daftar
                  workspace.
                </div>
              </div>
              <div
                className="flex justify-end gap-2 mt-2"
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] cursor-pointer hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold cursor-pointer"
                >
                  Simpan Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {memberModalWorkspaceId != null && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50"
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl p-5 shadow-2xl border border-slate-200"
          >
            {(() => {
              const activeWorkspace = workspaces.find(
                (ws) => ws.id === memberModalWorkspaceId
              );
              const members = membersByWorkspace[memberModalWorkspaceId] ?? [];
              const filteredMembers = members.filter((m) => {
                if (!memberSearch.trim()) return true;
                const q = memberSearch.toLowerCase();
                return (
                  m.name.toLowerCase().includes(q) ||
                  m.email.toLowerCase().includes(q)
                );
              });
              return (
                <>
                  <div
                    className="mb-4 pb-2.5 border-b border-slate-200"
                  >
                    <h2
                      className="m-0 mb-1 text-lg font-semibold text-slate-900"
                    >
                      Kelola Anggota Workspace
                    </h2>
                    <p
                      className="m-0 text-xs text-slate-500"
                    >
                      Workspace: <strong>{activeWorkspace?.name}</strong>
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 mb-3"
                  >
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama atau email anggota"
                      className="flex-1 px-3 py-1.5 rounded-full border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
                    />
                  </div>
                  <div
                    className="rounded-lg border border-slate-200 max-h-64 overflow-auto"
                  >
                    <table
                      className="w-full border-collapse text-[12px]"
                    >
                      <thead className="bg-slate-100/80">
                        <tr
                          className="text-slate-500 text-left"
                        >
                          <th className="py-1.5 px-2">Nama</th>
                          <th className="py-1.5 px-2">Email</th>
                          <th className="py-1.5 px-2 w-36">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-3 px-2 text-center text-slate-400 text-[11px]"
                            >
                              Belum ada anggota untuk workspace ini.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((member) => (
                            <tr key={member.id}>
                              <td
                                className="py-1.5 px-2 border-t border-slate-200"
                              >
                                {member.name}
                              </td>
                              <td
                                className="py-1.5 px-2 border-t border-slate-200 text-slate-600"
                              >
                                {member.email}
                              </td>
                              <td
                                className="py-1.5 px-2 border-t border-slate-200"
                              >
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleChangeMemberRole(
                                      memberModalWorkspaceId,
                                      member.id,
                                      e.target
                                        .value as WorkspaceMember["role"]
                                    )
                                  }
                                  className="px-2 py-1 rounded-full border border-slate-200 text-[11px] outline-none bg-white"
                                >
                                  <option value="Admin Workspace">
                                    Admin Workspace
                                  </option>
                                  <option value="Teknisi">Teknisi</option>
                                  <option value="Viewer">Viewer</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="flex items-center justify-between mt-3"
                  >
                    <span
                      className="text-[11px] text-slate-400"
                    >
                      Perubahan akses ini masih dummy (belum tersimpan ke
                      backend).
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMemberModalWorkspaceId(null)}
                        className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] cursor-pointer hover:bg-slate-50"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberModalWorkspaceId(null)}
                        className="px-3.5 py-1.5 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold cursor-pointer"
                      >
                        Simpan Akses
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminWorkspaceSection;
