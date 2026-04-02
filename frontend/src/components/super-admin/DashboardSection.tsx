import React from "react";

const DashboardSection: React.FC = () => {
  const totalWorkspace = 4; // ganti dengan data nyata nanti
  const totalUsers = 1280; // ganti dengan data nyata nanti

  return (
    <section className="max-w-3xl mx-auto p-2">
      <header className="mb-6">
        <h1 className="m-0 mb-1 text-2xl font-bold text-slate-900">
          Ringkasan Dashboard
        </h1>
        <p className="m-0 text-[13px] text-slate-500">
          Gambaran singkat jumlah workspace dan total pengguna ISP.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-400/10 to-indigo-500/20 border border-blue-500/30 shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-blue-700">
              Total Workspace
            </span>
            <span className="text-xl">🏢</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {totalWorkspace}
          </div>
          <p className="m-0 mt-1.5 text-[11px] text-slate-500">
            Jumlah workspace.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-400/10 via-teal-400/10 to-teal-500/20 border border-emerald-400/30 shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-emerald-700">
              Total Pengguna
            </span>
            <span className="text-xl">👤</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {totalUsers}
          </div>
          <p className="m-0 mt-1.5 text-[11px] text-slate-500">
            Jumlah pengguna.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardSection;
