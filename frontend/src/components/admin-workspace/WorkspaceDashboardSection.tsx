import React from "react";

type WorkspaceDashboardSectionProps = {
  workspaceName?: string;
};

const WorkspaceDashboardSection: React.FC<WorkspaceDashboardSectionProps> = ({
  workspaceName,
}) => {
  const activeCustomer = 320; // dummy
  const activeTicket = 18; // dummy
  const unpaidInvoice = 12; // dummy
  const pingStatus = {
    overall: "UP", // dummy
    avgLatencyMs: 18,
    packetLoss: 0.4,
  };
  const activeAlertCount = 3; // dummy
  const topInterfaces = [
    { name: "ether1-UPLINK", usageMbps: 120 },
    { name: "ether2-POP", usageMbps: 95 },
    { name: "vlan10-Client", usageMbps: 80 },
  ];
  const topQueues = [
    { name: "Queue-Office", usageMbps: 45 },
    { name: "Queue-Home", usageMbps: 32 },
    { name: "Queue-Business", usageMbps: 28 },
  ];
  const slaThisMonth = 99.2; // dummy
  const invoiceSentThisMonth = false; // dummy

  return (
    <section
      style={{
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 4,
          }}
        >
          {workspaceName ?? "Ringkasan Workspace"}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Dashboard singkat aktivitas pelanggan, tiket, dan tagihan di workspace
          ini.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(129,140,248,0.18))",
            border: "1px solid rgba(59,130,246,0.18)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}
            >
              Pelanggan Aktif
            </span>
            <span style={{ fontSize: 20 }}>👥</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
            {activeCustomer}
          </div>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            Total pelanggan aktif di workspace.
          </p>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(251,191,36,0.18))",
            border: "1px solid rgba(249,115,22,0.18)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{ fontSize: 13, color: "#c2410c", fontWeight: 600 }}
            >
              Tiket Aktif
            </span>
            <span style={{ fontSize: 20 }}>🎫</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
            {activeTicket}
          </div>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            Tiket gangguan yang masih terbuka.
          </p>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(45,212,191,0.18))",
            border: "1px solid rgba(16,185,129,0.18)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{ fontSize: 13, color: "#047857", fontWeight: 600 }}
            >
              Tagihan Belum Lunas
            </span>
            <span style={{ fontSize: 20 }}>💳</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
            {unpaidInvoice}
          </div>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            Jumlah invoice yang masih belum dibayar.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 20,
          marginTop: 32,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            padding: 18,
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Status Ping & SLA
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Gambaran cepat kesehatan jaringan dan kualitas layanan.
              </div>
            </div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background:
                  pingStatus.overall === "UP"
                    ? "rgba(22,163,74,0.09)"
                    : "rgba(220,38,38,0.09)",
                color:
                  pingStatus.overall === "UP" ? "#15803d" : "#b91c1c",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {pingStatus.overall === "UP" ? "ONLINE" : "DOWN"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Rata-rata latency
              </div>
              <div
                style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}
              >
                {pingStatus.avgLatencyMs} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Packet loss
              </div>
              <div
                style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}
              >
                {pingStatus.packetLoss}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                SLA bulan ini
              </div>
              <div
                style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}
              >
                {slaThisMonth}%
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px dashed #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Status invoice bulan ini:
              <span
                style={{
                  marginLeft: 6,
                  fontWeight: 600,
                  color: invoiceSentThisMonth ? "#15803d" : "#b91c1c",
                }}
              >
                {invoiceSentThisMonth ? "Sudah dikirim" : "Belum dikirim"}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            padding: 18,
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Alert & BW Tertinggi
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Ringkasan alert aktif dan penggunaan bandwidth tertinggi.
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 999,
                background:
                  activeAlertCount > 0
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(22,163,74,0.08)",
                color:
                  activeAlertCount > 0 ? "#b91c1c" : "#15803d",
                fontWeight: 600,
              }}
            >
              {activeAlertCount} alert aktif
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{ fontSize: 11, fontWeight: 600, color: "#4b5563" }}
              >
                Interface teratas
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "6px 0 0 0",
                  fontSize: 11,
                  color: "#6b7280",
                }}
              >
                {topInterfaces.map((iface) => (
                  <li
                    key={iface.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span>{iface.name}</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {iface.usageMbps} Mbps
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div
                style={{ fontSize: 11, fontWeight: 600, color: "#4b5563" }}
              >
                Queue Mikrotik teratas
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "6px 0 0 0",
                  fontSize: 11,
                  color: "#6b7280",
                }}
              >
                {topQueues.map((queue) => (
                  <li
                    key={queue.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span>{queue.name}</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {queue.usageMbps} Mbps
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspaceDashboardSection;
