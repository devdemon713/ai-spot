import React from 'react';

const CATEGORIES = ['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC'];
const CAT_LABELS = {
  OPEN: 'OPEN', SC: 'SC', ST: 'ST', VJ_DT: 'VJ/DT',
  NTB: 'NTB', NTC: 'NTC', NTD: 'NTD', OBC: 'OBC', SEBC: 'SEBC'
};

function getG(branch, cat) { return branch.stateLevel?.[cat]?.general || 0; }
function getL(branch, cat) { return branch.stateLevel?.[cat]?.ladies  || 0; }
function getCatTotal(branch, cat) { return getG(branch, cat) + getL(branch, cat); }
function getRowTotal(branch) { return CATEGORIES.reduce((s, c) => s + getCatTotal(branch, c), 0); }
function getPwdTotal(branch) {
  return CATEGORIES.reduce((s, c) =>
    s + (branch.pwd?.[c]?.general || 0) + (branch.pwd?.[c]?.ladies || 0), 0
  ) + (branch.pwdCommonReserved || 0);
}
function getDefTotal(branch) {
  return CATEGORIES.reduce((s, c) =>
    s + (branch.def?.[c]?.general || 0) + (branch.def?.[c]?.ladies || 0), 0
  ) + (branch.defCommonReserved || 0);
}

