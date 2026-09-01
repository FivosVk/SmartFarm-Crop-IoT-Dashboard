import { useState } from 'react';

export default function CropForm({ mode, availableCropNames = [], initialData, onSubmit, onCancel }) {
  const [cropName, setCropName] = useState(initialData?.crop_name || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [targetMin, setTargetMin] = useState(initialData?.target_min ?? '');
  const [targetMax, setTargetMax] = useState(initialData?.target_max ?? '');
  const [normalWater, setNormalWater] = useState(initialData?.normal_water ?? '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function clientValidate() {
    if (mode === 'create' && !cropName) return 'Select a crop name.';
    if (!location || location.length > 100) return 'Location is required (1-100 characters).';
    const min = Number(targetMin);
    const max = Number(targetMax);
    const water = Number(normalWater);
    if (Number.isNaN(min) || min < 0 || min > 100) return 'Target min must be a number between 0 and 100.';
    if (Number.isNaN(max) || max < 0 || max > 100) return 'Target max must be a number between 0 and 100.';
    if (min >= max) return 'Target min must be less than target max.';
    if (Number.isNaN(water) || water <= 0 || water > 10000) return 'Normal water must be greater than 0 and at most 10000.';
    if (notes && notes.length > 500) return 'Notes must be 500 characters or fewer.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const clientError = clientValidate();
    if (clientError) {
      setError(clientError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...(mode === 'create' ? { crop_name: cropName } : {}),
        location,
        target_min: Number(targetMin),
        target_max: Number(targetMax),
        normal_water: Number(normalWater),
        notes,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <form className="crop-form" onSubmit={handleSubmit}>
        <h2>{mode === 'create' ? 'Add Crop Card' : `Edit ${cropName}`}</h2>

        <label>
          Crop name
          {mode === 'create' ? (
            <select value={cropName} onChange={(e) => setCropName(e.target.value)} required>
              <option value="">Select a crop</option>
              {availableCropNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input value={cropName} readOnly disabled />
          )}
        </label>

        <label>
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            required
          />
        </label>

        <label>
          Target moisture min (%)
          <input
            type="number"
            value={targetMin}
            onChange={(e) => setTargetMin(e.target.value)}
            min="0"
            max="100"
            required
          />
        </label>

        <label>
          Target moisture max (%)
          <input
            type="number"
            value={targetMax}
            onChange={(e) => setTargetMax(e.target.value)}
            min="0"
            max="100"
            required
          />
        </label>

        <label>
          Normal water (L)
          <input
            type="number"
            value={normalWater}
            onChange={(e) => setNormalWater(e.target.value)}
            min="0"
            max="10000"
            required
          />
        </label>

        <label>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="crop-form-actions">
          <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        </div>
      </form>
    </div>
  );
}