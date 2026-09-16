import React from 'react';
import { useApp } from './state/AppContext.jsx';
import TransitionLaunchpad from './components/TransitionLaunchpad.jsx';
import AgenticOrchestrator from './components/AgenticOrchestrator.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Overview from './components/scenes/Overview.jsx';
import CodeIntel from './components/scenes/CodeIntel.jsx';
import Triage from './components/scenes/Triage.jsx';
import Runbooks from './components/scenes/Runbooks.jsx';
import Itsm from './components/scenes/Itsm.jsx';
import Docs from './components/scenes/Docs.jsx';
import Debt from './components/scenes/Debt.jsx';
import KnowledgeFabric from './components/scenes/KnowledgeFabric.jsx';
import HostileGaps from './components/scenes/HostileGaps.jsx';
import TargetedKT from './components/scenes/TargetedKT.jsx';
import CutoverRisk from './components/scenes/CutoverRisk.jsx';

export default function App() {
  const { showLaunchpad, isAnalyzing, activeApp } = useApp();

  // 1. If currently in multi-agent orchestration analysis, render full-page Orchestrator
  if (isAnalyzing) {
    return <AgenticOrchestrator />;
  }

  // 2. If on the launchpad landing or configuration flow, render full-page Launchpad
  if (showLaunchpad) {
    return <TransitionLaunchpad />;
  }

  // 3. Otherwise, render the active project platform dashboard
  const activeType = activeApp?.transition_type || 'it_application';
  const typeLabel = activeType === 'itis' ? 'ITIS' : activeType === 'business_process' ? 'Business Process Support' : 'IT Application';
  const typeBadgeClass = activeType === 'itis' ? 'bgr' : activeType === 'business_process' ? 'bor' : 'bbl';
  const scopesList = (activeApp?.scopes || []).slice(0, 3).join(', ');

  return (
    <div id="app-shell" className="visible">
      <Header />
      <div className="app-context-bar" id="context-bar">
        <div className="acb-dot" />
        <div>
          Analysing: <span className="acb-name">{activeApp ? (activeApp.display_name || activeApp.repo_name) : '—'}</span>
          {activeApp && (
            <span className={`badge ${typeBadgeClass}`} style={{ fontSize: 10, marginLeft: 8, padding: '2px 8px' }}>
              {typeLabel}
            </span>
          )}
        </div>
        {scopesList && (
          <div style={{ marginLeft: 12, color: 'var(--mu)', fontSize: 12 }}>
            Scope: {scopesList}
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--mu)' }}>
          {activeApp ? `${activeApp.files || 0} components · ${activeApp.chunks || 0} vectors` : ''}
        </div>
      </div>
      <div className="body-row">
        <Sidebar />
        <main>
          <Overview />
          <CodeIntel />
          <Triage />
          <Runbooks />
          <Itsm />
          <Docs />
          <Debt />
          <KnowledgeFabric />
          <HostileGaps />
          <TargetedKT />
          <CutoverRisk />
        </main>
      </div>
    </div>
  );
}
