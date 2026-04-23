import React, { useState, useEffect } from "react";

type WorkspaceDashboardSectionProps = {
  workspaceName?: string;
  workspaceId?: number;
};

const WorkspaceDashboardSection: React.FC<WorkspaceDashboardSectionProps> = ({
  workspaceName,
  workspaceId,
}) => {
  const [data, setData] = useState({
    activeCustomer: 0,
    activeTicket: 0,
    unpaidInvoice: 0,
    pingStatus: {
      overall: "UP" as "UP" | "DOWN",
      avgLatencyMs: 0,
      packetLoss: 0,
    },
    activeAlertCount: 0,
    slaThisMonth: 100,
    invoiceSentThisMonth: false,
    topInterfaces: [] as {name: string, usageMbps: number}[],
    topQueues: [] as {name: string, usageMbps: number}[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/dashboard-summary`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard summary:", err);
        setLoading(false);
      });
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 mt-12 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const {
    activeCustomer,
    activeTicket,
    unpaidInvoice,
    pingStatus,
    activeAlertCount,
    slaThisMonth,
    invoiceSentThisMonth,
    topInterfaces,
    topQueues,
  } = data;

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-bold text-slate-900">
          {workspaceName ?? "Ringkasan Workspace"}
        </h1>
        <p className="m-0 text-[13px] text-slate-500">
          Dashboard singkat aktivitas pelanggan, tiket, dan tagihan di
          workspace ini.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/15 to-indigo-500/20 border border-blue-500/20 shadow-lg shadow-slate-900/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-blue-700">
              Pelanggan Aktif
            </span>
            <span className="text-[20px]">👥</span>
          </div>
          <div className="text-[30px] font-bold text-slate-900">
            {activeCustomer}
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            Total pelanggan aktif di workspace.
          </p>
        </div>


        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-400/15 to-teal-400/20 border border-emerald-500/20 shadow-lg shadow-slate-900/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-emerald-700">
              Tagihan Belum Lunas
            </span>
            <span className="text-[20px]">💳</span>
          </div>
          <div className="text-[30px] font-bold text-slate-900">
            {unpaidInvoice}
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            Jumlah invoice yang masih belum dibayar.
          </p>
        </div>
      </div>

      <div
        className="grid gap-5 mt-8"
        style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
      >
        <div className="rounded-2xl px-4 py-4 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-semibold text-slate-900">
                Status Ping & SLA
              </div>
              <div className="text-[11px] text-slate-500">
                Gambaran cepat kesehatan jaringan dan kualitas layanan.
              </div>
            </div>
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                pingStatus.overall === "UP"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {pingStatus.overall === "UP" ? "ONLINE" : "DOWN"}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Rata-rata latency</div>
              <div className="text-[18px] font-bold text-slate-900">
                {pingStatus.avgLatencyMs} ms
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Packet loss</div>
              <div className="text-[18px] font-bold text-slate-900">
                {pingStatus.packetLoss}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">SLA bulan ini</div>
              <div className="text-[18px] font-bold text-slate-900">
                {typeof slaThisMonth === 'number' ? slaThisMonth.toFixed(3) : slaThisMonth}%
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between gap-2.5">
            <div className="text-[11px] text-slate-500">
              Status invoice bulan ini:
              <span
                className={`ml-1.5 font-semibold ${
                  invoiceSentThisMonth ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {invoiceSentThisMonth ? "Sudah dikirim" : "Belum dikirim"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl px-4 py-4 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="text-[13px] font-semibold text-slate-900">
                Alert & IP Teratas
              </div>
              <div className="text-[11px] text-slate-500">
                Ringkasan alert aktif dan penggunaan data (Top Talkers).
              </div>
            </div>
            <div
              className={`text-[11px] px-2 py-1 rounded-full font-semibold border ${
                activeAlertCount > 0
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {activeAlertCount} alert aktif
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-600">
                IP Pelanggan Teratas (24 jam)
              </div>
              <ul className="list-none p-0 mt-1.5 text-[11px] text-slate-500">
                {topInterfaces.length > 0 ? topInterfaces.map((iface) => (
                  <li
                    key={iface.name}
                    className="flex justify-between mb-1"
                  >
                    <span>{iface.name}</span>
                    <span className="font-semibold text-slate-900">
                      {iface.usageMbps} MB
                    </span>
                  </li>
                )) : (
                  <li className="text-slate-400 italic">Belum ada data NetFlow.</li>
                )}
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-600">
                Queue Mikrotik teratas
              </div>
              <ul className="list-none p-0 mt-1.5 text-[11px] text-slate-500">
                {topQueues.length > 0 ? topQueues.map((queue) => (
                  <li
                    key={queue.name}
                    className="flex justify-between mb-1"
                  >
                    <span>{queue.name}</span>
                    <span className="font-semibold text-slate-900">
                      {queue.usageMbps} Mbps
                    </span>
                  </li>
                )) : (
                  <li className="text-slate-400 italic">Belum ada data Queue.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspaceDashboardSection;
