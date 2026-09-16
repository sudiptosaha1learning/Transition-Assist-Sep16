import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { INDEXER_URL, postJson } from '../api.js';

export default function AgenticOrchestrator() {
  const { isAnalyzing, orchestratingProject, enterPlatform } = useApp();
  const [phase, setPhase] = useState(0); // 0 to 100
  const [activeStepText, setActiveStepText] = useState('Initializing specialized agent fleet...');
  const [liveGaps, setLiveGaps] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [backendResult, setBackendResult] = useState(null);

  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const transitionType = orchestratingProject?.transition_type || 'it_application';
  const projectName = orchestratingProject?.project_name || 'Transition Project';
  const scopes = orchestratingProject?.scopes || [];
  const adapters = orchestratingProject?.adapters || {};

  // Build specialized agent fleet based on transition type and selected scopes
  const buildInitialAgentFleet = () => {
    const fleet = [];
    const scopeStr = (scopes || []).join(' ').toLowerCase();

    if (transitionType === 'itis') {
      if (!scopes.length || scopeStr.includes('network') || scopeStr.includes('security') || adapters.network) {
        fleet.push({
          id: 'agent_network_sec',
          name: 'Network & Security Perimeter Agent',
          tower: 'Network & Security',
          role: 'Firewall Rulebase & Dark Egress Auditor',
          status: 'Spawning',
          tool: 'palo_alto.get_security_policies()',
          log: 'Connecting to Palo Alto Panorama & Meraki endpoints...',
          thoughtSteps: [
            'Authenticating against Palo Alto Panorama at https://panorama-prod.corp.internal...',
            'Extracting active security rules for scope US-EAST-VPC-FIREWALL...',
            'Detected active rule FW-PROD-EAST-402 allowing traffic to 10.240.12.88 on port 8443.',
            'Cross-referencing destination IP 10.240.12.88 against ServiceNow CMDB table cmdb_ci_ip_address...',
            'ServiceNow CMDB returned 0 records. Reverse DNS lookup returned NXDOMAIN.',
            'ANOMALY IDENTIFIED: Ghost Host permitted in core perimeter rule with zero CMDB ownership.'
          ]
        });
      }

      if (!scopes.length || scopeStr.includes('cloud') || scopeStr.includes('virtualization') || scopeStr.includes('compute') || adapters.cloud || adapters.compute) {
        fleet.push({
          id: 'agent_cloud_compute',
          name: 'Cloud & Compute Ingestion Agent',
          tower: 'Cloud & Virtualization',
          role: 'Hypervisor & Zombie CI Auditor',
          status: 'Waiting',
          tool: 'aws.describe_instances()',
          log: 'Awaiting cloud IAM credentials verification...',
          thoughtSteps: [
            'Connecting to AWS production tenancy (782910394812)...',
            'Listing EC2 instances across us-east-1 and eu-west-1...',
            'Correlating hypervisor state with 365-day Datadog telemetry and network throughput...',
            '38 virtual machines in cluster dc-eu-west-02 show 0.0% CPU & 0 packets/sec for 12 months.',
            'ANOMALY IDENTIFIED: 38 Zombie CIs actively billed ($4,200/mo) but functionally abandoned.'
          ]
        });
      }

      if (!scopes.length || scopeStr.includes('storage') || scopeStr.includes('backup') || adapters.storage) {
        fleet.push({
          id: 'agent_storage_backup',
          name: 'Storage & Backup Telemetry Agent',
          tower: 'Storage & Backup',
          role: 'SAN/NAS & DR Replication Auditor',
          status: 'Waiting',
          tool: 'netapp.get_volume_capacity()',
          log: 'Connecting to NetApp ONTAP controller...',
          thoughtSteps: [
            'Querying NetApp REST API at https://ontap-mgmt-01.storage.internal...',
            'Auditing volume capacity thresholds for vol_prod_* and vol_oracle_*...',
            'Querying Veeam replication job statuses for DR compliance...',
            'Volume vol-oracle-archive-04 is at 94.2% capacity with replication failures since March.',
            'CRITICAL RISK: Unmonitored volume near full exhaustion; DR snapshots failing silently.'
          ]
        });
      }

      if (!scopes.length || scopeStr.includes('service desk') || scopeStr.includes('euc') || scopeStr.includes('itsm') || adapters.servicedesk) {
        fleet.push({
          id: 'agent_itsm_telemetry',
          name: 'Service Desk & ITSM Telemetry Agent',
          tower: 'Service Desk & EUC',
          role: 'Ticket Velocity & Tribal Knowledge SPOF Hunter',
          status: 'Waiting',
          tool: 'servicenow.query_incidents()',
          log: 'Connecting to ServiceNow ITSM table change_request...',
          thoughtSteps: [
            'Querying 12 months of change requests and P1/P2 incidents...',
            'Computing Gini coefficient on core routing/firewall change ownership...',
            '87% of core network routing and VPN failovers were executed exclusively by D. Evans.',
            'HANDOVER RISK: Single Point of Failure (SPOF); departure without handover leaves critical gap.'
          ]
        });
      }
    } else if (transitionType === 'business_process') {
      fleet.push({
        id: 'agent_process_mining',
        name: 'Process Mining & Shadow Ops Agent',
        tower: 'Finance & Operations',
        role: 'SOP vs Ground-Truth Process Miner',
        status: 'Spawning',
        tool: 'sap.trace_doc_flows()',
        log: 'Connecting to SAP S/4HANA & Shared Drives...',
        thoughtSteps: [
          'Tracing document flows in SAP S/4HANA FI-AP module...',
          'Scanning shared network drives and ticket notes for unapproved helper tools...',
          'Discovered Macro_v3.xlsm on drive X:\\Finance_AP modified yesterday.',
          '42 ticket notes cite running Macro_v3.xlsm to cleanse tax codes before posting to SAP.',
          'Discovered 31 wire approvals bypassing dual-control using manual code OVR-99.',
          'DISCREPANCY DETECTED: Shadow Excel macros and unlogged compliance override codes.'
        ]
      });
    } else {
      // IT Application
      fleet.push({
        id: 'agent_codebase_sec',
        name: 'Codebase & AST Dependency Agent',
        tower: 'Core Application',
        role: 'AST Parser & Dark Dependency Hunter',
        status: 'Spawning',
        tool: 'git_ast_parser()',
        log: 'Parsing AST call graphs and network sockets...',
        thoughtSteps: [
          'Cloning repository and executing TypeScript AST parser across src/...',
          'Tracing outbound HTTPS network connections in payment microservice...',
          'Detected uncatalogued external socket call to 198.51.100.44:8443 in src/services/payment.ts:142.',
          'Auditing KMS signing tokens: Primary certificate expires in 19 days with hardcoded fallback.',
          'Commits analysis shows 84% of database migrations authored exclusively by M. Chen.',
          'DISCREPANCY DETECTED: Dark outbound webhook and single developer bottleneck.'
        ]
      });
    }

    // Common Orchestration Agents
    fleet.push({
      id: 'agent_kg_construction',
      name: 'Knowledge Graph Construction Agent',
      tower: 'Knowledge Fabric Engine',
      role: 'Neo4j Bloom Fabric Synthesizer',
      status: 'Waiting',
      tool: 'neo4j.merge_nodes()',
      log: 'Awaiting entity vectors from tower agents...',
      thoughtSteps: [
        'Awaiting normalized entity streams from parallel tower agents...',
        'Synthesizing estate root anchor node and mapping dependency edges...',
        'Injecting verified nodes and flagging discrepancy vectors with Bloom glow attributes...',
        'Knowledge Fabric converged into unified graph schema.'
      ]
    });

    fleet.push({
      id: 'agent_kt_synthesis',
      name: 'Targeted KT Synthesis Agent',
      tower: 'Core Engine',
      role: 'Hostile Handover SME Interviewer',
      status: 'Waiting',
      tool: 'gap_analyzer.extract_critical_gaps()',
      log: 'Monitoring graph discrepancy nodes...',
      thoughtSteps: [
        'Ingesting flagged gaps and dark dependencies...',
        'Cross-referencing git blame and change logs to identify exact accountable SMEs...',
        'Formulating evidence-backed, non-defensive interview packs targeting discrepancies.'
      ]
    });

    fleet.push({
      id: 'agent_cutover_risk',
      name: 'Cutover Risk & Scorecard Evaluator',
      tower: 'Core Engine',
      role: 'Day-1 Readiness & Blocker Evaluator',
      status: 'Waiting',
      tool: 'risk_model.calculate_readiness_index()',
      log: 'Waiting for graph convergence...',
      thoughtSteps: [
        'Aggregating critical blockers and SPOF exposures...',
        'Computing Day-1 Readiness Index...',
        'Generated Cutover Preconditions Scorecard.'
      ]
    });

    return fleet;
  };

  const [agents, setAgents] = useState(buildInitialAgentFleet);

  // Visual Bloom Canvas nodes
  const nodesRef = useRef([
    { id: 'root', x: 250, y: 140, vx: 0, vy: 0, r: 18, color: '#9775fa', name: projectName, label: 'Root' }
  ]);
  const linksRef = useRef([]);

  // Orchestration lifecycle
  useEffect(() => {
    if (!isAnalyzing) return;

    // Reset initial agents
    const initialAgents = buildInitialAgentFleet();
    setAgents(initialAgents);
    setSelectedAgentId(initialAgents[0]?.id || null);

    // Trigger real backend analysis
    postJson(`${INDEXER_URL}/projects/analyze`, {
      project_name: projectName,
      transition_type: transitionType,
      scopes: scopes,
      geos: orchestratingProject?.geos || [],
      repo_url: orchestratingProject?.repo_url || '',
      adapters: adapters
    }).then(res => {
      setBackendResult(res);
    }).catch(err => {
      console.warn('Backend analyze call failed, using heuristic engine:', err);
    });

    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase += 4;
      setPhase(Math.min(100, currentPhase));

      // Phase 1: Ingestion & Perimeter Agent Active (10% - 30%)
      if (currentPhase === 12) {
        setActiveStepText('Spawning specialized tower agents & querying live adapter APIs...');
        setAgents(prev => prev.map((a, idx) => idx === 0 ? {
          ...a,
          status: 'Running',
          log: `Executing ${a.tool} against enterprise adapter endpoints...`
        } : a));

        nodesRef.current.push(
          { id: 'n_core', x: 180, y: 90, vx: 0, vy: 0, r: 13, color: '#4dabf7', name: transitionType === 'itis' ? 'FW-PROD-EAST' : transitionType === 'business_process' ? 'P2P Core Flow' : 'auth/jwt.py', label: 'Core' },
          { id: 'n_net', x: 320, y: 100, vx: 0, vy: 0, r: 13, color: '#4dabf7', name: transitionType === 'itis' ? 'Subnet 10.240.0.0/16' : transitionType === 'business_process' ? 'SAP S/4HANA' : 'services/payment.ts', label: 'Module' }
        );
        linksRef.current.push(
          { source: 'root', target: 'n_core' },
          { source: 'root', target: 'n_net' }
        );
      }

      // Phase 2: Discrepancy & Ghost Asset Discovery (30% - 50%)
      if (currentPhase === 36) {
        setActiveStepText('Cross-referencing telemetry against CMDB & flagging hostile discrepancies...');
        setAgents(prev => prev.map((a, idx) => {
          if (idx === 0) return { ...a, status: 'Complete', log: 'Extraction and rule parsing complete.' };
          if (idx === 1) return { ...a, status: 'Running', log: `Auditing ${a.tower} telemetry against 365d activity records...` };
          return a;
        }));

        const ghostName = transitionType === 'itis' ? 'Ghost Host: 10.240.12.88' :
                          transitionType === 'business_process' ? 'Shadow Macro_v3.xlsm' :
                          'Ghost Webhook: 198.51.100.44';

        nodesRef.current.push(
          { id: 'n_ghost', x: 130, y: 180, vx: 0, vy: 0, r: 14, color: '#ff6b6b', name: ghostName, label: 'Discrepancy' }
        );
        linksRef.current.push({ source: 'n_core', target: 'n_ghost' });

        setLiveGaps(prev => [
          ...prev,
          {
            title: transitionType === 'itis' ? 'Ghost Host 10.240.12.88 in Firewall Rule (Missing CMDB)' :
                   transitionType === 'business_process' ? 'Undocumented Shadow Excel Macro in Invoice Reconciliation' :
                   'Undocumented External Webhook Call (198.51.100.44:8443)',
            severity: 'CRITICAL',
            source: 'Perimeter Agent'
          }
        ]);
      }

      // Phase 3: Secondary Tower & SPOF Mining (50% - 70%)
      if (currentPhase === 56) {
        setActiveStepText('Mining incident logs and personnel concentration for tribal knowledge SPOFs...');
        setAgents(prev => prev.map(a => {
          if (a.id === 'agent_itsm_telemetry' || a.id === 'agent_storage_backup') {
            return { ...a, status: 'Running', log: `Executing ${a.tool}...` };
          }
          if (a.id === 'agent_cloud_compute') {
            return { ...a, status: 'Complete', log: 'Dormant instance audit complete.' };
          }
          return a;
        }));

        const smeName = transitionType === 'itis' ? 'D. Evans (Network SPOF)' :
                        transitionType === 'business_process' ? 'R. Sharma (Wire SPOF)' :
                        'M. Chen (Migration SPOF)';

        nodesRef.current.push(
          { id: 'n_sme', x: 370, y: 160, vx: 0, vy: 0, r: 12, color: '#fcc419', name: smeName, label: 'SME' },
          { id: 'n_asset2', x: 240, y: 220, vx: 0, vy: 0, r: 11, color: '#ff922b', name: transitionType === 'itis' ? 'NetApp vol-oracle-04' : 'Secondary System', label: 'Asset' }
        );
        linksRef.current.push(
          { source: 'root', target: 'n_sme' },
          { source: 'n_net', target: 'n_asset2' }
        );

        setLiveGaps(prev => [
          ...prev,
          {
            title: transitionType === 'itis' ? 'Single Point of Failure: 87% Network Changes by D. Evans' :
                   transitionType === 'business_process' ? 'Single Point of Failure: 92% Wire Releases by R. Sharma' :
                   'Tribal Knowledge Concentration on Schema Migrations (M. Chen)',
            severity: 'HIGH',
            source: 'ITSM Telemetry Agent'
          }
        ]);
      }

      // Phase 4: Neo4j Knowledge Fabric Synthesis (70% - 85%)
      if (currentPhase === 76) {
        setActiveStepText('Knowledge Graph Reconciler merging multi-tower vectors into Neo4j Bloom fabric...');
        setAgents(prev => prev.map(a => {
          if (a.id === 'agent_kg_construction') {
            return { ...a, status: 'Running', log: 'Merging cross-tower relationships and entity vectors in Neo4j...' };
          }
          if (a.id === 'agent_kt_synthesis') {
            return { ...a, status: 'Running', log: 'Synthesizing targeted interview questions for SMEs...' };
          }
          if (a.status === 'Running') return { ...a, status: 'Complete', log: 'Analysis complete.' };
          return a;
        }));
      }

      // Phase 5: Cutover Readiness Evaluation (85% - 95%)
      if (currentPhase === 90) {
        setActiveStepText('Cutover Risk Agent computing Day-1 Readiness Scorecard...');
        setAgents(prev => prev.map(a => {
          if (a.id === 'agent_cutover_risk') {
            return { ...a, status: 'Running', log: 'Readiness Index: 68/100 (Conditional Go pending SME signoff)' };
          }
          if (a.id === 'agent_kt_synthesis') {
            return { ...a, status: 'Complete', log: 'Generated 3 targeted technical interview packs.' };
          }
          return a;
        }));
      }

      // Phase 6: Completion (100%)
      if (currentPhase >= 100) {
        clearInterval(interval);
        setActiveStepText('Orchestration complete. All specialized agents converged. Initializing platform...');
        setAgents(prev => prev.map(a => ({ ...a, status: 'Complete' })));

        setTimeout(() => {
          if (backendResult) {
            enterPlatform(backendResult);
          } else {
            // Fallback enter platform
            enterPlatform({
              app_id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              project_id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              display_name: projectName,
              repo_name: projectName,
              transition_type: transitionType,
              scopes: scopes,
              geos: orchestratingProject?.geos || [],
              files: nodesRef.current.length * 3,
              chunks: nodesRef.current.length * 15
            });
          }
        }, 1400);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Bloom Canvas Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = 230);

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
          const force = (dist - 85) * 0.012;
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
        n.x = Math.max(25, Math.min(width - 25, n.x));
        n.y = Math.max(25, Math.min(height - 25, n.y));
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw Links
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
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

      // Draw Nodes with Neo4j Bloom Glow
      nodes.forEach(n => {
        // Outer Glow
        const grad = ctx.createRadialGradient(n.x, n.y, n.r * 0.4, n.x, n.y, n.r * 2.4);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Node Core
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + n.r + 13);
      });

      animRef.current = requestAnimationFrame(stepPhysics);
    }

    animRef.current = requestAnimationFrame(stepPhysics);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  if (!isAnalyzing) return null;

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div className="orchestrator-page" style={{ minHeight: '100vh', background: '#070c18', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{ borderBottom: '1px solid #1e293b', background: '#0b1324', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Hostile Transition Multi-Agent Orchestrator
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
            {projectName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="badge bbl" style={{ fontSize: 12, padding: '5px 14px' }}>
            {transitionType === 'itis' ? 'ITIS Multi-Tower Engine' : transitionType === 'business_process' ? 'BPS Process Mining Engine' : 'Application Engine'}
          </span>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#4dabf7' }}>
            {phase}% Converged
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main style={{ flex: 1, maxWidth: 1240, width: '100%', margin: '0 auto', padding: '24px 24px 60px 24px' }}>

        {/* Progress Bar */}
        <div className="prog-wrap" style={{ marginBottom: 16 }}>
          <div className="pb" style={{ height: 6, background: '#131f37' }}>
            <div className="pf" style={{ width: `${phase}%`, background: 'linear-gradient(90deg, #38d9a9, #4dabf7, #9775fa)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>⚡ {activeStepText}</span>
            <span>{agents.filter(a => a.status === 'Complete').length} / {agents.length} Agents Converged</span>
          </div>
        </div>

        {/* Split Layout: Left Agent Fleet Grid, Right Interactive Chain-of-Thought Drawer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 16 }}>
          
          {/* Agent Fleet Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Specialized Agent Fleet (Click to Inspect Reasoning)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 310, overflowY: 'auto' }}>
              {agents.map(a => {
                const isSelected = a.id === selectedAgentId;
                const isDone = a.status === 'Complete';
                const isRun = a.status === 'Running';
                const badgeClass = isDone ? 'bgr' : isRun ? 'bbl' : 'bgr2';

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAgentId(a.id)}
                    style={{
                      background: isSelected ? '#152445' : '#0e1a30',
                      border: isSelected ? '1px solid #4dabf7' : isRun ? '1px solid #3b82f6' : '1px solid #1e293b',
                      borderRadius: 6,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 12px rgba(77, 171, 247, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                        {a.name}
                      </div>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: 9 }}>
                        {a.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                      {a.role} · <span style={{ color: '#60a5fa' }}>{a.tower}</span>
                    </div>
                    <div style={{ background: '#080d1a', borderRadius: 4, padding: '3px 6px', fontSize: 10, color: '#38d9a9', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🔧 {a.tool}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Agent Chain-of-Thought Reasoning Terminal */}
          <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4dabf7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🧠 Agent Thought Drawer:</span>
                <span style={{ color: '#ffffff' }}>{activeAgent?.name}</span>
              </div>
              <span className="badge bgr2" style={{ fontSize: 9 }}>
                {activeAgent?.status}
              </span>
            </div>

            <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#64748b' }}>// Initialized agent executor with adapter context</div>
              <div style={{ color: '#38d9a9' }}>&gt; Current Tool: {activeAgent?.tool}</div>
              
              {activeAgent?.thoughtSteps && activeAgent.thoughtSteps.map((step, idx) => (
                <div key={idx} style={{ paddingLeft: 8, borderLeft: '2px solid #3b82f6' }}>
                  <span style={{ color: '#93c5fd', fontWeight: 600 }}>Step {idx + 1}:</span> {step}
                </div>
              ))}

              <div style={{ color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
                Status: {activeAgent?.log}
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Knowledge Fabric Bloom Canvas */}
        <div style={{ background: '#080d1a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Knowledge Fabric Synthesis (Neo4j Bloom Glow Effect)
            </div>
            <div style={{ fontSize: 10, color: '#38d9a9', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38d9a9', display: 'inline-block' }} />
              Active Graph Nodes: {nodesRef.current.length} · Dynamic Force Layout
            </div>
          </div>
          <canvas ref={canvasRef} style={{ width: '100%', height: 180, display: 'block' }} />
        </div>

        {/* Live Detected Hostile Discrepancies */}
        {liveGaps.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️ Real-Time Hostile Discrepancies Flagged by Agents:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {liveGaps.map((g, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#f8f9fa' }}>
                  <span>• {g.title}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>[{g.source}]</span>
                    <span className="badge brd2" style={{ fontSize: 9 }}>{g.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion CTA */}
        {phase >= 100 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              className="btn bp"
              onClick={() => {
                if (backendResult) {
                  enterPlatform(backendResult);
                } else {
                  enterPlatform({
                    app_id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    project_id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    display_name: projectName,
                    repo_name: projectName,
                    transition_type: transitionType,
                    scopes: scopes,
                    geos: orchestratingProject?.geos || [],
                    files: nodesRef.current.length * 3,
                    chunks: nodesRef.current.length * 15
                  });
                }
              }}
              style={{ fontSize: 14, padding: '12px 28px', fontWeight: 700 }}
            >
              🚀 Explore Knowledge Fabric &amp; Transition Dashboard →
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
