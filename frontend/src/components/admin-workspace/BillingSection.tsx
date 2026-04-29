import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import type { Customer } from "./CustomerSection";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

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
  const { notify } = useNotification();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form Invoice State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
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

  // Custom Confirm Dialog
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

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
        if (custData.length > 0) {
          setSelectedCustomerId(custData[0].id);
          setPrice(custData[0].monthlyPrice || 0);
        }
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

  const handleGenerateInvoice = async () => {
    if (!selectedCustomerId || !periodMonth) {
      notify("Pilih pelanggan dan periode terlebih dahulu.", "warning");
      return;
    }

    setIsGenerating(true);
    try {
      // Update Customer's Monthly Price (so future automated bills use this price)
      const customer = customers.find(c => c.id === Number(selectedCustomerId));
      if (customer) {
        const updatePayload = {
          name: customer.name,
          email: customer.email,
          address: customer.address,
          workspaceId: customer.workspaceId,
          deviceId: customer.deviceId,
          queueName: customer.queueName,
          monthlyPrice: Number(price),
        };
        await fetch(`/api/customers/${customer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload)
        });
      }

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
        setPrice(0);
        setIsCreateInvoiceModalOpen(false);
        notify("Tagihan baru berhasil dibuat!", "success");
      } else {
        const text = await res.text();
        notify("Gagal membuat tagihan: " + text, "error");
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
        const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
        if (res.ok) setInvoices((prev) => prev.filter((i) => i.id !== id));
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
        setSendingEmailId(id);
        try {
          const res = await fetch(`/api/invoices/${id}/send-email`, { method: "POST" });
          if (res.ok) {
            notify("Invoice berhasil dikirim ke email pelanggan!", "success");
          } else {
            const data = await res.json();
            notify("Gagal mengirim email: " + data.error, "error");
          }
        } catch (err) { 
          console.error("send email err", err);
          notify("Gagal menghubungi server email.", "error");
        } finally {
          setSendingEmailId(null);
        }
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
        notify("Status tagihan berhasil diperbarui!", "success");
      } else {
        notify("Gagal memperbarui status tagihan.", "error");
      }
    } catch (err) {
      console.error("save status err", err);
      notify("Terjadi kesalahan sistem.", "error");
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
        notify("Paket layanan berhasil ditambahkan!", "success");
      } else {
        notify("Gagal membuat paket: " + await res.text(), "error");
      }
    } catch (err) {
      console.error(err);
      notify("Terjadi kesalahan saat membuat paket.", "error");
    }
  };

  const handleDeletePackage = (id: number) => {
    showConfirm({
      title: "Hapus Paket",
      message: "Apakah Anda yakin ingin menghapus paket layanan ini?",
      confirmLabel: "Hapus",
      variant: "danger",
      onConfirm: async () => {
        const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
        if (res.ok) {
          setPackages(prev => prev.filter(p => p.id !== id));
          notify("Paket layanan berhasil dihapus.", "success");
        } else {
          notify("Gagal menghapus paket.", "error");
        }
      },
    });
  };




  return (
    <>
    <section className="max-w-5xl mx-auto">
      <header className="mb-4">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-[var(--text-main-primary)]">
            💳 Billing & Invoice
          </h1>
          <p className="m-0 text-[12px] text-[var(--text-main-secondary)]">
            Kelola tagihan dan daftar paket layanan ISP.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 mb-4">
        {/* Tabel Invoice */}
        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-lg p-0 h-fit overflow-hidden">
          <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-semibold text-[var(--text-main-primary)]">
              Riwayat Tagihan
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(true)}
                className="px-3 py-1.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] text-[11px] font-semibold hover:opacity-80 cursor-pointer shadow-sm transition-colors"
              >
                ⚙️ Kelola Paket
              </button>
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
              >
                + Buat Tagihan Baru
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full border-collapse text-[11px] text-left">
              <thead className="sticky top-0 bg-[var(--bg-main)] z-10 shadow-sm border-b border-[var(--border-main)]">
                <tr className="text-[var(--text-main-secondary)]">
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
                    <td colSpan={5} className="px-3 py-6 text-center text-[var(--text-main-secondary)]">Loading...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[var(--text-main-secondary)]">Belum ada invoice yang diterbitkan.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-[var(--border-main)] hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-3 py-2.5 text-[var(--text-main-primary)] font-medium whitespace-nowrap">
                        {inv.customerName || `Cust ID: ${inv.customerId}`}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-main-secondary)]">
                        {inv.periodStart.slice(0, 7)}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-main-primary)] font-semibold">
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
                            ? "border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-secondary)]" 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[16px] font-bold text-[var(--text-main-primary)]">Master Data Paket Layanan</h3>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="w-7 h-7 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-secondary)] hover:opacity-80 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[12px] text-[var(--text-main-secondary)] mb-4 mt-0">
              Paket yang dibuat di sini akan muncul pada dropdown template harga saat menambah data Pelanggan.
            </p>

            <form onSubmit={handleCreatePackage} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 items-end bg-[var(--bg-main)]/50 p-3 rounded-xl border border-[var(--border-main)]">
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Nama Paket</label>
                  <input
                    type="text"
                    required
                    value={newPkgName}
                    onChange={e => setNewPkgName(e.target.value)}
                    placeholder="e.g. Dedicated 50Mbps"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] text-[var(--text-main-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Max Bandwidth (Mbps)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPkgBandwidth}
                    onChange={e => setNewPkgBandwidth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] text-[var(--text-main-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">Harga (Rp)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      required
                      value={newPkgPrice}
                      onChange={e => setNewPkgPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] text-[var(--text-main-primary)]"
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

            <div className="max-h-[220px] overflow-auto border border-[var(--border-main)] rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[var(--bg-main)] text-[var(--text-main-secondary)] sticky top-0 border-b border-[var(--border-main)]">
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
                      <td colSpan={4} className="px-3 py-4 text-center text-[var(--text-main-secondary)]">Belum ada paket yang terdaftar.</td>
                    </tr>
                  ) : (
                    packages.map(p => (
                      <tr key={p.id} className="border-b border-[var(--border-main)] hover:bg-[var(--bg-main)]">
                        <td className="px-3 py-2 font-medium text-[var(--text-main-primary)]">{p.name}</td>
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
                className="px-4 py-2 rounded border border-[var(--border-main)] text-[var(--text-main-secondary)] text-[12px] font-medium hover:opacity-80 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUAT TAGIHAN */}
      {isCreateInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-main)]">
              <h3 className="m-0 text-[15px] font-bold text-[var(--text-main-primary)]">
                Buat Tagihan Baru
              </h3>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-4 text-[12px]">
                <div>
                  <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">
                    Pilih Klien / Pelanggan
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedCustomerId(id);
                      const customer = customers.find((c) => c.id === id);
                      if (customer) {
                        setPrice(customer.monthlyPrice || 0);
                      } else {
                        setPrice(0);
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border-main)] text-[12px] bg-[var(--bg-main)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-[var(--text-main-primary)]"
                  >
                    <option value="" disabled>-- Pilih Pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">
                    Periode Tagihan
                  </div>
                  <input
                    type="month"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-[var(--text-main-primary)]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">
                    Pilih Paket (Template Harga)
                  </div>
                  <select
                    onChange={(e) => {
                      const pkg = packages.find(p => p.id === Number(e.target.value));
                      if (pkg) setPrice(pkg.price);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border-main)] text-[12px] bg-[var(--bg-main)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-[var(--text-main-primary)]"
                  >
                    <option value="">-- Atur Manual --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Rp {p.price.toLocaleString("id-ID")})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-[var(--text-main-secondary)] mb-1">
                    Total Tagihan (Rp)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border-main)] text-[12px] outline-none bg-[var(--bg-main)] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 text-[var(--text-main-primary)] font-semibold"
                  />
                  <p className="mt-1.5 text-[10px] text-[var(--text-main-secondary)] leading-relaxed italic">
                    * Nominal ini akan otomatis tersimpan sebagai biaya langganan bulanan tetap untuk pelanggan ini.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border-main)] flex justify-end gap-2 bg-[var(--bg-main)]/30">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[var(--border-main)] bg-transparent text-[12px] font-semibold text-[var(--text-main-secondary)] hover:opacity-80 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-sm max-h-[90vh] rounded-[32px] border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-6 flex justify-between items-center bg-[var(--card-main-bg)]/80 backdrop-blur-md border-b border-[var(--border-main)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h3 className="m-0 text-[18px] font-bold text-[var(--text-main-primary)]">Kelola Tagihan</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="w-8 h-8 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-secondary)] hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Summary Card */}
              <div className="mb-6 p-4 rounded-3xl bg-[var(--bg-main)] border border-[var(--border-main)] shadow-inner">
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Nama Klien</span>
                    <span className="text-[14px] font-bold text-[var(--text-main-primary)]">{editingInvoice.customerName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Nominal</span>
                      <span className="text-[14px] font-extrabold text-blue-600">Rp {editingInvoice.amount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Periode</span>
                      <span className="text-[14px] font-bold text-[var(--text-main-primary)]">{editingInvoice.periodStart.slice(0, 7)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest mb-2 ml-1">Status Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-main)]">
                    <button
                      type="button"
                      onClick={() => setModalStatus("unpaid")}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all ${modalStatus === "unpaid" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-[var(--text-main-secondary)] hover:bg-[var(--border-main)]"}`}
                    >
                      BELUM LUNAS
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalStatus("paid")}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all ${modalStatus === "paid" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-[var(--text-main-secondary)] hover:bg-[var(--border-main)]"}`}
                    >
                      SUDAH LUNAS
                    </button>
                  </div>
                </div>

                {modalStatus === "paid" && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-main)] to-transparent" />
                    
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest mb-1.5 ml-1">Tanggal Bayar</label>
                        <input
                          type="date"
                          value={modalPaymentDate}
                          onChange={(e) => setModalPaymentDate(e.target.value)}
                          className="w-full h-11 px-4 rounded-2xl border border-[var(--border-main)] text-[13px] bg-[var(--bg-main)] text-[var(--text-main-primary)] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest mb-1.5 ml-1">Metode Pembayaran</label>
                        <input
                          type="text"
                          placeholder="e.g. Transfer Bank / Tunai"
                          value={modalPaymentMethod}
                          onChange={(e) => setModalPaymentMethod(e.target.value)}
                          className="w-full h-11 px-4 rounded-2xl border border-[var(--border-main)] text-[13px] bg-[var(--bg-main)] text-[var(--text-main-primary)] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest mb-1.5 ml-1">Catatan</label>
                        <textarea
                          placeholder="Tambahkan info jika perlu..."
                          value={modalNotes}
                          onChange={(e) => setModalNotes(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 rounded-2xl border border-[var(--border-main)] text-[13px] bg-[var(--bg-main)] text-[var(--text-main-primary)] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest mb-2 ml-1">Bukti Transfer</label>
                        <div className="flex flex-col gap-2">
                          <label className="w-full h-24 rounded-3xl border-2 border-dashed border-[var(--border-main)] hover:border-blue-500/50 hover:bg-blue-50/10 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative">
                            {modalFile ? (
                              <div className="flex items-center gap-2 text-emerald-600 font-bold text-[12px]">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-11 11.01-3-3"/></svg>
                                <span>{modalFile.name.length > 20 ? modalFile.name.substring(0, 20) + "..." : modalFile.name}</span>
                              </div>
                            ) : (
                              <>
                                <svg className="mb-2 text-[var(--text-main-secondary)] group-hover:text-blue-500 transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                <span className="text-[11px] font-bold text-[var(--text-main-secondary)] group-hover:text-blue-500 transition-colors">Pilih Berkas Bukti</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                          {editingInvoice.proofOfTransferUrl && !modalFile && (
                            <a 
                              href={editingInvoice.proofOfTransferUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] font-bold text-blue-600 hover:bg-blue-500/10 text-center transition-all"
                            >
                              👁️ Lihat Bukti Saat Ini
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-main)] bg-[var(--bg-main)]/30 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="flex-1 px-4 py-3 rounded-2xl border border-[var(--border-main)] text-[var(--text-main-primary)] text-[13px] font-bold hover:bg-[var(--bg-main)] transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveInvoiceStatus}
                disabled={isSavingStatus}
                className="flex-1 px-4 py-3 rounded-2xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isSavingStatus ? "..." : "Simpan Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PEMBAYARAN */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[32px] border border-[var(--border-main)] bg-[var(--card-main-bg)] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-11 11.01-3-3"/></svg>
                </div>
                <h3 className="m-0 text-[18px] font-bold text-[var(--text-main-primary)]">Detail Bayar</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="w-8 h-8 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-secondary)] hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Summary Receipt */}
              <div className="p-5 rounded-3xl bg-[var(--bg-main)] border border-[var(--border-main)] shadow-inner">
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Penerima</span>
                    <span className="text-[14px] font-bold text-[var(--text-main-primary)]">{viewingInvoice.customerName}</span>
                  </div>
                  <div className="h-px bg-dashed border-t border-[var(--border-main)]" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Total Bayar</span>
                      <span className="text-[15px] font-extrabold text-emerald-600">Rp {viewingInvoice.amount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Periode</span>
                      <span className="text-[14px] font-bold text-[var(--text-main-primary)]">{viewingInvoice.periodStart.slice(0, 7)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Tanggal Lunas</span>
                    <div className="text-[13px] font-bold text-[var(--text-main-primary)] flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {viewingInvoice.paymentDate ? new Date(viewingInvoice.paymentDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Metode</span>
                    <div className="text-[13px] font-bold text-blue-600">
                      {viewingInvoice.paymentMethod || "Bebas"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {viewingInvoice.notes && (
                  <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-main)]">
                    <label className="text-[9px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Catatan Tambahan</label>
                    <div className="text-[12px] text-[var(--text-main-secondary)] italic leading-relaxed">
                      "{viewingInvoice.notes}"
                    </div>
                  </div>
                )}

                {viewingInvoice.proofOfTransferUrl && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest ml-1">Lampiran Bukti</label>
                    <a 
                      href={viewingInvoice.proofOfTransferUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-3xl border-2 border-[var(--border-main)] aspect-video bg-[var(--bg-main)] flex items-center justify-center hover:border-blue-500/50 transition-all shadow-lg"
                    >
                      <img 
                        src={viewingInvoice.proofOfTransferUrl} 
                        alt="Bukti Bayar" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                        <div className="bg-white/20 backdrop-blur-md border border-white/30 px-5 py-2.5 rounded-full text-white text-[12px] font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                          Perbesar Gambar
                        </div>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingInvoice(null)}
              className="w-full mt-8 py-4 rounded-2xl bg-[var(--text-main-primary)] text-[var(--card-main-bg)] text-[13px] font-bold hover:opacity-90 transition-all shadow-xl active:scale-[0.98]"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </section>
    </>
  );
};

export default BillingSection;
