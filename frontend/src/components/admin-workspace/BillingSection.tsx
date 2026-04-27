import React, { useState, useEffect } from "react";
import type { Customer } from "./CustomerSection";
import ConfirmDialog from "../ui/ConfirmDialog";

interface BillingSectionProps {
  workspaceName?: string;
  workspaceId?: number;
}

interface Invoice {
  id: number;
  customerId: number;
  customerName?: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: string;
  workspaceId?: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  proofOfTransferUrl?: string;
  created_at: string;
}

interface PackageInfo {
  id: number;
  name: string;
  bandwidthMbps: number;
  price: number;
  workspaceId?: number;
}

const BillingSection: React.FC<BillingSectionProps> = ({ workspaceName, workspaceId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Invoice State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | "">("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [price, setPrice] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);



  // Invoice Management Modal State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [modalStatus, setModalStatus] = useState<string>("unpaid");
  const [modalPaymentDate, setModalPaymentDate] = useState<string>("");
  const [modalPaymentMethod, setModalPaymentMethod] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgBandwidth, setNewPkgBandwidth] = useState(50);
  const [newPkgPrice, setNewPkgPrice] = useState(350000);

  // Animation State
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; variant?: "danger" | "warning" | "info";
    isLoading?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const showConfirm = (opts: Omit<typeof confirmDialog, "isOpen" | "isLoading">) =>
    setConfirmDialog({ ...opts, isOpen: true, isLoading: false });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const wsQuery = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const [custRes, invRes, pkgRes] = await Promise.all([
        fetch(`/api/customers${wsQuery}`),
        fetch(`/api/invoices${wsQuery}`),
        fetch(`/api/packages${wsQuery}`)
      ]);

      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
        if (custData.length > 0) setSelectedCustomerId(custData[0].id);
      }
      if (invRes.ok) setInvoices(await invRes.json());
      if (pkgRes.ok) setPackages(await pkgRes.json());
      

    } catch (err) {
      console.error("fetch billing data err", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const handlePackageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pkgId = Number(e.target.value);
    setSelectedPackageId(pkgId);

    // Auto fill price based on selected package
    const selectedPkg = packages.find(p => p.id === pkgId);
    if (selectedPkg) {
      setPrice(selectedPkg.price);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedCustomerId || !periodMonth) {
      alert("Pilih pelanggan dan periode terlebih dahulu.");
      return;
    }

    setIsGenerating(true);
    try {
      const [yearStr, monthStr] = periodMonth.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const startDate = `${periodMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${periodMonth}-${lastDay}`;

      const payload = {
        customerId: Number(selectedCustomerId),
        periodStart: startDate,
        periodEnd: endDate,
        amount: price,
        status: "unpaid",
        workspaceId: workspaceId ?? null
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setInvoices((prev) => [created, ...prev]);
        setSelectedPackageId("");
        setPrice(0);
        setIsCreateInvoiceModalOpen(false);
      } else {
        const text = await res.text();
        alert("Gagal membuat tagihan: " + text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteInvoice = (id: number) => {
    showConfirm({
      title: "Hapus Tagihan",
      message: "Apakah Anda yakin ingin menghapus tagihan ini?",
      confirmLabel: "Hapus",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
          if (res.ok) setInvoices((prev) => prev.filter((i) => i.id !== id));
        } catch (err) { console.error(err); }
        finally { closeConfirm(); }
      },
    });
  };

  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  const handleSendInvoiceEmail = (id: number) => {
    showConfirm({
      title: "Kirim Invoice ke Email",
      message: "Apakah Anda yakin ingin mengirim invoice ini ke email pelanggan?",
      confirmLabel: "Kirim Email",
      variant: "info",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        setSendingEmailId(id);
        try {
          const res = await fetch(`/api/invoices/${id}/send-email`, { method: "POST" });
          const data = await res.json();
          if (res.ok) {
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
          } else {
            alert("Gagal kirim email: " + data.error);
          }
        } catch (err) { console.error(err); }
        finally { setSendingEmailId(null); closeConfirm(); }
      },
    });
  };

  const handleOpenStatusModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setModalStatus(inv.status);
    setModalPaymentDate(inv.paymentDate ? inv.paymentDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setModalPaymentMethod(inv.paymentMethod || "");
    setModalNotes(inv.notes || "");
    setModalFile(null);
  };

  const handleSaveInvoiceStatus = async () => {
    if (!editingInvoice) return;
    setIsSavingStatus(true);
    try {
      const formData = new FormData();
      formData.append("status", modalStatus);
      
      if (modalStatus === "paid") {
        const pDate = modalPaymentDate ? new Date(modalPaymentDate).toISOString() : new Date().toISOString();
        formData.append("paymentDate", pDate);
        formData.append("paymentMethod", modalPaymentMethod);
        formData.append("notes", modalNotes);
        if (modalFile) {
          formData.append("proofOfTransfer", modalFile);
        }
      } else {
        formData.append("paymentDate", "");
        formData.append("paymentMethod", "");
        formData.append("notes", "");
      }

      const res = await fetch(`/api/invoices/${editingInvoice.id}/status`, {
        method: "PUT",
        body: formData
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setEditingInvoice(null);
      } else {
        alert("Gagal memperbarui status tagihan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // --- Package Management Methods ---
  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName.trim() || newPkgBandwidth <= 0) return;

    try {
      const payload = {
        name: newPkgName.trim(),
        bandwidthMbps: newPkgBandwidth,
        price: newPkgPrice,
        workspaceId: workspaceId ?? null
      };

      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setPackages(prev => [...prev, created]);
        setNewPkgName("");
        setNewPkgBandwidth(50);
        setNewPkgPrice(350000);
      } else {
        alert("Gagal membuat paket: " + await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePackage = (id: number) => {
    showConfirm({
      title: "Hapus Paket",
      message: "Apakah Anda yakin ingin menghapus paket layanan ini?",
      confirmLabel: "Hapus",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
          if (res.ok) setPackages(prev => prev.filter(p => p.id !== id));
        } catch (err) { console.error(err); }
        finally { closeConfirm(); }
      },
    });
  };



  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <>
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-100">
            💳 Billing & Invoice
          </h1>
          <p className="m-0 text-[12px] text-slate-400">
            Kelola tagihan dan daftar paket layanan ISP.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPackageModalOpen(true)}
            className="px-4 py-2 rounded-full border border-slate-700 bg-slate-800 text-slate-100 text-[12px] font-semibold hover:bg-slate-700 cursor-pointer shadow-sm transition-colors"
          >
            ⚙️ Kelola Paket
          </button>
          <button
            type="button"
            onClick={() => setIsCreateInvoiceModalOpen(true)}
            className="px-4 py-2 rounded-full bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
          >
            + Buat Tagihan Baru
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 mb-4">

        {/* Tabel Invoice */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/95 p-0 shadow-md shadow-black/20 h-fit overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-semibold text-slate-100">
              Riwayat Tagihan
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full border-collapse text-[11px] text-left">
              <thead className="sticky top-0 bg-slate-800/50 z-10 shadow-sm border-b border-slate-800">
                <tr className="text-slate-400">
                  <th className="px-3 py-2.5 font-semibold">Pelanggan</th>
                  <th className="px-3 py-2.5 font-semibold">Periode</th>
                  <th className="px-3 py-2.5 font-semibold">Nominal</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">Belum ada invoice yang diterbitkan.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-800 hover:bg-slate-800/50/50 transition-colors">
                      <td className="px-3 py-2.5 text-slate-100 font-medium whitespace-nowrap">
                        {inv.customerName || `Cust ID: ${inv.customerId}`}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {inv.periodStart.slice(0, 7)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 font-semibold">
                        Rp {inv.amount.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(inv)}
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border cursor-pointer transition-colors ${inv.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              }`}
                          >
                            {inv.status === "paid" ? "LUNAS" : "BELUM LUNAS"} ⚙️
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right flex gap-2 justify-end">
                        <button
                          type="button"
                          disabled={sendingEmailId === inv.id || inv.status === "paid"}
                          onClick={() => handleSendInvoiceEmail(inv.id)}
                          className={`inline-flex items-center justify-center rounded-lg border px-2 py-1 text-[10px] font-semibold cursor-pointer disabled:opacity-50 ${
                            inv.status === "paid" 
                            ? "border-slate-800 bg-slate-800/50 text-slate-300" 
                            : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                        >
                          {sendingEmailId === inv.id ? "⏳..." : "📧 Kirim"}
                        </button>
                        {inv.status === "paid" && (
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors"
                          >
                            ℹ️ Detail
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 cursor-pointer transition-colors"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>



      {/* MODAL KELOLA PAKET */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[16px] font-bold text-slate-100">Master Data Paket Layanan</h3>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="w-7 h-7 rounded-full border border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[12px] text-slate-400 mb-4 mt-0">
              Paket yang dibuat di sini akan muncul pada dropdown pembuatan Tagihan untuk kemudahan pengisian nominal.
            </p>

            <form onSubmit={handleCreatePackage} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 items-end bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Nama Paket</label>
                  <input
                    type="text"
                    required
                    value={newPkgName}
                    onChange={e => setNewPkgName(e.target.value)}
                    placeholder="e.g. Dedicated 50Mbps"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-800 text-[12px] outline-none bg-slate-900/50 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Max Bandwidth (Mbps)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPkgBandwidth}
                    onChange={e => setNewPkgBandwidth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-800 text-[12px] outline-none bg-slate-900/50 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Harga (Rp)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      required
                      value={newPkgPrice}
                      onChange={e => setNewPkgPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-800 text-[12px] outline-none bg-slate-900/50 text-slate-100"
                    />
                  </div>
                </div>
              </div>
              <div className="md:col-span-3 flex justify-end mt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  + Tambah Paket
                </button>
              </div>
            </form>

            <div className="max-h-[220px] overflow-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-800 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nama Paket</th>
                    <th className="px-3 py-2 font-semibold text-center">BW Limit</th>
                    <th className="px-3 py-2 font-semibold">Harga Tetap</th>
                    <th className="px-3 py-2 font-semibold text-right">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-400">Belum ada paket yang terdaftar.</td>
                    </tr>
                  ) : (
                    packages.map(p => (
                      <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="px-3 py-2 font-medium text-slate-100">{p.name}</td>
                        <td className="px-3 py-2 text-center text-blue-600 font-semibold">{p.bandwidthMbps} Mbps</td>
                        <td className="px-3 py-2 font-semibold text-emerald-600">Rp {p.price.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(p.id)}
                            className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-semibold cursor-pointer border border-red-200"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="px-4 py-2 rounded border border-slate-300 text-slate-300 text-[12px] font-medium hover:bg-slate-800/50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUAT TAGIHAN MANUAL */}
      {isCreateInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800">
              <h3 className="m-0 text-[15px] font-bold text-slate-100">
                Buat Tagihan Manual Baru
              </h3>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-4 text-[12px]">
                <div>
                  <div className="text-[11px] font-medium text-slate-400 mb-1">
                    Pilih Klien / Pelanggan
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-800 text-[12px] bg-slate-900/80 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-slate-100"
                  >
                    <option value="" disabled>-- Pilih Pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 mb-1">
                      Periode Tagihan
                    </div>
                    <input
                      type="month"
                      value={periodMonth}
                      onChange={(e) => setPeriodMonth(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-800 text-[12px] outline-none bg-slate-900/80 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 mb-1">
                      Pilih Paket Layanan
                    </div>
                    <select
                      value={selectedPackageId}
                      onChange={handlePackageSelect}
                      className="w-full h-10 px-3 rounded-lg border border-slate-800 text-[12px] bg-slate-900/80 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 text-slate-100"
                    >
                      <option value="" disabled>-- Atur Manual --</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.bandwidthMbps} Mbps)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-slate-400 mb-1">
                    Total Tagihan (Rp)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-800 text-[12px] outline-none bg-slate-900/80 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-slate-100"
                  />
                  <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                    * Nilai ini bisa disesuaikan manual meskipun sudah memilih paket jika ada diskon khusus.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/30">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-700 bg-transparent text-[12px] font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isGenerating || customers.length === 0}
                onClick={handleGenerateInvoice}
                className="px-4 py-2 rounded-full border-0 bg-blue-600 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {isGenerating ? "Menyimpan..." : "Publish Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KELOLA STATUS TAGIHAN */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[16px] font-bold text-slate-100">Kelola Tagihan</h3>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="w-7 h-7 rounded-full border border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 bg-slate-800/50 border border-slate-800 rounded-lg p-3 text-[12px]">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Klien</span>
                <span className="font-semibold text-slate-100">{editingInvoice.customerName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Nominal</span>
                <span className="font-semibold text-slate-100">Rp {editingInvoice.amount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Periode</span>
                <span className="font-semibold text-slate-100">{editingInvoice.periodStart.slice(0, 7)}</span>
              </div>
            </div>

            <div className="grid gap-3 mb-5">
              <div>
                <label className="block text-[12px] font-medium text-slate-300 mb-1">Status Pembayaran</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 text-[13px] bg-slate-900/50 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="unpaid">BELUM LUNAS</option>
                  <option value="paid">SUDAH LUNAS</option>
                </select>
              </div>

              {modalStatus === "paid" && (
                <div className="border border-emerald-100 bg-emerald-50/30 rounded-lg p-3 grid gap-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-800 mb-1">Tanggal Pembayaran</label>
                    <input
                      type="date"
                      value={modalPaymentDate}
                      onChange={(e) => setModalPaymentDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-emerald-200 text-[12px] bg-slate-900/50 text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-800 mb-1">Metode Bayar (Bebas)</label>
                    <input
                      type="text"
                      placeholder="e.g. Transfer BCA / Tunai / OVO"
                      value={modalPaymentMethod}
                      onChange={(e) => setModalPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-emerald-200 text-[12px] bg-slate-900/50 text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-800 mb-1">Catatan</label>
                    <textarea
                      placeholder="Catatan tambahan (opsional)"
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded border border-emerald-200 text-[12px] bg-slate-900/50 text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-800 mb-1">Upload Bukti Bayar</label>
                    {editingInvoice.proofOfTransferUrl && (
                      <div className="mb-2 p-2 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg rounded border border-emerald-100 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-semibold">Sudah ada bukti</span>
                        <a href={editingInvoice.proofOfTransferUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline">Lihat</a>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                      className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-300 text-[12px] font-medium hover:bg-slate-800/50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveInvoiceStatus}
                disabled={isSavingStatus}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                {isSavingStatus ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PEMBAYARAN */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="m-0 text-[18px] font-bold text-slate-100">Detail Pembayaran</h3>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="w-8 h-8 rounded-full border border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 shadow-inner">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Klien</span>
                    <span className="text-[13px] font-bold text-slate-100">{viewingInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Nominal</span>
                    <span className="text-[13px] font-bold text-emerald-600">Rp {viewingInvoice.amount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Periode</span>
                    <span className="text-[13px] font-bold text-slate-300">{viewingInvoice.periodStart.slice(0, 7)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu Bayar</label>
                  <div className="px-3 py-2 rounded-xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg border border-slate-800 text-[12px] font-medium text-slate-300">
                    📅 {viewingInvoice.paymentDate ? new Date(viewingInvoice.paymentDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metode Pembayaran</label>
                  <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[12px] font-bold text-blue-700">
                    💳 {viewingInvoice.paymentMethod || "Tidak disebutkan"}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catatan Tambahan</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800 text-[12px] text-slate-400 italic">
                    "{viewingInvoice.notes || "Tidak ada catatan untuk pembayaran ini."}"
                  </div>
                </div>

                {viewingInvoice.proofOfTransferUrl && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bukti Transfer</label>
                    <a 
                      href={viewingInvoice.proofOfTransferUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-2xl border border-slate-800 aspect-video bg-slate-800 flex items-center justify-center hover:border-blue-400 transition-all shadow-sm"
                    >
                      <img 
                        src={viewingInvoice.proofOfTransferUrl} 
                        alt="Bukti Bayar" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-[12px] font-bold bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                          🔍 Klik untuk Memperbesar
                        </span>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingInvoice(null)}
              className="w-full mt-6 py-3 rounded-2xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-[0.98]"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      )}

      {/* NOTIFIKASI ANIMASI SUKSES KIRIM EMAIL */}
      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[18px]">
              ✓
            </div>
            <div>
              <div className="text-[14px] font-bold">Email Terkirim!</div>
              <div className="text-[11px] text-slate-400">Invoice telah berhasil dikirim ke pelanggan.</div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-in {
          0% { transform: translate(-50%, 20px); opacity: 0; }
          60% { transform: translate(-50%, -5px); opacity: 1; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}} />
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

export default BillingSection;
