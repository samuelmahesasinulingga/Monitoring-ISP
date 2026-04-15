import React, { useState, useEffect } from "react";

interface WorkspaceSettingsSectionProps {
  workspaceName?: string;
  workspaceId?: number;
}

const WorkspaceSettingsSection: React.FC<WorkspaceSettingsSectionProps> = ({
  workspaceName,
  workspaceId,
}) => {
  // Email template + SMTP
  const [smtpProvider, setSmtpProvider] = useState("smtp");
  const [smtpHost, setSmtpHost] = useState("smtp.contoso-isp.id");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUseTLS, setSmtpUseTLS] = useState(true);
  const [smtpUser, setSmtpUser] = useState("no-reply@contoso-isp.id");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Billing ISP");
  const [smtpFromEmail, setSmtpFromEmail] = useState("billing@contoso-isp.id");
  const [invoiceSubjectTemplate, setInvoiceSubjectTemplate] = useState(
    "Tagihan layanan internet {{customer_name}} - Periode {{period_label}}"
  );
  const [invoiceBodyTemplate, setInvoiceBodyTemplate] = useState(
    "Yth. {{customer_name}},\n\nBerikut kami sampaikan tagihan layanan internet untuk periode {{period_label}} dengan nilai {{invoice_amount}}.\nLampiran SLA dan report penggunaan bandwidth tertera pada dokumen terlampir.\n\nTerima kasih,\n{{isp_name}}"
  );
  const [emailSaveMessage, setEmailSaveMessage] = useState<string | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // SLA target & thresholds
  const [defaultSlaTarget, setDefaultSlaTarget] = useState(99.5);
  const [bwAlertThreshold, setBwAlertThreshold] = useState(80);
  const [latencyAlertMs, setLatencyAlertMs] = useState(120);
  const [packetLossThreshold, setPacketLossThreshold] = useState(1);
  const [slaSaveMessage, setSlaSaveMessage] = useState<string | null>(null);

  // Telegram Alerting
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertSaveMessage, setAlertSaveMessage] = useState<string | null>(null);

  // Fetch current settings if workspaceId exists
  useEffect(() => {
    if (!workspaceId) return;

    const fetchWorkspace = async () => {
      try {
        const res = await fetch(`/api/workspaces`);
        if (res.ok) {
          const list = await res.json();
          const thisWs = list.find((w: any) => w.id === workspaceId);
          if (thisWs) {
            setTelegramBotToken(thisWs.telegramBotToken || "");
            setTelegramChatId(thisWs.telegramChatId || "");
            setAlertEnabled(thisWs.alertEnabled || false);

            if (thisWs.smtpProvider) setSmtpProvider(thisWs.smtpProvider);
            if (thisWs.smtpHost) setSmtpHost(thisWs.smtpHost);
            if (thisWs.smtpPort) setSmtpPort(thisWs.smtpPort);
            if (thisWs.smtpUseTls !== undefined) setSmtpUseTLS(thisWs.smtpUseTls);
            if (thisWs.smtpUser) setSmtpUser(thisWs.smtpUser);
            if (thisWs.smtpPass) setSmtpPass(thisWs.smtpPass);
            if (thisWs.smtpFromName) setSmtpFromName(thisWs.smtpFromName);
            if (thisWs.smtpFromEmail) setSmtpFromEmail(thisWs.smtpFromEmail);
            if (thisWs.invoiceSubjectTemplate) setInvoiceSubjectTemplate(thisWs.invoiceSubjectTemplate);
            if (thisWs.invoiceBodyTemplate) setInvoiceBodyTemplate(thisWs.invoiceBodyTemplate);
          }
        }
      } catch (err) {
        console.error("Failed to fetch workspace settings:", err);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  const handleSaveAlerting = async () => {
    if (!workspaceId) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramBotToken,
          telegramChatId,
          alertEnabled,
        }),
      });

      if (res.ok) {
        setAlertSaveMessage("Pengaturan notifikasi berhasil disimpan.");
        setTimeout(() => setAlertSaveMessage(null), 3000);
      } else {
        setAlertSaveMessage("Gagal menyimpan pengaturan notifikasi.");
      }
    } catch (err) {
      console.error("Save alerting error:", err);
      setAlertSaveMessage("Terjadi kesalahan saat menyimpan.");
    }
  };

  const handleSaveEmail = async () => {
    if (!workspaceId) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/smtp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpProvider,
          smtpHost,
          smtpPort,
          smtpUseTls: smtpUseTLS,
          smtpUser,
          smtpPass,
          smtpFromName,
          smtpFromEmail,
          invoiceSubjectTemplate,
          invoiceBodyTemplate,
        }),
      });

      if (res.ok) {
        setEmailSaveMessage("Pengaturan SMTP dan template email berhasil disimpan!");
        setTimeout(() => setEmailSaveMessage(null), 3000);
      } else {
        setEmailSaveMessage("Gagal menyimpan pengaturan email.");
      }
    } catch (err) {
      console.error(err);
      setEmailSaveMessage("Terjadi kesalahan saat menyimpan pengaturan.");
    }
  };

  const handleTestEmailConnection = async () => {
    setIsTestingEmail(true);
    setTestEmailMessage(null);
    try {
      const res = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          from: smtpFromEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setTestEmailMessage({ type: "success", text: data.message || "Koneksi berhasil dan email test terkirim!" });
      } else {
        setTestEmailMessage({ type: "error", text: data.error || "Gagal menghubungi SMTP Server." });
      }
    } catch (err) {
      console.error(err);
      setTestEmailMessage({ type: "error", text: "Terjadi kesalahan sistem saat mencoba koneksi." });
    } finally {
      setIsTestingEmail(false);
    }
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
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
                  Password SMTP
                </div>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
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
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none min-w-0 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                  />
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="email@isp.id"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none min-w-0 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
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

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <button
              type="button"
              onClick={handleTestEmailConnection}
              disabled={isTestingEmail}
              className="px-3 py-1.5 rounded-full border border-amber-500 bg-amber-500 text-[12px] font-semibold text-white hover:bg-amber-600 hover:border-amber-600 transition-colors disabled:opacity-50"
            >
              {isTestingEmail ? "Mencoba Koneksi..." : "Test Koneksi SMTP"}
            </button>
            <button
              type="button"
              onClick={handleSaveEmail}
              className="px-3 py-1.5 rounded-full border border-emerald-500 bg-emerald-500 text-[12px] font-semibold text-white hover:bg-emerald-600 hover:border-emerald-600 transition-colors"
            >
              Simpan pengaturan email
            </button>
          </div>

          {testEmailMessage && (
            <div className={`mb-2 text-[11px] font-medium ${testEmailMessage.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
              {testEmailMessage.text}
            </div>
          )}

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

        {/* Telegram Alerting Section */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="m-0 text-[16px] font-semibold text-slate-900">
              Pengaturan Notifikasi (Telegram)
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={alertEnabled}
                onChange={(e) => setAlertEnabled(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-[12px] font-medium text-slate-700">
                {alertEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </label>
          </div>
          <p className="m-0 mb-4 text-[12px] text-slate-500">
            Dapatkan notifikasi instan via Telegram saat perangkat terdeteksi
            mati (DOWN) atau hidup kembali (UP).
          </p>

          <div className="grid gap-4 mb-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[12px] text-slate-600 font-medium">
                Bot Token Telegram
              </div>
              <input
                type="password"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="123456789:ABCDEF..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Didapat dari @BotFather saat membuat bot baru.
              </p>
            </div>
            <div>
              <div className="mb-1 text-[12px] text-slate-600 font-medium">
                Telegram Chat ID (Grup/User)
              </div>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-100123456789"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                ID grup atau akun anda (gunakan @userinfobot untuk cek ID).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveAlerting}
              className="px-4 py-2 rounded-full border-0 bg-blue-600 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Simpan Pengaturan Alert
            </button>
            {alertSaveMessage && (
              <span className="text-[11px] text-blue-600 animate-pulse">
                {alertSaveMessage}
              </span>
            )}
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
