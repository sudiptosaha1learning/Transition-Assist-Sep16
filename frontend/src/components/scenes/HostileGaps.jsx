import React, { useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';

export default function HostileGaps() {
  const { activeApp, scene, resolveGap } = useApp();
  const [selectedGap, setSelectedGap] = useState(null);
  const [smeInput, setSmeInput] = useState('');
  const [smeName, setSmeName] = useState('Lead SME');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (scene !== 'gaps') return null;

  const gaps = activeApp?.gaps || [];
  const openCount = gaps.filter(g => g.status === 'open').length;
  const reconciledCount = gaps.filter(g => g.status === 'reconciled').length;

  async function handleResolve(gapId) {
    if (!smeInput.trim()) {
      alert('Please enter SME response or ground-truth evidence to reconcile this gap.');
      return;
    }
    setBusy(true);
    setSuccessMsg('');
    try {
      await resolveGap(gapId, smeInput, smeName);
      setSuccessMsg('✓ Knowledge Graph updated: Agent has reconciled this entity and verified ground truth.');
      setSmeInput('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Reconciliation failed: ' + err.message);
    }
    setBusy(false);
  }

  return (
    <div className={`scene ${scene === 'gaps' ? 'active' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1>Hostile Gap & Ghost Asset Register</h1>
          <div className="sdesc">
            Discrepancies discovered between vendor documentation/CMDB and raw machine telemetry.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge brd2" style={{ padding: '6px 12px', fontSize: 12 }}>
            {openCount} Open Gaps
          </span>
          <span className="badge bgr" style={{ padding: '6px 12px', fontSize: 12 }}>
            {reconciledCount} Reconciled via SME Input
          </span>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1px solid var(--gr)', color: 'var(--gr)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {/* Gaps List */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedGap ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div>
          {gaps.length === 0 ? (
            <div className="card" style={{ color: 'var(--mu)', textAlign: 'center', padding: 40 }}>
              No discrepancies detected. Run project analysis to populate hostile gaps.
            </div>
          ) : (
            gaps.map(g => {
              const isCrit = g.severity === 'Critical';
              const isReconciled = g.status === 'reconciled';
              const isSelected = selectedGap?.id === g.id;
              return (
                <div
                  key={g.id}
                  className="card"
                  onClick={() => setSelectedGap(g)}
                  style={{
                    marginBottom: 12,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--bl)' : isReconciled ? '1px solid var(--gr)' : isCrit ? '1px solid rgba(255, 107, 107, 0.5)' : '1px solid var(--bd)',
                    background: isSelected ? 'var(--sf2)' : isReconciled ? 'rgba(46, 204, 113, 0.04)' : 'var(--sf1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className={`badge ${isCrit ? 'brd2' : 'bam'}`} style={{ fontSize: 10 }}>
                      {g.severity}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mu)' }}>{g.category}</span>
                    <span className={`badge ${isReconciled ? 'bgr' : 'bgr2'}`} style={{ fontSize: 10 }}>
                      {isReconciled ? '✓ Reconciled' : '⚠️ Open Gap'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>
                    {g.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.5, marginBottom: 8 }}>
                    <strong>Evidence:</strong> {g.evidence}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bd)', paddingTop: 6, fontSize: 11, color: 'var(--mu)' }}>
                    <span>Detected by: {g.detected_by}</span>
                    <span style={{ color: 'var(--bl)', fontWeight: 600 }}>Inspect & Resolve →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Gap Inspector & Reconciler */}
        {selectedGap && (
          <div className="card" style={{ background: 'var(--sf2)', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className={`badge ${selectedGap.severity === 'Critical' ? 'brd2' : 'bam'}`}>
                {selectedGap.severity} Severity
              </span>
              <button className="btn bs" onClick={() => setSelectedGap(null)} style={{ fontSize: 11, padding: '2px 8px' }}>
                ✕ Close
              </button>
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--bl)', marginBottom: 10 }}>
              {selectedGap.title}
            </div>

            <div style={{ marginBottom: 12, fontSize: 12, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 2 }}>Machine Telemetry Evidence:</div>
              <div style={{ background: 'var(--sf1)', border: '1px solid var(--bd)', padding: '8px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11 }}>
                {selectedGap.evidence}
              </div>
            </div>

            <div style={{ marginBottom: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 2 }}>Cutover & Operational Impact:</div>
              <div style={{ color: 'var(--mu)' }}>{selectedGap.impact}</div>
            </div>

            {selectedGap.status === 'reconciled' ? (
              <div style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid var(--gr)', borderRadius: 8, padding: 12, marginTop: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--gr)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓ Ground Truth Verified</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx)' }}>
                  <strong>SME Input:</strong> {selectedGap.resolution}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>
                  Signoff by: {selectedGap.resolved_by || 'SME'} · Knowledge graph node updated
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
                  Provide SME Ground Truth to Reconcile Knowledge Graph:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={smeName}
                    onChange={e => setSmeName(e.target.value)}
                    placeholder="SME Name / Role"
                    style={{ fontSize: 12 }}
                  />
                  <input
                    type="text"
                    value={smeInput}
                    onChange={e => setSmeInput(e.target.value)}
                    placeholder="e.g. Host is the SAP bridge; port 8443 whitelisted for vendor cutover."
                    style={{ fontSize: 12 }}
                  />
                </div>
                <button
                  className="btn bp"
                  disabled={busy}
                  onClick={() => handleResolve(selectedGap.id)}
                  style={{ width: '100%', fontSize: 12, padding: '8px 14px' }}
                >
                  {busy ? <div className="sp" /> : '⚡ Reconcile Knowledge Graph with SME Input'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
