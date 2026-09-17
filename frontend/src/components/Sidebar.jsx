import React from 'react';
import { useApp } from '../state/AppContext.jsx';
import { GRAFANA_URL, NEO4J_BROWSER_URL } from '../api.js';

const CORE_NAV = [
  { id: 'overview', num: 1, label: 'App overview', color: 'bl' },
  { id: 'intel', num: 2, label: 'Code intelligence', color: 'gr' },
  { id: 'triage', num: 3, label: 'Live P1 triage', color: 'rd' },
  { id: 'runbooks', num: 4, label: 'Auto runbooks', color: 'pu' },
];
const TRANSITION_NAV = [
  { id: 'itsm', num: 5, label: 'ITSM analysis', color: 'or', cls: 'itsm' },
  { id: 'docs', num: 6, label: 'Reference docs', color: 'pu', cls: 'docs' },
  { id: 'debt', num: 7, label: 'Technical debt', color: 'rd', cls: 'debt' },
  { id: 'fabric', num: 8, label: 'Knowledge fabric', color: 'bl', cls: 'fabric' },
];

export default function Sidebar() {
  const { scene, setScene, unlocked, activeApp } = useApp();
  const transitionType = activeApp?.transition_type || 'it_application';

  function go(id) {
    if (!unlocked) return;
    setScene(id);
  }

  let coreNav = [];
  let transitionNav = [];

  if (transitionType === 'itis') {
    coreNav = [
      { id: 'control_tower', num: 1, label: 'Control Tower (Simulator)', color: 'am' },
      { id: 'overview', num: 2, label: 'Infra Overview', color: 'bl' },
      { id: 'fabric', num: 3, label: 'Knowledge Fabric (Bloom)', color: 'bl', cls: 'fabric' },
      { id: 'gaps', num: 4, label: 'Hostile Gap & Ghost Assets', color: 'rd' },
      { id: 'targeted_kt', num: 5, label: 'Targeted KT Questions', color: 'gr' }
    ];
    transitionNav = [
      { id: 'cutover_risk', num: 6, label: 'Cutover & SPOF Risk', color: 'or' },
      { id: 'runbooks', num: 7, label: 'Infra Runbooks & SOPs', color: 'pu' },
      { id: 'triage', num: 8, label: 'Incident & Event Triage', color: 'rd' },
      { id: 'itsm', num: 9, label: 'ITSM Ticket Analysis', color: 'or', cls: 'itsm' }
    ];
  } else if (transitionType === 'business_process') {
    coreNav = [
      { id: 'control_tower', num: 1, label: 'Control Tower (Simulator)', color: 'am' },
      { id: 'overview', num: 2, label: 'Operations Overview', color: 'bl' },
      { id: 'fabric', num: 3, label: 'Process Fabric (Bloom)', color: 'bl', cls: 'fabric' },
      { id: 'gaps', num: 4, label: 'Shadow Process Gaps', color: 'rd' },
      { id: 'targeted_kt', num: 5, label: 'Targeted KT Questions', color: 'gr' }
    ];
    transitionNav = [
      { id: 'cutover_risk', num: 6, label: 'Cutover & Readiness', color: 'or' },
      { id: 'runbooks', num: 7, label: 'SOP Studio & Guides', color: 'pu' },
      { id: 'itsm', num: 8, label: 'Queue & Ticket Telemetry', color: 'or', cls: 'itsm' },
      { id: 'docs', num: 9, label: 'Operational Documents', color: 'pu', cls: 'docs' }
    ];
  } else {
    // IT Application Transition
    coreNav = [
      { id: 'control_tower', num: 1, label: 'Control Tower (Simulator)', color: 'am' },
      { id: 'overview', num: 2, label: 'App Overview', color: 'bl' },
      { id: 'intel', num: 3, label: 'Code Intelligence', color: 'gr' },
      { id: 'triage', num: 4, label: 'Live P1 Triage', color: 'rd' },
      { id: 'runbooks', num: 5, label: 'Auto Runbooks', color: 'pu' },
      { id: 'fabric', num: 6, label: 'Knowledge Fabric (Bloom)', color: 'bl', cls: 'fabric' }
    ];
    transitionNav = [
      { id: 'gaps', num: 7, label: 'Hostile Gap Register', color: 'rd' },
      { id: 'targeted_kt', num: 8, label: 'Targeted KT Questions', color: 'gr' },
      { id: 'cutover_risk', num: 9, label: 'Cutover & SPOF Risk', color: 'or' },
      { id: 'itsm', num: 10, label: 'ITSM Ticket Analysis', color: 'or', cls: 'itsm' },
      { id: 'debt', num: 11, label: 'Technical Debt', color: 'rd', cls: 'debt' }
    ];
  }

  function renderItem(item) {
    const active = scene === item.id;
    return (
      <div
        key={item.id}
        className={`ni ${item.cls || ''} ${!unlocked ? 'locked' : ''} ${active ? 'active' : ''}`}
        onClick={() => go(item.id)}
      >
        <div className="nb" style={{ background: `var(--${item.color}2)`, color: `var(--${item.color})` }}>{item.num}</div>
        {item.label}
        {!unlocked && <span className="lock-icon">🔒</span>}
      </div>
    );
  }

  return (
    <nav>
      <div className="nsec">
        {transitionType === 'itis' ? 'ITIS Core Controls' : transitionType === 'business_process' ? 'BPS Operations' : 'Application Controls'}
      </div>
      {coreNav.map(renderItem)}
      <div className="nsec">Hostile Transition Suite</div>
      {transitionNav.map(renderItem)}
    </nav>
  );
}
