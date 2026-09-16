import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { INDEXER_URL, getJson } from '../api.js';
import DynamicTransitionInputs from './DynamicTransitionInputs.jsx';

export default function TransitionLaunchpad() {
  const { showLaunchpad, switchApp, setShowLaunchpad } = useApp();
  const [selectedType, setSelectedType] = useState(null); // 'it_application' | 'itis' | 'business_process'
  const [existingApps, setExistingApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    if (showLaunchpad) {
      loadExistingApps();
      setSelectedType(null);
    }
  }, [showLaunchpad]);

  async function loadExistingApps() {
    setLoadingApps(true);
    try {
      const d = await getJson(`${INDEXER_URL}/apps`);
      setExistingApps(d.apps || []);
    } catch (err) {
      console.error("Failed to load apps:", err);
    }
    setLoadingApps(false);
  }

  if (!showLaunchpad) return null;

  const transitionTypes = [
    {
      id: 'it_application',
      title: 'IT Application Transition',
      badge: 'Codebase & Architecture',
      badgeClass: 'bbl',
      icon: '⚡',
      summary: 'Analyze custom application repositories, monolithic services, microservices, and databases under hostile handover conditions.',
      highlights: [
        'Multi-repo Git parsing (GitHub, Azure DevOps, GitLab, Bitbucket)',
        'AST code intelligence, hidden dependencies & external webhooks',
        'Automated Runbook generation & incident playbooks'
      ]
    },
    {
      id: 'itis',
      title: 'IT Infrastructure Services (ITIS)',
      badge: 'Towers & Telemetry',
      badgeClass: 'bgr',
      icon: '🛡️',
      summary: 'Multi-tower infrastructure transition across Network, Cloud, Storage, Datacenter, and Service Desk environments.',
      highlights: [
        'Ghost asset & unmapped server discovery from firewall rules',
        'Cross-tower Neo4j Bloom Knowledge Fabric construction',
        'Targeted SME KT Question Generator replacing 40-hr workshops'
      ]
    },
    {
      id: 'business_process',
      title: 'Business Process Support (BPS / BPO)',
      badge: 'Operations & Workflows',
      badgeClass: 'bor',
      icon: '⚙️',
      summary: 'Operational transition for Customer Support, Finance & Accounting, HR, and Supply Chain process delivery centers.',
      highlights: [
        'Shadow Excel macro & undocumented procedural workaround detection',
        'Process dependency mapping & dual-signoff compliance audits',
        'Targeted role-based questionnaires & single-point-of-failure alerts'
      ]
    }
  ];

  return (
    <div id="wizard" style={{ zIndex: 9999 }}>
      <div className="wiz-card" style={{ maxWidth: selectedType ? 860 : 1000, width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="wiz-logo" style={{ fontSize: 24 }}>
              Lumina <span>Transition Assist</span>
            </div>
            <div className="wiz-sub" style={{ fontSize: 13, marginBottom: 20 }}>
              Autonomous Hostile Transition Intelligence Platform
            </div>
          </div>
          {existingApps.length > 0 && (
            <button
              className="btn bs"
              onClick={() => setShowLaunchpad(false)}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              ✕ Close
            </button>
          )}
        </div>

        {!selectedType ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
                Select Transition Project Type
              </div>
              <div style={{ fontSize: 13, color: 'var(--mu)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
                Every transition is assumed to be <strong>hostile</strong>: incumbent documentation is untrusted, CMDBs contain ghost assets, and ground truth must be reconstructed autonomously via parallel multi-agent telemetry analysis.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 30 }}>
              {transitionTypes.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    background: 'var(--sf2)',
                    border: '1px solid var(--bd)',
                    borderRadius: 12,
                    padding: 20,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--bl)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--bd)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 28 }}>{t.icon}</span>
                      <span className={`badge ${t.badgeClass}`}>{t.badge}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.6, marginBottom: 14 }}>
                      {t.summary}
                    </div>
                    <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 12 }}>
                      {t.highlights.map((h, i) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--tx)', display: 'flex', gap: 6, marginBottom: 6, lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--bl)', fontWeight: 700 }}>›</span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <span className="btn bp" style={{ fontSize: 12, padding: '6px 14px', width: '100%', display: 'inline-block', textAlign: 'center' }}>
                      Configure Project →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Previously Analyzed Projects */}
            {existingApps.length > 0 && (
              <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mu)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Previously Analyzed Projects</span>
                  <span className="badge btl2">{existingApps.length} active</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {existingApps.map(a => {
                    const typeLabel = a.transition_type === 'itis' ? 'ITIS' : a.transition_type === 'business_process' ? 'BPS' : 'App';
                    const badgeClass = a.transition_type === 'itis' ? 'bgr' : a.transition_type === 'business_process' ? 'bor' : 'bbl';
                    return (
                      <div
                        key={a.app_id || a.project_id}
                        className="app-chip"
                        onClick={() => switchApp(a)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 10 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 4 }}>
                          <div className="app-chip-name" style={{ fontWeight: 600 }}>{a.display_name || a.repo_name}</div>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: 9 }}>{typeLabel}</span>
                        </div>
                        <div className="app-chip-meta" style={{ fontSize: 11 }}>
                          {a.files ? `${a.files} components` : 'Indexed'} · {a.indexed_at ? new Date(a.indexed_at).toLocaleDateString() : 'Active'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <DynamicTransitionInputs
            transitionType={selectedType}
            onBack={() => setSelectedType(null)}
          />
        )}
      </div>
    </div>
  );
}
