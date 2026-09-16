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
    }
    // Set all adapters connected
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

    const config = {
      project_name: pName,
      transition_type: transitionType,
      scopes: transitionType === 'itis' ? itisScopes : transitionType === 'business_process' ? bpsScopes : [appScope],
      geos: selectedGeos,
      repo_url: repoUrl,
      git_token: gitToken,
      adapters: relevantAdapters,
      app_adapter: appAdapter,
      jira: { domain: jiraDomain, token: jiraToken }
    };

    startAgenticAnalysis(config);
  }

  return (
    <div>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn bs" onClick={onBack} style={{ fontSize: 12, padding: '5px 10px' }}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)' }}>
              {transitionType === 'itis' && 'Configure IT Infrastructure Services (ITIS) Transition'}
              {transitionType === 'business_process' && 'Configure Business Process Support (BPS) Transition'}
              {transitionType === 'it_application' && 'Configure IT Application Transition'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>
              Connect live enterprise systems or supply raw telemetry dumps for hostile multi-agent analysis.
            </div>
          </div>
        </div>
        <button
          className="btn bs"
          onClick={prefillRealisticCredentials}
          style={{ fontSize: 11, padding: '6px 12px', background: 'var(--bl2)', color: 'var(--bl)', borderColor: 'var(--bl)' }}
        >
          ⚡ Pre-fill Realistic Enterprise Credentials
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
              Input adapters below will dynamically adjust to your selections
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
              Enterprise ERP &amp; queue adapters below adjust to your selection
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

      {/* DYNAMIC SYSTEM ADAPTERS (ITIS) */}
      {transitionType === 'itis' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
                2. Enterprise System Connection Adapters (Per Selected Tower)
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                Connect directly to source systems or upload raw backups. The AI bypasses incumbent-curated spreadsheets.
              </div>
            </div>
            <span className="badge bgr" style={{ fontSize: 11 }}>
              {itisScopes.length} Active Tower Connectors
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Network Adapter */}
            {itisScopes.includes('Network & Security') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🛡️</span>
                    <strong style={{ fontSize: 13 }}>Network &amp; Security Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.network.provider}
                      onChange={e => updateAdapter('network', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="palo_alto">Palo Alto Panorama API</option>
                      <option value="cisco_meraki">Cisco Meraki Dashboard API</option>
                      <option value="fortigate">FortiGate REST API</option>
                      <option value="infoblox">Infoblox IPAM / DNS API</option>
                      <option value="dump">Raw Config Backup (.conf / .xml)</option>
                    </select>
                    <span className={`badge ${adapterConfigs.network.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.network.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">Panorama / Controller Endpoint</label>
                    <input
                      type="text"
                      value={adapterConfigs.network.host}
                      onChange={e => updateAdapter('network', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">API Key / Token</label>
                    <input
                      type="password"
                      value={adapterConfigs.network.token}
                      onChange={e => updateAdapter('network', 'token', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Device Group / Scope</label>
                    <input
                      type="text"
                      value={adapterConfigs.network.scope}
                      onChange={e => updateAdapter('network', 'scope', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cloud Adapter */}
            {itisScopes.includes('Cloud & Virtualization') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>☁️</span>
                    <strong style={{ fontSize: 13 }}>Cloud &amp; Virtualization Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.cloud.provider}
                      onChange={e => updateAdapter('cloud', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="aws">AWS (Cross-Account IAM Role / STS)</option>
                      <option value="azure">Azure Resource Graph (Service Principal)</option>
                      <option value="gcp">Google Cloud Asset Inventory API</option>
                      <option value="vmware">VMware vCenter API</option>
                      <option value="terraform">Terraform State / HCL Repo</option>
                    </select>
                    <span className={`badge ${adapterConfigs.cloud.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.cloud.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">Cloud Account / Subscription ID</label>
                    <input
                      type="text"
                      value={adapterConfigs.cloud.accountOrTenant}
                      onChange={e => updateAdapter('cloud', 'accountOrTenant', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Audit Role ARN / Client Secret</label>
                    <input
                      type="password"
                      value={adapterConfigs.cloud.credentials}
                      onChange={e => updateAdapter('cloud', 'credentials', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Target Regions</label>
                    <input
                      type="text"
                      value={adapterConfigs.cloud.regions}
                      onChange={e => updateAdapter('cloud', 'regions', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Storage Adapter */}
            {itisScopes.includes('Storage & Backup') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💾</span>
                    <strong style={{ fontSize: 13 }}>Storage &amp; Backup Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.storage.provider}
                      onChange={e => updateAdapter('storage', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="netapp">NetApp ONTAP REST API</option>
                      <option value="veeam">Veeam Backup &amp; Replication REST API</option>
                      <option value="commvault">Commvault Web Console API</option>
                      <option value="dump">SAN Volume Map / CSV Export</option>
                    </select>
                    <span className={`badge ${adapterConfigs.storage.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.storage.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">Storage Appliance Host / API URL</label>
                    <input
                      type="text"
                      value={adapterConfigs.storage.host}
                      onChange={e => updateAdapter('storage', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Management Token / Secret</label>
                    <input
                      type="password"
                      value={adapterConfigs.storage.token}
                      onChange={e => updateAdapter('storage', 'token', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Volume / Job Filters</label>
                    <input
                      type="text"
                      value={adapterConfigs.storage.volumeFilter}
                      onChange={e => updateAdapter('storage', 'volumeFilter', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Service Desk Adapter */}
            {itisScopes.includes('Service Desk & EUC') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🎧</span>
                    <strong style={{ fontSize: 13 }}>Service Desk &amp; ITSM Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.servicedesk.provider}
                      onChange={e => updateAdapter('servicedesk', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="servicenow">ServiceNow (REST Table API &amp; CMDB)</option>
                      <option value="jira_sm">Jira Service Management API</option>
                      <option value="pagerduty">PagerDuty On-Call &amp; Incidents</option>
                      <option value="dump">Incident / CI CSV Export Dump</option>
                    </select>
                    <span className={`badge ${adapterConfigs.servicedesk.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.servicedesk.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">ServiceNow Instance URL</label>
                    <input
                      type="text"
                      value={adapterConfigs.servicedesk.host}
                      onChange={e => updateAdapter('servicedesk', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">OAuth Token / Password</label>
                    <input
                      type="password"
                      value={adapterConfigs.servicedesk.token}
                      onChange={e => updateAdapter('servicedesk', 'token', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Target Assignment Group</label>
                    <input
                      type="text"
                      value={adapterConfigs.servicedesk.assignmentGroup}
                      onChange={e => updateAdapter('servicedesk', 'assignmentGroup', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Data Center & Compute Adapter */}
            {itisScopes.includes('Data Center & Compute') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🖥️</span>
                    <strong style={{ fontSize: 13 }}>Compute &amp; Server Fleet Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.compute.provider}
                      onChange={e => updateAdapter('compute', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="vmware">VMware vSphere / ESXi</option>
                      <option value="ansible">Red Hat Ansible Automation Platform</option>
                      <option value="winadmin">Windows Admin Center / WinRM</option>
                      <option value="dump">Server Fleet Inventory (.csv)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">Host / Control Plane URL</label>
                    <input
                      type="text"
                      value={adapterConfigs.compute.host}
                      onChange={e => updateAdapter('compute', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Admin Credentials / Token</label>
                    <input
                      type="password"
                      value={adapterConfigs.compute.token}
                      onChange={e => updateAdapter('compute', 'token', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Target Cluster / Pool</label>
                    <input
                      type="text"
                      value={adapterConfigs.compute.cluster}
                      onChange={e => updateAdapter('compute', 'cluster', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Database Adapter */}
            {itisScopes.includes('Database & Middleware') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🗄️</span>
                    <strong style={{ fontSize: 13 }}>Database &amp; Middleware Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.database.provider}
                      onChange={e => updateAdapter('database', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="oracle">Oracle Enterprise Manager (OEM)</option>
                      <option value="rds">AWS RDS / Aurora Metadata API</option>
                      <option value="kafka">Apache Kafka Schema Registry</option>
                      <option value="dump">Database Schema &amp; Instance List</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">OEM / Catalog Endpoint</label>
                    <input
                      type="text"
                      value={adapterConfigs.database.host}
                      onChange={e => updateAdapter('database', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Management Secret</label>
                    <input
                      type="password"
                      value={adapterConfigs.database.token}
                      onChange={e => updateAdapter('database', 'token', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Target Databases / Brokers</label>
                    <input
                      type="text"
                      value={adapterConfigs.database.targetDbs}
                      onChange={e => updateAdapter('database', 'targetDbs', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DYNAMIC SYSTEM ADAPTERS (BPS) */}
      {transitionType === 'business_process' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
                2. Enterprise Process &amp; ERP Adapters (Per Selected Domain)
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                Connect directly to enterprise ERPs and CRM ticket queues. The AI cross-references transaction logs to detect shadow workarounds.
              </div>
            </div>
            <span className="badge bor" style={{ fontSize: 11 }}>
              {bpsScopes.length} Active Process Connectors
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bpsScopes.includes('Finance & Accounting (P2P / O2C)') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💳</span>
                    <strong style={{ fontSize: 13 }}>Finance &amp; Accounting ERP Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.finance.provider}
                      onChange={e => updateAdapter('finance', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="sap_s4hana">SAP S/4HANA (OData &amp; RFC API)</option>
                      <option value="oracle_erp">Oracle Financials Cloud REST API</option>
                      <option value="workday_fin">Workday Financial Management API</option>
                      <option value="dump">AP/AR General Ledger Dump (.csv)</option>
                    </select>
                    <span className={`badge ${adapterConfigs.finance.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.finance.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">SAP / ERP Gateway Host</label>
                    <input
                      type="text"
                      value={adapterConfigs.finance.host}
                      onChange={e => updateAdapter('finance', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Client ID / System Number</label>
                    <input
                      type="text"
                      value={adapterConfigs.finance.clientId}
                      onChange={e => updateAdapter('finance', 'clientId', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">RFC / Audit Service Account</label>
                    <input
                      type="password"
                      value={adapterConfigs.finance.userToken}
                      onChange={e => updateAdapter('finance', 'userToken', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {bpsScopes.includes('Customer Operations & Support') && (
              <div style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>👥</span>
                    <strong style={{ fontSize: 13 }}>Customer Operations CRM Adapter</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={adapterConfigs.customer_ops.provider}
                      onChange={e => updateAdapter('customer_ops', 'provider', e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <option value="salesforce">Salesforce Service Cloud REST API</option>
                      <option value="zendesk">Zendesk Support API</option>
                      <option value="genesys">Genesys Cloud Omnichannel API</option>
                      <option value="dump">Omnichannel Queue Dump (.csv)</option>
                    </select>
                    <span className={`badge ${adapterConfigs.customer_ops.connected ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                      {adapterConfigs.customer_ops.connected ? '✓ API Ready' : 'Configured'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
                  <div className="ig">
                    <label className="il">Salesforce Instance / Domain</label>
                    <input
                      type="text"
                      value={adapterConfigs.customer_ops.host}
                      onChange={e => updateAdapter('customer_ops', 'host', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Connected App Client ID</label>
                    <input
                      type="text"
                      value={adapterConfigs.customer_ops.clientId}
                      onChange={e => updateAdapter('customer_ops', 'clientId', e.target.value)}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">OAuth Access Token</label>
                    <input
                      type="password"
                      value={adapterConfigs.customer_ops.userToken}
                      onChange={e => updateAdapter('customer_ops', 'userToken', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IT APPLICATION REPO & ADAPTER */}
      {transitionType === 'it_application' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)' }}>
              Enterprise Code Repository &amp; Issue Tracker Adapters
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: 12 }}>
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
        </div>
      )}

      {/* Launch CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--mu)' }}>
          Assumes hostile handover · Spawns parallel specialized agents across target systems
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
