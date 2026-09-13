import React, { useState, useEffect } from 'react';

// Unified category columns without G, L, PW, DEF breakdown
const CATEGORIES = [
  { key: 'OPEN', label: 'OPEN', bg: '#E0F2FE', color: '#0369A1' },
  { key: 'ORPHAN', label: 'ORPHAN', bg: '#FEF3C7', color: '#92400E' },
  { key: 'SC', label: 'SC' },
  { key: 'ST', label: 'ST' },
  { key: 'VJ_DT', label: 'VJ/DT' },
  { key: 'NTB', label: 'NTB/NT1' },
  { key: 'NTC', label: 'NTC/NT2' },
  { key: 'NTD', label: 'NTD/NT3' },
  { key: 'OBC', label: 'OBC' },
  { key: 'PwCR', label: 'PWCR', isSingle: true, bg: '#F3E8FF', color: '#6D28D9' },
  { key: 'DEFCR', label: 'DEFCR', isSingle: true, bg: '#F3E8FF', color: '#6D28D9' },
  { key: 'SEBC', label: 'SEBC' }
];

function getCategoryValue(details, cat) {
  if (!details) return 0;
  if (cat.isSingle) {
    return Number(details[cat.key]) || 0;
  }
  if (cat.key === 'ORPHAN') {
    return Number(details.ORPHAN?.general) || 0;
  }
  if (cat.key === 'OPEN') {
    const o = details.OPEN || {};
    return (Number(o.general) || 0) + (Number(o.ladies) || 0) + (Number(o.pw) || 0) + (Number(o.def) || 0);
  }
  const obj = details[cat.key] || {};
  return (Number(obj.general) || 0) + (Number(obj.ladies) || 0);
}

function sumDetailsMatrix(details) {
  if (!details) return 0;
  return CATEGORIES.reduce((sum, cat) => sum + getCategoryValue(details, cat), 0);
}

function cleanBranchGroup(text) {
  if (!text) return '';
  return text.replace(/^\s*\d+[\.\-\)]\s*/, '').trim();
}

