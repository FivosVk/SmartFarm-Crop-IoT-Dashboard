const STATUS_CLASS = {
    Normal: 'status-normal',
    Watch: 'status-watch',
    Critical: 'status-critical',
    'No Crops': 'status-neutral',
    'Sensor Feed Unavailable': 'status-neutral',
  };
  
  export default function FarmSummary({ farmStatus, cropCount, lastRefresh, onAddCrop, onRefresh, createDisabled }) {
    return (
      <header className="farm-summary">
        <div className="farm-summary-title">
          <h1>SmartFarm Crop Dashboard</h1>
          <span className={`status-pill ${STATUS_CLASS[farmStatus] || ''}`}>{farmStatus}</span>
        </div>
        <div className="farm-summary-meta">
          <span>Crop cards: {cropCount}</span>
          <span>Last sensor refresh: {lastRefresh}</span>
        </div>
        <div className="farm-summary-actions">
          <button
            onClick={onAddCrop}
            disabled={createDisabled}
            title={createDisabled ? 'No available crop names to add right now' : ''}
          >
            Add Crop Card
          </button>
          <button onClick={onRefresh}>Refresh Sensor Data</button>
        </div>
      </header>
    );
  }