import React, { useState, useEffect } from "react";

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

  // Persistence: Restore selected pool from localStorage
  useEffect(() => {
    const savedPoolId = localStorage.getItem("selectedIPPoolId");
    if (savedPoolId && ipPools.length > 0) {
      const pool = ipPools.find(p => p.id === Number(savedPoolId));
      if (pool) setSelectedPool(pool);
    }
  }, [ipPools]);

  // Persistence: Save selected pool to localStorage
  useEffect(() => {
    if (selectedPool) {
      localStorage.setItem("selectedIPPoolId", selectedPool.id.toString());
    } else {
      localStorage.removeItem("selectedIPPoolId");
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
        fetchIPs(selectedPool.id);
        fetchPools(); // Update used count
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

  const handleDeleteIP = async (id: number) => {
    if (!confirm("Hapus entri IP ini?")) return;
    try {
      const res = await fetch(`/api/ipam/ips/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedPool) fetchIPs(selectedPool.id);
        fetchPools();
      }
    } catch (err) {
      console.error("delete ip error", err);
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

  const handleDeletePool = async (id: number) => {
    if (!confirm("Hapus IP Network ini?")) return;
    try {
      const res = await fetch(`/api/ip-pools/${id}`, { method: "DELETE" });
      if (res.ok) fetchPools();
    } catch (err) {
      console.error("delete pool error", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">IP Address Management</h2>
          <p className="text-slate-400 text-sm">Manage IP networks and address assignments.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          + Add Network
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-6 rounded-3xl border border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Networks</span>
            <div className="text-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v8m0 0 4-4m-4 4-4-4m4 12v8m0 0 4-4m-4 4-4-4"/></svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-100">{ipPools.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Memuat data...</div>
      ) : !selectedPool ? (
        <div className="bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg rounded-3xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="font-bold text-slate-100">IP Networks</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-slate-800">Network</th>
                <th className="px-6 py-4 border-b border-slate-800">Gateway</th>
                <th className="px-6 py-4 border-b border-slate-800">Device</th>
                <th className="px-6 py-4 border-b border-slate-800">VLAN</th>
                <th className="px-6 py-4 border-b border-slate-800">Status</th>
                <th className="px-6 py-4 text-right border-b border-slate-800">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm text-slate-400">
              {ipPools.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Belum ada network yang terdaftar.</td>
                </tr>
              )}
              {ipPools.map((pool) => {
                const device = devices.find(d => d.id === pool.deviceId);
                return (
                  <tr key={pool.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-500">
                      <div>{pool.subnet}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{pool.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{pool.gateway || "-"}</td>
                    <td className="px-6 py-4 text-slate-100 font-medium">{device?.name || "None"}</td>
                    <td className="px-6 py-4 text-slate-400">{pool.vlan || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full uppercase border border-green-500/20">
                        {pool.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedPool(pool)}
                        className="p-1.5 text-slate-300 hover:text-green-500 hover:bg-green-50/10 rounded-lg transition-all"
                        title="View Details"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button 
                        onClick={() => handleEditClick(pool)}
                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50/10 rounded-lg transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button 
                        onClick={() => handleDeletePool(pool.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50/10 rounded-lg transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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
              <h2 className="text-2xl font-bold text-white">Network IP Addresses</h2>
              <p className="text-slate-400">Managing IP addresses for network: <span className="text-blue-400 font-mono">{selectedPool.subnet}</span></p>
            </div>
            <button 
              onClick={() => setSelectedPool(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to IPAM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center">
              <div className="text-2xl font-bold text-white">{selectedPool.total}</div>
              <div className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">Total IPs</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center">
              <div className="text-2xl font-bold text-green-500">{selectedPool.total - selectedPool.used}</div>
              <div className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">Available</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center">
              <div className="text-2xl font-bold text-blue-500">{selectedPool.used}</div>
              <div className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">Assigned</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white">IP Addresses</h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowIPModal(true)}
                  className="px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-500 rounded-xl text-xs font-bold border border-green-600/30 transition-all flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Add IP Address
                </button>
                <button 
                  onClick={handleGenerateIPs}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 rounded-xl text-xs font-bold border border-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m13 2-2 10h8l-2 10 7-10h-8l2-10Z"/></svg>
                  {isGenerating ? "Generating..." : "Generate IPs"}
                </button>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Device Name</th>
                  <th className="px-6 py-4">MAC Address</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {ipAddresses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                      No IP addresses found. Add manually or generate from available IPs.
                    </td>
                  </tr>
                ) : (
                  ipAddresses.map(ip => (
                    <tr key={ip.id} className="hover:bg-slate-800/30 text-slate-300">
                      <td className="px-6 py-4 font-mono font-bold text-blue-400">{ip.ipAddress}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ip.status === 'available' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          ip.status === 'assigned' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {ip.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{ip.deviceName || "-"}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{ip.deviceType}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{ip.macAddress || "-"}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleEditIP(ip)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Edit IP"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteIP(ip.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete IP"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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
            <div className="relative bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200 my-8">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">{editMode ? "Edit IP Network" : "Add IP Network"}</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              <form onSubmit={handleAddPool} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network (CIDR)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="192.168.1.0/24"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newPool.subnet}
                    onChange={e => setNewPool({...newPool, subnet: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="LAN Network"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    value={newPool.name}
                    onChange={e => setNewPool({...newPool, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gateway</label>
                  <input 
                    type="text" 
                    placeholder="192.168.1.1"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newPool.gateway}
                    onChange={e => setNewPool({...newPool, gateway: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Name</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none pr-10"
                      value={newPool.deviceId}
                      onChange={e => setNewPool({...newPool, deviceId: e.target.value})}
                    >
                      <option value="">Select Device</option>
                      {devices.map(dev => (
                        <option key={dev.id} value={dev.id}>{dev.name} ({dev.ip})</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">VLAN</label>
                    <input 
                      type="number" 
                      placeholder="100"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      value={newPool.vlan}
                      onChange={e => setNewPool({...newPool, vlan: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total IPs</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      value={newPool.total}
                      onChange={e => setNewPool({...newPool, total: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea 
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                    value={newPool.description}
                    onChange={e => setNewPool({...newPool, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
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
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white">{editIPMode ? "Edit IP Address" : "Add IP Address"}</h3>
              <button onClick={() => { setShowIPModal(false); setEditIPMode(false); }} className="text-slate-400 hover:text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleAddIP} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">IP Address</label>
                  <input 
                    type="text" 
                    required
                    placeholder="192.168.1.10"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newIP.ipAddress}
                    onChange={e => setNewIP({...newIP, ipAddress: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none"
                    value={newIP.status}
                    onChange={e => setNewIP({...newIP, status: e.target.value})}
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Device Name</label>
                  <input 
                    type="text" 
                    placeholder="Router-01"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    value={newIP.deviceName}
                    onChange={e => setNewIP({...newIP, deviceName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Device Type</label>
                  <input 
                    type="text" 
                    placeholder="mikrotik"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    value={newIP.deviceType}
                    onChange={e => setNewIP({...newIP, deviceType: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">MAC Address</label>
                  <input 
                    type="text" 
                    placeholder="00:11:22:33:44:55"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                    value={newIP.macAddress}
                    onChange={e => setNewIP({...newIP, macAddress: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    placeholder="Optional description"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                    value={newIP.description}
                    onChange={e => setNewIP({...newIP, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4 sticky bottom-0 bg-slate-900 pb-2">
                  <button 
                    type="button"
                    onClick={() => { setShowIPModal(false); setEditIPMode(false); }}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
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
    </div>
  );
};

export default IPManagementSection;
