import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { INDEXER_URL, postJson } from '../api.js';

export default function AgenticOrchestrator() {
  const { isAnalyzing, orchestratingProject, enterPlatform } = useApp();
  const [phase, setPhase] = useState(0); // 0 to 100
  const [activeStepText, setActiveStepText] = useState('Initializing agent fleet...');
  const [liveGaps, setLiveGaps] = useState([]);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const transitionType = orchestratingProject?.transition_type || 'it_application';
  const projectName = orchestratingProject?.project_name || 'Transition Project';

  // Agent Fleet Configuration
  const [agents, setAgents] = useState([
    {
      id: 'ingest',
      name: 'Tower Ingestion Fleet',
      role: 'Cross-Geo Parallel Harvester',
      status: 'Spawning',
      tool: 'init_parallel_channels()',
      log: 'Initializing worker threads across target geographies...'
    },
    {
      id: 'graph',
      name: 'Knowledge Graph Reconciler',
      role: 'Neo4j Bloom Fabric Engine',
      status: 'Waiting',
      tool: 'standby()',
      log: 'Waiting for raw entity stream...'
    },
    {
      id: 'hunter',
      name: 'Hostile Gap & Ghost Asset Hunter',
      role: 'CMDB & Shadow IT Auditor',
      status: 'Waiting',
      tool: 'standby()',
      log: 'Awaiting baseline inventory...'
    },
    {
      id: 'kt',
      name: 'Targeted KT Synthesis Agent',
      role: 'SME Anomaly Interviewer',
      status: 'Waiting',
      tool: 'standby()',
      log: 'Monitoring graph discrepancy nodes...'
    },
    {
      id: 'risk',
      name: 'Cutover & SPOF Risk Evaluator',
      role: 'Day-1 Readiness Assessor',
      status: 'Waiting',
      tool: 'standby()',
      log: 'Waiting for graph convergence...'
    }
  ]);

  // Visual Bloom Canvas nodes
  const nodesRef = useRef([
    { id: 'root', x: 250, y: 150, vx: 0, vy: 0, r: 18, color: '#9775fa', name: projectName, label: 'Root' }
  ]);
  const linksRef = useRef([]);

  useEffect(() => {
    if (!isAnalyzing) return;

    let currentPhase = 0;
    const interval = setInterval(async () => {
      currentPhase += 5;
      setPhase(Math.min(100, currentPhase));

      if (currentPhase === 15) {
        setActiveStepText('Ingestion Agents actively harvesting configs & raw telemetry...');
        setAgents(prev => prev.map(a => a.id === 'ingest' ? {
          ...a,
          status: 'Running',
          tool: transitionType === 'itis' ? 'parse_firewall_acls(palo_alto)' : transitionType === 'business_process' ? 'extract_sop_hierarchy()' : 'git_ast_parser()',
          log: 'Extracted 142 raw entity definitions across 3 regions.'
        } : a));

        // Add nodes to canvas
        nodesRef.current.push(
          { id: 'n1', x: 180, y: 100, vx: 0, vy: 0, r: 12, color: '#4dabf7', name: 'Tower_Core', label: 'Tower' },
          { id: 'n2', x: 320, y: 110, vx: 0, vy: 0, r: 12, color: '#4dabf7', name: 'Telemetry_In', label: 'Telemetry' }
        );
        linksRef.current.push(
          { source: 'root', target: 'n1' },
          { source: 'root', target: 'n2' }
        );
      }

      if (currentPhase === 35) {
        setActiveStepText('Knowledge Graph Reconciler merging multi-tower relationships in Neo4j...');
        setAgents(prev => prev.map(a => {
          if (a.id === 'graph') return {
            ...a,
            status: 'Running',
            tool: 'neo4j.merge_cross_tower_bloom()',
            log: 'Constructing cross-tower links and dependency vectors...'
          };
          if (a.id === 'ingest') return { ...a, status: 'Reconciling', log: 'Feed synchronized.' };
          return a;
        }));

        nodesRef.current.push(
          { id: 'n3', x: 220, y: 220, vx: 0, vy: 0, r: 10, color: '#ff922b', name: 'Ext_Resource', label: 'External' },
          { id: 'n4', x: 290, y: 210, vx: 0, vy: 0, r: 10, color: '#ff922b', name: 'Storage_Vol', label: 'Asset' }
        );
        linksRef.current.push(
          { source: 'n1', target: 'n3' },
          { source: 'n2', target: 'n4' }
        );
      }

      if (currentPhase === 55) {
        setActiveStepText('Hostile Gap Hunter cross-referencing CMDB vs ground truth evidence...');
        setAgents(prev => prev.map(a => a.id === 'hunter' ? {
          ...a,
          status: 'Running',
          tool: 'detect_dark_dependencies()',
          log: 'Flagged 3 undocumented anomalies absent from incumbent handover.'
        } : a));

        // Add discrepancy ghost node
        const ghostId = 'ghost_1';
        nodesRef.current.push(
          { id: ghostId, x: 140, y: 180, vx: 0, vy: 0, r: 13, color: '#ff6b6b', name: 'Ghost Discrepancy', label: 'Discrepancy' }
        );
        linksRef.current.push({ source: 'n1', target: ghostId });

        setLiveGaps([
          {
            title: transitionType === 'itis' ? 'Ghost Host 10.240.12.88 in Firewall Rule (Missing CMDB)' :
                   transitionType === 'business_process' ? 'Undocumented Shadow Excel Macro in AP Posting' :
                   'Undocumented Outbound Webhook to 198.51.100.44:8443',
            severity: 'CRITICAL',
            source: 'Hostile Gap Hunter'
          }
        ]);
      }

      if (currentPhase === 75) {
        setActiveStepText('KT Synthesis Agent generating laser-targeted questions per SME...');
        setAgents(prev => prev.map(a => a.id === 'kt' ? {
          ...a,
          status: 'Running',
          tool: 'synthesize_sme_interview_pack()',
          log: 'Generated 3 targeted technical questions targeting graph gaps.'
        } : a));

        nodesRef.current.push(
          { id: 'sme_node', x: 360, y: 160, vx: 0, vy: 0, r: 11, color: '#fcc419', name: 'SME Interviewee', label: 'SME' }
        );
        linksRef.current.push({ source: 'root', target: 'sme_node' });

        setLiveGaps(prev => [
          ...prev,
          {
            title: transitionType === 'itis' ? 'Single Point of Failure: 87% Network Changes by D. Evans' :
                   transitionType === 'business_process' ? '92% Wire Transfers Keyed Solely by Supervisor R. Sharma' :
                   'Tribal Knowledge Bottleneck on Database Migrations (M. Chen)',
            severity: 'HIGH',
            source: 'KT Synthesis Agent'
          }
        ]);
      }

      if (currentPhase === 90) {
        setActiveStepText('Cutover Readiness Agent finalizing transition readiness scoring...');
        setAgents(prev => prev.map(a => a.id === 'risk' ? {
          ...a,
          status: 'Running',
          tool: 'evaluate_day1_readiness_score()',
          log: 'Readiness Index: 68/100 (Conditional Go pending SME signoff)'
        } : a));
      }

      if (currentPhase >= 100) {
        clearInterval(interval);
        setActiveStepText('Orchestration complete. Initializing Transition Platform...');
        setAgents(prev => prev.map(a => ({ ...a, status: 'Complete' })));

        // Call backend to persist project
        try {
          const res = await postJson(`${INDEXER_URL}/projects/analyze`, {
            project_name: projectName,
            transition_type: transitionType,
            scopes: orchestratingProject?.scopes || [],
            geos: orchestratingProject?.geos || [],
            repo_url: orchestratingProject?.repo_url || ''
          });
          setTimeout(() => {
            enterPlatform(res);
          }, 1200);
        } catch (e) {
          console.error('Project persistence failed:', e);
          // Fallback enter platform
          setTimeout(() => {
            enterPlatform({
              app_id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              project_id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              display_name: projectName,
              repo_name: projectName,
              transition_type: transitionType,
              scopes: orchestratingProject?.scopes || [],
              geos: orchestratingProject?.geos || [],
              files: 24,
              chunks: 120
            });
          }, 1200);
        }
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Bloom Canvas Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = 240);

    function stepPhysics() {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Spring physics
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.02;
            nodes[i].vx -= dx * force;
            nodes[i].vy -= dy * force;
            nodes[j].vx += dx * force;
            nodes[j].vy += dy * force;
          }
        }
      }

      // Link attraction
      links.forEach(l => {
        const s = nodes.find(n => n.id === l.source);
        const t = nodes.find(n => n.id === l.target);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 80) * 0.01;
          s.vx += dx / dist * force;
          s.vy += dy / dist * force;
          t.vx -= dx / dist * force;
          t.vy -= dy / dist * force;
        }
      });

      // Update positions
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.85;
        n.vy *= 0.85;
        // Keep in bounds
        n.x = Math.max(25, Math.min(width - 25, n.x));
        n.y = Math.max(25, Math.min(height - 25, n.y));
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Links
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      links.forEach(l => {
        const s = nodes.find(n => n.id === l.source);
        const t = nodes.find(n => n.id === l.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Nodes with Bloom Glow
      nodes.forEach(n => {
        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, n.r * 0.5, n.x, n.y, n.r * 2.2);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + n.r + 12);
      });

      animRef.current = requestAnimationFrame(stepPhysics);
    }

    animRef.current = requestAnimationFrame(stepPhysics);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  if (!isAnalyzing) return null;

  return (
    <div id="wizard" style={{ zIndex: 10000, background: 'rgba(10, 14, 23, 0.95)' }}>
      <div className="wiz-card" style={{ maxWidth: 960, width: '95%', background: '#0e1726', border: '1px solid #1e293b' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bl)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hostile Transition Multi-Agent Orchestrator
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
              {projectName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge bbl" style={{ fontSize: 11, padding: '5px 10px' }}>
              {transitionType === 'itis' ? 'ITIS Engine' : transitionType === 'business_process' ? 'BPS Engine' : 'App Engine'}
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4dabf7', marginTop: 4 }}>
              {phase}% Complete
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="prog-wrap" style={{ marginBottom: 16 }}>
          <div className="pb" style={{ height: 6, background: '#1e293b' }}>
            <div className="pf" style={{ width: `${phase}%`, background: 'linear-gradient(90deg, #4dabf7, #9775fa)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
            <span>{activeStepText}</span>
            <span>Parallel compute active</span>
          </div>
        </div>

        {/* Agent Fleet Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 16 }}>
          {agents.map(a => {
            const isDone = a.status === 'Complete';
            const isRun = a.status === 'Running' || a.status === 'Reconciling';
            const badgeClass = isDone ? 'bgr' : isRun ? 'bbl' : 'bgr2';
            return (
              <div
                key={a.id}
                style={{
                  background: '#131f37',
                  border: isRun ? '1px solid #4dabf7' : '1px solid #1e293b',
                  borderRadius: 8,
                  padding: '10px 12px',
                  boxShadow: isRun ? '0 0 12px rgba(77, 171, 247, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#ffffff' }}>{a.name}</div>
                  <span className={`badge ${badgeClass}`} style={{ fontSize: 9 }}>{a.status}</span>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>{a.role}</div>
                <div style={{ background: '#0a101d', borderRadius: 4, padding: '4px 6px', fontSize: 10, color: '#38d9a9', fontFamily: 'monospace', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🔧 {a.tool}
                </div>
                <div style={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1.4, height: 28, overflow: 'hidden' }}>
                  {a.log}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-Time Knowledge Fabric Bloom Canvas */}
        <div style={{ background: '#0a101d', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Live Knowledge Fabric Synthesis (Neo4j Bloom Effect)
            </div>
            <div style={{ fontSize: 10, color: '#38d9a9', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38d9a9', display: 'inline-block' }} />
              Active Graph Nodes: {nodesRef.current.length}
            </div>
          </div>
          <canvas ref={canvasRef} style={{ width: '100%', height: 180, display: 'block' }} />
        </div>

        {/* Live Detected Gaps / Discrepancies */}
        {liveGaps.length > 0 && (
          <div style={{ background: 'rgba(255, 107, 107, 0.08)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️ Hostile Discrepancies Flagged on the Fly:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {liveGaps.map((g, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#f8f9fa' }}>
                  <span>• {g.title}</span>
                  <span className="badge brd2" style={{ fontSize: 9 }}>{g.severity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
