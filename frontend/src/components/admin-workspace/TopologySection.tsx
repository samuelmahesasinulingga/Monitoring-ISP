import React, { useState, useCallback, useEffect } from 'react';
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
  { type: 'router', label: 'Mikrotik / Router', icon: '📡', color: 'bg-blue-500' },
  { type: 'olt', label: 'OLT / Core Switch', icon: '🏢', color: 'bg-indigo-600' },
  { type: 'switch', label: 'Switch / Hub', icon: '🔌', color: 'bg-emerald-500' },
  { type: 'ap', label: 'Access Point', icon: '📶', color: 'bg-amber-500' },
  { type: 'client', label: 'Client / User', icon: '🏠', color: 'bg-slate-500' },
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
       <ellipse cx="50" cy="55" rx="35" ry="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2"/>
       <ellipse cx="50" cy="50" rx="35" ry="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
       <path d="M 50 50 L 50 15" stroke="#94a3b8" strokeWidth="3" />
       <circle cx="50" cy="15" r="3" fill="#3b82f6" />
       <circle cx="50" cy="50" r="3" fill="#10b981" />
    </svg>
  ),
  olt: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
       <rect x="25" y="10" width="50" height="80" fill="#1e293b" rx="2" />
       <rect x="30" y="15" width="40" height="15" fill="#334155" />
       <rect x="30" y="32" width="40" height="15" fill="#334155" />
       <rect x="30" y="49" width="40" height="15" fill="#334155" />
       <rect x="30" y="66" width="40" height="15" fill="#334155" />
       <circle cx="35" cy="22" r="2" fill="#10b981" />
       <circle cx="35" cy="39" r="2" fill="#3b82f6" />
       <circle cx="35" cy="56" r="2" fill="#f59e0b" />
    </svg>
  ),
  client: (
    <svg viewBox="0 0 100 100" className="w-[60px] h-[60px] drop-shadow-md">
       <rect x="20" y="20" width="60" height="40" fill="#cbd5e1" rx="4" />
       <rect x="24" y="24" width="52" height="32" fill="#0f172a" />
       <rect x="45" y="60" width="10" height="15" fill="#94a3b8" />
       <rect x="30" y="75" width="40" height="5" fill="#e2e8f0" rx="2" />
       <ellipse cx="50" cy="40" rx="15" ry="8" fill="#2563eb" fillOpacity="0.3" />
    </svg>
  )
};

const CustomDeviceNode = ({ data }: { data: any }) => {
  const nodeConfig = NODE_TYPES_LIST.find(t => t.type === data.nodeType) || NODE_TYPES_LIST[0];
  const svgIcon = DEVICE_SVGS[nodeConfig.type] || DEVICE_SVGS['router'];

  return (
    <div className={`flex flex-col items-center justify-center min-w-[100px] group transition-all`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-400" />
      
      <div className={`relative flex items-center justify-center transition-transform group-hover:scale-105 ${data.deviceId ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`}>
         {svgIcon}
         {data.deviceId && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full shadow-md border-2 border-white animate-pulse" title="Terkoneksi ke Monitoring"></div>
         )}
      </div>

      <div className="mt-1 flex flex-col items-center">
        <div className="text-[11px] font-bold text-slate-100 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-slate-800 shadow-sm whitespace-nowrap text-center max-w-[130px] truncate">
          {data.deviceName || data.label}
        </div>
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {nodeConfig.label.split('/')[0].trim()}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-400" />
    </div>
  );
};

const nodeTypes = {
  customDevice: CustomDeviceNode,
};

