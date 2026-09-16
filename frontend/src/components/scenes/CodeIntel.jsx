import React, { useState } from 'react';
import { marked } from 'marked';
import { useApp } from '../../state/AppContext.jsx';
import { CODEINTEL_URL, postJson } from '../../api.js';

const QUICK_QUESTIONS = [
  { label: 'Entry points', q: 'What are the main entry points and how does the application start?' },
  { label: 'External dependencies', q: 'What external APIs and services does this application depend on?' },
  { label: 'Data models', q: 'What are the main data models or database schemas?' },
  { label: 'Environment setup', q: 'What environment variables are required to run this application?' },
];

export default function CodeIntel() {
  const { activeApp, scene, modelParams } = useApp();
  const [question, setQuestion] = useState(QUICK_QUESTIONS[0].q);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);

  const appLabel = (activeApp && (activeApp.display_name || activeApp.repo_name)) || 'this application';

  async function runIntel() {
    if (!question.trim()) return;
    setBusy(true);
    const t0 = Date.now();
    try {
      const d = await postJson(`${CODEINTEL_URL}/query`, {
        question, top_k: 15, app_id: activeApp ? activeApp.app_id : '', ...modelParams(),
      });
      setAnswer({
        html: marked.parse(d.answer || d.detail || 'No answer — check the codeintel service logs for details.'),
        sources: d.sources || [],
        timing: `Answered in ${((Date.now() - t0) / 1000).toFixed(1)}s from ${(d.sources || []).length} source files`,
      });
    } catch (e) {
      setAnswer({ html: 'Error: ' + e.message, sources: [], timing: '' });
    }
    setBusy(false);
  }

  return (
    <div className={`scene ${scene === 'intel' ? 'active' : ''}`}>
      <h1>Code intelligence</h1>
      <div className="sdesc">Ask any question about the {appLabel} codebase — answered from the actual source files.</div>
      <div className="card">
        <div className="ct">Quick questions</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 9 }}>
          {QUICK_QUESTIONS.map(qq => (
            <button key={qq.label} className="btn bgh" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => setQuestion(qq.q)}>{qq.label}</button>
          ))}
        </div>
        <textarea style={{ minHeight: 52 }} value={question} onChange={e => setQuestion(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button className="btn bp" disabled={busy} onClick={runIntel}>{busy ? <div className="sp" /> : 'Ask AI'}</button>
        </div>
        {answer && (
          <div className="rb show">
            <div className="ct">Answer</div>
            <div className="ans runbook-prose" style={{ maxHeight: 'none' }} dangerouslySetInnerHTML={{ __html: answer.html }} />
            <div style={{ marginTop: 8 }}>
              <div className="ct">Sources</div>
              <div>{answer.sources.map((s, i) => <span className="stag" key={i}>{s}</span>)}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--mu)' }}>{answer.timing}</div>
          </div>
        )}
      </div>
    </div>
  );
}
