import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { INDEXER_URL, DOCS_URL, ITSM_URL, getJson, postJson, postForm } from '../api.js';

function titleCase(s) {
  return (s || '').replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Wizard() {
  const { showWizard, enterPlatform, setShowWizard } = useApp();
  const [step, setStep] = useState(1);

  // Step 1 — repository
  const [repoUrl, setRepoUrl] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [oaiOverride, setOaiOverride] = useState('');
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, message: 'Starting...', files: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [err, setErr] = useState('');
  const [existingApps, setExistingApps] = useState([]);
  const [indexedApp, setIndexedApp] = useState(null); // app just indexed in this session
  const pollRef = useRef(null);

  // Step 2 — documents
  const [docTab, setDocTab] = useState('file');
  const [docType, setDocType] = useState('Architecture');
  const [docFile, setDocFile] = useState(null);
  const [wUploadedDocs, setWUploadedDocs] = useState([]);
  const [docBusy, setDocBusy] = useState(false);
  const [cfUrl, setCfUrl] = useState('');
  const [cfUser, setCfUser] = useState('');
  const [cfToken, setCfToken] = useState('');
  const [cfSpace, setCfSpace] = useState('');
  const [cfBusy, setCfBusy] = useState(false);
  const [cfStatus, setCfStatus] = useState('');

  // Step 3 — ITSM
  const [itsmTab, setItsmTab] = useState('snow');
  const [snowInst, setSnowInst] = useState('');
  const [snowUser, setSnowUser] = useState('');
  const [snowPass, setSnowPass] = useState('');
  const [itsmFile, setItsmFile] = useState(null);
  const [itsmBusy, setItsmBusy] = useState(false);
  const [itsmStatus, setItsmStatus] = useState('');
  const [ticketsUploaded, setTicketsUploaded] = useState(false);

  useEffect(() => {
    if (showWizard) {
      loadExistingApps();
      setStep(1);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [showWizard]);

  async function loadExistingApps() {
    try {
      const d = await getJson(`${INDEXER_URL}/apps`);
      setExistingApps(d.apps || []);
    } catch { /* indexer not reachable yet */ }
  }

  async function startIndex() {
    if (!repoUrl.trim()) { alert('Please enter a GitHub repository URL'); return; }
    setIndexing(true);
    setShowProgress(true);
    setErr('');
    try {
      const d = await postJson(`${INDEXER_URL}/reindex`, {
        repo_url: repoUrl, git_token: gitToken, openai_api_key: oaiOverride,
      });
      if (d.error) throw new Error(d.error);
      pollRef.current = setInterval(pollWizard, 2000);
    } catch (e) {
      setErr('Error: ' + e.message);
      setIndexing(false);
    }
  }

  async function pollWizard() {
    try {
      const d = await getJson(`${INDEXER_URL}/status`);
      setProgress(d);
      if (d.status === 'done') {
        clearInterval(pollRef.current); pollRef.current = null;
        const app = {
          app_id: d.app_id, repo_url: d.repo_url, repo_name: d.repo_name,
          display_name: titleCase(d.repo_name), files: d.files, chunks: d.chunks,
        };
        setIndexedApp(app);
        setIndexing(false);
        setStep(2);
      }
      if (d.status === 'error') {
        clearInterval(pollRef.current); pollRef.current = null;
        setErr('Indexing failed: ' + d.message);
        setIndexing(false);
      }
    } catch { /* transient network hiccup — keep polling */ }
  }

  async function selectExistingApp(a) {
    try { await fetch(`${INDEXER_URL}/apps/${a.app_id}/activate`, { method: 'POST' }); } catch { /* noop */ }
    enterPlatform({
      app_id: a.app_id, display_name: a.display_name || a.repo_name,
      repo_url: a.repo_url, repo_name: a.display_name || a.repo_name,
      files: a.files, chunks: a.chunks,
    });
  }

  async function wUploadDoc() {
    if (!docFile) return;
    setDocBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', docFile); fd.append('doc_type', docType);
      fd.append('app_id', indexedApp ? indexedApp.app_id : '');
      const d = await postForm(`${DOCS_URL}/upload`, fd);
      if (d.error) throw new Error(d.error);
      setWUploadedDocs(prev => [...prev, { name: docFile.name, type: docType, chunks: d.message }]);
      setDocFile(null);
    } catch (e) { alert('Upload error: ' + e.message); }
    setDocBusy(false);
  }

  async function wFetchConfluence() {
    if (!cfUrl || !cfUser || !cfToken) { alert('Please fill in Confluence URL, email, and API token'); return; }
    setCfBusy(true);
    setCfStatus('Connecting...');
    try {
      const d = await postJson(`${DOCS_URL}/fetch-confluence`, {
        base_url: cfUrl, username: cfUser, api_token: cfToken,
        space_key: cfSpace, app_id: indexedApp ? indexedApp.app_id : '', max_pages: 50,
      });
      setWUploadedDocs(prev => [...prev, { name: `Confluence: ${cfSpace || 'all spaces'} (${d.pages_fetched} pages)`, type: 'Confluence', chunks: d.chunks_indexed }]);
      setCfStatus('✓ ' + d.message);
    } catch (e) { setCfStatus('Error: ' + e.message); }
    setCfBusy(false);
  }

  async function wUploadTickets() {
    if (!itsmFile) return;
    setItsmBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', itsmFile); fd.append('app_id', indexedApp ? indexedApp.app_id : '');
      const d = await postForm(`${ITSM_URL}/upload-tickets`, fd);
      if (d.error) throw new Error(d.error);
      setTicketsUploaded(true);
      setItsmStatus('✓ ' + d.message);
    } catch (e) { setItsmStatus('Error: ' + e.message); }
    setItsmBusy(false);
  }

  function finish() {
    if (indexedApp) enterPlatform(indexedApp);
  }

  if (!showWizard) return null;

  return (
    <div id="wizard">
      <div className="wiz-card">
        <div className="wiz-logo">Lumina <span>Transition</span> Platform</div>
        <div className="wiz-sub">AI-powered vendor transition intelligence</div>

        <div className="wiz-steps">
          {[
            { n: 1, label: 'Repository' },
            { n: 2, label: 'Documents' },
            { n: 3, label: 'ITSM / Tickets' },
            { n: 4, label: 'Ready', dot: '✓' },
          ].map(s => (
            <div key={s.n} className={`wiz-step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}>
              <div className="wiz-step-dot">{s.dot || s.n}</div>
              <div className="wiz-step-label">{s.label}</div>
              {s.n !== 4 && <div className="wiz-step-line" />}
            </div>
          ))}
        </div>

        {/* Step 1: Repository */}
        {step === 1 && (
          <div className="wiz-pane active">
            <div className="wiz-title">Connect your application</div>
            <div className="wiz-desc">Enter the Git repository URL (GitHub, GitLab, Bitbucket, Azure DevOps) for the application you want to analyse. The AI will read every source file and build a complete knowledge base before you start.</div>
            <div className="ig"><label className="il">Git repository URL</label>
              <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/... or https://dev.azure.com/..." />
            </div>
            <div className="ig"><label className="il">Access token / App password <span className="optional-tag">optional — private repos only</span></label>
              <input type="password" value={gitToken} onChange={e => setGitToken(e.target.value)} placeholder="Enter PAT or password" />
            </div>
            <div className="ig"><label className="il">OpenAI API key override <span className="optional-tag">optional — uses server default</span></label>
              <input type="password" value={oaiOverride} onChange={e => setOaiOverride(e.target.value)} placeholder="sk-... (leave blank to use server key)" />
            </div>

            {showProgress && (
              <div>
                <div className="prog-wrap">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="pm">{progress.message || ''}</span><span className="pp">{progress.progress || 0}%</span>
                  </div>
                  <div className="pb"><div className="pf" style={{ width: `${progress.progress || 0}%` }} /></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>{progress.files ? `${progress.files} files scanned` : ''}</div>
              </div>
            )}
            {err && <div className="wiz-err show">{err}</div>}

            <div className="wiz-actions">
              <button className="btn bp" disabled={indexing} onClick={startIndex}>
                {indexing ? <div className="sp" /> : (err ? 'Retry' : 'Analyse this repository')}
              </button>
            </div>

            {existingApps.length > 0 && (
              <div className="existing-apps">
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--mu)' }}>Or open a previously indexed application</div>
                <div>
                  {existingApps.map(a => (
                    <div className="app-chip" key={a.app_id} onClick={() => selectExistingApp(a)}>
                      <div className="app-dot" />
                      <div className="app-chip-name">{a.display_name || a.repo_name}</div>
                      <div className="app-chip-meta">{a.files} files · last indexed {a.indexed_at ? new Date(a.indexed_at).toLocaleDateString() : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Documents */}
        {step === 2 && (
          <div className="wiz-pane active">
            <div className="wiz-title">Connect knowledge sources <span className="optional-tag" style={{ fontSize: 14 }}>optional</span></div>
            <div className="wiz-desc">Upload files or connect Confluence. Everything gets indexed alongside the codebase so the AI answers from all sources at once.</div>
            <div className="tabs" style={{ marginBottom: 14 }}>
              <div className={`tab ${docTab === 'file' ? 'active' : ''}`} onClick={() => setDocTab('file')}>File upload</div>
              <div className={`tab ${docTab === 'confluence' ? 'active' : ''}`} onClick={() => setDocTab('confluence')}>Confluence</div>
            </div>
            {docTab === 'file' && (
              <div className="tab-pane active">
                <div style={{ marginBottom: 12 }}>
                  {wUploadedDocs.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bd)', fontSize: 12 }}>
                      <span className="badge bgr">✓</span><span>{d.name}</span><span style={{ color: 'var(--mu)' }}>{d.type}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}><label className="il">Document type</label>
                    <select value={docType} onChange={e => setDocType(e.target.value)}>
                      {['Architecture', 'Functional Spec', 'Config Spec', 'Technical Design', 'Policy', 'Runbook', 'Other'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 2 }}><label className="il">File (PDF, DOCX, TXT, MD)</label>
                    <input type="file" accept=".pdf,.docx,.txt,.md" onChange={e => setDocFile(e.target.files[0])} />
                  </div>
                  <button className="btn bpu" disabled={docBusy} onClick={wUploadDoc}>{docBusy ? <div className="sp" /> : 'Upload'}</button>
                </div>
              </div>
            )}
            {docTab === 'confluence' && (
              <div className="tab-pane active">
                <div style={{ background: 'var(--bl2)', border: '1px solid var(--bl)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: 'var(--bl)' }}>
                  &#9432; You need an Atlassian API token — generate one at <strong>id.atlassian.com/manage-profile/security/api-tokens</strong>
                </div>
                <div className="ig"><label className="il">Confluence base URL</label>
                  <input type="text" value={cfUrl} onChange={e => setCfUrl(e.target.value)} placeholder="https://your-org.atlassian.net" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ig"><label className="il">Atlassian account email</label>
                    <input type="text" value={cfUser} onChange={e => setCfUser(e.target.value)} placeholder="you@company.com" /></div>
                  <div className="ig"><label className="il">API token</label>
                    <input type="password" value={cfToken} onChange={e => setCfToken(e.target.value)} placeholder="ATATT3x..." /></div>
                </div>
                <div className="ig"><label className="il">Space key <span className="optional-tag">optional — leave blank to fetch all spaces</span></label>
                  <input type="text" value={cfSpace} onChange={e => setCfSpace(e.target.value)} placeholder="ENG, ARCH, DEV... (comma-separated)" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn bpu" disabled={cfBusy} onClick={wFetchConfluence}>{cfBusy ? <div className="sp" /> : 'Connect & index'}</button>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>{cfStatus}</div>
                </div>
              </div>
            )}
            <div className="wiz-actions">
              <button className="btn bpu" onClick={() => setStep(3)}>Continue →</button>
              <span className="skip-link" onClick={() => setStep(3)}>Skip for now</span>
            </div>
          </div>
        )}

        {/* Step 3: ITSM */}
        {step === 3 && (
          <div className="wiz-pane active">
            <div className="wiz-title">Connect ticket history <span className="optional-tag" style={{ fontSize: 14 }}>optional</span></div>
            <div className="wiz-desc">Connect ServiceNow or upload a CSV/Excel export of your ticket history. This enables historical incident analysis and "find similar incidents" search during the transition.</div>
            <div className="tabs" style={{ marginBottom: 14 }}>
              <div className={`tab ${itsmTab === 'snow' ? 'active' : ''}`} onClick={() => setItsmTab('snow')}>ServiceNow</div>
              <div className={`tab ${itsmTab === 'file' ? 'active' : ''}`} onClick={() => setItsmTab('file')}>Upload file</div>
            </div>
            {itsmTab === 'snow' && (
              <div className="tab-pane active">
                <div className="ig"><label className="il">ServiceNow instance</label><input type="text" value={snowInst} onChange={e => setSnowInst(e.target.value)} placeholder="dev12345.service-now.com" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ig"><label className="il">Username</label><input type="text" value={snowUser} onChange={e => setSnowUser(e.target.value)} placeholder="admin" /></div>
                  <div className="ig"><label className="il">Password</label><input type="password" value={snowPass} onChange={e => setSnowPass(e.target.value)} placeholder="••••••••" /></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>Credentials are passed directly to your ServiceNow instance — never stored by this platform.</div>
              </div>
            )}
            {itsmTab === 'file' && (
              <div className="tab-pane active">
                <div className="ig"><label className="il">CSV or Excel ticket export</label><input type="file" accept=".csv,.xlsx,.xls" onChange={e => setItsmFile(e.target.files[0])} /></div>
                <button className="btn bor" disabled={itsmBusy} onClick={wUploadTickets}>{itsmBusy ? <div className="sp" /> : 'Upload & Index tickets'}</button>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 8 }}>{itsmStatus}</div>
              </div>
            )}
            <div className="wiz-actions">
              <button className="btn bor" onClick={() => setStep(4)}>Continue →</button>
              <span className="skip-link" onClick={() => setStep(4)}>Skip for now</span>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="wiz-pane active">
            <div className="wiz-success show">
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr)', marginBottom: 8 }}>✓ Application ready for analysis</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.7 }}>
                {indexedApp ? `${indexedApp.display_name || indexedApp.repo_name} · ${indexedApp.files} files · ${indexedApp.chunks} vectors indexed.` : ''}
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>What's been set up:</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 2 }}>
                ✓ Codebase indexed — {indexedApp ? indexedApp.files : 0} files, {indexedApp ? indexedApp.chunks : 0} vectors<br />
                {wUploadedDocs.length ? `✓ ${wUploadedDocs.length} reference document(s) indexed` : '○ No reference documents added'}<br />
                {ticketsUploaded ? '✓ Ticket history uploaded and indexed' : '○ No ticket history added'}
              </div>
            </div>
            <div className="wiz-actions" style={{ marginTop: 20 }}>
              <button className="btn bgr2" onClick={finish}>Open platform →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
