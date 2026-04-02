import React, { useState } from "react";

interface BillingSectionProps {
  workspaceName?: string;
}

interface DraftInvoice {
  customer: string;
  periodLabel: string;
  price: number;
  slaValue: number;
  totalDowntimeMinutes: number;
  peakMbps: number;
  averageMbps: number;
}

const BillingSection: React.FC<BillingSectionProps> = ({ workspaceName }) => {
  const [selectedCustomer, setSelectedCustomer] = useState("cust-1");
  const [periodMonth, setPeriodMonth] = useState("2026-03");
  const [price, setPrice] = useState(1500000);
  const [draftInvoice, setDraftInvoice] = useState<DraftInvoice | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(1);
  const [autoSaveResult, setAutoSaveResult] = useState<string | null>(null);

  const slaValue = 99.82; // dummy, ideally diambil dari backend (SLA report)
  const totalDowntimeMinutes = 78; // dummy, sama seperti SLAReportSection
  const peakMbps = 120; // dummy, sama seperti SLAReportSection
  const averageMbps = 45; // dummy

  const customerLabel = (value: string) => {
    if (value === "cust-1") return "PT Contoh Pelanggan";
    if (value === "link-1")
      return "Link Backhaul Kantor Pusat - POP Bandung";
    return "Semua pelanggan / link";
  };

  const handleGenerateInvoice = () => {
    const periodLabel = `Periode ${periodMonth}`;

    const invoice: DraftInvoice = {
      customer: customerLabel(selectedCustomer),
      periodLabel,
      price,
      slaValue,
      totalDowntimeMinutes,
      peakMbps,
      averageMbps,
    };

    setDraftInvoice(invoice);
    setSendResult(null);
  };

  const handleSendEmail = () => {
    if (!draftInvoice) return;

    setIsSending(true);
    setSendResult(null);

    // Di tahap berikutnya, integrasikan dengan API backend
    // misalnya: POST /api/workspaces/{id}/invoices/send
    setTimeout(() => {
      setIsSending(false);
      setSendResult(
        "Invoice terkirim (dummy). Integrasikan dengan API backend untuk kirim email sebenarnya."
      );
    }, 800);
  };

  const handleSaveAutoBilling = () => {
    // Di tahap berikutnya, pengaturan ini disimpan ke backend
    // untuk dipakai cron/worker yang menjadwalkan pengiriman invoice.
    setAutoSaveResult(
      `Pengaturan auto kirim tagihan disimpan (dummy): ${
        autoSendEnabled ? "ON" : "OFF"
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
            Buat invoice manual, lihat draft, dan atur pengiriman otomatis untuk workspace
            {workspaceName ? ` "${workspaceName}"` : " ini"}.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 mb-4 items-start">
        {/* Form invoice manual */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Invoice manual
          </h2>
          <p className="m-0 text-[12px] text-slate-500 mb-3">
            Pilih pelanggan, periode tagihan, dan nilai harga. Saat klik
            <strong> Generate Invoice</strong>, sistem akan menghitung nilai SLA
            dan mengambil ringkasan BW usage (dummy) sebagai dasar lampiran.
          </p>

          <div className="grid gap-2.5 mb-3">
            <div>
              <div className="text-[12px] text-slate-600 mb-1">
                Pelanggan / link
              </div>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              >
                <option value="cust-1">PT Contoh Pelanggan</option>
                <option value="link-1">
                  Link Backhaul Kantor Pusat - POP Bandung
                </option>
                <option value="all">Semua pelanggan / link (agregat)</option>
              </select>
            </div>

            <div>
              <div className="text-[12px] text-slate-600 mb-1">
                Periode tagihan
              </div>
              <input
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              />
              <div className="mt-1 text-[11px] text-slate-400">
                Contoh: 2026-03 untuk tagihan bulan Maret 2026.
              </div>
            </div>

            <div>
              <div className="text-[12px] text-slate-600 mb-1">
                Harga (nilai tagihan)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-slate-500 min-w-[26px]">
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 text-[12px] outline-none bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Nilai ini bisa berasal dari perhitungan tarif per Mbps, BW
                commit, atau paket layanan.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateInvoice}
            className="px-3.5 py-2 rounded-full border-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-[13px] font-semibold shadow-sm hover:from-blue-700 hover:to-indigo-700"
          >
            Generate Invoice
          </button>
        </div>

        {/* Draft invoice + kirim email */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Draft invoice & lampiran
          </h2>
          <p className="m-0 text-[12px] text-slate-500 mb-2.5">
            Hasil perhitungan SLA dan BW usage akan ditampilkan sebagai draft
            sebelum dikirim ke email pelanggan.
          </p>

          {!draftInvoice && (
            <div
              className="text-[12px] text-slate-400 bg-slate-50 rounded-xl px-3 py-3"
            >
              Belum ada draft invoice. Silakan isi form dan klik
              <strong> Generate Invoice</strong> terlebih dahulu.
            </div>
          )}

          {draftInvoice && (
            <div
              className="rounded-xl px-3 py-3 bg-slate-50 border border-slate-200 text-[12px] text-slate-600"
            >
              <div
                className="flex justify-between gap-2 mb-2 flex-wrap"
              >
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">
                    Pelanggan / link
                  </div>
                  <div className="font-semibold text-slate-800">
                    {draftInvoice.customer}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">
                    Periode
                  </div>
                  <div className="font-semibold text-slate-800">
                    {draftInvoice.periodLabel}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-0.5">
                    Nilai tagihan
                  </div>
                  <div className="font-bold text-slate-900">
                    Rp {draftInvoice.price.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg px-2.5 py-2.5 bg-emerald-50 border border-emerald-200 mb-2"
              >
                <div className="text-[11px] text-emerald-800 mb-0.5">
                  Ringkasan SLA (dummy)
                </div>
                <div>
                  SLA periode ini: {draftInvoice.slaValue.toFixed(3)}% dengan
                  estimasi downtime {Math.floor(
                    draftInvoice.totalDowntimeMinutes / 60
                  )} jam {draftInvoice.totalDowntimeMinutes % 60} menit.
                </div>
              </div>

              <div
                className="rounded-lg px-2.5 py-2.5 bg-slate-50 border border-blue-200 mb-2"
              >
                <div className="text-[11px] text-blue-700 mb-0.5">
                  Ringkasan BW usage (dummy)
                </div>
                <div>
                  Peak usage: {draftInvoice.peakMbps} Mbps, rata-rata: {
                    draftInvoice.averageMbps
                  }{" "}
                  Mbps.
                </div>
              </div>

              <p className="m-0 text-[11px] text-slate-500 mb-2.5">
                Catatan: lampiran detail (grafik & tabel) nantinya di-generate
                oleh backend berdasarkan data monitoring dan dilampirkan dalam
                email invoice.
              </p>

              <button
                type="button"
                disabled={isSending}
                onClick={handleSendEmail}
                className={`px-3.5 py-2 rounded-full border-0 text-[13px] font-semibold text-white ${
                  isSending
                    ? "bg-slate-400 cursor-default"
                    : "bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 cursor-pointer"
                }`}
              >
                {isSending ? "Mengirim..." : "Kirim invoice ke email"}
              </button>

              {sendResult && (
                <div className="mt-2 text-[11px] text-slate-500">
                  {sendResult}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auto kirim tagihan */}
      <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
        <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
          Auto kirim tagihan
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-2.5">
          Atur agar invoice dikirim otomatis ke email pelanggan berdasarkan
          jadwal. Pengaturan ini akan disimpan di backend dan dijalankan oleh
          cron/worker.
        </p>

        <div className="flex flex-wrap gap-4 items-center mb-2.5">
          <label className="flex items-center gap-2 text-[13px] text-slate-900">
            <input
              type="checkbox"
              checked={autoSendEnabled}
              onChange={(e) => setAutoSendEnabled(e.target.checked)}
            />
            <span>
              Auto send invoice untuk workspace
              {workspaceName ? ` "${workspaceName}"` : " ini"}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-600">Jadwal:</span>
            <select
              value={scheduleDay}
              onChange={(e) => setScheduleDay(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60"
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  Tiap tanggal {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAutoBilling}
          className="px-3.5 py-1.5 rounded-full border-0 bg-sky-500 text-white text-[13px] font-semibold hover:bg-sky-600"
        >
          Simpan pengaturan auto billing
        </button>

        {autoSaveResult && (
          <div className="mt-2 text-[11px] text-slate-500">
            {autoSaveResult}
          </div>
        )}
      </div>
    </section>
  );
};

export default BillingSection;
