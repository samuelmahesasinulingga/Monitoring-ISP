import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Sidebar, { MenuKey } from "./Sidebar";
import { useTheme } from "../context/ThemeContext";

type CustomerPortalProps = {
  customerId: number;
  onLogout: () => void;
};

const CustomerPortal: React.FC<CustomerPortalProps> = ({ customerId, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth >= 1024;
    return true;
  });

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchUsage();
    fetchInvoices();
  }, [customerId]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/customer/${customerId}/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("fetch dashboard error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/customer/${customerId}/usage`);
      if (res.ok) {
        const data = await res.json();
        setUsageData(data.map((d: any) => ({
          time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mbps: (d.bytes * 8) / (1024 * 1024)
        })));
      }
    } catch (err) {
      console.error("fetch usage error", err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/customer/${customerId}/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("fetch invoices error", err);
    }
  };

  const renderContent = () => {
    if (activeMenu === "dashboard") {
      return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-main-primary)] mb-2">Selamat Datang, {dashboardData?.customer?.name}!</h2>
            <p className="text-[var(--text-main-secondary)]">Berikut adalah ringkasan layanan internet Anda saat ini.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl p-6 shadow-lg hover:-translate-y-1 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                   📦
                </div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Paket Aktif</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main-primary)] mb-1">
                {dashboardData?.services?.[0]?.planName || "Belum Ada Paket"}
              </h3>
              <p className="text-xs text-[var(--text-main-secondary)]">
                {dashboardData?.services?.[0]?.bandwidthMbps || 0} Mbps Bandwidth
              </p>
            </div>

            <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl p-6 shadow-lg hover:-translate-y-1 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                   ⚡
                </div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Latency</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main-primary)] mb-1">
                {dashboardData?.latency || 0} <span className="text-sm font-normal text-[var(--text-main-secondary)]">ms</span>
              </h3>
              <p className="text-xs text-[var(--text-main-secondary)]">Real-time Ping ke Perangkat</p>
            </div>

            <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl p-6 shadow-lg hover:-translate-y-1 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                   📜
                </div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Tagihan Terakhir</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main-primary)] mb-1">
                {invoices?.[0]?.status === "unpaid" ? "Unpaid" : "Paid"}
              </h3>
              <p className="text-xs text-[var(--text-main-secondary)]">Invoice #{invoices?.[0]?.id || "---"}</p>
            </div>
          </div>

          <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-main-primary)]">Grafik Penggunaan Bandwidth (24 Jam)</h3>
              <button 
                onClick={fetchUsage}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                Refresh Data
              </button>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="var(--text-main-secondary)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--text-main-secondary)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value} Mbps`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-main-bg)', border: '1px solid var(--border-main)', borderRadius: '12px', color: 'var(--text-main-primary)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mbps" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorUsage)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    if (activeMenu === "monitoring") {
      return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
          <header className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-main-primary)] mb-2">Monitoring Performa</h2>
            <p className="text-[var(--text-main-secondary)]">Detail statistik penggunaan jaringan Anda secara real-time.</p>
          </header>
          <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl p-8 shadow-lg h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="time" stroke="var(--text-main-secondary)" fontSize={10} />
                <YAxis stroke="var(--text-main-secondary)" fontSize={10} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--card-main-bg)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="mbps" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (activeMenu === "billing") {
      return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
          <header className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-main-primary)] mb-2">Riwayat Tagihan</h2>
            <p className="text-[var(--text-main-secondary)]">Daftar invoice dan status pembayaran layanan ISP Anda.</p>
          </header>
          <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[var(--bg-main)] text-[var(--text-main-secondary)] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">ID Invoice</th>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tgl Terbit</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[var(--text-main-secondary)]">Belum ada riwayat tagihan.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-[var(--border-main)] hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-6 py-4 font-mono text-blue-500">#INV-{inv.id}</td>
                      <td className="px-6 py-4 text-[var(--text-main-primary)]">
                        {new Date(inv.periodStart).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-[var(--text-main-primary)]">
                        Rp {inv.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-main-secondary)]">
                        {new Date(inv.createdAt).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-main)]">
        <div className="text-[var(--text-main-primary)]">Memuat data portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] text-[var(--text-main-primary)] transition-colors duration-300">
      <div className={`fixed top-0 right-0 h-14 bg-[var(--bg-topbar)] backdrop-blur-md z-20 flex items-center justify-between px-4 border-b border-[var(--border-main)] transition-all duration-300 ${isSidebarOpen ? 'left-0 lg:left-[280px]' : 'left-0'}`}>
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 mr-3 rounded-md text-[var(--text-main-secondary)] hover:text-[var(--text-main-primary)] hover:bg-[var(--border-main)] transition-colors focus:outline-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="font-bold text-[var(--text-main-primary)] text-[14px] flex items-center gap-2">
            Portal Pelanggan
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-[var(--border-main)] text-[var(--text-main-primary)] hover:opacity-80 border border-[var(--border-main)] shadow-sm">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
          if (typeof window !== "undefined" && window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
        workspaceName={dashboardData?.customer?.name}
        onLogout={onLogout}
        currentUserEmail={dashboardData?.customer?.email}
        currentUserRole="customer"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className={`flex-1 p-4 pt-20 transition-all duration-300 ${isSidebarOpen ? 'lg:p-6 lg:pt-20 lg:ml-[280px]' : 'lg:p-6 lg:pt-20 lg:ml-0'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default CustomerPortal;
