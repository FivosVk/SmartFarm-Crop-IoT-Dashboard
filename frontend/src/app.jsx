import { useEffect, useState } from 'react';
import * as api from './services/api';
import { getAvailableCropNames, getLatestReading, analyseCrop, calculateFarmStatus } from './utils/analysis';
import CropCard from './components/cropcard';
import CropForm from './components/cropform';
import SensorHistory from './components/sensorhistory';
import FarmSummary from './components/farmsummary';
import './App.css';

export default function App() {
  const [crops, setCrops] = useState([]);
  const [readings, setReadings] = useState(null); // null = sensor data never successfully loaded
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState(null);
  const [readingsError, setReadingsError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState('Never');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [historyCropName, setHistoryCropName] = useState(null);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }

  useEffect(() => {
    loadCrops();
    loadReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flashBanner(type, message) {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  }

  async function loadCrops() {
    setCropsLoading(true);
    setCropsError(null);
    try {
      const data = await api.getCrops();
      setCrops(data);
    } catch (err) {
      setCropsError(err.message);
    } finally {
      setCropsLoading(false);
    }
  }

  async function loadReadings() {
    try {
      const data = await api.getReadings();
      setReadings(data);
      setReadingsError(null);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      // Deliberately do NOT clear existing `readings` state - a failed
      // refresh must keep the last successful dashboard visible.
      setReadingsError(err.message);
    }
  }

  async function handleCreate(formData) {
    await api.createCrop(formData);
    await loadCrops();
    setShowCreateForm(false);
    flashBanner('success', `${formData.crop_name} card created.`);
  }

  async function handleUpdate(id, formData) {
    await api.updateCrop(id, formData);
    await loadCrops();
    setEditingCrop(null);
    flashBanner('success', 'Crop card updated.');
  }

  async function handleDelete(id, cropName) {
    if (!window.confirm(`Delete the ${cropName} crop card? This does not affect sensor data.`)) return;
    await api.deleteCrop(id);
    await loadCrops();
    flashBanner('success', `${cropName} card deleted.`);
  }

  async function handleRefresh() {
    await loadReadings();
  }

  // Rebuild the dashboard from current crops + current sensor-reading state.
  const results = crops.map((crop) => {
    const latest_reading = readings ? getLatestReading(crop.crop_name, readings) : null;
    const analysis = readings
      ? analyseCrop(crop, latest_reading)
      : { condition: null, recommended_water: 'N/A', alerts: [], action: null };
    return { crop, latest_reading, ...analysis };
  });

  const farmStatus = calculateFarmStatus(results);
  const availableCropNames = readings ? getAvailableCropNames(readings, crops) : [];

  if (cropsLoading) {
    return (
      <div className="app-shell">
        <p className="loading">Loading SmartFarm dashboard...</p>
      </div>
    );
  }

  if (cropsError) {
    return (
      <div className="app-shell">
        <div className="error-panel">
          <p>Application error: {cropsError}</p>
          <button onClick={loadCrops}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <FarmSummary
        farmStatus={farmStatus}
        cropCount={crops.length}
        lastRefresh={lastRefresh}
        onAddCrop={() => setShowCreateForm(true)}
        onRefresh={handleRefresh}
        createDisabled={!readings || availableCropNames.length === 0}
      />

      {banner && <div className={`banner banner-${banner.type}`}>{banner.message}</div>}
      {readingsError && (
        <div className="banner banner-error">Sensor refresh failed: {readingsError}. Showing last known data.</div>
      )}
      {!readings && !readingsError && (
        <div className="banner banner-warning">Sensor feed unavailable. Crop cards are shown without live readings.</div>
      )}

      <main className="crop-grid">
        {crops.length === 0 ? (
          <p className="empty-state">No crop cards yet. Click "Add Crop Card" to create your first one.</p>
        ) : (
          results.map((r) => (
            <CropCard
              key={r.crop.id}
              result={r}
              onEdit={() => setEditingCrop(r.crop)}
              onDelete={() => handleDelete(r.crop.id, r.crop.crop_name)}
              onViewHistory={() => setHistoryCropName(r.crop.crop_name)}
            />
          ))
        )}
      </main>

      {showCreateForm && (
        <CropForm
          mode="create"
          availableCropNames={availableCropNames}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingCrop && (
        <CropForm
          mode="edit"
          initialData={editingCrop}
          onSubmit={(data) => handleUpdate(editingCrop.id, data)}
          onCancel={() => setEditingCrop(null)}
        />
      )}

      {historyCropName && readings && (
        <SensorHistory
          cropName={historyCropName}
          readings={readings}
          crop={crops.find((c) => c.crop_name === historyCropName)}
          onClose={() => setHistoryCropName(null)}
        />
      )}
    </div>
  );
}