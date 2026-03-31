import React from "react";

export type SuperAdminProfile = {
  name: string;
  email: string;
  whatsapp: string;
  avatarUrl?: string;
};

type ProfileSectionProps = {
  profile: SuperAdminProfile;
  setProfile: React.Dispatch<React.SetStateAction<SuperAdminProfile>>;
};

const ProfileSection: React.FC<ProfileSectionProps> = ({ profile, setProfile }) => {
  const handleChange = (
    key: keyof SuperAdminProfile,
    value: string
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfile((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <section
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 8,
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 24,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Profil Super Admin
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Ubah informasi dasar akun super admin Anda.
        </p>
      </header>

      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: 12,
          padding: 20,
          border: "1px solid #e5e7eb",
          boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              overflow: "hidden",
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Foto profil"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>SA</span>
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 2,
              }}
            >
              {profile.name || "Super Admin"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{profile.email}</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}
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
              Nama Lengkap
            </label>
            <input
              value={profile.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Nama Super Admin"
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
              value={profile.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="admin@isp.co.id"
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
              value={profile.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="0812-0000-0000"
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
              Foto Profil
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{
                fontSize: 11,
              }}
            />
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
              Hanya untuk preview di frontend (belum tersimpan ke server).
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              Perubahan disimpan di sisi frontend (dummy, belum ke backend).
            </span>
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
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ProfileSection;