const TopologySection: React.FC<TopologySectionProps> = ({ workspaceName, workspaceId }) => {
  // State for layout directory
  const [layouts, setLayouts] = useState<TopologyLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState<TopologyLayout | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);

  // State for ReactFlow Canvas
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; variant?: "danger" | "warning" | "info";
    isLoading?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const showConfirm = (opts: Omit<typeof confirmDialog, "isOpen" | "isLoading">) =>
    setConfirmDialog({ ...opts, isOpen: true, isLoading: false });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  // Panel Drag & Expand State
  const [panelPos, setPanelPos] = useState({ x: 20, y: 20 });
  const [isDraggingNodePanel, setIsDraggingNodePanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Handle global drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingNodePanel) {
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Mencegah panel dibuang keluar layar (clamping boudaries)
        // 10px dari batas atas/kiri. Batas kanan/bawah disesuaikan kasar agar 
        // header panel setidaknya selalu bisa diklik untuk di-drag kembali.
        newX = Math.max(10, Math.min(newX, window.innerWidth - 300));
        newY = Math.max(10, Math.min(newY, window.innerHeight - 150));
        
        setPanelPos({ x: newX, y: newY });
      }
    };
    const onMouseUp = () => setIsDraggingNodePanel(false);

    if (isDraggingNodePanel) {

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingNodePanel, dragOffset]);

  const onPanelMouseDown = (e: React.MouseEvent) => {
    setIsDraggingNodePanel(true);
    setDragOffset({
      x: e.clientX - panelPos.x,
      y: e.clientY - panelPos.y
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
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8' } }, eds)),
    []
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
      } else {
        alert("Gagal membuat peta.");
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
          if (res.ok) fetchLayouts();
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
              data: { label: n.label, deviceId: n.deviceId, nodeType: n.type, deviceName: dev ? dev.name : null },
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
            animated: true,
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
          deviceId: n.data.deviceId || null
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || ""
        }))
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/topology-layouts/${activeLayout.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus("Tersimpan!");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        alert("Gagal menyimpan topologi.");
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
      data: { label, nodeType: type },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onNodeClick = (_: any, node: Node) => setEditingNode(node);

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
            <h2 className="m-0 mb-1 text-[22px] font-bold text-slate-100">
              🗺️ Proyek Topologi {workspaceName ? `- ${workspaceName}` : ""}
            </h2>
            <p className="m-0 text-[13px] text-slate-400">
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
          <div className="flex items-center justify-center h-40 text-slate-400">Memuat peta...</div>
        ) : layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg rounded-3xl border border-dashed border-slate-300">
            <div className="text-4xl mb-4 opacity-50">🧭</div>
            <h3 className="text-lg font-bold text-slate-300 m-0 mb-1">Belum Ada Peta Topologi</h3>
            <p className="text-[13px] text-slate-400 max-w-sm text-center mb-6">
              Mulai dokumentasikan desain arsitektur jaringan Anda dengan membuat peta pertama.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-[13px] font-semibold transition-colors"
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
                className="group relative bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg rounded-3xl border border-slate-800 p-5 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all cursor-pointer flex flex-col h-48"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                    🗺️
                  </div>
                  <button
                    onClick={(e) => handleDeleteLayout(layout.id, e)}
                    className="w-8 h-8 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus Peta"
                  >
                    🗑️
                  </button>
                </div>
                <h3 className="mt-auto m-0 text-lg font-bold text-slate-100 line-clamp-2">
                  {layout.name}
                </h3>
                <p className="m-0 mt-2 text-[11px] text-slate-400 font-medium">
                  Bergabung sejak: {new Date(layout.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Modal Create Layout */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg border border-slate-800 p-6 shadow-2xl animate-fade-in">
              <h3 className="m-0 mb-4 text-[18px] font-bold text-slate-100">Buat Peta Topologi Baru</h3>
              <form onSubmit={handleCreateLayout}>
                <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                  Nama Peta
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Misal: Topologi Core, Distribusi Area B..."
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 mb-6 bg-slate-800/50 text-slate-100"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setNewLayoutName(""); }}
                    className="px-4 py-2 rounded-xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg text-slate-400 text-[13px] font-semibold hover:bg-slate-800/50 transition-colors"
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
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveLayout(null)}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-200 border border-slate-800 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
            title="Selesai / Kembali"
          >
            ←
          </button>
          <div>
            <h2 className="m-0 mb-1 text-[20px] font-bold text-slate-100">
              {activeLayout.name}
            </h2>
            <p className="m-0 text-[12px] text-slate-400">
              Tarik dari panel kiri untuk menambah, klik perangkat untuk edit, seret garis antar bulatan.
            </p>
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
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-black/40 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "💾 Simpan Perubahan"}
          </button>
        </div>
      </header>

      <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-800/50 overflow-hidden shadow-inner relative flex">
        {isLoadingCanvas && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/50 backdrop-blur-sm">
            <span className="text-slate-400 font-medium">Memuat elemen topologi...</span>
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls />
          <MiniMap nodeStrokeColor={(n) => (n.type === 'input' ? '#0041d0' : '#475569')} />
          
          {/* Panel Diubah menjadi custom agar dinamis dan bisa di-drag */}
        </ReactFlow>

        {/* Floating Draggable Panel */}
        <div 
          className={`absolute z-[10] bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all duration-300 select-none ${isPanelExpanded ? "w-56" : "w-14"}`}
          style={{ left: panelPos.x, top: panelPos.y }}
        >
          {/* Header/Drag Handle */}
          <div 
            className="px-3 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between cursor-move group"
            onMouseDown={onPanelMouseDown}
          >
            {isPanelExpanded ? (
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-100 transition-colors">Elemen</span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-400">☰</span>
            )}
            <button 
              onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              className="text-slate-400 hover:text-slate-300 hover:bg-slate-200 rounded px-1.5 py-0.5 ml-auto transition-colors cursor-pointer"
            >
               {isPanelExpanded ? "−" : "＋"}
            </button>
          </div>

          {/* Expanded Body */}
          <div className={`p-3 flex flex-col gap-2 ${!isPanelExpanded ? "hidden" : "block"}`}>
            {NODE_TYPES_LIST.map((t) => (
              <button
                key={t.type}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); addNode(t.type, t.label); }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg hover:bg-slate-800/50 hover:border-slate-300 text-[12px] font-semibold text-slate-300 shadow-sm active:scale-95 transition-all text-left cursor-pointer"
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] ${t.color} text-white shadow-sm shrink-0`}>{t.icon}</span>
                <span className="flex-1 whitespace-nowrap">{t.label}</span>
                <span className="text-slate-300">+</span>
              </button>
            ))}
            <div className="mt-2 pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-medium text-center leading-relaxed">
               Gunakan ikon untuk menambah perangkat.<br/>Tarik garis antar bulatan untuk koneksi.
            </div>
          </div>
          
          {/* Minimized Body */}
          <div className={`p-2 flex flex-col gap-2 items-center ${isPanelExpanded ? "hidden" : "block"}`}>
             {NODE_TYPES_LIST.map((t) => (
                <button
                  key={t.type}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); addNode(t.type, t.label); }}
                  title={t.label}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-800 bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg hover:bg-slate-800/50 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className={`w-full h-full rounded-md flex items-center justify-center text-[11px] ${t.color} text-white shadow-sm`}>{t.icon}</span>
                </button>
             ))}
          </div>
        </div>


        {/* Node Editor Modal Component */}
        {editingNode && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#0f172a] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-800 shadow-lg border border-slate-800 p-6 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center border border-orange-200 text-orange-600">
                    ⚙️
                  </div>
                  <h3 className="m-0 text-[16px] font-bold text-slate-100">Edit Perangkat</h3>
                </div>
                <button onClick={() => setEditingNode(null)} className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center hover:bg-slate-800/50 cursor-pointer text-slate-400 font-bold transition-colors">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Nama / Label Tampil</label>
                  <input
                    type="text"
                    value={editingNode.data.label}
                    onChange={(e) => setEditingNode({...editingNode, data: {...editingNode.data, label: e.target.value}})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-[13px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-800/50 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">🔗 Tautan ke Perangkat Asli</label>
                  <select
                    value={editingNode.data.deviceId || ""}
                    onChange={(e) => setEditingNode({...editingNode, data: {...editingNode.data, deviceId: e.target.value ? Number(e.target.value) : null}})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-[13px] font-medium outline-none bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 text-slate-100"
                  >
                    <option value="">-- Tidak Ada / Abstrak --</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.ip})</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[10px] text-slate-400 font-medium">Jika dihubungkan, metrik jaringan dapat muncul secara real-time di atas node (TBA).</p>
                </div>

                <div className="flex gap-2 pt-4 mt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                        setNodes(nds => nds.filter(n => n.id !== editingNode.id));
                        setEditingNode(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[13px] font-bold transition-colors border border-red-100"
                  >
                    Hapus Node
                  </button>
                  <button
                    onClick={() => {
                       const dev = devices.find(d => d.id === editingNode.data.deviceId);
                       updateNodeData(editingNode.id, {
                         ...editingNode.data,
                         deviceName: dev ? dev.name : null
                       });
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-black/40"
                  >
                    Simpan Perubahan
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
