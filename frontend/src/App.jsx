import React from 'react';
import { useApp } from './state/AppContext.jsx';
import Wizard from './components/Wizard.jsx';
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

export default function App() {
  const { showWizard, activeApp } = useApp();

  return (
    <>
      <Wizard />
      <div id="app-shell" className={!showWizard ? 'visible' : ''}>
        <Header />
        <div className="app-context-bar" id="context-bar">
          <div className="acb-dot" />
          <div>Analysing: <span className="acb-name">{activeApp ? (activeApp.display_name || activeApp.repo_name) : '—'}</span></div>
          <div style={{ marginLeft: 12 }}>{activeApp ? `${activeApp.files} files · ${activeApp.chunks} vectors` : ''}</div>
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
          </main>
        </div>
      </div>
    </>
  );
}
