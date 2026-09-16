import React, { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';

export default function DynamicTransitionInputs({ transitionType, onBack }) {
  const { startAgenticAnalysis } = useApp();

  // Common fields
  const [projectName, setProjectName] = useState('');
  const [selectedGeos, setSelectedGeos] = useState(['North America', 'EMEA']);

  // IT Application fields
  const [repoUrl, setRepoUrl] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [appScope, setAppScope] = useState('Cloud-Native Microservices');
  const [appAdapter, setAppAdapter] = useState('github');
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraToken, setJiraToken] = useState('');

  // IT Application: ITSM & Architecture Uploads
  const [appItsmTab, setAppItsmTab] = useState('upload'); // 'upload' | 'snow'
  const [appSnowHost, setAppSnowHost] = useState('acme-corp.service-now.com');
  const [appSnowUser, setAppSnowUser] = useState('admin_api');
  const [appSnowPass, setAppSnowPass] = useState('••••••••');
  const [appSnowGroup, setAppSnowGroup] = useState('Core Payment Platform L2/L3 Support');
  const [appSnowConnected, setAppSnowConnected] = useState(true);

  // ITIS Selected Towers
  const [itisScopes, setItisScopes] = useState([
    'Network & Security',
    'Cloud & Virtualization',
    'Storage & Backup',
    'Service Desk & EUC'
  ]);

  // BPS Selected Towers
  const [bpsScopes, setBpsScopes] = useState([
    'Finance & Accounting (P2P / O2C)',
    'Customer Operations & Support'
  ]);

  // Adapter States per Tower
  const [adapterConfigs, setAdapterConfigs] = useState({
    network: {
      provider: 'palo_alto',
      host: 'https://panorama-prod.corp.internal:443',
      token: '••••••••••••••••••••••••',
      scope: 'US-EAST-VPC-FIREWALL',
      mode: 'api',
      connected: true
    },
    cloud: {
      provider: 'aws',
      accountOrTenant: '782910394812 (AWS Production)',
      credentials: 'arn:aws:iam::782910394812:role/TransitionAuditRole',
      regions: 'us-east-1, eu-west-1',
      mode: 'api',
      connected: true
    },
    storage: {
      provider: 'netapp',
      host: 'https://ontap-mgmt-01.storage.internal',
      token: 'netapp_admin_token_prod',
      volumeFilter: 'vol_prod_*, vol_oracle_*',
      mode: 'api',
      connected: true
    },
    compute: {
      provider: 'vmware',
      host: 'https://vcenter.datacenter.internal/sdk',
      token: 'administrator@vsphere.local',
      cluster: 'Cluster-EU-West-02',
      mode: 'api',
      connected: false
    },
    servicedesk: {
      provider: 'servicenow',
      host: 'acme-corp.service-now.com',
      token: 'admin_oauth_token_v3',
      assignmentGroup: 'Global Infrastructure Support',
      mode: 'api',
      connected: true
    },
    database: {
      provider: 'oracle',
      host: 'oracle-oem.prod.internal:1158/em',
      token: 'oem_sysman_token',
      targetDbs: 'PROD_ERP_DB, FIN_SETTLE_DB',
      mode: 'api',
      connected: false
    },
    finance: {
      provider: 'sap_s4hana',
      host: 'https://sap-s4hana.corp.acme.com:8001/sap/opu/odata',
      clientId: '100 (Production ERP)',
      userToken: 'RFC_TRANSITION_USER',
      mode: 'api',
      connected: true
    },
    customer_ops: {
      provider: 'salesforce',
      host: 'https://acme-support.my.salesforce.com',
      clientId: '3MVG9...ConnectedApp',
      userToken: 'sf_oauth_refresh_token',
      mode: 'api',
      connected: true
    },
    supply_chain: {
      provider: 'sap_ariba',
      host: 'https://s1-2.ariba.com/Buyer/v1/acme',
      apiKey: 'ariba_p2p_audit_api_key',
      mode: 'api',
      connected: false
    },
    hr: {
      provider: 'workday',
      host: 'https://wd5-impl.workday.com/ccx/api/v1/acme',
      apiKey: 'wd_hcm_integration_token',
      mode: 'api',
      connected: false
    }
  });

  // Staged Uploaded Files (Co-existing with API Adapters)
  const [uploadedFiles, setUploadedFiles] = useState({
    // IT Application files
    app_tickets: null,
    architecture_docs: null,
    code_archive: null,
    // ITIS tower files
    network: null,
    cloud: null,
    storage: null,
    servicedesk: null,
    compute: null,
    database: null,
    // BPS domain files
    finance: null,
    customer_ops: null,
    supply_chain: null,
    hr: null
  });

  const geoOptions = ['North America', 'EMEA', 'APAC', 'LATAM', 'Global Delivery Center'];

  const itisScopeOptions = [
    { id: 'Network & Security', desc: 'Firewalls, Routers, SD-WAN, VPNs, ACLs, DNS/DHCP', key: 'network' },
    { id: 'Cloud & Virtualization', desc: 'AWS, Azure, GCP, VMware clusters, Terraform/Bicep', key: 'cloud' },
    { id: 'Storage & Backup', desc: 'SAN/NAS, NetApp, Veeam, Commvault, DR replication', key: 'storage' },
    { id: 'Data Center & Compute', desc: 'Bare-metal, Windows/Linux server fleets, Hyper-V', key: 'compute' },
    { id: 'Service Desk & EUC', desc: 'Incident triage, Service Catalog, Endpoint fleet', key: 'servicedesk' },
    { id: 'Database & Middleware', desc: 'Oracle, MS SQL, PostgreSQL, MQ, Kafka, WebLogic', key: 'database' }
  ];

  const bpsScopeOptions = [
    { id: 'Finance & Accounting (P2P / O2C)', desc: 'Accounts Payable, General Ledger, Billing, Payroll', key: 'finance' },
    { id: 'Customer Operations & Support', desc: 'Contact center queues, escalations, omnichannel tickets', key: 'customer_ops' },
    { id: 'Supply Chain & Procurement', desc: 'Purchase orders, vendor onboarding, logistics, inventory', key: 'supply_chain' },
    { id: 'HR & Talent Operations', desc: 'Employee onboarding, benefits administration, queries', key: 'hr' }
  ];

  function toggleScope(scope, currentList, setList) {
    if (currentList.includes(scope)) {
      if (currentList.length > 1) setList(currentList.filter(s => s !== scope));
    } else {
      setList([...currentList, scope]);
    }
  }

  function toggleGeo(geo) {
    if (selectedGeos.includes(geo)) {
      if (selectedGeos.length > 1) setSelectedGeos(selectedGeos.filter(g => g !== geo));
    } else {
      setSelectedGeos([...selectedGeos, geo]);
    }
  }

  function updateAdapter(key, field, val) {
    setAdapterConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val
      }
    }));
  }

  function handleFileSelect(slotKey, file) {
    if (!file) return;
    setUploadedFiles(prev => ({
      ...prev,
      [slotKey]: {
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toLocaleTimeString(),
        custom: true
      }
    }));
  }

  function attachSampleDump(slotKey) {
    const sampleMap = {
      app_tickets: {
        name: 'acme_prod_itsm_tickets_2025.csv',
        size: '2.4 MB',
        records: '1,420 incident tickets',
        category: 'ITSM Incident Export'
      },
      architecture_docs: {
        name: 'payment_platform_hld_v4.2.pdf',
        size: '3.8 MB',
        records: '24 pages (HLD & LLD Architecture Spec)',
        category: 'Architecture Documentation'
      },
      code_archive: {
        name: 'payment-microservices-master.zip',
        size: '14.2 MB',
        records: '84 source files (TypeScript / Node)',
        category: 'Codebase Archive'
      },
      network: {
        name: 'palo_alto_running_config_v11.xml',
        size: '1.8 MB',
        records: '312 firewall rules, 18 zones, 42 NAT policies',
        category: 'Firewall Rulebase XML'
      },
      cloud: {
        name: 'terraform_aws_landing_zone.tf',
        size: '420 KB',
        records: '184 resources, 14 subnets, VPC peering',
        category: 'Terraform State & HCL'
      },
      storage: {
        name: 'netapp_ontap_volume_inventory.csv',
        size: '860 KB',
        records: '48 LUNs, 420 TB allocated, Veeam snapshots',
        category: 'SAN / NAS Volume Inventory'
      },
      servicedesk: {
        name: 'servicenow_p1_p2_incidents_365d.csv',
        size: '3.1 MB',
        records: '1,480 change requests & P1/P2 tickets',
        category: 'ITSM Incident Telemetry'
      },
      compute: {
        name: 'vsphere_cluster_vms_audit.csv',
        size: '540 KB',
        records: '180 VMs, 24 ESXi hosts, CPU/RAM telemetry',
        category: 'Server Fleet Inventory'
      },
      database: {
        name: 'oracle_oem_schema_catalog.sql',
        size: '1.2 MB',
        records: '42 schemas, 18 RAC nodes, DB links',
        category: 'Schema & DDL Dump'
      },
      finance: {
        name: 'sap_gl_accounts_payable_dump.csv',
        size: '4.2 MB',
        records: '12,400 ledger entries, Macro_v3.xlsm audit',
        category: 'General Ledger Journal'
      },
      customer_ops: {
        name: 'salesforce_cases_export_2025.csv',
        size: '2.8 MB',
        records: '4,200 case resolutions, omnichannel queue',
        category: 'CRM Queue Telemetry'
      },
      supply_chain: {
        name: 'ariba_purchase_orders_journal.csv',
        size: '3.5 MB',
        records: '6,800 PO lines, vendor catalogs',
        category: 'P2P Purchase Order Export'
      },
      hr: {
        name: 'workday_onboarding_incidents.csv',
        size: '1.1 MB',
        records: '850 employee lifecycle tickets',
        category: 'HR Query Records'
      }
    };

    if (sampleMap[slotKey]) {
      setUploadedFiles(prev => ({
        ...prev,
        [slotKey]: sampleMap[slotKey]
      }));
    }
  }

  function prefillRealisticCredentials() {
    setProjectName(
      transitionType === 'itis' ? 'Global Core Infrastructure & Datacenter Handover' :
      transitionType === 'business_process' ? 'Enterprise Finance P2P & Customer Operations' :
      'Core Payment & Auth Microservices Platform'
    );

    if (transitionType === 'it_application') {
      setRepoUrl('https://github.com/sudiptosaha1learning/Transition-Assist-Sep16.git');
      setGitToken('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');
      setJiraDomain('acme-corp.atlassian.net');
      setJiraToken('ATATT3x_prod_api_token');
      setAppSnowHost('acme-corp.service-now.com');
      setAppSnowUser('admin_api');
      setAppSnowGroup('Core Payment Platform L2/L3 Support');
      setAppSnowConnected(true);

      // Attach sample files for IT Application
      attachSampleDump('app_tickets');
      attachSampleDump('architecture_docs');
    } else if (transitionType === 'itis') {
      // Attach sample dump files for all selected ITIS towers
      attachSampleDump('network');
      attachSampleDump('cloud');
      attachSampleDump('storage');
      attachSampleDump('servicedesk');
      attachSampleDump('compute');
      attachSampleDump('database');
    } else if (transitionType === 'business_process') {
      attachSampleDump('finance');
      attachSampleDump('customer_ops');
      attachSampleDump('supply_chain');
      attachSampleDump('hr');
    }

    // Connect all adapters
    setAdapterConfigs(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], connected: true };
      });
      return next;
    });
  }

  function handleLaunch() {
    const pName = projectName.trim() || (
      transitionType === 'itis' ? 'Global Enterprise ITIS Transition' :
      transitionType === 'business_process' ? 'Finance & Operations BPS Transition' :
      (repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Core Application Transition')
    );

    const activeTowerKeys = transitionType === 'itis'
      ? itisScopeOptions.filter(o => itisScopes.includes(o.id)).map(o => o.key)
      : bpsScopeOptions.filter(o => bpsScopes.includes(o.id)).map(o => o.key);

    const relevantAdapters = {};
    activeTowerKeys.forEach(k => {
      if (adapterConfigs[k]) relevantAdapters[k] = adapterConfigs[k];
    });

    if (transitionType === 'it_application') {
      relevantAdapters.servicedesk = {
        provider: 'servicenow',
        host: appSnowHost,
        username: appSnowUser,
        assignmentGroup: appSnowGroup,
        connected: appSnowConnected,
        mode: 'api'
      };
    }

    const relevantFiles = {};
    if (transitionType === 'itis') {
      activeTowerKeys.forEach(k => {
        if (uploadedFiles[k]) relevantFiles[k] = [uploadedFiles[k]];
      });
    } else if (transitionType === 'business_process') {
      activeTowerKeys.forEach(k => {
        if (uploadedFiles[k]) relevantFiles[k] = [uploadedFiles[k]];
      });
    } else {
      // IT Application files
      if (uploadedFiles.app_tickets) relevantFiles.app_tickets = [uploadedFiles.app_tickets];
      if (uploadedFiles.servicedesk) relevantFiles.servicedesk = [uploadedFiles.servicedesk];
      if (uploadedFiles.architecture_docs) relevantFiles.architecture_docs = [uploadedFiles.architecture_docs];
      if (uploadedFiles.code_archive) relevantFiles.code_archive = [uploadedFiles.code_archive];
    }

    const config = {
      project_name: pName,
      transition_type: transitionType,
      scopes: transitionType === 'itis' ? itisScopes : transitionType === 'business_process' ? bpsScopes : [appScope],
      geos: selectedGeos,
      repo_url: repoUrl,
      git_token: gitToken,
      adapters: relevantAdapters,
      uploaded_files: relevantFiles,
      app_adapter: appAdapter,
      jira: { domain: jiraDomain, token: jiraToken },
      itsm: {
        host: appSnowHost,
        username: appSnowUser,
        assignmentGroup: appSnowGroup,
        tickets_uploaded: !!uploadedFiles.app_tickets
      }
    };

    startAgenticAnalysis(config);
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '10px 0 40px 0' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn bs" onClick={onBack} style={{ fontSize: 12, padding: '5px 12px' }}>
            ← Back to Transition Scope
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)' }}>
              {transitionType === 'itis' && 'Configure IT Infrastructure Services (ITIS) Transition'}
              {transitionType === 'business_process' && 'Configure Business Process Support (BPS) Transition'}
              {transitionType === 'it_application' && 'Configure IT Application Transition'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>
              Connect live enterprise system adapters OR upload telemetry dump files. Both work simultaneously for deep agentic analysis.
            </div>
          </div>
        </div>
        <button
          className="btn bs"
          onClick={prefillRealisticCredentials}
          style={{ fontSize: 11, padding: '7px 14px', background: 'var(--bl2)', color: 'var(--bl)', borderColor: 'var(--bl)', fontWeight: 600 }}
        >
          ⚡ Pre-fill All Realistic Adapters &amp; Attach Dumps
        </button>
      </div>

      {/* Project Identity */}
      <div className="card" style={{ marginBottom: 16, background: 'var(--sf2)' }}>
        <div className="ig">
          <label className="il">Transition Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder={
              transitionType === 'itis' ? 'e.g. Acme Corp Global Infrastructure Handover' :
              transitionType === 'business_process' ? 'e.g. Apex Global Operations & AP Transition' :
              'e.g. Petstore E-Commerce Platform'
            }
          />
        </div>

        {/* Target Geographies */}
        <div style={{ marginTop: 12 }}>
          <label className="il" style={{ marginBottom: 6 }}>Target Geographies (Parallel Multi-Geo Ingestion Fleet)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {geoOptions.map(geo => {
              const active = selectedGeos.includes(geo);
              return (
                <span
                  key={geo}
                  onClick={() => toggleGeo(geo)}
                  className={`badge ${active ? 'bbl' : 'bgr'}`}
                  style={{
                    cursor: 'pointer',
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    border: active ? '1px solid var(--bl)' : '1px solid var(--bd)',
                    background: active ? 'rgba(77, 171, 247, 0.15)' : 'var(--sf1)'
                  }}
                >
                  {active ? '✓ ' : '+ '}{geo}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* TOWER SCOPE SELECTION (ITIS) */}
      {transitionType === 'itis' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
              1. Select Infrastructure Towers in Scope
            </div>
            <span style={{ fontSize: 11, color: 'var(--mu)' }}>
              Adapters and file dropzones below will dynamically adjust to your selection
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {itisScopeOptions.map(s => {
              const active = itisScopes.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleScope(s.id, itisScopes, setItisScopes)}
                  style={{
                    border: active ? '2px solid var(--bl)' : '1px solid var(--bd)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: active ? 'rgba(77, 171, 247, 0.08)' : 'var(--sf1)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: active ? 'var(--bl)' : 'var(--tx)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.id}</span>
                    <span>{active ? '✓' : ''}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BPS SCOPE SELECTION */}
      {transitionType === 'business_process' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
              1. Select Business Process Domains in Scope
            </div>
            <span style={{ fontSize: 11, color: 'var(--mu)' }}>
              Enterprise ERP adapters and process queue dump dropzones adjust to your selection
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {bpsScopeOptions.map(s => {
              const active = bpsScopes.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleScope(s.id, bpsScopes, setBpsScopes)}
                  style={{
                    border: active ? '2px solid var(--bl)' : '1px solid var(--bd)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: active ? 'rgba(77, 171, 247, 0.08)' : 'var(--sf1)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: active ? 'var(--bl)' : 'var(--tx)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.id}</span>
                    <span>{active ? '✓' : ''}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DUAL INPUTS: ADAPTERS & FILE UPLOADS (ITIS) */}
      {transitionType === 'itis' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
                2. Enterprise System Adapters &amp; Telemetry File Dumps (Per Selected Tower)
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                Connect directly to live controller APIs OR supply configuration/telemetry dump files. Both capabilities co-exist cleanly.
              </div>
            </div>
            <span className="badge bgr" style={{ fontSize: 11 }}>
              {itisScopes.length} Active Tower Connectors
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Network Tower */}
            {itisScopes.includes('Network & Security') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🛡️</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Network &amp; Security Tower</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Firewalls, Routers, ACLs &amp; Dark Egress Rules</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('network')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach Palo Alto Config Dump
                    </button>
                    <span className={`badge ${adapterConfigs.network.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.network.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                {/* Sub-section 1: Live API Adapter */}
                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System API Adapter</span>
                    <select
                      value={adapterConfigs.network.provider}
                      onChange={e => updateAdapter('network', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="palo_alto">Palo Alto Panorama API</option>
                      <option value="cisco_meraki">Cisco Meraki Dashboard API</option>
                      <option value="fortigate">FortiGate REST API</option>
                      <option value="infoblox">Infoblox IPAM / DNS API</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Panorama / Controller Endpoint</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.network.host}
                        onChange={e => updateAdapter('network', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>API Key / Token</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.network.token}
                        onChange={e => updateAdapter('network', 'token', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Device Group / Scope</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.network.scope}
                        onChange={e => updateAdapter('network', 'scope', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-section 2: Config / Telemetry File Upload */}
                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 Offline Configuration &amp; Telemetry Dump (.xml, .conf, .cfg, .json)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".xml,.conf,.cfg,.json,.txt"
                      onChange={e => handleFileSelect('network', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.network && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.network.name} ({uploadedFiles.network.size} · {uploadedFiles.network.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cloud & Virtualization Tower */}
            {itisScopes.includes('Cloud & Virtualization') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>☁️</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Cloud &amp; Virtualization Tower</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Tenancy Subscriptions, IAM Roles &amp; Terraform State</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('cloud')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach Terraform State (.tf)
                    </button>
                    <span className={`badge ${adapterConfigs.cloud.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.cloud.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                {/* Sub-section 1: Live API Adapter */}
                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System API Adapter</span>
                    <select
                      value={adapterConfigs.cloud.provider}
                      onChange={e => updateAdapter('cloud', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="aws">AWS (Cross-Account IAM Role / STS)</option>
                      <option value="azure">Azure Resource Graph (Service Principal)</option>
                      <option value="gcp">Google Cloud Asset Inventory API</option>
                      <option value="vmware">VMware vCenter API</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Cloud Account / Tenant ID</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.cloud.accountOrTenant}
                        onChange={e => updateAdapter('cloud', 'accountOrTenant', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Audit Role ARN / Secret</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.cloud.credentials}
                        onChange={e => updateAdapter('cloud', 'credentials', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Target Regions</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.cloud.regions}
                        onChange={e => updateAdapter('cloud', 'regions', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-section 2: Config / Telemetry File Upload */}
                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 Terraform State, ARM / Bicep, or CloudFormation Dumps (.tf, .tfvars, .json, .yaml)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".tf,.tfvars,.json,.yaml,.yml,.bicep"
                      onChange={e => handleFileSelect('cloud', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.cloud && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.cloud.name} ({uploadedFiles.cloud.size} · {uploadedFiles.cloud.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Storage & Backup Tower */}
            {itisScopes.includes('Storage & Backup') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💾</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Storage &amp; Backup Tower</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>SAN/NAS Arrays, Snapshot Schedules &amp; DR Replication</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('storage')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach NetApp Volume Dump (.csv)
                    </button>
                    <span className={`badge ${adapterConfigs.storage.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.storage.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System API Adapter</span>
                    <select
                      value={adapterConfigs.storage.provider}
                      onChange={e => updateAdapter('storage', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="netapp">NetApp ONTAP REST API</option>
                      <option value="veeam">Veeam Backup &amp; Replication REST API</option>
                      <option value="commvault">Commvault Web Console API</option>
                      <option value="pure">Pure Storage FlashArray API</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Storage Appliance Host / API URL</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.storage.host}
                        onChange={e => updateAdapter('storage', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Management Token / Secret</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.storage.token}
                        onChange={e => updateAdapter('storage', 'token', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Volume / Job Filters</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.storage.volumeFilter}
                        onChange={e => updateAdapter('storage', 'volumeFilter', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 SAN Volume Map, LUN Inventory, or Veeam Replication Export (.csv, .xlsx, .json)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json,.txt"
                      onChange={e => handleFileSelect('storage', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.storage && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.storage.name} ({uploadedFiles.storage.size} · {uploadedFiles.storage.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Service Desk Tower */}
            {itisScopes.includes('Service Desk & EUC') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🎧</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Service Desk &amp; ITSM Tower</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Incident Velocity, Ticket Telemetry &amp; Change Request Bottlenecks</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('servicedesk')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach ServiceNow Incident Dump (.csv)
                    </button>
                    <span className={`badge ${adapterConfigs.servicedesk.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.servicedesk.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System API Adapter</span>
                    <select
                      value={adapterConfigs.servicedesk.provider}
                      onChange={e => updateAdapter('servicedesk', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="servicenow">ServiceNow (REST Table API &amp; CMDB)</option>
                      <option value="jira_sm">Jira Service Management API</option>
                      <option value="pagerduty">PagerDuty On-Call &amp; Incidents</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>ServiceNow Instance URL</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.servicedesk.host}
                        onChange={e => updateAdapter('servicedesk', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>OAuth Token / Secret</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.servicedesk.token}
                        onChange={e => updateAdapter('servicedesk', 'token', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Target Assignment Group</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.servicedesk.assignmentGroup}
                        onChange={e => updateAdapter('servicedesk', 'assignmentGroup', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 Incident &amp; Change Request Ticket Dump (.csv, .xlsx, .json)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={e => handleFileSelect('servicedesk', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.servicedesk && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.servicedesk.name} ({uploadedFiles.servicedesk.size} · {uploadedFiles.servicedesk.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Center & Compute Tower */}
            {itisScopes.includes('Data Center & Compute') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🖥️</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Data Center &amp; Server Fleet Tower</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Bare-Metal, ESXi Clusters &amp; Windows/Linux Inventory</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('compute')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach vSphere Fleet Dump (.csv)
                    </button>
                    <span className={`badge ${adapterConfigs.compute.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.compute.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System API Adapter</span>
                    <select
                      value={adapterConfigs.compute.provider}
                      onChange={e => updateAdapter('compute', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="vmware">VMware vSphere / ESXi</option>
                      <option value="ansible">Red Hat Ansible Automation Platform</option>
                      <option value="winadmin">Windows Admin Center / WinRM</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Host / Control Plane URL</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.compute.host}
                        onChange={e => updateAdapter('compute', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Admin Credentials / Token</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.compute.token}
                        onChange={e => updateAdapter('compute', 'token', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Target Cluster / Pool</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.compute.cluster}
                        onChange={e => updateAdapter('compute', 'cluster', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 Server Fleet Inventory Export (.csv, .xlsx, .yaml)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.yaml,.yml"
                      onChange={e => handleFileSelect('compute', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.compute && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.compute.name} ({uploadedFiles.compute.size} · {uploadedFiles.compute.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Database Tower */}
            {itisScopes.includes('Database & Middleware') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🗄️</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Database &amp; Middleware Tower</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Oracle RAC, RDS Instances, Kafka Brokers &amp; Schemas</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('database')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach Oracle OEM Catalog (.sql)
                    </button>
                    <span className={`badge ${adapterConfigs.database.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.database.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System API Adapter</span>
                    <select
                      value={adapterConfigs.database.provider}
                      onChange={e => updateAdapter('database', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="oracle">Oracle Enterprise Manager (OEM)</option>
                      <option value="rds">AWS RDS / Aurora Metadata API</option>
                      <option value="kafka">Apache Kafka Schema Registry</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>OEM / Catalog Endpoint</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.database.host}
                        onChange={e => updateAdapter('database', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Management Secret</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.database.token}
                        onChange={e => updateAdapter('database', 'token', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Target Databases</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.database.targetDbs}
                        onChange={e => updateAdapter('database', 'targetDbs', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 Database Schema, DDL &amp; Instance Export (.sql, .ddl, .csv)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".sql,.ddl,.csv"
                      onChange={e => handleFileSelect('database', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.database && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.database.name} ({uploadedFiles.database.size} · {uploadedFiles.database.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DUAL INPUTS: ADAPTERS & FILE UPLOADS (BPS) */}
      {transitionType === 'business_process' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
                2. Enterprise ERP Adapters &amp; Process Queue Dumps (Per Selected Domain)
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                Connect live ERPs or upload general ledger exports, shadow Excel macros, and CRM queue dumps.
              </div>
            </div>
            <span className="badge bor" style={{ fontSize: 11 }}>
              {bpsScopes.length} Active Process Connectors
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bpsScopes.includes('Finance & Accounting (P2P / O2C)') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💳</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Finance &amp; Accounting (P2P / O2C)</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Accounts Payable, General Ledger &amp; Shadow Excel Macros</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('finance')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach GL Dump &amp; Macro (.csv/.xlsm)
                    </button>
                    <span className={`badge ${adapterConfigs.finance.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.finance.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System ERP Adapter</span>
                    <select
                      value={adapterConfigs.finance.provider}
                      onChange={e => updateAdapter('finance', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="sap_s4hana">SAP S/4HANA (OData &amp; RFC API)</option>
                      <option value="oracle_erp">Oracle Financials Cloud REST API</option>
                      <option value="workday_fin">Workday Financial Management API</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>SAP / ERP Gateway Host</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.finance.host}
                        onChange={e => updateAdapter('finance', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Client ID / System Number</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.finance.clientId}
                        onChange={e => updateAdapter('finance', 'clientId', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>RFC / Audit Service Account</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.finance.userToken}
                        onChange={e => updateAdapter('finance', 'userToken', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 General Ledger Export, Invoice Log, or Shadow Excel Macro (.csv, .xlsx, .xlsm)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.xlsm"
                      onChange={e => handleFileSelect('finance', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.finance && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.finance.name} ({uploadedFiles.finance.size} · {uploadedFiles.finance.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {bpsScopes.includes('Customer Operations & Support') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>👥</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Customer Operations &amp; Support</strong>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Contact Center Queues, CRM Cases &amp; Omnichannel Escalations</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn bs"
                      onClick={() => attachSampleDump('customer_ops')}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      ⚡ Attach Salesforce Case Export (.csv)
                    </button>
                    <span className={`badge ${adapterConfigs.customer_ops.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.customer_ops.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, marginBottom: 10, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔌 Live System CRM Adapter</span>
                    <select
                      value={adapterConfigs.customer_ops.provider}
                      onChange={e => updateAdapter('customer_ops', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="salesforce">Salesforce Service Cloud REST API</option>
                      <option value="zendesk">Zendesk Support API</option>
                      <option value="genesys">Genesys Cloud Omnichannel API</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Salesforce Instance / Domain</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.customer_ops.host}
                        onChange={e => updateAdapter('customer_ops', 'host', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>Connected App Client ID</label>
                      <input
                        type="text"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.customer_ops.clientId}
                        onChange={e => updateAdapter('customer_ops', 'clientId', e.target.value)}
                      />
                    </div>
                    <div className="ig">
                      <label className="il" style={{ fontSize: 10 }}>OAuth Access Token</label>
                      <input
                        type="password"
                        style={{ fontSize: 11 }}
                        value={adapterConfigs.customer_ops.userToken}
                        onChange={e => updateAdapter('customer_ops', 'userToken', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6 }}>
                    📁 Omnichannel Queue / Customer Ticket Dump (.csv, .xlsx, .json)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={e => handleFileSelect('customer_ops', e.target.files[0])}
                      style={{ fontSize: 11 }}
                    />
                    {uploadedFiles.customer_ops && (
                      <span className="badge bgr" style={{ fontSize: 10 }}>
                        ✓ {uploadedFiles.customer_ops.name} ({uploadedFiles.customer_ops.size} · {uploadedFiles.customer_ops.records || 'Parsed'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IT APPLICATION: COMPREHENSIVE REPO + ITSM TICKETS + ARCHITECTURE SPECS */}
      {transitionType === 'it_application' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card 1: Code Repository & Handover Audit Adapters */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
                  1. Enterprise Code Repository &amp; Handover Audit Adapters
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                  Clone via Git provider OR upload local codebase zip archive for AST parser and secret scanner.
                </div>
              </div>
              <select
                value={appAdapter}
                onChange={e => setAppAdapter(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px' }}
              >
                <option value="github">GitHub Enterprise / Cloud</option>
                <option value="azure_devops">Azure DevOps Repos &amp; Boards</option>
                <option value="gitlab">GitLab Enterprise Edition</option>
                <option value="bitbucket">Atlassian Bitbucket Server</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="ig">
                <label className="il">Git Repository URL</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/... or https://dev.azure.com/... or GitLab"
                />
              </div>
              <div className="ig">
                <label className="il">Access Token / PAT</label>
                <input
                  type="password"
                  value={gitToken}
                  onChange={e => setGitToken(e.target.value)}
                  placeholder="Enter PAT / Token"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="ig">
                <label className="il">Jira / Confluence Domain (Handover Audit)</label>
                <input
                  type="text"
                  value={jiraDomain}
                  onChange={e => setJiraDomain(e.target.value)}
                  placeholder="your-org.atlassian.net"
                />
              </div>
              <div className="ig">
                <label className="il">Atlassian API Token</label>
                <input
                  type="password"
                  value={jiraToken}
                  onChange={e => setJiraToken(e.target.value)}
                  placeholder="ATATT3x..."
                />
              </div>
              <div className="ig">
                <label className="il">Architecture Tier</label>
                <select value={appScope} onChange={e => setAppScope(e.target.value)}>
                  <option>Cloud-Native Microservices</option>
                  <option>Monolithic Backend + Web Frontend</option>
                  <option>Enterprise ERP / SAP Extension</option>
                  <option>API Gateway &amp; Integration Layer</option>
                </select>
              </div>
            </div>

            {/* Offline Code Archive Option */}
            <div style={{ padding: '8px 10px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bl)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>📁 Optional Local Source Code Archive (.zip, .tar.gz)</span>
                <button
                  className="btn bs"
                  onClick={() => attachSampleDump('code_archive')}
                  style={{ fontSize: 10, padding: '2px 6px' }}
                >
                  ⚡ Attach Sample Code Archive
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="file"
                  accept=".zip,.tar.gz,.tgz"
                  onChange={e => handleFileSelect('code_archive', e.target.files[0])}
                  style={{ fontSize: 11 }}
                />
                {uploadedFiles.code_archive && (
                  <span className="badge bgr" style={{ fontSize: 10 }}>
                    ✓ {uploadedFiles.code_archive.name} ({uploadedFiles.code_archive.size} · {uploadedFiles.code_archive.records})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: ITSM Incident History & Ticket Telemetry (User Requirement) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🎧</span>
                  <span>2. ITSM Incident History &amp; Ticket Telemetry (Incident Correlator)</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>
                  Connect ServiceNow or upload historical ticket dumps (CSV/Excel/JSON). The AI correlates recurring incident hotspots with AST codebase modules to reveal hidden tech debt.
                </div>
              </div>
              <div className="tabs" style={{ margin: 0 }}>
                <div
                  className={`tab ${appItsmTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setAppItsmTab('upload')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  📁 Upload Ticket Dump
                </div>
                <div
                  className={`tab ${appItsmTab === 'snow' ? 'active' : ''}`}
                  onClick={() => setAppItsmTab('snow')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  🔌 Connect ServiceNow
                </div>
              </div>
            </div>

            {appItsmTab === 'upload' && (
              <div style={{ padding: '12px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="il" style={{ margin: 0, fontSize: 12 }}>CSV, Excel, or JSON Ticket Export (.csv, .xlsx, .xls, .json)</label>
                  <button
                    className="btn bs"
                    onClick={() => attachSampleDump('app_tickets')}
                    style={{ fontSize: 10, padding: '3px 8px' }}
                  >
                    ⚡ Attach Sample ITSM Ticket Dump (1,420 Incident Records)
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={e => handleFileSelect('app_tickets', e.target.files[0])}
                    style={{ fontSize: 11 }}
                  />
                  {uploadedFiles.app_tickets ? (
                    <span className="badge bgr" style={{ fontSize: 11, padding: '4px 10px' }}>
                      ✓ {uploadedFiles.app_tickets.name} ({uploadedFiles.app_tickets.size} · {uploadedFiles.app_tickets.records || 'Ready for ingestion'})
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--mu)' }}>No file selected — click Attach Sample or select local export</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 8 }}>
                  Incident numbers, categories, resolution notes, and assignees will be indexed and linked to codebase modules in the Knowledge Graph.
                </div>
              </div>
            )}

            {appItsmTab === 'snow' && (
              <div style={{ padding: '12px', background: 'var(--sf1)', borderRadius: 6, border: '1px solid var(--bd)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr', gap: 10, marginBottom: 8 }}>
                  <div className="ig">
                    <label className="il" style={{ fontSize: 10 }}>ServiceNow Instance</label>
                    <input
                      type="text"
                      style={{ fontSize: 11 }}
                      value={appSnowHost}
                      onChange={e => setAppSnowHost(e.target.value)}
                      placeholder="dev12345.service-now.com"
                    />
                  </div>
                  <div className="ig">
                    <label className="il" style={{ fontSize: 10 }}>Username</label>
                    <input
                      type="text"
                      style={{ fontSize: 11 }}
                      value={appSnowUser}
                      onChange={e => setAppSnowUser(e.target.value)}
                      placeholder="admin"
                    />
                  </div>
                  <div className="ig">
                    <label className="il" style={{ fontSize: 10 }}>Password / Token</label>
                    <input
                      type="password"
                      style={{ fontSize: 11 }}
                      value={appSnowPass}
                      onChange={e => setAppSnowPass(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="ig">
                    <label className="il" style={{ fontSize: 10 }}>Assignment Group</label>
                    <input
                      type="text"
                      style={{ fontSize: 11 }}
                      value={appSnowGroup}
                      onChange={e => setAppSnowGroup(e.target.value)}
                      placeholder="App Support L2/L3"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                    Credentials are piped into the Service Desk Ingestion Agent to extract change velocity and SPOFs.
                  </div>
                  <span className={`badge ${appSnowConnected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                    {appSnowConnected ? '✓ ServiceNow API Configured' : 'Offline'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Architecture Documentation & Reference Specs */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📄</span>
                  <span>3. Reference Architecture Specifications &amp; Design Docs</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>
                  Upload High-Level (HLD) or Low-Level (LLD) documents. Agents cross-reference code endpoints against documentation to flag undocumented dark routes.
                </div>
              </div>
              <button
                className="btn bs"
                onClick={() => attachSampleDump('architecture_docs')}
                style={{ fontSize: 10, padding: '3px 8px' }}
              >
                ⚡ Attach Sample Architecture Spec (HLD)
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.md,.txt"
                onChange={e => handleFileSelect('architecture_docs', e.target.files[0])}
                style={{ fontSize: 11 }}
              />
              {uploadedFiles.architecture_docs ? (
                <span className="badge bgr" style={{ fontSize: 11, padding: '4px 10px' }}>
                  ✓ {uploadedFiles.architecture_docs.name} ({uploadedFiles.architecture_docs.size} · {uploadedFiles.architecture_docs.records || 'Ready'})
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--mu)' }}>Optional: No document uploaded</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Launch CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '16px 20px', background: 'var(--sf1)', border: '1px solid var(--bd)', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
            Assumes hostile handover · Zero incumbent trust · Evidence-driven discovery
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)' }}>
            Orchestrator will spawn parallel specialized agents querying both live adapters and ingested telemetry dumps.
          </div>
        </div>
        <button
          className="btn bp"
          onClick={handleLaunch}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🚀 Launch Hostile AI Analysis &amp; Orchestration</span>
        </button>
      </div>
    </div>
  );
}
