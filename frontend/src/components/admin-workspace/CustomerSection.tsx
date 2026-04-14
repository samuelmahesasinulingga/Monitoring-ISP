import React, { useState, useEffect } from "react";

export type Customer = {
  id: number;
  name: string;
  email?: string;
  address?: string;
  workspaceId?: number;
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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4">
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Data Pelanggan {workspaceName ? `- ${workspaceName}` : ""}
        </h2>
        <p className="m-0 text-[12px] text-slate-500">
          Kelola data diri pelanggan ISP pada workspace ini.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        {/* Sidebar Form */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-900/5 h-fit">
          <h3 className="m-0 mb-3 text-[13px] font-semibold text-slate-900">
            {isEditModalOpen ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
          </h3>
          <form onSubmit={isEditModalOpen ? handleUpdateCustomer : handleAddCustomer} className="flex flex-col gap-3 text-[12px]">
            <div>
              <label className="mb-1 block text-[11px] text-slate-600">Nama Pelanggan (Wajib)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: PT Maju Bersama"
                required
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-600">Email Utama</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Misal: info@majubersama.com"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-600">Alamat Lengkap</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat kantor atau lokasi pemasangan..."
                className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-white p-2.5 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 resize-y"
              />
            </div>
            
            <div className="flex gap-2 mt-2">
              {isEditModalOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCustomer(null);
                    setName("");
                    setEmail("");
                    setAddress("");
                  }}
                  className="inline-flex h-8 w-full items-center justify-center rounded-full border border-slate-300 bg-white text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-8 w-full items-center justify-center rounded-full border-0 bg-blue-600 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
              >
                {isEditModalOpen ? "Simpan Perbaikan" : "+ Tambah"}
              </button>
            </div>
          </form>
        </div>

        {/* Tabel Data */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-900/5">
          <div className="mb-4">
            <h3 className="m-0 text-[13px] font-semibold text-slate-900">
              Daftar Pelanggan Terdaftar
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
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
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2.5 py-2 align-top">
                        <div className="font-semibold text-slate-800">{c.name}</div>
                      </td>
                      <td className="px-2.5 py-2 align-top text-slate-600">
                        {c.email || <span className="text-slate-400 italic">Belum diset</span>}
                      </td>
                      <td className="px-2.5 py-2 align-top text-slate-600">
                        <div className="max-w-[180px] truncate" title={c.address}>
                          {c.address || <span className="text-slate-400 italic">Belum diset</span>}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 align-top text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-2.5 py-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
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

      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="m-0 mb-2 text-[15px] font-bold text-slate-900">Konfirmasi Hapus</h3>
            <p className="m-0 mb-4 text-[12px] text-slate-600">
              Apakah Anda yakin ingin menghapus pelanggan <strong>{customerToDelete.name}</strong>? Data tagihan dan layanan terkait juga akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-300 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
  );
};

export default CustomerSection;
