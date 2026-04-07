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
  const [devicePingIntervals, setDevicePingIntervals] = useState<Record<number, number>>({});
  const devicePingIntervalsRef = useRef<Record<number, number>>({});
  const lastSampleTimeRef = useRef<Record<number, number>>({});

  // Sink state ke ref supaya efek polling tidak perlu restart setiap interval berubah
  useEffect(() => {
    devicePingIntervalsRef.current = devicePingIntervals;
  }, [devicePingIntervals]);

  useEffect(() => {
    if (activeTab !== "ping") return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    let interval: number | undefined;

    const fetchPing = async () => {
      try {
        setPingError("");
        setIsLoadingPing(true);
        const res = await fetch(`${apiBase}/api/monitoring/ping`);
        if (!res.ok) {
          const text = await res.text();
          console.error("ping devices error", text);
          setPingError("Gagal memuat data ping perangkat.");
          return;
        }
        const data = (await res.json()) as PingDevice[];
        setPingDevices(data);

        const now = new Date();
        const label = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        setPingHistory((prev) => {
          const next: Record<number, PingHistoryPoint[]> = { ...prev };

          data.forEach((d) => {
            const points = prev[d.id] ? [...prev[d.id]] : [];
            const latency = d.status === "UP" ? d.latencyMs : 0;
            points.push({ time: label, latencyMs: latency, status: d.status });
            if (points.length > 30) {
              points.shift();
            }
            next[d.id] = points;
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
    interval = window.setInterval(fetchPing, 10000); // polling fisik ke backend setiap 10 detik

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [activeTab]);

  const renderPing = () => {
    const expandedDevice =
      expandedPingDeviceId !== null
        ? pingDevices.find((d) => d.id === expandedPingDeviceId) || null
        : null;

    const expandedHistory: PingHistoryPoint[] = expandedDevice
      ? pingHistory[expandedDevice.id] || []
      : [];

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
                const rawHistory: PingHistoryPoint[] = pingHistory[device.id] || [];

                const intervalMs = devicePingIntervals[device.id] ?? 10000; // default 10 detik
                const baseSampleMs = 10000; // kita ambil sampel dari backend setiap 10 detik
                const step = Math.max(1, Math.round(intervalMs / baseSampleMs));

                const historyPoints: PingHistoryPoint[] = rawHistory.filter((_, idx) => idx % step === 0);

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
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => setExpandedPingDeviceId(device.id)}
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
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Interval:</span>
                          <select
                            className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[11px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                            value={devicePingIntervals[device.id] ?? 10000}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setDevicePingIntervals((prev) => ({
                                ...prev,
                                [device.id]: value,
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value={10000}>10 detik</option>
                            <option value={30000}>30 detik</option>
                            <option value={60000}>1 menit</option>
                            <option value={300000}>5 menit</option>
                            <option value={600000}>10 menit</option>
                          </select>
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
                  </button>
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
    const bandwidthSamples: BandwidthPoint[] = [
      { time: "10:00", rx: 12, tx: 6 },
      { time: "10:05", rx: 18, tx: 9 },
      { time: "10:10", rx: 22, tx: 11 },
      { time: "10:15", rx: 30, tx: 15 },
      { time: "10:20", rx: 26, tx: 13 },
      { time: "10:25", rx: 32, tx: 18 },
      { time: "10:30", rx: 40, tx: 20 },
      { time: "10:35", rx: 34, tx: 17 },
      { time: "10:40", rx: 28, tx: 14 },
      { time: "10:45", rx: 22, tx: 11 },
      { time: "10:50", rx: 18, tx: 9 },
      { time: "10:55", rx: 14, tx: 7 },
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

    const lastSample = bandwidthSamples[bandwidthSamples.length - 1];

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
            defaultValue="router1"
          >
            <option value="router1">Router Kantor Pusat</option>
            <option value="router2">Router POP Bandung</option>
          </select>
          <select
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] min-w-[180px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            defaultValue="iface1"
          >
            <option value="iface1">ether1-UPLINK</option>
            <option value="iface2">ether2-POP</option>
            <option value="iface3">vlan10-Client</option>
          </select>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="m-0 text-[11px] text-slate-500">Grafik waktu nyata (dummy)</p>
              <p className="m-0 text-[13px] font-semibold text-slate-900">
                ether1-UPLINK
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

          <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
              <span>
                RX: {rxAvg.toFixed(1)} Mbps avg,
                {" "}
                {rxMin.toFixed(1)} min,
                {" "}
                {rxMax.toFixed(1)} max
              </span>
              <span>
                TX: {txAvg.toFixed(1)} Mbps avg,
                {" "}
                {txMin.toFixed(1)} min,
                {" "}
                {txMax.toFixed(1)} max
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
              <span>
                current: RX {lastSample.rx.toFixed(1)} Mbps / TX
                {" "}
                {lastSample.tx.toFixed(1)} Mbps
              </span>
              <span>
                periode: {bandwidthSamples[0].time} -
                {" "}
                {bandwidthSamples[bandwidthSamples.length - 1].time}
              </span>
            </div>
            <p className="m-0 mt-1 text-[10px] text-slate-400">
              Angka di atas masih dummy, nanti akan mengikuti data historis
              dari backend sehingga keterangan statistiknya mirip SmokePing.
            </p>
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
