import React, { useState } from "react";

type SettingsTabKey = "company" | "workspace";

type CompanyProfile = {
  name: string;
  email: string;
  phone: string;
  domain: string;
};

type WorkspaceLimit = {
  defaultUserLimit: number;
};

const SettingsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("company");

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: "",
    email: "",
    phone: "",
    domain: "",
  });

  const [workspaceLimit, setWorkspaceLimit] = useState<WorkspaceLimit>({
    defaultUserLimit: 50,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // TODO: Integrasikan dengan API backend ketika endpoint sudah tersedia.
    // Untuk sementara hanya log ke console.
    // eslint-disable-next-line no-console
    console.log("Saving settings", { companyProfile, workspaceLimit });
    setTimeout(() => {
      setSaving(false);
      // Nantinya bisa diganti dengan toast notifikasi sukses.
      // eslint-disable-next-line no-alert
      alert("Pengaturan berhasil disimpan (dummy)");
    }, 500);
  };

  const renderContent = () => {
    if (activeTab === "company") {
      return (
        <div className="grid gap-3">
          <div>
            <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-100">
              Profil Perusahaan
            </h2>
            <p className="m-0 text-[11px] text-slate-400">
              Informasi ini akan digunakan pada seluruh workspace dan tampilan portal.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid">
              <label className="text-[11px] font-medium text-slate-400 mb-1">
                Nama perusahaan
              </label>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[12px] outline-none bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
                placeholder="Contoh: PT. ISP Nusantara"
                value={companyProfile.name}
                onChange={(e) =>
                  setCompanyProfile((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5 md:grid-cols-[1.2fr_1fr]">
              <div className="grid">
                <label className="text-[11px] font-medium text-slate-400 mb-1">
                  Email utama
                </label>
                <input
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[12px] outline-none bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
                  type="email"
                  placeholder="noc@provider.co.id"
                  value={companyProfile.email}
                  onChange={(e) =>
                    setCompanyProfile((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="grid">
                <label className="text-[11px] font-medium text-slate-400 mb-1">
                  Nomor kontak
                </label>
                <input
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[12px] outline-none bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
                  placeholder="+62..."
                  value={companyProfile.phone}
                  onChange={(e) =>
                    setCompanyProfile((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid">
              <label className="text-[11px] font-medium text-slate-400 mb-1">
                Domain portal
              </label>
              <input
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[12px] outline-none bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
                placeholder="noc.provider.co.id"
                value={companyProfile.domain}
                onChange={(e) =>
                  setCompanyProfile((prev) => ({ ...prev, domain: e.target.value }))
                }
              />
              <span className="mt-1 text-[11px] text-slate-400">
                Domain yang digunakan user untuk mengakses portal monitoring.
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "workspace") {
      return (
        <div className="grid gap-3">
          <div>
            <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-100">
              Pengaturan Multi-Workspace
            </h2>
            <p className="m-0 text-[11px] text-slate-400">
              Atur limit default jumlah pengguna untuk setiap workspace.
            </p>
          </div>
          <div className="grid gap-2 max-w-xs">
            <label className="text-[11px] font-medium text-slate-400 mb-1">
              Limit user per workspace (default)
            </label>
            <input
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[12px] outline-none bg-slate-900/50 text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
              type="number"
              min={1}
              value={workspaceLimit.defaultUserLimit}
              onChange={(e) =>
                setWorkspaceLimit({ defaultUserLimit: Number(e.target.value) || 0 })
              }
            />
            <span className="mt-1 text-[11px] text-slate-400">
              Nilai ini dapat di-override per workspace di halaman workspace admin.
            </span>
          </div>
        </div>
      );
    }

  };

  return (
    <section className="rounded-xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg border border-slate-800 p-4 shadow-lg shadow-black/20 grid gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-semibold text-slate-100">
            Pengaturan Super Admin
          </h1>
          <p className="m-0 text-[12px] text-slate-400">
            Fokus pada pengaturan organisasi & workspace terlebih dahulu.
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-full bg-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`px-2.5 py-1.5 rounded-full text-[12px] inline-flex items-center gap-1 border ${
            activeTab === "company"
              ? "bg-slate-900 text-slate-50 border-slate-900"
              : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800"
          }`}
       >
          Profil perusahaan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={`px-2.5 py-1.5 rounded-full text-[12px] inline-flex items-center gap-1 border ${
            activeTab === "workspace"
              ? "bg-slate-900 text-slate-50 border-slate-900"
              : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800"
          }`}
        >
          Multi-workspace
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 p-3 bg-slate-800/50">
        <div className="grid gap-3">
          {renderContent()}
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`px-3 py-1.5 rounded-full border-0 text-[12px] font-medium text-white ${
                saving
                  ? "bg-slate-400 cursor-default"
                  : "bg-slate-900 hover:bg-slate-800 cursor-pointer"
              }`}
            >
              {saving ? "Menyimpan..." : "Simpan pengaturan"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SettingsSection;
