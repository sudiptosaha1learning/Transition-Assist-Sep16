import React from 'react';
import { useApp } from '../../state/AppContext.jsx';

export default function CutoverRisk() {
  const { activeApp, scene } = useApp();

  if (scene !== 'cutover_risk') return null;

  const gaps = activeApp?.gaps || [];
  const ktPacks = activeApp?.kt_packs || [];
  const totalGaps = gaps.length || 1;
  const resolvedGaps = gaps.filter(g => g.status === 'reconciled').length;
  const resolvedKT = ktPacks.filter(q => q.status === 'answered').length;

  // Dynamic readiness calculation
  const baseScore = 55;
  const gapBonus = Math.round((resolvedGaps / totalGaps) * 30);
  const ktBonus = ktPacks.length ? Math.round((resolvedKT / ktPacks.length) * 15) : 15;
  const readinessScore = Math.min(100, baseScore + gapBonus + ktBonus);

  const readinessColor = readinessScore >= 85 ? 'var(--gr)' : readinessScore >= 70 ? 'var(--am)' : 'var(--rd)';

  const checklistItems = [
    { label: 'Ground-Truth Architecture Verification', status: resolvedGaps > 0 ? 'Verified' : 'In Progress', icon: '✓' },
    { label: 'Ghost Asset & Undocumented IP Resolution', status: resolvedGaps >= totalGaps ? 'Completed' : 'Action Required', icon: resolvedGaps >= totalGaps ? '✓' : '⚠️' },
    { label: 'Targeted SME Knowledge Transfer Signoff', status: resolvedKT === ktPacks.length ? 'Completed' : 'Pending Responses', icon: resolvedKT === ktPacks.length ? '✓' : '⏳' },
    { label: 'Day-1 Privileged Access & Credential Turnover', status: 'Verified', icon: '✓' },
    { label: 'Emergency Rollback & Escalation Playbooks', status: 'Ready in Runbooks', icon: '✓' }
  ];

  const spofPersonnel = [
    { name: 'D. Evans / Lead Architect', scope: 'Core Network / SD-WAN & Auth', concentration: '87% of P1 Resolutions', flightRisk: 'High (Leaving at Cutover)' },
    { name: 'M. Chen / Sr DBA', scope: 'Database Schema Migrations', concentration: '84% of Direct Commits', flightRisk: 'Medium (Contract Ending)' },
    { name: 'R. Sharma / Treasury Lead', scope: 'Wire Authorizations >$500k', concentration: '92% Solo Approver', flightRisk: 'Critical (Not Transferring)' }
  ];

  return (
    <div className={`scene ${scene === 'cutover_risk' ? 'active' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1>Cutover & Single-Point-of-Failure (SPOF) Risk</h1>
          <div className="sdesc">
            Evaluates Day-1 operational cutover viability, tribal knowledge concentration, and vendor flight risks.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', textTransform: 'uppercase' }}>Day-1 Cutover Readiness</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: readinessColor }}>
            {readinessScore} / 100
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Day-1 Checklist */}
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>Day-1 Operational Readiness Checklist</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checklistItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--sf2)', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: item.status.includes('Completed') || item.status === 'Verified' ? 'var(--gr)' : 'var(--am)', fontWeight: 700 }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--tx)' }}>{item.label}</span>
                </div>
                <span className={`badge ${item.status.includes('Completed') || item.status === 'Verified' ? 'bgr' : 'bam'}`} style={{ fontSize: 11 }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Readiness Summary */}
        <div className="card" style={{ background: 'var(--sf2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="ct">Transition Risk Summary</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.7, marginTop: 8 }}>
              {readinessScore >= 85 ? (
                <span>Autonomous reconciliation is healthy. Most dark dependencies have been verified with SME signoffs. Cutover risk is within acceptable parameters.</span>
              ) : (
                <span>Hostile transition mode active. Unresolved gaps and pending SME responses represent significant cutover risk. Resolve open items in the Gap Register before Go/No-Go signoff.</span>
              )}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span>Open Hostile Gaps:</span>
              <strong style={{ color: 'var(--rd)' }}>{gaps.length - resolvedGaps}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Pending KT Questionnaires:</span>
              <strong style={{ color: 'var(--am)' }}>{ktPacks.length - resolvedKT}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SPOF & Flight Risk Personnel */}
      <div className="card">
        <div className="ct" style={{ marginBottom: 12 }}>Tribal Knowledge Bottlenecks & Vendor Flight Risks</div>
        <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 14 }}>
          Personnel with extreme knowledge concentration who represent single points of operational failure.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {spofPersonnel.map((p, idx) => (
            <div key={idx} style={{ background: 'var(--sf2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--tx)' }}>{p.name}</div>
                <span className="badge brd2" style={{ fontSize: 10 }}>{p.flightRisk}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--bl)', marginBottom: 4 }}>Scope: {p.scope}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)' }}>Concentration: {p.concentration}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
