import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LiveIndicator from './LiveIndicator';

function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { connected, clientsCount } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <Link to="/" className="navbar-brand">
          <img src="/wce-logo.png" alt="WCE Sangli Logo" className="navbar-logo" />
          <div className="brand-text">
            <div>Walchand College of Engineering, Sangli</div>
            <div className="navbar-badge">Autonomous Institute · Government Aided</div>
          </div>
        </Link>

        <div className="navbar-links">
          <LiveIndicator connected={connected} clientsCount={clientsCount} />
          
          {!isAuthenticated ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <>
              {isAdmin ? (
                <Link to="/admin">Admin Panel</Link>
              ) : (
                <Link to="/student">My Dashboard</Link>
              )}
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                {user?.fullName}
              </span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
