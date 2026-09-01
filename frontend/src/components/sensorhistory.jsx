import { analyseCrop } from '../utils/analysis';

export default function SensorHistory({ cropName, readings, crop, onClose }) {
  const cropReadings = readings
    .filter((r) => r.crop_name === cropName)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first

  return (
    <div className="modal-overlay">
      <div className="sensor-history">
        <div className="sensor-history-header">
          <h2>Sensor History - {cropName}</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Moisture</th>
              <th>Temp</th>
              <th>Rainfall</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {cropReadings.map((r) => {
              const { condition } = analyseCrop(crop, r);
              return (
                <tr key={r.timestamp}>
                  <td>{r.timestamp}</td>
                  <td>{r.soil_moisture}%</td>
                  <td>{r.temperature} C</td>
                  <td>{r.rainfall} mm</td>
                  <td>{r.sensor_status}</td>
                  <td>{condition}</td>
                  <td>{r.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}