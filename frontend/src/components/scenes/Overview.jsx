import React, { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { CODEINTEL_URL, getJson } from '../../api.js';

export default function Overview() {
  const { activeApp, scene, setScene } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (scene !== 'overview') return;
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp, scene]);

  async function loadOverview() {
    setLoading(true);
    setErrMsg('');
    try {
      const appId = activeApp ? activeApp.app_id : '';
      const d = await getJson(`${CODEINTEL_URL}/overview?app_id=${encodeURIComponent(appId)}`);
      setData(d);
    } catch (e) {
      setErrMsg('Could not load overview: ' + e.message);
    }
    setLoading(false);
  }

  const appName = (data && data.application_name) || (activeApp && activeApp.display_name) || 'Application';
  const cx = data && data.complexity_rating;
  const cxClass = cx === 'High' || cx === 'Very High' ? 'brd2' : cx === 'Medium' ? 'bam' : 'bgr';
  const stack = (data && data.tech_stack) || {};
  const dataSources = [...((data && data.data_sources) || []), ...((data && data.integrations) || [])];

  const transitionType = activeApp?.transition_type || 'it_application';

  return (
    <div className={`scene ${scene === 'overview' ? 'active' : ''}`}>
      <h1>{activeApp ? `${activeApp.display_name || appName} — Overview` : 'Transition Project Overview'}</h1>
      <div className="sdesc">
        {transitionType === 'itis' ? 'Multi-tower infrastructure scope, discovered topology, and hostile audit baselines.' :
         transitionType === 'business_process' ? 'Process hierarchy, operational volumes, and compliance audit baselines.' :
         'Auto-generated from the indexed codebase, architecture specs, and uploaded telemetry.'}
      </div>

      {/* Control Tower Flight Simulator Banner */}
      <div style={{
        marginTop: 14,
        marginBottom: 16,
        padding: '12px 18px',
        borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🕹️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Transition Control Tower & Pre-Flight Simulator Active
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>
              Explore 9-week timeline compression (180d to 56d), Neo4j Bloom glowing dependency topology, readiness matrix, and SME interview queues.
            </div>
          </div>
        </div>
        <button
          className="btn bp"
          onClick={() => setScene('control_tower')}
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#090d16', fontWeight: 700, border: 'none', padding: '6px 14px', fontSize: 11, cursor: 'pointer', borderRadius: 5, whiteSpace: 'nowrap' }}
        >
          Open Control Tower →
        </button>
      </div>

      {/* Tailored ITIS Overview */}
      {transitionType === 'itis' && (
        <div style={{ marginTop: 16 }}>
          <div className="card" style={{ background: 'var(--sf2)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>
                  {activeApp.display_name || 'Global Enterprise ITIS Estate'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.6, maxWidth: 680 }}>
                  Cross-tower infrastructure estate analyzed under hostile transition assumptions. Raw firewall configs, cloud inventories, and ticket exports reconciled into ground-truth topology.
                </div>
              </div>
              <span className="badge bgr" style={{ padding: '6px 12px', fontSize: 11 }}>ITIS Multi-Tower</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {(activeApp.scopes || ['Network & Security', 'Cloud & Virtualization', 'Storage & Backup']).map(s => (
                <span key={s} className="badge bbl">{s}</span>
              ))}
              {(activeApp.geos || ['North America', 'EMEA']).map(g => (
                <span key={g} className="badge btl2">Geo: {g}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="card">
              <div className="ct">Discovered Infrastructure CIs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div className="sr"><span className="sk">Network & Security</span><span style={{ color: 'var(--tx)' }}>Palo Alto FW-PROD-EAST, Core Subnet 10.240.0.0/16</span></div>
                <div className="sr"><span className="sk">Compute Fleet</span><span style={{ color: 'var(--tx)' }}>srv-prod-api-01, srv-prod-db-master (38 VMs)</span></div>
                <div className="sr"><span className="sk">Storage Volumes</span><span style={{ color: 'var(--tx)' }}>NetApp vol-oracle-archive-04 (94.2% full)</span></div>
                <div className="sr"><span className="sk">Identity & Directory</span><span style={{ color: 'var(--tx)' }}>Active Directory (Global Domain Forest)</span></div>
              </div>
            </div>

            <div className="card">
              <div className="ct">Hostile Audit Discrepancy Snapshot</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div className="sr"><span className="sk" style={{ color: 'var(--rd)' }}>Ghost Hosts</span><span>1 Unmapped IP (10.240.12.88) in firewall</span></div>
                <div className="sr"><span className="sk" style={{ color: 'var(--am)' }}>Zombie CIs</span><span>38 Dormant VMs in dc-eu-west-02</span></div>
                <div className="sr"><span className="sk" style={{ color: 'var(--rd)' }}>Storage Anomaly</span><span>Veeam snapshot replication failure</span></div>
                <div className="sr"><span className="sk" style={{ color: 'var(--or)' }}>Personnel Bottleneck</span><span>87% Network Changes by D. Evans</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tailored BPS Overview */}
      {transitionType === 'business_process' && (
        <div style={{ marginTop: 16 }}>
          <div className="card" style={{ background: 'var(--sf2)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>
                  {activeApp.display_name || 'Business Process Operations Estate'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.6, maxWidth: 680 }}>
                  Operational transition analyzed directly from 12-month work queue exports, SOP documents, and resolution telemetry. Discovered shadow workarounds and single-point-of-failure approval bottlenecks.
                </div>
              </div>
              <span className="badge bor" style={{ padding: '6px 12px', fontSize: 11 }}>BPS Operations</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {(activeApp.scopes || ['Finance & Accounting', 'Customer Operations']).map(s => (
                <span key={s} className="badge bor">{s}</span>
              ))}
              {(activeApp.geos || ['Global Delivery Center']).map(g => (
                <span key={g} className="badge btl2">Location: {g}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="card">
              <div className="ct">Core Process Hierarchy &amp; Systems</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div className="sr"><span className="sk">Accounts Payable (P2P)</span><span style={{ color: 'var(--tx)' }}>Invoice Batch Upload → SAP S/4HANA</span></div>
                <div className="sr"><span className="sk">Claims Settlement</span><span style={{ color: 'var(--tx)' }}>Adjudication → Dual Manager Signoff</span></div>
                <div className="sr"><span className="sk">Treasury & Payments</span><span style={{ color: 'var(--tx)' }}>International Wire Releases (&gt;$500k)</span></div>
                <div className="sr"><span className="sk">Enterprise ERP</span><span style={{ color: 'var(--tx)' }}>SAP S/4HANA Finance Cloud</span></div>
              </div>
            </div>

            <div className="card">
              <div className="ct">Hostile Process Audit Snapshot</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div className="sr"><span className="sk" style={{ color: 'var(--rd)' }}>Shadow Macro</span><span>Macro_v3.xlsm on Drive X:\ without SOP</span></div>
                <div className="sr"><span className="sk" style={{ color: 'var(--am)' }}>Compliance Bypass</span><span>Code 'OVR-99' used 31 times without audit</span></div>
                <div className="sr"><span className="sk" style={{ color: 'var(--rd)' }}>Solo Approver Bottleneck</span><span>92% Wires Keyed Solely by R. Sharma</span></div>
                <div className="sr"><span className="sk" style={{ color: 'var(--or)' }}>Documentation Debt</span><span>Missing FX exception handling SOP</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IT Application Standard View */}
      {transitionType === 'it_application' && (
        <div>
          {loading && <div style={{ color: 'var(--mu)', fontSize: 13, padding: '20px 0' }}>{errMsg || 'Loading application overview...'}</div>}

          {!loading && data && (
            <div>
              <div className="card" style={{ background: 'var(--sf2)' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)', marginBottom: 6 }}>{appName}</div>
                <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.75, marginBottom: 10 }}>{data.application_summary}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {data.business_domain && <span className="badge btl2">{data.business_domain}</span>}
                  {cx && <span className={`badge ${cxClass}`}>{cx} complexity</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="card">
                  <div className="ct">Tech stack</div>
                  <div>
                    {Object.entries(stack).filter(([, v]) => v && (Array.isArray(v) ? v.length : true)).map(([k, v]) => (
                      <div className="sr" key={k}><span className="sk" style={{ fontSize: 11 }}>{k}</span>
                        <span style={{ fontSize: 11, color: 'var(--tx)', textAlign: 'right' }}>{Array.isArray(v) ? v.join(', ') : v}</span></div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="ct">Data sources &amp; integrations</div>
                  <div>
                    {dataSources.map((s, i) => (
                      <div key={i} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--bd)', color: 'var(--mu)' }}>{s}</div>
                    ))}
                  </div>
                </div>
              </div>

          <div className="card">
            <div className="ct">Architecture highlights</div>
            <div>
              {(data.architecture_highlights || []).map((a, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--bd)', color: 'var(--mu)', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--tl)' }}>▸</span>{a}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="ct">Required team &amp; skills</div>
            <div>
              {(data.required_skills || []).map((sk, i) => (
                <div className="skill-card" key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sk.role}</div>
                    <span className="badge bbl">{sk.level}</span><span className="badge bgr">{sk.fte} FTE</span>
                  </div>
                  <div className="sk-tags">{(sk.skills || []).map((s, j) => <span className="sk-tag" key={j}>{s}</span>)}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>{sk.reason}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <div className="ct">Support risks</div>
              <div>
                {(data.support_risks || []).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--bd)', color: 'var(--am)', display: 'flex', gap: 6 }}>
                    <span>⚠</span>{r}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="ct">Onboarding priorities</div>
              <div>
                {(data.onboarding_priority || []).map((o, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--bd)', display: 'flex', gap: 7 }}>
                    <span style={{ color: 'var(--bl)', fontWeight: 600 }}>{i + 1}</span><span style={{ color: 'var(--mu)' }}>{o}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>
            {data.source === 'live_analysis' ? 'Generated from live codebase analysis' : 'Preview — index a repository to generate live analysis'}
          </div>
        </div>
      )}
    </div>
  )}
</div>
  );
}
