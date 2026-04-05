import { useEffect, useMemo, useState } from "react";
import { fetchLinks, fetchQuerySources } from "../api/client";

function LinkAnalysisPage() {
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [selected, setSelected] = useState(null);
  const [sources, setSources] = useState([]);
  const [sourceScope, setSourceScope] = useState("latest");
  const [selectedSourceFile, setSelectedSourceFile] = useState("");
  const [maxNodes, setMaxNodes] = useState(80);
  const [minWeight, setMinWeight] = useState(2);

  useEffect(() => {
    fetchQuerySources().then((items) => { setSources(items); if (items[0]?.sourceFile) setSelectedSourceFile(items[0].sourceFile); }).catch(() => setSources([]));
  }, []);

  useEffect(() => {
    fetchLinks({ sourceScope, sourceFile: sourceScope === "file" ? selectedSourceFile : "" })
      .then((res) => { setData(res); setSelected(null); })
      .catch(() => setData({ nodes: [], edges: [] }));
  }, [sourceScope, selectedSourceFile]);

  const graphData = useMemo(() => {
    const sortedNodes = [...(data.nodes || [])].sort((a, b) => b.connections - a.connections);
    const cappedNodes = sortedNodes.slice(0, Math.max(20, maxNodes));
    const nodeIdSet = new Set(cappedNodes.map((n) => n.id));
    const allCandidateEdges = (data.edges || []).filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
    let visibleEdges = allCandidateEdges.filter((e) => e.weight >= minWeight);
    if (visibleEdges.length < 24) visibleEdges = [...allCandidateEdges].sort((a, b) => b.weight - a.weight).slice(0, 140);
    const connectedNodeIds = new Set();
    visibleEdges.forEach((e) => { connectedNodeIds.add(e.source); connectedNodeIds.add(e.target); });
    const mustKeep = new Set(cappedNodes.slice(0, 10).map((n) => n.id));
    const visibleNodes = cappedNodes.filter((n) => connectedNodeIds.has(n.id) || mustKeep.has(n.id));
    return { visibleNodes, visibleEdges };
  }, [data.nodes, data.edges, maxNodes, minWeight]);

  const positioned = useMemo(() => {
    const centerX = 360, centerY = 280, baseRadius = 120;
    const nodes = [...graphData.visibleNodes].sort((a, b) => b.connections - a.connections);
    return nodes.map((node, index) => {
      if (index === 0) return { ...node, x: centerX, y: centerY };
      const ring = Math.floor((index - 1) / 16) + 1;
      const ringRadius = baseRadius + ring * 60;
      const inRingIndex = (index - 1) % 16;
      const ringCount = Math.min(16, Math.max(1, nodes.length - 1 - (ring - 1) * 16));
      const angle = (inRingIndex / ringCount) * Math.PI * 2;
      return { ...node, x: centerX + Math.cos(angle) * ringRadius, y: centerY + Math.sin(angle) * ringRadius };
    });
  }, [graphData.visibleNodes]);

  const nodeMap = useMemo(() => { const map = new Map(); positioned.forEach((n) => map.set(n.id, n)); return map; }, [positioned]);

  const stats = useMemo(() => {
    const rawNodes = data.nodes || [], rawEdges = data.edges || [];
    const topHub = [...rawNodes].sort((a, b) => b.connections - a.connections)[0] || null;
    const topEdges = [...graphData.visibleEdges].sort((a, b) => b.weight - a.weight).slice(0, 5);
    return { rawNodes: rawNodes.length, rawEdges: rawEdges.length, visibleNodes: graphData.visibleNodes.length, visibleEdges: graphData.visibleEdges.length, foreignNodes: rawNodes.filter((n) => n.type === "foreign").length, appNodes: rawNodes.filter((n) => n.type === "app").length, topHub, topEdges };
  }, [data, graphData]);

  const selectedEdges = useMemo(() => {
    if (!selected) return [];
    return graphData.visibleEdges.filter((e) => e.source === selected.id || e.target === selected.id).sort((a, b) => b.weight - a.weight).slice(0, 10);
  }, [graphData.visibleEdges, selected]);

  const highlightNodeIds = useMemo(() => {
    if (!selected) return new Set();
    const ids = new Set([selected.id]);
    selectedEdges.forEach((e) => { ids.add(e.source); ids.add(e.target); });
    return ids;
  }, [selected, selectedEdges]);

  return (
    <section className="page">
      <header className="page-header"><h1>Communication Link Analysis</h1><p>Network view of communication relationships</p></header>
      <section className="panel panel-highlight">
        <div className="formats">
          <label>Scope:<select value={sourceScope} onChange={(e) => setSourceScope(e.target.value)} style={{ marginLeft: "0.5rem" }}><option value="latest">Latest uploaded file</option><option value="file">Specific file</option><option value="all">All records</option></select></label>
          {sourceScope === "file" && <label>File:<select value={selectedSourceFile} onChange={(e) => setSelectedSourceFile(e.target.value)} style={{ marginLeft: "0.5rem" }}>{sources.map((item) => <option key={item.sourceFile} value={item.sourceFile}>{item.sourceFile} ({item.count})</option>)}</select></label>}
        </div>
        <div className="graph-toolbar">
          <label>Visible nodes<input type="range" min="30" max="180" step="10" value={maxNodes} onChange={(e) => setMaxNodes(Number(e.target.value))} /><span>{maxNodes}</span></label>
          <label>Min edge weight<select value={minWeight} onChange={(e) => setMinWeight(Number(e.target.value))}><option value={1}>1+</option><option value={2}>2+</option><option value={3}>3+</option><option value={5}>5+</option></select></label>
        </div>
      </section>
      <section className="mini-grid">
        <article className="mini-card"><h4>Visible Nodes</h4><h2>{stats.visibleNodes}</h2><p>{stats.rawNodes} total</p></article>
        <article className="mini-card"><h4>Visible Links</h4><h2>{stats.visibleEdges}</h2><p>{stats.rawEdges} total</p></article>
        <article className="mini-card"><h4>Foreign Nodes</h4><h2>{stats.foreignNodes}</h2><p>App nodes {stats.appNodes}</p></article>
        <article className="mini-card"><h4>Top Hub</h4><h2>{stats.topHub?.label || "-"}</h2><p>{stats.topHub?.connections || 0} connections</p></article>
      </section>
      <div className="split-grid">
        <section className="panel">
          <div className="panel-header-inline">
            <h3>Network Graph</h3>
            <div className="graph-legend-inline">
              <span><i className="dot dot-local" />Local</span>
              <span><i className="dot dot-foreign" />Foreign</span>
              <span><i className="dot dot-app" />App</span>
            </div>
          </div>
          <svg className="graph" viewBox="0 0 720 560" role="img" aria-label="Link graph">
            <rect x="0" y="0" width="720" height="560" fill="#0d1117" />
            {graphData.visibleEdges.map((edge) => {
              const source = nodeMap.get(edge.source), target = nodeMap.get(edge.target);
              if (!source || !target) return null;
              const isSelectedPath = selected && (edge.source === selected.id || edge.target === selected.id);
              return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={isSelectedPath ? "#4493f8" : "#30363d"} strokeOpacity={isSelectedPath ? 0.95 : 0.42} strokeWidth={Math.min(7, 1 + edge.weight)} />;
            })}
            {positioned.map((node, idx) => {
              const isSelected = selected?.id === node.id;
              const inFocus = !selected || highlightNodeIds.has(node.id);
              const fill = node.type === "foreign" ? "#4493f8" : node.type === "app" ? "#6e7681" : "#3fb950";
              const shouldShowLabel = isSelected || idx < 12 || node.connections >= 5;
              return (
                <g key={node.id} onClick={() => setSelected(node)} style={{ cursor: "pointer" }}>
                  {isSelected && <circle cx={node.x} cy={node.y} r={Math.max(14, Math.min(42, (node.size || 16) + 7))} fill="none" stroke="#4493f8" strokeWidth="3" strokeOpacity="0.35" />}
                  <circle cx={node.x} cy={node.y} r={Math.max(8, Math.min(30, node.size || 14))} fill={fill} opacity={inFocus ? (isSelected ? 1 : 0.9) : 0.28} />
                  {shouldShowLabel && <text x={node.x} y={node.y + 42} textAnchor="middle" fontSize="11" fill="#8b949e">{node.label}</text>}
                </g>
              );
            })}
            {!positioned.length && <text x="360" y="280" textAnchor="middle" fontSize="16" fill="#7d8fa8">No linkable records. Try All records or re-upload.</text>}
          </svg>
        </section>
        <section className="panel">
          <h3>Selected Node Details</h3>
          {!selected && <p>Click a node to inspect relationships.</p>}
          {selected && (
            <div>
              <p><strong>Node:</strong> {selected.label}</p>
              <p><strong>Category:</strong> {selected.type}</p>
              <p><strong>Total Connections:</strong> {selected.connections}</p>
              <h4>Connected Edges</h4>
              <div className="edge-list">
                {!selectedEdges.length && <p>No edges found.</p>}
                {selectedEdges.map((edge) => <div key={`${edge.source}-${edge.target}`} className="edge-item"><strong>{edge.source.replace("APP:", "")}</strong><span>↔</span><strong>{edge.target.replace("APP:", "")}</strong><small>{edge.weight} interaction(s)</small></div>)}
              </div>
            </div>
          )}
          <h4 style={{ marginTop: "1rem" }}>Top Connections</h4>
          <div className="edge-list">
            {stats.topEdges.map((edge) => <div key={`top-${edge.source}-${edge.target}`} className="edge-item"><strong>{edge.source.replace("APP:", "")}</strong><span>↔</span><strong>{edge.target.replace("APP:", "")}</strong><small>{edge.weight} interaction(s)</small></div>)}
          </div>
        </section>
      </div>
    </section>
  );
}

export default LinkAnalysisPage;
