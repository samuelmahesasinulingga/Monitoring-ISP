import React, { useState, useEffect } from "react";

interface WorkspaceSettingsSectionProps {
  workspaceName?: string;
  workspaceId?: number;
}

const AnalogTimePicker = ({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  const currentHour = parseInt(value.split(":")[0] || "0", 10);
  const currentMinute = parseInt(value.split(":")[1] || "0", 10);

  const handleHourClick = (h: number) => {
    const newHour = h.toString().padStart(2, "0");
    const newMinute = currentMinute.toString().padStart(2, "0");
    onChange(`${newHour}:${newMinute}`);
    setMode("minute");
  };

  const handleMinuteClick = (m: number) => {
    const newHour = currentHour.toString().padStart(2, "0");
    const newMinute = m.toString().padStart(2, "0");
    onChange(`${newHour}:${newMinute}`);
    setIsOpen(false);
    setMode("hour");
  };

  const getHandRotation = () => {
    if (mode === "hour") {
      return (currentHour % 12) * 30;
    }
    return currentMinute * 6;
  };

  const handHeight = mode === "hour" && (currentHour === 0 || currentHour > 12) ? 45 : 75;

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none flex items-center justify-between cursor-pointer transition-colors ${
          disabled
            ? "bg-slate-50 text-slate-400 cursor-not-allowed"
            : "bg-white hover:border-indigo-300"
        }`}
      >
        <span className="font-medium text-slate-700">{value}</span>
        <span className="text-[14px]">🕒</span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full right-0 md:left-0 mt-2 p-4 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 w-[240px]">
          <div className="flex items-center justify-center gap-2 mb-4 text-[24px] font-bold text-slate-700">
            <span
              className={`cursor-pointer px-3 py-1 rounded-xl transition-colors ${
                mode === "hour" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-400"
              }`}
              onClick={() => setMode("hour")}
            >
              {currentHour.toString().padStart(2, "0")}
            </span>
            <span className="text-slate-300 animate-pulse">:</span>
            <span
              className={`cursor-pointer px-3 py-1 rounded-xl transition-colors ${
                mode === "minute" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-400"
              }`}
              onClick={() => setMode("minute")}
            >
              {currentMinute.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="relative w-48 h-48 rounded-full bg-slate-50 flex items-center justify-center mx-auto shadow-inner">
            {mode === "hour" ? (
              <>
                {/* Outer Ring (1-12) */}
                {[...Array(12)].map((_, i) => {
                  const h = i === 0 ? 12 : i;
                  const angle = (i * 30 - 90) * (Math.PI / 180);
                  const x = Math.cos(angle) * 75;
                  const y = Math.sin(angle) * 75;
                  const isActive = currentHour === h;
                  return (
                    <button
                      key={`h1-${h}`}
                      onClick={() => handleHourClick(h)}
                      className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition-all ${
                        isActive
                          ? "bg-indigo-500 text-white shadow-md scale-110 z-20"
                          : "text-slate-700 hover:bg-indigo-100 z-10"
                      }`}
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      {h}
                    </button>
                  );
                })}
                {/* Inner Ring (13-00) */}
                {[...Array(12)].map((_, i) => {
                  const h = i === 0 ? 0 : i + 12;
                  const displayH = h === 0 ? "00" : h;
                  const angle = (i * 30 - 90) * (Math.PI / 180);
                  const x = Math.cos(angle) * 45;
                  const y = Math.sin(angle) * 45;
                  const isActive = currentHour === h;
                  return (
                    <button
                      key={`h2-${h}`}
                      onClick={() => handleHourClick(h)}
                      className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-indigo-500 text-white shadow-md scale-110 z-20"
                          : "text-slate-500 hover:bg-indigo-100 z-10"
                      }`}
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      {displayH}
                    </button>
                  );
                })}
              </>
            ) : (
              // Minutes (0, 5, 10...)
              [...Array(12)].map((_, i) => {
                const m = i * 5;
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = Math.cos(angle) * 75;
                const y = Math.sin(angle) * 75;
                const isActive = currentMinute === m;
                return (
                  <button
                    key={`m-${m}`}
                    onClick={() => handleMinuteClick(m)}
                    className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition-all ${
                      isActive
                        ? "bg-indigo-500 text-white shadow-md scale-110 z-20"
                        : "text-slate-700 hover:bg-indigo-100 z-10"
                    }`}
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    {m === 0 ? "00" : m}
                  </button>
                );
              })
            )}

            {/* Hand */}
            <div className="w-2 h-2 rounded-full bg-indigo-500 z-30 shadow-sm" />
            <div
              className="absolute w-0.5 bg-indigo-400 origin-bottom transition-all duration-300 pointer-events-none"
              style={{
                height: `${handHeight}px`,
                bottom: "50%",
                left: "calc(50% - 1px)",
                transform: `rotate(${getHandRotation()}deg)`,
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500" />
            </div>
          </div>
        </div>
      )}

      {isOpen && !disabled && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

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

  // Automated SLA Reporting
  const [autoReportEnabled, setAutoReportEnabled] = useState("disabled");
  const [autoReportPeriod, setAutoReportPeriod] = useState("weekly");
  const [autoReportTime, setAutoReportTime] = useState("08:00");
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
            
            if (thisWs.autoReportEnabled !== undefined) setAutoReportEnabled(thisWs.autoReportEnabled ? "enabled" : "disabled");
            if (thisWs.autoReportPeriod) setAutoReportPeriod(thisWs.autoReportPeriod);
            if (thisWs.autoReportTime) setAutoReportTime(thisWs.autoReportTime);
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

  const handleSaveSla = async () => {
    if (!workspaceId) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoReportEnabled: autoReportEnabled === "enabled",
          autoReportPeriod: autoReportPeriod,
          autoReportTime: autoReportTime,
        }),
      });

      if (res.ok) {
        setSlaSaveMessage("Jadwal laporan SLA otomatis berhasil disimpan!");
      } else {
        setSlaSaveMessage("Gagal menyimpan jadwal laporan SLA.");
      }
    } catch (err) {
      console.error("Failed to save SLA settings:", err);
      setSlaSaveMessage("Terjadi kesalahan sistem.");
    }

    setTimeout(() => setSlaSaveMessage(null), 3000);
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

        {/* Automated SLA Report Schedule */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-lg shadow-slate-900/5">
          <h2 className="m-0 mb-1 text-[16px] font-semibold text-slate-900">
            Jadwal Laporan SLA Otomatis
          </h2>
          <p className="m-0 mb-3 text-[12px] text-slate-500">
            Kirimkan ringkasan performa SLA dan statistik jaringan secara otomatis ke grup Telegram Anda.
          </p>

          <div className="grid gap-3 mb-4 md:grid-cols-3">
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Otomasi Laporan
              </div>
              <select
                value={autoReportEnabled}
                onChange={(e) => setAutoReportEnabled(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60"
              >
                <option value="disabled">Nonaktif</option>
                <option value="enabled">Aktifkan Pengiriman</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Periode Laporan
              </div>
              <select
                value={autoReportPeriod}
                onChange={(e) => setAutoReportPeriod(e.target.value)}
                disabled={autoReportEnabled === "disabled"}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] bg-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="daily">Harian (Setiap Hari)</option>
                <option value="weekly">Mingguan (Setiap Senin)</option>
                <option value="monthly">Bulanan (Tanggal 1)</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-[12px] text-slate-600">
                Waktu Pengiriman (WIB)
              </div>
              <AnalogTimePicker
                value={autoReportTime}
                onChange={(val) => setAutoReportTime(val)}
                disabled={autoReportEnabled === "disabled"}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveSla}
              className="px-4 py-2 rounded-full border border-indigo-500 bg-indigo-500 text-[12px] font-semibold text-white hover:bg-indigo-600 hover:border-indigo-600 transition-colors shadow-sm"
            >
              Simpan Jadwal Laporan
            </button>
            {slaSaveMessage && (
              <span className="text-[11px] font-medium text-emerald-600 animate-pulse">
                {slaSaveMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspaceSettingsSection;
