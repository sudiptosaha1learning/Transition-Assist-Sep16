import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { TRIAGE_URL, INDEXER_URL, getJson } from '../api.js';

const OPENAI_GROUPS = [
  { section: 'OpenAI — recommended for demos', models: [
    { id: 'gpt-4o-mini', badge: '✓ default · all tiers', badgeClass: 'fast' },
    { id: 'gpt-4o', badge: 'multimodal', badgeClass: 'smart' },
  ]},
  { section: 'OpenAI — GPT-4.1 family (Apr 2025+)', models: [
    { id: 'gpt-4.1', badge: 'coding & agents', badgeClass: 'smart' },
    { id: 'gpt-4.1-mini', badge: 'balanced', badgeClass: 'fast' },
    { id: 'gpt-4.1-nano', badge: 'ultra-fast', badgeClass: 'fast' },
  ]},
  { section: 'OpenAI — o-series reasoning', models: [
    { id: 'o4-mini', badge: 'reasoning · fast', badgeClass: 'smart' },
    { id: 'o3', badge: 'deep reasoning', badgeClass: 'smart' },
    { id: 'o3-mini', badge: 'reasoning · cheap', badgeClass: 'fast' },
    { id: 'o1', badge: 'reasoning', badgeClass: 'smart' },
  ]},
  { section: 'OpenAI — GPT-5 family (restricted access)', warning: '⚠ Requires GPT-5 API tier. If you get errors, switch back to gpt-4o-mini.', models: [
    { id: 'gpt-5', badge: 'flagship', badgeClass: 'smart' },
    { id: 'gpt-5-mini', badge: 'fast', badgeClass: 'fast' },
    { id: 'gpt-5-nano', badge: 'cheapest', badgeClass: 'fast' },
  ]},
];
const GEMINI_GROUPS = [
  { section: 'Google Gemini — 2.5 stable (recommended)', models: [
    { id: 'gemini-2.5-pro', badge: 'best reasoning', badgeClass: 'google smart' },
    { id: 'gemini-2.5-flash', badge: 'balanced', badgeClass: 'google fast' },
    { id: 'gemini-2.5-flash-lite', badge: 'cheapest', badgeClass: 'google fast' },
  ]},
  { section: 'Google Gemini — 3.x preview', models: [
    { id: 'gemini-3.1-pro-preview', badge: 'latest · agentic', badgeClass: 'google smart' },
    { id: 'gemini-3.1-flash-lite', badge: 'latest · fast', badgeClass: 'google fast' },
  ]},
];