function BranchSummaryChart({
  branches,
  flashId,
  vacantOnly,
  editable = false,
  showAdminControls = false,
  onUpdateBranch,
  onDeleteBranch,
  onOpenAddBranch
}) {
  const [localBranches, setLocalBranches] = useState(branches || []);
  const [isEditing, setIsEditing] = useState(editable);
  const [savingId, setSavingId] = useState(null);
  const [saveSuccessId, setSaveSuccessId] = useState(null);

  useEffect(() => {
    setLocalBranches(branches || []);
  }, [branches]);

  useEffect(() => {
    if (editable !== undefined) {
      setIsEditing(editable);
    }
  }, [editable]);

  if (!localBranches || localBranches.length === 0) {
    return (
      <section style={{ marginBottom: '24px', background: '#fff', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #CBD5E1' }}>
        <h3 style={{ color: '#64748B', margin: '0 0 12px 0' }}>No branches currently listed</h3>
        {showAdminControls && (
          <button
            onClick={onOpenAddBranch}
            style={{
              padding: '8px 18px',
              background: '#8B1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ➕ Add First Branch
          </button>
        )}
      </section>
    );
  }

  const getBranchRowTotals = (branch) => {
    const nsTotal = sumDetailsMatrix(branch.nonSponsoredDetails) || (branch.effectiveNonSponsoredVacant || branch.nonSponsoredVacant || 0);
    const spTotal = sumDetailsMatrix(branch.sponsoredDetails) || (branch.effectiveSponsoredVacant || branch.sponsoredVacant || 0);
    const grand = nsTotal + spTotal;
    return { nsTotal, spTotal, grand };
  };

  const visibleBranches = (vacantOnly && !isEditing)
    ? localBranches.filter(b => getBranchRowTotals(b).grand > 0)
    : localBranches;

  const grandTotal = visibleBranches.reduce((s, b) => s + getBranchRowTotals(b).grand, 0);

  // Column totals across all branches
  const colTotalsNS = CATEGORIES.map(cat =>
    visibleBranches.reduce((s, b) => s + getCategoryValue(b.nonSponsoredDetails, cat), 0)
  );
  const colTotalsSP = CATEGORIES.map(cat =>
    visibleBranches.reduce((s, b) => s + getCategoryValue(b.sponsoredDetails, cat), 0)
  );
  const colTotalsCombined = CATEGORIES.map((_, i) => colTotalsNS[i] + colTotalsSP[i]);

  const grandNonSponsoredTotal = visibleBranches.reduce((s, b) => s + getBranchRowTotals(b).nsTotal, 0);
  const grandSponsoredTotal = visibleBranches.reduce((s, b) => s + getBranchRowTotals(b).spTotal, 0);

  const handleCellChange = (branchId, quotaType, cat, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setLocalBranches(prev => prev.map(b => {
      if (b._id !== branchId) return b;

      const detailsKey = quotaType === 'nonSponsored' ? 'nonSponsoredDetails' : 'sponsoredDetails';
      const currentDetails = { ...(b[detailsKey] || {}) };

      if (cat.isSingle) {
        currentDetails[cat.key] = num;
      } else if (cat.key === 'ORPHAN') {
        currentDetails.ORPHAN = { general: num };
      } else if (cat.key === 'OPEN') {
        currentDetails.OPEN = { general: num, ladies: 0, pw: 0, def: 0 };
      } else {
        currentDetails[cat.key] = { general: num, ladies: 0 };
      }

      const updatedBranch = { ...b, [detailsKey]: currentDetails };
      const { grand } = getBranchRowTotals(updatedBranch);
      updatedBranch.totalVacant = grand;

      return updatedBranch;
    }));
  };

  const handleSaveRow = async (branchId) => {
    const targetBranch = localBranches.find(b => b._id === branchId);
    if (!targetBranch || !onUpdateBranch) return;

    setSavingId(branchId);
    try {
      await onUpdateBranch(branchId, targetBranch);
      setSaveSuccessId(branchId);
      setTimeout(() => setSaveSuccessId(null), 2500);
    } catch (err) {
      console.error('Save row error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRow = async (branchId, branchName) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branchName}"? This action cannot be undone.`)) {
      return;
    }
    if (onDeleteBranch) {
      await onDeleteBranch(branchId);
    }
  };

  return (
    <section aria-labelledby="branch-chart-title" style={{ marginBottom: '24px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px', flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h2 id="branch-chart-title" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📊 Live Vacancy Summary — State Level (MS) Seats
          </h2>
          <div style={{
            background: '#FFFF00', color: '#000', fontWeight: 900, fontSize: '12px',
            padding: '4px 12px', borderRadius: '4px', border: '1.5px solid #CA8A04', whiteSpace: 'nowrap'
          }}>
            Total SL Vacancy: {grandTotal}
          </div>
        </div>

        {/* Admin Action Controls */}
        {showAdminControls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsEditing(prev => !prev)}
              style={{
                background: isEditing ? '#059669' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {isEditing ? '👁️ Switch to View Mode' : '✏️ Edit Seat Counts'}
            </button>

            <button
              type="button"
              onClick={onOpenAddBranch}
              style={{
                background: '#8B1A1A',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              ➕ Add Branch
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '11.5px',
          color: '#1E40AF',
          marginBottom: '10px'
        }}>
          ✏️ <strong>Editing Mode Active:</strong> Edit category counts directly in the table below. Click <strong>💾 Save</strong> on each row to persist and broadcast live in real time.
        </div>
      )}

      {/* Table Outer Container */}
      <div style={{
        borderRadius: '8px', border: '1px solid #CBD5E1',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        background: '#fff', width: '100%', overflowX: 'auto'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px',
          fontFamily: 'inherit',
          background: '#fff',
          textAlign: 'center'
        }}>
          <thead>
            {/* Institution Banner Row matching PDF */}
            <tr>
              <td colSpan={isEditing ? 19 : 18} style={{
                background: '#fff', padding: '10px 14px',
                borderBottom: '2px solid #8B1A1A', textAlign: 'center'
              }}>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#8B1A1A', textTransform: 'uppercase' }}>
                  Walchand College of Engineering, Sangli
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                  SPOT Round State Level Vacancy
                </div>
                <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                  F.Y. M.Tech All Courses Aided &amp; Un-Aided State level (MS) Seats
                </div>
              </td>
            </tr>

            {/* Clean Single-Tier Header */}
            <tr style={{ background: '#F1F5F9' }}>
              <th style={{ ...th, width: '28px' }}>#</th>
              <th style={{ ...th, textAlign: 'left', padding: '6px 4px 6px 8px', minWidth: '110px' }}>BRANCH</th>
              <th style={{ ...th, textAlign: 'left', padding: '6px 4px 6px 8px', minWidth: '150px' }}>COURSE / SPECIALIZATION</th>
              <th style={{ ...th, minWidth: '95px' }}>QUOTA</th>

              {CATEGORIES.map(cat => (
                <th
                  key={cat.key}
                  style={{
                    ...th,
                    background: cat.bg || '#F8FAFC',
                    color: cat.color || '#334155',
                    minWidth: '44px',
                    fontSize: '10.5px',
                    fontWeight: 800
                  }}
                >
                  {cat.label}
                </th>
              ))}

              <th style={{ ...th, background: '#FEF3C7', color: '#92400E', minWidth: '50px' }}>TOTAL</th>
              <th style={{ ...th, background: '#FFFF00', color: '#000', fontSize: '10px', fontWeight: 900, minWidth: '55px' }}>
                GRAND<br />TOTAL
              </th>
              {isEditing && (
                <th style={{ ...th, background: '#F8FAFC', color: '#334155', minWidth: '70px' }}>
                  ACTIONS
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {visibleBranches.map((branch, idx) => {
              const isFlash = flashId === branch._id;
              const { nsTotal, spTotal, grand } = getBranchRowTotals(branch);

              const isSaving = savingId === branch._id;
              const isSaved = saveSuccessId === branch._id;

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
                    {/* # Index */}
                    <td rowSpan={2} style={{ ...td, color: '#475569', fontWeight: 800, background: '#fff', fontSize: '11px' }}>
                      {idx + 1}
                    </td>

                    {/* Branch */}
                    <td rowSpan={2} style={{ ...td, textAlign: 'left', padding: '6px 3px 6px 8px', fontWeight: 800, color: 'var(--text-primary)', background: '#fff', wordWrap: 'break-word' }}>
                      {cleanBranchGroup(branch.branchGroup || branch.name)}
                    </td>

                    {/* Course / Specialization */}
                    <td rowSpan={2} style={{ ...td, textAlign: 'left', padding: '6px 3px 6px 8px', fontWeight: 700, color: '#334155', background: '#fff', wordWrap: 'break-word' }}>
                      {branch.specialization || branch.name}
                    </td>

                    {/* Quota label */}
                    <td style={{ ...td, fontWeight: 700, color: '#1E293B', background: '#F8FAFC', fontSize: '10.5px', padding: '6px 4px' }}>
                      Non-Sponsored
                    </td>

                    {/* Category Values for Non-Sponsored */}
                    {CATEGORIES.map((cat, cIdx) => {
                      const v = getCategoryValue(branch.nonSponsoredDetails, cat);
                      if (isEditing) {
                        return (
                          <td key={cIdx} style={{ ...td, padding: '2px' }}>
                            <input
                              type="number"
                              min="0"
                              value={v}
                              onChange={(e) => handleCellChange(branch._id, 'nonSponsored', cat, e.target.value)}
                              style={{
                                width: '32px',
                                textAlign: 'center',
                                padding: '2px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '3px',
                                fontWeight: v > 0 ? 800 : 400,
                                color: v > 0 ? '#059669' : '#64748B',
                                fontSize: '11.5px',
                                background: v > 0 ? '#ECFDF5' : '#fff'
                              }}
                            />
                          </td>
                        );
                      }
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
                      {nsTotal}
                    </td>

                    {/* Grand Total for course (yellow box spanning 2 rows) */}
                    <td rowSpan={2} style={{
                      ...td,
                      background: '#FFFF00', color: '#000',
                      fontWeight: 900, fontSize: '16px',
                      borderLeft: '2px solid #CA8A04',
                      verticalAlign: 'middle'
                    }}>
                      {grand}
                    </td>

                    {/* Actions Column */}
                    {isEditing && (
                      <td rowSpan={2} style={{
                        ...td,
                        background: '#fff',
                        verticalAlign: 'middle',
                        padding: '4px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveRow(branch._id)}
                            disabled={isSaving}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              background: isSaved ? '#16A34A' : '#2563EB',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '10.5px',
                              cursor: isSaving ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isSaving ? '⏳' : isSaved ? '✓ Saved' : '💾 Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(branch._id, branch.name)}
                            style={{
                              width: '100%',
                              padding: '3px 6px',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: '1px solid #FCA5A5',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    )}
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
                    <td style={{ ...td, fontWeight: 700, color: '#1E293B', background: '#F8FAFC', fontSize: '10.5px', padding: '6px 4px' }}>
                      Sponsored
                    </td>

                    {/* Category Values for Sponsored */}
                    {CATEGORIES.map((cat, cIdx) => {
                      const v = getCategoryValue(branch.sponsoredDetails, cat);
                      if (isEditing) {
                        return (
                          <td key={cIdx} style={{ ...td, padding: '2px' }}>
                            <input
                              type="number"
                              min="0"
                              value={v}
                              onChange={(e) => handleCellChange(branch._id, 'sponsored', cat, e.target.value)}
                              style={{
                                width: '32px',
                                textAlign: 'center',
                                padding: '2px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '3px',
                                fontWeight: v > 0 ? 800 : 400,
                                color: v > 0 ? '#2563EB' : '#64748B',
                                fontSize: '11.5px',
                                background: v > 0 ? '#EFF6FF' : '#fff'
                              }}
                            />
                          </td>
                        );
                      }
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
                      {spTotal}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Bottom Summary Row */}
            <tr style={{ background: '#F1F5F9', borderTop: '2.5px solid #8B1A1A', fontWeight: 900 }}>
              <td colSpan={3} style={{ ...td, textAlign: 'right', padding: '6px 8px 6px 3px', fontWeight: 900, fontSize: '11px', color: '#8B1A1A' }}>
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
              {isEditing && (
                <td style={{ ...td, background: '#F8FAFC' }}></td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Section matching the PDF */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginTop: '16px', flexWrap: 'wrap', gap: '16px', padding: '0 4px'
      }}>
        {/* Alloted Course / Seat Type Box matching PDF */}
        <div style={{
          display: 'flex', border: '1px solid #94A3B8', borderRadius: '4px', overflow: 'hidden',
          fontSize: '11px', fontWeight: 700, background: '#fff'
        }}>
          <div style={{ padding: '6px 12px', borderRight: '1px solid #CBD5E1', background: '#F8FAFC', color: '#334155' }}>WCE MH M.NO</div>
          <div style={{ padding: '6px 20px', borderRight: '1px solid #CBD5E1', color: '#64748B' }}>Allotted Course</div>
          <div style={{ padding: '6px 16px', borderRight: '1px solid #CBD5E1', color: '#64748B' }}>Seat Type</div>
          <div style={{ padding: '6px 14px', color: '#1E293B' }}>10/9/2026, 10.00am</div>
        </div>

        {/* Total Vacancy & Director Box matching PDF */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#1E293B' }}>
            Total Vacancy: <span style={{ background: '#FFFF00', padding: '2px 8px', borderRadius: '3px', border: '1.5px solid #CA8A04' }}>{grandTotal}</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', marginTop: '6px' }}>
            Director
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Style tokens ─────────────────────────────────────────────────────────────
const th = {
  padding: '6px 4px',
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
  padding: '6px 3px',
  border: '1px solid #E2E8F0',
  textAlign: 'center',
  fontSize: '11px',
  color: '#334155',
  verticalAlign: 'middle',
  overflow: 'hidden'
};

export default BranchSummaryChart;
