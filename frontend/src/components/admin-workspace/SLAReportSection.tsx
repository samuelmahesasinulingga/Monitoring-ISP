import React, { useState } from "react";

type Period = "daily" | "weekly" | "monthly";

const SLAReportSection: React.FC = () => {
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedCustomer, setSelectedCustomer] = useState("all");

  const periodLabel = (p: Period) => {
    if (p === "daily") return "Harian";
    if (p === "weekly") return "Mingguan";
    return "Bulanan";
  };

  const slaValue = 99.82;
  const totalDowntimeMinutes = 78; // dummy
  const downtimeEvents = [
    { date: "2026-03-02", durationMin: 18, cause: "Gangguan listrik POP" },
    { date: "2026-03-11", durationMin: 25, cause: "Fiber putus" },
    { date: "2026-03-22", durationMin: 35, cause: "Maintenance terencana" },
  ];

  const peakMbps = 120;
  const averageMbps = 45;

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
            📈 SLA & Report
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
            Analisa SLA dan laporan penggunaan bandwidth. Data ini nanti dapat
            dijadikan lampiran invoice ke pelanggan.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              fontSize: 12,
              background: "#ffffff",
            }}
          >
            <option value="daily">Periode harian</option>
            <option value="weekly">Periode mingguan</option>
            <option value="monthly">Periode bulanan</option>
          </select>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              fontSize: 12,
              background: "#ffffff",
              minWidth: 200,
            }}
          >
            <option value="all">Semua pelanggan / link</option>
            <option value="cust-1">PT Contoh Pelanggan</option>
            <option value="link-1">Link Backhaul Kantor Pusat - POP Bandung</option>
          </select>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Analisa SLA */}
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
            Analisa Perhitungan SLA ({periodLabel(period)})
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Ringkasan SLA berdasarkan total downtime pada periode terpilih.
            Perhitungan detil akan diambil dari data monitoring backend.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                }}
              >
                SLA periode ini
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: slaValue > 99.9 ? "#16a34a" : slaValue > 99 ? "#22c55e" : "#eab308",
                }}
              >
                {slaValue.toFixed(3)}%
              </div>
            </div>

            <div
              style={{
                padding: 10,
                borderRadius: 12,
                background: "#eff6ff",
                fontSize: 12,
                color: "#1d4ed8",
                flex: 1,
              }}
            >
              Estimasi downtime: {Math.floor(totalDowntimeMinutes / 60)} jam {totalDowntimeMinutes % 60} menit
              <br />
              Target SLA umum ISP: &gt; 99.5% (bisa disesuaikan per kontrak).
            </div>
          </div>

          <div
            style={{
              borderRadius: 12,
              background: "#f9fafb",
              padding: 12,
              fontSize: 12,
              color: "#4b5563",
              maxHeight: 190,
              overflow: "auto",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Detail downtime
            </div>
            {downtimeEvents.map((d) => (
              <div
                key={d.date + d.cause}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{d.date}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{d.cause}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {d.durationMin} menit
                </div>
              </div>
            ))}

            {downtimeEvents.length === 0 && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Belum ada catatan downtime pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Report BW usage */}
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
            Report BW Usage
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            Ringkasan penggunaan bandwidth untuk pelanggan / link terpilih.
            Grafik dan angka di bawah masih dummy dan akan diambil dari
            timeseries backend.
          </p>

          <div
            style={{
              borderRadius: 12,
              padding: 12,
              background: "#f9fafb",
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Placeholder grafik time-series penggunaan bandwidth.
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 12,
              color: "#4b5563",
            }}
          >
            <div
              style={{
                flex: 1,
                borderRadius: 10,
                padding: 10,
                background: "#ecfdf3",
                border: "1px solid #bbf7d0",
              }}
            >
              <div style={{ fontSize: 11, color: "#166534", marginBottom: 4 }}>
                Peak usage
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#15803d" }}>
                {peakMbps} Mbps
              </div>
            </div>

            <div
              style={{
                flex: 1,
                borderRadius: 10,
                padding: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <div style={{ fontSize: 11, color: "#1d4ed8", marginBottom: 4 }}>
                Rata-rata usage
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1d4ed8" }}>
                {averageMbps} Mbps
              </div>
            </div>
          </div>

          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#6b7280" }}>
            Catatan: angka peak & rata-rata ini bisa langsung disisipkan
            ke lampiran invoice sebagai bukti penggunaan layanan.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SLAReportSection;
