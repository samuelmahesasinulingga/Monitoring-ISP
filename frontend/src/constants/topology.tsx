import React from "react";

// ─────────────────────────────────────────────
// Node Types
// ─────────────────────────────────────────────
export const NODE_TYPES_LIST = [
  { type: "router",  label: "Router",      icon: "🌐", color: "bg-emerald-500" },
  { type: "switch",  label: "Switch",      icon: "🔌", color: "bg-slate-600"   },
  { type: "ap",      label: "Wireless AP", icon: "📶", color: "bg-cyan-500"    },
  { type: "server",  label: "Server",      icon: "🖥️", color: "bg-purple-600"  },
  { type: "client",  label: "Client / PC", icon: "💻", color: "bg-blue-500"    },
];

// ─────────────────────────────────────────────
// Vendor / Brand List
// ─────────────────────────────────────────────
export const VENDORS_LIST = [
  { id: "generic",   label: "Generic / Default", color: "bg-slate-500",  hex: "#64748b" },
  { id: "mikrotik",  label: "MikroTik",           color: "bg-sky-500",    hex: "#0ea5e9" },
  { id: "ubiquiti",  label: "Ubiquiti",           color: "bg-blue-600",   hex: "#2563eb" },
  { id: "cisco",     label: "Cisco",              color: "bg-indigo-600", hex: "#4f46e5" },
  { id: "fortigate", label: "Fortigate",          color: "bg-orange-600", hex: "#ea580c" },
  { id: "proxmox",   label: "Proxmox",            color: "bg-amber-600",  hex: "#d97706" },
  { id: "ruijie",    label: "Ruijie",             color: "bg-red-600",    hex: "#dc2626" },
  { id: "tplink",    label: "TP-Link",            color: "bg-teal-600",   hex: "#0d9488" },
];

// ─────────────────────────────────────────────
// Link / Edge Types
// ─────────────────────────────────────────────
export const LINK_TYPES = [
  { type: "ethernet", label: "Ethernet", color: "#22d3ee", strokeDasharray: "0"   },
  { type: "vpn",      label: "VPN",      color: "#a855f7", strokeDasharray: "5,5" },
  { type: "wifi",     label: "Wireless", color: "#f59e0b", strokeDasharray: "2,2" },
  { type: "vlan",     label: "VLAN",     color: "#84cc16", strokeDasharray: "8,4" },
  { type: "other",    label: "Other",    color: "#94a3b8", strokeDasharray: "0"   },
];

// ─────────────────────────────────────────────
// Device SVG Icons
// ─────────────────────────────────────────────
export const DEVICE_SVGS: Record<string, React.ReactNode> = {
  router: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
      <rect x="23" y="10" width="4" height="40" rx="2" fill="#1f2937" />
      <rect x="48" y="10" width="4" height="40" rx="2" fill="#1f2937" />
      <rect x="73" y="10" width="4" height="40" rx="2" fill="#1f2937" />
      <path d="M 10 55 L 90 55 C 95 55 95 60 95 65 L 95 80 C 95 85 90 85 85 85 L 15 85 C 10 85 5 85 5 80 L 5 65 C 5 60 5 55 10 55 Z" fill="#374151" />
      <rect x="15" y="65" width="6" height="6" rx="3" fill="#cbd5e1" />
      <rect x="28" y="65" width="8" height="6" fill="#0f172a" />
      <rect x="40" y="65" width="8" height="6" fill="#0f172a" />
      <rect x="52" y="65" width="8" height="6" fill="#0f172a" />
      <rect x="64" y="65" width="8" height="6" fill="#0f172a" />
      <rect x="79" y="65" width="6" height="6" rx="3" fill="#cbd5e1" />
    </svg>
  ),
  switch: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
      <rect x="5" y="40" width="90" height="25" fill="#374151" rx="2" />
      {[...Array(8)].map((_, i) => (
        <rect key={i} x={10 + i * 9} y="48" width="6" height="8" fill="#0f172a" />
      ))}
      <rect x="85" y="52" width="4" height="4" rx="2" fill="#10b981" />
    </svg>
  ),
  ap: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
      <ellipse cx="50" cy="55" rx="35" ry="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <ellipse cx="50" cy="50" rx="35" ry="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <path d="M 50 50 L 50 15" stroke="#94a3b8" strokeWidth="3" />
      <circle cx="50" cy="15" r="3" fill="#3b82f6" />
      <circle cx="50" cy="50" r="3" fill="#10b981" />
    </svg>
  ),
  client: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
      <rect x="20" y="20" width="60" height="40" fill="#cbd5e1" rx="4" />
      <rect x="24" y="24" width="52" height="32" fill="#0f172a" />
      <rect x="45" y="60" width="10" height="15" fill="#94a3b8" />
      <rect x="30" y="75" width="40" height="5" fill="#e2e8f0" rx="2" />
    </svg>
  ),
  server: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
      <rect x="20" y="10" width="60" height="80" fill="#334155" rx="4" />
      <rect x="25" y="20" width="50" height="4" fill="#1e293b" />
      <rect x="25" y="35" width="50" height="4" fill="#1e293b" />
      <rect x="25" y="50" width="50" height="4" fill="#1e293b" />
      <circle cx="35" cy="75" r="3" fill="#10b981" />
      <circle cx="50" cy="75" r="3" fill="#3b82f6" />
    </svg>
  ),
};
