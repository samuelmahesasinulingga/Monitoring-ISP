import React, { useState } from "react";

interface WorkspaceSettingsSectionProps {
  workspaceName?: string;
}

const WorkspaceSettingsSection: React.FC<WorkspaceSettingsSectionProps> = ({
  workspaceName,
}) => {
  // Monitoring endpoint (single primary endpoint for now)
  const [routerName, setRouterName] = useState("Router Utama");
  const [routerIp, setRouterIp] = useState("192.168.1.1");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [apiUser, setApiUser] = useState("api-user");
  const [apiPort, setApiPort] = useState(8728);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [monitoringMessage, setMonitoringMessage] = useState<string | null>(
    null
  );

  // Email template + SMTP
  const [smtpProvider, setSmtpProvider] = useState("smtp");
  const [smtpHost, setSmtpHost] = useState("smtp.contoso-isp.id");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUseTLS, setSmtpUseTLS] = useState(true);
  const [smtpUser, setSmtpUser] = useState("no-reply@contoso-isp.id");
  const [smtpFromName, setSmtpFromName] = useState("Billing ISP");
  const [smtpFromEmail, setSmtpFromEmail] = useState("billing@contoso-isp.id");
  const [invoiceSubjectTemplate, setInvoiceSubjectTemplate] = useState(
    "Tagihan layanan internet {{customer_name}} - Periode {{period_label}}"
  );
  const [invoiceBodyTemplate, setInvoiceBodyTemplate] = useState(
    "Yth. {{customer_name}},\n\nBerikut kami sampaikan tagihan layanan internet untuk periode {{period_label}} dengan nilai {{invoice_amount}}.\nLampiran SLA dan report penggunaan bandwidth tertera pada dokumen terlampir.\n\nTerima kasih,\n{{isp_name}}"
  );
  const [emailSaveMessage, setEmailSaveMessage] = useState<string | null>(null);

  // SLA target & thresholds
  const [defaultSlaTarget, setDefaultSlaTarget] = useState(99.5);
  const [bwAlertThreshold, setBwAlertThreshold] = useState(80);
  const [latencyAlertMs, setLatencyAlertMs] = useState(120);
  const [packetLossThreshold, setPacketLossThreshold] = useState(1);
  const [slaSaveMessage, setSlaSaveMessage] = useState<string | null>(null);

  const handleSaveMonitoring = () => {
    // Nanti diintegrasikan ke backend, misalnya: PUT /api/workspaces/{id}/monitoring-config
    setMonitoringMessage(
      `Pengaturan endpoint monitoring disimpan (dummy): ${routerName} @ ${routerIp}.`
    );
  };

  const handleSaveEmail = () => {
    // Nanti diintegrasikan ke backend untuk menyimpan SMTP & template email
    setEmailSaveMessage(
      `Pengaturan email & template invoice disimpan (dummy) untuk provider ${smtpProvider.toUpperCase()}.`
    );
  };

  const handleSaveSla = () => {
    // Nanti diintegrasikan ke backend, misalnya: PUT /api/workspaces/{id}/sla-config
    setSlaSaveMessage(
      `Pengaturan SLA target ${defaultSlaTarget.toFixed(
        3
      )}% dan threshold alert disimpan (dummy).`
    );
  };

  const exampleSubject = invoiceSubjectTemplate
    .replace("{{customer_name}}", "PT Contoh Pelanggan")
    .replace("{{period_label}}", "Maret 2026");

  const exampleBody = invoiceBodyTemplate
    .replace("{{customer_name}}", "PT Contoh Pelanggan")
    .replace("{{period_label}}", "Maret 2026")
    .replace("{{invoice_amount}}", "Rp 1.500.000")
    .replace("{{isp_name}}", "Contoso ISP");

  return (
    <section
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "8px 0 24px",
      }}
    >
      <header
        style={{
          marginBottom: 20,
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
            ⚙️ Pengaturan Workspace
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
            Konfigurasi endpoint monitoring, email invoice, dan target SLA untuk
            workspace
            {workspaceName ? ` "${workspaceName}"` : " ini"}.
          </p>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Pengaturan endpoint monitoring */}
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
            Endpoint monitoring
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            IP router utama, SNMP community, dan user API Mikrotik yang akan
            dipakai untuk menarik data monitoring.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Nama endpoint
              </div>
              <input
                type="text"
                value={routerName}
                onChange={(e) => setRouterName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                IP router
              </div>
              <input
                type="text"
                value={routerIp}
                onChange={(e) => setRouterIp(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                SNMP community
              </div>
              <input
                type="text"
                value={snmpCommunity}
                onChange={(e) => setSnmpCommunity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                API user
              </div>
              <input
                type="text"
                value={apiUser}
                onChange={(e) => setApiUser(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                API port
              </div>
              <input
                type="number"
                min={1}
                value={apiPort}
                onChange={(e) => setApiPort(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#4b5563",
              marginBottom: 10,
            }}
          >
            <input
              type="checkbox"
              checked={monitoringEnabled}
              onChange={(e) => setMonitoringEnabled(e.target.checked)}
            />
            <span>Aktifkan monitoring endpoint ini</span>
          </label>

          <button
            type="button"
            onClick={handleSaveMonitoring}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "none",
              background: "#0ea5e9",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Simpan pengaturan endpoint
          </button>

          {monitoringMessage && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              {monitoringMessage}
            </div>
          )}
        </div>

        {/* Template email invoice + SMTP */}
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
            Template email invoice & SMTP
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            Atur provider email, konfigurasi SMTP, dan template email invoice
            yang dikirim ke pelanggan.
          </p>

          <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            >
              <div>
                <div
                  style={{
                    marginBottom: 4,
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  Provider
                </div>
                <select
                  value={smtpProvider}
                  onChange={(e) => setSmtpProvider(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    background: "#ffffff",
                  }}
                >
                  <option value="smtp">Generic SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                </select>
              </div>
              <div>
                <div
                  style={{
                    marginBottom: 4,
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  Host SMTP
                </div>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
              </div>
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            >
              <div>
                <div
                  style={{
                    marginBottom: 4,
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  Port
                </div>
                <input
                  type="number"
                  min={1}
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 22,
                  fontSize: 12,
                  color: "#4b5563",
                }}
              >
                <input
                  type="checkbox"
                  checked={smtpUseTLS}
                  onChange={(e) => setSmtpUseTLS(e.target.checked)}
                />
                <span>Gunakan TLS/STARTTLS</span>
              </label>
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            >
              <div>
                <div
                  style={{
                    marginBottom: 4,
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  User / credential
                </div>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    marginBottom: 4,
                    color: "#4b5563",
                    fontSize: 12,
                  }}
                >
                  From name & email
                </div>
                <div
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Nama pengirim"
                    style={{
                      flex: 1,
                      padding: "7px 9px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="email@isp.id"
                    style={{
                      flex: 1,
                      padding: "7px 9px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Subject email invoice
              </div>
              <input
                type="text"
                value={invoiceSubjectTemplate}
                onChange={(e) => setInvoiceSubjectTemplate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>

            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Body email (boleh pakai placeholder)
              </div>
              <textarea
                value={invoiceBodyTemplate}
                onChange={(e) => setInvoiceBodyTemplate(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <div
                style={{ marginTop: 4, fontSize: 11, color: "#9ca3af" }}
              >
                Placeholder yang tersedia: {"{{customer_name}}"}, {"{{period_label}}"},{" "}
                {"{{invoice_amount}}"}, {"{{isp_name}}"}.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveEmail}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "none",
              background: "#22c55e",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            Simpan pengaturan email
          </button>

          {emailSaveMessage && (
            <div
              style={{
                marginBottom: 8,
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              {emailSaveMessage}
            </div>
          )}

          <div
            style={{
              borderRadius: 10,
              padding: 10,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              fontSize: 11,
              color: "#4b5563",
            }}
          >
            <div
              style={{ marginBottom: 4, color: "#6b7280", fontSize: 11 }}
            >
              Contoh email yang akan diterima pelanggan (preview sederhana):
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{exampleSubject}</div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {exampleBody}
            </pre>
          </div>
        </div>

        {/* Default SLA target & threshold alert */}
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
            Target SLA & threshold alert
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            Tentukan target SLA default dan ambang batas (threshold) untuk
            alert bandwidth, latency, dan packet loss.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Target SLA default (%)
              </div>
              <input
                type="number"
                min={0}
                max={100}
                step={0.001}
                value={defaultSlaTarget}
                onChange={(e) => setDefaultSlaTarget(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Threshold BW usage (% kapasitas)
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={bwAlertThreshold}
                onChange={(e) => setBwAlertThreshold(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Threshold latency (ms)
              </div>
              <input
                type="number"
                min={0}
                value={latencyAlertMs}
                onChange={(e) => setLatencyAlertMs(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
            <div>
              <div
                style={{ marginBottom: 4, color: "#4b5563", fontSize: 12 }}
              >
                Threshold packet loss (%)
              </div>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={packetLossThreshold}
                onChange={(e) => setPacketLossThreshold(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSla}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "none",
              background: "#6366f1",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Simpan pengaturan SLA & alert
          </button>

          {slaSaveMessage && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              {slaSaveMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WorkspaceSettingsSection;
