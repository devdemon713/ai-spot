import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CATEGORY_OPTIONS = [
  { value: 'OPEN',  label: 'OPEN (General)' },
  { value: 'SC',    label: 'SC (Scheduled Caste)' },
  { value: 'ST',    label: 'ST (Scheduled Tribe)' },
  { value: 'VJ_DT', label: 'VJ/DT (Vimukta Jati / De-notified Tribe)' },
  { value: 'NTB',  label: 'NT-B (Nomadic Tribe B)' },
  { value: 'NTC',  label: 'NT-C (Nomadic Tribe C)' },
  { value: 'NTD',  label: 'NT-D (Nomadic Tribe D)' },
  { value: 'OBC',  label: 'OBC (Other Backward Class)' },
  { value: 'SEBC', label: 'SEBC (Socially & Educationally Backward Class)' },
  { value: 'EWS',  label: 'EWS (Economically Weaker Section)' }
];

const PH_TYPE_OPTIONS = [
  'Not Applicable', 'VH', 'HH', 'OH', 'ASD', 'MR', 'SLD', 'MI', 'MD'
];

const DEF_TYPE_OPTIONS = [
  'Not Applicable',
  'Ward of Ex-Serviceman',
  'Ward of Serving Def Personnel',
  'Ward of Serving Paramilitary'
];

const INITIAL_FORM = {
  studentType:        'CAP',
  applicationId:      '',
  fullName:           '',
  email:              '',
  password:           '',
  confirmPassword:    '',
  phone:              '',
  photo:              '',
  // Merit list
  wceMeritNumber:     '',
  stateMeritNumber:   '',
  category:           'OPEN',
  gender:             'Male',
  phType:             'Not Applicable',
  defenceType:        'Not Applicable',
  isOrphan:           false,
  mhtCetPercentile:   '',
  mathPercentile:     '',
  physicsPercentile:  '',
  chemistryPercentile:'',
  hscPercentage:      ''
};

