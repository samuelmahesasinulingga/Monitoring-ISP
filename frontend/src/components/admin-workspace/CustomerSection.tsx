import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

export type Customer = {
  id: number;
  name: string;
  email?: string;
  address?: string;
  workspaceId?: number;
  deviceId?: number;
  queueName?: string;
  monthlyPrice: number;
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

type Device = {
  id: number;
  name: string;
  ip: string;
};

type PackageInfo = {
  id: number;
  name: string;
  bandwidthMbps: number;
  price: number;
  workspaceId?: number;
};

type CustomerSectionProps = {
  workspaceName?: string;
  workspaceId?: number;
};

const CustomerSection: React.FC<CustomerSectionProps> = ({ workspaceName, workspaceId }) => {
  const { notify } = useNotification();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deviceId, setDeviceId] = useState<number | "">("");
  const [queueName, setQueueName] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);

  const [devices, setDevices] = useState<Device[]>([]);
  const [queues, setQueues] = useState<string[]>([]);
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Custom Confirm Dialog
  const { showConfirm } = useConfirmDialog();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

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

  const fetchDevices = async () => {
    try {
      const url = workspaceId ? `/api/devices?workspaceId=${workspaceId}` : `/api/devices`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error("fetch devices error", err);
    }
  };



  const fetchQueues = async (devId: number) => {
    setIsLoadingQueues(true);
    try {
      const res = await fetch(`/api/customers/queues?deviceId=${devId}`);
      if (res.ok) {
        const data = await res.json();
        setQueues(data || []);
      } else {
        setQueues([]);
      }
    } catch (err) {
      console.error("fetch queues error", err);
      setQueues([]);
    } finally {
      setIsLoadingQueues(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchDevices();
  }, [workspaceId]);

  useEffect(() => {
    if (deviceId) {
      fetchQueues(Number(deviceId));
    } else {
      setQueues([]);
      setQueueName("");
    }
  }, [deviceId]);


  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        workspaceId: workspaceId ?? null,
        deviceId: deviceId ? Number(deviceId) : null,
        queueName: queueName || undefined,
        monthlyPrice: Number(monthlyPrice) || 0,
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
        setDeviceId("");
        setQueueName("");
        setMonthlyPrice(0);
        notify("Berhasil menambahkan pelanggan baru!", "success");
      } else {
        const errText = await res.text();
        notify("Gagal menambahkan pelanggan: " + errText, "error");
      }
    } catch (err) {
      console.error("add customer error", err);
      notify("Terjadi kesalahan sistem.", "error");
    }
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setEmail(cust.email || "");
    setAddress(cust.address || "");
    setDeviceId(cust.deviceId || "");
    setQueueName(cust.queueName || "");
    setMonthlyPrice(cust.monthlyPrice || 0);
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
        deviceId: deviceId ? Number(deviceId) : null,
        queueName: queueName || undefined,
        monthlyPrice: Number(monthlyPrice) || 0,
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
        setDeviceId("");
        setQueueName("");
        setMonthlyPrice(0);
        notify("Data pelanggan berhasil diperbarui!", "success");
      } else {
        const errText = await res.text();
        notify("Gagal merubah data pelanggan: " + errText, "error");
      }
    } catch (err) {
      console.error("update customer error", err);
      notify("Terjadi kesalahan sistem.", "error");
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
        notify("Pelanggan berhasil dihapus.", "success");
      } else {
        const errText = await res.text();
        notify("Gagal menghapus pelanggan: " + errText, "error");
      }
    } catch (err) {
      console.error("delete customer error", err);
      notify("Terjadi kesalahan sistem saat menghapus.", "error");
    }
  };

  return (
    <>
    <section className="max-w-5xl mx-auto">
      <header className="mb-4">
        <div>
          <h2 className="m-0 mb-1 text-[18px] font-semibold text-[var(--text-main-primary)]">
            Data Pelanggan {workspaceName ? `- ${workspaceName}` : ""}
          </h2>
          <p className="m-0 text-[12px] text-[var(--text-main-secondary)]">
            Kelola data diri pelanggan ISP pada workspace ini.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Tabel Data */}
        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-[13px] font-semibold text-[var(--text-main-primary)]">
              Daftar Pelanggan Terdaftar
            </h3>
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
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[var(--bg-main)] text-[var(--text-main-secondary)] border-b border-[var(--border-main)]">
                  <th className="px-2.5 py-2 text-left font-semibold">Nama Instansi / Pelanggan</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Email</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Alamat Lokasi</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Tagihan Bulanan</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Tgl Daftar</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-2.5 py-6 text-center text-[var(--text-main-secondary)]">Memuat data...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2.5 py-6 text-center text-[var(--text-main-secondary)]">Belum ada data pelanggan di workspace ini.</td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border-main)] hover:bg-[var(--bg-main)]">
                      <td className="px-2.5 py-2 align-top">
                        <div className="font-semibold text-[var(--text-main-primary)]">{c.name}</div>
                      </td>
                      <td className="px-2.5 py-2 align-top text-[var(--text-main-secondary)]">
                        {c.email || <span className="text-[var(--text-main-secondary)] italic">Belum diset</span>}
                      </td>
                      <td className="px-2.5 py-2 align-top text-[var(--text-main-secondary)]">
                        <div className="max-w-[180px] truncate" title={c.address}>
                          {c.address || <span className="text-[var(--text-main-secondary)] italic">Belum diset</span>}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 align-top font-semibold text-emerald-600">
                        {c.monthlyPrice > 0 ? `Rp ${c.monthlyPrice.toLocaleString('id-ID')}` : <span className="text-[var(--text-main-secondary)] italic font-normal">Manual</span>}
                      </td>
                      <td className="px-2.5 py-2 align-top text-[var(--text-main-secondary)]">
                        {new Date(c.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-2.5 py-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="inline-flex items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] hover:opacity-80 transition-all duration-300 shadow-lg px-2 py-1 text-[10px] font-semibold text-[var(--text-main-primary)]"
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
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-main)]">
              <h3 className="m-0 text-[15px] font-bold text-[var(--text-main-primary)]">
                {isEditModalOpen ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h3>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <form id="customerForm" onSubmit={isEditModalOpen ? handleUpdateCustomer : handleAddCustomer} className="flex flex-col gap-4 text-[12px]">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-main-secondary)]">Nama Pelanggan (Wajib)</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Misal: PT Maju Bersama"
                    required
                    className="h-9 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-3 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-main-secondary)]">Email Utama</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Misal: info@majubersama.com"
                    className="h-9 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-3 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-main-secondary)]">Alamat Lengkap</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat kantor atau lokasi pemasangan..."
                    className="w-full min-h-[100px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] p-3 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 resize-y"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Pilih Perangkat MikroTik (Opsional)</label>
                  <select
                    value={deviceId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setDeviceId(val);
                      if (val) fetchQueues(val);
                      else setQueues([]);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] text-[var(--text-main-primary)]"
                  >
                    <option value="">-- Tanpa Perangkat --</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.ip})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Pilih Queue (Opsional)</label>
                  <select
                    value={queueName}
                    onChange={(e) => setQueueName(e.target.value)}
                    disabled={isLoadingQueues || !deviceId}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] text-[var(--text-main-primary)] disabled:opacity-50"
                  >
                    <option value="">{isLoadingQueues ? "Memuat Queue..." : "-- Pilih Queue --"}</option>
                    {queues.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>
              </form>
            </div>
            <div className="p-4 border-t border-[var(--border-main)] flex justify-end gap-2 bg-[var(--bg-main)]/30">
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
                className="px-4 py-2 rounded-full border border-[var(--border-main)] bg-transparent text-[12px] font-semibold text-[var(--text-main-secondary)] hover:opacity-80 transition-colors cursor-pointer"
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
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl p-5">
            <h3 className="m-0 mb-2 text-[15px] font-bold text-[var(--text-main-primary)]">Konfirmasi Hapus</h3>
            <p className="m-0 mb-4 text-[12px] text-[var(--text-main-secondary)]">
              Apakah Anda yakin ingin menghapus pelanggan <strong>{customerToDelete.name}</strong>? Data tagihan terkait juga akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-lg text-[12px] font-semibold text-[var(--text-main-secondary)] hover:opacity-80 cursor-pointer"
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


    </section>
    </>
  );
};

export default CustomerSection;
