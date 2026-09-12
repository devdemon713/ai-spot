import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import SeatMatrix from '../components/SeatMatrix';
import LiveNotification from '../components/animations/LiveNotification';
import TeaBreakOverlay from '../components/animations/TeaBreakOverlay';
import LunchBreakOverlay from '../components/animations/LunchBreakOverlay';
import { playBreakBell, playNotificationSound, playUrgentSound } from '../components/animations/portalSounds';

function StudentDashboard() {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [branches, setBranches] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flashId, setFlashId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [liveAlert, setLiveAlert] = useState(null);
  const [breakType, setBreakType] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('seat-update', (data) => {
      setBranches(prev => prev.map(b =>
        b._id === data.branchId ? data.branch : b
      ));
      setFlashId(data.branchId);
      setTimeout(() => setFlashId(null), 1000);
    });

    socket.on('allocation-update', (data) => {
      if (data.studentId === user?._id || data.studentId === user?.id) {
        refreshUser();
        fetchAllocation();
      }
    });

    socket.on('allocation-batch-complete', () => {
      refreshUser();
      fetchAllocation();
    });

    socket.on('admin-alert', (data) => {
      setLiveAlert(data);
      // Play attention sound based on alert type
      if (data.type === 'urgent') {
        playUrgentSound();
      } else {
        playNotificationSound();
      }
      setTimeout(() => setLiveAlert(null), 7000);
    });

    socket.on('break-start', (data) => {
      setBreakType(data.type);
      playBreakBell(); // ~10 second bell chime
    });

    socket.on('break-end', () => {
      setBreakType(null);
    });

    return () => {
      socket.off('seat-update');
      socket.off('allocation-update');
      socket.off('allocation-batch-complete');
      socket.off('admin-alert');
      socket.off('break-start');
      socket.off('break-end');
    };
  }, [socket, user]);

  const fetchData = async () => {
    try {
      const [branchRes, alloRes] = await Promise.all([
        axios.get('/api/branches'),
        axios.get(`/api/allocation/student/${user?._id || user?.id}`)
      ]);
      setBranches(branchRes.data);
      setAllocation(alloRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const fetchAllocation = async () => {
    try {
      const res = await axios.get(`/api/allocation/student/${user?._id || user?.id}`);
      setAllocation(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const CAT_LABELS = {
    OPEN: 'OPEN', SC: 'SC', ST: 'ST', VJ_DT: 'VJ/DT',
    NTB: 'NT-B', NTC: 'NT-C', NTD: 'NT-D', OBC: 'OBC', SEBC: 'SEBC', EWS: 'EWS'
  };

  const filteredBranches = branches.filter(b => {
    if (filter === 'all') return true;
    return b.type === filter;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <main className="main-content">
      {/* Premium Notification + Break Overlays */}
      <LiveNotification alert={liveAlert} onDismiss={() => setLiveAlert(null)} />
      <TeaBreakOverlay isActive={breakType === 'tea'} />
      <LunchBreakOverlay isActive={breakType === 'lunch'} />

      <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Student Dashboard</h2>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2>Your Profile</h2>
          <span className={`badge badge-${user?.allocationStatus || 'pending'}`}>
            {(user?.allocationStatus || 'pending').toUpperCase()}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application ID</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>{user?.applicationId}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{user?.fullName}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MHT-CET Percentile</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--success)' }}>{user?.mhtCetPercentile || 0}%</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{CAT_LABELS[user?.category] || user?.category} ({user?.gender})</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
              <div style={{ fontSize: '14px' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Type</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{user?.studentType}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Result */}
      {allocation && allocation.status !== 'cancelled' && (
        <div className="allocation-result" style={{ marginBottom: '24px' }}>
          <h3>🎉 Your seat is secured!</h3>
          <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            <div className="detail">
              <span className="label">Branch</span>
              <span className="value">{allocation.branch?.name}</span>
            </div>
            <div className="detail">
              <span className="label">Type</span>
              <span className="value">{allocation.branch?.type}</span>
            </div>
            <div className="detail">
              <span className="label">Choice Code</span>
              <span className="value">{allocation.branch?.choiceCode}</span>
            </div>
            <div className="detail">
              <span className="label">Seat Category</span>
              <span className="value">{CAT_LABELS[allocation.seatCategory] || allocation.seatCategory}</span>
            </div>
            <div className="detail">
              <span className="label">Seat Type</span>
              <span className="value">{allocation.seatType === 'ladies' ? 'Ladies' : 'General'}</span>
            </div>
            <div className="detail">
              <span className="label">Allocated By</span>
              <span className="value">{allocation.allocatedBy === 'auto' ? 'Merit-based (Auto)' : 'Manual'}</span>
            </div>
            <div className="detail">
              <span className="label">Status</span>
              <span className="value" style={{ color: 'var(--success)' }}>{allocation.status.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {(!allocation || allocation.status === 'cancelled') && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          ⏳ Your seat allocation is pending. The admin will process allocations based on merit and category. 
          Please check back or keep this page open — it updates in real-time.
        </div>
      )}

      {/* Live Seat Availability */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px' }}>Live Seat Availability</h3>
        <div className="toggle-wrapper">
          <button className={`toggle-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`toggle-btn ${filter === 'Aided' ? 'active' : ''}`} onClick={() => setFilter('Aided')}>Aided</button>
          <button className={`toggle-btn ${filter === 'Unaided' ? 'active' : ''}`} onClick={() => setFilter('Unaided')}>Unaided</button>
        </div>
      </div>

      {filteredBranches.map(branch => (
        <SeatMatrix key={branch._id} branch={branch} flashId={flashId} />
      ))}
    </main>
  );
}

export default StudentDashboard;
