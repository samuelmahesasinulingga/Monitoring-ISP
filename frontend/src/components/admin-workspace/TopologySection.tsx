import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

const NODE_TYPES_LIST = [
  { type: 'router', label: 'Mikrotik / Router', icon: '📡', color: 'bg-blue-500' },
  { type: 'olt', label: 'OLT / Core Switch', icon: '🏢', color: 'bg-indigo-600' },
  { type: 'switch', label: 'Switch / Hub', icon: '🔌', color: 'bg-emerald-500' },
  { type: 'ap', label: 'Access Point', icon: '📶', color: 'bg-amber-500' },
  { type: 'client', label: 'Client / User', icon: '🏠', color: 'bg-slate-500' },
];

const TopologySection: React.FC<TopologySectionProps> = ({ workspaceName, workspaceId }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modal State for editing node
  const [editingNode, setEditingNode] = useState<Node | null>(null);

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

  const fetchData = async () => {
    if (!workspaceId) return;
    try {
      const [topoRes, devRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/topology`),
        fetch(`/api/devices?workspaceId=${workspaceId}`)
      ]);

      if (topoRes.ok) {
        const data = await topoRes.json();
        if (data.nodes) {
          setNodes(data.nodes.map((n: any) => ({
            id: n.id,
            type: 'default',
            position: { x: n.x, y: n.y },
            data: { 
              label: n.label, 
              deviceId: n.deviceId,
              nodeType: n.type
            },
            style: { 
              background: '#fff', 
              color: '#1e293b', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px',
              padding: '10px',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              width: 150
            }
          })));
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
        }
      }

      if (devRes.ok) {
        setDevices(await devRes.json());
      }
    } catch (err) {
      console.error("fetch topology error", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const onSave = async () => {
    if (!workspaceId) return;
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

      const res = await fetch(`/api/workspaces/${workspaceId}/topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus("Topologi berhasil disimpan!");
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
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label, nodeType: type },
      style: { 
        background: '#fff', 
        color: '#1e293b', 
        border: '1px solid #e2e8f0', 
        borderRadius: '12px',
        padding: '10px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        width: 150
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onNodeClick = (_: any, node: Node) => {
    setEditingNode(node);
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
    setEditingNode(null);
  };

  return (
    <section className="h-[calc(100vh-120px)] flex flex-col">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="m-0 mb-1 text-[20px] font-bold text-slate-900">
            🗺️ Network Topology {workspaceName ? `- ${workspaceName}` : ""}
          </h2>
          <p className="m-0 text-[12px] text-slate-500">
            Klik dan tarik perangkat untuk mengatur layout. Klik perangkat untuk edit detail/link device.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-[12px] text-emerald-600 font-medium animate-pulse">
              {saveStatus}
            </span>
          )}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "💾 Simpan Layout"}
          </button>
        </div>
      </header>

      <div className="flex-1 rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-2xl relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls />
          <MiniMap nodeStrokeColor={(n) => (n.type === 'input' ? '#0041d0' : '#475569')} />
          
          <Panel position="top-left" className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xl m-4 flex flex-col gap-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tambah Perangkat</div>
            <div className="grid grid-cols-1 gap-2">
              {NODE_TYPES_LIST.map((t) => (
                <button
                  key={t.type}
                  onClick={() => addNode(t.type, t.label)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${t.color} text-white shadow-sm`}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic">
               Tarik garis antar bulatan untuk menyambung.
            </div>
          </Panel>
        </ReactFlow>

        {/* Node Editor Modal */}
        {editingNode && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="m-0 text-[16px] font-bold text-slate-900">Edit Perangkat</h3>
                <button onClick={() => setEditingNode(null)} className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 cursor-pointer">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-1">Nama / Label</label>
                  <input
                    type="text"
                    value={editingNode.data.label}
                    onChange={(e) => setEditingNode({...editingNode, data: {...editingNode.data, label: e.target.value}})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-1">Link ke Monitoring Device</label>
                  <select
                    value={editingNode.data.deviceId || ""}
                    onChange={(e) => setEditingNode({...editingNode, data: {...editingNode.data, deviceId: e.target.value ? Number(e.target.value) : null}})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Tidak Terhubung --</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.ip})</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">Hubungkan agar ikon ini bisa menampilkan status log real-time nanti.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                        setNodes(nds => nds.filter(n => n.id !== editingNode.id));
                        setEditingNode(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[13px] font-semibold hover:bg-red-100"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => updateNodeData(editingNode.id, editingNode.data)}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TopologySection;
