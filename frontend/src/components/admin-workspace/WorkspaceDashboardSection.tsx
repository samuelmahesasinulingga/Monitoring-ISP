import React, { useState, useEffect } from "react";
import SystemInfoSection from "./SystemInfoSection";

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
      <div className="flex items-center justify-center p-12 mt-12 bg-[var(--card-main-bg)] backdrop-blur-sm rounded-2xl border border-[var(--border-main)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-[var(--text-main-secondary)] font-medium text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const {
    activeCustomer,
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
        <h1 className="m-0 mb-1 text-[22px] font-bold text-[var(--text-main-primary)]">
          {workspaceName ?? "Ringkasan Workspace"}
        </h1>
        <p className="m-0 text-[13px] text-[var(--text-main-secondary)]">
          Dashboard singkat aktivitas pelanggan, tiket, dan tagihan di
          workspace ini.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-blue-400">
              Pelanggan Aktif
            </span>
            <span className="text-[20px]">👥</span>
          </div>
          <div className="text-[30px] font-bold text-[var(--text-main-primary)]">
            {activeCustomer}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-main-secondary)]">
            Total pelanggan aktif di workspace.
          </p>
        </div>


        <div className="p-5 rounded-2xl bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-emerald-400">
              Tagihan Belum Lunas
            </span>
            <span className="text-[20px]">💳</span>
          </div>
          <div className="text-[30px] font-bold text-[var(--text-main-primary)]">
            {unpaidInvoice}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-main-secondary)]">
            Jumlah invoice yang masih belum dibayar.
          </p>
        </div>
      </div>

      <div
        className="grid gap-5 mt-8"
        style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
      >
        <div className="rounded-2xl px-4 py-4 bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-semibold text-[var(--text-main-primary)]">
                Status Ping & SLA
              </div>
              <div className="text-[11px] text-[var(--text-main-secondary)]">
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
              <div className="text-[11px] text-[var(--text-main-secondary)]">Rata-rata latency</div>
              <div className="text-[18px] font-bold text-[var(--text-main-primary)]">
                {pingStatus.avgLatencyMs} ms
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-main-secondary)]">Packet loss</div>
              <div className="text-[18px] font-bold text-[var(--text-main-primary)]">
                {pingStatus.packetLoss}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-main-secondary)]">SLA bulan ini</div>
              <div className="text-[18px] font-bold text-[var(--text-main-primary)]">
                {typeof slaThisMonth === 'number' ? slaThisMonth.toFixed(3) : slaThisMonth}%
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-dashed border-[var(--border-main)] flex items-center justify-between gap-2.5">
            <div className="text-[11px] text-[var(--text-main-secondary)]">
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

        <div className="rounded-2xl px-4 py-4 bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="text-[13px] font-semibold text-[var(--text-main-primary)]">
                Alert & Usage
              </div>
              <div className="text-[11px] text-[var(--text-main-secondary)]">
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
              <div className="text-[11px] font-semibold text-[var(--text-main-secondary)]">
                Top Interfaces
              </div>
              <ul className="list-none p-0 mt-1.5 text-[11px] text-[var(--text-main-secondary)]">
                {topInterfaces.length > 0 ? topInterfaces.map((iface) => (
                  <li
                    key={iface.name}
                    className="flex justify-between mb-1"
                  >
                    <span>{iface.name}</span>
                    <span className="font-semibold text-[var(--text-main-primary)]">
                      {iface.usageMbps} MB
                    </span>
                  </li>
                )) : (
                  <li className="text-[var(--text-main-secondary)] opacity-50 italic">No NetFlow data.</li>
                )}
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-[var(--text-main-secondary)]">
                Top Queues
              </div>
              <ul className="list-none p-0 mt-1.5 text-[11px] text-[var(--text-main-secondary)]">
                {topQueues.length > 0 ? topQueues.map((queue) => (
                  <li
                    key={queue.name}
                    className="flex justify-between mb-1"
                  >
                    <span>{queue.name}</span>
                    <span className="font-semibold text-[var(--text-main-primary)]">
                      {queue.usageMbps} Mbps
                    </span>
                  </li>
                )) : (
                  <li className="text-[var(--text-main-secondary)] opacity-50 italic">No Queue data.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SystemInfoSection />
      </div>
    </section>
  );
};

export default WorkspaceDashboardSection;
