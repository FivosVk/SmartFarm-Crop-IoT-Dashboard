const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FILE_PATH = path.join(__dirname, '..', 'data', 'sensor-readings.json');

const REQUIRED_CROPS = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const VALID_STATUS = ['Online', 'Offline', 'Faulty'];
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const REQUIRED_FIELDS = ['crop_name', 'timestamp', 'soil_moisture', 'temperature', 'rainfall', 'sensor_status', 'notes'];

/**
 * Structural validation ONLY. This checks the file is well-formed JSON with
 * the right shape, types, counts and unique-per-crop timestamps.
 *
 * It deliberately does NOT reject a reading just because a numeric value is
 * outside the normal business range (moisture 0-100, temperature 0-50,
 * rainfall 0-50) on an otherwise well-formed Online reading - that is the
 * "Invalid Data" case, which must still be returned to the frontend and is
 * handled in analyseCrop() on the frontend, never rejected here.
 *
 * Returns { valid: true, data } or { valid: false, reason }.
 */
function validateReadings(data) {
  if (!Array.isArray(data)) return { valid: false, reason: 'not an array' };
  if (data.length !== 20) return { valid: false, reason: 'wrong length' };

  const countsByCrop = {};
  const seenTimestampsByCrop = {};

  for (const r of data) {
    if (typeof r !== 'object' || r === null || Array.isArray(r)) {
      return { valid: false, reason: 'reading is not an object' };
    }

    for (const field of REQUIRED_FIELDS) {
      if (!(field in r)) return { valid: false, reason: `missing field ${field}` };
    }
    // Reject unexpected extra fields to keep the object exactly the seven required fields.
    if (Object.keys(r).length !== REQUIRED_FIELDS.length) {
      return { valid: false, reason: 'unexpected extra field' };
    }

    if (typeof r.crop_name !== 'string' || !REQUIRED_CROPS.includes(r.crop_name)) {
      return { valid: false, reason: 'invalid crop_name' };
    }
    if (typeof r.timestamp !== 'string' || !TIMESTAMP_RE.test(r.timestamp)) {
      return { valid: false, reason: 'invalid timestamp format' };
    }
    const parsedDate = new Date(r.timestamp.replace(' ', 'T'));
    if (isNaN(parsedDate.getTime())) {
      return { valid: false, reason: 'timestamp is not a valid calendar date-time' };
    }
    if (typeof r.soil_moisture !== 'number' || Number.isNaN(r.soil_moisture)) {
      return { valid: false, reason: 'soil_moisture must be a number' };
    }
    if (typeof r.temperature !== 'number' || Number.isNaN(r.temperature)) {
      return { valid: false, reason: 'temperature must be a number' };
    }
    if (typeof r.rainfall !== 'number' || Number.isNaN(r.rainfall)) {
      return { valid: false, reason: 'rainfall must be a number' };
    }
    if (typeof r.sensor_status !== 'string' || !VALID_STATUS.includes(r.sensor_status)) {
      return { valid: false, reason: 'invalid sensor_status' };
    }
    if (typeof r.notes !== 'string') {
      return { valid: false, reason: 'notes must be a string' };
    }

    countsByCrop[r.crop_name] = (countsByCrop[r.crop_name] || 0) + 1;

    seenTimestampsByCrop[r.crop_name] = seenTimestampsByCrop[r.crop_name] || new Set();
    if (seenTimestampsByCrop[r.crop_name].has(r.timestamp)) {
      return { valid: false, reason: `duplicate timestamp within ${r.crop_name}` };
    }
    seenTimestampsByCrop[r.crop_name].add(r.timestamp);
  }

  for (const crop of REQUIRED_CROPS) {
    if (countsByCrop[crop] !== 5) {
      return { valid: false, reason: `expected 5 readings for ${crop}, got ${countsByCrop[crop] || 0}` };
    }
  }

  return { valid: true, data };
}

/**
 * Reads the sensor file fresh from disk (no caching) and structurally
 * validates it. Reading fresh every call is what makes "Refresh Sensor
 * Data" pick up a replaced file without restarting the backend.
 */
function readAndValidate() {
  let raw;
  try {
    raw = fs.readFileSync(FILE_PATH, 'utf-8');
  } catch (err) {
    return { valid: false, reason: 'file could not be read' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { valid: false, reason: 'file is not valid JSON' };
  }

  return validateReadings(parsed);
}

router.get('/', (req, res) => {
  const result = readAndValidate();
  if (!result.valid) {
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }
  res.status(200).json(result.data);
});

module.exports = router;
module.exports.validateReadings = validateReadings;
module.exports.readAndValidate = readAndValidate;