function BranchSummaryChart({ branches, flashId }) {
  if (!branches || branches.length === 0) return null;

  const grandTotal = branches.reduce((s, b) => s + (b.totalVacant || 0), 0);

  // Grand total per category G / L
  const catGrandG = CATEGORIES.map(cat => branches.reduce((s, b) => s + getG(b, cat), 0));
  const catGrandL = CATEGORIES.map(cat => branches.reduce((s, b) => s + getL(b, cat), 0));
  const catGrandGL = CATEGORIES.map((_, i) => catGrandG[i] + catGrandL[i]);
  const grandStateTotal = catGrandGL.reduce((s, v) => s + v, 0);

  return (
    <section aria-labelledby="branch-chart-title" style={{ marginBottom: '24px' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px', flexWrap: 'wrap', gap: '8px'
      }}>
        <div>
          <h2 id="branch-chart-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📊 Live Vacancy Summary — All Branches
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Updates in real-time as admin changes seat counts
          </p>
        </div>
        <div style={{
          background: '#FFFF00', color: '#000', fontWeight: 800, fontSize: '13px',
          padding: '5px 16px', borderRadius: '3px', border: '1.5px solid #ccc', whiteSpace: 'nowrap'
        }}>
          Total Vacant CAP Seats: {grandTotal}
        </div>
      </div>

      {/* Scrollable table wrapper */}
      <div style={{
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        borderRadius: '8px', border: '1px solid #D0D0D0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: '11px',
          background: '#fff', minWidth: `${340 + CATEGORIES.length * 54}px`
        }}>
          <thead>
            {/* College header */}
            <tr>
              <td colSpan={4 + CATEGORIES.length * 2 + 2} style={{
                background: '#fff', padding: '8px 12px',
                borderBottom: '2px solid #8B1A1A', fontSize: '13px'
              }}>
                <span style={{ fontWeight: 800, color: '#8B1A1A' }}>
                  06007 — Walchand College of Engineering, Sangli
                </span>
                <span style={{
                  marginLeft: '14px', fontSize: '11px', color: '#666', fontWeight: 400
                }}>
                  Government-Aided Autonomous &nbsp;|&nbsp; State CET Cell — Spot Round Vacancy
                </span>
              </td>
            </tr>

            {/* Category headers (colspan=2 each for G / L) */}
            <tr style={{ background: '#F0F0F0' }}>
              <th style={th} rowSpan={2}>#</th>
              <th style={{ ...th, textAlign: 'left', minWidth: '120px', maxWidth: '140px' }} rowSpan={2}>Branch / Course</th>
              <th style={{ ...th, minWidth: '55px', maxWidth: '65px' }} rowSpan={2}>Type</th>
              <th style={{ ...th, minWidth: '36px' }} rowSpan={2}>SI</th>
              {CATEGORIES.map(cat => (
                <th key={cat} style={{ ...th, borderBottom: '1px solid #CCC' }} colSpan={2}>
                  {CAT_LABELS[cat]}
                </th>
              ))}
              <th style={{ ...th, background: '#FFF9E6', minWidth: '52px' }} rowSpan={2}>TOTAL<br />(G+L)</th>
              <th style={{ ...th, background: '#FFFF00', color: '#000', minWidth: '70px', fontSize: '13px' }} rowSpan={2}>VACANT</th>
            </tr>

            {/* G / L sub-headers */}
            <tr style={{ background: '#F8F8F8' }}>
              {CATEGORIES.map(cat => (
                <React.Fragment key={cat}>
                  <th style={{ ...th, color: '#555', fontSize: '10px', fontWeight: 700 }}>G</th>
                  <th style={{ ...th, color: '#D97706', fontSize: '10px', fontWeight: 700 }}>L</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {branches.map((branch, idx) => {
              const isFlash = flashId === branch._id;
              const rowTotal = getRowTotal(branch);
              const vacant   = branch.totalVacant || 0;
              const isAided  = branch.type === 'Aided';

              return (
                <tr
                  key={branch._id}
                  className={isFlash ? 'seat-flash' : ''}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                    borderBottom: '1px solid #E8E8E8',
                    transition: 'background 0.3s'
                  }}
                >
                  {/* # */}
                  <td style={{ ...td, color: '#999', fontSize: '10px' }}>{idx + 1}</td>

                  {/* Branch name */}
                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, paddingLeft: '8px', color: 'var(--text-primary)', maxWidth: '140px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {branch.name}
                  </td>

                  {/* Type */}
                  <td style={{ ...td, maxWidth: '65px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 5px', borderRadius: '12px',
                      fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap',
                      background: isAided ? 'rgba(37,99,235,0.1)' : 'rgba(217,119,6,0.1)',
                      color: isAided ? '#2563EB' : '#D97706'
                    }}>{branch.type}</span>
                  </td>

                  {/* Code */}

                  {/* SI */}
                  <td style={{ ...td, color: '#666' }}>{branch.sanctionedIntake || '—'}</td>

                  {/* G / L per category */}
                  {CATEGORIES.map(cat => {
                    const g = getG(branch, cat);
                    const l = getL(branch, cat);
                    return (
                      <React.Fragment key={cat}>
                        {/* General */}
                        <td style={{
                          ...td,
                          fontWeight: g > 0 ? 700 : 400,
                          color: g > 0 ? '#059669' : '#CCC',
                          borderRight: 'none'
                        }}>
                          {g > 0 ? g : <span style={{ color: '#CCC' }}>0</span>}
                        </td>
                        {/* Ladies */}
                        <td style={{
                          ...td,
                          fontWeight: l > 0 ? 700 : 400,
                          color: l > 0 ? '#D97706' : '#CCC',
                          borderLeft: '1px dashed #E0E0E0'
                        }}>
                          {l > 0 ? l : <span style={{ color: '#CCC' }}>0</span>}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* State Level Total */}
                  <td style={{ ...td, background: '#FFF9E6', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {rowTotal}
                  </td>

                  {/* Overall Vacant + PWD/DEF breakdown */}
                  {(() => {
                    const pwdT = getPwdTotal(branch);
                    const defT = getDefTotal(branch);
                    return (
                      <td style={{
                        ...td,
                        background: vacant > 0 ? '#F0FDF4' : '#FFF5F5',
                        fontWeight: 900, fontSize: '17px',
                        color: vacant > 0 ? '#059669' : '#DC2626',
                        letterSpacing: '-0.5px',
                        verticalAlign: 'middle',
                        lineHeight: 1.1,
                        padding: '6px 4px'
                      }}>
                        {vacant}
                        {(pwdT > 0 || defT > 0) && (
                          <div style={{
                            marginTop: '5px',
                            paddingTop: '4px',
                            borderTop: '1px solid rgba(0,0,0,0.08)',
                            display: 'flex',
                            gap: '3px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                          }}>
                            {pwdT > 0 && (
                              <span style={{
                                fontSize: '9px', fontWeight: 800, letterSpacing: 0,
                                background: '#DC2626', color: '#fff',
                                borderRadius: '3px', padding: '1px 5px',
                                display: 'inline-block', whiteSpace: 'nowrap'
                              }}>PWD:{pwdT}</span>
                            )}
                            {defT > 0 && (
                              <span style={{
                                fontSize: '9px', fontWeight: 800, letterSpacing: 0,
                                background: '#D97706', color: '#fff',
                                borderRadius: '3px', padding: '1px 5px',
                                display: 'inline-block', whiteSpace: 'nowrap'
                              }}>DEF:{defT}</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })()}

                </tr>
              );
            })}
          </tbody>

        </table>
      </div>
    </section>

  );
}

// ── Style tokens ─────────────────────────────────────────────────────────────
const th = {
  padding: '6px 5px',
  border: '1px solid #D0D0D0',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '11px',
  color: '#333',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  whiteSpace: 'nowrap'
};

const td = {
  padding: '6px 5px',
  border: '1px solid #E0E0E0',
  textAlign: 'center',
  fontSize: '11px',
  color: '#333',
  verticalAlign: 'middle'
};

function pill(color) {
  return {
    fontSize: '9px', fontWeight: 700, padding: '1px 5px',
    borderRadius: '8px', background: color + '18', color,
    border: `1px solid ${color}44`, whiteSpace: 'nowrap'
  };
}

export default BranchSummaryChart;
