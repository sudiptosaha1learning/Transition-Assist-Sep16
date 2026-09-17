import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { INDEXER_URL, getJson } from '../api.js';
import DynamicTransitionInputs from './DynamicTransitionInputs.jsx';

export default function TransitionLaunchpad() {
  const { showLaunchpad, switchApp, setShowLaunchpad, activeApp, openControlTowerSimulator } = useApp();
  const [selectedType, setSelectedType] = useState(null); // 'it_application' | 'itis' | 'business_process'
  const [existingApps, setExistingApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    loadExistingApps();
  }, []);

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

  const transitionTypes = [
    {
      id: 'it_application',
      title: 'IT Application Transition',
      badge: 'Code + Architecture + DB',
      badgeColor: 'bbl',
      badgeClass: 'bbl',
      icon: '💻',
      summary: 'Automated reverse-engineering of application source repositories, service tiers, dark endpoints, and incident runbooks.',
      highlights: [
        'GitHub / GitLab / Bitbucket deep AST repository ingestion',
        '7-Tier Service architecture, database, API and queue discovery',
        'SPOF maintainer graph & automated runbook reconstruction'
      ]
    },
    {
      id: 'itis',
      title: 'IT Infrastructure Services (ITIS)',
      badge: 'Networks + Compute + Cloud',
      badgeColor: 'bam',
      badgeClass: 'bam',
      icon: '🏢',
      summary: 'Telemetry-first discovery across Service Desk, Network Topology, Hybrid Data Centers, Cloud Tenancies, and Storage arrays.',
      highlights: [
        'SNMP/CDP & NetFlow telemetry ingestion (ghost asset detection)',
        '10-Tower scope selector with automated gap synthesis',
        'ServiceNow / Jira Service Management ticket dump mining'
      ]
    },
    {
      id: 'business_process',
      title: 'Business Process Services (BPS)',
      badge: 'Operations + SOPs + Audits',
      badgeColor: 'bgn',
      badgeClass: 'bgn',
      icon: '📋',
      summary: 'Operational transition for Customer Support, Finance & Accounting, HR, and Supply Chain process delivery centers.',
      highlights: [
        'Shadow Excel macro & undocumented procedural workaround detection',
        'Process dependency mapping & dual-signoff compliance audits',
        'Targeted role-based questionnaires & single-point-of-failure alerts'
      ]
    }
  ];

  return (
    <div className="launchpad-page" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header style={{ borderBottom: '1px solid var(--bd)', background: 'var(--sf)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="wiz-logo" style={{ fontSize: 20, margin: 0 }}>
            Lumina <span>Transition Assist</span>
          </div>
          <span className="badge bbl" style={{ fontSize: 11, padding: '3px 8px' }}>
            Autonomous Hostile Transition Platform
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn bgh"
            onClick={openControlTowerSimulator}
            style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}
            title="Launch the 9-Week Transition Flight Simulator & Control Tower"
          >
            <span>🕹️ Flight Simulator & Control Tower</span>
          </button>

          {activeApp && (
            <button
              className="btn bp"
              onClick={() => setShowLaunchpad(false)}
              style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>Go to Active Dashboard ({activeApp.display_name || activeApp.repo_name}) →</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Page Content */}
      <main style={{ flex: 1, maxWidth: 1140, width: '100%', margin: '0 auto', padding: '36px 24px 80px 24px' }}>
        {!selectedType ? (
          <div>
            {/* Hero Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 10, letterSpacing: '-0.02em' }}>
                Select Transition Project Type
              </div>
              <div style={{ fontSize: 14, color: 'var(--mu)', maxWidth: 720, margin: '0 auto', lineHeight: 1.6 }}>
                Every transition is assumed to be <strong>hostile</strong>: incumbent documentation is untrusted, CMDBs contain ghost assets, and ground truth must be reconstructed autonomously via parallel multi-agent telemetry analysis.
              </div>
            </div>

            {/* Flight Simulator Banner */}
            <div style={{
              marginBottom: 28,
              padding: '16px 22px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 30 }}>🕹️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Transition Control Tower & 56-Day Flight Simulator
                    <span className="badge bam" style={{ fontSize: 10, padding: '2px 6px' }}>Dual-Mode Simulator</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>
                    Interactive 9-week pre-flight simulation (180d traditional $\to$ 56d compressed) or live project telemetry with Neo4j Bloom glowing topology & hierarchical tree breakdowns.
                  </div>
                </div>
              </div>
              <button
                className="btn bp"
                onClick={openControlTowerSimulator}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#090d16', fontWeight: 700, border: 'none', padding: '9px 18px', fontSize: 13, cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>Launch Flight Simulator →</span>
              </button>
            </div>

            {/* 3 Transition Type Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 44 }}>
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
                    padding: 24,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--bl)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--bd)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ fontSize: 32 }}>{t.icon}</span>
                      <span className={`badge ${t.badgeClass}`}>{t.badge}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)', marginBottom: 10 }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--mu)', lineHeight: 1.6, marginBottom: 18 }}>
                      {t.summary}
                    </div>
                    <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
                      {t.highlights.map((h, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--tx)', display: 'flex', gap: 8, marginBottom: 8, lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--bl)', fontWeight: 700 }}>›</span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <button className="btn bp" style={{ fontSize: 13, padding: '9px 16px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                      <span>Configure {t.title.split(' ')[0]} Scope &amp; Adapters →</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Previously Analyzed Projects List */}
            {existingApps.length > 0 && (
              <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Previously Analyzed Transition Projects</span>
                    <span className="badge btl2">{existingApps.length} active</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--mu)' }}>Click any project to inspect knowledge fabric</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {existingApps.map(a => {
                    const typeLabel = a.transition_type === 'itis' ? 'ITIS' : a.transition_type === 'business_process' ? 'BPS' : 'Application';
                    const badgeClass = a.transition_type === 'itis' ? 'bgr' : a.transition_type === 'business_process' ? 'bor' : 'bbl';
                    return (
                      <div
                        key={a.app_id || a.project_id}
                        className="card"
                        onClick={() => switchApp(a)}
                        style={{
                          cursor: 'pointer',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          background: 'var(--sf)',
                          border: '1px solid var(--bd)',
                          borderRadius: 8,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--bl)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--bd)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bl)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.display_name || a.repo_name}
                          </div>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: 9 }}>{typeLabel}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                          {a.files ? `${a.files} components` : 'Indexed'} · {a.indexed_at ? new Date(a.indexed_at).toLocaleDateString() : 'Active'}
                        </div>
                        <div style={{ fontSize: 11, color: '#38d9a9', fontWeight: 600, marginTop: 4 }}>
                          Open Dashboard →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Full Page Configuration */
          <div>
            {/* Breadcrumb / Back Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button
                className="btn bs"
                onClick={() => setSelectedType(null)}
                style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>← Back to Project Types</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--mu)' }}>Configuring:</span>
                <span className={`badge ${transitionTypes.find(t => t.id === selectedType)?.badgeClass}`}>
                  {transitionTypes.find(t => t.id === selectedType)?.title}
                </span>
              </div>
            </div>

            <DynamicTransitionInputs
              transitionType={selectedType}
              onBack={() => setSelectedType(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
