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
  const [allDevices, setAllDevices] = useState<{ip: string, name: string}[]>([]);
  const [activeDevices, setActiveDevices] = useState<string[]>([]);
  const [deviceMap, setDeviceMap] = useState<DeviceMap>({});
  const [selectedDevice, setSelectedDevice] = useState<string>(""); // empty = all
  
  const [topTalkers, setTopTalkers] = useState<Talker[]>([]);
  const [protoBreakdown, setProtoBreakdown] = useState<ProtoData[]>([]);
  const [flowLogs, setFlowLogs] = useState<FlowLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeviceMetadata = async () => {
    if (!workspaceId) return;
    try {
      const [exportersRes, allDevicesRes] = await Promise.all([
        fetch(`/api/analytics/active-devices?workspaceId=${workspaceId}`),
        fetch(`/api/devices?workspaceId=${workspaceId}`)
      ]);
      
      const exporters = await exportersRes.json();
      const allDevicesData = await allDevicesRes.json();
      
      const mapping: DeviceMap = {};
      const devList: {ip: string, name: string}[] = [];
      allDevicesData.forEach((d: any) => {
        mapping[d.ip] = d.name;
        devList.push({ ip: d.ip, name: d.name });
      });
      
      setAllDevices(devList);
      setActiveDevices(exporters || []);
      setDeviceMap(mapping);
    } catch (err) {
      console.error("Metadata fetch error", err);
    }
  };

  const fetchData = async () => {
    if (!workspaceId) return;
    try {
      const deviceParam = selectedDevice ? `&deviceIp=${selectedDevice}` : "";
      
      const [topRes, protoRes, logsRes] = await Promise.all([
        fetch(`/api/analytics/top-talkers?workspaceId=${workspaceId}&limit=5${deviceParam}`),
        fetch(`/api/analytics/top-protocols?workspaceId=${workspaceId}${deviceParam}`),
        fetch(`/api/analytics/flow-logs?workspaceId=${workspaceId}${deviceParam}`)
      ]);

      const topData = await topRes.json();
      const protoData = await protoRes.json();
      const logsData = await logsRes.json();

      setTopTalkers(topData || []);
      setProtoBreakdown(protoData || []);
      setFlowLogs(logsData || []);
    } catch (err) {
      console.error("Traffic Analytics fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceMetadata();
    const metaInterval = setInterval(fetchDeviceMetadata, 30000);
    return () => clearInterval(metaInterval);
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [workspaceId, selectedDevice]);

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
                    value={selectedDevice}
                    onChange={(e) => {
                        setIsLoading(true);
                        setSelectedDevice(e.target.value);
                    }}
                    className="bg-transparent border-none text-[12px] font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="">All Routers (Combined)</option>
                    {allDevices.map(dev => (
                        <option key={dev.ip} value={dev.ip}>
                          {dev.name} {activeDevices.includes(dev.ip) ? "●" : ""}
                        </option>
                    ))}
                </select>
            </div>

            <div className="px-3 py-1 bg-green-50 text-green-700 text-[11px] font-bold rounded-full border border-green-100 flex items-center gap-1.5 h-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                ACTIVE
            </div>
            <button onClick={fetchData} className="p-2 bg-slate-50 text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 hover:bg-white transition-all">
               🔄
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
                <p className="text-[12px]">Belum ada data sFlow terdeteksi.</p>
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
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Real-time Traffic Flow (Log)</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded uppercase">Live Feed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-tighter font-bold">
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Source IP</th>
                <th className="px-6 py-3">Dest IP</th>
                <th className="px-6 py-3">Proto</th>
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.protocol === 'TCP' ? 'bg-blue-100 text-blue-700' : 
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
                    Menunggu trafik masuk... (Pastikan Traffic Flow di Router diarahkan ke Port 2055 atau sFlow ke Port 6343)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrafficAnalyticsSection;
