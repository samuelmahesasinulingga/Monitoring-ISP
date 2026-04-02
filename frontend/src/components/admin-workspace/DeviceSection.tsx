import React, { useState } from "react";

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

const DevicesSection: React.FC<DevicesSectionProps> = ({ workspaceName }) => {
  const [devices, setDevices] = useState<DeviceRecord[]>([
    {
      id: 1,
      name: "Upstream ISP",
      ip: "0.0.0.0",
      type: "router",
      integrationMode: "snmp+api",
      snmpVersion: "v2c",
      snmpCommunity: "public",
      apiUser: "api-user",
      apiPort: 8728,
      monitoringEnabled: true,
    },
    {
      id: 2,
      name: "Router Kantor Pusat",
      ip: "10.0.0.1",
      type: "router",
      integrationMode: "snmp+api",
      snmpVersion: "v2c",
      snmpCommunity: "public",
      apiUser: "api-user",
      apiPort: 8728,
      monitoringEnabled: true,
    },
    {
      id: 3,
      name: "Switch Lantai 1",
      ip: "10.0.1.2",
      type: "switch",
      integrationMode: "snmp",
      snmpVersion: "v2c",
      snmpCommunity: "public",
      apiUser: "api-user",
      apiPort: 161,
      monitoringEnabled: false,
    },
    {
      id: 4,
      name: "Client VLAN 10",
      ip: "10.0.10.1",
      type: "client",
      integrationMode: "ping",
      snmpVersion: null,
      snmpCommunity: "public",
      apiUser: "",
      apiPort: 0,
      monitoringEnabled: false,
    },
  ]);

  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [type, setType] = useState<DeviceType>("router");
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>("snmp+api");
    const [snmpVersion, setSnmpVersion] = useState<SnmpVersion>("v2c");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [apiUser, setApiUser] = useState("api-user");
  const [apiPort, setApiPort] = useState(8728);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  const handleAddDevice = (e: React.FormEvent<HTMLFormElement>) => {
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

    setDevices((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((d) => d.id)) + 1 : 1,
        name: name.trim(),
        ip: ip.trim(),
        type,
        integrationMode,
        snmpVersion: normalizedSnmpVersion,
        snmpCommunity: normalizedSnmp,
        apiUser: normalizedApiUser,
        apiPort: normalizedApiPort,
        monitoringEnabled,
      },
    ]);

    setName("");
    setIp("");
    setIntegrationMode("snmp+api");
    setSnmpVersion("v2c");
    setSnmpCommunity("public");
    setApiUser("api-user");
    setApiPort(8728);
    setMonitoringEnabled(true);
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
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-slate-900">
            Tambah perangkat
          </h3>
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

            <div>
              <label className="mb-1 block text-[11px] text-slate-600">
                Kebutuhan monitoring / integrasi
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    key: "ping" as IntegrationMode,
                    label: "Ping saja",
                    hint: "Untuk monitoring latency & up/down basic.",
                  },
                  {
                  key: "snmp" as IntegrationMode,
                  label: "SNMP",
                  hint: "Tarik data interface, traffic, resource via SNMP.",
                },
                {
                  key: "api" as IntegrationMode,
                  label: "API Mikrotik",
                  hint: "Gunakan API untuk queue, simple queue, dsb.",
                },
                {
                  key: "snmp+api" as IntegrationMode,
                  label: "SNMP + API",
                  hint: "Gunakan keduanya untuk visibilitas penuh.",
                }].map((mode) => {
                  const isActive = integrationMode === mode.key;
                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setIntegrationMode(mode.key)}
                      className={`px-2.5 py-1.5 rounded-full border text-[11px] cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? "bg-blue-600/10 border-blue-600 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400/60 hover:text-blue-600"
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Pilihan ini menentukan endpoint apa yang perlu diisi. Misal untuk
                router Mikrotik biasanya pakai <span className="font-semibold">SNMP + API</span>,
                sedangkan untuk client cukup <span className="font-semibold">Ping saja</span>.
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
            <label className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={monitoringEnabled}
                onChange={(e) => setMonitoringEnabled(e.target.checked)}
              />
              <span>Aktifkan monitoring untuk perangkat ini</span>
            </label>
            <button
              type="submit"
              className="mt-1 inline-flex h-8 items-center justify-center rounded-full border-0 bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
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
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
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
    </section>
  );
};

export default DevicesSection;
