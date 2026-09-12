function LiveIndicator({ connected, clientsCount }) {
  return (
    <div className="live-indicator" style={{ marginRight: '8px' }}>
      <span className="live-dot" style={{
        background: connected ? '#059669' : '#DC2626'
      }}></span>
      <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
      {connected && clientsCount > 0 && (
        <span className="connected-count">({clientsCount} online)</span>
      )}
    </div>
  );
}

export default LiveIndicator;
