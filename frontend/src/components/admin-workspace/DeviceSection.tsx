import React, { useEffect, useState } from "react";

export type DeviceType = "router" | "switch" | "ap" | "server" | "client";

export type IntegrationMode = "ping" | "snmp" | "api" | "snmp+api";

export type SnmpVersion = "v1" | "v2c" | "v3";

export type DeviceRecord = {
  id: number;
  name: string;
  ip: string;
  type: DeviceType;
  integrationMode: IntegrationMode;
  snmpVersion: SnmpVersion | null;
  snmpCommunity: string;
  apiUser: string;
  apiPort: number;
  monitoringEnabled: boolean;
};

type DevicesSectionProps = {
  workspaceName?: string;
};

const Switch = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  description?: string;
}) => {
  return (
    <div
      className="flex items-center justify-between gap-4 p-1 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-semibold text-slate-700">{label}</span>
        {description && (
          <span className="text-[10px] text-slate-400 leading-tight">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-blue-600 shadow-sm shadow-blue-500/20" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0.5"
          } shadow-sm`}
        />
      </button>
    </div>
  );
};

const DevicesSection: React.FC<DevicesSectionProps> = ({ workspaceName }) => {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);

  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [type, setType] = useState<DeviceType>("router");
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>("snmp+api");
    const [snmpVersion, setSnmpVersion] = useState<SnmpVersion>("v2c");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [apiUser, setApiUser] = useState("api-user");
  const [apiPort, setApiPort] = useState(8728);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "failed">("idle");
  const [testMessage, setTestMessage] = useState<string>("");
  const [testIp, setTestIp] = useState("");
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);
  const [editIntegrationMode, setEditIntegrationMode] = useState<IntegrationMode>("snmp+api");
  const [editSnmpVersion, setEditSnmpVersion] = useState<SnmpVersion>("v2c");
  const [editSnmpCommunity, setEditSnmpCommunity] = useState("");
  const [editApiUser, setEditApiUser] = useState("");
  const [editApiPort, setEditApiPort] = useState(8728);
  const [editMonitoringEnabled, setEditMonitoringEnabled] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>("");

  const [feedbackModal, setFeedbackModal] = useState<
    | null
    | {
        type: "success" | "error";
        title: string;
        message: string;
      }
  >(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const fetchDevices = async () => {
      try {
        const res = await fetch(`${apiBase}/api/devices`);
        if (!res.ok) {
          console.error("failed to load devices", await res.text());
          return;
        }
        const data: DeviceRecord[] = await res.json();
        setDevices(data);
      } catch (err) {
        console.error("load devices error", err);
      }
    };

    fetchDevices();
  }, []);

  const handleAddDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !ip.trim()) return;

    const normalizedSnmp =
      integrationMode === "snmp" || integrationMode === "snmp+api"
        ? snmpCommunity.trim() || "public"
        : "";

    const normalizedSnmpVersion: SnmpVersion | null =
      integrationMode === "snmp" || integrationMode === "snmp+api" ? snmpVersion : null;

    const normalizedApiUser =
      integrationMode === "api" || integrationMode === "snmp+api"
        ? apiUser.trim()
        : "";

    const normalizedApiPort =
      integrationMode === "api" || integrationMode === "snmp+api" ? apiPort : 0;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    try {
      const payload: Omit<DeviceRecord, "id"> & { workspaceId?: number | null } = {
        name: name.trim(),
        ip: ip.trim(),
        type,
        integrationMode,
        snmpVersion: normalizedSnmpVersion,
        snmpCommunity: normalizedSnmp,
        apiUser: normalizedApiUser,
        apiPort: normalizedApiPort,
        monitoringEnabled,
      };

      const res = await fetch(`${apiBase}/api/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("failed to create device", errText);
        setTestStatus("failed");
        setTestMessage(errText);
        const lower = errText.toLowerCase();
        const message = lower.includes("gagal konek")
          ? "IP perangkat tidak dapat dikoneksikan. Pastikan perangkat hidup dan port/API sudah benar. Perangkat tidak disimpan."
          : (errText || "Gagal menambahkan perangkat.") + " Perangkat tidak disimpan.";
        setFeedbackModal({
          type: "error",
          title: "Gagal menambahkan perangkat",
          message,
        });
      } else {
        const created: DeviceRecord = await res.json();
        setDevices((prev) => [...prev, created]);
        setTestStatus("success");
        setTestMessage("Perangkat berhasil ditambahkan dan koneksi OK.");
        setFeedbackModal({
          type: "success",
          title: "Perangkat tersimpan",
          message: "Perangkat berhasil ditambahkan dan siap dimonitor.",
        });
      }
    } catch (err) {
      console.error("create device error", err);
      setTestStatus("failed");
      setTestMessage("Terjadi error saat menambah perangkat.");
    }

    setName("");
    setIp("");
    setIntegrationMode("snmp+api");
    setSnmpVersion("v2c");
    setSnmpCommunity("public");
    setApiUser("api-user");
    setApiPort(8728);
    setMonitoringEnabled(true);
    setIsTesting(false);
    setTestStatus("idle");
    setTestMessage("");
  };

  const handleTestConnection = async () => {
    const ipToTest = testIp.trim();
    if (!ipToTest) {
      setTestStatus("failed");
      setTestMessage("Isi IP terlebih dahulu untuk tes koneksi.");
      return;
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const normalizedApiPortForTest =
      integrationMode === "api" || integrationMode === "snmp+api" ? apiPort : 0;

    setIsTesting(true);
    setTestStatus("idle");
    setTestMessage("");

    try {
      const payload: Omit<DeviceRecord, "id"> & { workspaceId?: number | null } = {
        name: "",
        ip: ipToTest,
        type,
        // Gunakan mode yang dipilih saat ini supaya tes koneksi
        // sesuai dengan jenis endpoint (Ping saja vs SNMP+API).
        integrationMode,
        snmpVersion: null,
        snmpCommunity: "",
        apiUser: "",
        apiPort: normalizedApiPortForTest,
        monitoringEnabled: true,
      };

      const res = await fetch(`${apiBase}/api/devices/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = await res.text();
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error) {
            msg = parsed.error;
          }
        } catch {
          // ignore JSON parse error, use raw text
        }
        setTestStatus("failed");
        setTestMessage(msg || "Tes koneksi gagal.");
      } else {
        const data = await res.json().catch(() => null as any);
        setTestStatus("success");
        setTestMessage(data?.message || "Tes koneksi berhasil.");
      }
    } catch (err) {
      console.error("test connection error", err);
      setTestStatus("failed");
      setTestMessage("Terjadi error saat tes koneksi.");
    } finally {
      setIsTesting(false);
    }
  };

  const openEditDevice = (device: DeviceRecord) => {
    setEditingDevice(device);
    setName(device.name);
    setIp(device.ip);
    setType(device.type);
    setEditIntegrationMode(device.integrationMode);
    setEditSnmpVersion(device.snmpVersion || "v2c");
    setEditSnmpCommunity(device.snmpCommunity || "public");
    setEditApiUser(device.apiUser || "api-user");
    setEditApiPort(device.apiPort || 8728);
    setEditMonitoringEnabled(device.monitoringEnabled);
    setIsEditModalOpen(true);
  };

  const handleUpdateDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDevice) return;

    if (!name.trim() || !ip.trim()) return;

    const normalizedSnmp =
      editIntegrationMode === "snmp" || editIntegrationMode === "snmp+api"
        ? editSnmpCommunity.trim() || "public"
        : "";

    const normalizedSnmpVersion: SnmpVersion | null =
      editIntegrationMode === "snmp" || editIntegrationMode === "snmp+api" ? editSnmpVersion : null;

    const normalizedApiUser =
      editIntegrationMode === "api" || editIntegrationMode === "snmp+api"
        ? editApiUser.trim()
        : "";

    const normalizedApiPort =
      editIntegrationMode === "api" || editIntegrationMode === "snmp+api" ? editApiPort : 0;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    try {
      const payload: Omit<DeviceRecord, "id"> & { workspaceId?: number | null } = {
        name: name.trim(),
        ip: ip.trim(),
        type,
        integrationMode: editIntegrationMode,
        snmpVersion: normalizedSnmpVersion,
        snmpCommunity: normalizedSnmp,
        apiUser: normalizedApiUser,
        apiPort: normalizedApiPort,
        monitoringEnabled: editMonitoringEnabled,
      };

      const res = await fetch(`${apiBase}/api/devices/${editingDevice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("failed to update device", errText);
        setFeedbackModal({
          type: "error",
          title: "Gagal menyimpan perubahan",
          message: errText || "Gagal mengupdate perangkat.",
        });
      } else {
        const updated: DeviceRecord = await res.json();
        setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setIsEditModalOpen(false);
        setEditingDevice(null);
        setFeedbackModal({
          type: "success",
          title: "Perubahan tersimpan",
          message: "Perubahan konfigurasi perangkat berhasil disimpan.",
        });
      }
    } catch (err) {
      console.error("update device error", err);
      setFeedbackModal({
        type: "error",
        title: "Error saat menyimpan",
        message: "Terjadi error saat mengupdate perangkat.",
      });
    }
  };

  const handleDeleteDevice = async (device: DeviceRecord) => {
    setDeviceToDelete(device);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    try {
      setIsDeleting(true);
      const res = await fetch(`${apiBase}/api/devices/${deviceToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("failed to delete device", errText);
        setDeleteError(errText || "Gagal menghapus perangkat.");
      } else {
        setDevices((prev) => prev.filter((d) => d.id !== deviceToDelete.id));
        setIsDeleteModalOpen(false);
        setDeviceToDelete(null);
        setDeleteError("");
      }
    } catch (err) {
      console.error("delete device error", err);
      setDeleteError("Terjadi error saat menghapus perangkat.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderNodeIcon = (deviceType: DeviceType) => {
    if (deviceType === "router") {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-sky-400 bg-sky-50 text-[10px] font-semibold text-sky-700">
          RTR
        </span>
      );
    }
    if (deviceType === "switch") {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-emerald-400 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
          SW
        </span>
      );
    }
    if (deviceType === "ap") {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-indigo-400 bg-indigo-50 text-[10px] font-semibold text-indigo-700">
          AP
        </span>
      );
    }
    if (deviceType === "server") {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-400 bg-slate-50 text-[10px] font-semibold text-slate-700">
          SRV
        </span>
      );
    }
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-400 bg-amber-50 text-[10px] font-semibold text-amber-700">
        CL
      </span>
    );
  };

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4">
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Devices & Endpoint monitoring {workspaceName ? `- ${workspaceName}` : ""}
        </h2>
        <p className="m-0 text-[12px] text-slate-500">
          Tambah daftar perangkat router/switch/server dan konfigurasi
          endpoint monitoring (SNMP dan API Mikrotik) per perangkat.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-900/5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="m-0 text-[13px] font-semibold text-slate-900">
              Tambah perangkat
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsTestModalOpen(true);
                setTestStatus("idle");
                setTestMessage("");
                setTestIp(ip || "");
              }}
              className="inline-flex h-8 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Tes koneksi perangkat
            </button>
          </div>
          <form onSubmit={handleAddDevice} className="flex flex-col gap-2.5 text-[12px]">
            <div>
              <label className="mb-1 block text-[11px] text-slate-600">
                Nama perangkat
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Router POP Bandung"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-600">
                IP address / hostname
              </label>
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Misal: 10.10.0.1 atau pop-bandung"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-600">
                Tipe perangkat
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DeviceType)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="router">Router</option>
                <option value="switch">Switch</option>
                <option value="ap">Access Point</option>
                <option value="server">Server</option>
                <option value="client">Client / Network</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="mb-2 block text-[11px] text-slate-600 font-semibold">
                Fitur Monitoring & Integrasi
              </label>
              <div className="grid gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                <Switch
                  label="SNMP Monitoring"
                  description="Tarik data interface, traffic, & resource via SNMP"
                  checked={integrationMode === "snmp" || integrationMode === "snmp+api"}
                  onChange={(val) => {
                    const isApiActive = integrationMode === "api" || integrationMode === "snmp+api";
                    if (val) {
                      setIntegrationMode(isApiActive ? "snmp+api" : "snmp");
                    } else {
                      setIntegrationMode(isApiActive ? "api" : "ping");
                    }
                  }}
                />
                <div className="h-px bg-slate-200/60 mx-1" />
                <Switch
                  label="Mikrotik API"
                  description="Gunakan API untuk queue dan fitur spesifik lannya"
                  checked={integrationMode === "api" || integrationMode === "snmp+api"}
                  onChange={(val) => {
                    const isSnmpActive = integrationMode === "snmp" || integrationMode === "snmp+api";
                    if (val) {
                      setIntegrationMode(isSnmpActive ? "snmp+api" : "api");
                    } else {
                      setIntegrationMode(isSnmpActive ? "snmp" : "ping");
                    }
                  }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400 px-1">
                Mode <span className="text-slate-500 font-medium italic">ICMP Ping</span> selalu aktif sebagai monitoring dasar.
              </p>
            </div>

            {(integrationMode === "snmp" || integrationMode === "snmp+api") && (
              <div className="flex gap-2">
                <div className="w-28">
                  <label className="mb-1 block text-[11px] text-slate-600">
                    SNMP versi
                  </label>
                  <select
                    value={snmpVersion}
                    onChange={(e) => setSnmpVersion(e.target.value as SnmpVersion)}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="v1">v1</option>
                    <option value="v2c">v2c</option>
                    <option value="v3">v3</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-slate-600">
                    SNMP community
                  </label>
                  <input
                    value={snmpCommunity}
                    onChange={(e) => setSnmpCommunity(e.target.value)}
                    placeholder="public"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            )}

            {(integrationMode === "api" || integrationMode === "snmp+api") && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-slate-600">
                    API user (Mikrotik)
                  </label>
                  <input
                    value={apiUser}
                    onChange={(e) => setApiUser(e.target.value)}
                    placeholder="api-user"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-[11px] text-slate-600">
                    API port
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={apiPort}
                    onChange={(e) => setApiPort(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            )}
            <div className="mt-1 py-1 px-2 rounded-xl bg-slate-50/50 border border-slate-100">
              <Switch
                label="Aktifkan Monitoring"
                description="Mulai merekam log ping & data perangkat ini"
                checked={monitoringEnabled}
                onChange={setMonitoringEnabled}
              />
            </div>
            <button
              type="submit"
              className="mt-2 inline-flex h-8 items-center justify-center rounded-full border-0 bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
            >
              + Tambah perangkat
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-900/5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="m-0 text-[13px] font-semibold text-slate-900">
              Daftar perangkat & endpoint
            </h3>
            <p className="m-0 text-[11px] text-slate-500">
              Ringkasan IP, tipe, dan konfigurasi monitoring untuk setiap perangkat.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-2.5 py-1.5 text-left">Perangkat</th>
                  <th className="px-2.5 py-1.5 text-left">IP / Hostname</th>
                  <th className="px-2.5 py-1.5 text-left">Tipe</th>
                  <th className="px-2.5 py-1.5 text-left">Mode</th>
                  <th className="px-2.5 py-1.5 text-left">SNMP</th>
                  <th className="px-2.5 py-1.5 text-left">API user</th>
                  <th className="px-2.5 py-1.5 text-left">API port</th>
                  <th className="px-2.5 py-1.5 text-left">Monitoring</th>
                  <th className="px-2.5 py-1.5 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-2.5 py-1.5 align-top">
                      <div className="flex items-center gap-2">
                        {renderNodeIcon(d.type)}
                        <span className="font-semibold text-slate-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-slate-700">{d.ip}</td>
                    <td className="px-2.5 py-1.5 align-top text-slate-600 capitalize">{d.type}</td>
                    <td className="px-2.5 py-1.5 align-top text-slate-600">
                      {d.integrationMode === "ping" && "Ping"}
                      {d.integrationMode === "snmp" && "SNMP"}
                      {d.integrationMode === "api" && "API"}
                      {d.integrationMode === "snmp+api" && "SNMP + API"}
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-slate-600">
                      {d.snmpVersion && d.snmpCommunity
                        ? `${d.snmpVersion} / ${d.snmpCommunity}`
                        : "-"}
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-slate-600">{d.apiUser || "-"}</td>
                    <td className="px-2.5 py-1.5 align-top text-slate-600">{d.apiPort || "-"}</td>
                    <td className="px-2.5 py-1.5 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                          d.monitoringEnabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {d.monitoringEnabled ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditDevice(d)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(d)}
                          className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-2.5 py-4 text-center text-slate-400"
                    >
                      Belum ada perangkat terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[14px] font-semibold text-slate-900">
                Tes koneksi perangkat
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setIsTesting(false);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[11px]"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              Masukkan IP / hostname yang ingin dites. Sistem akan melakukan
              tes koneksi sederhana menggunakan ICMP ping (untuk mode Ping/SNMP)
              atau cek port API (untuk mode API/SNMP+API).
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-slate-600">
                IP address / hostname untuk tes
              </label>
              <input
                value={testIp}
                onChange={(e) => setTestIp(e.target.value)}
                placeholder="Misal: 10.10.0.1 atau pop-bandung"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {testStatus !== "idle" && (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-[11px] ${
                  testStatus === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {testMessage}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setIsTesting(false);
                }}
                className="inline-flex h-8 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !testIp.trim()}
                className="inline-flex h-8 items-center justify-center rounded-full border-0 bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isTesting ? "Menguji..." : "Tes koneksi sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[14px] font-semibold text-slate-900">
                Edit perangkat
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingDevice(null);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[11px]"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              Ubah nama, IP, dan konfigurasi monitoring untuk perangkat ini.
            </p>

            <form onSubmit={handleUpdateDevice} className="flex flex-col gap-2.5 text-[12px]">
              <div>
                <label className="mb-1 block text-[11px] text-slate-600">
                  Nama perangkat
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-600">
                  IP address / hostname
                </label>
                <input
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-600">Tipe perangkat</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DeviceType)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="ap">Access Point</option>
                  <option value="server">Server</option>
                  <option value="client">Client / Network</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="mb-2 block text-[11px] text-slate-600 font-semibold">
                  Fitur Monitoring & Integrasi
                </label>
                <div className="grid gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Switch
                    label="SNMP Monitoring"
                    description="Tarik data interface, traffic, & resource via SNMP"
                    checked={editIntegrationMode === "snmp" || editIntegrationMode === "snmp+api"}
                    onChange={(val) => {
                      const isApiActive = editIntegrationMode === "api" || editIntegrationMode === "snmp+api";
                      if (val) {
                        setEditIntegrationMode(isApiActive ? "snmp+api" : "snmp");
                      } else {
                        setEditIntegrationMode(isApiActive ? "api" : "ping");
                      }
                    }}
                  />
                  <div className="h-px bg-slate-200/60 mx-1" />
                  <Switch
                    label="Mikrotik API"
                    description="Gunakan API untuk queue dan fitur spesifik lannya"
                    checked={editIntegrationMode === "api" || editIntegrationMode === "snmp+api"}
                    onChange={(val) => {
                      const isSnmpActive = editIntegrationMode === "snmp" || editIntegrationMode === "snmp+api";
                      if (val) {
                        setEditIntegrationMode(isSnmpActive ? "snmp+api" : "api");
                      } else {
                        setEditIntegrationMode(isSnmpActive ? "snmp" : "ping");
                      }
                    }}
                  />
                </div>
              </div>

              {(editIntegrationMode === "snmp" || editIntegrationMode === "snmp+api") && (
                <div className="flex gap-2">
                  <div className="w-28">
                    <label className="mb-1 block text-[11px] text-slate-600">
                      SNMP versi
                    </label>
                    <select
                      value={editSnmpVersion}
                      onChange={(e) => setEditSnmpVersion(e.target.value as SnmpVersion)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="v1">v1</option>
                      <option value="v2c">v2c</option>
                      <option value="v3">v3</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-slate-600">
                      SNMP community
                    </label>
                    <input
                      value={editSnmpCommunity}
                      onChange={(e) => setEditSnmpCommunity(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}

              {(editIntegrationMode === "api" || editIntegrationMode === "snmp+api") && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-slate-600">
                      API user (Mikrotik)
                    </label>
                    <input
                      value={editApiUser}
                      onChange={(e) => setEditApiUser(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-[11px] text-slate-600">
                      API port
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editApiPort}
                      onChange={(e) => setEditApiPort(Number(e.target.value))}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}

              <div className="mt-1 py-1 px-2 rounded-xl bg-slate-50/50 border border-slate-100">
                <Switch
                  label="Aktifkan Monitoring"
                  description="Mulai merekam log ping & data perangkat ini"
                  checked={editMonitoringEnabled}
                  onChange={setEditMonitoringEnabled}
                />
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingDevice(null);
                  }}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center justify-center rounded-full border-0 bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Simpan perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && deviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[14px] font-semibold text-slate-900">
                Konfirmasi hapus perangkat
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setIsDeleteModalOpen(false);
                  setDeviceToDelete(null);
                  setDeleteError("");
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[11px]"
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-[11px] text-slate-500">
              Anda yakin ingin menghapus perangkat
              <span className="font-semibold text-slate-800"> {deviceToDelete.name}</span>
              <span className="text-slate-400"> · {deviceToDelete.ip}</span>? Data perangkat akan
              dihapus dari daftar dan monitoring.
            </p>

            {deleteError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setIsDeleteModalOpen(false);
                  setDeviceToDelete(null);
                  setDeleteError("");
                }}
                className="inline-flex h-8 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteDevice}
                disabled={isDeleting}
                className="inline-flex h-8 items-center justify-center rounded-full border-0 bg-rose-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Menghapus..." : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-2xl border px-4 py-4 text-[12px] shadow-2xl transform transition-all duration-150 ${
              feedbackModal.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : "bg-red-50/95 border-red-200 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <div
                className={`mt-0.5 h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold ${
                  feedbackModal.type === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {feedbackModal.type === "success" ? "✔" : "!"}
              </div>
              <div className="flex-1">
                <p className="m-0 text-[13px] font-semibold">{feedbackModal.title}</p>
                <p className="m-0 mt-0.5 text-[12px] leading-snug">
                  {feedbackModal.message}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setFeedbackModal(null)}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
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

export default DevicesSection;
