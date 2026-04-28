import React, { useState, useCallback, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  Handle,
  Position,
  getBezierPath,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

type TopologySectionProps = {
  workspaceName?: string;
  workspaceId?: number;
};

type Device = {
  id: number;
  name: string;
  ip: string;
  type: string;
};

type TopologyLayout = {
  id: number;
  workspaceId: number;
  name: string;
  createdAt: string;
};

const NODE_TYPES_LIST = [
  { type: 'router', label: 'Router', icon: '🌐', color: 'bg-emerald-500' },
  { type: 'switch', label: 'Switch', icon: '🔌', color: 'bg-slate-600' },
  { type: 'ap', label: 'Wireless AP', icon: '📶', color: 'bg-cyan-500' },
  { type: 'server', label: 'Server', icon: '🖥️', color: 'bg-purple-600' },
  { type: 'client', label: 'Client / PC', icon: '💻', color: 'bg-blue-500' },
];

const VENDORS_LIST = [
  { id: 'generic', label: 'Generic / Default', color: 'bg-slate-500', hex: '#64748b' },
  { id: 'mikrotik', label: 'MikroTik', color: 'bg-sky-500', hex: '#0ea5e9' },
  { id: 'ubiquiti', label: 'Ubiquiti', color: 'bg-blue-600', hex: '#2563eb' },
  { id: 'cisco', label: 'Cisco', color: 'bg-indigo-600', hex: '#4f46e5' },
  { id: 'fortigate', label: 'Fortigate', color: 'bg-orange-600', hex: '#ea580c' },
  { id: 'proxmox', label: 'Proxmox', color: 'bg-amber-600', hex: '#d97706' },
  { id: 'ruijie', label: 'Ruijie', color: 'bg-red-600', hex: '#dc2626' },
  { id: 'tplink', label: 'TP-Link', color: 'bg-teal-600', hex: '#0d9488' },
];

const LINK_TYPES = [
  { type: 'ethernet', label: 'Ethernet', color: '#22d3ee', strokeDasharray: '0' },
  { type: 'vpn', label: 'VPN', color: '#a855f7', strokeDasharray: '5,5' },
  { type: 'wifi', label: 'Wireless', color: '#f59e0b', strokeDasharray: '2,2' },
  { type: 'vlan', label: 'VLAN', color: '#84cc16', strokeDasharray: '8,4' },
  { type: 'other', label: 'Other', color: '#94a3b8', strokeDasharray: '0' },
];

const DEVICE_SVGS: Record<string, React.ReactNode> = {
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
  )
};

