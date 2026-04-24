import React, { useEffect, useRef, useState } from "react";
import BandwidthSparkline, { BandwidthPoint, formatBandwidth } from "./BandwidthSparkline";
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
  workspaceId?: number;
  initialTab?: MonitoringTab;
};

const formatTime = (isoString: string) => {
  const cleanIso = isoString.endsWith('Z') ? isoString.slice(0, -1) : isoString;
  const d = new Date(cleanIso);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
};

const MonitoringSection: React.FC<MonitoringSectionProps> = ({ workspaceName, workspaceId, initialTab }) => {

  type PingDevice = {
    id: number;
    name: string;
    ip: string;
    latencyMs: number;
    loss: number;
    status: "UP" | "DOWN";
    pingIntervalMs?: number;
    integrationMode?: string;
    monitoredQueues?: string[];
    monitoredInterfaces?: string[];
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


  // Interface Multi-device states
  const [deviceInterfaceBandwidthSamples, setDeviceInterfaceBandwidthSamples] = useState<Record<number, Record<string, BandwidthPoint[]>>>({});
  const [isLoadingIfaceMap, setIsLoadingIfaceMap] = useState<Record<number, boolean>>({});

  // Queue Multi-device states
  const [deviceQueueLists, setDeviceQueueLists] = useState<Record<number, string[]>>({});
  const [deviceQueueBandwidthSamples, setDeviceQueueBandwidthSamples] = useState<Record<number, Record<string, BandwidthPoint[]>>>({});
  const [isLoadingQueueMap, setIsLoadingQueueMap] = useState<Record<number, boolean>>({});

  type DeviceAlert = {
    id: number;
    deviceId: number;
    deviceName: string;
    status: string;
    createdAt: string;
  };
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [alertPage, setAlertPage] = useState<number>(1);
  const [alertTotalPages, setAlertTotalPages] = useState<number>(1);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  const [selectedDetailDeviceId, setSelectedDetailDeviceId] = useState<number | null>(null);
  const [selectedDetailQueueName, setSelectedDetailQueueName] = useState<string | null>(null);

  const fetchTrafficForDevice = (deviceId: number, iface: string) => {
    setIsLoadingIfaceMap(prev => ({ ...prev, [deviceId]: true }));
    fetch(`/api/monitoring/traffic/${deviceId}?interface=${encodeURIComponent(iface)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const formatted = data.map((point: any) => ({
          ...point,
          time: formatTime(point.time)
        }));
        setDeviceInterfaceBandwidthSamples(prev => ({
          ...prev,
          [deviceId]: {
            ...(prev[deviceId] || {}),
            [iface]: formatted
          }
        }));
      })
      .catch(err => {
        console.error("fetch traffic error for", deviceId, iface, err);
      })
      .finally(() => {
        setIsLoadingIfaceMap(prev => ({ ...prev, [deviceId]: false }));
      });
  };

  const fetchQueueTrafficForDevice = (deviceId: number, queue: string) => {
    setIsLoadingQueueMap(prev => ({ ...prev, [deviceId]: true }));
    fetch(`/api/monitoring/queue-traffic/${deviceId}?queue=${encodeURIComponent(queue)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const formatted = data.map((point: any) => ({
          ...point,
          time: formatTime(point.time)
        }));
        setDeviceQueueBandwidthSamples(prev => ({
          ...prev,
          [deviceId]: {
            ...(prev[deviceId] || {}),
            [queue]: formatted
          }
        }));
      })
      .catch(err => {
        console.error("fetch queue traffic error for", deviceId, queue, err);
      })
      .finally(() => {
        setIsLoadingQueueMap(prev => ({ ...prev, [deviceId]: false }));
      });
  };

  const fetchAlerts = () => {
    setIsLoadingAlerts(true);
    fetch(`/api/monitoring/alerts?workspace_id=${workspaceId || 0}&page=${alertPage}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.alerts) {
          setAlerts(data.alerts);
          setAlertTotalPages(data.totalPages || 1);
        } else {
          setAlerts(Array.isArray(data) ? data : []);
          setAlertTotalPages(1);
        }
        setIsLoadingAlerts(false);
      })
      .catch((err) => {
        console.error("fetch alerts error", err);
        setAlerts([]);
        setIsLoadingAlerts(false);
      });
  };

  const fetchAllTraffic = () => {
    if (initialTab === "interface") {
      pingDevices.forEach(d => {
        const mode = d.integrationMode?.toLowerCase() || "";
        if (mode.includes("snmp")) {
          const ifaces = d.monitoredInterfaces || [];
          ifaces.forEach(i => fetchTrafficForDevice(d.id, i));
        }
      });
    } else if (initialTab === "queue") {
      pingDevices.forEach(d => {
        const mode = d.integrationMode?.toLowerCase() || "";
        if (mode.includes("snmp")) {
          const queues = d.monitoredQueues || [];
          queues.forEach(q => fetchQueueTrafficForDevice(d.id, q));
        }
      });
    }
  };

  // Initial fetch for interfaces and queues when pingDevices changes
  useEffect(() => {
    pingDevices.forEach(device => {
      const mode = device.integrationMode?.toLowerCase() || "";
      if (mode.includes("snmp") && initialTab === "interface") {
        const ifaces = device.monitoredInterfaces || [];
        ifaces.forEach(i => fetchTrafficForDevice(device.id, i));
      } else if (mode.includes("snmp") && initialTab === "queue") {
        const queues = device.monitoredQueues || [];
        queues.forEach(q => fetchQueueTrafficForDevice(device.id, q));
      }
    });
  }, [pingDevices, initialTab]);







  useEffect(() => {

    let interval: any;

    const fetchPing = async () => {
      try {
        setPingError("");
        setIsLoadingPing(true);
        const url = workspaceId ? `/api/monitoring/ping?workspaceId=${workspaceId}` : `/api/monitoring/ping`;
        const res = await fetch(url);
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
            next[d.id] = (d.history || []).map(h => ({
              ...h,
              time: formatTime(h.time)
            }));
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
  }, [workspaceId]);

  // Global Polling Manager
  useEffect(() => {
    if (initialTab === "interface" || initialTab === "queue") {
      fetchAllTraffic();
      const tInt = setInterval(fetchAllTraffic, 10000);
      return () => clearInterval(tInt);
    }
    if (initialTab === "alerts") {
      fetchAlerts();
      const aInt = setInterval(fetchAlerts, 10000);
      return () => clearInterval(aInt);
    }
  }, [initialTab, workspaceId, alertPage, pingDevices]);

  useEffect(() => {
    if (!detailLogDeviceId) return;
    setIsLoadingLogs(true);
    fetch(`/api/monitoring/ping-logs/${detailLogDeviceId}?page=${detailLogPage}`)
      .then(r => r.ok ? r.json() : [])
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
          <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-100">
            Monitoring Ping
          </h2>
          <p className="m-0 text-[12px] text-slate-400 mb-3.5">
            Grafik latency ping perangkat yang sudah ditambahkan. Data diperbarui
            otomatis setiap beberapa detik dari backend.
          </p>

          {pingError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[11px] border border-red-200">
              {pingError}
            </div>
          )}

          {pingDevices.length === 0 ? (
            <div className="mt-2 rounded-xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg shadow-md shadow-black/20 px-3 py-4 text-center text-[11px] text-slate-400">
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
                    className="text-left rounded-xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg shadow-md shadow-black/20 p-3 hover:border-blue-400/70 hover:shadow-lg transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="m-0 text-[11px] text-slate-400">Grafik latency (ms)</p>
                        <p className="m-0 text-[13px] font-semibold text-slate-100">
                          {device.name} <span className="text-slate-400">· {device.ip}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Status:</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${device.status === "UP"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                          >
                            {device.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Interval:</span>
                            <select
                              className="px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900/50 text-slate-100 text-[11px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
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

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>
                            Latency saat ini: <span className="font-semibold text-slate-300">{currentLabel}</span>
                          </span>
                          <span>
                            Rata-rata: <span className="font-semibold text-slate-300">{avg.toFixed(1)} ms</span>
                            {" · "}
                            Min: <span className="font-semibold text-slate-300">{min.toFixed(1)} ms</span>
                            {" · "}
                            Max: <span className="font-semibold text-slate-300">{max.toFixed(1)} ms</span>
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
            <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/95 p-4 shadow-2xl shadow-black/60">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="m-0 text-[15px] font-semibold text-slate-100">
                    Detail ping – {expandedDevice.name}
                  </h3>
                  <p className="m-0 text-[11px] text-slate-400">
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
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 text-slate-400 hover:bg-slate-800/50 text-[11px]"
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

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      Latency saat ini:
                      {" "}
                      <span className="font-semibold text-slate-100">
                        {expandedStats.currentLabel}
                      </span>
                    </span>
                    <span>
                      Rata-rata:
                      {" "}
                      <span className="font-semibold text-slate-100">
                        {expandedStats.avg.toFixed(1)} ms
                      </span>
                      {" · "}
                      Min:
                      {" "}
                      <span className="font-semibold text-slate-100">
                        {expandedStats.min.toFixed(1)} ms
                      </span>
                      {" · "}
                      Max:
                      {" "}
                      <span className="font-semibold text-slate-100">
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
            <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-5 shadow-2xl shadow-black/60">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="m-0 text-[16px] font-semibold text-slate-100">
                    Detail Log Monitoring
                  </h3>
                  <p className="m-0 text-[12px] text-slate-400">
                    Riwayat ping perangkat ({pingDevices.find(d => d.id === detailLogDeviceId)?.name})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailLogDeviceId(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 text-slate-400 hover:bg-slate-800/50 text-[12px]"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[360px] overflow-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-800/50 text-slate-400 sticky top-0 border-b border-slate-800 outline outline-1 outline-slate-200">
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
                        <tr key={log.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                          <td className="px-5 py-2.5 text-slate-400 font-medium">
                            {new Date(log.created_at.endsWith('Z') ? log.created_at.slice(0, -1) : log.created_at).toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${log.status === "UP" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 font-medium text-slate-300">{log.latencyMs} ms</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-[12px] text-slate-400 font-medium">
                  Halaman {detailLogPage} dari {detailLogTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={detailLogPage <= 1 || isLoadingLogs}
                    onClick={() => setDetailLogPage(p => p - 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-400 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg hover:bg-slate-800/50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={detailLogPage >= detailLogTotalPages || isLoadingLogs}
                    onClick={() => setDetailLogPage(p => p + 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-400 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg hover:bg-slate-800/50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
    return (
      <section>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="m-0 text-[18px] font-semibold text-slate-100">
            Alert Monitoring (Real-time)
          </h2>
          {isLoadingAlerts && (
            <div className="w-4 h-4 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin"></div>
          )}
        </div>
        <p className="m-0 text-[12px] text-slate-400 mb-4">
          Riwayat kejadian status perangkat (UP/DOWN) yang terekam dalam sistem.
        </p>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg shadow-md shadow-black/20">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="px-4 py-2.5 text-[12px] font-semibold text-slate-400">
                  Waktu
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-slate-400">
                  Perangkat
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-slate-400">
                  Kejadian
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {(!alerts || alerts.length === 0) ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-400 text-[13px]"
                  >
                    Belum ada alert terekam.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const isDown = alert.status === "DOWN";
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-[12px] text-slate-400">
                        {new Date(alert.createdAt.endsWith('Z') ? alert.createdAt.slice(0, -1) : alert.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-medium text-slate-100">
                        {alert.deviceName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-400">
                        {isDown
                          ? "Perangkat terdeteksi Mati"
                          : "Perangkat kembali Normal"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDown
                            ? "bg-red-100 text-red-600"
                            : "bg-emerald-100 text-emerald-600"
                            }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-[12px] text-slate-400 font-medium">
            Halaman {alertPage} dari {alertTotalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={alertPage <= 1 || isLoadingAlerts}
              onClick={() => setAlertPage(p => p - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-400 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg hover:bg-slate-800/50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Sebelumnya
            </button>
            <button
              disabled={alertPage >= alertTotalPages || isLoadingAlerts}
              onClick={() => setAlertPage(p => p + 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-400 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg hover:bg-slate-800/50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </section>
    );
  };


  const renderInterface = () => {
    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-100">
          Monitoring Bandwidth per Interface
        </h2>
        <p className="m-0 text-[12px] text-slate-400 mb-3.5">
          Daftar grafik penggunaan bandwidth (rx/tx) untuk setiap router secara paralel.
        </p>

        {pingDevices.length === 0 ? (
          <p className="text-[12px] text-slate-400">Belum ada perangkat yang ditambahkan.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pingDevices.filter(d => d.integrationMode?.toLowerCase().includes("snmp")).map(d => {
              const interfaces = d.monitoredInterfaces || [];
              const isDown = d.status === "DOWN";
              const isLoading = isLoadingIfaceMap[d.id] || false;

              if (interfaces.length === 0) {
                 return (
                   <div key={d.id} className="rounded-2xl px-4 py-6 bg-slate-800/50/50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                      <p className="m-0 text-[13px] font-semibold text-slate-400">{d.name}</p>
                      <p className="m-0 text-[10px] text-slate-400">Tidak ada interface yang dipilih untuk dimonitor.</p>
                   </div>
                 );
              }

              return (
                <React.Fragment key={d.id}>
                  {interfaces.map(ifaceName => {
                    const interfaceSamplesMap = deviceInterfaceBandwidthSamples[d.id] || {};
                    const realBandwidthSamples = interfaceSamplesMap[ifaceName] || [];
                    
                    const bandwidthSamples: BandwidthPoint[] = realBandwidthSamples.length > 0 && !isDown
                      ? realBandwidthSamples
                      : [{ time: "00:00", rx: 0, tx: 0 }];

                    const rxValues = bandwidthSamples.map((p) => p.rx);
                    const txValues = bandwidthSamples.map((p) => p.tx);
                    const sum = (values: number[]) => values.reduce((acc, val) => acc + val, 0);

                    const rxAvg = rxValues.length ? sum(rxValues) / rxValues.length : 0;
                    const txAvg = txValues.length ? sum(txValues) / txValues.length : 0;
                    const rxMax = rxValues.length ? Math.max(...rxValues) : 0;
                    const txMax = txValues.length ? Math.max(...txValues) : 0;

                    const lastSample = bandwidthSamples[bandwidthSamples.length - 1] || { rx: 0, tx: 0 };

                    return (
                      <div
                        key={`${d.id}-${ifaceName}`}
                        className="rounded-2xl px-4 py-3 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/90 border border-slate-800 shadow-lg shadow-black/20 cursor-pointer hover:border-blue-300 transition-all group relative"
                        onClick={() => {
                          setSelectedDetailDeviceId(d.id);
                          setSelectedDetailQueueName(ifaceName);
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isDown ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <h3 className="m-0 text-[14px] font-bold text-slate-100">{d.name}</h3>
                            <span className="text-slate-300">/</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">{ifaceName}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>RX</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-sky-500" />
                              <span>TX</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <p className="m-0 text-[11px] text-slate-400">Statistik bandwidth interface</p>
                          {isLoading && realBandwidthSamples.length === 0 && (
                            <span className="animate-pulse text-[9px] text-blue-500 font-bold uppercase tracking-widest">
                              Loading...
                            </span>
                          )}
                        </div>

                        <BandwidthSparkline data={bandwidthSamples} />

                        <div className="mt-2 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
                            <span>
                              RX: {formatBandwidth(rxAvg)} avg, {formatBandwidth(rxMax)} max
                            </span>
                            <span>
                              TX: {formatBandwidth(txAvg)} avg, {formatBandwidth(txMax)} max
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>
                              Cur: RX {formatBandwidth(lastSample.rx)} / TX {formatBandwidth(lastSample.tx)}
                            </span>
                            {bandwidthSamples.length > 1 && (
                              <span>
                                {bandwidthSamples[0].time} - {bandwidthSamples[bandwidthSamples.length - 1].time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderQueue = () => {
    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-100">
          Monitoring Bandwidth per Queue (Mikrotik)
        </h2>
        <p className="m-0 text-[12px] text-slate-400 mb-3.5">
          Daftar grafik penggunaan bandwidth antrean (queue) Mikrotik secara paralel.
        </p>
        {pingDevices.length === 0 ? (
          <p className="text-[12px] text-slate-400">Belum ada perangkat yang ditambahkan.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pingDevices.filter(d => d.integrationMode?.toLowerCase().includes("snmp")).map(d => {
              const queues = d.monitoredQueues || [];
              const isDown = d.status === "DOWN";
              const isLoading = isLoadingQueueMap[d.id] || false;

              if (queues.length === 0) {
                 return (
                   <div key={d.id} className="rounded-2xl px-4 py-6 bg-slate-800/50/50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                      <p className="m-0 text-[13px] font-semibold text-slate-400">{d.name}</p>
                      <p className="m-0 text-[10px] text-slate-400">Tidak ada antrian yang dipilih untuk dimonitor.</p>
                   </div>
                 );
              }

              return (
                <React.Fragment key={d.id}>
                  {queues.map(qName => {
                    const queueSamplesMap = deviceQueueBandwidthSamples[d.id] || {};
                    const realBandwidthSamples = queueSamplesMap[qName] || [];
                    
                    const bandwidthSamples: BandwidthPoint[] = realBandwidthSamples.length > 0 && !isDown
                      ? realBandwidthSamples
                      : [{ time: "00:00", rx: 0, tx: 0 }];

                    const rxValues = bandwidthSamples.map((p) => p.rx);
                    const txValues = bandwidthSamples.map((p) => p.tx);
                    const sum = (values: number[]) => values.reduce((acc, val) => acc + val, 0);

                    const rxAvg = rxValues.length ? sum(rxValues) / rxValues.length : 0;
                    const txAvg = txValues.length ? sum(txValues) / txValues.length : 0;
                    const rxMax = rxValues.length ? Math.max(...rxValues) : 0;
                    const txMax = txValues.length ? Math.max(...txValues) : 0;
                    const rxMin = rxValues.length ? Math.min(...rxValues) : 0;
                    const txMin = txValues.length ? Math.min(...txValues) : 0;

                    const lastSample = bandwidthSamples[bandwidthSamples.length - 1] || { rx: 0, tx: 0 };

                    return (
                      <div
                        key={`${d.id}-${qName}`}
                        className="rounded-2xl px-4 py-3 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/90 border border-slate-800 shadow-lg shadow-black/20 cursor-pointer hover:border-blue-300 transition-all group relative"
                        onClick={() => {
                          setSelectedDetailDeviceId(d.id);
                          setSelectedDetailQueueName(qName);
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isDown ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <h3 className="m-0 text-[14px] font-bold text-slate-100">{d.name}</h3>
                            <span className="text-slate-300">/</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">{qName}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>RX</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-sky-500" />
                              <span>TX</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <p className="m-0 text-[11px] text-slate-400">Statistik bandwidth antrian</p>
                          {isLoading && realBandwidthSamples.length === 0 && (
                            <span className="animate-pulse text-[9px] text-blue-500 font-bold uppercase tracking-widest">
                              Loading...
                            </span>
                          )}
                        </div>

                        <BandwidthSparkline data={bandwidthSamples} />

                        <div className="mt-2 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
                            <span>
                              RX: {formatBandwidth(rxAvg)} avg, {formatBandwidth(rxMax)} max
                            </span>
                            <span>
                              TX: {formatBandwidth(txAvg)} avg, {formatBandwidth(txMax)} max
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>
                              Cur: RX {formatBandwidth(lastSample.rx)} / TX {formatBandwidth(lastSample.tx)}
                            </span>
                            {bandwidthSamples.length > 1 && (
                              <span>
                                {bandwidthSamples[0].time} - {bandwidthSamples[bandwidthSamples.length - 1].time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>
    );
  };



  const renderDetailModal = () => {
    if (!selectedDetailDeviceId) return null;

    // find device
    const d = pingDevices.find(x => x.id === selectedDetailDeviceId);
    if (!d) return null;

    const isDown = d.status === "DOWN";

    // Choose which data source to use based on the current tab
    const isQueueTab = initialTab === "queue";
    
    // For Detail Modal in Queue or Interface tab, we show the specifically clicked item, or default to the first one.
    const autoFallbackName = isQueueTab 
      ? ((d.monitoredQueues && d.monitoredQueues.length > 0) ? d.monitoredQueues[0] : "")
      : ((d.monitoredInterfaces && d.monitoredInterfaces.length > 0) ? d.monitoredInterfaces[0] : "");

    const selectedItemName = selectedDetailQueueName || autoFallbackName || "Unknown";

    const realBandwidthSamples = isQueueTab
      ? (deviceQueueBandwidthSamples[d.id]?.[selectedItemName] || [])
      : (deviceInterfaceBandwidthSamples[d.id]?.[selectedItemName] || []);

    const isLoading = isQueueTab
      ? (isLoadingQueueMap[d.id] || false)
      : (isLoadingIfaceMap[d.id] || false);

    const bandwidthSamples: BandwidthPoint[] = realBandwidthSamples.length > 0 && !isDown
      ? realBandwidthSamples
      : [{ time: "00:00", rx: 0, tx: 0 }];

    const rxValues = bandwidthSamples.map((p) => p.rx);
    const txValues = bandwidthSamples.map((p) => p.tx);

    const sum = (values: number[]) => values.reduce((acc, val) => acc + val, 0);

    const rxAvg = rxValues.length ? sum(rxValues) / rxValues.length : 0;
    const txAvg = txValues.length ? sum(txValues) / txValues.length : 0;
    const rxMax = rxValues.length ? Math.max(...rxValues) : 0;
    const txMax = txValues.length ? Math.max(...txValues) : 0;

    const lastSample = bandwidthSamples[bandwidthSamples.length - 1] || { rx: 0, tx: 0 };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedDetailDeviceId(null); setSelectedDetailQueueName(null); }}>
        <div className="w-full max-w-4xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50/50">
            <div>
              <h3 className="m-0 text-[18px] font-bold text-slate-100 line-clamp-1">{d.name}</h3>
              <p className="m-0 text-[12px] text-slate-400 mt-0.5">{isQueueTab ? 'Queue' : 'Interface'} <span className="font-semibold text-slate-300">{selectedItemName}</span></p>
            </div>
            <button
              onClick={() => { setSelectedDetailDeviceId(null); setSelectedDetailQueueName(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between mb-5 gap-4">
              <div className="flex items-center gap-5 text-[12px] text-slate-400 font-medium">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>RX Average</div>
                  <span className="text-[18px] font-bold text-slate-100">{formatBandwidth(rxAvg)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>TX Average</div>
                  <span className="text-[18px] font-bold text-slate-100">{formatBandwidth(txAvg)}</span>
                </div>
                <div className="w-px h-10 bg-slate-200 mx-2 hidden sm:block"></div>
                <div className="flex flex-col gap-1">
                  <div className="text-slate-400">Current RX</div>
                  <span className="text-[15px] font-semibold text-slate-300">{formatBandwidth(lastSample.rx)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-slate-400">Current TX</div>
                  <span className="text-[15px] font-semibold text-slate-300">{formatBandwidth(lastSample.tx)}</span>
                </div>
                <div className="w-px h-10 bg-slate-200 mx-2 hidden sm:block"></div>
                <div className="flex flex-col gap-1">
                  <div className="text-slate-400">Peak RX / TX</div>
                  <span className="text-[13px] font-medium text-slate-400">{formatBandwidth(rxMax)} / {formatBandwidth(txMax)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-800 rounded-xl px-2 py-4 shadow-inner shadow-slate-100">
              {isLoading && bandwidthSamples.length <= 1 ? (
                <div className="flex items-center justify-center h-[300px] text-slate-400 font-medium text-[13px]">Memuat data seketika...</div>
              ) : (
                <BandwidthSparkline data={bandwidthSamples} showAxes={true} height={300} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="m-0 mb-1 text-[22px] font-bold text-slate-100">
          Monitoring Jaringan {workspaceName ? `- ${workspaceName}` : ""}
        </h1>
        <p className="m-0 text-[13px] text-slate-400">
          Pantau ping, peringatan (alerts), dan penggunaan bandwidth perangkat secara keseluruhan.
        </p>
      </header>

      <div className="mt-4">
        {initialTab === "ping" && renderPing()}
        {initialTab === "alerts" && renderAlerts()}
        {initialTab === "interface" && renderInterface()}
        {initialTab === "queue" && renderQueue()}
      </div>
      
      {renderDetailModal()}
    </section>
  );
};

export default MonitoringSection;
