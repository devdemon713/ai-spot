import React from 'react';

const CATEGORIES = [
  { key: 'OPEN', label: 'OPEN', bg: '#E0F2FE', color: '#0369A1', width: '4.2%' },
  { key: 'ORPHAN', label: 'ORPHAN', bg: '#FEF3C7', color: '#92400E', width: '4.2%' },
  { key: 'SC', label: 'SC', width: '3.8%' },
  { key: 'ST', label: 'ST', width: '3.8%' },
  { key: 'VJ_DT', label: 'VJ/DT', width: '3.8%' },
  { key: 'NTB', label: 'NTB/NT1', width: '4.4%' },
  { key: 'NTC', label: 'NTC/NT2', width: '4.4%' },
  { key: 'NTD', label: 'NTD/NT3', width: '4.4%' },
  { key: 'OBC', label: 'OBC', width: '3.8%' },
  { key: 'PwCR', label: 'PwCR', bg: '#F3E8FF', color: '#6D28D9', width: '4.0%' },
  { key: 'DEFCR', label: 'DEFCR', bg: '#F3E8FF', color: '#6D28D9', width: '4.0%' },
  { key: 'SEBC', label: 'SEBC', width: '3.8%' }
];

function getCatSum(details, key) {
  if (!details) return 0;
  if (key === 'OPEN') {
    return (details.OPEN?.general || 0) + (details.OPEN?.ladies || 0) + (details.OPEN?.pw || 0) + (details.OPEN?.def || 0);
  }
  if (key === 'ORPHAN') {
    return (details.ORPHAN?.general || 0);
  }
  if (key === 'PwCR') return details.PwCR || 0;
  if (key === 'DEFCR') return details.DEFCR || 0;

  const slot = details[key];
  if (!slot) return 0;
  return (slot.general || 0) + (slot.ladies || 0);
}

function sumDetails(details) {
  if (!details) return 0;
  return CATEGORIES.reduce((s, cat) => s + getCatSum(details, cat.key), 0);
}

