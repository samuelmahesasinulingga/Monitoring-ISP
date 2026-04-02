import React, { useState } from "react";

interface WorkspaceSettingsSectionProps {
  workspaceName?: string;
}

const WorkspaceSettingsSection: React.FC<WorkspaceSettingsSectionProps> = ({
  workspaceName,
}) => {
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
    <section className="max-w-5xl mx-auto py-2 pb-6">
      <header className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-900">
            ⚙️ Pengaturan Workspace
          </h1>
          <p className="m-0 text-[12px] text-slate-500">
            Konfigurasi email invoice dan target SLA untuk workspace
            {workspaceName ? ` "${workspaceName}"` : " ini"}.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Template email invoice + SMTP */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Template email invoice & SMTP
          </h2>
          <p className="m-0 mb-3 text-[12px] text-slate-500">
            Atur provider email, konfigurasi SMTP, dan template email invoice
            yang dikirim ke pelanggan.
          </p>

          <div className="grid gap-2.5 mb-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[12px] text-slate-600">Provider</div>
                <select
                  value={smtpProvider}
                  onChange={(e) => setSmtpProvider(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                >
                  <option value="smtp">Generic SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-[12px] text-slate-600">Host SMTP</div>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[12px] text-slate-600">Port</div>
                <input
                  type="number"
                  min={1}
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>
              <label className="flex items-center gap-2 mt-5 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  checked={smtpUseTLS}
                  onChange={(e) => setSmtpUseTLS(e.target.checked)}
                />
                <span>Gunakan TLS/STARTTLS</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[12px] text-slate-600">
                  User / credential
                </div>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                />
              </div>
              <div>
                <div className="mb-1 text-[12px] text-slate-600">
                  From name & email
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Nama pengirim"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                  />
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="email@isp.id"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Subject email invoice
              </div>
              <input
                type="text"
                value={invoiceSubjectTemplate}
                onChange={(e) => setInvoiceSubjectTemplate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              />
            </div>

            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Body email (boleh pakai placeholder)
              </div>
              <textarea
                value={invoiceBodyTemplate}
                onChange={(e) => setInvoiceBodyTemplate(e.target.value)}
                rows={5}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none resize-y focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              />
              <div className="mt-1 text-[11px] text-slate-400">
                Placeholder yang tersedia: {"{{customer_name}}"},{" "}
                {"{{period_label}}"}, {"{{invoice_amount}}"},{" "}
                {"{{isp_name}}"}.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveEmail}
            className="px-3 py-1.5 rounded-full border border-emerald-500 bg-emerald-500 text-[12px] font-semibold text-white hover:bg-emerald-600 hover:border-emerald-600 transition-colors mb-2"
          >
            Simpan pengaturan email
          </button>

          {emailSaveMessage && (
            <div className="mb-2 text-[11px] text-slate-500">
              {emailSaveMessage}
            </div>
          )}

          <div className="rounded-xl px-3 py-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <div className="mb-1 text-[11px] text-slate-500">
              Contoh email yang akan diterima pelanggan (preview sederhana):
            </div>
            <div className="font-semibold mb-1">{exampleSubject}</div>
            <pre className="m-0 whitespace-pre-wrap font-sans">{exampleBody}</pre>
          </div>
        </div>

        {/* Default SLA target & threshold alert */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Target SLA & threshold alert
          </h2>
          <p className="m-0 mb-3 text-[12px] text-slate-500">
            Tentukan target SLA default dan ambang batas (threshold) untuk
            alert bandwidth, latency, dan packet loss.
          </p>

          <div className="grid gap-3 mb-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Target SLA default (%)
              </div>
              <input
                type="number"
                min={0}
                max={100}
                step={0.001}
                value={defaultSlaTarget}
                onChange={(e) => setDefaultSlaTarget(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60"
              />
            </div>
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Threshold BW usage (% kapasitas)
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={bwAlertThreshold}
                onChange={(e) => setBwAlertThreshold(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60"
              />
            </div>
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Threshold latency (ms)
              </div>
              <input
                type="number"
                min={0}
                value={latencyAlertMs}
                onChange={(e) => setLatencyAlertMs(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60"
              />
            </div>
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Threshold packet loss (%)
              </div>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={packetLossThreshold}
                onChange={(e) => setPacketLossThreshold(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSla}
            className="px-3 py-1.5 rounded-full border border-indigo-500 bg-indigo-500 text-[12px] font-semibold text-white hover:bg-indigo-600 hover:border-indigo-600 transition-colors"
          >
            Simpan pengaturan SLA & alert
          </button>

          {slaSaveMessage && (
            <div className="mt-2 text-[11px] text-slate-500">{slaSaveMessage}</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WorkspaceSettingsSection;
