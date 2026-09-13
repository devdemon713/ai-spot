import { useState } from 'react';
import axios from 'axios';

// Unified category columns matching the live vacancy matrix
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

const createEmptyCategoryDetails = () => ({
  OPEN: 0,
  ORPHAN: 0,
  SC: 0,
  ST: 0,
  VJ_DT: 0,
  NTB: 0,
  NTC: 0,
  NTD: 0,
  OBC: 0,
  PwCR: 0,
  DEFCR: 0,
  SEBC: 0
});

function sumCategoryDetails(details) {
  if (!details) return 0;
  return CATEGORIES.reduce((s, cat) => s + (Number(details[cat.key]) || 0), 0);
}

function formatDetailsForBackend(catDetails) {
  return {
    OPEN: { general: Number(catDetails.OPEN) || 0, ladies: 0, pw: 0, def: 0 },
    ORPHAN: { general: Number(catDetails.ORPHAN) || 0 },
    SC: { general: Number(catDetails.SC) || 0, ladies: 0 },
    ST: { general: Number(catDetails.ST) || 0, ladies: 0 },
    VJ_DT: { general: Number(catDetails.VJ_DT) || 0, ladies: 0 },
    NTB: { general: Number(catDetails.NTB) || 0, ladies: 0 },
    NTC: { general: Number(catDetails.NTC) || 0, ladies: 0 },
    NTD: { general: Number(catDetails.NTD) || 0, ladies: 0 },
    OBC: { general: Number(catDetails.OBC) || 0, ladies: 0 },
    PwCR: Number(catDetails.PwCR) || 0,
    DEFCR: Number(catDetails.DEFCR) || 0,
    SEBC: { general: Number(catDetails.SEBC) || 0, ladies: 0 }
  };
}

