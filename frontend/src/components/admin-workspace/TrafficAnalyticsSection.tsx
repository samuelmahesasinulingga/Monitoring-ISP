import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type Talker = {
  ip: string;
  bytes: number;
};

type ProtoData = {
  protocol: number;
  name: string;
  bytes: number;
};

type FlowLog = {
  srcIp: string;
  dstIp: string;
  protocol: string;
  srcPort: number;
  dstPort: number;
  bytes: number;
  capturedAt: string;
};

type DeviceMap = { [ip: string]: string };

type TrafficAnalyticsSectionProps = {
  workspaceName?: string;
  workspaceId?: number;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ef4444", "#8b5cf6"];

const TrafficAnalyticsSection: React.FC<TrafficAnalyticsSectionProps> = ({ workspaceId }) => {
  const [allDevices, setAllDevices] = useState<{ id: number, ip: string, name: string, netflowPort: number }[]>([]);
  const [activeDevices, setActiveDevices] = useState<number[]>([]);
  const [deviceMap, setDeviceMap] = useState<DeviceMap>({});
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(""); // empty = all
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(""); // empty = all

  const [topTalkers, setTopTalkers] = useState<Talker[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [protoBreakdown, setProtoBreakdown] = useState<ProtoData[]>([]);
  const [flowLogs, setFlowLogs] = useState<FlowLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState<string>("0"); // 0 = all/latest
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeviceMetadata = async () => {
    if (!workspaceId) return;
    try {
      const [exportersRes, allDevicesRes] = await Promise.all([
        fetch(`/api/analytics/active-devices?workspaceId=${workspaceId}`),
        fetch(`/api/devices?workspaceId=${workspaceId}`)
      ]);

      if (!allDevicesRes.ok || !exportersRes.ok) {
        console.error("Fetch failed", allDevicesRes.status, exportersRes.status);
        return;
      }

      const exporters = await exportersRes.json();
      const allDevicesData = await allDevicesRes.json();

      if (!Array.isArray(allDevicesData)) {
        console.error("allDevicesData is not an array", allDevicesData);
        return;
      }

      const mapping: DeviceMap = {};
      const devList: { id: number, ip: string, name: string, netflowPort: number }[] = [];
      allDevicesData.forEach((d: any) => {
        mapping[d.ip] = d.name;
        devList.push({ id: d.id, ip: d.ip, name: d.name, netflowPort: d.netflowPort || 2055 });
      });

      setAllDevices(devList);
      setActiveDevices(exporters || []);
      setDeviceMap(mapping);

      setSelectedDeviceId(prev => {
        if (prev !== "") return prev;
        const savedDeviceId = localStorage.getItem(`selectedDeviceId_${workspaceId}`);
        // Default to "All Devices" ("") if nothing is saved
        if (savedDeviceId && (savedDeviceId === "" || devList.some(d => d.id.toString() === savedDeviceId))) {
          return savedDeviceId;
        }
        return "";
      });

    } catch (err) {
      console.error("Metadata fetch error", err);
    }
  };

  const fetchCustomers = async () => {
    if (!workspaceId) return;
    try {
      const custRes = await fetch(`/api/customers?workspaceId=${workspaceId}`);
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(data || []);
      }
    } catch (err) {
      console.error("Fetch customers error", err);
    }
  };

  const fetchData = async () => {
    if (!workspaceId) return;
    try {
      const deviceParam = selectedDeviceId ? `&deviceId=${selectedDeviceId}` : "";
      const customerParam = selectedCustomerId ? `&customerId=${selectedCustomerId}` : "";
      const durationParam = selectedDuration !== "0" ? `&duration=${selectedDuration}` : "";

      const [topRes, protoRes, logsRes] = await Promise.all([
        fetch(`/api/analytics/top-talkers?workspaceId=${workspaceId}&limit=5${deviceParam}${customerParam}${durationParam}`),
        fetch(`/api/analytics/top-protocols?workspaceId=${workspaceId}${deviceParam}${customerParam}${durationParam}`),
        fetch(`/api/analytics/flow-logs?workspaceId=${workspaceId}${deviceParam}${customerParam}&page=${currentPage}&limit=30`)
      ]);

      const topData = await topRes.json();
      const protoData = await protoRes.json();
      const logsData = await logsRes.json();

      setTopTalkers(topData || []);
      setProtoBreakdown(protoData || []);
      if (logsData) {
        setFlowLogs(logsData.logs || []);
        setTotalPages(logsData.totalPages || 1);
      } else {
        setFlowLogs([]);
      }
    } catch (err) {
      console.error("Traffic Analytics fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial settings to sync dropdown
  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces`)
      .then(res => res.json())
      .then(list => {
        const thisWs = list.find((w: any) => w.id === workspaceId);
        if (thisWs) {
          const val = thisWs.netflowMonitoringMode === "snapshot" 
            ? thisWs.netflowSnapshotInterval.toString() 
            : "0";
          setSelectedDuration(val);
        }
      });
  }, [workspaceId]);

  const updateMonitoringMode = async (val: string) => {
    if (!workspaceId) return;
    const interval = parseInt(val);
    const mode = interval > 0 ? "snapshot" : "continuous";
    
    try {
      await fetch(`/api/workspaces/${workspaceId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          netflowMonitoringMode: mode,
          netflowSnapshotInterval: interval
        })
      });
    } catch (err) {
      console.error("Failed to update netflow settings", err);
    }
  };

  useEffect(() => {
    fetchDeviceMetadata();
    fetchCustomers();
    const metaInterval = setInterval(() => {
      fetchDeviceMetadata();
      fetchCustomers();
    }, 30000);
    return () => clearInterval(metaInterval);
  }, [workspaceId]);

  useEffect(() => {
    fetchData();

    // UI will check for new data every 10 seconds regardless of interval mode
    // to ensure snapshots appear as soon as they are available in the database.
    const refreshMs = 10000; 

    const interval = setInterval(() => {
      fetchData();
    }, refreshMs);

    return () => clearInterval(interval);
  }, [workspaceId, selectedDeviceId, selectedCustomerId, selectedDuration, currentPage]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading && topTalkers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Traffic Analytics</h2>
          <p className="text-[13px] text-slate-500">Analisis trafik real-time menggunakan metadata sFlow & Traffic Flow.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Device Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Device:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                const val = e.target.value;
                setIsLoading(true);
                setCurrentPage(1);
                setSelectedDeviceId(val);
                if (workspaceId) {
                  localStorage.setItem(`selectedDeviceId_${workspaceId}`, val);
                }
              }}
              className="bg-transparent border-none text-[12px] font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="">Semua Perangkat</option>
              {allDevices.map(dev => (
                <option key={dev.id} value={dev.id.toString()}>
                  {dev.name} {activeDevices.includes(dev.id) ? "●" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const val = e.target.value;
                setIsLoading(true);
                setCurrentPage(1);
                setSelectedCustomerId(val);
              }}
              className="bg-transparent border-none text-[12px] font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="">Semua Pelanggan</option>
              {customers.map(c => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Window Filter (Sampling) */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Window:</span>
            <select
              value={selectedDuration}
              onChange={(e) => {
                const val = e.target.value;
                setIsLoading(true);
                setCurrentPage(1);
                setSelectedDuration(val);
                updateMonitoringMode(val);
              }}
              className="bg-transparent border-none text-[12px] font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="0">Continuous (Real-time)</option>
              <option value="1">Snapshot 1 Menit</option>
              <option value="3">Snapshot 3 Menit</option>
              <option value="5">Snapshot 5 Menit</option>
            </select>
          </div>

          {selectedDeviceId === "" ? (
            activeDevices.length > 0 ? (
              <div className="px-3 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full border border-blue-100 flex items-center gap-1.5 h-full">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                {activeDevices.length} ACTIVE
              </div>
            ) : (
              <div className="px-3 py-1 bg-slate-50 text-slate-500 text-[11px] font-bold rounded-full border border-slate-200 flex items-center gap-1.5 h-full">
                OFFLINE
              </div>
            )
          ) : activeDevices.includes(parseInt(selectedDeviceId)) ? (
            <div className="px-3 py-1 bg-green-50 text-green-700 text-[11px] font-bold rounded-full border border-green-100 flex items-center gap-1.5 h-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              ACTIVE
            </div>
          ) : (
            <div className="px-3 py-1 bg-slate-50 text-slate-500 text-[11px] font-bold rounded-full border border-slate-200 flex items-center gap-1.5 h-full">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              NO TRAFFIC
            </div>
          )}
          <button 
            onClick={() => {
              setIsLoading(true);
              fetchData();
              fetchDeviceMetadata();
            }} 
            className="p-2 bg-slate-50 text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 hover:bg-white transition-all disabled:opacity-50"
            disabled={isLoading}
            title="Refresh Data"
          >
            {isLoading ? "..." : "🔄"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Talkers List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Top Talkers (Last 1h)</h3>
            <span className="text-[11px] text-slate-400">Total Consumption</span>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
            {topTalkers.length > 0 ? topTalkers.map((talker, idx) => {
              const maxBytes = topTalkers[0].bytes || 1;
              const percentage = (talker.bytes / maxBytes) * 100;
              return (
                <div key={talker.ip} className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="font-mono text-slate-700 font-semibold">{talker.ip}</span>
                    <span className="font-bold text-blue-600">{formatBytes(talker.bytes)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="text-4xl mb-2">📉</span>
                <p className="text-[12px]">Belum ada data Trafik terdeteksi.</p>
              </div>
            )}
          </div>
        </div>

        {/* Protocol Breakdown Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider mb-2">Protocol Breakdown</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protoBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="bytes"
                  nameKey="name"
                >
                  {protoBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatBytes(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-time Flow Stream */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">
              {selectedDuration === "0" ? "Real-time Traffic Flow (Log)" : `Snapshot Traffic Flow (${selectedDuration} Min)`}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {selectedDuration === "0" 
                ? "Streaming data trafik real-time dari router terpilih." 
                : `Menampilkan data sampling trafik dari router terpilih (${selectedDuration} menit interval).`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedDuration === "0" ? (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded uppercase shrink-0">Live Feed</span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded uppercase shrink-0">Snapshot Active</span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-tighter font-bold">
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Source IP</th>
                <th className="px-6 py-3">Dest IP</th>
                <th className="px-6 py-3">Protocol</th>
                <th className="px-6 py-3">Ports</th>
                <th className="px-6 py-3 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flowLogs.length > 0 ? flowLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-400">
                    {new Date(log.capturedAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-3 font-mono font-medium text-slate-700">{log.srcIp}</td>
                  <td className="px-6 py-3 font-mono text-slate-500">{log.dstIp}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.protocol === 'TCP' ? 'bg-blue-100 text-blue-700' :
                      log.protocol === 'UDP' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {log.protocol}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-slate-500 text-[11px]">
                    {log.srcPort} → {log.dstPort}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-800">
                    {formatBytes(log.bytes)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Menunggu trafik masuk... (Pastikan Traffic Flow di Router diarahkan ke Port {allDevices.find(d => d.id.toString() === selectedDeviceId)?.netflowPort || 2055})
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[12px]">
            <span className="text-slate-500 font-medium">Halaman <strong className="text-slate-700">{currentPage}</strong> dari <strong className="text-slate-700">{totalPages}</strong></span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficAnalyticsSection;