const CustomDeviceNode = ({ data }: { data: any }) => {
  const nodeConfig = NODE_TYPES_LIST.find(t => t.type === data.nodeType) || NODE_TYPES_LIST[0];
  const vendorConfig = VENDORS_LIST.find(v => v.id === data.vendor) || VENDORS_LIST[0];
  const svgIcon = DEVICE_SVGS[nodeConfig.type] || DEVICE_SVGS['router'];

  return (
    <div className={`flex flex-col items-center justify-center min-w-[100px] group transition-all`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-400" />

      <div className={`relative flex items-center justify-center transition-transform group-hover:scale-110`}>
        {/* Glow effect based on vendor color (Always visible) */}
        <div className={`absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity ${vendorConfig.color}`}></div>
        <div className={`relative p-3 rounded-2xl shadow-2xl transition-all ${vendorConfig.color} border-2 border-white/20 flex items-center justify-center`}>
          <div className="w-[45px] h-[45px] flex items-center justify-center brightness-0 invert opacity-90">
            {svgIcon}
          </div>
        </div>

        {data.deviceId && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse" title="Terkoneksi ke Monitoring">
            <span className="text-[8px] text-white">✓</span>
          </div>
        )}
      </div>

      <div className="mt-1 flex flex-col items-center">
        <div
          className="text-[11px] font-bold text-[var(--text-main-primary)] bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border shadow-lg backdrop-blur-sm px-2.5 py-0.5 rounded-full whitespace-nowrap text-center max-w-[130px] truncate"
          style={{ borderColor: vendorConfig.hex }}
        >
          {data.deviceName || data.label}
        </div>
        <div className="text-[8px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
          {vendorConfig.label}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-400" />
    </div>
  );
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  label,
  markerEnd,
  animated,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const linkConfig = LINK_TYPES.find(l => l.type === data?.linkType) || LINK_TYPES[0];

  // Jika dianimasikan, pastikan ada pattern agar 'gerak' terlihat
  const finalDashArray = animated
    ? (linkConfig.strokeDasharray === '0' ? '15,5' : linkConfig.strokeDasharray)
    : linkConfig.strokeDasharray;

  const edgeStyle = {
    ...style,
    stroke: data?.linkType ? linkConfig.color : '#94a3b8',
    strokeWidth: 2,
    strokeDasharray: finalDashArray,
  };

  return (
    <>
      {/* Path interaksi (lebih tebal tapi transparan) agar mudah diklik */}
      <path
        id={`${id}-interaction`}
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      <path
        id={id}
        style={edgeStyle}
        className={`react-flow__edge-path transition-all duration-300 cursor-pointer hover:stroke-white/50 ${animated ? 'topology-edge-animated' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
      />
      {label && (
        <g transform={`translate(${labelX - 40}, ${labelY - 10})`}>
          <rect width="80" height="20" rx="10" fill="var(--card-main-bg)" className="shadow-sm border border-[var(--border-main)]" />
          <text
            x="40"
            y="14"
            textAnchor="middle"
            className="text-[9px] font-bold fill-[var(--text-main-primary)] uppercase tracking-wider"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
};

const nodeTypes = {
  customDevice: CustomDeviceNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};



const TopologySection: React.FC<TopologySectionProps> = ({ workspaceName, workspaceId }) => {
  // State for layout directory
  const [layouts, setLayouts] = useState<TopologyLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState<TopologyLayout | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);

  // State for ReactFlow Canvas
  const { notify } = useNotification();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; variant?: "danger" | "warning" | "info";
    isLoading?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });
  const showConfirm = (opts: Omit<typeof confirmDialog, "isOpen" | "isLoading">) =>
    setConfirmDialog({ ...opts, isOpen: true, isLoading: false });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  // Legend Drag & Expand State
  const [legendPos, setLegendPos] = useState({ x: 20, y: window.innerHeight - 320 });
  const [isDraggingLegend, setIsDraggingLegend] = useState(false);
  const [legendDragOffset, setLegendDragOffset] = useState({ x: 0, y: 0 });
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);

  // Add Device Dropdown State
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Handle global drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingLegend) {
        let newX = e.clientX - legendDragOffset.x;
        let newY = e.clientY - legendDragOffset.y;
        newX = Math.max(10, Math.min(newX, window.innerWidth - 450));
        newY = Math.max(10, Math.min(newY, window.innerHeight - 100));
        setLegendPos({ x: newX, y: newY });
      }
    };
    const onMouseUp = () => {
      setIsDraggingLegend(false);
    };

    if (isDraggingLegend) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingLegend, legendDragOffset]);

  const onLegendMouseDown = (e: React.MouseEvent) => {
    setIsDraggingLegend(true);
    setLegendDragOffset({
      x: e.clientX - legendPos.x,
      y: e.clientY - legendPos.y
    });
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'customEdge', data: { linkType: 'ethernet' }, animated: true }, eds)),
    [setEdges]
  );

  // Fetch Layouts
  const fetchLayouts = async () => {
    if (!workspaceId) return;
    setIsLoadingLayouts(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/topology-layouts`);
      if (res.ok) {
        setLayouts(await res.json());
      }
    } catch (err) {
      console.error("fetch layouts error", err);
    } finally {
      setIsLoadingLayouts(false);
    }
  };

  useEffect(() => {
    if (workspaceId) fetchLayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Create Layout
  const handleCreateLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newLayoutName.trim()) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/topology-layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLayoutName.trim() })
      });
      if (res.ok) {
        setNewLayoutName("");
        setShowCreateModal(false);
        fetchLayouts();
        notify("Peta topologi baru berhasil dibuat!", "success");
      } else {
        notify("Gagal membuat peta topologi.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLayout = (layoutId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: "Hapus Peta Topologi",
      message: "Apakah Anda yakin ingin menghapus peta topologi ini? Semua node dan koneksi di dalamnya juga akan terhapus.",
      confirmLabel: "Hapus Peta",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/workspaces/${workspaceId}/topology-layouts/${layoutId}`, { method: 'DELETE' });
          if (res.ok) {
            fetchLayouts();
            notify("Peta topologi berhasil dihapus.", "success");
          } else {
            notify("Gagal menghapus peta topologi.", "error");
          }
        } catch (err) { console.error(err); }
        finally { closeConfirm(); }
      },
    });
  };

  // Fetch Canvas Data
  const fetchCanvasData = async () => {
    if (!workspaceId || !activeLayout) return;
    setIsLoadingCanvas(true);
    try {
      const [topoRes, devRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/topology-layouts/${activeLayout.id}/data`),
        fetch(`/api/devices?workspaceId=${workspaceId}`)
      ]);

      let fetchedDevices: Device[] = [];
      if (devRes.ok) {
        fetchedDevices = await devRes.json();
        setDevices(fetchedDevices);
      }

      if (topoRes.ok) {
        const data = await topoRes.json();
        if (data.nodes) {
          setNodes(data.nodes.map((n: any) => {
            const dev = fetchedDevices.find((d: Device) => d.id === n.deviceId);
            return {
              id: n.id,
              type: 'customDevice',
              position: { x: n.x, y: n.y },
              data: {
                label: n.label,
                deviceId: n.deviceId,
                nodeType: n.type,
                vendor: n.vendor || 'generic',
                deviceName: dev ? dev.name : null
              },
            };
          }));
        } else {
          setNodes([]);
        }
        if (data.edges) {
          setEdges(data.edges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            type: 'customEdge',
            data: { linkType: e.linkType || 'ethernet' },
            animated: e.animated !== undefined ? e.animated : true,
            style: { stroke: '#94a3b8' }
          })));
        } else {
          setEdges([]);
        }
      }
    } catch (err) {
      console.error("fetch canvas error", err);
    } finally {
      setIsLoadingCanvas(false);
    }
  };

  useEffect(() => {
    if (activeLayout) {
      fetchCanvasData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayout]);

  const onSaveCanvas = async () => {
    if (!workspaceId || !activeLayout) return;
    setIsSaving(true);
    try {
      const payload = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.nodeType || 'router',
          label: n.data.label,
          x: n.position.x,
          y: n.position.y,
          deviceId: n.data.deviceId || null,
          vendor: n.data.vendor || 'generic'
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || "",
          linkType: e.data?.linkType || 'ethernet',
          animated: e.animated || false
        }))
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/topology-layouts/${activeLayout.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        notify("Topologi berhasil disimpan ke database!", "success");
        setSaveStatus("Tersimpan!");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        notify("Gagal menyimpan data topologi.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'customDevice',
      position: { x: Math.random() * 400 + 50, y: Math.random() * 400 + 50 },
      data: {
        label,
        nodeType: type,
        vendor: 'generic',
        deviceId: null
      },
    };
    setNodes((nds) => nds.concat(newNode));
    // Otomatis buka editor untuk menentukan vendor
    setEditingNode(newNode);
  };

  const onNodeClick = (_: any, node: Node) => setEditingNode(node);
  const onEdgeClick = (_: any, edge: Edge) => setEditingEdge(edge);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    setEditingNode(null);
  };

  // View: Directory (List Layouts)
  if (!activeLayout) {
    return (
      <section className="animate-fade-in">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="m-0 mb-1 text-[22px] font-bold text-[var(--text-main-primary)]">
              🗺️ Proyek Topologi {workspaceName ? `- ${workspaceName}` : ""}
            </h2>
            <p className="m-0 text-[13px] text-[var(--text-main-secondary)]">
              Kelola dan gambar berbagai versi arsitektur jaringan untuk workspace ini.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Buat Peta Baru
          </button>
        </header>

        {isLoadingLayouts ? (
          <div className="flex items-center justify-center h-40 text-[var(--text-main-secondary)]">Memuat peta...</div>
        ) : layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg rounded-3xl border border-dashed border-[var(--border-main)]">
            <div className="text-4xl mb-4 opacity-50">🧭</div>
            <h3 className="text-lg font-bold text-[var(--text-main-primary)] m-0 mb-1">Belum Ada Peta Topologi</h3>
            <p className="text-[13px] text-[var(--text-main-secondary)] max-w-sm text-center mb-6">
              Mulai dokumentasikan desain arsitektur jaringan Anda dengan membuat peta pertama.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] hover:bg-[var(--border-main)] text-[var(--text-main-primary)] text-[13px] font-semibold transition-colors"
            >
              Buat Peta Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {layouts.map(layout => (
              <div
                key={layout.id}
                onClick={() => setActiveLayout(layout)}
                className="group relative bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg rounded-3xl p-5 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-400 transition-all cursor-pointer flex flex-col h-48"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center border border-[var(--border-main)] group-hover:scale-110 transition-transform">
                    🗺️
                  </div>
                  <button
                    onClick={(e) => handleDeleteLayout(layout.id, e)}
                    className="w-8 h-8 rounded-full text-[var(--text-main-secondary)] hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus Peta"
                  >
                    🗑️
                  </button>
                </div>
                <h3 className="mt-auto m-0 text-lg font-bold text-[var(--text-main-primary)] line-clamp-2">
                  {layout.name}
                </h3>
                <p className="m-0 mt-2 text-[11px] text-[var(--text-main-secondary)] font-medium">
                  Bergabung sejak: {new Date(layout.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Modal Create Layout */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg p-6 shadow-2xl animate-fade-in">
              <h3 className="m-0 mb-4 text-[18px] font-bold text-[var(--text-main-primary)]">Buat Peta Topologi Baru</h3>
              <form onSubmit={handleCreateLayout}>
                <label className="block text-[12px] font-medium text-[var(--text-main-secondary)] mb-1.5">
                  Nama Peta
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Misal: Topologi Core, Distribusi Area B..."
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 mb-6 bg-[var(--bg-main)] text-[var(--text-main-primary)]"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setNewLayoutName(""); }}
                    className="px-4 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] hover:bg-[var(--border-main)] text-[var(--text-main-secondary)] text-[13px] font-semibold transition-colors shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!newLayoutName.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    🚀 Buat Peta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  // View: Canvas Editor
  return (
    <section className="h-[calc(100vh-120px)] flex flex-col animate-fade-in">
      <style>{`
        @keyframes dashdraw {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .topology-edge-animated {
          stroke-dasharray: inherit;
          animation: dashdraw 50s linear infinite;
        }
        .react-flow__edge-interaction:hover + .react-flow__edge-path {
          stroke-width: 4px;
          stroke-opacity: 0.8;
        }
      `}</style>
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveLayout(null)}
            className="w-10 h-10 rounded-full bg-[var(--bg-main)] hover:bg-[var(--border-main)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-main-secondary)] transition-colors cursor-pointer"
            title="Selesai / Kembali"
          >
            ←
          </button>
          <div>
            <h2 className="m-0 mb-1 text-[20px] font-bold text-[var(--text-main-primary)]">
              {activeLayout.name}
            </h2>
            <p className="m-0 text-[12px] text-[var(--text-main-secondary)]">
              Tarik dari panel kiri untuk menambah, klik perangkat untuk edit, seret garis antar bulatan.
            </p>
            {/* Add Device Dropdown instead of toolbar */}
            <div className="relative mt-3">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[12px] font-bold transition-all border border-indigo-100 shadow-sm active:scale-95 cursor-pointer"
              >
                <span className="text-lg">+</span>
                <span>Tambah Elemen Baru</span>
                <span className={`transition-transform duration-300 ${showAddDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showAddDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setShowAddDropdown(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-2 w-52 bg-[var(--card-main-bg)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-[70] overflow-hidden animate-fade-in p-2">
                    {NODE_TYPES_LIST.map((t) => (
                      <button
                        key={t.type}
                        onClick={() => {
                          addNode(t.type, t.label);
                          setShowAddDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-main)] transition-colors group text-left cursor-pointer"
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] ${t.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                          {t.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-[var(--text-main-primary)]">{t.label}</span>
                          <span className="text-[10px] text-[var(--text-main-secondary)]">Klik untuk tambah</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-[12px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full animate-pulse">
              ✔ {saveStatus}
            </span>
          )}
          <button
            onClick={onSaveCanvas}
            disabled={isSaving || isLoadingCanvas}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan Perangkat"}
          </button>
        </div>
      </header>

      <div className="flex-1 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-main)]/50 overflow-hidden shadow-inner relative flex">
        {isLoadingCanvas && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg backdrop-blur-sm">
            <span className="text-[var(--text-main-secondary)] font-medium">Memuat elemen topologi...</span>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background color="var(--text-main-secondary)" gap={20} />
          <Controls />
          <MiniMap nodeStrokeColor={(n) => (n.type === 'input' ? '#0041d0' : 'var(--text-main-secondary)')} />


        </ReactFlow>

        {/* Topology Legend Draggable Panel */}
        <div
          className={`absolute z-[10] bg-[var(--card-main-bg)]/95 backdrop-blur-md rounded-2xl border border-[var(--border-main)] shadow-2xl overflow-hidden transition-all duration-300 select-none ${isLegendExpanded ? "w-[420px]" : "w-14"}`}
          style={{ left: legendPos.x, top: legendPos.y }}
        >
          <div
            className="px-3 py-2 bg-[var(--bg-main)]/50 border-b border-[var(--border-main)] flex items-center justify-between cursor-move group"
            onMouseDown={onLegendMouseDown}
          >
            {isLegendExpanded ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">📋</span>
                <span className="text-[11px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest group-hover:text-[var(--text-main-primary)] transition-colors">Legend Topologi</span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-[var(--text-main-secondary)] group-hover:text-[var(--text-main-secondary)] w-full text-center">📋</span>
            )}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="text-[var(--text-main-secondary)] hover:text-[var(--text-main-primary)] hover:bg-[var(--bg-main)] rounded px-1.5 py-0.5 ml-auto transition-colors cursor-pointer"
            >
              {isLegendExpanded ? "−" : "＋"}
            </button>
          </div>

          <div className={`p-4 grid grid-cols-2 gap-x-6 gap-y-4 ${isLegendExpanded ? "block" : "hidden"}`}>
            {/* Vendor Section */}
            <div>
              <h5 className="m-0 mb-2 text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Vendor / Brand Color</h5>
              <div className="grid grid-cols-2 gap-1.5">
                {VENDORS_LIST.map(v => (
                  <div key={v.id} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${v.color}`}></div>
                    <span className="text-[11px] font-medium text-[var(--text-main-primary)]">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interface Section */}
            <div className="flex flex-col gap-4">
              <div>
                <h5 className="m-0 mb-2 text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Interface / Link</h5>
                <div className="grid grid-cols-1 gap-y-2">
                  {LINK_TYPES.map(l => (
                    <div key={l.type} className="flex items-center gap-2">
                      <div className="flex flex-col items-center justify-center w-8">
                        <div className="w-full h-[2px]" style={{ backgroundColor: l.color, borderBottom: l.strokeDasharray !== '0' ? `2px dashed ${l.color}` : 'none', height: l.strokeDasharray !== '0' ? '0' : '2px' }}></div>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-main-primary)]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <h5 className="m-0 mb-1.5 text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Status</h5>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[11px] font-medium text-[var(--text-main-primary)]">UP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <span className="text-[11px] font-medium text-[var(--text-main-primary)]">DOWN</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="m-0 mb-1.5 text-[10px] font-bold text-[var(--text-main-secondary)] uppercase tracking-widest">Controls</h5>
                  <div className="text-[9px] text-[var(--text-main-secondary)] leading-relaxed">
                    Scroll = Zoom<br />
                    Drag = Pan<br />
                    Click = Edit
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>




        {/* Node Editor Modal Component */}
        {editingNode && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[320px] rounded-3xl bg-[var(--card-main-bg)] transition-all duration-300 border border-[var(--border-main)] shadow-2xl p-5 animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center border border-orange-200 text-[12px]">
                    ⚙️
                  </div>
                  <h3 className="m-0 text-[14px] font-bold text-[var(--text-main-primary)]">Edit Perangkat</h3>
                </div>
                <button onClick={() => setEditingNode(null)} className="w-7 h-7 rounded-full border border-[var(--border-main)] flex items-center justify-center hover:bg-[var(--bg-main)] cursor-pointer text-[12px] font-bold transition-colors">✕</button>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] mb-1 uppercase tracking-wide">Nama / Label</label>
                  <input
                    type="text"
                    value={editingNode.data.label}
                    onChange={(e) => setEditingNode({ ...editingNode, data: { ...editingNode.data, label: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-main)] text-[12px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 bg-[var(--bg-main)] text-[var(--text-main-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] mb-1 uppercase tracking-wide">Brand / Vendor</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {VENDORS_LIST.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setEditingNode({ ...editingNode, data: { ...editingNode.data, vendor: v.id } })}
                        className={`w-full py-1.5 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${editingNode.data.vendor === v.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-[var(--border-main)] hover:border-indigo-300 bg-[var(--bg-main)]'}`}
                        title={v.label}
                      >
                        <div className={`w-3 h-3 rounded-full ${v.color}`}></div>
                        <span className="text-[7px] font-bold text-center truncate w-full px-0.5">{v.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] mb-1 uppercase tracking-wide">🔗 Tautan Perangkat</label>
                  <select
                    value={editingNode.data.deviceId || ""}
                    onChange={(e) => setEditingNode({ ...editingNode, data: { ...editingNode.data, deviceId: e.target.value ? Number(e.target.value) : null } })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-main)] text-[12px] font-medium outline-none bg-[var(--bg-main)] focus:ring-2 focus:ring-blue-500/20 text-[var(--text-main-primary)]"
                  >
                    <option value="">-- Tidak Ada --</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-main)]">
                  <button
                    onClick={() => {
                      setNodes(nds => nds.filter(n => n.id !== editingNode.id));
                      setEditingNode(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-bold transition-colors border border-red-100"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => {
                      const dev = devices.find(d => d.id === editingNode.data.deviceId);
                      updateNodeData(editingNode.id, {
                        ...editingNode.data,
                        deviceName: dev ? dev.name : null
                      });
                    }}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-[12px] font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingEdge && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[320px] rounded-3xl bg-[var(--card-main-bg)] transition-all duration-300 border border-[var(--border-main)] shadow-2xl p-5 animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center border border-indigo-200 text-[12px]">
                    🔗
                  </div>
                  <h3 className="m-0 text-[14px] font-bold text-[var(--text-main-primary)]">Edit Koneksi</h3>
                </div>
                <button onClick={() => setEditingEdge(null)} className="w-7 h-7 rounded-full border border-[var(--border-main)] flex items-center justify-center hover:bg-[var(--bg-main)] cursor-pointer text-[12px] font-bold transition-colors">✕</button>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] mb-1 uppercase tracking-wide">Label Kabel</label>
                  <input
                    type="text"
                    value={editingEdge.label?.toString() || ""}
                    onChange={(e) => setEditingEdge({ ...editingEdge, label: e.target.value })}
                    placeholder="Contoh: sfp1-core"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-main)] text-[12px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 bg-[var(--bg-main)] text-[var(--text-main-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-main-secondary)] mb-1 uppercase tracking-wide">Jenis Koneksi</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LINK_TYPES.map(l => (
                      <button
                        key={l.type}
                        onClick={() => setEditingEdge({ ...editingEdge, data: { ...editingEdge.data, linkType: l.type } })}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-2 ${editingEdge.data?.linkType === l.type ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main-secondary)] hover:border-indigo-300'}`}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }}></div>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)]/50">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-[var(--text-main-primary)]">Animasi Aktif</span>
                    <span className="text-[10px] text-[var(--text-main-secondary)]">Garis akan mengalir</span>
                  </div>
                  <button
                    onClick={() => setEditingEdge({ ...editingEdge, animated: !editingEdge.animated })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editingEdge.animated ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingEdge.animated ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-main)]">
                  <button
                    onClick={() => {
                      setEdges(eds => eds.filter(e => e.id !== editingEdge.id));
                      setEditingEdge(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-bold transition-colors border border-red-100"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => {
                      setEdges(eds => eds.map(e => e.id === editingEdge.id ? editingEdge : e));
                      setEditingEdge(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-[12px] font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        isLoading={confirmDialog.isLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </section>
  );
};

export default TopologySection;
