import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import SeatMatrix from '../components/SeatMatrix';
import BranchSummaryChart from '../components/BranchSummaryChart';
import AddBranchModal from '../components/AddBranchModal';

const CAT_LABELS = {
  OPEN: 'OPEN', SC: 'SC', ST: 'ST', VJ_DT: 'VJ/DT',
  NTB: 'NT-B', NTC: 'NT-C', NTD: 'NT-D', OBC: 'OBC', SEBC: 'SEBC',
  ORPHAN: 'ORPHAN', PwCR: 'PwCR', DEFCR: 'DEFCR', EWS: 'EWS'
};

// Normalize messy category values from imported data to clean display labels
function normalizeCat(raw) {
  if (!raw) return '—';
  const s = raw.trim().replace(/[$#]+$/g, '').trim(); // strip trailing $, #
  const u = s.toUpperCase();
  // Direct matches
  if (CAT_LABELS[u]) return CAT_LABELS[u];
  if (CAT_LABELS[s]) return CAT_LABELS[s];
  // Known variants
  if (u === 'OPEN') return 'OPEN';
  if (u === 'SC') return 'SC';
  if (u === 'ST') return 'ST';
  if (u === 'OBC') return 'OBC';
  if (u === 'SEBC' || u === 'SBC') return 'SEBC';
  if (u === 'EWS') return 'EWS';
  if (u === 'VJ' || u === 'VJ_DT' || u === 'DT/VJ' || u === 'VJ/DT') return 'VJ/DT';
  if (u.includes('NT-B') || u.includes('NT 1') || u === 'NTB') return 'NT-B';
  if (u.includes('NT-C') || u.includes('NT 2') || u === 'NTC') return 'NT-C';
  if (u.includes('NT-D') || u.includes('NT 3') || u === 'NTD') return 'NT-D';
  if (u.startsWith('NT')) return 'NT';
  return raw;
}

function cleanBranchGroup(text) {
  if (!text) return '';
  return text.replace(/^\s*\d+[\.\-\)]\s*/, '').trim();
}

function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const { user } = useAuth();
  const { socket } = useSocket();

  // Shared state
  const [branches, setBranches] = useState([]);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [round, setRound] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementDirection, setAnnouncementDirection] = useState('ltr');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState('info');
  const [alertSending, setAlertSending] = useState(false);
  const [breakActive, setBreakActive] = useState(null); // 'tea' | 'lunch' | null
  const [roundSummary, setRoundSummary] = useState({ allocatedThisRound: [], remainingStudents: [], skippedStudents: [], currentRound: null });
  const [showSkipped, setShowSkipped] = useState(false);

  // Allocation state
  const [allocMode, setAllocMode] = useState('manual');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('OPEN');
  const [selectedType, setSelectedType] = useState('general');
  const [selectedPool, setSelectedPool] = useState('nonSponsoredSeats');
  const [allocating, setAllocating] = useState(false);

  // Manual student picker filters
  const [manualStudentSearch, setManualStudentSearch] = useState('');
  const [manualSearchBy, setManualSearchBy] = useState('name'); // 'name' | 'appId' | 'merit'
  const [manualQuotaFilter, setManualQuotaFilter] = useState('all'); // 'all' | 'Non-Sponsored' | 'Sponsored'
  const [manualCatFilter, setManualCatFilter] = useState('all');

  // Branch Upgrade state
  const [upgradeStudent, setUpgradeStudent] = useState('');
  const [upgradeStudentSearch, setUpgradeStudentSearch] = useState('');
  const [upgradeSearchBy, setUpgradeSearchBy] = useState('name'); // 'name' | 'appId' | 'merit'
  const [upgradeQuotaFilter, setUpgradeQuotaFilter] = useState('all'); // 'all' | 'Non-Sponsored' | 'Sponsored'
  const [upgradeCatFilter, setUpgradeCatFilter] = useState('all');
  const [upgradeFromBranch, setUpgradeFromBranch] = useState('');
  const [upgradeFromCat, setUpgradeFromCat] = useState('OPEN');
  const [upgradeFromType, setUpgradeFromType] = useState('general');
  const [upgradeToBranch, setUpgradeToBranch] = useState('');
  const [upgradeToCat, setUpgradeToCat] = useState('OPEN');
  const [upgradeToType, setUpgradeToType] = useState('general');
  const [upgrading, setUpgrading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuota, setFilterQuota] = useState(''); // '' | 'Non-Sponsored' | 'Sponsored'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('seat-update', (data) => {
      if (!data) return;
      if (data.branches) {
        setBranches(data.branches);
      } else if (data.deleted) {
        setBranches(prev => prev.filter(b => b._id !== data.branchId && b._id?.toString() !== data.branchId?.toString()));
      } else if (data.branch) {
        setBranches(prev => prev.map(b =>
          (b._id === data.branchId || b._id?.toString() === data.branchId?.toString()) ? data.branch : b
        ));
      }
      if (data.branchId) {
        setFlashId(data.branchId);
        setTimeout(() => setFlashId(null), 1200);
      }
    });
    socket.on('seats-reset', (data) => {
      setBranches(data.branches);
    });
    socket.on('round-update', (data) => {
      setRound(data.round);
    });
    socket.on('announcement-update', (data) => {
      setRound(data.round);
      syncAnnouncementFields(data.round);
    });
    socket.on('break-start', (data) => {
      setBreakActive(data.type);
    });
    socket.on('break-end', () => {
      setBreakActive(null);
    });
    return () => {
      socket.off('seat-update');
      socket.off('seats-reset');
      socket.off('round-update');
      socket.off('announcement-update');
      socket.off('break-start');
      socket.off('break-end');
    };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [branchRes, studentRes, statsRes, roundRes, alloRes, summaryRes] = await Promise.all([
        axios.get('/api/branches'),
        axios.get('/api/students'),
        axios.get('/api/students/stats'),
        axios.get('/api/round/current'),
        axios.get('/api/allocation/history'),
        axios.get('/api/allocation/round-summary').catch(() => ({ data: { allocatedThisRound: [], remainingStudents: [], skippedStudents: [], currentRound: null } }))
      ]);
      setBranches(branchRes.data);
      setStudents(studentRes.data);
      setStats(statsRes.data);
      setRound(roundRes.data);
      syncAnnouncementFields(roundRes.data);
      setAllocations(alloRes.data);
      setRoundSummary(summaryRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const syncAnnouncementFields = (currentRound) => {
    setAnnouncementText(currentRound?.announcementText || 'THIS FORM IS ONLY FOR STUDENTS APPLYING FOR 1ST YEAR ACAP ROUND REGISTRATION');
    setAnnouncementEnabled(currentRound?.announcementEnabled !== false);
    setAnnouncementDirection(currentRound?.announcementDirection || 'ltr');
  };

  const handleAnnouncementSave = async () => {
    try {
      const res = await axios.put('/api/round/announcement', {
        announcementText,
        announcementEnabled,
        announcementDirection
      });
      setRound(res.data.round);
      showMsg('Announcement settings updated for all users.');
    } catch (err) {
      showMsg('Announcement update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // Branch update handler
  const handleBranchUpdate = useCallback(async (branchId, updatedData) => {
    try {
      const res = await axios.put(`/api/branches/${branchId}`, updatedData);
      setBranches(prev => prev.map(b => b._id === branchId ? res.data : b));
      showMsg('Seats updated successfully!');
    } catch (err) {
      showMsg('Error updating seats: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  }, []);

  // Handle new branch created
  const handleBranchCreated = (newBranch) => {
    setBranches(prev => {
      const exists = prev.some(b => b._id === newBranch._id);
      if (exists) return prev.map(b => b._id === newBranch._id ? newBranch : b);
      return [...prev, newBranch];
    });
    showMsg(`Branch "${newBranch.name}" created successfully!`);
  };

  // Handle branch deleted
  const handleDeleteBranch = async (branchId) => {
    try {
      await axios.delete(`/api/branches/${branchId}`);
      setBranches(prev => prev.filter(b => b._id !== branchId));
      showMsg('Branch deleted successfully');
    } catch (err) {
      showMsg('Failed to delete branch: ' + (err.response?.data?.message || err.message));
    }
  };

  // Manual allocation
  const handleManualAllocate = async () => {
    if (!selectedStudent || !selectedBranch) {
      showMsg('Please select both a student and a branch');
      return;
    }
    setAllocating(true);
    try {
      await axios.post('/api/allocation/manual', {
        studentId: selectedStudent,
        branchId: selectedBranch,
        seatCategory: selectedCategory,
        seatType: selectedType,
        seatPool: selectedPool
      });
      showMsg("Student's seat has been secured successfully!");
      fetchAll();
      setSelectedStudent('');
      setSelectedBranch('');
    } catch (err) {
      showMsg('Allocation failed: ' + (err.response?.data?.message || err.message));
    }
    setAllocating(false);
  };

  // Auto allocation
  const handleAutoAllocate = async () => {
    if (!window.confirm('Run auto-allocation for all pending students? This will allocate based on merit and category rules.')) return;
    setAllocating(true);
    try {
      const res = await axios.post('/api/allocation/auto', {});
      showMsg(res.data.message);
      fetchAll();
    } catch (err) {
      showMsg('Auto allocation failed: ' + (err.response?.data?.message || err.message));
    }
    setAllocating(false);
  };

  // Cancel allocation
  const handleCancelAllocation = async (alloId) => {
    if (!window.confirm('Cancel this allocation? The seat will be returned to the pool.')) return;
    try {
      await axios.delete(`/api/allocation/${alloId}`);
      showMsg('Allocation cancelled, seat returned.');
      fetchAll();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Branch Upgrade
  const handleBranchUpgrade = async () => {
    if (!upgradeStudent || !upgradeFromBranch || !upgradeToBranch) {
      showMsg('Please fill in Student, From Branch, and To Branch');
      return;
    }
    if (upgradeFromBranch === upgradeToBranch) {
      showMsg('From Branch and To Branch must be different');
      return;
    }

    const stObj = students.find(s => s._id === upgradeStudent);
    const isSpon = stObj?.candidateType === 'Sponsored' || stObj?.isSponsored;
    const pool = isSpon ? 'sponsoredSeats' : 'nonSponsoredSeats';

    if (!window.confirm(`Confirm Branch Upgrade for ${stObj?.fullName || 'student'}?\n\n` +
      `• FROM branch seat → +1 (returned to ${isSpon ? 'Sponsored' : 'Non-Sponsored'} pool, live)\n` +
      `• TO branch seat → -1 (allocated from ${isSpon ? 'Sponsored' : 'Non-Sponsored'} pool, live)\n\n` +
      'This is visible to all students in real-time.')) return;

    setUpgrading(true);
    try {
      const res = await axios.post('/api/allocation/upgrade', {
        studentId: upgradeStudent,
        fromBranchId: upgradeFromBranch,
        fromSeatPool: pool,
        fromSeatCategory: upgradeFromCat,
        fromSeatType: upgradeFromType,
        toBranchId: upgradeToBranch,
        toSeatPool: pool,
        toSeatCategory: upgradeToCat,
        toSeatType: upgradeToType
      });
      showMsg('✅ ' + res.data.message);
      fetchAll();
      setUpgradeStudent('');
      setUpgradeFromBranch('');
      setUpgradeToBranch('');
    } catch (err) {
      showMsg('Upgrade failed: ' + (err.response?.data?.message || err.message));
    }
    setUpgrading(false);
  };

  // Round management
  const handleRoundAction = async (action) => {
    const confirmMsgs = {
      initialize: 'Initialize new round? Existing seats and allocations are preserved. Skipped students will become eligible again.',
      start: 'Start the round? This will mark it as active.',
      pause: 'Pause the round?',
      end: 'End the round? This marks it as completed.'
    };
    if (!window.confirm(confirmMsgs[action])) return;

    try {
      const res = await axios.post(`/api/round/${action}`, {});
      showMsg(res.data.message);
      fetchAll();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Skip student for current round
  const handleSkipStudent = async (studentId, studentName) => {
    try {
      await axios.post('/api/allocation/skip', { studentId });
      showMsg(`⏭ ${studentName} skipped for this round`);
      fetchAll();
    } catch (err) {
      showMsg('Skip failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Unskip student for current round
  const handleUnskipStudent = async (studentId, studentName) => {
    try {
      await axios.post('/api/allocation/unskip', { studentId });
      showMsg(`↩ ${studentName} unskipped`);
      fetchAll();
    } catch (err) {
      showMsg('Unskip failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const pendingStudents = students.filter(s => s.allocationStatus === 'pending');

  // Helper: Sort students by merit (Percentile -> Score -> SSC Aggregate)
  const sortMeritList = (list) => [...list].sort((a, b) => {
    if ((b.mhtCetPercentile || 0) !== (a.mhtCetPercentile || 0)) {
      return (b.mhtCetPercentile || 0) - (a.mhtCetPercentile || 0);
    }
    if ((b.mhtCetScore || 0) !== (a.mhtCetScore || 0)) {
      return (b.mhtCetScore || 0) - (a.mhtCetScore || 0);
    }
    return (b.sscAggregate || 0) - (a.sscAggregate || 0);
  });

  // Independent Merit Rank Maps for Non-Sponsored and Sponsored candidates
  const nonSponsoredMeritMap = new Map();
  sortMeritList(students.filter(s => s.candidateType !== 'Sponsored' && !s.isSponsored))
    .forEach((s, idx) => nonSponsoredMeritMap.set(s._id.toString(), idx + 1));

  const sponsoredMeritMap = new Map();
  sortMeritList(students.filter(s => s.candidateType === 'Sponsored' || s.isSponsored))
    .forEach((s, idx) => sponsoredMeritMap.set(s._id.toString(), idx + 1));

  // Overall fallback rank map
  const overallMeritMap = new Map();
  sortMeritList(students).forEach((s, idx) => overallMeritMap.set(s._id.toString(), idx + 1));

  // Helper to get a candidate's independent quota merit rank (Rank 1, 2, 3...)
  const getCandidateRank = (s) => {
    if (!s) return 1;
    const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;
    if (isSpon) {
      return sponsoredMeritMap.get(s._id.toString()) || overallMeritMap.get(s._id.toString()) || 1;
    }
    return nonSponsoredMeritMap.get(s._id.toString()) || overallMeritMap.get(s._id.toString()) || 1;
  };

  // Filtered students (for Students tab & export)
  const filteredStudents = students.filter(s => {
    const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;

    if (filterQuota === 'Non-Sponsored' && isSpon) return false;
    if (filterQuota === 'Sponsored' && !isSpon) return false;

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      const rank = getCandidateRank(s);
      if (!s.fullName.toLowerCase().includes(term) &&
        !s.applicationId.toLowerCase().includes(term) &&
        !s.email.toLowerCase().includes(term) &&
        String(rank) !== term &&
        !String(rank).startsWith(term)) return false;
    }
    if (filterCategory && s.category !== filterCategory) return false;
    if (filterStatus && s.allocationStatus !== filterStatus) return false;
    return true;
  });

  const handleExportStudents = () => {
    const headers = [
      'Application ID', 'Full Name', 'Email', 'Phone', 'Quota Merit Rank', 'MHT-CET Percentile',
      'MHT-CET Score', 'JEE Main Percentile', 'Category', 'Gender',
      'Quota Type', 'Status', 'Allocated Branch', 'Branch Type'
    ];
    const escapeCsvValue = (value) => {
      const text = value == null ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = filteredStudents.map(student => {
      const isSpon = student.candidateType === 'Sponsored' || student.isSponsored;
      return [
        student.applicationId,
        student.fullName,
        student.email,
        student.phone,
        `${isSpon ? 'Sponsored' : 'Non-Sponsored'} Rank #${getCandidateRank(student)}`,
        student.mhtCetPercentile,
        student.mhtCetScore,
        student.jeeMainPercentile,
        normalizeCat(student.category),
        student.gender,
        isSpon ? 'Sponsored' : 'Non-Sponsored',
        student.allocationStatus,
        student.allocatedBranch?.name || '',
        student.allocatedBranch?.type || ''
      ];
    });
    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvValue).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMsg(`✅ Exported ${filteredStudents.length} students to Excel-compatible CSV.`);
  };

  // Get current round ID for skip filtering
  const currentRoundId = round?._id;

  // Pending students filtered by Quota + Search mode + Category + NOT skipped in current round
  const filteredPendingStudents = pendingStudents
    .filter(s => {
      const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;
      if (currentRoundId && s.skippedInRounds && s.skippedInRounds.includes(currentRoundId)) return false;

      // Quota Filter (Non-Sponsored vs Sponsored)
      if (manualQuotaFilter === 'Non-Sponsored' && isSpon) return false;
      if (manualQuotaFilter === 'Sponsored' && !isSpon) return false;

      // Category Filter
      if (manualCatFilter !== 'all' && normalizeCat(s.category) !== normalizeCat(manualCatFilter)) return false;

      // Search Filter
      if (manualStudentSearch) {
        const term = manualStudentSearch.trim().toLowerCase();
        if (manualSearchBy === 'name') {
          return (s.fullName || '').toLowerCase().includes(term);
        } else if (manualSearchBy === 'appId') {
          return (s.applicationId || '').toLowerCase().includes(term);
        } else if (manualSearchBy === 'merit') {
          const rank = getCandidateRank(s);
          return String(rank) === term || String(rank).startsWith(term);
        }
        return (s.fullName || '').toLowerCase().includes(term) || (s.applicationId || '').toLowerCase().includes(term);
      }
      return true;
    })
    .sort((a, b) => (b.mhtCetPercentile || 0) - (a.mhtCetPercentile || 0));

  // Branch upgrade students filtered by Quota + Search mode + Category
  const filteredUpgradeStudents = students
    .filter(s => {
      const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;

      // Quota Filter (Non-Sponsored vs Sponsored)
      if (upgradeQuotaFilter === 'Non-Sponsored' && isSpon) return false;
      if (upgradeQuotaFilter === 'Sponsored' && !isSpon) return false;

      // Category Filter
      if (upgradeCatFilter !== 'all' && normalizeCat(s.category) !== normalizeCat(upgradeCatFilter)) return false;

      // Search Filter
      if (upgradeStudentSearch) {
        const term = upgradeStudentSearch.trim().toLowerCase();
        if (upgradeSearchBy === 'name') {
          return (s.fullName || '').toLowerCase().includes(term);
        } else if (upgradeSearchBy === 'appId') {
          return (s.applicationId || '').toLowerCase().includes(term);
        } else if (upgradeSearchBy === 'merit') {
          const rank = getCandidateRank(s);
          return String(rank) === term || String(rank).startsWith(term);
        }
        return (s.fullName || '').toLowerCase().includes(term) || (s.applicationId || '').toLowerCase().includes(term);
      }
      return true;
    })
    .sort((a, b) => (b.mhtCetPercentile || 0) - (a.mhtCetPercentile || 0));

  const totalVacant = branches.reduce((sum, b) => sum + (b.totalVacant || 0), 0);

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Loading admin panel...</p></div>;
  }

  return (
    <main className="main-content">
      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* Admin Tabs */}
      <div className="admin-tabs">
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'seats', label: '💺 Seat Management' },
          { key: 'students', label: '👨‍🎓 Students' },
          { key: 'allocate', label: '🎯 Allocation' },
          { key: 'round', label: '⚙️ Round Management' }
        ].map(t => (
          <button
            key={t.key}
            className={`admin-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>👨‍🎓</div>
              <div className="stat-value">{stats?.total || 0}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>⏳</div>
              <div className="stat-value">{stats?.pending || 0}</div>
              <div className="stat-label">Pending Allocation</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>✅</div>
              <div className="stat-value">{stats?.allocated || 0}</div>
              <div className="stat-label">Allocated</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>💺</div>
              <div className="stat-value">{totalVacant}</div>
              <div className="stat-label">Vacant Seats</div>
            </div>
          </div>

          <BranchSummaryChart
            branches={branches}
            flashId={flashId}
            vacantOnly={false}
            showAdminControls={true}
            onOpenAddBranch={() => setIsAddBranchOpen(true)}
            onUpdateBranch={handleBranchUpdate}
            onDeleteBranch={handleDeleteBranch}
          />

          {/* Round Status */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2>Round Status</h2>
              <span className={`badge badge-${round?.status || 'demo'}`}>{(round?.status || 'demo').toUpperCase()}</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                <strong>{round?.name || 'ACAP Round'}</strong> — {round?.description || 'Demo mode'}
              </p>
              {round?.isDemo && (
                <div className="alert alert-warning" style={{ marginTop: '12px' }}>
                  Demo mode active. Use "Round Management" tab to initialize an actual round.
                </div>
              )}
            </div>
          </div>

          {/* Recent Allocations */}
          <div className="card">
            <div className="card-header">
              <h2>Recent Allocations</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{allocations.length} total</span>
            </div>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>App ID</th>
                    <th>Student</th>
                    <th>Branch</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.slice(0, 10).map(allo => (
                    <tr key={allo._id}>
                      <td style={{ fontWeight: 600 }}>{allo.student?.applicationId}</td>
                      <td>{allo.student?.fullName}</td>
                      <td>{allo.branch?.name} ({allo.branch?.type})</td>
                      <td>{normalizeCat(allo.seatCategory)}</td>
                      <td>{allo.seatType === 'ladies' ? 'Ladies' : 'General'}</td>
                      <td>{allo.allocatedBy === 'auto' ? '🤖 Auto' : '👤 Manual'}</td>
                      <td><span className={`badge badge-${allo.status}`}>{allo.status}</span></td>
                      <td>
                        {allo.status !== 'cancelled' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancelAllocation(allo._id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {allocations.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No allocations yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== SEATS TAB ===== */}
      {tab === 'seats' && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <strong style={{ color: '#1E40AF', fontSize: '14px' }}>
                💺 Seat Matrix Management
              </strong>
              <div style={{ color: '#3B82F6', fontSize: '12px', marginTop: '2px' }}>
                Edit seat counts directly in the matrix below. Changes are saved and broadcast to all connected students in real-time.
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setIsAddBranchOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              ➕ Add New Branch
            </button>
          </div>

          <BranchSummaryChart
            branches={branches}
            flashId={flashId}
            vacantOnly={false}
            editable={true}
            showAdminControls={true}
            onOpenAddBranch={() => setIsAddBranchOpen(true)}
            onUpdateBranch={handleBranchUpdate}
            onDeleteBranch={handleDeleteBranch}
          />
        </>
      )}

      {/* ===== STUDENTS TAB ===== */}
      {tab === 'students' && (
        <>
          <div className="filters-bar">
            <input
              type="text"
              placeholder="Search by name, App ID, email, or merit rank #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select value={filterQuota} onChange={(e) => setFilterQuota(e.target.value)}>
              <option value="">All Quotas</option>
              <option value="Non-Sponsored">Non-Sponsored Quota</option>
              <option value="Sponsored">Sponsored Quota</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {Object.entries(CAT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="allocated">Allocated</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {filteredStudents.length} students
            </span>
            <button
              className="btn btn-success btn-sm"
              onClick={handleExportStudents}
              disabled={filteredStudents.length === 0}
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Download the filtered student list as an Excel-compatible file"
            >
              📥 Export Excel
            </button>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Merit Rank</th>
                    <th>App ID</th>
                    <th>Name</th>
                    <th>Quota Type</th>
                    <th>Percentile</th>
                    <th>Category</th>
                    <th>Gender</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Allocated To</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => {
                    const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;
                    const rank = getCandidateRank(s);
                    return (
                      <tr key={s._id}>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800,
                            background: isSpon ? '#EFF6FF' : '#FFF0F0',
                            color: isSpon ? '#1D4ED8' : '#8B1A1A',
                            border: isSpon ? '1px solid #BFDBFE' : '1px solid #F5BBBB'
                          }}>
                            {isSpon ? '💼 SP' : '🎓 NS'} Rank #{rank}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.applicationId}</td>
                        <td>{s.fullName}</td>
                        <td>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                            background: isSpon ? '#EFF6FF' : '#F0FDF4',
                            color: isSpon ? '#1D4ED8' : '#15803D'
                          }}>
                            {isSpon ? 'Sponsored' : 'Non-Sponsored'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{s.mhtCetPercentile}</td>
                        <td>{normalizeCat(s.category)}</td>
                        <td>{s.gender}</td>
                        <td>{s.studentType}</td>
                        <td><span className={`badge badge-${s.allocationStatus}`}>{s.allocationStatus}</span></td>
                        <td>{s.allocatedBranch ? `${s.allocatedBranch.name} (${s.allocatedBranch.type})` : '—'}</td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No students found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== ALLOCATION TAB ===== */}
      {tab === 'allocate' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Seat Allocation</h3>
            <div className="toggle-wrapper">
              <button className={`toggle-btn ${allocMode === 'manual' ? 'active' : ''}`} onClick={() => setAllocMode('manual')}>
                👤 Manual
              </button>
              {/* <button className={`toggle-btn ${allocMode === 'auto' ? 'active' : ''}`} onClick={() => setAllocMode('auto')}>
                🤖 Auto
              </button> */}

              <button className={`toggle-btn ${allocMode === 'upgrade' ? 'active' : ''}`} onClick={() => setAllocMode('upgrade')}>
                🔄 Branch Upgrade
              </button>
            </div>
          </div>

          {allocMode === 'manual' ? (
            <div className="card">
              <div className="card-header">
                <h2>Manual Allocation</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{pendingStudents.length} pending students</span>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  {/* ── Student Picker ── */}
                  <div className="form-group full-width">
                    <label>Select Student <span className="required">*</span></label>

                    {/* Radio Options: Search by Name / Application ID / Merit No. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Search by:</span>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="manualSearchBy"
                          value="name"
                          checked={manualSearchBy === 'name'}
                          onChange={() => setManualSearchBy('name')}
                        />
                        Name
                      </label>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="manualSearchBy"
                          value="appId"
                          checked={manualSearchBy === 'appId'}
                          onChange={() => setManualSearchBy('appId')}
                        />
                        Application ID
                      </label>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="manualSearchBy"
                          value="merit"
                          checked={manualSearchBy === 'merit'}
                          onChange={() => setManualSearchBy('merit')}
                        />
                        Merit No.
                      </label>
                    </div>

                    {/* Search Input + Candidate Quota Filter + Category Filter */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <select
                        value={manualQuotaFilter}
                        onChange={e => { setManualQuotaFilter(e.target.value); setSelectedStudent(''); }}
                        style={{ flex: 1, minWidth: '140px', padding: '8px 12px', border: '1.5px solid #8B1A1A', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', background: '#FFF8F8', color: '#8B1A1A' }}
                      >
                        <option value="all">All Quotas</option>
                        <option value="Non-Sponsored">Non-Sponsored Quota</option>
                        <option value="Sponsored">Sponsored Quota</option>
                      </select>

                      <input
                        type="text"
                        placeholder={
                          manualSearchBy === 'name' ? '🔍 Search by name…' :
                          manualSearchBy === 'appId' ? '🔍 Search by Application ID…' :
                          `🔍 Search by ${manualQuotaFilter === 'Sponsored' ? 'Sponsored' : manualQuotaFilter === 'Non-Sponsored' ? 'Non-Sponsored' : 'Merit'} Rank #…`
                        }
                        value={manualStudentSearch}
                        onChange={e => { setManualStudentSearch(e.target.value); setSelectedStudent(''); }}
                        style={{ flex: 2, minWidth: '160px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit' }}
                      />

                      <select
                        value={manualCatFilter}
                        onChange={e => { setManualCatFilter(e.target.value); setSelectedStudent(''); }}
                        style={{ flex: 1, minWidth: '130px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit' }}
                      >
                        <option value="all">All Categories</option>
                        {Object.entries(CAT_LABELS).filter(([k]) => k !== 'EWS').map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Student list */}
                    <div style={{ border: '1px solid #8B1A1A', borderRadius: '8px', maxHeight: '280px', overflowY: 'auto', background: '#fff', boxShadow: '0 2px 8px rgba(139,26,26,0.08)' }}>
                      {filteredPendingStudents.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                          No pending students match the filter
                        </div>
                      ) : (
                        filteredPendingStudents.map((s, idx) => {
                          const isSel = selectedStudent === s._id;
                          const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;
                          return (
                            <div
                              key={s._id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(139,26,26,0.12)',
                                background: isSel ? 'linear-gradient(135deg,#8B1A1A,#B22222)' : idx % 2 === 0 ? '#fff' : '#FFF8F8',
                                color: isSel ? '#fff' : 'var(--text-primary)',
                                transition: 'all 0.18s ease'
                              }}
                            >
                              {/* Independent Quota Merit Rank circle */}
                              <span
                                onClick={() => setSelectedStudent(isSel ? '' : s._id)}
                                title={`${isSpon ? 'Sponsored' : 'Non-Sponsored'} Merit Rank #${getCandidateRank(s)}`}
                                style={{
                                  minWidth: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                                  background: isSel ? 'rgba(255,255,255,0.2)' : isSpon ? '#2563EB' : '#8B1A1A',
                                  color: '#fff', fontSize: '11px', fontWeight: 800,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>{getCandidateRank(s)}</span>

                              {/* Name + AppID + badges */}
                              <div
                                onClick={() => setSelectedStudent(isSel ? '' : s._id)}
                                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                              >
                                <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.fullName}</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                                  <span style={{ fontSize: '11px', opacity: isSel ? 0.8 : 0.5 }}>{s.applicationId}</span>
                                  <span style={{ opacity: 0.3 }}>·</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : isSpon ? '#EFF6FF' : '#F0FDF4', color: isSel ? '#fff' : isSpon ? '#1D4ED8' : '#15803D', border: isSel ? '1px solid rgba(255,255,255,0.4)' : isSpon ? '1px solid #BFDBFE' : '1px solid #BBF7D0' }}>{isSpon ? '💼 Sponsored' : '🎓 Non-Sponsored'}</span>
                                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#FFF0F0', color: isSel ? '#fff' : '#8B1A1A', border: isSel ? '1px solid rgba(255,255,255,0.4)' : '1px solid #F5BBBB' }}>📊 {s.mhtCetPercentile}%ile</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#FFFBEB', color: isSel ? '#fff' : '#B45309', border: isSel ? '1px solid rgba(255,255,255,0.4)' : '1px solid #FCD34D' }}>{normalizeCat(s.category)}</span>
                                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#F0F9FF', color: isSel ? '#fff' : '#0369A1', border: isSel ? '1px solid rgba(255,255,255,0.4)' : '1px solid #BAE6FD' }}>{s.gender === 'Female' ? '♀' : '♂'} {s.gender}</span>
                                </div>
                              </div>

                              {/* Skip button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSkipStudent(s._id, s.fullName); }}
                                title="Skip this student for current round"
                                style={{
                                  padding: '4px 12px', fontSize: '11px', fontWeight: 700,
                                  borderRadius: '6px', border: isSel ? '1px solid rgba(255,255,255,0.4)' : '1px solid #E5A300',
                                  background: isSel ? 'rgba(255,255,255,0.15)' : '#FFFBEB',
                                  color: isSel ? '#fff' : '#92400E', cursor: 'pointer',
                                  whiteSpace: 'nowrap', flexShrink: 0,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                ⏭ Skip
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Selected bar */}
                    {selectedStudent && (() => {
                      const s = students.find(x => x._id === selectedStudent);
                      if (!s) return null;
                      return (
                        <div style={{ marginTop: '8px', padding: '10px 16px', background: 'linear-gradient(135deg,#8B1A1A,#B22222)', borderRadius: '6px', fontSize: '13px', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          ✅ Selected: <strong>{s.fullName}</strong> · {s.mhtCetPercentile}%ile · {normalizeCat(s.category)} · {s.gender}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="form-group full-width">
                    <label>Select Branch <span className="required">*</span></label>
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                      <option value="">-- Select a branch --</option>
                      {branches.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.choiceCode} — {cleanBranchGroup(b.branchGroup || b.name)} [{b.specialization || b.name}] ({b.type}) — Vacant: {b.totalVacant}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Seat Quota / Pool <span className="required">*</span></label>
                    <select value={selectedPool} onChange={(e) => setSelectedPool(e.target.value)}>
                      <option value="nonSponsoredSeats">Non-Sponsored Seats</option>
                      <option value="sponsoredSeats">Sponsored Seats</option>
                      <option value="stateLevel">State Level Category Seats</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Seat Category <span className="required">*</span></label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {Object.entries(CAT_LABELS).filter(([k]) => k !== 'EWS').map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Seat Type <span className="required">*</span></label>
                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                      <option value="general">General (G)</option>
                      <option value="ladies">Ladies (L)</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={handleManualAllocate}
                      disabled={allocating || !selectedStudent || !selectedBranch}
                    >
                      {allocating ? 'Allocating...' : '✅ Allocate Seat'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h2>Automated Allocation (MHT-CET Rules)</h2>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  Auto allocation follows MHT-CET ACAP round rules:<br />
                  • Students are sorted by <strong>MHT-CET percentile</strong> (highest first)<br />
                  • Each student is allocated to their <strong>category-specific seat</strong> first<br />
                  • If no category seat available, tries <strong>OPEN seats</strong><br />
                  • <strong>Ladies quota</strong> is respected for female candidates<br />
                  • <strong>PWD, DEF, Minority, Orphan</strong> special pools are checked<br />
                  • Allocation stops when no more seats or students remain
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-value">{pendingStudents.length}</div>
                    <div className="stat-label">Pending Students</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{totalVacant}</div>
                    <div className="stat-label">Available Seats</div>
                  </div>
                </div>

                {/* <button
                  className="btn btn-success btn-lg btn-block"
                  onClick={handleAutoAllocate}
                  disabled={allocating || pendingStudents.length === 0 || totalVacant === 0}
                >
                  {allocating ? '🔄 Running Auto Allocation...' : '🤖 Run Auto Allocation for All Pending Students'}
                </button> */}

                {pendingStudents.length === 0 && (
                  <div className="alert alert-warning" style={{ marginTop: '12px' }}>No pending students to allocate.</div>
                )}
                {totalVacant === 0 && (
                  <div className="alert alert-error" style={{ marginTop: '12px' }}>No vacant seats available.</div>
                )}
              </div>
            </div>
          )}

          {/* ── Branch Upgrade Panel ── */}
          {allocMode === 'upgrade' && (
            <div className="card">
              <div className="card-header">
                <h2>🔄 Branch Upgrade</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CAP → ACAP Round upgrade</span>
              </div>
              <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                  <strong>How Branch Upgrade works:</strong><br />
                  Student already holds a CAP-allotted seat in Branch A and wants to upgrade to Branch B in the ACAP Round.<br />
                  • <strong>FROM branch</strong> seat → <strong>+1</strong> (returned to pool, visible live to all students)<br />
                  • <strong>TO branch</strong> seat → <strong>-1</strong> (new spot allocation)<br />
                  Both changes broadcast <strong>in real-time</strong> to all connected users.
                </div>

                <div className="form-grid">
                  {/* Student Selector with Search */}
                  <div className="form-group full-width">
                    <label>Select Student <span className="required">*</span></label>

                    {/* Radio Options: Search by Name / Application ID / Merit No. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Search by:</span>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="upgradeSearchBy"
                          value="name"
                          checked={upgradeSearchBy === 'name'}
                          onChange={() => setUpgradeSearchBy('name')}
                        />
                        Name
                      </label>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="upgradeSearchBy"
                          value="appId"
                          checked={upgradeSearchBy === 'appId'}
                          onChange={() => setUpgradeSearchBy('appId')}
                        />
                        Application ID
                      </label>
                      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="upgradeSearchBy"
                          value="merit"
                          checked={upgradeSearchBy === 'merit'}
                          onChange={() => setUpgradeSearchBy('merit')}
                        />
                        Merit No.
                      </label>
                    </div>

                    {/* Search Input + Candidate Quota Filter + Category Filter */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <select
                        value={upgradeQuotaFilter}
                        onChange={e => { setUpgradeQuotaFilter(e.target.value); setUpgradeStudent(''); }}
                        style={{ flex: 1, minWidth: '140px', padding: '8px 12px', border: '1.5px solid #8B1A1A', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', background: '#FFF8F8', color: '#8B1A1A' }}
                      >
                        <option value="all">All Quotas</option>
                        <option value="Non-Sponsored">Non-Sponsored Quota</option>
                        <option value="Sponsored">Sponsored Quota</option>
                      </select>

                      <input
                        type="text"
                        placeholder={
                          upgradeSearchBy === 'name' ? '🔍 Search by name…' :
                          upgradeSearchBy === 'appId' ? '🔍 Search by Application ID…' :
                          `🔍 Search by ${upgradeQuotaFilter === 'Sponsored' ? 'Sponsored' : upgradeQuotaFilter === 'Non-Sponsored' ? 'Non-Sponsored' : 'Merit'} Rank #…`
                        }
                        value={upgradeStudentSearch}
                        onChange={e => { setUpgradeStudentSearch(e.target.value); setUpgradeStudent(''); }}
                        style={{ flex: 2, minWidth: '160px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit' }}
                      />

                      <select
                        value={upgradeCatFilter}
                        onChange={e => { setUpgradeCatFilter(e.target.value); setUpgradeStudent(''); }}
                        style={{ flex: 1, minWidth: '130px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit' }}
                      >
                        <option value="all">All Categories</option>
                        {Object.entries(CAT_LABELS).filter(([k]) => k !== 'EWS').map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Student List */}
                    <div style={{ border: '1px solid #8B1A1A', borderRadius: '8px', maxHeight: '240px', overflowY: 'auto', background: '#fff', boxShadow: '0 2px 8px rgba(139,26,26,0.08)' }}>
                      {(() => {
                        const list = filteredUpgradeStudents.slice(0, 50);
                        if (list.length === 0) return (
                          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            No students match the search filter
                          </div>
                        );
                        return list.map((s, idx) => {
                          const isSel = upgradeStudent === s._id;
                          const isSpon = s.candidateType === 'Sponsored' || s.isSponsored;
                          return (
                            <div
                              key={s._id}
                              onClick={() => setUpgradeStudent(isSel ? '' : s._id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid rgba(139,26,26,0.08)',
                                background: isSel ? 'linear-gradient(135deg,#8B1A1A,#B22222)' : idx % 2 === 0 ? '#fff' : '#FFF8F8',
                                color: isSel ? '#fff' : 'var(--text-primary)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {/* Independent Quota Merit Rank Circle */}
                              <span
                                title={`${isSpon ? 'Sponsored' : 'Non-Sponsored'} Merit Rank #${getCandidateRank(s)}`}
                                style={{
                                  minWidth: '28px', height: '28px', borderRadius: '50%',
                                  background: isSel ? 'rgba(255,255,255,0.25)' : isSpon ? '#2563EB' : '#8B1A1A',
                                  color: '#fff', fontSize: '11px', fontWeight: 800,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>{getCandidateRank(s)}</span>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{s.fullName}</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '3px' }}>
                                  <span style={{ fontSize: '11px', opacity: isSel ? 0.8 : 0.5 }}>{s.applicationId}</span>
                                  <span style={{ opacity: 0.3 }}>·</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : isSpon ? '#EFF6FF' : '#F0FDF4', color: isSel ? '#fff' : isSpon ? '#1D4ED8' : '#15803D', border: isSel ? '1px solid rgba(255,255,255,0.4)' : isSpon ? '1px solid #BFDBFE' : '1px solid #BBF7D0' }}>{isSpon ? '💼 Sponsored' : '🎓 Non-Sponsored'}</span>
                                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#FFF0F0', color: isSel ? '#fff' : '#8B1A1A' }}>📊 {s.mhtCetPercentile}%ile</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#FFFBEB', color: isSel ? '#fff' : '#B45309' }}>{normalizeCat(s.category)}</span>
                                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#F0F9FF', color: isSel ? '#fff' : '#0369A1' }}>{s.gender === 'Female' ? '♀' : '♂'} {s.gender}</span>
                                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px', background: isSel ? 'rgba(255,255,255,0.25)' : '#F5F3FF', color: isSel ? '#fff' : '#6D28D9' }}>{s.allocationStatus}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    {upgradeStudent && (() => {
                      const s = students.find(x => x._id === upgradeStudent);
                      if (!s) return null;
                      return (
                        <div style={{ marginTop: '8px', padding: '10px 16px', background: 'linear-gradient(135deg,#8B1A1A,#B22222)', borderRadius: '6px', fontSize: '13px', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          ✅ Selected: <strong>{s.fullName}</strong> · {s.applicationId} · {s.mhtCetPercentile}%ile · {normalizeCat(s.category)} · {s.gender}
                        </div>
                      );
                    })()}
                  </div>

                  {/* FROM branch */}
                  <div className="form-group full-width" style={{ background: 'var(--error-bg,#fff5f5)', borderRadius: '8px', padding: '16px', border: '1.5px solid var(--danger,#dc2626)' }}>
                    <label style={{ color: 'var(--danger,#dc2626)', fontWeight: 700 }}>🏫 FROM Branch (Current CAP seat — will be FREED)</label>
                    <select value={upgradeFromBranch} onChange={e => setUpgradeFromBranch(e.target.value)} style={{ marginBottom: '10px' }}>
                      <option value="">-- Select current branch --</option>
                      {branches.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.choiceCode} — {cleanBranchGroup(b.branchGroup || b.name)} [{b.specialization || b.name}] ({b.type}) — Vacant: {b.totalVacant || 0}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label>From Category</label>
                        <select value={upgradeFromCat} onChange={e => setUpgradeFromCat(e.target.value)}>
                          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>From Seat Type</label>
                        <select value={upgradeFromType} onChange={e => setUpgradeFromType(e.target.value)}>
                          <option value="general">General (G)</option>
                          <option value="ladies">Ladies (L)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="form-group full-width" style={{ textAlign: 'center', fontSize: '28px', padding: '4px 0' }}>⬇️</div>

                  {/* TO branch */}
                  <div className="form-group full-width" style={{ background: 'var(--success-bg,#f0fdf4)', borderRadius: '8px', padding: '16px', border: '1.5px solid var(--success,#16a34a)' }}>
                    <label style={{ color: 'var(--success,#16a34a)', fontWeight: 700 }}>🎯 TO Branch (Upgrade Target — seat will be ALLOCATED)</label>
                    <select value={upgradeToBranch} onChange={e => setUpgradeToBranch(e.target.value)} style={{ marginBottom: '10px' }}>
                      <option value="">-- Select target branch --</option>
                      {branches.filter(b => b._id !== upgradeFromBranch).map(b => (
                        <option key={b._id} value={b._id}>
                          {b.choiceCode} — {cleanBranchGroup(b.branchGroup || b.name)} [{b.specialization || b.name}] ({b.type}) — Vacant: {b.totalVacant || 0}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label>To Category</label>
                        <select value={upgradeToCat} onChange={e => setUpgradeToCat(e.target.value)}>
                          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>To Seat Type</label>
                        <select value={upgradeToType} onChange={e => setUpgradeToType(e.target.value)}>
                          <option value="general">General (G)</option>
                          <option value="ladies">Ladies (L)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {upgradeFromBranch && upgradeToBranch && (
                    <div className="form-group full-width">
                      <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', padding: '14px', fontSize: '13px' }}>
                        <strong>📋 Upgrade Summary:</strong><br />
                        <span style={{ color: '#dc2626' }}>FROM: {branches.find(b => b._id === upgradeFromBranch)?.name} ({upgradeFromCat} / {upgradeFromType === 'ladies' ? 'Ladies' : 'General'}) → seat +1 freed</span><br />
                        <span style={{ color: '#16a34a' }}>TO: {branches.find(b => b._id === upgradeToBranch)?.name} ({upgradeToCat} / {upgradeToType === 'ladies' ? 'Ladies' : 'General'}) → seat -1 allocated</span><br />
                        <span style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>Changes will be live for all students instantly via WebSocket.</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group full-width">
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={handleBranchUpgrade}
                      disabled={upgrading || !upgradeStudent || !upgradeFromBranch || !upgradeToBranch}
                      style={{ background: upgrading ? undefined : 'linear-gradient(135deg, #8B1A1A, #c0392b)' }}
                    >
                      {upgrading ? '🔄 Processing Upgrade...' : '🔄 Confirm Branch Upgrade'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== ROUND SUMMARY (within allocate context) ===== */}
      {tab === 'allocate' && (
        <div style={{ marginTop: '24px' }}>
          {/* Round Info Header */}
          {roundSummary.currentRound && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <h2>📋 Round Summary — {roundSummary.currentRound.name || `Round ${roundSummary.currentRound.roundNumber || 1}`}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      try {
                        const roundId = roundSummary.currentRound._id;
                        const res = await axios.get(`/api/allocation/export-csv?roundId=${roundId}`, {
                          responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        const disposition = res.headers['content-disposition'];
                        const filename = disposition
                          ? disposition.split('filename=')[1]?.replace(/"/g, '')
                          : `allocated-students-round-${roundSummary.currentRound.roundNumber || 1}.csv`;
                        link.setAttribute('download', filename);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                        showMsg('✅ CSV downloaded successfully!');
                      } catch (err) {
                        showMsg('CSV download failed: ' + (err.response?.data?.message || err.message));
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10B981)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📥 Download CSV
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Round #{roundSummary.currentRound.roundNumber || 1} · Status: {roundSummary.currentRound.status}
                  </span>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div className="stat-card" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <div className="stat-label">Allocated This Round</div>
                    <div className="stat-value" style={{ color: '#059669' }}>{roundSummary.allocatedThisRound?.length || 0}</div>
                  </div>
                  <div className="stat-card" style={{ background: '#FFF8F0', border: '1px solid #FCD34D' }}>
                    <div className="stat-label">Remaining (Unallocated)</div>
                    <div className="stat-value" style={{ color: '#B45309' }}>{roundSummary.remainingStudents?.length || 0}</div>
                  </div>
                  <div className="stat-card" style={{ background: '#FFF0F0', border: '1px solid #F5BBBB' }}>
                    <div className="stat-label">Skipped This Round</div>
                    <div className="stat-value" style={{ color: '#8B1A1A' }}>{roundSummary.skippedStudents?.length || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Allocated This Round */}
          {roundSummary.allocatedThisRound?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <h2>✅ Allocated This Round ({roundSummary.allocatedThisRound.length})</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8B1A1A', borderBottom: '2px solid #8B1A1A', background: '#FFF8F8' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8B1A1A', borderBottom: '2px solid #8B1A1A', background: '#FFF8F8' }}>Student</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8B1A1A', borderBottom: '2px solid #8B1A1A', background: '#FFF8F8' }}>Percentile</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8B1A1A', borderBottom: '2px solid #8B1A1A', background: '#FFF8F8' }}>Branch</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8B1A1A', borderBottom: '2px solid #8B1A1A', background: '#FFF8F8' }}>Category</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8B1A1A', borderBottom: '2px solid #8B1A1A', background: '#FFF8F8' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundSummary.allocatedThisRound.map((a, idx) => (
                        <tr key={a._id} style={{ background: idx % 2 === 0 ? '#fff' : '#FFF8F8' }}>
                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#8B1A1A' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{a.student?.fullName}</div>
                            <div style={{ fontSize: '11px', opacity: 0.5 }}>{a.student?.applicationId}</div>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}>{a.student?.mhtCetPercentile}%ile</td>
                          <td style={{ padding: '8px 12px', fontSize: '12px' }}>{a.branch?.name} ({a.branch?.type})</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#FFF0F0', color: '#8B1A1A' }}>{a.seatCategory}</span>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '11px', textTransform: 'capitalize' }}>{a.seatType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Skipped Students — collapsible */}
          {roundSummary.skippedStudents?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowSkipped(!showSkipped)}>
                <h2>{showSkipped ? '▼' : '▶'} Skipped This Round ({roundSummary.skippedStudents.length})</h2>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>These students are skipped for this round only. They will be eligible in the next round.</span>
              </div>
              {showSkipped && (
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {roundSummary.skippedStudents.map((s, idx) => (
                      <div key={s._id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 16px', borderBottom: '1px solid rgba(139,26,26,0.08)',
                        background: idx % 2 === 0 ? '#fff' : '#FFF8F8'
                      }}>
                        <span style={{
                          minWidth: '28px', height: '28px', borderRadius: '50%',
                          background: '#D4A017', color: '#fff', fontSize: '10px', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{s.fullName}</div>
                          <div style={{ fontSize: '11px', opacity: 0.5 }}>{s.applicationId} · {s.mhtCetPercentile}%ile · {s.category}</div>
                        </div>
                        <button
                          onClick={() => handleUnskipStudent(s._id, s.fullName)}
                          style={{
                            padding: '4px 12px', fontSize: '11px', fontWeight: 700,
                            borderRadius: '6px', border: '1px solid #059669',
                            background: '#F0FDF4', color: '#059669', cursor: 'pointer'
                          }}
                        >
                          ↩ Unskip
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== ROUND MANAGEMENT TAB ===== */}
      {tab === 'round' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2>Current Round</h2>
              <span className={`badge badge-${round?.status || 'demo'}`}>{(round?.status || 'demo').toUpperCase()}</span>
            </div>
            <div className="card-body">
              <div className="round-status">
                <div>
                  <div className="status-label">Round Name</div>
                  <div style={{ fontWeight: 600 }}>{round?.name || 'ACAP Round'}</div>
                </div>
                <div>
                  <div className="status-label">Mode</div>
                  <div style={{ fontWeight: 600 }}>{round?.isDemo ? '🧪 Demo' : '🔴 Live'}</div>
                </div>
                <div>
                  <div className="status-label">Status</div>
                  <div style={{ fontWeight: 600 }}>{round?.status?.toUpperCase()}</div>
                </div>
              </div>

              <div className="round-controls">
                <button className="btn btn-warning" onClick={() => handleRoundAction('initialize')}>
                  🔄 Initialize New Round
                </button>
                {round?.status === 'setup' && (
                  <button className="btn btn-success" onClick={() => handleRoundAction('start')}>
                    ▶️ Start Round
                  </button>
                )}
                {round?.status === 'active' && (
                  <button className="btn btn-warning" onClick={() => handleRoundAction('pause')}>
                    ⏸️ Pause Round
                  </button>
                )}
                {(round?.status === 'active' || round?.status === 'paused') && (
                  <button className="btn btn-danger" onClick={() => handleRoundAction('end')}>
                    ⏹️ End Round
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2>📢 Public Announcement Ticker</h2>
              <span className="badge badge-active">LIVE CONTROL</span>
            </div>
            <div className="card-body">

              {/* Info note */}
              <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12px', color: 'var(--primary)', marginBottom: '14px' }}>
                🤖 <strong>Auto-updates on every allocation</strong> — when a student is allocated a seat, their name and branch are automatically prepended to this ticker in real-time. You can also edit manually below.
              </div>

              {/* Live preview */}
              <div style={{ background: '#B22222', color: '#fff', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 600, marginBottom: '12px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                🔴 Preview: {announcementText || '—'}
              </div>

              <label className="form-label" htmlFor="announcement-text">Announcement text (editable)</label>
              <textarea
                id="announcement-text"
                className="form-input"
                rows={3}
                value={announcementText}
                maxLength={500}
                onChange={(event) => setAnnouncementText(event.target.value)}
                style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '14px' }}>{announcementText.length}/500 characters</div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={announcementEnabled} onChange={(event) => setAnnouncementEnabled(event.target.checked)} />
                  Show ticker
                </label>
                <label className="form-label" htmlFor="announcement-direction" style={{ margin: 0 }}>Movement</label>
                <select id="announcement-direction" className="form-input" style={{ width: '160px' }} value={announcementDirection} onChange={(event) => setAnnouncementDirection(event.target.value)}>
                  <option value="ltr">← Left to right</option>
                  <option value="rtl">Right to left →</option>
                </select>
                <button className="btn btn-primary" onClick={handleAnnouncementSave}>💾 Save</button>
                <button
                  className="btn btn-warning"
                  onClick={async () => {
                    try {
                      await axios.put('/api/round/announcement', { resetToDefault: true });
                      showMsg('Ticker reset to default.');
                      fetchAll();
                    } catch (e) {
                      showMsg('Reset failed: ' + e.message);
                    }
                  }}
                  style={{ fontSize: '12px' }}
                >
                  🔄 Reset Ticker
                </button>
              </div>
            </div>
          </div>

          {/* ── Live Alert Broadcaster ── */}
          <div className="card" style={{ marginBottom: '20px', border: '2px solid #8B1A1A' }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg,#8B1A1A,#B22222)', color: '#fff' }}>
              <h2 style={{ color: '#fff' }}>📣 Live Alert Broadcaster</h2>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>INSTANT PUSH</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Send an instant popup notification to <strong>every student</strong> currently viewing the portal. The alert appears on their screen for 7 seconds.
              </p>

              {/* Alert type selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {[
                  { val: 'info', label: 'ℹ️ Info', bg: '#1D4ED8' },
                  { val: 'success', label: '✅ Update', bg: '#15803D' },
                  { val: 'warning', label: '⚠️ Warning', bg: '#B45309' },
                  { val: 'urgent', label: '🚨 Urgent', bg: '#8B1A1A' }
                ].map(t => (
                  <button
                    key={t.val}
                    onClick={() => setAlertType(t.val)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 700,
                      background: alertType === t.val ? t.bg : '#f0f0f0',
                      color: alertType === t.val ? '#fff' : '#555',
                      transition: 'all 0.15s'
                    }}
                  >{t.label}</button>
                ))}
              </div>

              {/* Quick preset messages */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>QUICK PRESETS</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    'Registration is now OPEN. Please proceed to the counter.',
                    'Allocation is in progress. Please wait at your seat.',
                    'Please bring your original documents to the counter.',
                    'The round will begin shortly. All students please be ready.',
                    '⚠️ Last call — report to the counter immediately or forfeit your seat.'
                  ].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setAlertMsg(preset)}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: '#fafafa', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >{preset.length > 40 ? preset.slice(0, 40) + '…' : preset}</button>
                  ))}
                </div>
              </div>

              {/* Message input + send */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Type your live alert message here…"
                    value={alertMsg}
                    maxLength={300}
                    onChange={e => setAlertMsg(e.target.value)}
                    style={{ width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{alertMsg.length}/300</div>
                </div>
                <button
                  disabled={!alertMsg.trim() || alertSending}
                  onClick={async () => {
                    if (!alertMsg.trim()) return;
                    setAlertSending(true);
                    try {
                      const res = await axios.post('/api/round/alert', { message: alertMsg, type: alertType });
                      showMsg(`✅ Alert sent to ${res.data.count || 'all'} connected users.`);
                      setAlertMsg('');
                    } catch (e) {
                      showMsg('❌ Failed to send alert: ' + (e.response?.data?.message || e.message));
                    }
                    setAlertSending(false);
                  }}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: alertMsg.trim() ? 'pointer' : 'not-allowed',
                    background: alertMsg.trim() ? 'linear-gradient(135deg,#8B1A1A,#B22222)' : '#ccc',
                    color: '#fff', fontWeight: 700, fontSize: '13px', minWidth: '90px',
                    transition: 'all 0.15s', marginBottom: '18px'
                  }}
                >
                  {alertSending ? '⏳' : '📣 Send'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Break Control ── */}
          <div className="card" style={{ marginBottom: '20px', border: '2px solid #D4A843' }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', color: '#fff' }}>
              <h2 style={{ color: '#fff' }}>☕ Break Control</h2>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {breakActive ? `${breakActive.toUpperCase()} BREAK ACTIVE` : 'NO BREAK'}
              </span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Start a break to show a premium animated overlay on <strong>all student screens</strong>. The overlay is purely visual — all data remains accessible underneath.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!breakActive ? (
                  <>
                    <button
                      className="btn btn-warning"
                      onClick={async () => {
                        try {
                          await axios.post('/api/round/break', { action: 'start', type: 'tea' });
                          showMsg('☕ Tea break started for all users.');
                        } catch (e) {
                          showMsg('Break error: ' + (e.response?.data?.message || e.message));
                        }
                      }}
                    >
                      ☕ Start Tea Break
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={async () => {
                        try {
                          await axios.post('/api/round/break', { action: 'start', type: 'lunch' });
                          showMsg('🍱 Lunch break started for all users.');
                        } catch (e) {
                          showMsg('Break error: ' + (e.response?.data?.message || e.message));
                        }
                      }}
                    >
                      🍱 Start Lunch Break
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-success"
                    onClick={async () => {
                      try {
                        await axios.post('/api/round/break', { action: 'end' });
                        showMsg('✅ Break ended for all users.');
                      } catch (e) {
                        showMsg('Break error: ' + (e.response?.data?.message || e.message));
                      }
                    }}
                  >
                    ✅ End Break
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>How Round Management Works</h2>
            </div>
            <div className="card-body" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '2' }}>
              <ol>
                <li><strong>Demo Mode (current):</strong> Uses sample data for testing. No actual allocations.</li>
                <li><strong>Initialize New Round:</strong> Creates a new round. Existing seats and allocations are preserved. Skipped students become eligible again.</li>
                <li><strong>Setup Mode:</strong> After initialization, go to "Seat Management" tab and enter the actual vacant seat data from MHT-CET portal.</li>
                <li><strong>Start Round:</strong> Once actual data is entered, start the round to enable allocations.</li>
                <li><strong>Allocate:</strong> Use the "Allocation" tab for manual or auto allocation.</li>
                <li><strong>End Round:</strong> Mark the round as completed when all seats are filled or round ends.</li>
              </ol>
            </div>
          </div>
        </>
      )}

      {/* Add Branch Modal */}
      <AddBranchModal
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        onBranchCreated={handleBranchCreated}
      />
    </main>
  );
}

export default AdminDashboard;
