import React, { useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { TRIAGE_URL, postJson } from '../../api.js';

export default function Triage() {
  const { activeApp, scene, modelParams } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [incidentActive, setIncidentActive] = useState(false);
  const [result, setResult] = useState(null);

  const appLabel = (activeApp && (activeApp.display_name || activeApp.repo_name)) || 'this application';

  async function runTriage(demo) {
    const t = demo ? 'Application is down — critical failure' : title.trim();
    const d0 = demo ? 'All core services returning 500. Users cannot access the application. Team is blocked.' : desc.trim();
    if (!t) return;
    if (demo) {
      setTitle(t); setDesc(d0);
      setIncidentActive(true);
    }
    setBusy(true);
    const t0 = Date.now();
    try {
      const d = demo
        ? await postJson(`${TRIAGE_URL}/demo/inject-p1`, modelParams())
        : await postJson(`${TRIAGE_URL}/triage`, { title: t, description: d0, ...modelParams() });
      setResult({ ...d, timing: `Triaged in ${((Date.now() - t0) / 1000).toFixed(1)}s` });
    } catch (e) {
      setResult({ resolution: 'Error: ' + e.message });
    }
    setBusy(false);
  }

  const sevColor = result && result.severity === 'P1' ? 'var(--rd)' : result && result.severity === 'P2' ? 'var(--am)' : 'var(--bl)';

  return (
    <div className={`scene ${scene === 'triage' ? 'active' : ''}`}>
      <h1>Live incident triage</h1>
      <div className="sdesc">AI diagnoses incidents in the {appLabel} codebase in seconds.</div>
      {incidentActive && (
        <div style={{ background: 'var(--rd2)', border: '1px solid var(--rd)', borderRadius: 7, padding: '10px 13px', marginBottom: 11, display: 'flex' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rd)', flexShrink: 0 }} />
          <div style={{ marginLeft: 8 }}>
            <div style={{ fontWeight: 600, color: 'var(--rd)', fontSize: 12 }}>INCIDENT ACTIVE</div>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>Critical failure — {appLabel}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}><span className="badge brd2">P1</span></div>
        </div>
      )}
      <div className="card">
        <div className="ct">Ticket details</div>
        <div style={{ marginBottom: 9 }}><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ticket title / short description" /></div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the incident — symptoms, error messages, impact on users" />
        <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
          <button className="btn bp" disabled={busy} onClick={() => runTriage(false)}>{busy ? <div className="sp" /> : 'Triage ticket'}</button>
          <button className="btn brd" onClick={() => runTriage(true)}>Fire demo P1</button>
        </div>
        {result && (
          <div className="rb show">
            <div className="mg3">
              <div className="met"><div className="mv" style={{ fontSize: 20, color: sevColor }}>{result.severity || 'P2'}</div><div className="ml">Severity</div></div>
              <div className="met"><div className="mv" style={{ fontSize: 20, color: 'var(--am)' }}>{(result.estimated_fix_minutes || '?') + ' min'}</div><div className="ml">Fix time</div></div>
              <div className="met"><div className="mv" style={{ fontSize: 20, color: result.auto_resolvable ? 'var(--gr)' : 'var(--rd)' }}>{result.auto_resolvable ? 'Yes' : 'No'}</div><div className="ml">Auto-resolvable</div></div>
            </div>
            <div className="sr"><span className="sk">Category</span><span>{result.category || ''}</span></div>
            <div className="sr"><span className="sk">Ticket ID</span><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{result.ticket_id || ''}</span></div>
            <div style={{ marginTop: 10 }}><div className="ct">Resolution</div><div style={{ background: 'var(--bg)', borderRadius: 6, padding: 9, fontSize: 11, lineHeight: 1.8 }}>{result.resolution || 'Manual investigation required.'}</div></div>
            <div style={{ marginTop: 8 }}><div className="ct">AI reasoning</div><div style={{ fontSize: 11, color: 'var(--mu)' }}>{result.reasoning || ''}</div></div>
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--mu)' }}>{result.timing}</div>
          </div>
        )}
      </div>
    </div>
  );
}
