import React, { useEffect, useState } from "react";
import { useNotification } from "../../context/NotificationContext";

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
  monitoringEnabled: boolean;
  monitoredQueues?: string[];
  monitoredInterfaces?: string[];
  netflowPort: number;
  netflowEnabled: boolean;
  apiUser?: string;
  apiPassword?: string;
  apiPort?: number;
  pingIntervalMs?: number;
};

type DevicesSectionProps = {
  workspaceName?: string;
  workspaceId?: number;
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
        <span className="text-[12px] font-semibold text-[var(--text-main-primary)]">{label}</span>
        {description && (
          <span className="text-[10px] text-[var(--text-main-secondary)] leading-tight">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none ${checked 
            ? "bg-blue-600 shadow-lg shadow-blue-500/30" 
            : "bg-slate-300 dark:bg-slate-700"
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${checked ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
        />
      </button>
    </div>
  );
};

const DevicesSection: React.FC<DevicesSectionProps> = ({ workspaceName, workspaceId }) => {
  const { notify } = useNotification();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);

  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [type, setType] = useState<DeviceType>("router");
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>("snmp");
  const [snmpVersion, setSnmpVersion] = useState<SnmpVersion>("v2c");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [netflowPort, setNetflowPort] = useState(10000);
  const [netflowEnabled, setNetflowEnabled] = useState(true);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [fetchingTarget, setFetchingTarget] = useState<"queues" | "interfaces" | "all" | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "failed">("idle");
  const [testMessage, setTestMessage] = useState<string>("");
  const [testIp, setTestIp] = useState("");
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [availableQueues, setAvailableQueues] = useState<string[]>([]);
  const [monitoredQueues, setMonitoredQueues] = useState<string[]>([]);
  const [queueMonitoringEnabled, setQueueMonitoringEnabled] = useState(false);

  // Interfaces selective monitoring
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [monitoredInterfaces, setMonitoredInterfaces] = useState<string[]>([]);
  const [interfaceMonitoringEnabled, setInterfaceMonitoringEnabled] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editIp, setEditIp] = useState("");
  const [editType, setEditType] = useState<DeviceType>("router");
  const [editIntegrationMode, setEditIntegrationMode] = useState<IntegrationMode>("snmp");
  const [editSnmpVersion, setEditSnmpVersion] = useState<SnmpVersion>("v2c");
  const [editSnmpCommunity, setEditSnmpCommunity] = useState("");
  const [editNetflowPort, setEditNetflowPort] = useState(10000);
  const [editNetflowEnabled, setEditNetflowEnabled] = useState(true);
  const [editMonitoringEnabled, setEditMonitoringEnabled] = useState(true);
  const [editAvailableQueues, setEditAvailableQueues] = useState<string[]>([]);
  const [editMonitoredQueues, setEditMonitoredQueues] = useState<string[]>([]);
  const [editQueueMonitoringEnabled, setEditQueueMonitoringEnabled] = useState(false);

  // Edit interfaces selective monitoring
  const [editAvailableInterfaces, setEditAvailableInterfaces] = useState<string[]>([]);
  const [editMonitoredInterfaces, setEditMonitoredInterfaces] = useState<string[]>([]);
  const [editInterfaceMonitoringEnabled, setEditInterfaceMonitoringEnabled] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const url = workspaceId ? `/api/devices?workspaceId=${workspaceId}` : `/api/devices`;
        const res = await fetch(url);
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
  }, [workspaceId]);

  const handleAddDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !ip.trim()) return;

    const normalizedSnmp =
      integrationMode === "snmp"
        ? snmpCommunity.trim() || "public"
        : "";

    const normalizedSnmpVersion: SnmpVersion | null =
      integrationMode === "snmp" ? snmpVersion : null;

    const payload: Omit<DeviceRecord, "id"> & { workspaceId?: number | null } = {
      name: name.trim(),
      ip: ip.trim(),
      type,
      integrationMode,
      snmpVersion: normalizedSnmpVersion,
      snmpCommunity: normalizedSnmp,
      monitoringEnabled,
      monitoredQueues: queueMonitoringEnabled ? monitoredQueues : [],
      monitoredInterfaces: interfaceMonitoringEnabled ? monitoredInterfaces : [],
      netflowPort,
      netflowEnabled,
      workspaceId: workspaceId ?? null,
    };

    try {
      const res = await fetch(`/api/devices`, {
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
          ? "IP perangkat tidak dapat dikoneksikan. Perangkat tidak disimpan."
          : (errText || "Gagal menambahkan perangkat.");
        notify(message, "error");
      } else {
        const created: DeviceRecord = await res.json();
        setDevices((prev) => [...prev, created]);
        setTestStatus("success");
        setTestMessage("Perangkat berhasil ditambahkan.");
        notify("Perangkat berhasil ditambahkan dan siap dimonitor.", "success");
      }
    } catch (err) {
      console.error("create device error", err);
      setTestStatus("failed");
      setTestMessage("Terjadi error saat menambah perangkat.");
    }

    setName("");
    setIp("");
    setIntegrationMode("snmp");
    setSnmpVersion("v2c");
    setSnmpCommunity("public");
    setNetflowPort(10000);
    setNetflowEnabled(true);
    setMonitoringEnabled(true);
    setQueueMonitoringEnabled(false);
    setIsTesting(false);
    setTestStatus("idle");
    setTestMessage("");
    setIsAddModalOpen(false);
  };

  const handleTestConnection = async () => {
    const ipToTest = testIp.trim();
    if (!ipToTest) {
      setTestStatus("failed");
      setTestMessage("Isi IP terlebih dahulu untuk tes koneksi.");
      return;
    }

    setIsTesting(true);
    setTestStatus("idle");
    setTestMessage("");

    try {
      const payload: Omit<DeviceRecord, "id"> & { workspaceId?: number | null } = {
        name: "",
        ip: ipToTest,
        type,
        integrationMode,
        snmpVersion: snmpVersion,
        snmpCommunity: snmpCommunity,
        monitoringEnabled: true,
        netflowPort: netflowPort,
        netflowEnabled: netflowEnabled,
        workspaceId: workspaceId ?? null,
      };

      const res = await fetch(`/api/devices/test-connection`, {
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
        setTestMessage(data?.message || "Koneksi ke perangkat berhasil.");
        // Populate available queues if returned
        if (data?.availableQueues && data.availableQueues.length > 0) {
          setAvailableQueues(data.availableQueues);
          setQueueMonitoringEnabled(true);
        }
        // Populate available interfaces if returned
        if (data?.availableInterfaces && data.availableInterfaces.length > 0) {
          setAvailableInterfaces(data.availableInterfaces);
          setInterfaceMonitoringEnabled(true);
        }
        // Apply tested IP to form if it's empty
        if (!ip.trim()) {
          setIp(ipToTest);
        }
      }
    } catch (err) {
      console.error("test connection error", err);
      setTestStatus("failed");
      setTestMessage("Terjadi error saat tes koneksi.");
    } finally {
      setIsTesting(false);
    }
  };

  const autoFetchQueues = async (
    targetIp: string,
    targetCommunity: string,
    targetVersion: SnmpVersion,
    isEdit: boolean = false,
    fetchFor: "queues" | "interfaces" | "all" = "all"
  ) => {
    if (!targetIp.trim()) return;
    setIsTesting(true);
    setFetchingTarget(fetchFor);

    // Kita tidak membersihkan array list disini agar layar tidak berkedip kosong saat me-refresh.

    try {
      const payload = {
        name: "",
        ip: targetIp,
        type: "router",
        integrationMode: "snmp",
        snmpVersion: targetVersion,
        snmpCommunity: targetCommunity,
        monitoringEnabled: true,
        netflowPort: 2055,
        workspaceId: workspaceId ?? null,
      };

      const res = await fetch(`/api/devices/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          if (data?.availableQueues) setEditAvailableQueues(data.availableQueues);
          if (data?.availableInterfaces) setEditAvailableInterfaces(data.availableInterfaces);
        } else {
          if (data?.availableQueues) setAvailableQueues(data.availableQueues);
          if (data?.availableInterfaces) setAvailableInterfaces(data.availableInterfaces);
        }
      }
    } catch (err) {
      console.error("auto fetch queues error", err);
    } finally {
      setIsTesting(false);
      setFetchingTarget(null);
    }
  };

  const openEditDevice = (device: DeviceRecord) => {
    setEditingDevice(device);
    setEditName(device.name);
    setEditIp(device.ip);
    setEditType(device.type);
    setEditIntegrationMode(device.integrationMode);
    setEditSnmpVersion(device.snmpVersion || "v2c");
    setEditSnmpCommunity(device.snmpCommunity || "public");
    setEditNetflowPort(device.netflowPort || 10000);
    setEditNetflowEnabled(device.netflowEnabled ?? true);
    setEditMonitoringEnabled(device.monitoringEnabled);
    setEditMonitoredQueues(device.monitoredQueues || []);
    setEditQueueMonitoringEnabled(device.monitoredQueues && device.monitoredQueues.length > 0 ? true : false);
    setEditAvailableQueues([]); // Clear previous fetched queues
    setEditMonitoredInterfaces(device.monitoredInterfaces || []);
    setEditInterfaceMonitoringEnabled(device.monitoredInterfaces && device.monitoredInterfaces.length > 0 ? true : false);
    setEditAvailableInterfaces([]); // Clear previous fetched interfaces
    setIsEditModalOpen(true);

    // Auto fetch if SNMP is active
    if (device.integrationMode === "snmp") {
      autoFetchQueues(device.ip, device.snmpCommunity || "public", device.snmpVersion || "v2c", true);
    }
  };

  const handleUpdateDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDevice) return;

    if (!editName.trim() || !editIp.trim()) return;

    const normalizedSnmp =
      editIntegrationMode === "snmp"
        ? editSnmpCommunity.trim() || "public"
        : "";

    const normalizedSnmpVersion: SnmpVersion | null =
      editIntegrationMode === "snmp" ? editSnmpVersion : null;

    try {
      const payload: Omit<DeviceRecord, "id"> & { workspaceId?: number | null } = {
        name: editName.trim(),
        ip: editIp.trim(),
        type: editType,
        integrationMode: editIntegrationMode,
        snmpVersion: normalizedSnmpVersion,
        snmpCommunity: normalizedSnmp,
        monitoringEnabled: editMonitoringEnabled,
        monitoredQueues: editQueueMonitoringEnabled ? editMonitoredQueues : [],
        monitoredInterfaces: editInterfaceMonitoringEnabled ? editMonitoredInterfaces : [],
        netflowPort: editNetflowPort,
        netflowEnabled: editNetflowEnabled,
        workspaceId: workspaceId ?? null,
      };

      const res = await fetch(`/api/devices/${editingDevice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        notify("Gagal menyimpan perubahan: " + (errText || "Terjadi kesalahan"), "error");
      } else {
        const updated: DeviceRecord = await res.json();
        setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setIsEditModalOpen(false);
        setEditingDevice(null);
        notify("Konfigurasi perangkat berhasil diperbarui.", "success");
      }
    } catch (err) {
      console.error("update device error", err);
      notify("Gagal memperbarui perangkat. Terjadi kesalahan sistem.", "error");
    }
  };

  const handleDeleteDevice = async (device: DeviceRecord) => {
    setDeviceToDelete(device);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/devices/${deviceToDelete.id}`, {
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
        notify("Perangkat berhasil dihapus.", "success");
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
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-indigo-400 bg-indigo-50/50 text-[10px] font-semibold text-indigo-700">
          AP
        </span>
      );
    }
    if (deviceType === "server") {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[10px] font-semibold text-[var(--text-main-primary)]">
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
        <div>
          <h2 className="m-0 mb-1 text-[20px] font-bold text-[var(--text-main-primary)]">
            🖥️ Perangkat & Monitoring
          </h2>
          <p className="m-0 text-[12px] text-[var(--text-main-secondary)]">
            Kelola router, switch, dan endpoint monitoring per perangkat.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4">


        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-[13px] font-semibold text-[var(--text-main-primary)]">
              Daftar perangkat & endpoint
            </h3>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-full bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
            >
              + Tambah Perangkat
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[var(--bg-main)] text-[var(--text-main-secondary)]">
                  <th className="px-2.5 py-1.5 text-left">Perangkat</th>
                  <th className="px-2.5 py-1.5 text-left">IP / Hostname</th>
                  <th className="px-2.5 py-1.5 text-left">Tipe</th>
                  <th className="px-2.5 py-1.5 text-left">Mode</th>
                  <th className="px-2.5 py-1.5 text-left">SNMP</th>
                  <th className="px-2.5 py-1.5 text-left">NF Port</th>
                  <th className="px-2.5 py-1.5 text-left">Monitoring</th>
                  <th className="px-2.5 py-1.5 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--border-main)] hover:bg-[var(--bg-main)]">
                    <td className="px-2.5 py-1.5 align-top">
                      <div className="flex items-center gap-2">
                        {renderNodeIcon(d.type)}
                        <span className="font-semibold text-[var(--text-main-primary)]">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-[var(--text-main-secondary)]">{d.ip}</td>
                    <td className="px-2.5 py-1.5 align-top text-[var(--text-main-secondary)] capitalize">{d.type}</td>
                    <td className="px-2.5 py-1.5 align-top text-[var(--text-main-secondary)]">
                      {d.integrationMode === "ping" && "Ping"}
                      {d.integrationMode === "snmp" && "SNMP"}
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-[var(--text-main-secondary)]">
                      {d.snmpVersion && d.snmpCommunity
                        ? `${d.snmpVersion} / ${d.snmpCommunity}`
                        : "-"}
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-[var(--text-main-secondary)]">
                      {d.netflowPort || 10000}
                      <span className={`ml-1 text-[9px] font-bold ${d.netflowEnabled ? "text-emerald-500" : "text-[var(--text-main-secondary)]"}`}>
                        {d.netflowEnabled ? "(ON)" : "(OFF)"}
                      </span>
                    </td>

                    <td className="px-2.5 py-1.5 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${d.monitoringEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-[var(--bg-main)] text-[var(--text-main-secondary)] border-[var(--border-main)]"
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
                          className="inline-flex items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] hover:opacity-80 transition-all duration-300 shadow-lg px-2 py-0.5 text-[10px] font-semibold text-[var(--text-main-primary)]"
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
                      className="px-2.5 py-4 text-center text-[var(--text-main-secondary)]"
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

      {/* MODAL TAMBAH PERANGKAT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-bold text-[var(--text-main-primary)]">
                Tambah Perangkat Baru
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(true);
                  setTestStatus("idle");
                  setTestMessage("");
                  setTestIp(ip || "");
                }}
                className="px-3 py-1.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] text-[10px] font-bold text-[var(--text-main-secondary)] hover:opacity-80 transition-colors cursor-pointer"
              >
                ⚡ Tes Koneksi
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <form id="add-device-form" onSubmit={handleAddDevice} className="flex flex-col gap-4 text-[12px]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)] font-medium">
                      Nama Perangkat
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Router Core"
                      className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-3 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)] font-medium">
                      IP / Hostname
                    </label>
                    <input
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="192.168.88.1"
                      className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-3 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)] font-medium">
                    Tipe Perangkat
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DeviceType)}
                    className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-3 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="ap">Access Point</option>
                    <option value="server">Server</option>
                    <option value="client">Client / Network</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)]">
                  <h4 className="text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-wider mb-3">Monitoring & Integrasi</h4>
                  <div className="space-y-3">
                    <Switch
                      label="SNMP Monitoring"
                      description="Tarik data interface, traffic, & resource via SNMP"
                      checked={integrationMode === "snmp"}
                      onChange={(val) => {
                        setIntegrationMode(val ? "snmp" : "ping");
                        if (val && ip.trim()) {
                          autoFetchQueues(ip, snmpCommunity, snmpVersion);
                        }
                      }}
                    />
                    
                    {integrationMode === "snmp" && (
                      <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-blue-500/30 ml-1 py-1">
                        <div>
                          <label className="mb-1 block text-[10px] text-[var(--text-main-secondary)]">Versi</label>
                          <select
                            value={snmpVersion}
                            onChange={(e) => setSnmpVersion(e.target.value as SnmpVersion)}
                            className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2 text-[11px] outline-none"
                          >
                            <option value="v1">v1</option>
                            <option value="v2c">v2c</option>
                            <option value="v3">v3</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-[var(--text-main-secondary)]">Community</label>
                          <input
                            value={snmpCommunity}
                            onChange={(e) => setSnmpCommunity(e.target.value)}
                            placeholder="public"
                            className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2 text-[11px] outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <Switch
                      label="NetFlow Monitoring"
                      description="Rekam trafik data dari router (UDP Port)"
                      checked={netflowEnabled}
                      onChange={setNetflowEnabled}
                    />

                    {netflowEnabled && (
                      <div className="pl-2 border-l-2 border-emerald-500/30 ml-1 py-1">
                         <label className="mb-1 block text-[10px] text-[var(--text-main-secondary)]">UDP Port (10000-20000)</label>
                         <input
                           type="number"
                           value={netflowPort}
                           onChange={(e) => setNetflowPort(parseInt(e.target.value) || 10000)}
                           className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2 text-[11px] outline-none focus:border-blue-500/60"
                         />
                      </div>
                    )}

                    <Switch
                      label="Status Monitoring"
                      description="Aktifkan pencatatan log PING & Status UP/DOWN"
                      checked={monitoringEnabled}
                      onChange={setMonitoringEnabled}
                    />
                  </div>
                </div>

                {integrationMode === "snmp" && (
                  <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)]">
                    <h4 className="text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-wider mb-3">Antrian & Interface</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <Switch
                          label="Monitor Queues"
                          description="Pantau traffic Mikrotik Simple Queue"
                          checked={queueMonitoringEnabled}
                          onChange={(val) => {
                            setQueueMonitoringEnabled(val);
                            if (val && ip.trim() && availableQueues.length === 0) {
                              autoFetchQueues(ip, snmpCommunity, snmpVersion);
                            }
                          }}
                        />
                        {queueMonitoringEnabled && (
                          <div className="mt-2 pl-2 border-l-2 border-blue-500/20 ml-1">
                            {availableQueues.length > 0 ? (
                              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {availableQueues.map((q) => (
                                  <label key={q} className="flex items-center gap-2 text-[11px] text-[var(--text-main-secondary)] cursor-pointer hover:text-blue-500 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={monitoredQueues.includes(q)}
                                      onChange={(e) => {
                                        if (e.target.checked) setMonitoredQueues([...monitoredQueues, q]);
                                        else setMonitoredQueues(monitoredQueues.filter((mq) => mq !== q));
                                      }}
                                      className="rounded border-[var(--border-main)] bg-[var(--bg-main)]/50"
                                    />
                                    <span>{q}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-500 italic">Klik Tes Koneksi untuk memuat daftar...</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <Switch
                          label="Monitor Interfaces"
                          description="Pantau traffic Network Interface"
                          checked={interfaceMonitoringEnabled}
                          onChange={(val) => {
                            setInterfaceMonitoringEnabled(val);
                            if (val && ip.trim() && availableInterfaces.length === 0) {
                              autoFetchQueues(ip, snmpCommunity, snmpVersion);
                            }
                          }}
                        />
                        {interfaceMonitoringEnabled && (
                          <div className="mt-2 pl-2 border-l-2 border-emerald-500/20 ml-1">
                            {availableInterfaces.length > 0 ? (
                              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {availableInterfaces.map((iface) => (
                                  <label key={iface} className="flex items-center gap-2 text-[11px] text-[var(--text-main-secondary)] cursor-pointer hover:text-emerald-500 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={monitoredInterfaces.includes(iface)}
                                      onChange={(e) => {
                                        if (e.target.checked) setMonitoredInterfaces([...monitoredInterfaces, iface]);
                                        else setMonitoredInterfaces(monitoredInterfaces.filter((mi) => mi !== iface));
                                      }}
                                      className="rounded border-[var(--border-main)] bg-[var(--bg-main)]/50"
                                    />
                                    <span>{iface}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-500 italic">Klik Tes Koneksi untuk memuat daftar...</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 border-t border-[var(--border-main)] flex justify-end gap-2 bg-[var(--bg-main)]/30">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[var(--border-main)] bg-transparent text-[12px] font-semibold text-[var(--text-main-secondary)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="add-device-form"
                className="px-6 py-2 rounded-full border-0 bg-blue-600 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Simpan Perangkat
              </button>
            </div>
          </div>
        </div>
      )}

      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl p-4 shadow-xl shadow-black/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[14px] font-semibold text-[var(--text-main-primary)]">
                Tes koneksi perangkat
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setIsTesting(false);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-main)] text-[var(--text-main-secondary)] hover:bg-[var(--bg-main)] text-[11px] transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-[11px] text-[var(--text-main-secondary)]">
              Masukkan IP / hostname yang ingin dites. Sistem akan melakukan
              tes koneksi sederhana menggunakan ICMP ping (untuk mode Ping/SNMP)
              atau cek port API (untuk mode API/SNMP+API).
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">
                IP address / hostname untuk tes
              </label>
              <input
                value={testIp}
                onChange={(e) => setTestIp(e.target.value)}
                placeholder="Misal: 10.10.0.1 atau pop-bandung"
                className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {testStatus !== "idle" && (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-[11px] ${testStatus === "success"
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
                className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] hover:opacity-80 transition-all duration-300 px-3 text-[12px] font-semibold text-[var(--text-main-primary)] shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl p-4 shadow-xl shadow-black/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[14px] font-semibold text-[var(--text-main-primary)]">
                Edit perangkat
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingDevice(null);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-main)] text-[var(--text-main-secondary)] hover:bg-[var(--bg-main)] text-[11px] transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-[11px] text-[var(--text-main-secondary)]">
              Ubah nama, IP, dan konfigurasi monitoring untuk perangkat ini.
            </p>

            <form onSubmit={handleUpdateDevice} className="flex flex-col gap-2.5 text-[12px]">
              <div>
                <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">
                  Nama perangkat
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">
                  IP address / hostname
                </label>
                <input
                  value={editIp}
                  onChange={(e) => setEditIp(e.target.value)}
                  className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">Tipe perangkat</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as DeviceType)}
                  className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="ap">Access Point</option>
                  <option value="server">Server</option>
                  <option value="client">Client / Network</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="mb-2 block text-[11px] text-[var(--text-main-secondary)] font-semibold">
                  Fitur Monitoring & Integrasi
                </label>
                <div className="grid gap-2 p-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)]">
                  <Switch
                    label="SNMP Monitoring"
                    description="Tarik data interface, traffic, & resource via SNMP"
                    checked={editIntegrationMode === "snmp"}
                    onChange={(val) => {
                      setEditIntegrationMode(val ? "snmp" : "ping");
                    }}
                  />
                </div>
              </div>

              {editIntegrationMode === "snmp" && (
                <div className="flex gap-2">
                  <div className="w-28">
                    <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">
                      SNMP versi
                    </label>
                    <select
                      value={editSnmpVersion}
                      onChange={(e) => setEditSnmpVersion(e.target.value as SnmpVersion)}
                      className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="v1">v1</option>
                      <option value="v2c">v2c</option>
                      <option value="v3">v3</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">
                      SNMP community
                    </label>
                    <input
                      value={editSnmpCommunity}
                      onChange={(e) => setEditSnmpCommunity(e.target.value)}
                      className="h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[11px] text-[var(--text-main-secondary)]">
                  NetFlow Port (UDP)
                </label>
                <input
                  type="number"
                  value={editNetflowPort}
                  disabled={!editNetflowEnabled}
                  onChange={(e) => setEditNetflowPort(parseInt(e.target.value) || 10000)}
                  className={`h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-primary)] px-2.5 text-[12px] outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 ${!editNetflowEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                />
                {editNetflowEnabled && (
                  <p className="mt-1 text-[10px] text-[var(--text-main-secondary)]">
                    Gunakan port unik (10000-20000) untuk identifikasi router di belakang NAT.
                  </p>
                )}
              </div>

              <div className="mt-1 py-1 px-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-main)] mb-2">
                <Switch
                  label="Aktifkan NetFlow"
                  description="Monitor trafik data dari router ini"
                  checked={editNetflowEnabled}
                  onChange={setEditNetflowEnabled}
                />
              </div>


              <div className="mt-1 py-1 px-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-main)]">
                <Switch
                  label="Aktifkan Monitoring"
                  description="Mulai merekam log ping & data perangkat ini"
                  checked={editMonitoringEnabled}
                  onChange={setEditMonitoringEnabled}
                />
              </div>

              {editIntegrationMode === "snmp" && (
                <div className="mt-1 py-1 px-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-main)] mb-2">
                  <Switch
                    label="Aktifkan Monitoring Queue"
                    description="Monitor traffic dari Mikrotik Queue (Simple/Tree)"
                    checked={editQueueMonitoringEnabled}
                    onChange={(val) => {
                      setEditQueueMonitoringEnabled(val);
                      if (val && editIp.trim() && editAvailableQueues.length === 0) {
                        autoFetchQueues(editIp, editSnmpCommunity, editSnmpVersion, true);
                      }
                    }}
                  />
                </div>
              )}

              {editQueueMonitoringEnabled && editIntegrationMode === "snmp" && (
                <div className="mt-2 p-3 rounded-xl border border-blue-100 bg-blue-50/30 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-blue-700">
                      Target Antrian (Queues):
                    </label>
                    <button
                      type="button"
                      onClick={() => autoFetchQueues(editIp, editSnmpCommunity, editSnmpVersion, true, "queues")}
                      disabled={isTesting}
                      className="bg-[var(--bg-main)] hover:bg-[var(--border-main)] border border-[var(--border-main)] text-blue-600 text-[10px] px-2 py-0.5 rounded shadow-sm transition-all"
                    >
                      {isTesting && fetchingTarget === "queues" ? "Memuat..." : "Refresh Daftar Queue"}
                    </button>
                  </div>

                  {editAvailableQueues.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {editAvailableQueues.map((q) => (
                        <label key={q} className="flex items-center gap-2 text-[11px] text-[var(--text-main-secondary)] cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={editMonitoredQueues.includes(q)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditMonitoredQueues([...editMonitoredQueues, q]);
                              } else {
                                setEditMonitoredQueues(editMonitoredQueues.filter((mq) => mq !== q));
                              }
                            }}
                            className="rounded border-[var(--border-main)] text-blue-600 focus:ring-blue-500/40 bg-[var(--bg-main)]/50"
                          />
                          <span>{q}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--text-main-secondary)] italic leading-tight">
                      {editMonitoredQueues.length > 0
                        ? `${editMonitoredQueues.length} queue terpilih. Klik refresh untuk melihat daftar lengkap.`
                        : "Klik refresh atau tes koneksi untuk melihat daftar antrian dari perangkat."}
                    </p>
                  )}
                </div>
              )}

              {editIntegrationMode === "snmp" && (
                <div className="mt-1 py-1 px-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-main)] mb-2">
                  <Switch
                    label="Aktifkan Monitoring Interface"
                    description="Monitor traffic dari Network Interface"
                    checked={editInterfaceMonitoringEnabled}
                    onChange={(val) => {
                      setEditInterfaceMonitoringEnabled(val);
                      if (val && editIp.trim() && editAvailableInterfaces.length === 0) {
                        autoFetchQueues(editIp, editSnmpCommunity, editSnmpVersion, true);
                      }
                    }}
                  />
                </div>
              )}

              {editInterfaceMonitoringEnabled && editIntegrationMode === "snmp" && (
                <div className="mt-2 p-3 rounded-xl border border-blue-100 bg-blue-50/30 mb-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="block text-[11px] font-semibold text-blue-700">
                      Pilih Interface untuk Dimonitor:
                    </label>
                    <button
                      type="button"
                      onClick={() => autoFetchQueues(editIp, editSnmpCommunity, editSnmpVersion, true, "interfaces")}
                      disabled={isTesting}
                      className="bg-[var(--bg-main)] hover:bg-[var(--border-main)] border border-[var(--border-main)] text-blue-600 text-[10px] px-2 py-0.5 rounded shadow-sm transition-all"
                    >
                      {isTesting && fetchingTarget === "interfaces" ? "Memuat..." : "Refresh Interface"}
                    </button>
                  </div>
                  {editAvailableInterfaces.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {editAvailableInterfaces.map((iface) => (
                        <label key={iface} className="flex items-center gap-2 text-[11px] text-[var(--text-main-secondary)] cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={editMonitoredInterfaces.includes(iface)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditMonitoredInterfaces([...editMonitoredInterfaces, iface]);
                              } else {
                                setEditMonitoredInterfaces(editMonitoredInterfaces.filter((mi) => mi !== iface));
                              }
                            }}
                            className="rounded border-[var(--border-main)] text-blue-600 focus:ring-blue-500/40 bg-[var(--bg-main)]/50"
                          />
                          <span>{iface}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--text-main-secondary)] italic leading-tight">
                      {editMonitoredInterfaces.length > 0
                        ? `${editMonitoredInterfaces.length} interface terpilih. Klik refresh untuk melihat daftar lengkap.`
                        : "Klik refresh atau tes koneksi untuk melihat daftar interface dari perangkat."}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingDevice(null);
                  }}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] hover:opacity-80 transition-all duration-300 px-3 text-[12px] font-semibold text-[var(--text-main-primary)] shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 shadow-xl p-4 shadow-xl shadow-black/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="m-0 text-[14px] font-semibold text-[var(--text-main-primary)]">
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-main)] text-[var(--text-main-secondary)] hover:bg-[var(--bg-main)] text-[11px] transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-[11px] text-[var(--text-main-secondary)]">
              Anda yakin ingin menghapus perangkat
              <span className="font-semibold text-[var(--text-main-primary)]"> {deviceToDelete.name}</span>
              <span className="text-[var(--text-main-secondary)]"> · {deviceToDelete.ip}</span>? Data perangkat akan
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
                className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] hover:opacity-80 transition-all duration-300 px-3 text-[12px] font-semibold text-[var(--text-main-primary)] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
    </section>
  );
};

export default DevicesSection;
