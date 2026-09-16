import React, { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';
import { CODEINTEL_URL, getJson } from '../../api.js';

export default function Overview() {
  const { activeApp, scene } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (scene !== 'overview') return;
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp, scene]);

  async function loadOverview() {
    setLoading(true);
    setErrMsg('');
    try {
      const appId = activeApp ? activeApp.app_id : '';
      const d = await getJson(`${CODEINTEL_URL}/overview?app_id=${encodeURIComponent(appId)}`);
      setData(d);
    } catch (e) {
      setErrMsg('Could not load overview: ' + e.message);
    }
    setLoading(false);
  }

  const appName = (data && data.application_name) || (activeApp && activeApp.display_name) || 'Application';
  const cx = data && data.complexity_rating;
  const cxClass = cx === 'High' || cx === 'Very High' ? 'brd2' : cx === 'Medium' ? 'bam' : 'bgr';
  const stack = (data && data.tech_stack) || {};
  const dataSources = [...((data && data.data_sources) || []), ...((data && data.integrations) || [])];

  return (
    <div className={`scene ${scene === 'overview' ? 'active' : ''}`}>
      <h1>{data ? `${appName} — Overview` : 'Application overview'}</h1>
      <div className="sdesc">Auto-generated from the indexed codebase and uploaded documents.</div>

      {loading && <div style={{ color: 'var(--mu)', fontSize: 13, padding: '20px 0' }}>{errMsg || 'Loading application overview...'}</div>}

      {!loading && data && (
        <div>
          <div className="card" style={{ background: 'var(--sf2)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bl)', marginBottom: 6 }}>{appName}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.75, marginBottom: 10 }}>{data.application_summary}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {data.business_domain && <span className="badge btl2">{data.business_domain}</span>}
              {cx && <span className={`badge ${cxClass}`}>{cx} complexity</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <div className="ct">Tech stack</div>
              <div>
                {Object.entries(stack).filter(([, v]) => v && (Array.isArray(v) ? v.length : true)).map(([k, v]) => (
                  <div className="sr" key={k}><span className="sk" style={{ fontSize: 11 }}>{k}</span>
                    <span style={{ fontSize: 11, color: 'var(--tx)', textAlign: 'right' }}>{Array.isArray(v) ? v.join(', ') : v}</span></div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="ct">Data sources &amp; integrations</div>
              <div>
                {dataSources.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--bd)', color: 'var(--mu)' }}>{s}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="ct">Architecture highlights</div>
            <div>
              {(data.architecture_highlights || []).map((a, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--bd)', color: 'var(--mu)', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--tl)' }}>▸</span>{a}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="ct">Required team &amp; skills</div>
            <div>
              {(data.required_skills || []).map((sk, i) => (
                <div className="skill-card" key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sk.role}</div>
                    <span className="badge bbl">{sk.level}</span><span className="badge bgr">{sk.fte} FTE</span>
                  </div>
                  <div className="sk-tags">{(sk.skills || []).map((s, j) => <span className="sk-tag" key={j}>{s}</span>)}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>{sk.reason}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <div className="ct">Support risks</div>
              <div>
                {(data.support_risks || []).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--bd)', color: 'var(--am)', display: 'flex', gap: 6 }}>
                    <span>⚠</span>{r}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="ct">Onboarding priorities</div>
              <div>
                {(data.onboarding_priority || []).map((o, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--bd)', display: 'flex', gap: 7 }}>
                    <span style={{ color: 'var(--bl)', fontWeight: 600 }}>{i + 1}</span><span style={{ color: 'var(--mu)' }}>{o}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>
            {data.source === 'live_analysis' ? 'Generated from live codebase analysis' : 'Preview — index a repository to generate live analysis'}
          </div>
        </div>
      )}
    </div>
  );
}
