import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

interface SecurityAlert {
  id: number;
  workspaceId: number;
  deviceId?: number;
  alertType: string;
  sourceIp: string;
  destinationIp: string;
  severity: string;
  description: string;
  metricValue: number;
  isResolved: boolean;
  createdAt: string;
}

interface SecuritySectionProps {
  workspaceId?: number;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({ workspaceId }) => {
  const { notify } = useNotification();
  const { showConfirm } = useConfirmDialog();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [devices, setDevices] = useState<{id: number, name: string}[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevices = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/devices?workspaceId=${workspaceId}`);
      if (res.ok) setDevices(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const url = `/api/security/alerts?workspaceId=${workspaceId}${selectedDeviceId ? `&deviceId=${selectedDeviceId}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [workspaceId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [workspaceId, selectedDeviceId]);

  const handleResolve = async (id: number) => {
    try {
      const res = await fetch(`/api/security/alerts/${id}/resolve`, { method: "PUT" });
      if (res.ok) {
        notify("Alert ditandai sebagai selesai.", "success");
        fetchAlerts();
      }
    } catch (err) {
      notify("Gagal memproses alert.", "error");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: "Hapus Alert",
      message: "Apakah Anda yakin ingin menghapus log peringatan keamanan ini?",
      confirmLabel: "Hapus",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/security/alerts/${id}`, { method: "DELETE" });
          if (res.ok) {
            notify("Log alert berhasil dihapus.", "success");
            fetchAlerts();
          }
        } catch (err) {
          notify("Gagal menghapus log.", "error");
        }
      },
    });
  };

  const getSeverityBadge = (sev: string) => {
    const base = "px-2 py-0.5 rounded-full text-[10px] font-bold border ";
    switch (sev.toLowerCase()) {
      case "critical":
        return base + "bg-red-100 text-red-700 border-red-200";
      case "high":
        return base + "bg-orange-100 text-orange-700 border-orange-200";
      case "medium":
        return base + "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return base + "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[var(--text-main-primary)] flex items-center gap-2">
            🛡️ Security Center
          </h1>
          <p className="m-0 text-[12px] text-[var(--text-main-secondary)]">
            Monitoring anomali jaringan per perangkat. Monitoring latar belakang tetap aktif untuk semua perangkat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)] text-[12px] text-[var(--text-main-primary)] outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="">Semua Perangkat</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button 
            onClick={fetchAlerts}
            className="p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] hover:opacity-80 transition-all cursor-pointer"
            title="Refresh Log"
          >
            🔄
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-sm">
          <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Ancaman Aktif ({selectedDeviceId ? "Device" : "Global"})</div>
          <div className="text-[24px] font-bold text-red-600">{alerts.filter(a => !a.isResolved).length}</div>
        </div>
        <div className="p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-sm">
          <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Serangan DDoS</div>
          <div className="text-[24px] font-bold text-orange-500">{alerts.filter(a => a.alertType === "DDoS").length}</div>
        </div>
        <div className="p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-sm">
          <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Port Scan</div>
          <div className="text-[24px] font-bold text-blue-500">{alerts.filter(a => a.alertType === "Port Scan").length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border-main)]">
          <h2 className="m-0 text-[15px] font-semibold text-[var(--text-main-primary)]">Security Alerts Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="bg-[var(--bg-main)] text-[var(--text-main-secondary)] border-b border-[var(--border-main)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Perangkat</th>
                <th className="px-4 py-3 font-semibold">Tipe Alert</th>
                <th className="px-4 py-3 font-semibold">Tingkat</th>
                <th className="px-4 py-3 font-semibold">Sumber / Target</th>
                <th className="px-4 py-3 font-semibold">Keterangan</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center">Memuat data...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-main-secondary)] italic">Tidak ada ancaman keamanan terdeteksi.</td></tr>
              ) : (
                alerts.map((alert) => {
                  const deviceName = devices.find(d => d.id === alert.deviceId)?.name || `ID: ${alert.deviceId}`;
                  return (
                  <tr key={alert.id} className={`border-b border-[var(--border-main)] hover:bg-[var(--bg-main)] transition-colors ${alert.isResolved ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-main-secondary)]">
                      {new Date(alert.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">{deviceName}</td>
                    <td className="px-4 py-3 font-bold text-[var(--text-main-primary)]">{alert.alertType}</td>
                    <td className="px-4 py-3">
                      <span className={getSeverityBadge(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {alert.sourceIp && <div className="text-[10px]"><span className="text-[var(--text-main-secondary)]">Src:</span> <span className="font-mono">{alert.sourceIp}</span></div>}
                        {alert.destinationIp && <div className="text-[10px]"><span className="text-[var(--text-main-secondary)]">Dst:</span> <span className="font-mono">{alert.destinationIp}</span></div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="m-0 leading-relaxed text-[var(--text-main-primary)]">{alert.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!alert.isResolved && (
                          <button 
                            onClick={() => handleResolve(alert.id)}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(alert.id)}
                          className="px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold hover:bg-red-100 cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
