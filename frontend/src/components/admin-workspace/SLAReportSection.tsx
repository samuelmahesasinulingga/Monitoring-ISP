import React, { useState, useEffect } from "react";

type Period = "daily" | "weekly" | "monthly";

type DowntimeEvent = {
  date: string;
  durationMin: number;
  cause: string;
};

type SLAStats = {
  uptimePercentage: number;
  totalLogs: number;
  upLogs: number;
  downLogs: number;
  avgLatencyMs: number;
  downtimeMinutes: number;
  downtimeEvents: DowntimeEvent[];
};

type Device = {
  id: number;
  name: string;
};

interface SLAReportSectionProps {
  workspaceId?: number;
}

const SLAReportSection: React.FC<SLAReportSectionProps> = ({ workspaceId }) => {
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const periodLabel = (p: Period) => {
    if (p === "daily") return "Harian";
    if (p === "weekly") return "Mingguan";
    return "Bulanan";
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/devices?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => setDevices(data || []))
      .catch(err => console.error("Error fetching devices:", err));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    setIsLoading(true);
    const devParam = selectedDeviceId !== "all" ? `&deviceId=${selectedDeviceId}` : "";
    fetch(`/api/monitoring/sla-stats?workspaceId=${workspaceId}&period=${period}${devParam}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching SLA stats:", err);
        setIsLoading(false);
      });
  }, [workspaceId, period, selectedDeviceId]);

  const slaValue = stats?.uptimePercentage ?? 100;
  const totalDowntimeMinutes = stats?.downtimeMinutes ?? 0;
  const downtimeEvents = stats?.downtimeEvents ?? [];

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-[18px]">📈</span>
            SLA & Report
          </h1>
          <p className="m-0 text-[12px] text-slate-500">
            Analisa SLA dan laporan ketersediaan layanan perangkat monitor.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 shadow-sm"
          >
            <option value="daily">Periode harian</option>
            <option value="weekly">Periode mingguan</option>
            <option value="monthly">Periode bulanan</option>
          </select>

          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-[12px] bg-white min-w-[220px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 shadow-sm"
          >
            <option value="all">Semua Perangkat</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 animate-pulse text-[13px]">
          Sedang menghitung statistik SLA...
        </div>
      ) : (
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)" }}>
          {/* Analisa SLA */}
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
            <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
              Analisa Perhitungan SLA ({periodLabel(period)})
            </h2>
            <p className="m-0 text-[12px] text-slate-500 mb-4">
              Ringkasan ketersediaan berdasarkan data log ping real-time.
            </p>

            <div className="flex items-center justify-between gap-6 mb-5 flex-wrap">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex-1 min-w-[140px]">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  SLA SCORE
                </div>
                <div
                  className={`text-[32px] font-black leading-tight ${
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

              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <div className="text-[12px] text-slate-600">
                    Estimasi downtime: <span className="font-bold text-slate-900">{Math.floor(totalDowntimeMinutes / 60)} jam {totalDowntimeMinutes % 60} menit</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <div className="text-[12px] text-slate-600">
                    Rata-rata Latensi: <span className="font-bold text-slate-900">{stats?.avgLatencyMs.toFixed(1)} ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4 text-[12px] text-slate-600 max-h-[220px] overflow-auto">
              <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400 mb-3">
                Log Gangguan (Downtime)
              </div>
              {downtimeEvents.length > 0 ? (
                downtimeEvents.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{d.date}</div>
                      <div className="text-[11px] text-slate-500">{d.cause}</div>
                    </div>
                    <div className="px-2 py-0.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold">
                      OFFLINE
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-400 italic">
                  Luar biasa! Tidak ada catatan downtime pada periode ini.
                </div>
              )}
            </div>
          </div>

          {/* Performance Report */}
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
            <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
              Kualitas Monitoring
            </h2>
            <p className="m-0 text-[12px] text-slate-500 mb-5">
              Statistik pengumpulan data untuk periode {periodLabel(period)}.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <div className="text-[11px] font-bold opacity-80 uppercase mb-1">Total Sampel Log</div>
                <div className="text-2xl font-black">{stats?.totalLogs.toLocaleString()} <span className="text-[14px] font-normal opacity-70">Pings</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">Success</div>
                  <div className="text-[18px] font-bold text-emerald-700">{stats?.upLogs.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="text-[10px] font-bold text-red-600 uppercase mb-0.5">Timeout</div>
                  <div className="text-[18px] font-bold text-red-700">{stats?.downLogs.toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                >
                  📥 Cetak Laporan SLA
                </button>
                <p className="mt-3 text-[11px] text-slate-400 text-center italic">
                  *Gunakan fitur ini untuk melampirkan bukti performa layanan ke pelanggan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SLAReportSection;
