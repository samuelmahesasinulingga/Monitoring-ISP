import React from "react";

export type TopologyDeviceType = "router" | "switch" | "ap" | "server" | "client";
export type TopologyTier = "internet" | "core" | "distribution" | "access";

export type TopologyNode = {
  id: number;
  name: string;
  ip: string;
  type: TopologyDeviceType;
  tier: TopologyTier;
};

type TopologySectionProps = {
  workspaceName?: string;
};

const TIER_LABELS: { key: TopologyTier; label: string }[] = [
  { key: "internet", label: "Internet / Uplink" },
  { key: "core", label: "Core Router" },
  { key: "distribution", label: "Distribution / Switch" },
  { key: "access", label: "Access / Client Network" },
];

const SAMPLE_NODES: TopologyNode[] = [
  {
    id: 1,
    name: "Upstream ISP",
    ip: "0.0.0.0",
    type: "router",
    tier: "internet",
  },
  {
    id: 2,
    name: "Router Kantor Pusat",
    ip: "10.0.0.1",
    type: "router",
    tier: "core",
  },
  {
    id: 3,
    name: "Switch Lantai 1",
    ip: "10.0.1.2",
    type: "switch",
    tier: "distribution",
  },
  {
    id: 4,
    name: "Client VLAN 10",
    ip: "10.0.10.1",
    type: "client",
    tier: "access",
  },
];

const renderNodeIcon = (deviceType: TopologyDeviceType) => {
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

const TopologySection: React.FC<TopologySectionProps> = ({ workspaceName }) => {
  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4">
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Topology {workspaceName ? `- ${workspaceName}` : ""}
        </h2>
        <p className="m-0 text-[12px] text-slate-500">
          Gambaran topologi jaringan per layer (Internet, Core, Distribution,
          Access). Saat ini masih contoh statis; nanti bisa dihubungkan dengan
          data dari Devices dan backend.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-900/5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="m-0 text-[13px] font-semibold text-slate-900">
            Canvas topologi (contoh)
          </h3>
          <p className="m-0 text-[11px] text-slate-500">
            Visual grid sederhana, nanti bisa dikembangkan jadi drag & drop.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-[11px]">
          {TIER_LABELS.map((tierInfo) => {
            const tierDevices = SAMPLE_NODES.filter(
              (d) => d.tier === tierInfo.key
            );
            return (
              <div
                key={tierInfo.key}
                className="relative rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <div className="mb-1 flex items-center gap-2 text-slate-500">
                  <span className="h-5 w-0.5 rounded-full bg-slate-300" />
                  <span className="font-semibold uppercase tracking-[0.06em]">
                    {tierInfo.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pl-3">
                  {tierDevices.length === 0 && (
                    <span className="text-slate-400">
                      Belum ada perangkat di layer ini.
                    </span>
                  )}
                  {tierDevices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
                    >
                      {renderNodeIcon(d.type)}
                      <div>
                        <div className="text-[11px] font-semibold text-slate-900">
                          {d.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{d.ip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TopologySection;
