import React, { useState } from "react";

export type RoleDefinition = {
  id: number;
  name: string;
  description: string;
};

type RolesSectionProps = {
  roles: RoleDefinition[];
  setRoles: React.Dispatch<React.SetStateAction<RoleDefinition[]>>;
};

const RolesSection: React.FC<RolesSectionProps> = ({ roles, setRoles }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
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
        },
      ]);
    } else {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, name: name.trim(), description: description.trim() }
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
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 8 }}>
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
            Role & Akses
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Atur jenis role dan deskripsi akses yang tersedia di platform.
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
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Tambah Role
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
              <th style={{ padding: "10px 10px", width: 80 }}>ID</th>
              <th style={{ padding: "10px 10px", width: 220 }}>Nama Role</th>
              <th style={{ padding: "10px 10px" }}>Deskripsi</th>
              <th style={{ padding: "10px 10px", width: 130 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#6b7280",
                  }}
                >
                  #{role.id}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {role.name}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                    color: "#4b5563",
                  }}
                >
                  {role.description || "-"}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(role)}
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
                    onClick={() => handleDeleteRole(role.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      background: role.id === 1 ? "#e5e7eb" : "#ef4444",
                      color: role.id === 1 ? "#6b7280" : "#ffffff",
                      fontSize: 11,
                      cursor: role.id === 1 ? "default" : "pointer",
                    }}
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
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
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
              maxWidth: 480,
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
                {editingId == null ? "Tambah Role" : "Edit Role"}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                Tentukan nama role dan deskripsi singkat hak aksesnya.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
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
                  Nama Role
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: NOC Engineer, Billing, Support"
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
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Dapat melihat monitoring dan SLA di workspace tertentu."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
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
