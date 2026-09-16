import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { useApp } from '../../state/AppContext.jsx';
import { DOCGEN_URL, getJson, postJson } from '../../api.js';

export default function Runbooks() {
  const { activeApp, scene, modelParams } = useApp();
  const [subject, setSubject] = useState('Application startup and environment setup');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {id, title, wordCount, html, raw, timing}
  const [savedRunbooks, setSavedRunbooks] = useState([]);
  const [saved, setSaved] = useState(false);

  const appLabel = (activeApp && (activeApp.display_name || activeApp.repo_name)) || 'this application';

  useEffect(() => {
    if (activeApp && scene === 'runbooks') {
      loadSavedRunbooks();
      setResult(null);
      setSaved(false);
    }
  }, [activeApp, scene]);

  async function loadSavedRunbooks() {
    if (!activeApp) return;
    try {
      const d = await getJson(`${DOCGEN_URL}/runbooks?app_id=${activeApp.app_id}`);
      setSavedRunbooks(d.runbooks || []);
    } catch (e) {
      console.error("Failed to load saved runbooks:", e);
    }
  }

  async function genRb() {
    if (!subject.trim()) return;
    setBusy(true);
    const t0 = Date.now();
    try {
      const d = await postJson(`${DOCGEN_URL}/generate`, { 
        doc_type: 'runbook', 
        subject, 
        ...modelParams() 
      });
      const raw = d.content || '';
      setResult({
        id: null,
        title: d.title || ('Runbook: ' + subject),
        wordCount: d.word_count || 0,
        html: marked.parse(raw),
        raw,
        timing: `Generated in ${((Date.now() - t0) / 1000).toFixed(1)}s from source code`,
      });
      setSaved(false);
    } catch (e) {
      setResult({ title: 'Error', wordCount: 0, html: 'Error: ' + e.message, raw: '', timing: '' });
      setSaved(false);
    }
    setBusy(false);
  }

  async function saveRb() {
    if (!result || !activeApp) return;
    try {
      const d = await postJson(`${DOCGEN_URL}/runbooks`, {
        app_id: activeApp.app_id,
        title: result.title,
        content: result.raw
      });
      setResult(prev => ({ ...prev, id: d.doc_id }));
      setSaved(true);
      loadSavedRunbooks();
    } catch (e) {
      alert("Failed to save runbook: " + e.message);
    }
  }

  function loadSelectedRunbook(rb) {
    setResult({
      id: rb.id,
      title: rb.title,
      wordCount: rb.word_count,
      html: marked.parse(rb.content),
      raw: rb.content,
      timing: `Loaded from persistent storage`
    });
    setSaved(true);
  }

  async function deleteRb(rbId, e) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this runbook from storage?')) return;
    try {
      await fetch(`${DOCGEN_URL}/runbooks/${rbId}`, { method: 'DELETE' });
      if (result && result.id === rbId) {
        setResult(null);
        setSaved(false);
      }
      loadSavedRunbooks();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  function downloadRunbook() {
    if (!result) return;
    const title = (result.title || 'runbook').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const blob = new Blob([result.raw], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title + '.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className={`scene ${scene === 'runbooks' ? 'active' : ''}`}>
      <h1>Auto runbook generation</h1>
      <div className="sdesc">Generate runbooks from the actual {appLabel} source code and save them for team reference.</div>
      
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Runbook Storage Repository */}
        <div className="card" style={{ flex: '1 1 250px', maxWidth: 300, minWidth: 230 }}>
          <div className="ct">Runbook Repository</div>
          {savedRunbooks.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--mu)', fontStyle: 'italic', padding: '10px 0' }}>
              No saved runbooks for this application. Generate one and click Save to store it here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {savedRunbooks.map(rb => (
                <div 
                  key={rb.id} 
                  onClick={() => loadSelectedRunbook(rb)}
                  style={{
                    padding: '8px 10px',
                    background: result && result.id === rb.id ? 'var(--bl2)' : 'var(--sf2)',
                    border: '1px solid',
                    borderColor: result && result.id === rb.id ? 'var(--bl)' : 'var(--bd)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, paddingRight: 20, wordBreak: 'break-word', color: result && result.id === rb.id ? 'var(--bl)' : 'var(--tx)' }}>
                    {rb.title.replace('Runbook: ', '')}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--mu)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{rb.word_count} words</span>
                    <span>{new Date(rb.generated_at).toLocaleDateString()}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteRb(rb.id, e)}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: 6,
                      background: 'none',
                      border: 'none',
                      color: 'var(--rd)',
                      cursor: 'pointer',
                      fontSize: 12,
                      opacity: 0.7
                    }}
                    title="Delete runbook"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generation & Viewer Panel */}
        <div style={{ flex: '2 1 450px', minWidth: 320 }}>
          <div className="card">
            <div className="ct">Generate New Runbook</div>
            <textarea style={{ minHeight: 44 }} value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Describe what runbook to generate — e.g. 'API authentication failure', 'database connection issues', 'deployment process'" />
            <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
              <button className="btn bp" disabled={busy} onClick={genRb}>{busy ? <div className="sp" /> : 'Generate runbook'}</button>
            </div>
          </div>

          {result && (
            <div className="rb show">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{result.title}</div>
                <span className="badge bgr">{result.wordCount} words</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {!saved && (
                    <button className="dl-btn" onClick={saveRb} style={{ background: 'var(--bl)', color: '#fff', border: '1px solid var(--bl)' }}>
                      💾 Save to Repository
                    </button>
                  )}
                  {saved && (
                    <span className="badge bgr" style={{ color: 'var(--gr)', border: '1px solid var(--bd)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      ✓ Saved to Repository
                    </span>
                  )}
                  <button className="dl-btn" onClick={downloadRunbook}>↓ Download .md</button>
                </div>
              </div>
              <div className="runbook-prose" dangerouslySetInnerHTML={{ __html: result.html }} />
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--mu)' }}>{result.timing}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
