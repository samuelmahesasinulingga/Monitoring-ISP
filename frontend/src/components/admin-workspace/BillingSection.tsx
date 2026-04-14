import React, { useState, useEffect } from "react";
import type { Customer } from "./CustomerSection";

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

  // Auto Billing Dummy State
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(1);
  const [autoSaveResult, setAutoSaveResult] = useState<string | null>(null);

  // Packages Management State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgBandwidth, setNewPkgBandwidth] = useState(50);
  const [newPkgPrice, setNewPkgPrice] = useState(350000);

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

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm("Hapus tagihan ini?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleInvoiceStatus = async (inv: Invoice) => {
    const newStatus = inv.status === "paid" ? "unpaid" : "paid";
    try {
      const res = await fetch(`/api/invoices/${inv.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
    } catch (err) {
      console.error(err);
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

  const handleDeletePackage = async (id: number) => {
    if (!confirm("Hapus paket ini?")) return;
    try {
      const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
      if (res.ok) setPackages(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAutoBilling = () => {
    setAutoSaveResult(
      `Pengaturan auto kirim tagihan disimpan (dummy): ${autoSendEnabled ? "ON" : "OFF"
      }, jadwal tiap tanggal ${scheduleDay}.`
    );
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-900">
            💳 Billing & Invoice
          </h1>
          <p className="m-0 text-[12px] text-slate-500">
            Buat manual invoice dan pantau tagihan untuk workspace
            {workspaceName ? ` "${workspaceName}"` : " ini"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPackageModalOpen(true)}
          className="px-3.5 py-2 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold hover:bg-blue-100 cursor-pointer shadow-sm transition-colors"
        >
          ⚙️ Kelola Daftar Paket Layanan
        </button>
      </header>

      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)] gap-4 mb-4 items-start">
        {/* Form invoice manual */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-3 text-[15px] font-semibold text-slate-900">
            Buat Tagihan Manual
          </h2>

          <div className="grid gap-3 mb-4">
            <div>
              <div className="text-[12px] font-medium text-slate-600 mb-1">
                Klien / Pelanggan
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[12px] bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              >
                <option value="" disabled>-- Pilih Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] font-medium text-slate-600 mb-1">
                  Periode Tagihan
                </div>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[12px] outline-none bg-slate-50 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>
              <div>
                <div className="text-[12px] font-medium text-slate-600 mb-1">
                  Pilih Paket Layanan
                </div>
                <select
                  value={selectedPackageId}
                  onChange={handlePackageSelect}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[12px] bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
                >
                  <option value="" disabled>-- Setur Manual --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.bandwidthMbps} Mbps)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="text-[12px] font-medium text-slate-600 mb-1">
                Total Tagihan (Rp)
              </div>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[12px] outline-none bg-slate-50 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                Nilai ini bisa disesuaikan manual meskipun sudah memilih paket (mis. ada diskon).
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isGenerating || customers.length === 0}
            onClick={handleGenerateInvoice}
            className="w-full px-3.5 py-2.5 rounded-lg border-0 bg-blue-600 text-white text-[13px] font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {isGenerating ? "Menyimpan..." : "Publish Invoice"}
          </button>
        </div>

        {/* Tabel Invoice */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-0 shadow-md shadow-slate-900/5 h-fit overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-semibold text-slate-900">
              Riwayat Tagihan
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full border-collapse text-[11px] text-left">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b border-slate-200">
                <tr className="text-slate-500">
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
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-slate-800 font-medium whitespace-nowrap">
                        {inv.customerName || `Cust ID: ${inv.customerId}`}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {inv.periodStart.slice(0, 7)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-semibold">
                        Rp {inv.amount.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleInvoiceStatus(inv)}
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border cursor-pointer transition-colors ${inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }`}
                        >
                          {inv.status === "paid" ? "LUNAS" : "BELUM LUNAS"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 cursor-pointer"
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

      {/* Auto kirim tagihan */}
      <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5 mt-4">
        <h2 className="m-0 mb-1 text-[14px] font-semibold text-slate-900">
          Auto Kirim Email Tagihan
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3">
          Atur agar invoice dikirim otomatis ke email pelanggan berdasarkan jadwal (Dummy UI).
        </p>

        <div className="flex flex-wrap gap-4 items-center mb-3">
          <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSendEnabled}
              onChange={(e) => setAutoSendEnabled(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span>Aktifkan auto billing otomatis</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleSaveAutoBilling}
          className="px-3 py-1.5 rounded-lg border-0 bg-slate-800 text-slate-100 text-[12px] font-medium hover:bg-slate-700 cursor-pointer transition-colors"
        >
          Simpan Preferensi
        </button>
      </div>

      {/* MODAL KELOLA PAKET */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[16px] font-bold text-slate-900">Master Data Paket Layanan</h3>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="w-7 h-7 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[12px] text-slate-500 mb-4 mt-0">
              Paket yang dibuat di sini akan muncul pada dropdown pembuatan Tagihan untuk kemudahan pengisian nominal.
            </p>

            <form onSubmit={handleCreatePackage} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Nama Paket</label>
                  <input
                    type="text"
                    required
                    value={newPkgName}
                    onChange={e => setNewPkgName(e.target.value)}
                    placeholder="e.g. Dedicated 50Mbps"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[12px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Max Bandwidth (Mbps)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPkgBandwidth}
                    onChange={e => setNewPkgBandwidth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[12px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Harga (Rp)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      required
                      value={newPkgPrice}
                      onChange={e => setNewPkgPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-[12px] outline-none"
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

            <div className="max-h-[220px] overflow-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200">
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
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
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
                className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-[12px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default BillingSection;