export default function Header() {
  const {
    activeApp, openWizard, openLaunchpad, switchApp,
    currentModel, currentProvider, setCurrentModel, setCurrentProvider,
    geminiKey, openaiKeyOverride, setGeminiKey, setOpenaiKeyOverride,
  } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [apps, setApps] = useState([]);
  const [health, setHealth] = useState('checking');
  const rootRef = useRef(null);

  useEffect(() => {
    refreshDropdown();
    checkHealth();
    const t = setInterval(checkHealth, 15000);
    return () => clearInterval(t);
  }, [activeApp]);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setModelPanelOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function refreshDropdown() {
    try {
      const d = await getJson(`${INDEXER_URL}/apps`);
      setApps(d.apps || []);
    } catch { /* indexer unreachable */ }
  }

  async function checkHealth() {
    try {
      const r = await fetch(`${TRIAGE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      setHealth(r.ok ? 'ok' : 'err');
    } catch { setHealth('err'); }
  }

  function selectModel(id, provider) {
    setCurrentModel(id);
    setCurrentProvider(provider);
  }

  function triggerReindex() {
    if (!activeApp) return;
    if (!confirm(`Re-index ${activeApp.display_name || activeApp.repo_name}? This will refresh all intelligence for this project.`)) return;
    openLaunchpad();
  }

  async function deleteAppClick(appId, displayName, e) {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${displayName}"? This will permanently erase the project and all its related codebase indexes, uploaded documents, and generated runbooks.`)) return;
    try {
      const r = await fetch(`${INDEXER_URL}/apps/${appId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      
      if (activeApp && (activeApp.app_id === appId || activeApp.project_id === appId)) {
        const remaining = apps.filter(a => a.app_id !== appId && a.project_id !== appId);
        if (remaining.length > 0) {
          switchApp(remaining[0]);
        } else {
          localStorage.removeItem('lumina_last_active_app_id');
          window.location.reload();
        }
      }
      refreshDropdown();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  const activeType = activeApp?.transition_type || 'it_application';
  const typeBadge = activeType === 'itis' ? 'ITIS' : activeType === 'business_process' ? 'BPS' : 'App';
  const typeBadgeClass = activeType === 'itis' ? 'bgr' : activeType === 'business_process' ? 'bor' : 'bbl';

  return (
    <header ref={rootRef}>
      <div className="logo" onClick={openLaunchpad} style={{ cursor: 'pointer' }}>
        Lumina <span>Transition</span>
      </div>
      <div className="app-switcher" onClick={() => setDropdownOpen(o => !o)}>
        <div className="app-dot" />
        <div className="app-name-display">{activeApp ? (activeApp.display_name || activeApp.repo_name) : 'No project selected'}</div>
        {activeApp && <span className={`badge ${typeBadgeClass}`} style={{ fontSize: 9, padding: '2px 6px', marginLeft: 4 }}>{typeBadge}</span>}
        <div className="app-caret">▾</div>
      </div>
      <div className="app-count">{apps.length} project{apps.length !== 1 ? 's' : ''}</div>
      <button className="reindex-btn" onClick={openLaunchpad} style={{ background: 'var(--bl2)', color: 'var(--bl)', borderColor: 'var(--bl)' }}>
        + New Transition
      </button>

      <div className={`app-dropdown ${dropdownOpen ? 'open' : ''}`}>
        <div>
          {apps.map(a => {
            const isCurrent = activeApp && (activeApp.app_id === a.app_id || activeApp.project_id === a.app_id);
            const aType = a.transition_type === 'itis' ? 'ITIS' : a.transition_type === 'business_process' ? 'BPS' : 'App';
            const aClass = a.transition_type === 'itis' ? 'bgr' : a.transition_type === 'business_process' ? 'bor' : 'bbl';
            return (
              <div key={a.app_id} className={`dd-item ${isCurrent ? 'dd-active' : ''}`}
                style={{ position: 'relative', paddingRight: 35 }}
                onClick={() => { setDropdownOpen(false); switchApp(a); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div className="dd-name">{a.display_name || a.repo_name}</div>
                  <span className={`badge ${aClass}`} style={{ fontSize: 9 }}>{aType}</span>
                </div>
                <div className="dd-meta">{a.files} components · indexed {a.indexed_at ? new Date(a.indexed_at).toLocaleDateString() : 'Active'}</div>
                <button
                  onClick={(e) => deleteAppClick(a.app_id, a.display_name || a.repo_name, e)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--rd)',
                    fontSize: 16,
                    cursor: 'pointer',
                    opacity: 0.6,
                    padding: '4px 6px',
                    fontWeight: 'bold'
                  }}
                  title="Delete project"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <div className="add-app-row" onClick={() => { setDropdownOpen(false); openLaunchpad(); }}>+ New Transition Project</div>
      </div>

      <div style={{ position: 'relative' }}>
        <div className="model-selector-btn" onClick={() => setModelPanelOpen(o => !o)}>
          <div className="model-dot" style={{ background: currentProvider === 'gemini' ? 'var(--am)' : 'var(--pu)' }} />
          <span>{currentModel}</span>
          <span style={{ fontSize: 10, color: 'var(--mu)' }}>▾</span>
        </div>
        <div className={`model-panel ${modelPanelOpen ? 'open' : ''}`}>
          <div className="mp-header">Model settings</div>
          <div className="mp-body">
            {OPENAI_GROUPS.map(g => (
              <React.Fragment key={g.section}>
                <div className="mp-section">{g.section}</div>
                {g.warning && <div style={{ padding: '5px 10px', fontSize: 10, color: 'var(--am)' }}>{g.warning}</div>}
                {g.models.map(m => (
                  <div key={m.id} className={`model-option ${currentModel === m.id ? 'selected' : ''}`} onClick={() => selectModel(m.id, 'openai')}>
                    <span className="mo-name">{m.id}</span><span className={`mo-badge ${m.badgeClass}`}>{m.badge}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
            {GEMINI_GROUPS.map(g => (
              <React.Fragment key={g.section}>
                <div className="mp-section">{g.section}</div>
                {g.models.map(m => (
                  <div key={m.id} className={`model-option ${currentModel === m.id ? 'selected' : ''}`} onClick={() => selectModel(m.id, 'gemini')}>
                    <span className="mo-name">{m.id}</span><span className={`mo-badge ${m.badgeClass}`}>{m.badge}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          {currentProvider === 'gemini' && (
            <div className="mp-key-section" style={{ display: 'block' }}>
              <div className="mp-key-label">Gemini API key (required for Gemini models)</div>
              <input className="mp-key-input" type="password" defaultValue={geminiKey} placeholder="AIza..."
                onChange={e => setGeminiKey(e.target.value)} />
              <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 5 }}>Key is stored in browser memory only — not sent to any server except the selected provider.</div>
            </div>
          )}
          {currentProvider === 'openai' && (
            <div className="mp-key-section" style={{ display: 'none' }}>
              <input className="mp-key-input" type="password" defaultValue={openaiKeyOverride} onChange={e => setOpenaiKeyOverride(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="hst" style={{ marginLeft: 12 }}>
        <div className={`dot ${health === 'ok' ? 'ok' : health === 'err' ? 'err' : ''}`} />
        <span className={`slb ${health === 'ok' ? 'ok' : health === 'err' ? 'err' : ''}`}>
          {health === 'ok' ? 'All services online' : health === 'err' ? 'Services offline' : 'Checking...'}
        </span>
      </div>
    </header>
  );
}
