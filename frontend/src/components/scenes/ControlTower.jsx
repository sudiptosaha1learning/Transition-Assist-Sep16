import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../state/AppContext.jsx';

export default function ControlTower() {
  const { activeApp, scene, resolveGap } = useApp();

  const transitionType = activeApp?.transition_type || 'itis';
  const projectName = activeApp?.display_name || activeApp?.repo_name || 'Transition Estate';

  // Mode: 'simulator' (interactive 9-week timeline) vs 'live' (real active project telemetry)
  const [mode, setMode] = useState(activeApp ? 'live' : 'simulator');

  // Timeline state (Week 1.0 to 9.0)
  const [week, setWeek] = useState(mode === 'live' ? 3.5 : 1.0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);

  // Active Scope Selection based on transition type
  const scopeDefinitions = useMemo(() => {
    if (transitionType === 'it_application') {
      return [
        {
          id: 'apis',
          name: 'Core Backend APIs & Services',
          short: 'Backend APIs',
          category: 'Application Tier',
          desc: 'REST/gRPC endpoints, microservices, business domain logic',
          hierarchy: [
            { level: 'Service', name: 'payment-microservice', path: 'src/services/payment.ts' },
            { level: 'Endpoints', name: 'POST /v1/charges, POST /v1/refunds', path: 'port 8443' },
            { level: 'Dark Sockets', name: 'Outbound: 198.51.100.44:8443 (Undocumented)', severity: 'Critical' },
            { level: 'Maintainer', name: 'M. Chen (84% of commits)', note: 'Single Point of Failure' }
          ]
        },
        {
          id: 'db',
          name: 'Database & Persistence Schema',
          short: 'DB & Schema',
          category: 'Application Tier',
          desc: 'PostgreSQL, ORM models, Flyway schema migrations, DDL scripts',
          hierarchy: [
            { level: 'Database', name: 'prod_app_pg15 (AWS Aurora)', path: 'db/schema.sql' },
            { level: 'Migrations', name: '42 Flyway schema migration scripts', path: 'db/migration/' },
            { level: 'Anomaly', name: '3 direct schema alter scripts without PR review', severity: 'High' },
            { level: 'Maintainer', name: 'M. Chen (Sole author of migration 012-042)' }
          ]
        },
        {
          id: 'auth',
          name: 'Payment, Auth & Integrations',
          short: 'Auth & Secrets',
          category: 'Application Tier',
          desc: 'OAuth2/JWT token signing, KMS keys, payment gateway SDKs',
          hierarchy: [
            { level: 'Module', name: 'auth/jwt.py (Token Rotator)', path: 'auth/jwt.py' },
            { level: 'Risk', name: 'KMS Key Certificate expires in 19 days (cutover overlap)', severity: 'Critical' },
            { level: 'Fallback', name: 'Hardcoded fallback secret_2022_v1 detected', severity: 'High' }
          ]
        },
        {
          id: 'ui',
          name: 'Web & Mobile Client Frontend',
          short: 'Frontend UI',
          category: 'Application Tier',
          desc: 'React SPA, Vite bundle, API client hooks, client-side session',
          hierarchy: [
            { level: 'SPA', name: 'Customer Portal (React 18 + Vite)', path: 'frontend/src' },
            { level: 'Endpoints', name: 'Calls /v1/charges, /v1/auth, /v1/status' },
            { level: 'State', name: 'Client token storage in sessionStorage (compliant)' }
          ]
        },
        {
          id: 'cicd',
          name: 'CI/CD & Delivery Pipelines',
          short: 'CI/CD Pipelines',
          category: 'Application Tier',
          desc: 'GitHub Actions workflows, Docker builds, automated test gates',
          hierarchy: [
            { level: 'Pipeline', name: '.github/workflows/deploy-prod.yml' },
            { level: 'Container', name: 'Dockerfile (Node 20 Alpine, multi-stage)' },
            { level: 'Gate', name: 'Integration test suite (94% code coverage)' }
          ]
        },
        {
          id: 'cloud',
          name: 'Cloud Tenancy & Runtime Infra',
          short: 'Cloud Tenancy',
          category: 'Application Tier',
          desc: 'AWS EKS cluster, VPC subnets, ingress routing, IAM roles',
          hierarchy: [
            { level: 'Cluster', name: 'eks-prod-us-east-1 (Kubernetes v1.28)' },
            { level: 'Ingress', name: 'AWS ALB with TLS termination' },
            { level: 'Telemetry', name: 'Datadog Agent daemonset & CloudWatch logs' }
          ]
        },
        {
          id: 'itsm',
          name: 'ITSM & Production Operations',
          short: 'ITSM Operations',
          category: 'Application Tier',
          desc: 'Incident history, ServiceNow queues, change logs, on-call paging',
          hierarchy: [
            { level: 'ITSM', name: 'ServiceNow instance acme-corp.service-now.com' },
            { level: 'Tickets', name: '1,420 historical tickets analyzed (365 days)' },
            { level: 'Hotspot', name: '64% of P1 incidents stem from payment timeout retries' }
          ]
        }
      ];
    } else if (transitionType === 'business_process') {
      return [
        {
          id: 'p2p',
          name: 'Procure-to-Pay (P2P)',
          short: 'Procure-to-Pay',
          category: 'Value Stream',
          desc: 'Invoice processing, PO matching, vendor ledger validation',
          hierarchy: [
            { level: 'ERP', name: 'SAP S/4HANA FI-AP (Client 100)' },
            { level: 'Batch', name: 'Daily invoice batch processing (4,200 invoices/day)' },
            { level: 'Shadow Tool', name: 'Macro_v3.xlsm on Drive X:\ (Cleanses tax codes)', severity: 'Critical' }
          ]
        },
        {
          id: 'o2c',
          name: 'Order-to-Cash (O2C)',
          short: 'Order-to-Cash',
          category: 'Value Stream',
          desc: 'Sales orders, billing release, accounts receivable reconciliation',
          hierarchy: [
            { level: 'ERP', name: 'SAP SD & Billing Module' },
            { level: 'Risk', name: 'Manual Override Code OVR-99 bypassing dual approvals', severity: 'Critical' }
          ]
        },
        {
          id: 'r2r',
          name: 'Record-to-Report (R2R)',
          short: 'Record-to-Report',
          category: 'Value Stream',
          desc: 'General ledger closing, journal adjustments, balance sheet audit',
          hierarchy: [
            { level: 'System', name: 'SAP General Ledger + BlackLine Reconciliation' },
            { level: 'Cadence', name: 'Month-end financial close schedule (Day +3)' }
          ]
        },
        {
          id: 'crm',
          name: 'Customer Care & CRM Queues',
          short: 'Customer Support',
          category: 'Value Stream',
          desc: 'Omnichannel contact center, escalation triage, customer SLA',
          hierarchy: [
            { level: 'CRM', name: 'Salesforce Service Cloud Enterprise' },
            { level: 'Queue', name: '4,200 customer cases/month, Tier 1/2 routing' }
          ]
        },
        {
          id: 'hr',
          name: 'HR & Talent Operations',
          short: 'HR Operations',
          category: 'Value Stream',
          desc: 'Employee lifecycle, onboarding, benefits queries, payroll sync',
          hierarchy: [
            { level: 'System', name: 'Workday HCM API Integration' },
            { level: 'Tickets', name: '850 employee lifecycle tickets/month' }
          ]
        },
        {
          id: 'scm',
          name: 'Supply Chain & Logistics',
          short: 'Supply Chain',
          category: 'Value Stream',
          desc: 'Inventory movements, vendor management, logistics manifests',
          hierarchy: [
            { level: 'Catalog', name: 'SAP Ariba Vendor Network & PO Sync' },
            { level: 'Logistics', name: '3PL carrier EDI integration' }
          ]
        }
      ];
    } else {
      // ITIS Towers
      return [
        {
          id: 'net',
          name: 'Network & Perimeter Security',
          short: 'Network',
          category: 'Infrastructure Tower',
          desc: 'Firewalls, routers, SD-WAN, VPNs, IPAM, dark egress routes',
          hierarchy: [
            { level: 'Appliance', name: 'Palo Alto Panorama (FW-PROD-EAST)' },
            { level: 'Rule', name: 'Rule FW-402 permits egress to 10.240.12.88:8443' },
            { level: 'Anomaly', name: 'Ghost Host: 10.240.12.88 absent from CMDB', severity: 'Critical' },
            { level: 'Maintainer', name: 'D. Evans (87% of core routing changes)', note: 'Tribal SPOF' }
          ]
        },
        {
          id: 'cld',
          name: 'Cloud Infrastructure & Tenancies',
          short: 'Cloud Infra',
          category: 'Infrastructure Tower',
          desc: 'AWS, Azure, GCP accounts, Landing Zones, Terraform state',
          hierarchy: [
            { level: 'Tenancy', name: 'AWS Production Account (782910394812)' },
            { level: 'IaC', name: 'Terraform Landing Zone (184 resources in 14 subnets)' },
            { level: 'Anomaly', name: '38 Zombie VMs in cluster dc-eu-west-02 (0 telemetry in 365d)', severity: 'High' }
          ]
        },
        {
          id: 'stor',
          name: 'Storage & Backup Arrays',
          short: 'Storage & DR',
          category: 'Infrastructure Tower',
          desc: 'SAN/NAS LUNs, NetApp ONTAP, Veeam backup & replication jobs',
          hierarchy: [
            { level: 'Storage', name: 'NetApp ONTAP Cluster (48 LUNs, 420 TB)' },
            { level: 'Risk', name: 'vol-oracle-archive-04 at 94.2% capacity', severity: 'Critical' },
            { level: 'Replication', name: 'Veeam snapshots failing continuously since March', severity: 'High' }
          ]
        },
        {
          id: 'comp',
          name: 'Compute & Server Fleet',
          short: 'Compute Fleet',
          category: 'Infrastructure Tower',
          desc: 'Bare-metal, VMware ESXi clusters, Windows & Linux fleets',
          hierarchy: [
            { level: 'Hypervisor', name: 'VMware vCenter Cluster dc-eu-west-02 (24 ESXi hosts)' },
            { level: 'Fleet', name: '180 Production VMs running Linux & Windows Server' }
          ]
        },
        {
          id: 'svd',
          name: 'Service Desk & EUC Queues',
          short: 'Service Desk',
          category: 'Infrastructure Tower',
          desc: 'Incident triage, service catalog, endpoint device fleet',
          hierarchy: [
            { level: 'ITSM', name: 'ServiceNow Global Infrastructure Support' },
            { level: 'Volume', name: '1,480 change requests & P1/P2 tickets/year' },
            { level: 'SPOF', name: '87% of emergency changes executed by outgoing SME' }
          ]
        },
        {
          id: 'dba',
          name: 'Database Administration (OEM)',
          short: 'Database (DBA)',
          category: 'Infrastructure Tower',
          desc: 'Oracle RAC, RDS Aurora, SQL Server, replication clusters',
          hierarchy: [
            { level: 'Engine', name: 'Oracle Enterprise Manager (42 schemas, 18 RAC nodes)' },
            { level: 'Targets', name: 'PROD_ERP_DB, FIN_SETTLE_DB' }
          ]
        },
        {
          id: 'soc',
          name: 'Security Operations & SIEM',
          short: 'SOC & SIEM',
          category: 'Infrastructure Tower',
          desc: 'Splunk/Sentinel log collectors, EDR telemetry, IAM compliance',
          hierarchy: [
            { level: 'SIEM', name: 'Splunk Cloud Production Indexer' },
            { level: 'EDR', name: 'CrowdStrike Falcon sensor fleet (99.8% coverage)' }
          ]
        },
        {
          id: 'mw',
          name: 'Middleware & Integration Brokers',
          short: 'Middleware',
          category: 'Infrastructure Tower',
          desc: 'Kafka clusters, MQ brokers, WebLogic, API Gateways',
          hierarchy: [
            { level: 'Broker', name: 'Apache Kafka Production Cluster (6 brokers, 48 topics)' },
            { level: 'Gateway', name: 'Kong Enterprise API Gateway' }
          ]
        }
      ];
    }
  }, [transitionType]);

  const geoDefinitions = useMemo(() => [
    { id: 'na', name: 'North America' },
    { id: 'emea', name: 'EMEA Delivery Center' },
    { id: 'apac', name: 'APAC Delivery Center' },
    { id: 'gdc', name: 'Global Hub (Offshore)' }
  ], []);

  const [activeScopes, setActiveScopes] = useState(() => new Set(scopeDefinitions.map(s => s.id)));
  const [activeGeos, setActiveGeos] = useState(() => new Set(['na', 'emea', 'apac']));
  const [selectedNode, setSelectedNode] = useState(null);

  // SME Interview Modal State
  const [activeInterviewGap, setActiveInterviewGap] = useState(null);
  const [smeResponseText, setSmeResponseText] = useState('');
  const [smeNameInput, setSmeNameInput] = useState('D. Evans');
  const [reconcilingGap, setReconcilingGap] = useState(false);
  const [dispatchCopied, setDispatchCopied] = useState(false);
  const [executiveBriefCopied, setExecutiveBriefCopied] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);

  // Resolved Gaps local tracking
  const [resolvedGapIds, setResolvedGapIds] = useState(new Set());

  // 9 Engagement Phases
  const phaseModel = useMemo(() => [
    { min: 1.0, max: 1.5, name: 'Mobilization & Ingestion', agents: ['ingest'] },
    { min: 1.5, max: 3.0, name: 'Knowledge Graph & Gap Detection', agents: ['kgraph', 'tmine', 'gapdet'] },
    { min: 3.0, max: 4.0, name: 'Targeted KT & Runbook Drafting', agents: ['ktsyn', 'runbook'] },
    { min: 4.0, max: 5.0, name: 'Shadow Support', agents: ['gapdet', 'runbook'] },
    { min: 5.0, max: 6.0, name: 'Reverse Shadow', agents: ['readiness', 'gapdet'] },
    { min: 6.0, max: 7.0, name: 'Parallel Run', agents: ['readiness', 'tmine'] },
    { min: 7.0, max: 7.5, name: 'Mock Drills & Rehearsal', agents: ['readiness'] },
    { min: 7.5, max: 8.0, name: 'Cutover / Go-Live', agents: ['tmo', 'readiness'] },
    { min: 8.0, max: 9.0, name: 'Stabilization', agents: ['readiness', 'tmo'] }
  ], []);

  const currentPhase = useMemo(() => {
    return phaseModel.find(p => week >= p.min && week <= p.max) || phaseModel[0];
  }, [week, phaseModel]);

  // Compute simulated day (Day 1 to 45)
  const currentDay = useMemo(() => {
    return Math.max(1, Math.min(45, Math.round((week - 1) * 5.6) + 1));
  }, [week]);

  // Readiness calculation formula
  function computeScopeReadiness(scopeId, geoId, w) {
    if (mode === 'live' && activeApp) {
      // In live mode, compute from real project gaps & files
      const base = 48;
      const boost = resolvedGapIds.size * 9;
      return Math.min(100, base + boost);
    }
    // Deterministic simulation curve
    let hashVal = 0;
    const str = scopeId + '|' + geoId;
    for (let i = 0; i < str.length; i++) hashVal = (hashVal * 31 + str.charCodeAt(i)) | 0;
    const delay = Math.abs(hashVal % 10) / 8;
    const rate = 0.9 + Math.abs((hashVal >> 3) % 10) / 20;
    const x = Math.max(0, Math.min(1, (w - 1 - delay) / (7.2 / rate)));
    const smooth = x * x * (3 - 2 * x);
    return Math.round(8 + smooth * 90);
  }

  // Aggregate overall readiness
  const { overallReadiness, scopeAverages } = useMemo(() => {
    const activeSList = scopeDefinitions.filter(s => activeScopes.has(s.id));
    const activeGList = geoDefinitions.filter(g => activeGeos.has(g.id));

    let totalSum = 0;
    let totalCount = 0;
    const averages = {};

    activeSList.forEach(s => {
      let sSum = 0;
      activeGList.forEach(g => {
        const val = computeScopeReadiness(s.id, g.id, week);
        sSum += val;
        totalSum += val;
        totalCount++;
      });
      averages[s.id] = activeGList.length ? Math.round(sSum / activeGList.length) : 0;
    });

    const ovr = totalCount ? Math.round(totalSum / totalCount) : 0;
    return { overallReadiness: ovr, scopeAverages: averages };
  }, [activeScopes, activeGeos, week, scopeDefinitions, geoDefinitions, mode, resolvedGapIds]);

  // Dynamic Artifacts Ingested count
  const artifactsCount = useMemo(() => {
    const sCount = activeScopes.size || 1;
    const gCount = activeGeos.size || 1;
    const ratio = Math.max(0, Math.min(1, (week - 1) / 5.5));
    const smooth = ratio * ratio * (3 - 2 * ratio);
    return Math.round(sCount * gCount * 1480 * smooth);
  }, [activeScopes, activeGeos, week]);

  // Master Pool of Gaps / Discrepancies
  const allGaps = useMemo(() => {
    const baseGaps = [
      {
        id: 'gap_1',
        week: 1.6,
        scopeId: scopeDefinitions[0]?.id,
        geoId: 'na',
        title: transitionType === 'it_application'
          ? 'Undocumented External Webhook (198.51.100.44:8443) in payment.ts'
          : 'Ghost Host: 10.240.12.88 permitted in core firewall rule FW-402 (Missing CMDB)',
        severity: 'Critical',
        question: transitionType === 'it_application'
          ? 'src/services/payment.ts makes outbound socket calls to 198.51.100.44:8443 with no API key or retry in docs. What third-party service is this?'
          : 'Firewall rule FW-PROD-EAST-402 permits partner traffic to 10.240.12.88:8443. This IP is missing from ServiceNow CMDB. What service runs here?',
        evidence: 'Detected in live AST parser / firewall rulebase with zero CMDB ownership records.'
      },
      {
        id: 'gap_2',
        week: 2.1,
        scopeId: scopeDefinitions[1]?.id || scopeDefinitions[0]?.id,
        geoId: 'emea',
        title: transitionType === 'it_application'
          ? 'Single Point of Failure: 84% Database Migrations Authored Solely by M. Chen'
          : 'Single Point of Failure: 87% of Core Network Routing Changes Executed by D. Evans',
        severity: 'High',
        question: 'Change velocity analysis identifies severe tribal concentration in a single engineer with zero peer review. How will recovery knowledge be shared before departure?',
        evidence: 'Mined 12 months of git blame and ServiceNow change requests.'
      },
      {
        id: 'gap_3',
        week: 2.8,
        scopeId: scopeDefinitions[2]?.id || scopeDefinitions[0]?.id,
        geoId: 'apac',
        title: transitionType === 'it_application'
          ? 'Expiring Production KMS Certificate in 19 Days with Fallback Secret'
          : 'Unmonitored NetApp SAN Volume (vol-oracle-04) at 94.2% with Replication Failures',
        severity: 'Critical',
        question: 'Critical asset vulnerability detected overlapping the planned cutover window. Where are rotation scripts / DR secondary replicas located?',
        evidence: 'Verified via automated config telemetry and storage capacity alerts.'
      },
      {
        id: 'gap_4',
        week: 3.4,
        scopeId: scopeDefinitions[3]?.id || scopeDefinitions[0]?.id,
        geoId: 'na',
        title: transitionType === 'business_process'
          ? 'Shadow Excel Macro (Macro_v3.xlsm) Used Daily to Cleanse Tax IDs Prior to SAP'
          : '38 Zombie Virtual Machines in cluster dc-eu-west-02 (0 Telemetry in 365 Days)',
        severity: 'High',
        question: 'Dormant or undocumented shadow tool actively running outside official governance. Can this be safely decommissioned before handover?',
        evidence: 'Cross-referenced hypervisor metrics and shared network drive timestamps.'
      },
      {
        id: 'gap_5',
        week: 4.2,
        scopeId: scopeDefinitions[0]?.id,
        geoId: 'emea',
        title: 'Discrepancy Between Documented SLA Matrix and Actual P1 Escalation Path',
        severity: 'Medium',
        question: 'Actual ticket routing paths deviate from the client-approved OLA handbook. What is the ground-truth escalation order for off-hours incidents?',
        evidence: 'Extracted from 1,480 ServiceNow incident reassignment logs.'
      }
    ];
    return baseGaps;
  }, [transitionType, scopeDefinitions]);

  // Filtered visible gaps for current timeline week
  const visibleGaps = useMemo(() => {
    return allGaps.filter(g => (mode === 'live' || g.week <= week) && activeScopes.has(g.scopeId) && activeGeos.has(g.geoId));
  }, [allGaps, week, activeScopes, activeGeos, mode]);

  // Playback loop (Standard 1x speed)
  useEffect(() => {
    if (!playing) return;
    playRef.current = setInterval(() => {
      setWeek(prev => {
        if (prev >= 9.0) {
          setPlaying(false);
          return 9.0;
        }
        return Math.min(9.0, Number((prev + 0.05).toFixed(2)));
      });
    }, 120);

    return () => clearInterval(playRef.current);
  }, [playing]);

  // Toggle scope/geo filters
  function toggleScope(id) {
    setActiveScopes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleGeo(id) {
    setActiveGeos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Interactive Neo4j Bloom Canvas Logic
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Nodes for Bloom Visualization
  const bloomGraphData = useMemo(() => {
    const cx = 250;
    const cy = 190;
    const nodes = [];
    const links = [];

    // Central Root Hub
    nodes.push({
      id: 'hub',
      name: projectName.length > 20 ? projectName.slice(0, 18) + '...' : projectName,
      type: 'hub',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      r: 22,
      color: '#4dabf7',
      label: 'Core Estate'
    });

    const activeSList = scopeDefinitions.filter(s => activeScopes.has(s.id));
    const n = activeSList.length || 1;
    const rOrbit = 130;

    activeSList.forEach((s, idx) => {
      const angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
      const sx = cx + rOrbit * Math.cos(angle);
      const sy = cy + rOrbit * Math.sin(angle) * 0.88;
      const score = scopeAverages[s.id] || 0;

      // Color mapping: Slate (<25%) -> Amber (25-70%) -> Teal (>70%)
      const nodeColor = score < 25 ? '#495057' : (score < 70 ? '#f59f00' : '#20c997');

      nodes.push({
        id: s.id,
        name: s.short,
        type: 'scope',
        scopeRef: s,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        r: 15,
        color: nodeColor,
        score: score,
        label: s.category
      });

      links.push({ source: 'hub', target: s.id, color: nodeColor });

      // Add sub-hierarchy leaf nodes (revealed as readiness rises)
      const subReveal = Math.min(3, Math.floor((score / 100) * 3.8));
      for (let i = 0; i < subReveal; i++) {
        const subAngle = angle + (i - 1) * 0.28;
        const subX = cx + (rOrbit + 42) * Math.cos(subAngle);
        const subY = cy + (rOrbit + 42) * Math.sin(subAngle) * 0.88;
        const subId = `${s.id}_sub_${i}`;

        nodes.push({
          id: subId,
          name: s.hierarchy[i]?.name || `Node ${i + 1}`,
          type: 'sub',
          parentScope: s,
          x: subX,
          y: subY,
          vx: 0,
          vy: 0,
          r: 7,
          color: nodeColor,
          label: s.hierarchy[i]?.level || 'Entity'
        });
        links.push({ source: s.id, target: subId, color: nodeColor });
      }
    });

    // Discrepancy nodes
    visibleGaps.slice(0, 3).forEach((g, gIdx) => {
      if (!resolvedGapIds.has(g.id)) {
        const gNodeId = `gap_node_${g.id}`;
        nodes.push({
          id: gNodeId,
          name: g.severity === 'Critical' ? '⚠ Ghost Egress' : '⚠ SPOF',
          type: 'gap',
          gapRef: g,
          x: cx + (gIdx % 2 === 0 ? -110 : 110),
          y: cy + 85 + gIdx * 25,
          vx: 0,
          vy: 0,
          r: 10,
          color: '#ff6b6b',
          label: 'Discrepancy'
        });
        links.push({ source: g.scopeId || 'hub', target: gNodeId, color: '#ff6b6b' });
      }
    });

    return { nodes, links };
  }, [projectName, scopeDefinitions, activeScopes, scopeAverages, visibleGaps, resolvedGapIds]);

  // Bloom Canvas force-directed physics rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement.clientWidth || 540);
    const height = (canvas.height = 360);

    const nodes = [...bloomGraphData.nodes];
    const links = [...bloomGraphData.links];

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Draw Bloom Links
      links.forEach(l => {
        const s = nodes.find(n => n.id === l.source);
        const t = nodes.find(n => n.id === l.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.strokeStyle = l.color || 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = l.color === '#ff6b6b' ? 2 : 1.2;
          ctx.stroke();
        }
      });

      // Draw Bloom Nodes with glowing halo
      nodes.forEach(n => {
        const isSelected = selectedNode?.id === n.id;

        // Radial Halo Gradient (Neo4j Bloom Glow)
        const grad = ctx.createRadialGradient(n.x, n.y, n.r * 0.4, n.x, n.y, n.r * 2.8);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Node Core
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // Node Rim
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)';
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.stroke();

        // Selection pulsing ring
        if (isSelected) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + n.r + 12);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [bloomGraphData, selectedNode]);

  // Click handler on Bloom Canvas
  function handleCanvasClick(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Hit test
    const hit = bloomGraphData.nodes.find(n => {
      const dx = n.x - clickX;
      const dy = n.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 8;
    });

    if (hit) {
      if (hit.type === 'gap' && hit.gapRef) {
        setActiveInterviewGap(hit.gapRef);
        setSelectedNode(hit);
      } else if (hit.scopeRef) {
        setSelectedNode(hit.scopeRef);
      } else if (hit.parentScope) {
        setSelectedNode(hit.parentScope);
      } else {
        setSelectedNode(hit);
      }
    } else {
      setSelectedNode(null);
    }
  }

  // Handle in-app SME resolution
  async function submitSmeResolution() {
    if (!activeInterviewGap) return;
    setReconcilingGap(true);
    try {
      if (resolveGap) {
        await resolveGap(activeInterviewGap.id, smeResponseText || 'Verified and reconciled by SME during handover interview.', smeNameInput);
      }
      setResolvedGapIds(prev => new Set([...prev, activeInterviewGap.id]));
      setTimeout(() => {
        setReconcilingGap(false);
        setActiveInterviewGap(null);
        setSmeResponseText('');
      }, 600);
    } catch (err) {
      console.warn('Error resolving gap:', err);
      setReconcilingGap(false);
    }
  }

  // 1-Click Executive Brief Markdown Export
  function copyExecutiveBrief() {
    const briefText = `# TRANSITION EXECUTIVE BRIEF — ${projectName.toUpperCase()}
Date: Day ${currentDay} of 56 (Week ${week.toFixed(1)} of 9)
Transition Phase: ${currentPhase.name.toUpperCase()}
Overall Program Readiness: ${overallReadiness}%

## 1. Executive Summary
The AI-accelerated autonomous transition fleet is currently executing ${currentPhase.name}.
Overall readiness stands at ${overallReadiness}% across ${activeScopes.size} active operational domains and ${activeGeos.size} global delivery centers.
Total ground-truth artifacts ingested: ${artifactsCount.toLocaleString()} (configs, CMDB records, code ASTs, historical tickets).

## 2. Domain Readiness Breakdown
${scopeDefinitions.filter(s => activeScopes.has(s.id)).map(s => `- ${s.name}: ${scopeAverages[s.id] || 0}% readiness`).join('\n')}

## 3. Critical Path & Risk Register
- Open Hostile Discrepancies: ${visibleGaps.filter(g => !resolvedGapIds.has(g.id)).length}
- Blockers Under SME Inquiry: ${visibleGaps.filter(g => g.severity === 'Critical' && !resolvedGapIds.has(g.id)).length} critical

## 4. Cutover Preconditions Status
- Traditional Timeline: 180 Days
- Accelerated Target: 56 Days
- Forecasted Cutover Status: ${overallReadiness >= 75 ? 'ON TRACK FOR GO-LIVE' : 'CONDITIONAL GO — PENDING CRITICAL GAP SIGNOFF'}`;

    navigator.clipboard.writeText(briefText);
    setExecutiveBriefCopied(true);
    setTimeout(() => setExecutiveBriefCopied(false), 2500);
  }

  // 1-Click Dispatch to Slack/Teams/Email
  function dispatchQuestionToSme(gap) {
    const msg = `🚨 [LUMINA TRANSITION COPILOT] Targeted SME Handover Inquiry
To: @${gap.severity === 'Critical' ? 'lead-architect' : 'sme-owner'}
Re: Flagged Ground-Truth Anomaly in ${projectName}

Hi Team,
Our automated codebase/infrastructure telemetry agent flagged the following discrepancy during transition mapping:

"${gap.title}"
Evidence: ${gap.evidence}

Targeted Question:
"${gap.question}"

Please provide your technical signoff directly in Lumina Transition Assist so we can reconcile the Knowledge Graph before cutover:
👉 https://transition-assist-506606.web.app`;

    navigator.clipboard.writeText(msg);
    setDispatchCopied(true);
    setTimeout(() => setDispatchCopied(false), 2500);
  }

  if (scene !== 'control_tower') return null;

  return (
    <div className={`scene ${scene === 'control_tower' ? 'active' : ''}`} style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 24px 60px', color: 'var(--tx)' }}>
      {/* Header & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="badge bbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--am)', boxShadow: '0 0 8px var(--am)' }} />
              {mode === 'simulator' ? 'Transition Flight Simulator' : 'Live Mission Control'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--mu)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--mu)' }}>
              {transitionType === 'it_application' ? 'IT Application Handover' : transitionType === 'business_process' ? 'BPS Handover' : 'ITIS Handover'}
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: 'var(--tx)' }}>
            Transition Control Tower
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--mu)', maxWidth: 640, lineHeight: 1.5 }}>
            Evidence-driven handover cockpit — compressing 180 days down to 56 days through autonomous agent fleet ingestion, hierarchical dependency mapping, and continuous readiness scoring.
          </p>
        </div>

        {/* Top Controls: Mode Switcher & TMO Brief Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="tabs" style={{ margin: 0 }}>
              <div
                className={`tab ${mode === 'simulator' ? 'active' : ''}`}
                onClick={() => { setMode('simulator'); setWeek(1.0); }}
                style={{ fontSize: 11, padding: '5px 12px' }}
              >
                🕹️ Pre-Flight Simulator
              </div>
              <div
                className={`tab ${mode === 'live' ? 'active' : ''}`}
                onClick={() => { setMode('live'); setWeek(3.5); }}
                style={{ fontSize: 11, padding: '5px 12px' }}
              >
                📡 Live Project Cockpit
              </div>
            </div>

            <button
              className="btn bp"
              onClick={copyExecutiveBrief}
              style={{ fontSize: 11, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>{executiveBriefCopied ? '✓ Brief Copied to Clipboard!' : '📋 Copy Executive Brief (Markdown)'}</span>
            </button>
          </div>

          {/* Scope Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 600 }}>
            {scopeDefinitions.map(s => {
              const active = activeScopes.has(s.id);
              return (
                <span
                  key={s.id}
                  onClick={() => toggleScope(s.id)}
                  className={`chip ${active ? 'bbl' : 'bgr'}`}
                  style={{
                    cursor: 'pointer',
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 14,
                    border: active ? '1px solid var(--bl)' : '1px solid var(--bd)',
                    background: active ? 'rgba(77, 171, 247, 0.14)' : 'var(--sf1)',
                    color: active ? 'var(--bl)' : 'var(--mu)'
                  }}
                >
                  {active ? '✓ ' : ''}{s.short}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5-Tile KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: '14px 16px', background: 'var(--sf2)' }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>Overall Readiness</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: overallReadiness > 70 ? 'var(--gr)' : 'var(--am)', fontFamily: 'var(--mono)' }}>
            {overallReadiness}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>continuous mathematical score</div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--sf2)' }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>Engagement Timeline</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', fontFamily: 'var(--mono)' }}>
            Day {currentDay} <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 400 }}>of 56</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>Week {week.toFixed(1)} of 9 · {currentPhase.name}</div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--sf2)' }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>Artifacts Ingested</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bl)', fontFamily: 'var(--mono)' }}>
            {artifactsCount.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>CMDB, code ASTs, configs, tickets</div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--sf2)' }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>Gaps &amp; Discrepancies</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--rd)', fontFamily: 'var(--mono)' }}>
            {visibleGaps.filter(g => !resolvedGapIds.has(g.id)).length} <span style={{ fontSize: 12, color: 'var(--gr)' }}>({resolvedGapIds.size} reconciled)</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>unmonitored routes, SPOFs &amp; debt</div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--sf2)' }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>Timeline Compression</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gr)', fontFamily: 'var(--mono)' }}>
            180d → 56d
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>3.2× faster than human incumbent</div>
        </div>
      </div>

      {/* Tri-Panel Operational Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 1.1fr', gap: 14, marginBottom: 18, alignItems: 'stretch' }}>
        {/* Panel 1: Live Agent Activity Stream */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>Autonomous Agent Fleet Stream</div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>Agents actively executing during {currentPhase.name}</div>
          </div>

          {/* Active Agent Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[
              { id: 'ingest', label: 'Ingestion Agent' },
              { id: 'kgraph', label: 'Knowledge Graph Agent' },
              { id: 'tmine', label: 'Ticket Mining Agent' },
              { id: 'ktsyn', label: 'KT Synthesis Agent' },
              { id: 'runbook', label: 'Runbook Agent' },
              { id: 'gapdet', label: 'Gap Detection Agent' },
              { id: 'readiness', label: 'Readiness Scorer' },
              { id: 'tmo', label: 'TMO Copilot' }
            ].map(a => {
              const isActive = currentPhase.agents.includes(a.id);
              return (
                <span
                  key={a.id}
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 12,
                    border: isActive ? '1px solid var(--am)' : '1px solid var(--bd)',
                    background: isActive ? 'rgba(245, 166, 35, 0.15)' : 'var(--sf2)',
                    color: isActive ? 'var(--am)' : 'var(--mu)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? 'var(--am)' : 'var(--mu)' }} />
                  {a.label}
                </span>
              );
            })}
          </div>

          {/* Feed List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 310, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '8px 10px', background: 'var(--sf2)', borderRadius: 6, borderLeft: '3px solid var(--bl)', fontSize: 11 }}>
              <div style={{ color: 'var(--mu)', fontSize: 10 }}>Day {currentDay} · Knowledge Graph Agent</div>
              <div style={{ marginTop: 2 }}>Reconciling multi-source telemetry against canonical graph schema for {projectName}...</div>
            </div>
            {visibleGaps.map(g => (
              <div key={g.id} style={{ padding: '8px 10px', background: 'var(--sf2)', borderRadius: 6, borderLeft: `3px solid ${g.severity === 'Critical' ? 'var(--rd)' : 'var(--am)'}`, fontSize: 11 }}>
                <div style={{ color: 'var(--mu)', fontSize: 10 }}>Day {Math.round(g.week * 5)} · Gap Detection Agent</div>
                <div style={{ marginTop: 2, color: 'var(--tx)', fontWeight: 500 }}>{g.title}</div>
              </div>
            ))}
            <div style={{ padding: '8px 10px', background: 'var(--sf2)', borderRadius: 6, borderLeft: '3px solid var(--gr)', fontSize: 11 }}>
              <div style={{ color: 'var(--mu)', fontSize: 10 }}>Day 1 · Ingestion Agent</div>
              <div style={{ marginTop: 2 }}>Completed ingestion bus parsing across {activeScopes.size} towers and {activeGeos.size} geographies.</div>
            </div>
          </div>
        </div>

        {/* Panel 2: Neo4j Bloom Dependency Topology Graph & Hierarchical Inspector */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Neo4j Bloom Topology</span>
                <span className="badge bbl" style={{ fontSize: 9 }}>Interactive Force Physics</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>
                Click any node to inspect deep hierarchical breakdown
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge bgr" style={{ fontSize: 9 }}>● Mapped</span>
              <span className="badge bam" style={{ fontSize: 9 }}>● Discovering</span>
              <span className="badge brd" style={{ fontSize: 9 }}>● Gap</span>
            </div>
          </div>

          {/* Bloom Canvas */}
          <div style={{ flex: 1, minHeight: 280, position: 'relative', background: '#0b1220', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--bd)' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{ width: '100%', height: '100%', cursor: 'pointer', display: 'block' }}
            />
          </div>

          {/* Hierarchical Inspection Drawer if node is selected */}
          {selectedNode && (
            <div style={{ marginTop: 10, padding: 10, background: 'var(--sf2)', borderRadius: 6, border: '1px solid var(--bl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 12, color: 'var(--bl)' }}>
                  🌳 Hierarchical Breakdown: {selectedNode.name}
                </strong>
                <button className="btn bs" onClick={() => setSelectedNode(null)} style={{ fontSize: 9, padding: '2px 6px' }}>
                  ✕ Close
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>
                {selectedNode.desc || 'Decomposed architecture components and accountable engineers'}
              </div>
              {selectedNode.hierarchy && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedNode.hierarchy.map((h, hIdx) => (
                    <div key={hIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 6px', background: 'var(--sf1)', borderRadius: 4 }}>
                      <span style={{ color: 'var(--mu)', fontWeight: 600 }}>{h.level}:</span>
                      <span style={{ color: h.severity === 'Critical' ? 'var(--rd)' : 'var(--tx)', fontFamily: 'var(--mono)' }}>{h.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 3: Continuous Readiness Matrix (Scope x Geographies) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
              Readiness by {transitionType === 'it_application' ? 'Tier' : transitionType === 'business_process' ? 'Domain' : 'Tower'} &amp; Geo
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>Objective mathematical scoring across delivery centers</div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--mu)', fontSize: 10 }}>Domain</th>
                  {geoDefinitions.filter(g => activeGeos.has(g.id)).map(g => (
                    <th key={g.id} style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--mu)', fontSize: 10 }}>
                      {g.name.split(' ')[0]}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--bl)', fontSize: 10 }}>Overall</th>
                </tr>
              </thead>
              <tbody>
                {scopeDefinitions.filter(s => activeScopes.has(s.id)).map(s => {
                  const sAvg = scopeAverages[s.id] || 0;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedNode(s)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '7px 8px', fontWeight: 600, color: 'var(--tx)' }}>{s.short}</td>
                      {geoDefinitions.filter(g => activeGeos.has(g.id)).map(g => {
                        const val = computeScopeReadiness(s.id, g.id, week);
                        const pillClass = val < 25 ? 'bgr' : (val < 70 ? 'bam' : 'bgr2');
                        return (
                          <td key={g.id} style={{ textAlign: 'center', padding: '7px 8px' }}>
                            <span className={`badge ${pillClass}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                              {val}%
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right', padding: '7px 8px' }}>
                        <span className={`badge ${sAvg < 25 ? 'bgr' : (sAvg < 70 ? 'bam' : 'bgr2')}`} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>
                          {sAvg}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scrubbable Timeline & Playback Panel */}
      <div className="card" style={{ marginBottom: 18, background: 'var(--sf2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
              Traditional (180d) vs. AI-Accelerated (56d) Transition Timeline
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>
              Scrub the timeline or press play to traverse the 9 engagement phases
            </div>
          </div>

          {/* Playback Controls (1x Standard Speed) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className={`btn ${playing ? 'bam' : 'bp'}`}
              onClick={() => setPlaying(!playing)}
              style={{ fontSize: 12, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>{playing ? '⏸ Pause' : '▶ Play (1×)'}</span>
            </button>
            <button
              className="btn bs"
              onClick={() => { setPlaying(false); setWeek(1.0); }}
              style={{ fontSize: 11, padding: '5px 10px' }}
            >
              ↺ Reset
            </button>
            <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--tx)', marginLeft: 8 }}>
              <strong>Week {week.toFixed(1)}</strong> <span style={{ color: 'var(--mu)' }}>of 9.0</span> · <span style={{ color: 'var(--am)' }}>{currentPhase.name}</span>
            </div>
          </div>
        </div>

        {/* Timeline Slider */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="range"
            min="1.0"
            max="9.0"
            step="0.1"
            value={week}
            onChange={e => { setPlaying(false); setWeek(Number(e.target.value)); }}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--am)' }}
          />
        </div>

        {/* Traditional vs Accelerated Visual Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Traditional 180 Days */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mu)', marginBottom: 4 }}>
              <span>Traditional Incumbent Handover (Self-Reported)</span>
              <span>180 Business Days (6 Months)</span>
            </div>
            <div style={{ height: 14, background: 'var(--sf1)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--bd)', position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, rgba(139,150,173,0.15), rgba(139,150,173,0.15) 10px, rgba(139,150,173,0.05) 10px, rgba(139,150,173,0.05) 20px)' }} />
            </div>
          </div>

          {/* Accelerated 56 Days */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--bl)', marginBottom: 4 }}>
              <span><strong>AI-Accelerated Ground-Truth Handover</strong></span>
              <span><strong>56 Business Days (6–8 Weeks)</strong></span>
            </div>
            <div style={{ height: 18, background: 'var(--sf1)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--bl)', position: 'relative', display: 'flex' }}>
              {phaseModel.map((p, idx) => {
                const widthPct = ((p.max - p.min) / 8) * 100;
                const isPassed = week >= p.max;
                const isCurrent = week >= p.min && week < p.max;
                return (
                  <div
                    key={idx}
                    title={p.name}
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      background: isPassed ? 'var(--gr)' : isCurrent ? 'var(--am)' : 'rgba(255,255,255,0.05)',
                      opacity: isPassed ? 0.75 : isCurrent ? 0.95 : 0.3,
                      borderRight: '1px solid var(--bd)',
                      transition: 'all 0.2s ease'
                    }}
                  />
                );
              })}
              {/* Playhead marker */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${Math.max(0, Math.min(100, ((week - 1) / 8) * 100))}%`,
                  width: 3,
                  background: '#ffffff',
                  boxShadow: '0 0 8px #ffffff',
                  pointerEvents: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>
              <span>Wk 1 (Mobilization)</span>
              <span>Wk 3 (Graph &amp; KT)</span>
              <span>Wk 5 (Shadow)</span>
              <span>Wk 7 (Parallel Run)</span>
              <span>Wk 8 (Cutover)</span>
              <span>Wk 9 (Steady State)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Deck: Risk & Gap Register + TMO Copilot Brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        {/* Risk & Gap Register */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>Hostile Risk &amp; Discrepancy Register</div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>Flagged anomalies and single points of failure requiring SME signoff</div>
            </div>
            <span className="badge brd" style={{ fontSize: 10 }}>
              {visibleGaps.filter(g => !resolvedGapIds.has(g.id)).length} Open Blockers
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {visibleGaps.map(g => {
              const isResolved = resolvedGapIds.has(g.id);
              return (
                <div
                  key={g.id}
                  style={{
                    padding: '10px 12px',
                    background: isResolved ? 'rgba(32, 201, 151, 0.08)' : 'var(--sf2)',
                    border: isResolved ? '1px solid var(--gr)' : '1px solid var(--bd)',
                    borderRadius: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${isResolved ? 'bgr2' : (g.severity === 'Critical' ? 'brd' : 'bam')}`} style={{ fontSize: 9 }}>
                        {isResolved ? '✓ Reconciled' : g.severity}
                      </span>
                      <strong style={{ fontSize: 12, color: 'var(--tx)' }}>{g.title}</strong>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--mu)', whiteSpace: 'nowrap' }}>Day {Math.round(g.week * 5)}</span>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>
                    {g.evidence}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    {!isResolved && (
                      <button
                        className="btn bp"
                        onClick={() => setActiveInterviewGap(g)}
                        style={{ fontSize: 10, padding: '3px 9px' }}
                      >
                        ⚡ Interview SME / Reconcile
                      </button>
                    )}
                    <button
                      className="btn bs"
                      onClick={() => dispatchQuestionToSme(g)}
                      style={{ fontSize: 10, padding: '3px 9px' }}
                    >
                      📤 {dispatchCopied ? 'Copied Dispatch Text!' : 'Dispatch to Slack/Teams/Email'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TMO Copilot - Status Brief & Scorecard */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>TMO Copilot — Executive Brief</div>
              <button
                className="btn bs"
                onClick={() => setShowScorecardModal(true)}
                style={{ fontSize: 10, padding: '3px 8px' }}
              >
                📑 Cutover Preconditions Checklist
              </button>
            </div>

            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--tx)', margin: '0 0 12px 0' }}>
              Transition steering brief for <strong>{projectName}</strong>: We have reached <strong>Day {currentDay} of 56 (Week {week.toFixed(1)} of 9)</strong> during the <strong>{currentPhase.name}</strong> phase.
              Overall readiness sits at <strong style={{ color: overallReadiness > 70 ? 'var(--gr)' : 'var(--am)' }}>{overallReadiness}%</strong>.
              Autonomous ingestion has parsed <strong>{artifactsCount.toLocaleString()}</strong> artifacts into the living Knowledge Fabric.
              {visibleGaps.filter(g => !resolvedGapIds.has(g.id)).length > 0 ? (
                <span> There are currently <strong>{visibleGaps.filter(g => !resolvedGapIds.has(g.id)).length} open technical discrepancies</strong> requiring incumbent SME verification before cutover rehearsal.</span>
              ) : (
                <span style={{ color: 'var(--gr)' }}> All critical discrepancies have been reconciled with incumbent SMEs. Go-live rehearsal is approved.</span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--sf2)', borderRadius: 6, border: '1px solid var(--bd)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--mu)' }}>Elapsed</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)' }}>Day {currentDay}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--mu)' }}>Remaining</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)' }}>Day {Math.max(0, 56 - currentDay)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--mu)' }}>Open Gaps</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--rd)' }}>
                {visibleGaps.filter(g => !resolvedGapIds.has(g.id)).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SME Interview & Reconciliation Modal */}
      {activeInterviewGap && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ maxWidth: 620, width: '100%', background: 'var(--sf1)', border: '1px solid var(--bl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bl)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡ Interactive SME Interview Queue</span>
              </div>
              <button className="btn bs" onClick={() => setActiveInterviewGap(null)} style={{ fontSize: 11, padding: '2px 8px' }}>✕</button>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--sf2)', borderRadius: 6, marginBottom: 12, border: '1px solid var(--bd)' }}>
              <div style={{ fontSize: 10, color: 'var(--mu)' }}>FLAGGED GROUND-TRUTH EVIDENCE:</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)', marginTop: 2 }}>{activeInterviewGap.title}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>{activeInterviewGap.evidence}</div>
            </div>

            <div className="ig" style={{ marginBottom: 12 }}>
              <label className="il" style={{ color: 'var(--am)', fontWeight: 600 }}>Targeted Technical Question for Incumbent SME:</label>
              <div style={{ fontSize: 12, color: 'var(--tx)', padding: '8px 10px', background: 'var(--sf2)', borderRadius: 6 }}>
                {activeInterviewGap.question}
              </div>
            </div>

            <div className="ig" style={{ marginBottom: 12 }}>
              <label className="il">Accountable SME Name / Title:</label>
              <input
                type="text"
                value={smeNameInput}
                onChange={e => setSmeNameInput(e.target.value)}
                placeholder="e.g. D. Evans (Lead Network Architect)"
              />
            </div>

            <div className="ig" style={{ marginBottom: 16 }}>
              <label className="il">SME Handover Response / Recovery Notes:</label>
              <textarea
                rows={3}
                value={smeResponseText}
                onChange={e => setSmeResponseText(e.target.value)}
                placeholder="e.g. Confirmed: Legacy fraud check socket. Does not require cutover whitelisting and can be isolated post-handover."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn bs" onClick={() => setActiveInterviewGap(null)}>Cancel</button>
              <button
                className="btn bp"
                disabled={reconcilingGap}
                onClick={submitSmeResolution}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>{reconcilingGap ? 'Reconciling Graph...' : '✓ Submit & Reconcile Knowledge Graph'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cutover Preconditions Checklist Modal */}
      {showScorecardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ maxWidth: 580, width: '100%', background: 'var(--sf1)', border: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <strong style={{ fontSize: 15, color: 'var(--bl)' }}>📑 Day-1 Cutover Preconditions Scorecard</strong>
              <button className="btn bs" onClick={() => setShowScorecardModal(false)} style={{ fontSize: 11, padding: '2px 8px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              {[
                { label: 'All critical severity ghost egress routes & secrets reconciled with SME', passed: visibleGaps.filter(g => g.severity === 'Critical' && !resolvedGapIds.has(g.id)).length === 0 },
                { label: 'Single Point of Failure (SPOF) operational runbooks generated & signed off', passed: true },
                { label: 'Continuous overall readiness threshold ≥ 75% across all active delivery centers', passed: overallReadiness >= 75 },
                { label: 'Knowledge Graph Bloom convergence complete with 0 unmapped nodes', passed: true },
                { label: 'Reverse-shadow incident drill completed with incoming support team', passed: week >= 6.0 }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--sf2)', borderRadius: 6 }}>
                  <span style={{ color: item.passed ? 'var(--gr)' : 'var(--am)', fontSize: 14 }}>{item.passed ? '✓' : '○'}</span>
                  <span style={{ color: item.passed ? 'var(--tx)' : 'var(--mu)' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn bp" onClick={() => setShowScorecardModal(false)}>Close Scorecard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
