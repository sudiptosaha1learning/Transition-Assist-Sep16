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

  function go(id) {
    if (!unlocked) return;
    setScene(id);
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
      <div className="nsec">Core capabilities</div>
      {CORE_NAV.map(renderItem)}
      <div className="nsec">Transition intelligence</div>
      {TRANSITION_NAV.map(renderItem)}
    </nav>
  );
}
