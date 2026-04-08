import React, { useEffect, useRef, useState } from "react";
import BandwidthSparkline, { BandwidthPoint } from "./BandwidthSparkline";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type MonitoringTab = "ping" | "alerts" | "interface" | "queue";

type MonitoringSectionProps = {
  workspaceName?: string;
  initialTab?: MonitoringTab;
};

const MonitoringSection: React.FC<MonitoringSectionProps> = ({ workspaceName, initialTab }) => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>(initialTab ?? "ping");

  type PingDevice = {
    id: number;
    name: string;
    ip: string;
    latencyMs: number;
    loss: number;
    status: "UP" | "DOWN";
    pingIntervalMs?: number;
    history?: PingHistoryPoint[];
  };

  const [pingDevices, setPingDevices] = useState<PingDevice[]>([]);
  const [isLoadingPing, setIsLoadingPing] = useState(false);
  const [pingError, setPingError] = useState<string>("");

  type PingHistoryPoint = {
    time: string;
    latencyMs: number;
    status: "UP" | "DOWN";
  };

  const [pingHistory, setPingHistory] = useState<Record<number, PingHistoryPoint[]>>({});
  const [expandedPingDeviceId, setExpandedPingDeviceId] = useState<number | null>(null);
  const [detailLogDeviceId, setDetailLogDeviceId] = useState<number | null>(null);
  const [detailLogPage, setDetailLogPage] = useState<number>(1);
  const [detailLogTotalPages, setDetailLogTotalPages] = useState<number>(1);
  const [detailLogs, setDetailLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [devicePingIntervals, setDevicePingIntervals] = useState<Record<number, number>>({});
  const devicePingIntervalsRef = useRef<Record<number, number>>({});
  const lastSampleTimeRef = useRef<Record<number, number>>({});

  // Sink state ke ref supaya efek polling tidak perlu restart setiap interval berubah
  useEffect(() => {
    devicePingIntervalsRef.current = devicePingIntervals;
  }, [devicePingIntervals]);

  const [selectedBwDeviceId, setSelectedBwDeviceId] = useState<number | null>(null);
  const [ifaceList, setIfaceList] = useState<string[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>("");
  const [realBandwidthSamples, setRealBandwidthSamples] = useState<BandwidthPoint[]>([]);
  const [isLoadingBw, setIsLoadingBw] = useState(false);

  useEffect(() => {
    if (pingDevices.length > 0 && selectedBwDeviceId === null) {
      setSelectedBwDeviceId(pingDevices[0].id);
    }
  }, [pingDevices, selectedBwDeviceId]);

  // Fetch interface list when device changes
  useEffect(() => {
    if (!selectedBwDeviceId) return;
    fetch(`/api/monitoring/interfaces/${selectedBwDeviceId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setIfaceList(data);
        if (data.length > 0) setSelectedIface(data[0]);
      })
      .catch(err => console.error("fetch interfaces error", err));
  }, [selectedBwDeviceId]);

  // Polling traffic data
  useEffect(() => {
    if (!selectedBwDeviceId || !selectedIface || activeTab !== "interface") return;

    const fetchTraffic = () => {
      setIsLoadingBw(true);
      fetch(`/api/monitoring/traffic/${selectedBwDeviceId}?interface=${encodeURIComponent(selectedIface)}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          setRealBandwidthSamples(data);
          setIsLoadingBw(false);
        })
        .catch(err => {
          console.error("fetch traffic error", err);
          setIsLoadingBw(false);
        });
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 30000); // sync with worker 30s
    return () => clearInterval(interval);
  }, [selectedBwDeviceId, selectedIface, activeTab]);

  useEffect(() => {
    if (activeTab !== "ping" && activeTab !== "interface" && activeTab !== "queue") return;

    let interval: any;

    const fetchPing = async () => {
      try {
        setPingError("");
        setIsLoadingPing(true);
        const res = await fetch(`/api/monitoring/ping`);
        if (!res.ok) {
          const text = await res.text();
          console.error("ping devices error", text);
          setPingError("Gagal memuat data ping perangkat.");
          return;
        }
        const data = (await res.json()) as PingDevice[];
        setPingDevices(data);

        setDevicePingIntervals((prev) => {
          let updated = { ...prev };
          let changed = false;
          data.forEach(d => {
             if (prev[d.id] === undefined && d.pingIntervalMs) {
                updated[d.id] = d.pingIntervalMs;
                changed = true;
             }
          });
          return changed ? updated : prev;
        });

        setPingHistory(() => {
          const next: Record<number, PingHistoryPoint[]> = {};
          data.forEach(d => {
            next[d.id] = d.history || [];
          });
          return next;
        });
      } catch (err) {
        console.error("ping devices error", err);
        setPingError("Tidak dapat terhubung ke API monitoring ping.");
      } finally {
        setIsLoadingPing(false);
      }
    };

    fetchPing();
    // polling fisik dikembalikan ke 10 detik agar deteksi status UP/DOWN tetap realtime,
    // sedangkan grafik mengikuti interval yang dipilih pengguna.
    interval = window.setInterval(fetchPing, 10000);

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (detailLogDeviceId === null) return;
    setIsLoadingLogs(true);
    fetch(`/api/monitoring/ping-logs/${detailLogDeviceId}?page=${detailLogPage}`)
      .then(r => r.json())
      .then(d => {
        if (d && d.logs) {
          setDetailLogs(d.logs);
          setDetailLogTotalPages(d.totalPages || 1);
        } else {
          setDetailLogs(Array.isArray(d) ? d : []);
        }
        setIsLoadingLogs(false);
      })
      .catch(e => {
        console.error(e);
        setIsLoadingLogs(false);
      });
  }, [detailLogDeviceId, detailLogPage]);

  const renderPing = () => {
    const expandedDevice =
      expandedPingDeviceId !== null
        ? pingDevices.find((d) => d.id === expandedPingDeviceId) || null
        : null;

    let expandedHistory: PingHistoryPoint[] = expandedDevice
      ? pingHistory[expandedDevice.id] || []
      : [];

    if (expandedHistory.length === 1) {
      expandedHistory = [
        { ...expandedHistory[0], time: expandedHistory[0].time + " " },
        expandedHistory[0]
      ];
    }

    let expandedStats: { currentLabel: string; avg: number; min: number; max: number } = {
      currentLabel: "-",
      avg: 0,
      min: 0,
      max: 0,
    };

    if (expandedHistory.length > 0) {
      const latencies = expandedHistory.map((p) => p.latencyMs);
      const count = latencies.length;
      const sum = latencies.reduce((acc, v) => acc + v, 0);
      const avg = count ? sum / count : 0;
      const min = count ? Math.min(...latencies) : 0;
      const max = count ? Math.max(...latencies) : 0;
      const lastPoint = expandedHistory[expandedHistory.length - 1];
      const currentLabel =
        lastPoint && lastPoint.status === "UP"
          ? `${lastPoint.latencyMs.toFixed(1)} ms`
          : "-";

      expandedStats = { currentLabel, avg, min, max };
    }

    return (
      <>
        <section>
          <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
            Monitoring Ping
          </h2>
          <p className="m-0 text-[12px] text-slate-500 mb-3.5">
            Grafik latency ping perangkat yang sudah ditambahkan. Data diperbarui
            otomatis setiap beberapa detik dari backend.
          </p>

          {pingError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[11px] border border-red-200">
              {pingError}
            </div>
          )}

          {pingDevices.length === 0 ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5 px-3 py-4 text-center text-[11px] text-slate-400">
              {isLoadingPing
                ? "Memuat data ping perangkat..."
                : "Belum ada perangkat yang dimonitor atau belum ada data ping."}
            </div>
          ) : (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {pingDevices.map((device) => {
                let historyPoints: PingHistoryPoint[] = pingHistory[device.id] || [];
                
                if (historyPoints.length === 1) {
                  historyPoints = [
                    { ...historyPoints[0], time: historyPoints[0].time + " " },
                    historyPoints[0]
                  ];
                }

                const latencies = historyPoints.map((p) => p.latencyMs);
                const count = latencies.length;
                const sum = latencies.reduce((acc, v) => acc + v, 0);
                const avg = count ? sum / count : 0;
                const min = count ? Math.min(...latencies) : 0;
                const max = count ? Math.max(...latencies) : 0;
                const lastPoint = historyPoints[historyPoints.length - 1];
                const currentLabel =
                  lastPoint && lastPoint.status === "UP"
                    ? `${lastPoint.latencyMs.toFixed(1)} ms`
                    : "-";

                return (
                  <div
                    key={device.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedPingDeviceId(device.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setExpandedPingDeviceId(device.id);
                      }
                    }}
                    className="text-left rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5 p-3 hover:border-blue-400/70 hover:shadow-lg transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="m-0 text-[11px] text-slate-500">Grafik latency (ms)</p>
                        <p className="m-0 text-[13px] font-semibold text-slate-900">
                          {device.name} <span className="text-slate-400">· {device.ip}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>Status:</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                              device.status === "UP"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {device.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Interval:</span>
                            <select
                              className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[11px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                              value={devicePingIntervals[device.id] ?? 30000}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                setDevicePingIntervals((prev) => ({
                                  ...prev,
                                  [device.id]: value,
                                }));
                                fetch(`/api/devices/${device.id}/ping-interval`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ pingIntervalMs: value })
                                }).catch(err => console.error("Update interval err", err));
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value={30000}>30 detik</option>
                              <option value={60000}>1 menit</option>
                              <option value={180000}>3 menit</option>
                              <option value={300000}>5 menit</option>
                              <option value={600000}>10 menit</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailLogDeviceId(device.id);
                              setDetailLogPage(1);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 mt-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all text-[11px] font-semibold border border-blue-100 hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Detail Log
                          </button>
                        </div>
                      </div>
                    </div>

                    {historyPoints.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-[11px] text-slate-400">
                        Belum ada sampel ping untuk perangkat ini.
                      </div>
                    ) : (
                      <>
                        <div className="h-32 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={historyPoints}
                              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="pingLatencyGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                stroke="#e5e7eb"
                                strokeWidth={0.5}
                                vertical={false}
                              />
                              <XAxis dataKey="time" hide />
                              <YAxis hide />
                              <Tooltip
                                cursor={{ stroke: "#cbd5f5", strokeWidth: 1 }}
                                contentStyle={{
                                  fontSize: 11,
                                  borderRadius: 12,
                                  borderColor: "#e5e7eb",
                                }}
                                labelStyle={{ fontSize: 11, color: "#6b7280" }}
                                formatter={(value: any) => [`${value} ms`, "Latency"]}
                              />
                              <Area
                                type="monotone"
                                dataKey="latencyMs"
                                stroke="#0ea5e9"
                                strokeWidth={1}
                                fill="url(#pingLatencyGradient)"
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>
                            Latency saat ini: <span className="font-semibold text-slate-700">{currentLabel}</span>
                          </span>
                          <span>
                            Rata-rata: <span className="font-semibold text-slate-700">{avg.toFixed(1)} ms</span>
                            {" · "}
                            Min: <span className="font-semibold text-slate-700">{min.toFixed(1)} ms</span>
                            {" · "}
                            Max: <span className="font-semibold text-slate-700">{max.toFixed(1)} ms</span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {expandedDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/40">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="m-0 text-[15px] font-semibold text-slate-900">
                    Detail ping – {expandedDevice.name}
                  </h3>
                  <p className="m-0 text-[11px] text-slate-500">
                    {expandedDevice.ip} · status
                    {" "}
                    <span
                      className={
                        expandedDevice.status === "UP"
                          ? "text-emerald-600 font-semibold"
                          : "text-rose-600 font-semibold"
                      }
                    >
                      {" "}
                      {expandedDevice.status}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedPingDeviceId(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[11px]"
                >
                  ✕
                </button>
              </div>

              {expandedHistory.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-[11px] text-slate-400">
                  Belum ada sampel ping untuk perangkat ini.
                </div>
              ) : (
                <>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={expandedHistory}
                        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="pingLatencyGradientExpanded" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="#e5e7eb"
                          strokeWidth={0.75}
                          vertical={false}
                        />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          cursor={{ stroke: "#cbd5f5", strokeWidth: 1 }}
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 12,
                            borderColor: "#e5e7eb",
                          }}
                          labelStyle={{ fontSize: 11, color: "#6b7280" }}
                          formatter={(value: any) => [`${value} ms`, "Latency"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="latencyMs"
                          stroke="#0ea5e9"
                          strokeWidth={1.2}
                          fill="url(#pingLatencyGradientExpanded)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span>
                      Latency saat ini:
                      {" "}
                      <span className="font-semibold text-slate-800">
                        {expandedStats.currentLabel}
                      </span>
                    </span>
                    <span>
                      Rata-rata:
                      {" "}
                      <span className="font-semibold text-slate-800">
                        {expandedStats.avg.toFixed(1)} ms
                      </span>
                      {" · "}
                      Min:
                      {" "}
                      <span className="font-semibold text-slate-800">
                        {expandedStats.min.toFixed(1)} ms
                      </span>
                      {" · "}
                      Max:
                      {" "}
                      <span className="font-semibold text-slate-800">
                        {expandedStats.max.toFixed(1)} ms
                      </span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {detailLogDeviceId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="m-0 text-[16px] font-semibold text-slate-900">
                    Detail Log Monitoring
                  </h3>
                  <p className="m-0 text-[12px] text-slate-500">
                    Riwayat ping perangkat ({pingDevices.find(d => d.id === detailLogDeviceId)?.name})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailLogDeviceId(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[12px]"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[360px] overflow-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 outline outline-1 outline-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Tanggal & Waktu</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Latency (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLogs ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Memuat log dari server...</td>
                      </tr>
                    ) : detailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Belum ada history log yang tersimpan.</td>
                      </tr>
                    ) : (
                      detailLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                          <td className="px-5 py-2.5 text-slate-600 font-medium">
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              log.status === "UP" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 font-medium text-slate-700">{log.latencyMs} ms</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[12px] text-slate-500 font-medium">
                  Halaman {detailLogPage} dari {detailLogTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={detailLogPage <= 1 || isLoadingLogs}
                    onClick={() => setDetailLogPage(p => p - 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={detailLogPage >= detailLogTotalPages || isLoadingLogs}
                    onClick={() => setDetailLogPage(p => p + 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderAlerts = () => {
    const alerts = [
      {
        id: 1,
        title: "Ping timeout - Router Kantor Pusat",
        severity: "High",
        since: "5 menit lalu",
        type: "Ping",
      },
      {
        id: 2,
        title: "BW > 80% - ether1-UPLINK",
        severity: "Medium",
        since: "25 menit lalu",
        type: "Bandwidth",
      },
    ];

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Alert Monitoring
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          Daftar alert aktif dan riwayat singkat. Tombol acknowledge/close saat ini
          masih dummy dan akan dihubungkan ke backend kemudian.
        </p>

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-md shadow-slate-900/5">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-slate-100">
              <tr className="text-left text-slate-500">
                <th className="px-2.5 py-2">Alert</th>
                <th className="px-2.5 py-2">Tipe</th>
                <th className="px-2.5 py-2">Severitas</th>
                <th className="px-2.5 py-2">Sejak</th>
                <th className="px-2.5 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    {a.title}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200 text-slate-600">
                    {a.type}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        a.severity === "High"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : a.severity === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200 text-slate-600">
                    {a.since}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      Acknowledge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderInterface = () => {
    const selectedDevice = pingDevices.find(d => d.id === selectedBwDeviceId);
    const isDown = selectedDevice?.status === "DOWN";

    // Gunakan data asli jika tersedia, jika tidak (atau jika down) gunakan placeholder 0
    const bandwidthSamples: BandwidthPoint[] = realBandwidthSamples.length > 0 && !isDown
      ? realBandwidthSamples 
      : [
          { time: "00:00", rx: 0, tx: 0 },
        ];

    const rxValues = bandwidthSamples.map((p) => p.rx);
    const txValues = bandwidthSamples.map((p) => p.tx);

    const sum = (values: number[]) =>
      values.reduce((acc, val) => acc + val, 0);

    const rxAvg = rxValues.length ? sum(rxValues) / rxValues.length : 0;
    const txAvg = txValues.length ? sum(txValues) / txValues.length : 0;

    const rxMax = rxValues.length ? Math.max(...rxValues) : 0;
    const txMax = txValues.length ? Math.max(...txValues) : 0;

    const rxMin = rxValues.length ? Math.min(...rxValues) : 0;
    const txMin = txValues.length ? Math.min(...txValues) : 0;

    const lastSample = bandwidthSamples[bandwidthSamples.length - 1] || { rx: 0, tx: 0 };

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Monitoring Bandwidth per Interface
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          Pilih router dan interface untuk melihat grafik penggunaan bandwidth
          (rx/tx) per waktu.
        </p>

        <div className="flex flex-wrap gap-2.5 mb-3.5">
          <select
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] min-w-[180px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            value={selectedBwDeviceId ?? ""}
            onChange={(e) => setSelectedBwDeviceId(Number(e.target.value))}
          >
            {pingDevices.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.ip})</option>
            ))}
            {pingDevices.length === 0 && <option value="">Tidak ada perangkat</option>}
          </select>
          <select
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] min-w-[180px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            value={selectedIface}
            onChange={(e) => setSelectedIface(e.target.value)}
          >
            {ifaceList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
            {ifaceList.length === 0 && <option value="">Tidak ada interface</option>}
          </select>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="m-0 text-[11px] text-slate-500">Grafik waktu nyata</p>
                {realBandwidthSamples.length === 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider border border-amber-200">
                    Menunggu Data...
                  </span>
                )}
              </div>
              <p className="m-0 text-[13px] font-semibold text-slate-900 line-clamp-1">
                {selectedIface || "Pilih Interface"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>RX Mbps</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>TX Mbps</span>
              </div>
            </div>
          </div>

          <BandwidthSparkline data={bandwidthSamples} />

          {ifaceList.length === 0 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex flex-col gap-1.5">
              <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Peringatan: Tidak Ada Interface Terdeteksi
              </span>
              <p className="m-0 leading-relaxed font-medium">
                Sistem tidak menemukan data interface untuk perangkat ini. Hal ini biasanya terjadi karena:
              </p>
              <ul className="m-0 pl-4 list-disc space-y-0.5">
                <li>Mode <span className="font-bold">SNMP</span> belum diaktifkan saat menambah perangkat.</li>
                <li><span className="font-bold">Community String</span> (misal: "public") salah atau tidak cocok.</li>
                <li>Fitur SNMP belum diaktifkan di sisi perangkat (misal: MikroTik IP &gt; SNMP).</li>
                <li>Perangkat sedang dalam status <span className="font-bold font-mono">DOWN</span> sehingga data tidak dapat ditarik.</li>
              </ul>
            </div>
          )}

          <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
              <span>
                RX: {rxAvg.toFixed(2)} Mbps avg,
                {" "}
                {rxMin.toFixed(2)} min,
                {" "}
                {rxMax.toFixed(2)} max
              </span>
              <span>
                TX: {txAvg.toFixed(2)} Mbps avg,
                {" "}
                {txMin.toFixed(2)} min,
                {" "}
                {txMax.toFixed(2)} max
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
              <span>
                current: RX {lastSample.rx.toFixed(2)} Mbps / TX
                {" "}
                {lastSample.tx.toFixed(2)} Mbps
              </span>
              {bandwidthSamples.length > 1 && (
                <span>
                  periode: {bandwidthSamples[0].time} -
                  {" "}
                  {bandwidthSamples[bandwidthSamples.length - 1].time}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderQueue = () => {
    const queues = [
      { name: "Queue-Office", usageMbps: 45 },
      { name: "Queue-Home", usageMbps: 32 },
      { name: "Queue-Business", usageMbps: 28 },
    ];

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Monitoring Bandwidth per Queue (Mikrotik)
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          List queue dan grafik usage. Data di bawah masih dummy dan akan diisi
          dari API Mikrotik nanti.
        </p>

        <div className="rounded-2xl p-4 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <ul className="list-none p-0 m-0 text-[12px] text-slate-600">
            {queues.map((q) => (
              <li
                key={q.name}
                className="flex justify-between py-1.5 border-b border-slate-200"
              >
                <span>{q.name}</span>
                <span className="font-semibold text-slate-900">
                  {q.usageMbps} Mbps
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 px-3 py-3 rounded-xl bg-slate-50 text-[11px] text-slate-400 text-center">
            Placeholder grafik time-series usage queue.
          </div>
        </div>
      </section>
    );
  };

  const renderContent = () => {
    if (activeTab === "ping") return renderPing();
    if (activeTab === "alerts") return renderAlerts();
    if (activeTab === "interface") return renderInterface();
    return renderQueue();
  };

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-900">
            Monitoring Jaringan {workspaceName ? `- ${workspaceName}` : ""}
          </h1>
          <p className="m-0 text-[12px] text-slate-500">
            Pantau ping, alert, dan penggunaan bandwidth per interface / queue
            dalam satu halaman.
          </p>
        </div>
      </header>

      {renderContent()}
    </section>
  );
};

export default MonitoringSection;