function BranchSummaryChart({ branches, flashId, vacantOnly }) {
  if (!branches || branches.length === 0) return null;

  const getBranchTotal = (b) => {
    const nonSponMatrixTotal = sumDetails(b.nonSponsoredDetails);
    const nonSponTotal = nonSponMatrixTotal > 0
      ? nonSponMatrixTotal
      : (b.effectiveNonSponsoredVacant || b.nonSponsoredVacant || 0);

    const sponMatrixTotal = sumDetails(b.sponsoredDetails);
    const sponTotal = sponMatrixTotal > 0
      ? sponMatrixTotal
      : (b.effectiveSponsoredVacant || b.sponsoredVacant || 0);

    return b.totalVacant !== undefined && b.totalVacant !== null ? b.totalVacant : (nonSponTotal + sponTotal);
  };

  const visibleBranches = vacantOnly
    ? branches.filter(b => getBranchTotal(b) > 0)
    : branches;

  const grandTotal = visibleBranches.reduce((s, b) => s + (b.totalVacant || 0), 0);

  // Category totals across all branches
  const colTotalsNonSponsored = CATEGORIES.map(c =>
    visibleBranches.reduce((s, b) => s + getCatSum(b.nonSponsoredDetails, c.key), 0)
  );
  const colTotalsSponsored = CATEGORIES.map(c =>
    visibleBranches.reduce((s, b) => s + getCatSum(b.sponsoredDetails, c.key), 0)
  );
  const colTotalsCombined = CATEGORIES.map((_, i) => colTotalsNonSponsored[i] + colTotalsSponsored[i]);

  const grandNonSponsoredTotal = visibleBranches.reduce((s, b) => {
    const matrixSum = sumDetails(b.nonSponsoredDetails);
    return s + (matrixSum > 0 ? matrixSum : (b.effectiveNonSponsoredVacant || b.nonSponsoredVacant || 0));
  }, 0);

  const grandSponsoredTotal = visibleBranches.reduce((s, b) => {
    const matrixSum = sumDetails(b.sponsoredDetails);
    return s + (matrixSum > 0 ? matrixSum : (b.effectiveSponsoredVacant || b.sponsoredVacant || 0));
  }, 0);

  return (
    <section aria-labelledby="branch-chart-title" style={{ marginBottom: '24px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px', flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h2 id="branch-chart-title" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📊 Live Vacancy Summary — All Branches
          </h2>
          <div style={{
            background: '#FFFF00', color: '#000', fontWeight: 800, fontSize: '12px',
            padding: '4px 12px', borderRadius: '4px', border: '1.5px solid #CA8A04', whiteSpace: 'nowrap'
          }}>
            ACAP MTECH TOTAL VACANCY: {grandTotal}
          </div>
        </div>
      </div>

      {/* Table Outer Container */}
      <div style={{
        borderRadius: '8px', border: '1px solid #CBD5E1',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        background: '#fff', width: '100%', overflowX: 'auto'
      }}>
        <table style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          fontSize: '11px',
          fontFamily: 'inherit',
          background: '#fff'
        }}>
          {/* Column widths */}
          <colgroup>
            <col style={{ width: '2.5%' }} />   {/* # */}
            <col style={{ width: '11.5%' }} />  {/* Branch / Intake */}
            <col style={{ width: '17.5%' }} />  {/* Course / Specialization */}
            <col style={{ width: '8.5%' }} />   {/* Quota */}
            {CATEGORIES.map(c => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            <col style={{ width: '5.2%' }} />   {/* TOTAL */}
            <col style={{ width: '6.2%' }} />   {/* GRAND TOTAL */}
          </colgroup>

          <thead>
            {/* Institution Banner Row */}
            <tr>
              <td colSpan={18} style={{
                background: '#fff', padding: '8px 12px',
                borderBottom: '2px solid #8B1A1A', fontSize: '12px'
              }}>
                <span style={{ fontWeight: 800, color: '#8B1A1A' }}>
                  06007 — Walchand College of Engineering, Sangli
                </span>
                <span style={{ marginLeft: '12px', fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                  Government-Aided Autonomous &nbsp;|&nbsp; State CET Cell — ACAP Round Vacancy Matrix
                </span>
              </td>
            </tr>

            {/* Single Unified Header Row */}
            <tr style={{ background: '#F1F5F9' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left', paddingLeft: '6px' }}>BRANCH / INTAKE</th>
              <th style={{ ...th, textAlign: 'left', paddingLeft: '6px' }}>COURSE / SPECIALIZATION</th>
              <th style={th}>QUOTA</th>
              {CATEGORIES.map(c => (
                <th key={c.key} style={{ ...th, background: c.bg || '#F1F5F9', color: c.color || '#1E293B', fontSize: '10px' }}>
                  {c.label}
                </th>
              ))}
              <th style={{ ...th, background: '#FEF3C7', color: '#92400E' }}>TOTAL</th>
              <th style={{ ...th, background: '#FFFF00', color: '#000', fontSize: '10px', fontWeight: 900, padding: '4px 2px' }}>
                GRAND<br />TOTAL
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleBranches.map((branch, idx) => {
              const isFlash = flashId === branch._id;

              const nonSponMatrixTotal = sumDetails(branch.nonSponsoredDetails);
              const nonSponTotal = nonSponMatrixTotal > 0
                ? nonSponMatrixTotal
                : (branch.effectiveNonSponsoredVacant || branch.nonSponsoredVacant || 0);

              const sponMatrixTotal = sumDetails(branch.sponsoredDetails);
              const sponTotal = sponMatrixTotal > 0
                ? sponMatrixTotal
                : (branch.effectiveSponsoredVacant || branch.sponsoredVacant || 0);

              const totalVacant = branch.totalVacant || (nonSponTotal + sponTotal);

              return (
                <React.Fragment key={branch._id || idx}>
                  {/* Row 1: Non-Sponsored */}
                  <tr
                    className={isFlash ? 'seat-flash' : ''}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderTop: '1px solid #cbd5e1',
                      transition: 'background 0.3s'
                    }}
                  >
                    {/* # Index Column */}
                    <td rowSpan={2} style={{ ...td, color: '#475569', fontWeight: 800, background: '#fff', fontSize: '11px' }}>
                      {idx + 1}
                    </td>

                    {/* Branch / Intake */}
                    <td rowSpan={2} style={{ ...td, textAlign: 'left', paddingLeft: '6px', fontWeight: 800, color: 'var(--text-primary)', background: '#fff', wordWrap: 'break-word' }}>
                      {branch.branchGroup || branch.name}
                    </td>

                    {/* Course / Specialization */}
                    <td rowSpan={2} style={{ ...td, textAlign: 'left', paddingLeft: '6px', fontWeight: 700, color: '#334155', background: '#fff', wordWrap: 'break-word' }}>
                      {branch.specialization || branch.name}
                    </td>

                    {/* Quota label */}
                    <td style={{ ...td, fontWeight: 700, color: '#1E293B', background: '#F8FAFC', fontSize: '10.5px', padding: '4px 2px' }}>
                      Non-Sponsored
                    </td>

                    {/* Category values for Non-Sponsored */}
                    {CATEGORIES.map((cat, cIdx) => {
                      const v = getCatSum(branch.nonSponsoredDetails, cat.key);
                      return (
                        <td key={cIdx} style={{
                          ...td,
                          fontWeight: v > 0 ? 800 : 400,
                          color: v > 0 ? '#059669' : '#94A3B8'
                        }}>
                          {v > 0 ? v : 0}
                        </td>
                      );
                    })}

                    {/* Non-Sponsored Row Total */}
                    <td style={{ ...td, background: '#FEF3C7', fontWeight: 800, color: '#1E293B' }}>
                      {nonSponTotal}
                    </td>

                    {/* Grand Total for course (yellow box spanning 2 rows) */}
                    <td rowSpan={2} style={{
                      ...td,
                      background: '#FFFF00', color: '#000',
                      fontWeight: 900, fontSize: '16px',
                      borderLeft: '2px solid #CA8A04',
                      verticalAlign: 'middle'
                    }}>
                      {totalVacant}
                    </td>
                  </tr>

                  {/* Row 2: Sponsored */}
                  <tr
                    className={isFlash ? 'seat-flash' : ''}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #cbd5e1',
                      transition: 'background 0.3s'
                    }}
                  >
                    {/* Quota label */}
                    <td style={{ ...td, fontWeight: 700, color: '#1E293B', background: '#F8FAFC', fontSize: '10.5px', padding: '4px 2px' }}>
                      Sponsored
                    </td>

                    {/* Category values for Sponsored */}
                    {CATEGORIES.map((cat, cIdx) => {
                      const v = getCatSum(branch.sponsoredDetails, cat.key);
                      return (
                        <td key={cIdx} style={{
                          ...td,
                          fontWeight: v > 0 ? 800 : 400,
                          color: v > 0 ? '#2563EB' : '#94A3B8'
                        }}>
                          {v > 0 ? v : 0}
                        </td>
                      );
                    })}

                    {/* Sponsored Row Total */}
                    <td style={{ ...td, background: '#FEF3C7', fontWeight: 800, color: '#1E293B' }}>
                      {sponTotal}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Bottom Summary Row */}
            <tr style={{ background: '#F1F5F9', borderTop: '2.5px solid #8B1A1A', fontWeight: 900 }}>
              <td colSpan={3} style={{ ...td, textAlign: 'right', paddingRight: '8px', fontWeight: 900, fontSize: '11px', color: '#8B1A1A' }}>
                TOTAL VACANT SEATS:
              </td>
              <td style={{ ...td, fontWeight: 900, fontSize: '10px', color: '#334155' }}>
                COMBINED
              </td>
              {CATEGORIES.map((_, i) => (
                <td key={i} style={{ ...td, fontWeight: 800, color: colTotalsCombined[i] > 0 ? '#0F172A' : '#94A3B8' }}>
                  {colTotalsCombined[i]}
                </td>
              ))}
              <td style={{ ...td, background: '#FEF3C7', fontWeight: 900, fontSize: '12px', color: '#1E293B' }}>
                {grandNonSponsoredTotal + grandSponsoredTotal}
              </td>
              <td style={{ ...td, background: '#FFFF00', color: '#000', fontWeight: 900, fontSize: '16px' }}>
                {grandTotal}
              </td>
            </tr>
          </tbody>

        </table>
      </div>
    </section>
  );
}

// ── Style tokens ─────────────────────────────────────────────────────────────
const th = {
  padding: '6px 3px',
  border: '1px solid #CBD5E1',
  textAlign: 'center',
  fontWeight: 800,
  fontSize: '10.5px',
  color: '#1E293B',
  textTransform: 'uppercase',
  letterSpacing: '0.1px',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  overflow: 'hidden'
};

const td = {
  padding: '5px 3px',
  border: '1px solid #E2E8F0',
  textAlign: 'center',
  fontSize: '11px',
  color: '#334155',
  verticalAlign: 'middle',
  overflow: 'hidden'
};

export default BranchSummaryChart;
