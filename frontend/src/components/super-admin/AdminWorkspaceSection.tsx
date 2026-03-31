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
    <section
      style={{
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        padding: 16,
        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, marginBottom: 4 }}>
            Manajemen Workspace
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
            Kelola daftar workspace / lokasi operasional ISP Anda.
          </p>
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
                    boxSizing: "border-box",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Tambah Workspace
        </button>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr style={{ color: "#6b7280", textAlign: "left" }}>
              <th style={{ padding: "8px 6px", width: 56 }}>Icon</th>
              <th style={{ padding: "8px 6px" }}>Nama Workspace</th>
              <th style={{ padding: "8px 6px" }}>Alamat</th>
              <th style={{ padding: "8px 6px", width: 220 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((workspace) => (
              <tr key={workspace.id}>
                <td
                  style={{
                    padding: "8px 6px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      overflow: "hidden",
                      background:
                        "linear-gradient(135deg, #2563eb, #4f46e5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {(workspace as any).iconUrl ? (
                      <img
                        src={(workspace as any).iconUrl}
                        alt="Icon workspace"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span>
                        {workspace.name
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderTop: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  {workspace.name}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#4b5563",
                  }}
                >
                  {workspace.address}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openMemberModal(workspace.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      fontSize: 11,
                      cursor: "pointer",
                      marginRight: 6,
                    }}
                  >
                    Kelola Anggota
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(workspace)}
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
                    onClick={() => handleDeleteWorkspace(workspace.id)}
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
              maxWidth: 460,
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
                {editingId == null ? "Tambah Workspace" : "Edit Workspace"}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                Isi nama workspace dan alamat lengkapnya, lalu simpan.
              </p>
            </div>
            <form
              onSubmit={handleAddWorkspace}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  Nama Workspace
                </label>
                <input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Misal: POP Surabaya"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
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
                  Alamat Workspace
                </label>
                <textarea
                  value={newWorkspaceAddress}
                  onChange={(e) => setNewWorkspaceAddress(e.target.value)}
                  placeholder="Jl. Contoh Raya No. 123, Kota"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    resize: "vertical",
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
                  Icon Workspace (opsional)
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      overflow: "hidden",
                      background:
                        "linear-gradient(135deg, #2563eb, #4f46e5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {newWorkspaceIcon ? (
                      <img
                        src={newWorkspaceIcon}
                        alt="Preview icon"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
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
                    style={{ fontSize: 11 }}
                  />
                </div>
                <div
                  style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}
                >
                  Tidak wajib diisi, hanya untuk tampilan icon di daftar
                  workspace.
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  Simpan Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {memberModalWorkspaceId != null && (
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
                      Kelola Anggota Workspace
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      Workspace: <strong>{activeWorkspace?.name}</strong>
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 12,
                      alignItems: "center",
                    }}
                  >
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama atau email anggota"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      maxHeight: 260,
                      overflow: "auto",
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
                        <tr
                          style={{
                            color: "#6b7280",
                            textAlign: "left",
                          }}
                        >
                          <th style={{ padding: "6px 8px" }}>Nama</th>
                          <th style={{ padding: "6px 8px" }}>Email</th>
                          <th style={{ padding: "6px 8px", width: 140 }}>
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                color: "#9ca3af",
                              }}
                            >
                              Belum ada anggota untuk workspace ini.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((member) => (
                            <tr key={member.id}>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  borderTop: "1px solid #e5e7eb",
                                }}
                              >
                                {member.name}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  borderTop: "1px solid #e5e7eb",
                                  color: "#4b5563",
                                }}
                              >
                                {member.email}
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  borderTop: "1px solid #e5e7eb",
                                }}
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
                                  style={{
                                    padding: "4px 6px",
                                    borderRadius: 999,
                                    border: "1px solid #e5e7eb",
                                    fontSize: 11,
                                    boxSizing: "border-box",
                                  }}
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
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: "#9ca3af" }}
                    >
                      Perubahan akses ini masih dummy (belum tersimpan ke
                      backend).
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setMemberModalWorkspaceId(null)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberModalWorkspaceId(null)}
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
