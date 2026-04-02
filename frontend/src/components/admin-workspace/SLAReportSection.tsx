import React, { useState } from "react";

type Period = "daily" | "weekly" | "monthly";

const SLAReportSection: React.FC = () => {
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedCustomer, setSelectedCustomer] = useState("all");

  const periodLabel = (p: Period) => {
    if (p === "daily") return "Harian";
    if (p === "weekly") return "Mingguan";
    return "Bulanan";
  };

  const slaValue = 99.82;
  const totalDowntimeMinutes = 78; // dummy
  const downtimeEvents = [
    { date: "2026-03-02", durationMin: 18, cause: "Gangguan listrik POP" },
    { date: "2026-03-11", durationMin: 25, cause: "Fiber putus" },
    { date: "2026-03-22", durationMin: 35, cause: "Maintenance terencana" },
  ];

  const peakMbps = 120;
  const averageMbps = 45;

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-900">
            📈 SLA & Report
          </h1>
          <p className="m-0 text-[12px] text-slate-500">
            Analisa SLA dan laporan penggunaan bandwidth. Data ini nanti dapat
            dijadikan lampiran invoice ke pelanggan.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
          >
            <option value="daily">Periode harian</option>
            <option value="weekly">Periode mingguan</option>
            <option value="monthly">Periode bulanan</option>
          </select>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] bg-white min-w-[200px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
          >
            <option value="all">Semua pelanggan / link</option>
            <option value="cust-1">PT Contoh Pelanggan</option>
            <option value="link-1">Link Backhaul Kantor Pusat - POP Bandung</option>
          </select>
        </div>
      </header>

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)" }}>
        {/* Analisa SLA */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Analisa Perhitungan SLA ({periodLabel(period)})
          </h2>
          <p className="m-0 text-[12px] text-slate-500 mb-3">
            Ringkasan SLA berdasarkan total downtime pada periode terpilih.
            Perhitungan detil akan diambil dari data monitoring backend.
          </p>

          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <div className="text-[12px] text-slate-500 mb-1">
                SLA periode ini
              </div>
              <div
                className={`text-[28px] font-bold ${
                  slaValue > 99.9
                    ? "text-emerald-600"
                    : slaValue > 99
                    ? "text-emerald-500"
                    : "text-amber-500"
                }`}
              >
                {slaValue.toFixed(3)}%
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-blue-50 text-[12px] text-blue-700 flex-1">
              Estimasi downtime: {Math.floor(totalDowntimeMinutes / 60)} jam {totalDowntimeMinutes % 60} menit
              <br />
              Target SLA umum ISP: &gt; 99.5% (bisa disesuaikan per kontrak).
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-3 text-[12px] text-slate-600 max-h-[190px] overflow-auto">
            <div className="text-[11px] uppercase tracking-[0.04em] text-slate-400 mb-1.5">
              Detail downtime
            </div>
            {downtimeEvents.map((d) => (
              <div
                key={d.date + d.cause}
                className="flex items-center justify-between py-1.5 border-b border-slate-200"
              >
                <div>
                  <div className="font-medium text-slate-900">{d.date}</div>
                  <div className="text-[11px] text-slate-500">{d.cause}</div>
                </div>
                <div className="text-[12px] font-semibold text-slate-900">
                  {d.durationMin} menit
                </div>
              </div>
            ))}

            {downtimeEvents.length === 0 && (
              <div className="text-[12px] text-slate-400">
                Belum ada catatan downtime pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Report BW usage */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Report BW Usage
          </h2>
          <p className="m-0 text-[12px] text-slate-500 mb-2.5">
            Ringkasan penggunaan bandwidth untuk pelanggan / link terpilih.
            Grafik dan angka di bawah masih dummy dan akan diambil dari
            timeseries backend.
          </p>

          <div className="rounded-xl px-3 py-3 bg-slate-50 text-[12px] text-slate-400 text-center mb-2.5">
            Placeholder grafik time-series penggunaan bandwidth.
          </div>

          <div className="flex justify-between gap-3 text-[12px] text-slate-600">
            <div className="flex-1 rounded-xl px-2.5 py-2.5 bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] text-emerald-700 mb-1">
                Peak usage
              </div>
              <div className="text-[18px] font-bold text-emerald-700">
                {peakMbps} Mbps
              </div>
            </div>

            <div className="flex-1 rounded-xl px-2.5 py-2.5 bg-blue-50 border border-blue-200">
              <div className="text-[11px] text-blue-700 mb-1">
                Rata-rata usage
              </div>
              <div className="text-[18px] font-bold text-blue-700">
                {averageMbps} Mbps
              </div>
            </div>
          </div>

          <p className="mt-2.5 mb-0 text-[11px] text-slate-500">
            Catatan: angka peak & rata-rata ini bisa langsung disisipkan
            ke lampiran invoice sebagai bukti penggunaan layanan.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SLAReportSection;