function AddBranchModal({ isOpen, onClose, onBranchCreated }) {
  const [formData, setFormData] = useState({
    choiceCode: '',
    branchGroup: '',
    name: '',
    specialization: '',
    type: 'Aided',
    sanctionedIntake: 60
  });

  const [nonSponsored, setNonSponsored] = useState(createEmptyCategoryDetails());
  const [sponsored, setSponsored] = useState(createEmptyCategoryDetails());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCellChange = (quota, catKey, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const setter = quota === 'nonSponsored' ? setNonSponsored : setSponsored;
    setter(prev => ({
      ...prev,
      [catKey]: num
    }));
  };

  const nonSponsoredTotal = sumCategoryDetails(nonSponsored);
  const sponsoredTotal = sumCategoryDetails(sponsored);
  const grandTotal = nonSponsoredTotal + sponsoredTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.choiceCode.trim()) {
      setError('Choice Code is required (e.g. 0600746610)');
      return;
    }
    if (!formData.name.trim()) {
      setError('Course Name is required (e.g. Instrumentation Engineering)');
      return;
    }
    if (!formData.type) {
      setError('Type (Aided or Unaided) is required');
      return;
    }

    const payload = {
      choiceCode: formData.choiceCode.trim(),
      branchGroup: formData.branchGroup.trim() || formData.name.trim(),
      name: formData.name.trim(),
      specialization: formData.specialization.trim() || formData.name.trim(),
      type: formData.type,
      sanctionedIntake: Number(formData.sanctionedIntake) || 60,
      nonSponsoredDetails: formatDetailsForBackend(nonSponsored),
      sponsoredDetails: formatDetailsForBackend(sponsored)
    };

    setSubmitting(true);
    try {
      const res = await axios.post('/api/branches', payload);
      onBranchCreated && onBranchCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #8B1A1A, #5c0f0f)',
          color: '#fff',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              ➕ Add New Branch / Course Matrix
            </h3>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>
              Configure branch metadata and category vacancy counts matching the live vacancy matrix
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #EF4444',
              color: '#991B1B',
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '18px',
              fontSize: '13px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Branch Metadata Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Choice Code *
              </label>
              <input
                type="text"
                name="choiceCode"
                value={formData.choiceCode}
                onChange={handleTextChange}
                placeholder="e.g. 0600746610"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Branch Group / Label
              </label>
              <input
                type="text"
                name="branchGroup"
                value={formData.branchGroup}
                onChange={handleTextChange}
                placeholder="e.g. CIVIL Aided, CSE Un-Aided"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Course Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleTextChange}
                placeholder="e.g. Construction Management"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Branch Metadata Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Specialization Label
              </label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleTextChange}
                placeholder="e.g. Un-Aided Construction Management"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Institute Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleTextChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  background: '#fff'
                }}
              >
                <option value="Aided">Aided</option>
                <option value="Unaided">Unaided</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Sanctioned Intake
              </label>
              <input
                type="number"
                name="sanctionedIntake"
                value={formData.sanctionedIntake}
                onChange={handleTextChange}
                min="1"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Vacancy Matrix Form Table */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
                📊 Vacancy Seat Matrix (Category Breakdowns)
              </span>
              <span style={{
                background: '#FFFF00',
                color: '#000',
                fontWeight: 900,
                fontSize: '12px',
                padding: '3px 10px',
                borderRadius: '4px',
                border: '1px solid #CA8A04'
              }}>
                Grand Total Vacant: {grandTotal}
              </span>
            </div>

            <div style={{
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              overflowX: 'auto',
              background: '#fff'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'center'
              }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '100px', fontWeight: 800, color: '#334155', borderRight: '1px solid #CBD5E1' }}>
                      QUOTA
                    </th>
                    {CATEGORIES.map(cat => (
                      <th
                        key={cat.key}
                        style={{
                          padding: '6px 4px',
                          background: cat.bg || '#F8FAFC',
                          color: cat.color || '#334155',
                          fontWeight: 800,
                          fontSize: '10.5px',
                          borderRight: '1px solid #CBD5E1',
                          minWidth: '44px'
                        }}
                      >
                        {cat.label}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', background: '#FEF3C7', color: '#92400E', fontWeight: 900, minWidth: '55px' }}>
                      TOTAL
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {/* Row 1: Non-Sponsored */}
                  <tr style={{ borderBottom: '1px solid #CBD5E1', background: '#fff' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#1E293B', background: '#F8FAFC', borderRight: '1px solid #CBD5E1' }}>
                      Non-Sponsored
                    </td>
                    {CATEGORIES.map(cat => {
                      const v = nonSponsored[cat.key] || 0;
                      return (
                        <td key={cat.key} style={{ padding: '4px 2px', borderRight: '1px solid #E2E8F0' }}>
                          <input
                            type="number"
                            min="0"
                            value={v}
                            onChange={(e) => handleCellChange('nonSponsored', cat.key, e.target.value)}
                            style={{
                              width: '34px',
                              textAlign: 'center',
                              padding: '3px 2px',
                              borderRadius: '3px',
                              border: '1px solid #CBD5E1',
                              fontWeight: v > 0 ? 800 : 400,
                              color: v > 0 ? '#059669' : '#64748B',
                              fontSize: '11.5px',
                              background: v > 0 ? '#ECFDF5' : '#fff'
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: '6px 8px', background: '#FEF3C7', fontWeight: 900, color: '#1E293B' }}>
                      {nonSponsoredTotal}
                    </td>
                  </tr>

                  {/* Row 2: Sponsored */}
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#1E293B', background: '#F8FAFC', borderRight: '1px solid #CBD5E1' }}>
                      Sponsored
                    </td>
                    {CATEGORIES.map(cat => {
                      const v = sponsored[cat.key] || 0;
                      return (
                        <td key={cat.key} style={{ padding: '4px 2px', borderRight: '1px solid #E2E8F0' }}>
                          <input
                            type="number"
                            min="0"
                            value={v}
                            onChange={(e) => handleCellChange('sponsored', cat.key, e.target.value)}
                            style={{
                              width: '34px',
                              textAlign: 'center',
                              padding: '3px 2px',
                              borderRadius: '3px',
                              border: '1px solid #CBD5E1',
                              fontWeight: v > 0 ? 800 : 400,
                              color: v > 0 ? '#2563EB' : '#64748B',
                              fontSize: '11.5px',
                              background: v > 0 ? '#EFF6FF' : '#fff'
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: '6px 8px', background: '#FEF3C7', fontWeight: 900, color: '#1E293B' }}>
                      {sponsoredTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#F1F5F9',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #8B1A1A, #a82222)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(139, 26, 26, 0.3)'
              }}
            >
              {submitting ? 'Saving...' : '💾 Add Branch & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBranchModal;
