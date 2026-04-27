import React, { useState, useEffect } from "react";
import ConfirmDialog from "../ui/ConfirmDialog";

export type Customer = {
  id: number;
  name: string;
  email?: string;
  address?: string;
  workspaceId?: number;
  created_at: string;
};

export type Service = {
  id: number;
  customerId: number;
  planName: string;
  bandwidthMbps: number;
  active: boolean;
  workspaceId?: number;
  monitoringIp?: string;
  monitoringEnabled: boolean;
  created_at: string;
};

type CustomerSectionProps = {
  workspaceName?: string;
  workspaceId?: number;
};

const CustomerSection: React.FC<CustomerSectionProps> = ({ workspaceName, workspaceId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Service Management State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedCustomerForService, setSelectedCustomerForService] = useState<Customer | null>(null);
  const [customerServices, setCustomerServices] = useState<Service[]>([]);
  const [isServiceLoading, setIsServiceLoading] = useState(false);

  // Service Form State
  const [servicePlanName, setServicePlanName] = useState("");
  const [serviceBandwidth, setServiceBandwidth] = useState(10);
  const [serviceActive, setServiceActive] = useState(true);
  const [serviceMonitoringIp, setServiceMonitoringIp] = useState("");
  const [serviceMonitoringEnabled, setServiceMonitoringEnabled] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; variant?: "danger" | "warning" | "info";
    isLoading?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const showConfirm = (opts: Omit<typeof confirmDialog, "isOpen" | "isLoading">) =>
    setConfirmDialog({ ...opts, isOpen: true, isLoading: false });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const url = workspaceId ? `/api/customers?workspaceId=${workspaceId}` : `/api/customers`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("fetch customers error", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [workspaceId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        workspaceId: workspaceId ?? null,
      };

      const res = await fetch(`/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setCustomers((prev) => [...prev, created]);
        setIsAddModalOpen(false);
        setName("");
        setEmail("");
        setAddress("");
      } else {
        const errText = await res.text();
        alert("Gagal menambahkan pelanggan: " + errText);
      }
    } catch (err) {
      console.error("add customer error", err);
    }
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setEmail(cust.email || "");
    setAddress(cust.address || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !name.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        workspaceId: workspaceId ?? null,
      };

      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setIsEditModalOpen(false);
        setEditingCustomer(null);
        setName("");
        setEmail("");
        setAddress("");
      } else {
        const errText = await res.text();
        alert("Gagal merubah data pelanggan: " + errText);
      }
    } catch (err) {
      console.error("update customer error", err);
    }
  };

  const openDeleteModal = (cust: Customer) => {
    setCustomerToDelete(cust);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
      } else {
        const errText = await res.text();
        alert("Gagal menghapus pelanggan: " + errText);
      }
    } catch (err) {
      console.error("delete customer error", err);
    }
  };

  const openServiceModal = async (cust: Customer) => {
    setSelectedCustomerForService(cust);
    setIsServiceModalOpen(true);
    setIsServiceLoading(true);
    try {
      const res = await fetch(`/api/services?workspaceId=${workspaceId}`);
      if (res.ok) {
        const allServices: Service[] = await res.json();
        setCustomerServices(allServices.filter(s => s.customerId === cust.id));
      }
    } catch (err) {
      console.error("fetch services error", err);
    } finally {
      setIsServiceLoading(false);
    }
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForService) return;

    const payload = {
      customerId: selectedCustomerForService.id,
      planName: servicePlanName,
      bandwidthMbps: Number(serviceBandwidth),
      active: serviceActive,
      workspaceId: workspaceId ?? null,
      monitoringIp: serviceMonitoringIp || null,
      monitoringEnabled: serviceMonitoringEnabled
    };

    try {
      const url = editingService ? `/api/services/${editingService.id}` : `/api/services`;
      const method = editingService ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        if (editingService) {
          setCustomerServices(prev => prev.map(s => s.id === saved.id ? saved : s));
        } else {
          setCustomerServices(prev => [...prev, saved]);
        }
        resetServiceForm();
      }
    } catch (err) {
      console.error("save service error", err);
    }
  };

  const resetServiceForm = () => {
    setServicePlanName("");
    setServiceBandwidth(10);
    setServiceActive(true);
    setServiceMonitoringIp("");
    setServiceMonitoringEnabled(false);
    setEditingService(null);
  };

  const handleEditService = (svc: Service) => {
    setEditingService(svc);
    setServicePlanName(svc.planName);
    setServiceBandwidth(svc.bandwidthMbps);
    setServiceActive(svc.active);
    setServiceMonitoringIp(svc.monitoringIp || "");
    setServiceMonitoringEnabled(svc.monitoringEnabled);
  };

  const handleDeleteService = (id: number) => {
    showConfirm({
      title: "Hapus Layanan",
      message: "Apakah Anda yakin ingin menghapus layanan ini?",
      confirmLabel: "Hapus",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
          if (res.ok) setCustomerServices(prev => prev.filter(s => s.id !== id));
        } catch (err) { console.error("delete service error", err); }
        finally { closeConfirm(); }
      },
    });
  };

  return (
    <>
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-100">
            Data Pelanggan {workspaceName ? `- ${workspaceName}` : ""}
          </h2>
          <p className="m-0 text-[12px] text-slate-400">
            Kelola data diri pelanggan ISP pada workspace ini.
          </p>
        </div>
        <button
          onClick={() => {
            setName("");
            setEmail("");
            setAddress("");
            setIsAddModalOpen(true);
          }}
          className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
        >
          + Tambah Pelanggan
        </button>
      </header>

      <div className="flex flex-col gap-4">
        {/* Tabel Data */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-lg/95 p-4 shadow-md shadow-black/20">
          <div className="mb-4">
            <h3 className="m-0 text-[13px] font-semibold text-slate-100">
              Daftar Pelanggan Terdaftar
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                  <th className="px-2.5 py-2 text-left font-semibold">Nama Instansi / Pelanggan</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Email</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Alamat Lokasi</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Tgl Daftar</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-6 text-center text-slate-400">Memuat data...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-6 text-center text-slate-400">Belum ada data pelanggan di workspace ini.</td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-2.5 py-2 align-top">
                        <div className="font-semibold text-slate-100">{c.name}</div>
                      </td>
                      <td className="px-2.5 py-2 align-top text-slate-400">
                        {c.email || <span className="text-slate-400 italic">Belum diset</span>}
                      </td>
                      <td className="px-2.5 py-2 align-top text-slate-400">
                        <div className="max-w-[180px] truncate" title={c.address}>
                          {c.address || <span className="text-slate-400 italic">Belum diset</span>}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 align-top text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-2.5 py-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openServiceModal(c)}
                            className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                          >
                            Layanan
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(c)}
                            className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800">
              <h3 className="m-0 text-[15px] font-bold text-slate-100">
                {isEditModalOpen ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h3>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <form id="customerForm" onSubmit={isEditModalOpen ? handleUpdateCustomer : handleAddCustomer} className="flex flex-col gap-4 text-[12px]">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">Nama Pelanggan (Wajib)</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Misal: PT Maju Bersama"
                    required
                    className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/80 text-slate-100 px-3 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">Email Utama</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Misal: info@majubersama.com"
                    className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/80 text-slate-100 px-3 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">Alamat Lengkap</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat kantor atau lokasi pemasangan..."
                    className="w-full min-h-[100px] rounded-lg border border-slate-800 bg-slate-900/80 text-slate-100 p-3 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 resize-y"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/30">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setEditingCustomer(null);
                  setName("");
                  setEmail("");
                  setAddress("");
                }}
                className="px-4 py-2 rounded-full border border-slate-700 bg-transparent text-[12px] font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="customerForm"
                className="px-4 py-2 rounded-full border-0 bg-blue-600 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
              >
                {isEditModalOpen ? "Simpan Perbaikan" : "Simpan Pelanggan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-5 shadow-xl">
            <h3 className="m-0 mb-2 text-[15px] font-bold text-slate-100">Konfirmasi Hapus</h3>
            <p className="m-0 mb-4 text-[12px] text-slate-400">
              Apakah Anda yakin ingin menghapus pelanggan <strong>{customerToDelete.name}</strong>? Data tagihan dan layanan terkait juga akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-300 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg text-[12px] font-semibold text-slate-300 hover:bg-slate-800/50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-full border-0 bg-red-600 text-[12px] font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {isServiceModalOpen && selectedCustomerForService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[18px] font-bold text-slate-100">
                Layanan Pelanggan: {selectedCustomerForService.name}
              </h3>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center hover:bg-slate-800/50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-[300px_1fr] gap-6">
              {/* Form Layanan */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 h-fit">
                <h4 className="text-[13px] font-bold mb-3">{editingService ? "Edit Layanan" : "Tambah Layanan"}</h4>
                <form onSubmit={handleAddOrUpdateService} className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Nama Paket / Plan</label>
                    <input
                      value={servicePlanName}
                      onChange={e => setServicePlanName(e.target.value)}
                      placeholder="e.g. Home Fiber 50Mbps"
                      required
                      className="w-full h-8 px-2 text-[12px] rounded border border-slate-800 outline-none focus:border-blue-500 bg-slate-900/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Bandwidth (Mbps)</label>
                    <input
                      type="number"
                      value={serviceBandwidth}
                      onChange={e => setServiceBandwidth(Number(e.target.value))}
                      required
                      className="w-full h-8 px-2 text-[12px] rounded border border-slate-800 outline-none focus:border-blue-500 bg-slate-900/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">IP Monitoring (Opsional)</label>
                    <input
                      value={serviceMonitoringIp}
                      onChange={e => setServiceMonitoringIp(e.target.value)}
                      placeholder="e.g. 192.168.10.2"
                      className="w-full h-8 px-2 text-[12px] rounded border border-slate-800 outline-none focus:border-blue-500 bg-slate-900/50 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="monEnabled"
                      checked={serviceMonitoringEnabled}
                      onChange={e => setServiceMonitoringEnabled(e.target.checked)}
                    />
                    <label htmlFor="monEnabled" className="text-[11px] font-semibold text-slate-300">Aktifkan SLA Monitoring</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="svcActive"
                      checked={serviceActive}
                      onChange={e => setServiceActive(e.target.checked)}
                    />
                    <label htmlFor="svcActive" className="text-[11px] font-semibold text-slate-300">Status Aktif</label>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {editingService && (
                      <button
                        type="button"
                        onClick={resetServiceForm}
                        className="flex-1 h-8 text-[12px] font-bold rounded bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg border border-slate-800 hover:bg-slate-800/50"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 h-8 text-[12px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {editingService ? "Simpan" : "Tambah"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Daftar Layanan */}
              <div>
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-800/50 border-b border-slate-800">
                    <tr className="text-slate-400 text-left">
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2 text-center">BW</th>
                      <th className="px-3 py-2">IP Monitor</th>
                      <th className="px-3 py-2 text-center">Monitoring</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isServiceLoading ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-400">Memuat...</td></tr>
                    ) : customerServices.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada layanan.</td></tr>
                    ) : (
                      customerServices.map(s => (
                        <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="px-3 py-2 font-bold">{s.planName}</td>
                          <td className="px-3 py-2 text-center font-semibold text-blue-600">{s.bandwidthMbps} Mbps</td>
                          <td className="px-3 py-2 text-slate-400">{s.monitoringIp || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            {s.monitoringEnabled ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold">AKTIF</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">NONAKTIF</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditService(s)} className="text-blue-600 font-bold hover:underline">Edit</button>
                              <button onClick={() => handleDeleteService(s.id)} className="text-red-600 font-bold hover:underline">Hapus</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>

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
    </>
  );
};

export default CustomerSection;
