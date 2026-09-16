import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { INDEXER_URL, getJson } from '../../api.js';

export default function KnowledgeFabric() {
  const { activeApp, scene } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);

  const dragNodeRef = useRef(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (activeApp && scene === 'fabric') {
      fetchGraph();
    }
  }, [activeApp, scene]);

  async function fetchGraph() {
    setLoading(true);
    try {
      const d = await getJson(`${INDEXER_URL}/apps/${activeApp.app_id}/graph`);
      const nodes = (d.nodes || []).map((n, idx) => ({
        ...n,
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        vx: 0,
        vy: 0,
        radius: n.label === 'Repo' ? 14 : n.label === 'Library' ? 10 : 8
      }));
      setGraphData({ nodes, links: d.links || [] });
      setSelectedNode(null);
      setHoveredNode(null);
    } catch (e) {
      console.error("Failed to load graph data:", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height || 500
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (scene !== 'fabric' || graphData.nodes.length === 0) return;

    let animId;
    const nodes = [...graphData.nodes];
    const links = [...graphData.links];

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const resolvedLinks = links.map(l => ({
      ...l,
      sourceNode: nodeMap.get(l.source),
      targetNode: nodeMap.get(l.target)
    })).filter(l => l.sourceNode && l.targetNode);

    const kRepel = 220;
    const kAttract = 0.045;
    const kGravity = 0.015;
    const damping = 0.88;

    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          if (dist < 400) {
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      resolvedLinks.forEach(l => {
        const n1 = l.sourceNode;
        const n2 = l.targetNode;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetLen = 65;
        const diff = dist - targetLen;
        const force = diff * kAttract;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        n1.vx += fx;
        n1.vy += fy;
        n2.vx -= fx;
        n2.vy -= fy;
      });

      nodes.forEach(n => {
        n.vx -= n.x * kGravity;
        n.vy -= n.y * kGravity;
      });

      nodes.forEach(n => {
        if (dragNodeRef.current && dragNodeRef.current.id === n.id) {
          n.vx = 0;
          n.vy = 0;
        } else {
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= damping;
          n.vy *= damping;
        }
      });

      draw();
      animId = requestAnimationFrame(tick);
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      resolvedLinks.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(l.sourceNode.x, l.sourceNode.y);
        ctx.lineTo(l.targetNode.x, l.targetNode.y);
        ctx.strokeStyle = l.type === 'IMPORTS' ? 'rgba(0, 180, 255, 0.25)' : 'rgba(255, 140, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      nodes.forEach(n => {
        let color = '#4cc9f0'; 
        if (n.label === 'Repo') color = '#7209b7'; 
        else if (n.label === 'Discrepancy') color = '#ff6b6b';
        else if (n.label === 'Verified') color = '#2ecc71';
        else if (n.label === 'SME') color = '#fcc419';
        else if (n.label === 'Network') color = '#20c997';
        else if (n.label === 'Library') color = '#f77f00';

        // Bloom Radial Glow
        const grad = ctx.createRadialGradient(n.x, n.y, n.radius * 0.4, n.x, n.y, n.radius * 2.4);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2.4, 0, 2 * Math.PI);
        ctx.fill();

        // Node Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;

        const isHovered = hoveredNode && hoveredNode.id === n.id;
        const isSelected = selectedNode && selectedNode.id === n.id;
        
        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (isHovered) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fill();

        if (n.label === 'Repo' || n.label === 'Discrepancy' || isHovered || isSelected) {
          ctx.fillStyle = '#ffffff';
          ctx.font = isHovered || isSelected ? 'bold 11px sans-serif' : '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.name, n.x, n.y - n.radius - 6);
        }
      });

      ctx.restore();
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [graphData, hoveredNode, selectedNode, dimensions, pan, zoom, scene]);

  function getMouseCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - dimensions.width / 2;
    const my = e.clientY - rect.top - dimensions.height / 2;
    return {
      x: (mx - pan.x) / zoom,
      y: (my - pan.y) / zoom
    };
  }

  function handleMouseDown(e) {
    const coords = getMouseCoords(e);
    const clicked = graphData.nodes.find(n => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return dx * dx + dy * dy < n.radius * n.radius * 1.5;
    });

    if (clicked) {
      dragNodeRef.current = clicked;
      setSelectedNode(clicked);
    } else {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }

  function handleMouseMove(e) {
    if (dragNodeRef.current) {
      const coords = getMouseCoords(e);
      dragNodeRef.current.x = coords.x;
      dragNodeRef.current.y = coords.y;
    } else if (isPanningRef.current) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      });
    } else {
      const coords = getMouseCoords(e);
      const hovered = graphData.nodes.find(n => {
        const dx = n.x - coords.x;
        const dy = n.y - coords.y;
        return dx * dx + dy * dy < n.radius * n.radius * 1.5;
      });
      setHoveredNode(hovered || null);
    }
  }

  function handleMouseUp() {
    dragNodeRef.current = null;
    isPanningRef.current = false;
  }

  function handleWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(z => Math.max(0.2, Math.min(4.0, z * factor)));
  }

  function resetView() {
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
    setSelectedNode(null);
  }

  const incomingCount = selectedNode
    ? graphData.links.filter(l => l.target === selectedNode.id).length
    : 0;
  const outgoingCount = selectedNode
    ? graphData.links.filter(l => l.source === selectedNode.id).length
    : 0;

  return (
    <div className={`scene ${scene === 'fabric' ? 'active' : ''}`} style={{ height: 'calc(100vh - 140px)', display: scene === 'fabric' ? 'flex' : 'none', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <h1>Knowledge Fabric</h1>
          <div className="sdesc">Interactive dependency mapping & GraphRAG schema visualizer (Bloom effect)</div>
        </div>
        <button className="btn bs" onClick={resetView} style={{ padding: '6px 12px', fontSize: 11 }}>Reset View</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <div className="sp" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
        <div ref={containerRef} style={{ display: 'flex', flex: 1, position: 'relative', background: '#0a0c10', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--bd)' }}>
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ display: 'block', cursor: dragNodeRef.current ? 'grabbing' : 'grab' }}
          />

          <div style={{
            position: 'absolute',
            left: 15,
            top: 15,
            background: 'rgba(13, 17, 23, 0.88)',
            padding: 10,
            borderRadius: 6,
            border: '1px solid var(--bd)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend &amp; Bloom Topology</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7209b7' }} />
              <span>Project Root ({graphData.nodes.filter(n=>n.label==='Repo').length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b6b' }} />
              <span style={{ color: '#ff6b6b', fontWeight: 600 }}>Ghost / Discrepancy ({graphData.nodes.filter(n=>n.label==='Discrepancy').length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2ecc71' }} />
              <span style={{ color: '#2ecc71', fontWeight: 600 }}>Verified Ground Truth ({graphData.nodes.filter(n=>n.label==='Verified').length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4cc9f0' }} />
              <span>Files / Compute ({graphData.nodes.filter(n=>n.label==='File').length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#20c997' }} />
              <span>Network / Towers ({graphData.nodes.filter(n=>n.label==='Network').length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fcc419' }} />
              <span>SMEs &amp; Signoffs ({graphData.nodes.filter(n=>n.label==='SME').length})</span>
            </div>
          </div>

          {selectedNode && (
            <div style={{
              position: 'absolute',
              right: 15,
              top: 15,
              bottom: 15,
              width: 280,
              background: 'rgba(13, 17, 23, 0.94)',
              border: '1px solid var(--bd)',
              borderRadius: 8,
              padding: 15,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="badge bgr" style={{
                  background: selectedNode.label === 'Repo' ? 'rgba(114, 9, 183, 0.2)' : selectedNode.label === 'Library' ? 'rgba(247, 127, 0, 0.2)' : 'rgba(76, 201, 240, 0.2)',
                  color: selectedNode.label === 'Repo' ? '#b5179e' : selectedNode.label === 'Library' ? '#f77f00' : '#4cc9f0',
                  border: 'none',
                  fontSize: 10
                }}>{selectedNode.label}</span>
                <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', wordBreak: 'break-all', marginBottom: 15 }}>
                {selectedNode.name}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12, flex: 1, overflowY: 'auto' }}>
                {selectedNode.path && (
                  <div>
                    <div style={{ color: 'var(--mu)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>File Path</div>
                    <div style={{ fontFamily: 'monospace', background: 'var(--sf2)', padding: '4px 8px', borderRadius: 4, wordBreak: 'break-all' }}>
                      {selectedNode.path}
                    </div>
                  </div>
                )}

                {selectedNode.url && (
                  <div>
                    <div style={{ color: 'var(--mu)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Repository URL</div>
                    <a href={selectedNode.url} target="_blank" rel="noreferrer" style={{ color: 'var(--bl)', textDecoration: 'none', wordBreak: 'break-all' }}>
                      {selectedNode.url}
                    </a>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid var(--bd)', paddingTop: 12 }}>
                  <div>
                    <div style={{ color: 'var(--mu)', fontSize: 9, textTransform: 'uppercase' }}>Imports / Links</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 2 }}>{outgoingCount}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--mu)', fontSize: 9, textTransform: 'uppercase' }}>Imported By</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 2 }}>{incomingCount}</div>
                  </div>
                </div>

                {selectedNode.label === 'File' && (
                  <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 12 }}>
                    <div style={{ color: 'var(--mu)', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Imports (Outgoing)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {graphData.links.filter(l => l.source === selectedNode.id).map((l, idx) => {
                        const targetNode = graphData.nodes.find(n => n.id === l.target);
                        return targetNode ? (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: 'var(--sf2)', borderRadius: 4, fontSize: 11 }}>
                            <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }} title={targetNode.name}>{targetNode.name}</span>
                            <span style={{ fontSize: 9, color: 'var(--mu)' }}>{l.type}</span>
                          </div>
                        ) : null;
                      })}
                      {outgoingCount === 0 && <span style={{ fontStyle: 'italic', color: 'var(--mu)' }}>No outgoing imports</span>}
                    </div>
                  </div>
                )}

                {selectedNode.label === 'File' && (
                  <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 12, marginBottom: 15 }}>
                    <div style={{ color: 'var(--mu)', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>Imported By (Incoming)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {graphData.links.filter(l => l.target === selectedNode.id).map((l, idx) => {
                        const sourceNode = graphData.nodes.find(n => n.id === l.source);
                        return sourceNode ? (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: 'var(--sf2)', borderRadius: 4, fontSize: 11 }}>
                            <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }} title={sourceNode.name}>{sourceNode.name}</span>
                            <span style={{ fontSize: 9, color: 'var(--mu)' }}>{l.type}</span>
                          </div>
                        ) : null;
                      })}
                      {incomingCount === 0 && <span style={{ fontStyle: 'italic', color: 'var(--mu)' }}>No incoming imports</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
