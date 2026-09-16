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

  // ITIS fields
  const [itisScopes, setItisScopes] = useState([
    'Network & Security',
    'Cloud & Virtualization',
    'Storage & Backup'
  ]);
  const [cmdbFileName, setCmdbFileName] = useState('');
  const [firewallFileName, setFirewallFileName] = useState('');
  const [cloudFileName, setCloudFileName] = useState('');

  // Business Process fields
  const [bpsScopes, setBpsScopes] = useState([
    'Finance & Accounting (P2P / O2C)',
    'Customer Operations & Support'
  ]);
  const [sopFileName, setSopFileName] = useState('');
  const [queueFileName, setQueueFileName] = useState('');

  const geoOptions = ['North America', 'EMEA', 'APAC', 'LATAM', 'Global Delivery Center'];

  const itisScopeOptions = [
    { id: 'Network & Security', desc: 'Firewalls, Routers, SD-WAN, VPNs, ACLs, DNS/DHCP' },
    { id: 'Cloud & Virtualization', desc: 'AWS, Azure, GCP, VMware clusters, Terraform/Bicep' },
    { id: 'Storage & Backup', desc: 'SAN/NAS, NetApp, Veeam, Commvault, DR replication' },
    { id: 'Data Center & Compute', desc: 'Bare-metal, Windows/Linux server fleets, Hyper-V' },
    { id: 'Service Desk & EUC', desc: 'Incident triage, Service Catalog, Endpoint fleet' },
    { id: 'Database & Middleware', desc: 'Oracle, MS SQL, PostgreSQL, MQ, Kafka, WebLogic' }
  ];

  const bpsScopeOptions = [
    { id: 'Finance & Accounting (P2P / O2C)', desc: 'Accounts Payable, General Ledger, Billing, Payroll' },
    { id: 'Customer Operations & Support', desc: 'Contact center queues, escalations, omnichannel tickets' },
    { id: 'Supply Chain & Procurement', desc: 'Purchase orders, vendor onboarding, logistics, inventory' },
    { id: 'HR & Talent Operations', desc: 'Employee onboarding, benefits administration, queries' },
    { id: 'Claims & Policy Processing', desc: 'Adjudication, settlements, audit compliance, fraud review' }
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

  function handleLaunch() {
    const pName = projectName.trim() || (
      transitionType === 'itis' ? 'Global Enterprise ITIS Transition' :
      transitionType === 'business_process' ? 'Finance & Operations BPS Transition' :
      (repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Core Application Transition')
    );

    const config = {
      project_name: pName,
      transition_type: transitionType,
      scopes: transitionType === 'itis' ? itisScopes : transitionType === 'business_process' ? bpsScopes : [appScope],
      geos: selectedGeos,
      repo_url: repoUrl,
      git_token: gitToken,
      telemetry_files: {
        cmdb: cmdbFileName,
        firewall: firewallFileName,
        cloud: cloudFileName,
        sop: sopFileName,
        queue: queueFileName
      }
    };

    startAgenticAnalysis(config);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
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
            Specify scope boundaries and provide raw system telemetry for hostile multi-agent analysis.
          </div>
        </div>
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
          <label className="il" style={{ marginBottom: 6 }}>Target Geographies (Parallel Ingestion Fleet)</label>
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

      {/* ITIS Scope & Telemetry */}
      {transitionType === 'itis' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
              Select Infrastructure Towers in Scope
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
                      cursor: 'pointer'
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

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>
              Raw Hostile Telemetry & Dumps (Bypassing Vendor Documents)
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 12 }}>
              Upload raw configuration dumps directly from source devices. The AI reconciles ground truth automatically.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="ig">
                <label className="il">Firewall / Routing Backups</label>
                <input
                  type="file"
                  accept=".conf,.txt,.xml,.json"
                  onChange={e => setFirewallFileName(e.target.files[0]?.name || '')}
                />
                <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>Palo Alto, Cisco, Fortinet, pfSense</div>
              </div>
              <div className="ig">
                <label className="il">Raw CMDB Export (.csv / .xlsx)</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={e => setCmdbFileName(e.target.files[0]?.name || '')}
                />
                <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>ServiceNow, Jira Assets, BMC</div>
              </div>
              <div className="ig">
                <label className="il">Cloud Inventories / Terraform</label>
                <input
                  type="file"
                  accept=".json,.csv,.tf,.yaml"
                  onChange={e => setCloudFileName(e.target.files[0]?.name || '')}
                />
                <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>AWS Resource Graph, Azure, GCP</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BPS Scope & Telemetry */}
      {transitionType === 'business_process' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
              Select Business Process Domains in Scope
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
                      cursor: 'pointer'
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

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>
              Process Telemetry & Procedural Guides
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 12 }}>
              Upload actual ticket resolution logs and SOP drafts. AI cross-references them to detect unlogged workarounds.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="ig">
                <label className="il">Historical Ticket Queue Dumps</label>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={e => setQueueFileName(e.target.files[0]?.name || '')}
                />
                <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>12-month work item logs with resolution notes</div>
              </div>
              <div className="ig">
                <label className="il">Desktop Procedural Guides / SOPs</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={e => setSopFileName(e.target.files[0]?.name || '')}
                />
                <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>Existing vendor documentation (to audit)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IT Application Scope & Git */}
      {transitionType === 'it_application' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bl)', marginBottom: 12 }}>
            Code Repository & Architecture Source
          </div>
          <div className="ig">
            <label className="il">Git Repository URL</label>
            <input
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/... or https://dev.azure.com/... or GitLab/Bitbucket"
            />
          </div>
          <div className="ig">
            <label className="il">Access Token / PAT <span className="optional-tag">optional — private repos only</span></label>
            <input
              type="password"
              value={gitToken}
              onChange={e => setGitToken(e.target.value)}
              placeholder="ghp_... or Azure DevOps PAT"
            />
          </div>
          <div className="ig">
            <label className="il">Application Architecture Tier</label>
            <select value={appScope} onChange={e => setAppScope(e.target.value)}>
              <option>Cloud-Native Microservices</option>
              <option>Monolithic Backend + Web Frontend</option>
              <option>Enterprise ERP / SAP Extension</option>
              <option>API Gateway & Integration Layer</option>
              <option>Legacy COTS / Client-Server</option>
            </select>
          </div>
        </div>
      )}

      {/* Launch CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--mu)' }}>
          Assumes hostile handover · Spawns parallel tower ingestion & ghost asset hunters
        </div>
        <button
          className="btn bp"
          onClick={handleLaunch}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🚀 Launch Hostile AI Analysis</span>
        </button>
      </div>
    </div>
  );
}