function Register() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef = useRef();
  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Convert uploaded photo to base64 data URL
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError('Photo must be less than 1 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result);
      setFormData(prev => ({ ...prev, photo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.applicationId.trim()) {
      setError('MHT-CET Application ID is required');
      return;
    }

    setLoading(true);
    try {
      const submitData = { ...formData };
      delete submitData.confirmPassword;
      // Convert numeric strings
      const numFields = [
        'wceMeritNumber', 'stateMeritNumber',
        'mhtCetPercentile', 'mathPercentile', 'physicsPercentile',
        'chemistryPercentile', 'hscPercentage'
      ];
      numFields.forEach(f => {
        submitData[f] = submitData[f] !== '' ? parseFloat(submitData[f]) : null;
      });

      await register(submitData);
      navigate('/student');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed'
      );
    }
    setLoading(false);
  };

  /* ─── input helpers ─── */
  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: '14px', fontFamily: 'inherit',
    background: '#fff', transition: 'border-color 0.2s'
  };
  const sectionTitle = (label) => (
    <div style={{
      gridColumn: '1/-1', fontWeight: 700, fontSize: '12px', letterSpacing: '1px',
      textTransform: 'uppercase', color: 'var(--primary)', paddingBottom: '4px',
      borderBottom: '2px solid var(--primary-light)', marginTop: '8px'
    }}>{label}</div>
  );

  return (
    <>
      <div className="banner">
        THIS FORM IS ONLY FOR STUDENTS APPLYING FOR 1ST YEAR ACAP / SPOT ROUND REGISTRATION
      </div>
      <main className="main-content">
        <div className="form-container">
          {/* Instructions */}
          <div className="instructions-card">
            <h3>Read Before You Begin — Candidate Instructions</h3>
            <ol>
              <li>If your name is in the CAP merit list, select <strong>CAP Student</strong>.</li>
              <li>If you appeared for CET but did not complete CAP registration, select <strong>Non-CAP Student</strong>.</li>
              <li>Enter your <strong>MHT-CET Application ID</strong> exactly as it appears on your scorecard.</li>
              <li>Enter percentiles from your <strong>MHT-CET scorecard</strong> — Total, Math, Physics, Chemistry.</li>
              <li>All fields marked <span style={{ color: 'red' }}>*</span> are mandatory.</li>
            </ol>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Spot Round Registration</h2>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-grid">

                  {/* ── Student Type ── */}
                  {sectionTitle('Student Type')}
                  <div className="form-group full-width">
                    <label htmlFor="studentType">Student Type <span className="required">*</span></label>
                    <select id="studentType" name="studentType" value={formData.studentType} onChange={handleChange}>
                      <option value="CAP">CAP Student (MHT-CET CAP Merit List)</option>
                      <option value="Non-CAP">Non-CAP Student (Appeared for CET / JEE)</option>
                    </select>
                  </div>

                  {/* ── MHT-CET Application Details ── */}
                  {sectionTitle('MHT-CET Application Details')}
                  <div className="form-group full-width">
                    <label htmlFor="applicationId">MHT-CET Application ID <span className="required">*</span></label>
                    <input
                      id="applicationId" name="applicationId" type="text"
                      value={formData.applicationId} onChange={handleChange}
                      placeholder="e.g. EN26110033" required style={inputStyle}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="wceMeritNumber">WCE Merit Number</label>
                    <input
                      id="wceMeritNumber" name="wceMeritNumber" type="number"
                      value={formData.wceMeritNumber} onChange={handleChange}
                      placeholder="e.g. 1" style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="stateMeritNumber">State Merit Number</label>
                    <input
                      id="stateMeritNumber" name="stateMeritNumber" type="number"
                      value={formData.stateMeritNumber} onChange={handleChange}
                      placeholder="e.g. 172" style={inputStyle}
                    />
                  </div>

                  {/* ── MHT-CET Percentiles ── */}
                  {sectionTitle('MHT-CET Percentiles')}
                  <div className="form-group">
                    <label htmlFor="mhtCetPercentile">Total Percentile <span className="required">*</span></label>
                    <input
                      id="mhtCetPercentile" name="mhtCetPercentile" type="number"
                      step="0.000001" min="0" max="100"
                      value={formData.mhtCetPercentile} onChange={handleChange}
                      placeholder="e.g. 99.9718282" required style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mathPercentile">Math Percentile</label>
                    <input
                      id="mathPercentile" name="mathPercentile" type="number"
                      step="0.000001" min="0" max="100"
                      value={formData.mathPercentile} onChange={handleChange}
                      placeholder="e.g. 99.9823925" style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="physicsPercentile">Physics Percentile</label>
                    <input
                      id="physicsPercentile" name="physicsPercentile" type="number"
                      step="0.000001" min="0" max="100"
                      value={formData.physicsPercentile} onChange={handleChange}
                      placeholder="e.g. 99.6760221" style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="chemistryPercentile">Chemistry Percentile</label>
                    <input
                      id="chemistryPercentile" name="chemistryPercentile" type="number"
                      step="0.000001" min="0" max="100"
                      value={formData.chemistryPercentile} onChange={handleChange}
                      placeholder="e.g. 99.9753495" style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="hscPercentage">HSC / 12th Percentage</label>
                    <input
                      id="hscPercentage" name="hscPercentage" type="number"
                      step="0.01" min="0" max="100"
                      value={formData.hscPercentage} onChange={handleChange}
                      placeholder="e.g. 82.2" style={inputStyle}
                    />
                  </div>

                  {/* ── Personal Information ── */}
                  {sectionTitle('Personal Information')}
                  <div className="form-group full-width">
                    <label htmlFor="fullName">Full Name <span className="required">*</span></label>
                    <input
                      id="fullName" name="fullName" type="text"
                      value={formData.fullName} onChange={handleChange}
                      placeholder="Enter name as per marksheet" required style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gender">Gender <span className="required">*</span></label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="category">Category <span className="required">*</span></label>
                    <select id="category" name="category" value={formData.category} onChange={handleChange}>
                      {CATEGORY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phType">PH Type</label>
                    <select id="phType" name="phType" value={formData.phType} onChange={handleChange}>
                      {PH_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="defenceType">Defence Type</label>
                    <select id="defenceType" name="defenceType" value={formData.defenceType} onChange={handleChange}>
                      {DEF_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <div className="checkbox-group">
                      <input type="checkbox" id="isOrphan" name="isOrphan" checked={formData.isOrphan} onChange={handleChange} />
                      <label htmlFor="isOrphan">Orphan Candidate</label>
                    </div>
                  </div>

                  {/* ── Contact & Account ── */}
                  {sectionTitle('Contact & Account')}
                  <div className="form-group">
                    <label htmlFor="email">Email Address <span className="required">*</span></label>
                    <input
                      id="email" name="email" type="email"
                      value={formData.email} onChange={handleChange}
                      placeholder="your.email@example.com" required style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Mobile Number <span className="required">*</span></label>
                    <input
                      id="phone" name="phone" type="tel"
                      value={formData.phone} onChange={handleChange}
                      placeholder="10-digit mobile number" required style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password <span className="required">*</span></label>
                    <input
                      id="password" name="password" type="password"
                      value={formData.password} onChange={handleChange}
                      placeholder="Minimum 6 characters" required style={inputStyle}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
                    <input
                      id="confirmPassword" name="confirmPassword" type="password"
                      value={formData.confirmPassword} onChange={handleChange}
                      placeholder="Re-enter password" required style={inputStyle}
                    />
                  </div>

                  {/* ── Photo Upload ── */}
                  {sectionTitle('Passport Photo')}
                  <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Preview */}
                    <div style={{
                      width: '96px', height: '120px', border: '2px dashed var(--border)',
                      borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fafafa', cursor: 'pointer'
                    }} onClick={() => photoRef.current?.click()}>
                      {photoPreview
                        ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '28px' }}>📷</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <input
                        ref={photoRef} type="file" accept="image/*"
                        style={{ display: 'none' }} onChange={handlePhotoChange}
                      />
                      <button type="button" onClick={() => photoRef.current?.click()}
                        style={{
                          padding: '8px 18px', border: '1.5px solid var(--primary)',
                          borderRadius: '6px', background: 'var(--primary-light)',
                          color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                        }}>
                        {photoPreview ? '🔄 Change Photo' : '📤 Upload Photo'}
                      </button>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Max 1 MB · JPG / PNG · Passport size recommended
                      </div>
                    </div>
                  </div>

                  {/* ── Submit ── */}
                  <div className="form-group full-width" style={{ marginTop: '12px' }}>
                    <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                      {loading ? 'Registering...' : '✅ Register for Spot Round'}
                    </button>
                  </div>
                </div>
              </form>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Already registered? <Link to="/login" style={{ fontWeight: '600' }}>Login here</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default Register;
