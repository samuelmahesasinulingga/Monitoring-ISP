import React from "react";

const DashboardSection: React.FC = () => {
  const totalWorkspace = 4; // ganti dengan data nyata nanti
  const totalUsers = 1280; // ganti dengan data nyata nanti

  return (
    <section className="max-w-3xl mx-auto p-2">
      <header className="mb-6">
        <h1 className="m-0 mb-1 text-2xl font-bold text-slate-100">
          Ringkasan Dashboard
        </h1>
        <p className="m-0 text-[13px] text-slate-400">
          Gambaran singkat jumlah workspace dan total pengguna ISP.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="p-5 rounded-2xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-blue-400">
              Total Workspace
            </span>
            <span className="text-xl">🏢</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {totalWorkspace}
          </div>
          <p className="m-0 mt-1.5 text-[11px] text-slate-400">
            Jumlah workspace.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-emerald-400">
              Total Pengguna
            </span>
            <span className="text-xl">👤</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {totalUsers}
          </div>
          <p className="m-0 mt-1.5 text-[11px] text-slate-400">
            Jumlah pengguna.
          </p>
        </div>
      </div>

    </section>
  );
};

export default DashboardSection;
