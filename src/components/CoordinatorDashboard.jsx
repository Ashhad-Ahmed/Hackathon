export default function CoordinatorDashboard({ parsedData, wave, donors, openSimulator }) {
  const confirmedCount = donors.filter(d => d.status === 'Confirmed').length;
  const isGoalReached = confirmedCount >= (parseInt(parsedData.count) || 5);

  return (
    <div className="dashboard-pane">
      <div className="dash-header">
        <h1>Coordinator Dashboard</h1>
        <div className="live-badge">Live System</div>
      </div>

      <div className="dash-grid">
        {/* Intake Card */}
        <div className="card intake-card">
          <h3>Parsed Request Data</h3>
          <div className="data-grid">
            <div className="data-item">
              <span className="label">Blood Group</span>
              <span className="value accent">{parsedData.bloodGroup}</span>
            </div>
            <div className="data-item">
              <span className="label">Target Count</span>
              <span className="value">{parsedData.count}</span>
            </div>
            <div className="data-item">
              <span className="label">Location</span>
              <span className="value">{parsedData.location}</span>
            </div>
            <div className="data-item">
              <span className="label">Hospital</span>
              <span className="value">{parsedData.hospital}</span>
            </div>
            <div className="data-item">
              <span className="label">Urgency</span>
              <span className={`value ${parsedData.urgency === 'High' ? 'danger' : ''}`}>{parsedData.urgency}</span>
            </div>
          </div>
        </div>

        {/* Progress & Wave */}
        <div className="card progress-card">
          <div className="progress-header">
            <h3>Commitment Status</h3>
            <span className="wave-badge">Wave {wave > 0 ? wave : '-'}</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${Math.min((confirmedCount / 5) * 100, 100)}%` }}></div>
          </div>
          <p className="progress-text">{confirmedCount} of {parsedData.count === '-' ? '0' : parsedData.count} Confirmed</p>
          
          {isGoalReached && (
            <div className="success-banner">
              Target Reached! Summary ready for dispatch.
            </div>
          )}
        </div>
      </div>

      {/* Donor List */}
      <div className="card donors-card">
        <h3>Active Donor Outreach</h3>
        <p className="subtext">Click on a "Pending" donor to simulate their WhatsApp reply.</p>
        <div className="donor-list">
          {donors.length === 0 ? (
            <div className="empty-state">Waiting for request...</div>
          ) : (
            donors.map(donor => (
              <div 
                key={donor.id} 
                className={`donor-row ${donor.status.toLowerCase()} ${donor.status === 'Pending' ? 'clickable' : ''}`}
                onClick={() => openSimulator(donor)}
              >
                <div className="donor-info">
                  <strong>{donor.name}</strong>
                  <span>{donor.distance} • {donor.lastDonation}</span>
                </div>
                <div className={`status-badge ${donor.status.toLowerCase()}`}>
                  {donor.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
