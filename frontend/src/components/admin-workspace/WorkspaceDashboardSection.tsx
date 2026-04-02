import React from "react";

type WorkspaceDashboardSectionProps = {
  workspaceName?: string;
};

const WorkspaceDashboardSection: React.FC<WorkspaceDashboardSectionProps> = ({
  workspaceName,
}) => {
  const activeCustomer = 320; // dummy
  const activeTicket = 18; // dummy
  const unpaidInvoice = 12; // dummy

  const pingStatus = {
    overall: "UP" as "UP" | "DOWN",
    avgLatencyMs: 18,
    packetLoss: 0.4,
  };

  const activeAlertCount = 3; // dummy

  const topInterfaces = [
    { name: "ether1-UPLINK", usageMbps: 120 },
    { name: "ether2-POP", usageMbps: 95 },
    { name: "vlan10-Client", usageMbps: 80 },
  ];

  const topQueues = [
    { name: "Queue-Office", usageMbps: 45 },
    { name: "Queue-Home", usageMbps: 32 },
    { name: "Queue-Business", usageMbps: 28 },
  ];

  const slaThisMonth = 99.2; // dummy
  const invoiceSentThisMonth = false; // dummy

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-400/15 to-amber-400/20 border border-orange-500/20 shadow-lg shadow-slate-900/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-amber-700">
              Tiket Aktif
            </span>
            <span className="text-[20px]">🎫</span>
          </div>
          <div className="text-[30px] font-bold text-slate-900">
            {activeTicket}
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            Tiket gangguan yang masih terbuka.
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
                {slaThisMonth}%
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
                Alert & BW Tertinggi
              </div>
              <div className="text-[11px] text-slate-500">
                Ringkasan alert aktif dan penggunaan bandwidth tertinggi.
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
                Interface teratas
              </div>
              <ul className="list-none p-0 mt-1.5 text-[11px] text-slate-500">
                {topInterfaces.map((iface) => (
                  <li
                    key={iface.name}
                    className="flex justify-between mb-1"
                  >
                    <span>{iface.name}</span>
                    <span className="font-semibold text-slate-900">
                      {iface.usageMbps} Mbps
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-600">
                Queue Mikrotik teratas
              </div>
              <ul className="list-none p-0 mt-1.5 text-[11px] text-slate-500">
                {topQueues.map((queue) => (
                  <li
                    key={queue.name}
                    className="flex justify-between mb-1"
                  >
                    <span>{queue.name}</span>
                    <span className="font-semibold text-slate-900">
                      {queue.usageMbps} Mbps
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspaceDashboardSection;
