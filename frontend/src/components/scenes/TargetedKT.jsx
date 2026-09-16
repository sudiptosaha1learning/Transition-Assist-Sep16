import React, { useState } from 'react';
import { useApp } from '../../state/AppContext.jsx';

export default function TargetedKT() {
  const { activeApp, scene, answerKTQuestion } = useApp();
  const [answers, setAnswers] = useState({});
  const [smeNames, setSmeNames] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [feedback, setFeedback] = useState({});

  if (scene !== 'targeted_kt') return null;

  const ktPacks = activeApp?.kt_packs || [];
  const answeredCount = ktPacks.filter(q => q.status === 'answered').length;
  const pendingCount = ktPacks.length - answeredCount;

  async function handleAnswerSubmit(qId) {
    const ans = answers[qId];
    if (!ans || !ans.trim()) {
      alert('Please enter the SME answer to update the knowledge graph.');
      return;
    }
    const sme = smeNames[qId] || 'Assigned SME';
    setSubmittingId(qId);
    try {
      await answerKTQuestion(qId, ans, sme);
      setFeedback(prev => ({
        ...prev,
        [qId]: '✓ Knowledge Graph updated: Agent has reconciled this entity and verified ground truth.'
      }));
    } catch (err) {
      alert('Submission failed: ' + err.message);
    }
    setSubmittingId(null);
  }

  function handleExportMarkdown() {
    let md = `# Targeted KT Question Pack: ${activeApp?.display_name || 'Transition'}\n\n`;
    md += `*Generated automatically by Lumina Transition Assist Multi-Agent Engine*\n`;
    md += `*Bypasses 40-hour open-ended walkthroughs; targets un-reconstructed graph anomalies.*\n\n`;

    ktPacks.forEach((q, idx) => {
      md += `### ${idx + 1}. [${q.tower}] To: ${q.target_sme}\n`;
      md += `**Anomaly:** ${q.anomaly}\n`;
      md += `**Question:** ${q.question}\n`;
      md += `**Status:** ${q.status === 'answered' ? `Answered (${q.answer})` : 'Pending SME Response'}\n\n`;
    });

    navigator.clipboard.writeText(md);
    alert('Targeted KT Question Pack copied to clipboard as Markdown!');
  }

  return (
    <div className={`scene ${scene === 'targeted_kt' ? 'active' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1>Targeted KT Question Packs</h1>
          <div className="sdesc">
            Replaces broad, open-ended KT workshops with laser-targeted questions addressing specific gaps the AI couldn't reconstruct from telemetry alone.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn bs" onClick={handleExportMarkdown} style={{ fontSize: 11, padding: '6px 12px' }}>
            📋 Copy Question Pack (MD)
          </button>
          <span className="badge bgr" style={{ fontSize: 12, padding: '6px 12px' }}>
            {answeredCount}/{ktPacks.length} Questions Reconciled
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ktPacks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>
            No targeted KT questions generated yet. Run project analysis to synthesize questions.
          </div>
        ) : (
          ktPacks.map((q, idx) => {
            const isAnswered = q.status === 'answered';
            const fb = feedback[q.id];
            return (
              <div
                key={q.id}
                className="card"
                style={{
                  background: isAnswered ? 'rgba(46, 204, 113, 0.03)' : 'var(--sf1)',
                  border: isAnswered ? '1px solid var(--gr)' : '1px solid var(--bd)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge bbl" style={{ fontSize: 10 }}>{q.tower}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
                      Assigned SME: {q.target_sme}
                    </span>
                  </div>
                  <span className={`badge ${isAnswered ? 'bgr' : 'bam'}`} style={{ fontSize: 10 }}>
                    {isAnswered ? '✓ Reconciled & Verified' : '⏳ Action Required'}
                  </span>
                </div>

                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bl)', marginBottom: 8, lineHeight: 1.5 }}>
                  {idx + 1}. {q.question}
                </div>

                <div style={{ background: 'var(--sf2)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: 'var(--mu)', marginBottom: 12, display: 'flex', gap: 16 }}>
                  <div><strong>Graph Anomaly:</strong> {q.anomaly}</div>
                  <div><strong>Synthesis Context:</strong> {q.context}</div>
                </div>

                {fb && (
                  <div style={{ background: 'rgba(46, 204, 113, 0.12)', border: '1px solid var(--gr)', color: 'var(--gr)', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
                    {fb}
                  </div>
                )}

                {isAnswered ? (
                  <div style={{ background: 'rgba(46, 204, 113, 0.08)', border: '1px solid var(--gr)', borderRadius: 6, padding: '10px 12px', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--gr)', marginBottom: 2 }}>
                      ✓ SME Answer Recorded & Ground Truth Reconciled:
                    </div>
                    <div style={{ color: 'var(--tx)' }}>{q.answer}</div>
                    {q.reconciled_at && (
                      <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>
                        Reconciled at {new Date(q.reconciled_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 12, marginTop: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr auto', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="SME Name"
                        value={smeNames[q.id] || ''}
                        onChange={e => setSmeNames({ ...smeNames, [q.id]: e.target.value })}
                        style={{ fontSize: 12 }}
                      />
                      <input
                        type="text"
                        placeholder="Enter direct, concise answer to reconcile this graph gap..."
                        value={answers[q.id] || ''}
                        onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                        style={{ fontSize: 12 }}
                      />
                      <button
                        className="btn bp"
                        disabled={submittingId === q.id}
                        onClick={() => handleAnswerSubmit(q.id)}
                        style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}
                      >
                        {submittingId === q.id ? <div className="sp" /> : '⚡ Reconcile Graph'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
