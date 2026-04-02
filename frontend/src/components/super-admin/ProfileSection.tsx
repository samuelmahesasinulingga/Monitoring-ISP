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
    <section className="max-w-xl mx-auto p-2">
      <header className="mb-5">
        <h1 className="m-0 mb-1 text-2xl font-bold text-slate-900">
          Profil Super Admin
        </h1>
        <p className="m-0 text-[13px] text-slate-500">
          Ubah informasi dasar akun super admin Anda.
        </p>
      </header>

      <div className="bg-white/95 rounded-xl p-5 border border-slate-200 shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Foto profil"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>SA</span>
            )}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-0.5">
              {profile.name || "Super Admin"}
            </div>
            <div className="text-[12px] text-slate-500">{profile.email}</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3"
        >
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">
              Nama Lengkap
            </label>
            <input
              value={profile.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Nama Super Admin"
              className="w-full h-9 px-3.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="admin@isp.co.id"
              className="w-full h-9 px-3.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 mb-1">
              Nomor WhatsApp
            </label>
            <input
              value={profile.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="0812-0000-0000"
              className="w-full h-9 px-3.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 mb-1">
              Foto Profil
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="text-[11px]"
            />
            <div className="mt-1 text-[10px] text-slate-400">
              Hanya untuk preview di frontend (belum tersimpan ke server).
            </div>
          </div>

          <div
            className="flex items-center justify-between mt-2"
          >
            <span className="text-[11px] text-slate-400">
              Perubahan disimpan di sisi frontend (dummy, belum ke backend).
            </span>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold cursor-pointer"
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
