import React, { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { ITSM_URL, getJson, postJson, postForm } from '../../api.js';

export default function Itsm() {
  const { activeApp, scene, modelParams } = useApp();
  const [tab, setTab] = useState('analyse');
  const [status, setStatus] = useState(null);

  const [ciName, setCiName] = useState((activeApp && (activeApp.display_name || activeApp.repo_name)) || '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const [simQ, setSimQ] = useState('');
  const [simBusy, setSimBusy] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const [file, setFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    setCiName((activeApp && (activeApp.display_name || activeApp.repo_name)) || '');
  }, [activeApp]);

  useEffect(() => {
    if (scene !== 'itsm') return;
    checkItsmStatus();
    runItsm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, activeApp]);

  async function checkItsmStatus() {
    try {
      const aid = activeApp ? activeApp.app_id : '';
      const d = await getJson(`${ITSM_URL}/status?app_id=${aid}`);
      setStatus(d);
    } catch { /* itsm service unreachable */ }
  }

  async function runItsm() {
    const ci = ciName.trim() || (activeApp && activeApp.display_name) || '';
    setBusy(true);
    try {
      const d = await postJson(`${ITSM_URL}/analyse`, { ci_name: ci, limit: 50, app_id: activeApp ? activeApp.app_id : '', ...modelParams() });
      setResult(d);
    } catch {
      try { setResult(await getJson(`${ITSM_URL}/mock-analysis`)); } catch { /* noop */ }
    }
    setBusy(false);
  }

  async function runSimilar() {
    if (!simQ.trim()) return;
    setSimBusy(true);
    try {
      const d = await postJson(`${ITSM_URL}/similar`, { incident_description: simQ, top_k: 5, app_id: activeApp ? activeApp.app_id : '' });
      setSimResult(d);
    } catch (e) {
      setSimResult({ error: e.message });
    }
    setSimBusy(false);
  }

  async function uploadTickets() {
    if (!file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('app_id', activeApp ? activeApp.app_id : '');
      const d = await postForm(`${ITSM_URL}/upload-tickets`, fd);
      setUploadResult(d);
      checkItsmStatus();
    } catch (e) {
      setUploadResult({ message: 'Error: ' + e.message });
    }
    setUploadBusy(false);
  }

  const s = (result && result.summary) || {};

  return (
    <div className={`scene ${scene === 'itsm' ? 'active' : ''}`}>
      <h1>ITSM incident analysis</h1>
      <div className="sdesc">Historical incident patterns, recurring failures, and similar incident search for the active application.</div>

      {status && (
        <div>
          {status.mode === 'live' && <div className="conn-banner"><span>✓</span> Connected to ServiceNow: <strong>{status.instance}</strong></div>}
          {status.mode === 'uploaded' && <div className="conn-banner"><span>✓</span> {status.tickets_uploaded} tickets loaded from <strong>{status.upload_meta && status.upload_meta.filename}</strong></div>}
          {status.mode === 'mock' && <div className="mock-banner"><span>ℹ</span> {status.message}</div>}
        </div>
      )}

      <div className="tabs">
        <div className={`tab ${tab === 'analyse' ? 'active' : ''}`} onClick={() => setTab('analyse')}>Incident analysis</div>
        <div className={`tab ${tab === 'similar' ? 'active' : ''}`} onClick={() => setTab('similar')}>Find similar incidents</div>
        <div className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Upload more tickets</div>
      </div>

      {tab === 'analyse' && (
        <div className="tab-pane active">
          <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><label className="il">CI name</label><input type="text" value={ciName} onChange={e => setCiName(e.target.value)} /></div>
            <button className="btn bor" disabled={busy} onClick={runItsm}>{busy ? <div className="sp" /> : 'Analyse'}</button>
          </div>
          {result && (
            <div>
              <div className="card">
                {result.data_source === 'mock' && <div className="mock-banner" style={{ marginBottom: 8 }}><span>ℹ</span> Demo data — upload a CSV/Excel or configure ServiceNow for live analysis</div>}
                {result.data_source === 'uploaded_file' && <div className="conn-banner" style={{ marginBottom: 8 }}><span>✓</span> Uploaded file: <strong>{result.data_source_label}</strong></div>}
                <div className="ct">Summary</div>
                <div className="mg4">
                  <div className="met"><div className="mv" style={{ color: 'var(--bl)' }}>{s.total_incidents || 0}</div><div className="ml">Total</div></div>
                  <div className="met"><div className="mv" style={{ color: 'var(--rd)' }}>{s.p1_critical || 0}</div><div className="ml">P1</div></div>
                  <div className="met"><div className="mv" style={{ color: 'var(--am)' }}>{s.sla_breach_count || 0}</div><div className="ml">SLA breaches</div></div>
                  <div className="met"><div className="mv" style={{ color: 'var(--gr)' }}>{s.sla_compliance_pct || 0}%</div><div className="ml">Compliance</div></div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.75, padding: 9, background: 'var(--bg)', borderRadius: 6 }}>{result.ai_summary}</div>
              </div>
              <div className="card">
                <div className="ct">Recurring patterns</div>
                {(result.recurring_patterns || []).map((p, i) => (
                  <PatternItem key={i} p={p} />
                ))}
              </div>
              <div className="card">
                <div className="ct">Knowledge transfer risks</div>
                {(result.knowledge_transfer_risks || []).map((r, i) => (
                  <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid var(--bd)', fontSize: 12, color: 'var(--am)', display: 'flex', gap: 6 }}><span>⚠</span>{r}</div>
                ))}
              </div>
              <div className="card">
                <div className="ct">Incident history</div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table>
                    <thead><tr><th>Number</th><th>Date</th><th>Priority</th><th>Description</th><th>Resolved by</th></tr></thead>
                    <tbody>
                      {(result.tickets || []).map((t, i) => {
                        const pc = t.priority && t.priority.includes('1 -') ? 'brd2' : t.priority && t.priority.includes('2 -') ? 'bam' : 'bbl';
                        return (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace', color: 'var(--bl)' }}>{t.number}</td>
                            <td style={{ color: 'var(--mu)' }}>{t.opened}</td>
                            <td><span className={`badge ${pc}`}>{(t.priority || '').split(' - ')[0]}</span></td>
                            <td>{t.description}</td>
                            <td style={{ color: 'var(--mu)' }}>{t.resolved_by}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'similar' && (
        <div className="tab-pane active">
          <div className="card">
            <div className="ct">Describe the current incident</div>
            <textarea style={{ minHeight: 60 }} value={simQ} onChange={e => setSimQ(e.target.value)} placeholder="Describe the symptoms, error messages, or behaviour you are seeing..." />
            <div style={{ marginTop: 8 }}><button className="btn bor" disabled={simBusy} onClick={runSimilar}>{simBusy ? <div className="sp" /> : 'Find similar incidents'}</button></div>
            {simResult && (
              <div className="rb show">
                <div className="ct">Closest historical cases</div>
                <div>
                  {simResult.error && <div>Error: {simResult.error}</div>}
                  {!simResult.error && (!simResult.results || simResult.results.length === 0) && (
                    <div style={{ fontSize: 12, color: 'var(--mu)', padding: 10 }}>No similar incidents found. Upload ticket history to enable search.</div>
                  )}
                  {!simResult.error && (simResult.results || []).map((res, i) => {
                    const t = res.ticket || {};
                    const sim = res.similarity || res.score || 0;
                    return (
                      <div className="sim-item" key={i}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bl)' }}>{t.number || 'TKT-' + i}</span>
                          <span className={`badge ${t.priority && t.priority.includes('1 -') ? 'brd2' : t.priority && t.priority.includes('2 -') ? 'bam' : 'bbl'}`}>{(t.priority || '').split(' - ')[0] || '?'}</span>
                          <span style={{ fontSize: 11, color: 'var(--gr)' }}>{Math.round((sim || 0) * 100)}% similar</span>
                          <span style={{ fontSize: 10, color: 'var(--mu)', marginLeft: 'auto' }}>{t.opened || ''}</span>
                        </div>
                        <div style={{ fontSize: 12, margin: '3px 0' }}>{t.description || ''}</div>
                        {t.resolution && <div className="sim-res">✓ {t.resolution}</div>}
                        <div className="sim-meta">Resolved by: {t.resolved_by || '—'} · {t.category || ''}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 6 }}>
                  {simResult && !simResult.error ? `${simResult.source === 'vector_search' ? 'Semantic search' : 'Keyword match'} · ${(simResult.results || []).length} results` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="tab-pane active">
          <div className="card">
            <div className="info-banner"><span>ℹ</span> Upload additional CSV or Excel ticket exports to enrich the incident index.</div>
            <div className="ig"><label className="il">CSV or Excel file</label><input type="file" accept=".csv,.xlsx,.xls" onChange={e => setFile(e.target.files[0])} /></div>
            <button className="btn bor" disabled={uploadBusy} onClick={uploadTickets}>{uploadBusy ? <div className="sp" /> : 'Upload & Index'}</button>
            {uploadResult && (
              <div className="rb show">
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gr)' }}>{uploadResult.message || 'Uploaded'}</div>
                <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 5 }}>Columns: {(uploadResult.columns_detected || []).join(', ')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PatternItem({ p }) {
  const [open, setOpen] = useState(false);
  const sc = p.severity === 'high' ? 'brd2' : p.severity === 'medium' ? 'bam' : 'bbl';
  return (
    <div className="pat-item">
      <div className="pi-hdr" onClick={() => setOpen(o => !o)}>
        <span className={`badge ${sc}`}>{p.severity}</span><span className="pi-title">{p.pattern}</span>
        <span style={{ fontSize: 10, color: 'var(--mu)' }}>{p.occurrences} occurrences</span>
      </div>
      <div className={`pi-body ${open ? 'open' : ''}`}>
        <div>{p.insight}</div>
        <div className="pi-rec"><strong>Fix:</strong> {p.recommendation}</div>
      </div>
    </div>
  );
}
