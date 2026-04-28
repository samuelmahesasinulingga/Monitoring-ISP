import React, { useState, useEffect } from "react";
import ConfirmDialog from "../ui/ConfirmDialog";

interface IPPool {
  id: number;
  workspaceId: number;
  name: string;
  subnet: string;
  gateway: string;
  deviceId?: number;
  vlan?: number;
  description?: string;
  total: number;
  used: number;
  status: string;
}

interface Device {
  id: number;
  name: string;
  ip: string;
}

interface IPAddress {
  id: number;
  poolId: number;
  ipAddress: string;
  status: string;
  deviceName?: string;
  deviceType?: string;
  macAddress?: string;
  description?: string;
}

const IPManagementSection: React.FC<{ workspaceId?: number }> = ({ workspaceId }) => {
  const [ipPools, setIpPools] = useState<IPPool[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<IPPool | null>(null);
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<number | null>(null);

  const [editIPMode, setEditIPMode] = useState(false);
  const [editingIPId, setEditingIPId] = useState<number | null>(null);
  const [selectedIPIds, setSelectedIPIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Custom Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  const showConfirm = (opts: Omit<typeof confirmDialog, "isOpen" | "isLoading">) => {
    setConfirmDialog({ ...opts, isOpen: true, isLoading: false });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const [newPool, setNewPool] = useState({
    name: "",
    subnet: "",
    gateway: "",
    deviceId: "" as string | number,
    vlan: "" as string | number,
    description: "",
    total: 254
  });

  const [newIP, setNewIP] = useState({
    ipAddress: "",
    status: "available",
    deviceName: "",
    deviceType: "",
    macAddress: "",
    description: ""
  });

  const calculateMaxHosts = (cidr: string): number => {
    const parts = cidr.split("/");
    if (parts.length !== 2) return 0;
    const mask = parseInt(parts[1]);
    if (isNaN(mask) || mask < 0 || mask > 32) return 0;
    // Formula: 2^(32-mask) - 2 (subtract network and broadcast)
    if (mask >= 31) return 0;
    return Math.pow(2, 32 - mask) - 2;
  };

  const handleSubnetChange = (val: string) => {
    const maxHosts = calculateMaxHosts(val);
    setNewPool(prev => ({
      ...prev,
      subnet: val,
      total: maxHosts > 0 ? maxHosts : prev.total
    }));
  };

  // Persistence: Restore selected pool from localStorage
  useEffect(() => {
    const savedPoolId = localStorage.getItem("selectedIPPoolId");
    if (savedPoolId && ipPools.length > 0 && !selectedPool) {
      const pool = ipPools.find(p => p.id === Number(savedPoolId));
      if (pool) setSelectedPool(pool);
    }
  }, [ipPools]);

  // Persistence: Save selected pool to localStorage
  useEffect(() => {
    if (selectedPool) {
      localStorage.setItem("selectedIPPoolId", selectedPool.id.toString());
    }
  }, [selectedPool]);

  const fetchPools = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ip-pools?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setIpPools(data);

        // Auto-refresh selectedPool stats if it is currently open
        setSelectedPool(prev => {
          if (!prev) return null;
          const updated = data.find((p: IPPool) => p.id === prev.id);
          return updated ? updated : prev;
        });

        return data;
      }
    } catch (err) {
      console.error("fetch pools error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevices = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/devices?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error("fetch devices error", err);
    }
  };

  useEffect(() => {
    fetchPools();
    fetchDevices();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedPool) {
      fetchIPs(selectedPool.id);
    }
  }, [selectedPool]);

  const fetchIPs = async (poolId: number) => {
    try {
      const res = await fetch(`/api/ipam/ips?poolId=${poolId}`);
      if (res.ok) {
        const data = await res.json();
        setIpAddresses(data);
      }
    } catch (err) {
      console.error("fetch ips error", err);
    }
  };

  const handleGenerateIPs = async () => {
    if (!selectedPool) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/ipam/networks/${selectedPool.id}/generate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();

        if (data.count === 0) {
          showConfirm({
            title: "Informasi Network",
            message: data.message || "Kapasitas network sudah penuh. Tidak ada IP baru yang dibuat.",
            confirmLabel: "Tutup",
            variant: "info",
            onConfirm: () => closeConfirm()
          });
        }

        fetchIPs(selectedPool.id);
        fetchPools(); // Update used count
      } else {
        const errText = await res.text();
        showConfirm({
          title: "Gagal Generate IP",
          message: errText,
          confirmLabel: "Tutup",
          variant: "danger",
          onConfirm: () => closeConfirm()
        });
      }
    } catch (err) {
      console.error("generate ips error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool) return;

    try {
      const url = editIPMode ? `/api/ipam/ips/${editingIPId}` : "/api/ipam/ips";
      const method = editIPMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newIP, poolId: selectedPool.id }),
      });

      if (res.ok) {
        setShowIPModal(false);
        setEditIPMode(false);
        setEditingIPId(null);
        setNewIP({ ipAddress: "", status: "available", deviceName: "", deviceType: "", macAddress: "", description: "" });
        fetchIPs(selectedPool.id);
        fetchPools();
      }
    } catch (err) {
      console.error("save ip error", err);
    }
  };

  const handleEditIP = (ip: IPAddress) => {
    setNewIP({
      ipAddress: ip.ipAddress,
      status: ip.status,
      deviceName: ip.deviceName || "",
      deviceType: ip.deviceType || "",
      macAddress: ip.macAddress || "",
      description: ip.description || ""
    });
    setEditingIPId(ip.id);
    setEditIPMode(true);
    setShowIPModal(true);
  };

  const handleDeleteIP = (id: number) => {
    showConfirm({
      title: "Hapus IP Address",
      message: "Apakah Anda yakin ingin menghapus entri IP ini?",
      confirmLabel: "Hapus",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/ipam/ips/${id}`, { method: "DELETE" });
          if (res.ok) {
            if (selectedPool) fetchIPs(selectedPool.id);
            fetchPools();
          }
        } catch (err) {
          console.error("delete ip error", err);
        } finally {
          closeConfirm();
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIPIds.size === 0) return;
    showConfirm({
      title: `Hapus ${selectedIPIds.size} IP Sekaligus`,
      message: `Anda akan menghapus ${selectedIPIds.size} IP address yang dipilih. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: `Hapus ${selectedIPIds.size} IP`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        setIsBulkDeleting(true);
        try {
          await Promise.all(
            Array.from(selectedIPIds).map(id =>
              fetch(`/api/ipam/ips/${id}`, { method: "DELETE" })
            )
          );
          setSelectedIPIds(new Set());
          if (selectedPool) fetchIPs(selectedPool.id);
          fetchPools();
        } catch (err) {
          console.error("bulk delete error", err);
        } finally {
          setIsBulkDeleting(false);
          closeConfirm();
        }
      },
    });
  };

  const toggleSelectIP = (id: number) => {
    setSelectedIPIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIPIds.size === ipAddresses.length) {
      setSelectedIPIds(new Set());
    } else {
      setSelectedIPIds(new Set(ipAddresses.map(ip => ip.id)));
    }
  };

  const resetForm = () => {
    setNewPool({ name: "", subnet: "", gateway: "", deviceId: "", vlan: "", description: "", total: 254 });
    setEditMode(false);
    setEditingPoolId(null);
  };

  const handleEditClick = (pool: IPPool) => {
    setNewPool({
      name: pool.name,
      subnet: pool.subnet,
      gateway: pool.gateway,
      deviceId: pool.deviceId || "",
      vlan: pool.vlan || "",
      description: pool.description || "",
      total: pool.total
    });
    setEditingPoolId(pool.id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    const payload = {
      ...newPool,
      workspaceId: workspaceId,
      deviceId: newPool.deviceId === "" ? null : Number(newPool.deviceId),
      vlan: newPool.vlan === "" ? 0 : Number(newPool.vlan),
      total: Number(newPool.total)
    };

    try {
      const url = editMode ? `/api/ip-pools/${editingPoolId}` : "/api/ip-pools";
      const method = editMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchPools();

        // If the edited pool is the one currently selected, update it
        if (editMode && selectedPool && selectedPool.id === editingPoolId) {
          const updatedPool = { ...selectedPool, ...payload };
          setSelectedPool(updatedPool as IPPool);
        }
      }
    } catch (err) {
      console.error("save pool error", err);
    }
  };

  const handleDeletePool = (id: number) => {
    showConfirm({
      title: "Hapus IP Network",
      message: "Apakah Anda yakin ingin menghapus network ini? Semua IP address di dalamnya juga akan terhapus.",
      confirmLabel: "Hapus Network",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/ip-pools/${id}`, { method: "DELETE" });
          if (res.ok) fetchPools();
        } catch (err) {
          console.error("delete pool error", err);
        } finally {
          closeConfirm();
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {selectedPool && (
        <button
          onClick={() => {
            setSelectedPool(null);
            localStorage.removeItem("selectedIPPoolId");
          }}
          className="mb-4 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-600/20 transition-all shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to IPAM
        </button>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main-primary)]">IP Address Management</h2>
          <p className="text-[var(--text-main-secondary)] text-sm">Manage IP networks and address assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Total Networks</span>
            <div className="text-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v8m0 0 4-4m-4 4-4-4m4 12v8m0 0 4-4m-4 4-4-4" /></svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-[var(--text-main-primary)]">{ipPools.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[var(--text-main-secondary)] font-medium">Memuat data...</div>
      ) : !selectedPool ? (
        <div className="bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border-main)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-main-primary)]">IP Networks</h3>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              + Add Network
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-main)]/50 text-[var(--text-main-secondary)] text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-[var(--border-main)]">Network</th>
                <th className="px-6 py-4 border-b border-[var(--border-main)]">Gateway</th>
                <th className="px-6 py-4 border-b border-[var(--border-main)]">Device</th>
                <th className="px-6 py-4 border-b border-[var(--border-main)]">VLAN</th>
                <th className="px-6 py-4 border-b border-[var(--border-main)]">Status</th>
                <th className="px-6 py-4 text-right border-b border-[var(--border-main)]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]/50 text-sm text-[var(--text-main-secondary)]">
              {ipPools.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Belum ada network yang terdaftar.</td>
                </tr>
              )}
              {ipPools.map((pool) => {
                const device = devices.find(d => d.id === pool.deviceId);
                return (
                  <tr key={pool.id} className="hover:bg-[var(--bg-main)]/50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-500">
                      <div>{pool.subnet}</div>
                      <div className="text-[10px] text-[var(--text-main-secondary)] font-normal">{pool.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[var(--text-main-secondary)]">{pool.gateway || "-"}</td>
                    <td className="px-6 py-4 text-[var(--text-main-primary)] font-medium">{device?.name || "None"}</td>
                    <td className="px-6 py-4 text-[var(--text-main-secondary)]">{pool.vlan || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full uppercase border border-green-500/20">
                        {pool.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedPool(pool)}
                        className="p-1.5 text-[var(--text-main-secondary)] hover:text-green-500 hover:bg-green-50/10 rounded-lg transition-all"
                        title="View Details"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      <button
                        onClick={() => handleEditClick(pool)}
                        className="p-1.5 text-[var(--text-main-secondary)] hover:text-blue-500 hover:bg-blue-50/10 rounded-lg transition-all"
                        title="Edit Network"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDeletePool(pool.id)}
                        className="p-1.5 text-[var(--text-main-secondary)] hover:text-red-500 hover:bg-red-50/10 rounded-lg transition-all"
                        title="Delete Network"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Network Detail View */}
      {selectedPool && (
        <div className="flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-main-primary)]">Network IP Addresses</h2>
              <p className="text-[var(--text-main-secondary)]">Managing IP addresses for network: <span className="text-blue-400 font-mono">{selectedPool.subnet}</span></p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              + Add Address
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] p-6 rounded-3xl text-center shadow-lg">
              <div className="text-2xl font-bold text-[var(--text-main-primary)]">{selectedPool.total}</div>
              <div className="text-[var(--text-main-secondary)] text-xs uppercase font-bold tracking-widest mt-1">Total IPs</div>
            </div>
            <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] p-6 rounded-3xl text-center shadow-lg">
              <div className="text-2xl font-bold text-green-500">{selectedPool.total - selectedPool.used}</div>
              <div className="text-[var(--text-main-secondary)] text-xs uppercase font-bold tracking-widest mt-1">Available</div>
            </div>
            <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] p-6 rounded-3xl text-center shadow-lg">
              <div className="text-2xl font-bold text-blue-500">{selectedPool.used}</div>
              <div className="text-[var(--text-main-secondary)] text-xs uppercase font-bold tracking-widest mt-1">Assigned</div>
            </div>
          </div>

          <div className="bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-3xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[var(--border-main)] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-[var(--text-main-primary)]">IP Addresses</h3>
                {selectedIPIds.size > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20">
                      {selectedIPIds.size} dipilih
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-bold border border-red-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                      {isBulkDeleting ? "Menghapus..." : "Hapus Pilihan"}
                    </button>
                    <button
                      onClick={() => setSelectedIPIds(new Set())}
                      className="px-3 py-1 bg-[var(--bg-main)] hover:bg-[var(--border-main)] text-[var(--text-main-secondary)] rounded-xl text-[10px] font-bold border border-[var(--border-main)] transition-all"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowIPModal(true)}
                  className="px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-500 rounded-xl text-xs font-bold border border-green-600/30 transition-all flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  Add IP Address
                </button>
                <button
                  onClick={handleGenerateIPs}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 rounded-xl text-xs font-bold border border-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m13 2-2 10h8l-2 10 7-10h-8l2-10Z" /></svg>
                  {isGenerating ? "Generating..." : "Generate IPs"}
                </button>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-main)]/50 text-[var(--text-main-secondary)] text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={ipAddresses.length > 0 && selectedIPIds.size === ipAddresses.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-main)] accent-blue-500 cursor-pointer"
                      title="Pilih Semua"
                    />
                  </th>
                  <th className="px-4 py-4">IP Address</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Device Name</th>
                  <th className="px-4 py-4">MAC Address</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)] text-sm">
                {ipAddresses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-main-secondary)] italic">
                      No IP addresses found. Add manually or generate from available IPs.
                    </td>
                  </tr>
                ) : (
                  ipAddresses.map(ip => (
                    <tr
                      key={ip.id}
                      className={`transition-colors text-[var(--text-main-secondary)] ${selectedIPIds.has(ip.id)
                        ? "bg-blue-500/5 border-l-2 border-blue-500"
                        : "hover:bg-[var(--bg-main)]/30"
                        }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIPIds.has(ip.id)}
                          onChange={() => toggleSelectIP(ip.id)}
                          className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-main)] accent-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-blue-400">{ip.ipAddress}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ip.status === 'available' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          ip.status === 'assigned' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-[var(--bg-main)] text-[var(--text-main-secondary)] border border-[var(--border-main)]'
                          }`}>
                          {ip.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[var(--text-main-primary)]">{ip.deviceName || "-"}</div>
                        <div className="text-[10px] text-[var(--text-main-secondary)] uppercase">{ip.deviceType}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">{ip.macAddress || "-"}</td>
                      <td className="px-4 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditIP(ip)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Edit IP"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDeleteIP(ip.id)}
                          className="p-1.5 text-[var(--text-main-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete IP"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Network Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-[var(--card-main-bg)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--border-main)] animate-in fade-in zoom-in duration-200 my-8">
              <div className="p-6 border-b border-[var(--border-main)] flex justify-between items-center">
                <h3 className="text-xl font-bold text-[var(--text-main-primary)]">{editMode ? "Edit IP Network" : "Add IP Network"}</h3>
                <button onClick={() => setShowModal(false)} className="text-[var(--text-main-secondary)] hover:text-[var(--text-main-primary)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleAddPool} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Network (CIDR)</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.0/24"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newPool.subnet}
                    onChange={e => handleSubnetChange(e.target.value)}
                  />
                  {calculateMaxHosts(newPool.subnet) > 0 && (
                    <p className="text-[10px] text-blue-400 ml-1">Kapasitas maksimal: {calculateMaxHosts(newPool.subnet)} Host</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="LAN Network"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    value={newPool.name}
                    onChange={e => setNewPool({ ...newPool, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Gateway</label>
                  <input
                    type="text"
                    placeholder="192.168.1.1"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newPool.gateway}
                    onChange={e => setNewPool({ ...newPool, gateway: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Device Name</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none pr-10"
                      value={newPool.deviceId}
                      onChange={e => setNewPool({ ...newPool, deviceId: e.target.value })}
                    >
                      <option value="">Select Device</option>
                      {devices.map(dev => (
                        <option key={dev.id} value={dev.id}>{dev.name} ({dev.ip})</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-main-secondary)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">VLAN</label>
                    <input
                      type="number"
                      placeholder="100"
                      className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      value={newPool.vlan}
                      onChange={e => setNewPool({ ...newPool, vlan: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Total IPs</label>
                    <input
                      type="number"
                      required
                      max={calculateMaxHosts(newPool.subnet) || undefined}
                      className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      value={newPool.total}
                      onChange={e => {
                        const val = Number(e.target.value);
                        const max = calculateMaxHosts(newPool.subnet);
                        setNewPool({ ...newPool, total: (max > 0 && val > max) ? max : val });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                    value={newPool.description}
                    onChange={e => setNewPool({ ...newPool, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 px-4 py-3 bg-[var(--bg-main)] hover:bg-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl font-bold transition-all border border-[var(--border-main)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/40"
                  >
                    {editMode ? "Update Network" : "Add Network"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add IP Address Modal */}
      {showIPModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowIPModal(false)} />
          <div className="relative bg-[var(--card-main-bg)] border border-[var(--border-main)] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-auto">
            <div className="p-6 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-main)]/50 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="text-xl font-bold text-[var(--text-main-primary)]">{editIPMode ? "Edit IP Address" : "Add IP Address"}</h3>
              <button onClick={() => { setShowIPModal(false); setEditIPMode(false); }} className="text-[var(--text-main-secondary)] hover:text-[var(--text-main-primary)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleAddIP} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">IP Address</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.10"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newIP.ipAddress}
                    onChange={e => setNewIP({ ...newIP, ipAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Status</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none pr-10"
                      value={newIP.status}
                      onChange={e => setNewIP({ ...newIP, status: e.target.value })}
                    >
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="reserved">Reserved</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-main-secondary)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Device Name</label>
                  <input
                    type="text"
                    placeholder="Router-01"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    value={newIP.deviceName}
                    onChange={e => setNewIP({ ...newIP, deviceName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Device Type</label>
                  <input
                    type="text"
                    placeholder="mikrotik"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    value={newIP.deviceType}
                    onChange={e => setNewIP({ ...newIP, deviceType: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">MAC Address</label>
                  <input
                    type="text"
                    placeholder="00:11:22:33:44:55"
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newIP.macAddress}
                    onChange={e => setNewIP({ ...newIP, macAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main-secondary)] uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Optional description"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                    value={newIP.description}
                    onChange={e => setNewIP({ ...newIP, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4 sticky bottom-0 bg-[var(--card-main-bg)] pb-2">
                  <button
                    type="button"
                    onClick={() => { setShowIPModal(false); setEditIPMode(false); }}
                    className="flex-1 px-4 py-3 bg-[var(--bg-main)] hover:bg-[var(--border-main)] text-[var(--text-main-primary)] rounded-xl font-bold transition-all border border-[var(--border-main)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/40"
                  >
                    {editIPMode ? "Update IP" : "Add IP Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        isLoading={confirmDialog.isLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default IPManagementSection;
