import React, { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { DEBT_URL, getJson } from '../../api.js';

export default function Debt() {
  const { activeApp, scene, currentModel, currentProvider, geminiKey, openaiKeyOverride } = useApp();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (scene !== 'debt') return;
    quickDebt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, activeApp]);

  const appName = () => (activeApp && (activeApp.display_name || activeApp.repo_name)) || '';

  async function quickDebt() {
    try {
      const an = encodeURIComponent(appName());
      const d = await getJson(`${DEBT_URL}/scan/quick?app_name=${an}`);
      setData(d);
    } catch { /* noop — leave placeholder ring */ }
  }

  async function runDebt() {
    setBusy(true);
    try {
      const an = encodeURIComponent(appName());
      const apiKey = currentProvider === 'gemini' ? geminiKey : openaiKeyOverride;
      const d = await getJson(`${DEBT_URL}/scan?app_name=${an}&model=${encodeURIComponent(currentModel)}&api_key=${encodeURIComponent(apiKey)}`, { method: 'POST' });
      setData(d);
    } catch {
      try { setData(await getJson(`${DEBT_URL}/mock-scan`)); } catch { /* noop */ }
    }
    setBusy(false);
  }

  const score = (data && data.debt_score) || 0;
  const ringColor = score >= 80 ? 'var(--gr)' : score >= 50 ? 'var(--am)' : 'var(--rd)';
  const s = (data && data.summary) || {};

  return (
    <div className={`scene ${scene === 'debt' ? 'active' : ''}`}>
      <h1>Technical debt scanner</h1>
      <div className="sdesc">Real debt signals identified from the indexed codebase — security gaps, missing tests, architecture risks.</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div className="score-ring" style={{ borderColor: data ? ringColor : 'var(--mu)', color: data ? ringColor : 'var(--mu)' }}>{data ? score : '--'}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{(data && data.debt_score_label) || 'Click Scan to analyse'}</div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 3 }}>0 = highest debt · 100 = clean codebase</div>
            <div style={{ marginTop: 9, display: 'flex', gap: 7 }}>
              <button className="btn bp" disabled={busy} onClick={runDebt}>{busy ? <div className="sp" /> : 'Scan codebase'}</button>
              <button className="btn bgh" onClick={quickDebt}>Quick preview</button>
            </div>
          </div>
        </div>
        {data && (
          <div className="mg4" style={{ display: 'grid' }}>
            <div className="met"><div className="mv" style={{ color: 'var(--rd)' }}>{s.high_severity || 0}</div><div className="ml">High</div></div>
            <div className="met"><div className="mv" style={{ color: 'var(--am)' }}>{s.medium_severity || 0}</div><div className="ml">Medium</div></div>
            <div className="met"><div className="mv" style={{ color: 'var(--bl)' }}>{s.low_severity || 0}</div><div className="ml">Low</div></div>
            <div className="met"><div className="mv" style={{ color: 'var(--mu)' }}>{s.total_effort_days || 0}d</div><div className="ml">Effort</div></div>
          </div>
        )}
      </div>
      {data && (
        <div>
          <div className="card"><div className="ct">Executive summary</div><div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.75 }}>{data.executive_summary}</div></div>
          <div className="card">
            <div className="ct">Debt items — click to expand</div>
            {(data.items || []).map((item, i) => <DebtItem key={i} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function DebtItem({ item }) {
  const [open, setOpen] = useState(false);
  const sc = item.severity === 'high' ? 'brd2' : item.severity === 'medium' ? 'bam' : 'bbl';
  return (
    <div className="debt-item">
      <div className="di-hdr" onClick={() => setOpen(o => !o)}>
        <span className="di-id">{item.id}</span><span className={`badge ${sc}`}>{item.severity}</span>
        <span className="badge bpu2" style={{ fontWeight: 400 }}>{item.category}</span>
        <span className="di-title">{item.title}</span>
        <span style={{ fontSize: 10, color: 'var(--mu)' }}>{item.effort_days}d</span>
      </div>
      <div className={`di-body ${open ? 'open' : ''}`}>
        <div style={{ marginBottom: 5 }}>{item.description}</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--mu)', marginBottom: 5 }}>{item.file}</div>
        <div className="di-rec"><strong>Fix:</strong> {item.recommendation}</div>
        <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 5 }}>Impact: {item.impact}</div>
      </div>
    </div>
  );
}
