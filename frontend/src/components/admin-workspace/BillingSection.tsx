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
    <section style={{ maxWidth: 960, margin: "0 auto" }}>
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 4,
            }}
          >
            💳 Billing & Invoice
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
            Buat invoice manual, lihat draft, dan atur pengiriman otomatis
            untuk workspace
            {workspaceName ? ` "${workspaceName}"` : " ini"}.
          </p>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
          gap: 16,
          marginBottom: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Form invoice manual */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Invoice manual
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            Pilih pelanggan, periode tagihan, dan nilai harga. Saat klik
            <strong> Generate Invoice</strong>, sistem akan menghitung nilai SLA
            dan mengambil ringkasan BW usage (dummy) sebagai dasar lampiran.
          </p>

          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div>
              <div
                style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}
              >
                Pelanggan / link
              </div>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  background: "#ffffff",
                }}
              >
                <option value="cust-1">PT Contoh Pelanggan</option>
                <option value="link-1">
                  Link Backhaul Kantor Pusat - POP Bandung
                </option>
                <option value="all">Semua pelanggan / link (agregat)</option>
              </select>
            </div>

            <div>
              <div
                style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}
              >
                Periode tagihan
              </div>
              <input
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <div
                style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}
              >
                Contoh: 2026-03 untuk tagihan bulan Maret 2026.
              </div>
            </div>

            <div>
              <div
                style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}
              >
                Harga (nilai tagihan)
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{ fontSize: 12, color: "#6b7280", minWidth: 26 }}
                >
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
              </div>
              <div
                style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}
              >
                Nilai ini bisa berasal dari perhitungan tarif per Mbps, BW
                commit, atau paket layanan.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateInvoice}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Generate Invoice
          </button>
        </div>

        {/* Draft invoice + kirim email */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Draft invoice & lampiran
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Hasil perhitungan SLA dan BW usage akan ditampilkan sebagai draft
            sebelum dikirim ke email pelanggan.
          </p>

          {!draftInvoice && (
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                background: "#f9fafb",
                borderRadius: 12,
                padding: 12,
              }}
            >
              Belum ada draft invoice. Silakan isi form dan klik
              <strong> Generate Invoice</strong> terlebih dahulu.
            </div>
          )}

          {draftInvoice && (
            <div
              style={{
                borderRadius: 12,
                padding: 12,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}
                  >
                    Pelanggan / link
                  </div>
                  <div style={{ fontWeight: 600 }}>{draftInvoice.customer}</div>
                </div>
                <div>
                  <div
                    style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}
                  >
                    Periode
                  </div>
                  <div style={{ fontWeight: 600 }}>{draftInvoice.periodLabel}</div>
                </div>
                <div>
                  <div
                    style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}
                  >
                    Nilai tagihan
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    Rp {draftInvoice.price.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 10,
                  padding: 10,
                  background: "#ecfdf3",
                  border: "1px solid #bbf7d0",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ fontSize: 11, color: "#166534", marginBottom: 2 }}
                >
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
                style={{
                  borderRadius: 10,
                  padding: 10,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ fontSize: 11, color: "#1d4ed8", marginBottom: 2 }}
                >
                  Ringkasan BW usage (dummy)
                </div>
                <div>
                  Peak usage: {draftInvoice.peakMbps} Mbps, rata-rata: {
                    draftInvoice.averageMbps
                  }{" "}
                  Mbps.
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 10,
                }}
              >
                Catatan: lampiran detail (grafik & tabel) nantinya di-generate
                oleh backend berdasarkan data monitoring dan dilampirkan dalam
                email invoice.
              </p>

              <button
                type="button"
                disabled={isSending}
                onClick={handleSendEmail}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: isSending
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #16a34a, #22c55e)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSending ? "default" : "pointer",
                }}
              >
                {isSending ? "Mengirim..." : "Kirim invoice ke email"}
              </button>

              {sendResult && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  {sendResult}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auto kirim tagihan */}
      <div
        style={{
          borderRadius: 16,
          padding: 16,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 6,
          }}
        >
          Auto kirim tagihan
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 10,
          }}
        >
          Atur agar invoice dikirim otomatis ke email pelanggan berdasarkan
          jadwal. Pengaturan ini akan disimpan di backend dan dijalankan oleh
          cron/worker.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#111827",
            }}
          >
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

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#4b5563" }}>Jadwal:</span>
            <select
              value={scheduleDay}
              onChange={(e) => setScheduleDay(Number(e.target.value))}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                fontSize: 12,
                background: "#ffffff",
              }}
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
          style={{
            padding: "7px 14px",
            borderRadius: 999,
            border: "none",
            background: "#0ea5e9",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Simpan pengaturan auto billing
        </button>

        {autoSaveResult && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            {autoSaveResult}
          </div>
        )}
      </div>
    </section>
  );
};

export default BillingSection;
