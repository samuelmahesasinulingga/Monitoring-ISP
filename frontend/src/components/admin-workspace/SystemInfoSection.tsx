import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  Tooltip,
} from "recharts";

interface ServerInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptime: number;
  cpuCores: number;
}

interface MemoryStat {
  total: number;
  used: number;
  free: number;
}

interface StorageStat {
  total: number;
  used: number;
  free: number;
}

interface CpuStat {
  usagePercent: number;
}

interface NetworkIO {
  rxBytes: number;
  txBytes: number;
}

interface DiskIO {
  readBytes: number;
  writeBytes: number;
}

interface SystemMetrics {
  serverInfo: ServerInfo;
  memory: MemoryStat;
  storage: StorageStat;
  cpu: CpuStat;
  networkIO: NetworkIO;
  diskIO: DiskIO;
}

interface ChartDataPoint {
  time: string;
  cpu: number;
  rx: number;
  tx: number;
  read: number;
  write: number;
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `up ${d > 0 ? d + " days, " : ""}${h} hours, ${m} minutes`;
};

const formatBytes = (bytes: number, decimals = 1) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatSpeed = (bytes: number) => {
  return formatBytes(bytes) + "/s";
};

// Donut Chart Component
const DonutChart = ({ percent, color, label, subLabel }: { percent: number, color: string, label: string, subLabel: string }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-36 h-36">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-[var(--border-main)]"
          />
          {/* Progress circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[var(--text-main-primary)]">{Math.round(percent)}%</span>
          <span className="text-xs text-[var(--text-main-secondary)] font-semibold mt-1">Used</span>
        </div>
      </div>
      <div className="mt-4 text-xs font-semibold text-[var(--text-main-secondary)] tracking-wider">
        {label}
      </div>
    </div>
  );
};

const SystemInfoSection: React.FC = () => {
  const [isActive, setIsActive] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("systemInfoActive") === "true";
    }
    return false;
  });

  const handleActivate = () => {
    setIsActive(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("systemInfoActive", "true");
    }
  };
  const [metrics, setMetrics] = useState<SystemMetrics | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("systemInfoMetrics");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return null;
  });
  const [history, setHistory] = useState<ChartDataPoint[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("systemInfoHistory");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("systemInfoMetrics");
    }
    return true;
  });

  // Previous counters for calculating speed (rates per second)
  const [prevNet, setPrevNet] = useState<NetworkIO | null>(null);
  const [prevDisk, setPrevDisk] = useState<DiskIO | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Computed rates
  const [rates, setRates] = useState({ rx: 0, tx: 0, read: 0, write: 0 });

  useEffect(() => {
    if (!isActive) return;

    let intervalId: ReturnType<typeof setInterval>;

    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/system/metrics");
        if (res.ok) {
          const data: SystemMetrics = await res.json();
          setMetrics(data);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("systemInfoMetrics", JSON.stringify(data));
          }

          const now = Date.now();
          const timeLabel = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

          let rxRate = 0;
          let txRate = 0;
          let readRate = 0;
          let writeRate = 0;

          if (prevNet && prevDisk && lastFetchTime) {
            const timeDiffSec = (now - lastFetchTime) / 1000;
            if (timeDiffSec > 0) {
              rxRate = Math.max(0, (data.networkIO.rxBytes - prevNet.rxBytes) / timeDiffSec);
              txRate = Math.max(0, (data.networkIO.txBytes - prevNet.txBytes) / timeDiffSec);
              readRate = Math.max(0, (data.diskIO.readBytes - prevDisk.readBytes) / timeDiffSec);
              writeRate = Math.max(0, (data.diskIO.writeBytes - prevDisk.writeBytes) / timeDiffSec);
            }
          }

          setRates({ rx: rxRate, tx: txRate, read: readRate, write: writeRate });
          setPrevNet(data.networkIO);
          setPrevDisk(data.diskIO);
          setLastFetchTime(now);

          setHistory(prev => {
            const newHistory = [...prev, {
              time: timeLabel,
              cpu: data.cpu.usagePercent,
              rx: rxRate,
              tx: txRate,
              read: readRate,
              write: writeRate
            }];
            // Keep last 20 data points
            const finalHistory = newHistory.length > 20 ? newHistory.slice(newHistory.length - 20) : newHistory;
            if (typeof window !== "undefined") {
              sessionStorage.setItem("systemInfoHistory", JSON.stringify(finalHistory));
            }
            return finalHistory;
          });

          if (isLoading) setIsLoading(false);
        }
      } catch (err) {
        console.error("fetch metrics err", err);
      }
    };

    fetchMetrics();
    intervalId = setInterval(fetchMetrics, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, prevNet, prevDisk, lastFetchTime, isLoading]);

  if (!isActive) {
    return (
      <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-8 md:p-12 flex flex-col items-center justify-center shadow-lg text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
          <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-main-primary)] mb-2">Monitor Sistem Server</h2>
        <p className="text-[13px] text-[var(--text-main-secondary)] max-w-md mb-6 leading-relaxed">
          Aktifkan modul ini untuk memantau penggunaan CPU, Memory, Storage, dan performa I/O jaringan server secara <span className="text-[var(--text-main-primary)] font-semibold">real-time</span>.
        </p>
        <button 
          onClick={handleActivate} 
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold rounded-full transition-all shadow-lg shadow-indigo-500/20 border border-indigo-400/50 cursor-pointer"
        >
          Aktifkan Monitor Sistem
        </button>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[var(--border-main)] border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-[var(--text-main-secondary)] text-sm">Loading System Info...</p>
        </div>
      </div>
    );
  }

  const { serverInfo, memory, storage, cpu } = metrics;

  const memPercent = (memory.used / memory.total) * 100;
  const storagePercent = storage.total > 0 ? (storage.used / storage.total) * 100 : 0;

  return (
    <div className="space-y-6 text-[var(--text-main-secondary)] font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-main-primary)]">System Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Server Info Card */}
        <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
            <h3 className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Server Info</h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-3">
              <span className="text-[var(--text-main-secondary)]">Hostname</span>
              <span className="font-semibold text-[var(--text-main-primary)]">{serverInfo.hostname}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-3">
              <span className="text-[var(--text-main-secondary)]">OS</span>
              <span className="font-semibold text-[var(--text-main-primary)]">{serverInfo.os}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-3">
              <span className="text-[var(--text-main-secondary)]">Kernel</span>
              <span className="font-semibold text-[var(--text-main-primary)] text-xs">{serverInfo.kernel}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-3">
              <span className="text-[var(--text-main-secondary)]">Uptime</span>
              <span className="font-semibold text-[var(--text-main-primary)] text-xs">{formatUptime(serverInfo.uptime)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-3">
              <span className="text-[var(--text-main-secondary)]">CPU Cores</span>
              <span className="font-semibold text-[var(--text-main-primary)]">{serverInfo.cpuCores} cores</span>
            </div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col group">
          <div className="absolute top-0 left-1/2 w-48 h-48 bg-purple-500/5 rounded-full -ml-24 -mt-24 blur-3xl group-hover:bg-purple-500/10 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-4 z-10">
            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
            <h3 className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Memory</h3>
          </div>
          <div className="flex-1 flex items-center justify-center z-10">
            <DonutChart
              percent={memPercent}
              color="#a855f7"
              label={`${formatBytes(memory.used)} / ${formatBytes(memory.total)}`}
              subLabel="Used"
            />
          </div>
        </div>

        {/* Storage Card */}
        <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-4 z-10">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            <h3 className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Storage (/)</h3>
          </div>
          <div className="flex-1 flex items-center justify-center z-10">
            <DonutChart
              percent={storagePercent}
              color="#f59e0b"
              label={`${formatBytes(storage.used)} / ${formatBytes(storage.total)}`}
              subLabel="Used"
            />
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* CPU Usage Chart */}
        <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-5 shadow-lg group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <h3 className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">CPU Usage</h3>
            </div>
            <div className="font-mono text-sm font-bold text-blue-400">
              {cpu.usagePercent.toFixed(1)}%
            </div>
          </div>
          <div className="h-28 mt-4 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-main-bg)', borderColor: 'var(--border-main)', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6' }}
                  labelStyle={{ color: 'var(--text-main-secondary)' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network I/O Chart */}
        <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-5 shadow-lg group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
              <h3 className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Network I/O</h3>
            </div>
            <div className="flex gap-3 text-xs font-mono font-bold">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ↓ {formatSpeed(rates.rx)}
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                ↑ {formatSpeed(rates.tx)}
              </span>
            </div>
          </div>
          <div className="h-28 mt-4 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-main-bg)', borderColor: 'var(--border-main)', fontSize: '12px', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-main-secondary)' }}
                  formatter={(value: any) => formatSpeed(value)}
                />
                <Line type="monotone" dataKey="rx" name="RX" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="tx" name="TX" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disk I/O Chart */}
        <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-xl p-5 shadow-lg group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              <h3 className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Disk I/O</h3>
            </div>
            <div className="flex gap-3 text-xs font-mono font-bold">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                R: {formatSpeed(rates.read)}
              </span>
              <span className="text-rose-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                W: {formatSpeed(rates.write)}
              </span>
            </div>
          </div>
          <div className="h-28 mt-4 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-main-bg)', borderColor: 'var(--border-main)', fontSize: '12px', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-main-secondary)' }}
                  formatter={(value: any) => formatSpeed(value)}
                />
                <Line type="monotone" dataKey="read" name="Read" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="write" name="Write" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemInfoSection;
