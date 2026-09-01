const CONDITION_CLASS = {
    Dry: 'condition-dry',
    Healthy: 'condition-healthy',
    'Too Wet': 'condition-too-wet',
    'Sensor Problem': 'condition-problem',
    'Invalid Data': 'condition-problem',
  };
  
  export default function CropCard({ result, onEdit, onDelete, onViewHistory }) {
    const { crop, latest_reading, condition, recommended_water, alerts, action } = result;
  
    return (
      <div className="crop-card">
        <div className="crop-card-header">
          <h2>{crop.crop_name}</h2>
          {condition && <span className={`condition-pill ${CONDITION_CLASS[condition] || ''}`}>{condition}</span>}
        </div>
  
        <p className="crop-card-location">{crop.location}</p>
  
        <dl className="crop-card-settings">
          <div><dt>Target moisture</dt><dd>{crop.target_min}% - {crop.target_max}%</dd></div>
          <div><dt>Normal water</dt><dd>{crop.normal_water} L</dd></div>
          {crop.notes && <div><dt>Notes</dt><dd>{crop.notes}</dd></div>}
        </dl>
  
        <div className="crop-card-sensor">
          {latest_reading ? (
            <>
              <p className="sensor-timestamp">Latest reading: {latest_reading.timestamp}</p>
              <dl className="crop-card-readings">
                <div><dt>Moisture</dt><dd>{latest_reading.soil_moisture}%</dd></div>
                <div><dt>Temperature</dt><dd>{latest_reading.temperature} C</dd></div>
                <div><dt>Rainfall</dt><dd>{latest_reading.rainfall} mm</dd></div>
                <div><dt>Sensor</dt><dd>{latest_reading.sensor_status}</dd></div>
              </dl>
            </>
          ) : (
            <p className="sensor-timestamp">Latest reading: N/A (sensor feed unavailable)</p>
          )}
  
          <p><strong>Recommended water:</strong> {recommended_water === 'N/A' ? 'N/A' : `${recommended_water} L`}</p>
          <p><strong>Action:</strong> {action ?? 'N/A'}</p>
          {alerts && alerts.length > 0 && (
            <ul className="crop-card-alerts">
              {alerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
  
        <div className="crop-card-actions">
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDelete} className="btn-danger">Delete</button>
          <button onClick={onViewHistory}>View Sensor History</button>
        </div>
      </div>
    );
  }