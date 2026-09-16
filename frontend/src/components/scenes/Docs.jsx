import React, { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { DOCS_URL, getJson, postJson, postForm } from '../../api.js';

export default function Docs() {
  const { activeApp, scene, modelParams } = useApp();
  const [mode, setMode] = useState('');
  const [docs, setDocs] = useState([]);

  const [srcTab, setSrcTab] = useState('file');
  const [docType, setDocType] = useState('Architecture');
  const [file, setFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [cfUrl, setCfUrl] = useState('');
  const [cfUser, setCfUser] = useState('');
  const [cfToken, setCfToken] = useState('');
  const [cfSpace, setCfSpace] = useState('');
  const [cfBusy, setCfBusy] = useState(false);
  const [cfStatus, setCfStatus] = useState({ text: '', color: 'var(--mu)' });

  const [question, setQuestion] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    if (scene !== 'docs') return;
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, activeApp]);

  async function loadDocs() {
    try {
      const aid = activeApp ? activeApp.app_id : '';
      const d = await getJson(`${DOCS_URL}/documents?app_id=${aid}`);
      setMode(d.mode || '');
      setDocs(d.documents || []);
    } catch { /* docs service unreachable */ }
  }

  async function uploadDoc() {
    if (!file) { alert('Select a file'); return; }
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('doc_type', docType); fd.append('app_id', activeApp ? activeApp.app_id : '');
      const d = await postForm(`${DOCS_URL}/upload`, fd);
      if (d.error) throw new Error(d.error);
      alert(d.message);
      setFile(null);
      await loadDocs();
    } catch (e) { alert('Error: ' + e.message); }
    setUploadBusy(false);
  }

  async function fetchConfluence() {
    if (!cfUrl || !cfUser || !cfToken) { alert('Please fill in Confluence URL, email, and API token'); return; }
    setCfBusy(true);
    setCfStatus({ text: 'Connecting to Confluence...', color: 'var(--mu)' });
    try {
      const d = await postJson(`${DOCS_URL}/fetch-confluence`, {
        base_url: cfUrl, username: cfUser, api_token: cfToken,
        space_key: cfSpace, app_id: activeApp ? activeApp.app_id : '', max_pages: 50,
      });
      setCfStatus({ text: '✓ ' + d.message, color: 'var(--gr)' });
      await loadDocs();
    } catch (e) {
      setCfStatus({ text: 'Error: ' + e.message, color: 'var(--rd)' });
    }
    setCfBusy(false);
  }

  async function queryDocs() {
    if (!question.trim()) return;
    setQBusy(true);
    try {
      const d = await postJson(`${DOCS_URL}/query`, { question, app_id: activeApp ? activeApp.app_id : '', ...modelParams() });
      setAnswer(d);
    } catch (e) {
      setAnswer({ answer: 'Error: ' + e.message, sources: [] });
    }
    setQBusy(false);
  }

  return (
    <div className={`scene ${scene === 'docs' ? 'active' : ''}`}>
      <h1>Reference document intelligence</h1>
      <div className="sdesc">Ask questions answered from uploaded specs, architecture docs, and manuals — not just the codebase.</div>
      {mode === 'empty' && (
        <div className="mock-banner" style={{ display: 'flex' }}><span>ℹ</span> No documents uploaded yet. Upload docs to get answers from your actual specifications.</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ct">Document library</div>
          <div>
            {docs.map((doc, i) => {
              const ext = (doc.name.split('.').pop() || '').toUpperCase();
              return (
                <div className="doc-item" key={i}>
                  <div className="doc-icon">{ext}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--mu)' }}>{doc.type} · {doc.chunks} chunks</div>
                  </div>
                  <span className="badge bgr">indexed</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
            <div className="tabs" style={{ marginBottom: 10 }}>
              <div className={`tab ${srcTab === 'file' ? 'active' : ''}`} onClick={() => setSrcTab('file')}>File upload</div>
              <div className={`tab ${srcTab === 'confluence' ? 'active' : ''}`} onClick={() => setSrcTab('confluence')}>Confluence</div>
            </div>
            {srcTab === 'file' && (
              <div className="tab-pane active">
                <div className="ig"><label className="il">Type</label>
                  <select style={{ width: '100%' }} value={docType} onChange={e => setDocType(e.target.value)}>
                    {['Architecture', 'Functional Spec', 'Config Spec', 'Technical Design', 'Policy', 'Runbook', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="ig"><label className="il">File (PDF, DOCX, TXT, MD)</label><input type="file" accept=".pdf,.docx,.txt,.md" onChange={e => setFile(e.target.files[0])} /></div>
                <button className="btn bpu" disabled={uploadBusy} onClick={uploadDoc}>{uploadBusy ? <div className="sp" /> : 'Upload & Index'}</button>
              </div>
            )}
            {srcTab === 'confluence' && (
              <div className="tab-pane active">
                <div style={{ background: 'var(--bl2)', border: '1px solid var(--bl)', borderRadius: 6, padding: '7px 10px', marginBottom: 10, fontSize: 11, color: 'var(--bl)' }}>
                  &#9432; Generate an API token at <strong>id.atlassian.com/manage-profile/security/api-tokens</strong>
                </div>
                <div className="ig"><label className="il">Confluence base URL</label><input type="text" value={cfUrl} onChange={e => setCfUrl(e.target.value)} placeholder="https://your-org.atlassian.net" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="ig"><label className="il">Email</label><input type="text" value={cfUser} onChange={e => setCfUser(e.target.value)} placeholder="you@company.com" /></div>
                  <div className="ig"><label className="il">API token</label><input type="password" value={cfToken} onChange={e => setCfToken(e.target.value)} placeholder="ATATT3x..." /></div>
                </div>
                <div className="ig"><label className="il">Space key <span className="optional-tag">optional — leave blank for all spaces</span></label><input type="text" value={cfSpace} onChange={e => setCfSpace(e.target.value)} placeholder="ENG, ARCH, DEV..." /></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn bpu" disabled={cfBusy} onClick={fetchConfluence}>{cfBusy ? <div className="sp" /> : 'Connect & index'}</button>
                  <div style={{ fontSize: 11, color: cfStatus.color }}>{cfStatus.text}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="ct">Ask across all documents</div>
          <textarea style={{ minHeight: 52 }} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask any question about the application based on uploaded documentation..." />
          <div style={{ marginTop: 8 }}><button className="btn bpu" disabled={qBusy} onClick={queryDocs}>{qBusy ? <div className="sp" /> : 'Ask'}</button></div>
          {answer && (
            <div className="rb show">
              <div className="ct">Answer</div><div className="ans">{answer.answer || 'No answer.'}</div>
              <div style={{ marginTop: 8 }}>
                <div className="ct">Sources</div>
                <div>
                  {(answer.sources || []).map((s, i) => (
                    <div key={i} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--bd)', color: 'var(--mu)' }}>
                      <span style={{ color: 'var(--pu)' }}>{s.doc}</span> · {s.section}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
