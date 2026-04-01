import React, { useState } from "react";

type MonitoringTab = "ping" | "alerts" | "interface" | "queue";

type MonitoringSectionProps = {
  workspaceName?: string;
  initialTab?: MonitoringTab;
};

const MonitoringSection: React.FC<MonitoringSectionProps> = ({ workspaceName, initialTab }) => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>(initialTab ?? "ping");

  const renderPing = () => {
    const devices = [
      { name: "Router Kantor Pusat", ip: "10.0.0.1", latencyMs: 18, loss: 0.2, status: "UP" },
      { name: "Router POP Bandung", ip: "10.10.0.1", latencyMs: 35, loss: 0.8, status: "UP" },
      { name: "Server Billing", ip: "10.0.10.5", latencyMs: 120, loss: 5.3, status: "DOWN" },
    ];

    const badgeColor = (status: string) =>
      status === "UP"
        ? { background: "rgba(22,163,74,0.12)", color: "#15803d" }
        : { background: "rgba(220,38,38,0.12)", color: "#b91c1c" };

    return (
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 6,
          }}
        >
          Monitoring Ping
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
          Tabel latency dan packet loss per device. Grafik per device bisa ditambahkan
          menggunakan data historis dari backend.
        </p>

        <div
          style={{
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr style={{ textAlign: "left", color: "#6b7280" }}>
                <th style={{ padding: "8px 10px" }}>Device</th>
                <th style={{ padding: "8px 10px" }}>IP Address</th>
                <th style={{ padding: "8px 10px" }}>Latency (ms)</th>
                <th style={{ padding: "8px 10px" }}>Packet Loss (%)</th>
                <th style={{ padding: "8px 10px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.ip}>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.name}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                      color: "#4b5563",
                    }}
                  >
                    {d.ip}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.latencyMs}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.loss}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        ...badgeColor(d.status),
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderAlerts = () => {
    const alerts = [
      {
        id: 1,
        title: "Ping timeout - Router Kantor Pusat",
        severity: "High",
        since: "5 menit lalu",
        type: "Ping",
      },
      {
        id: 2,
        title: "BW > 80% - ether1-UPLINK",
        severity: "Medium",
        since: "25 menit lalu",
        type: "Bandwidth",
      },
    ];

    const severityColor = (severity: string) => {
      if (severity === "High") return { background: "rgba(220,38,38,0.1)", color: "#b91c1c" };
      if (severity === "Medium") return { background: "rgba(234,179,8,0.14)", color: "#92400e" };
      return { background: "rgba(22,163,74,0.1)", color: "#15803d" };
    };

    return (
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 6,
          }}
        >
          Alert Monitoring
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
          Daftar alert aktif dan riwayat singkat. Tombol acknowledge/close saat ini
          masih dummy dan akan dihubungkan ke backend kemudian.
        </p>

        <div
          style={{
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr style={{ textAlign: "left", color: "#6b7280" }}>
                <th style={{ padding: "8px 10px" }}>Alert</th>
                <th style={{ padding: "8px 10px" }}>Tipe</th>
                <th style={{ padding: "8px 10px" }}>Severitas</th>
                <th style={{ padding: "8px 10px" }}>Sejak</th>
                <th style={{ padding: "8px 10px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {a.title}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                      color: "#4b5563",
                    }}
                  >
                    {a.type}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        ...severityColor(a.severity),
                      }}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                      color: "#4b5563",
                    }}
                  >
                    {a.since}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Acknowledge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderInterface = () => {
    return (
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 6,
          }}
        >
          Monitoring Bandwidth per Interface
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
          Pilih router dan interface untuk melihat grafik penggunaan bandwidth
          (rx/tx) per waktu.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <select
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              fontSize: 12,
              minWidth: 180,
            }}
            defaultValue="router1"
          >
            <option value="router1">Router Kantor Pusat</option>
            <option value="router2">Router POP Bandung</option>
          </select>
          <select
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              fontSize: 12,
              minWidth: 180,
            }}
            defaultValue="iface1"
          >
            <option value="iface1">ether1-UPLINK</option>
            <option value="iface2">ether2-POP</option>
            <option value="iface3">vlan10-Client</option>
          </select>
        </div>

        <div
          style={{
            borderRadius: 16,
            padding: 20,
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #e5e7eb",
            boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
            minHeight: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          Placeholder grafik time-series rx/tx interface.
        </div>
      </section>
    );
  };

  const renderQueue = () => {
    const queues = [
      { name: "Queue-Office", usageMbps: 45 },
      { name: "Queue-Home", usageMbps: 32 },
      { name: "Queue-Business", usageMbps: 28 },
    ];

    return (
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 6,
          }}
        >
          Monitoring Bandwidth per Queue (Mikrotik)
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
          List queue dan grafik usage. Data di bawah masih dummy dan akan diisi
          dari API Mikrotik nanti.
        </p>

        <div
          style={{
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #e5e7eb",
            boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
          }}
        >
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: 12,
              color: "#4b5563",
            }}
          >
            {queues.map((q) => (
              <li
                key={q.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span>{q.name}</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {q.usageMbps} Mbps
                </span>
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: "#f9fafb",
              fontSize: 11,
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            Placeholder grafik time-series usage queue.
          </div>
        </div>
      </section>
    );
  };

  const renderContent = () => {
    if (activeTab === "ping") return renderPing();
    if (activeTab === "alerts") return renderAlerts();
    if (activeTab === "interface") return renderInterface();
    return renderQueue();
  };

  return (
    <section style={{ maxWidth: 960, margin: "0 auto" }}>
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
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
            Monitoring Jaringan {workspaceName ? `- ${workspaceName}` : ""}
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
            Pantau ping, alert, dan penggunaan bandwidth per interface / queue
            dalam satu halaman.
          </p>
        </div>

        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as MonitoringTab)}
          style={{
            padding: "7px 12px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            fontSize: 12,
            background: "#ffffff",
          }}
        >
          <option value="ping">Monitoring ping</option>
          <option value="alerts">Alert monitoring</option>
          <option value="interface">Monitoring BW per interface</option>
          <option value="queue">Monitoring BW per queue</option>
        </select>
      </header>

      {renderContent()}
    </section>
  );
};

export default MonitoringSection;
