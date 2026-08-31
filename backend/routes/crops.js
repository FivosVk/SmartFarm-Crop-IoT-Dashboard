const express = require('express');
const { db } = require('../db');
const { readAndValidate } = require('./readings');

const router = express.Router();

function getAllCrops() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM crops ORDER BY id ASC', (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function getCropById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM crops WHERE id = ?', [id], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function getCropByName(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM crops WHERE crop_name = ?', [name], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

/**
 * Validates the writable Crop Card fields. Returns the first error message
 * found, or null if the body is valid. This is the authoritative check -
 * it runs regardless of what the React form already validated client-side.
 */
function validateCropBody(body) {
  if (typeof body.location !== 'string' || body.location.length < 1 || body.location.length > 100) {
    return 'location is required';
  }
  if (typeof body.target_min !== 'number' || Number.isNaN(body.target_min)) {
    return 'target_min must be a number';
  }
  if (body.target_min < 0 || body.target_min > 100) {
    return 'target_min must be between 0 and 100';
  }
  if (typeof body.target_max !== 'number' || Number.isNaN(body.target_max)) {
    return 'target_max must be a number';
  }
  if (body.target_max < 0 || body.target_max > 100) {
    return 'target_max must be between 0 and 100';
  }
  if (body.target_min >= body.target_max) {
    return 'target_min must be less than target_max';
  }
  if (typeof body.normal_water !== 'number' || Number.isNaN(body.normal_water)) {
    return 'normal_water must be a number';
  }
  if (body.normal_water <= 0 || body.normal_water > 10000) {
    return 'normal_water must be greater than 0 and at most 10000';
  }
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string' || body.notes.length > 500) {
      return 'notes must be a string up to 500 characters';
    }
  }
  return null;
}

// GET /api/crops
router.get('/', async (req, res, next) => {
  try {
    const crops = await getAllCrops();
    res.status(200).json(crops);
  } catch (err) {
    next(err);
  }
});

// GET /api/crops/:id
router.get('/:id', async (req, res, next) => {
  try {
    const crop = await getCropById(req.params.id);
    if (!crop) return res.status(404).json({ error: 'Crop card not found' });
    res.status(200).json(crop);
  } catch (err) {
    next(err);
  }
});

// POST /api/crops
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};

    if (typeof body.crop_name !== 'string' || body.crop_name.length === 0) {
      return res.status(400).json({ error: 'crop_name is required' });
    }

    const fieldError = validateCropBody(body);
    if (fieldError) return res.status(400).json({ error: fieldError });

    // crop_name must exactly (case-sensitively) match a name present in the
    // current valid sensor feed. Re-uses the same structural validator as
    // GET /api/readings so both routes agree on what "valid" means.
    const readingsResult = readAndValidate();
    if (!readingsResult.valid) {
      return res.status(500).json({ error: 'Sensor data file is invalid' });
    }
    const validNames = new Set(readingsResult.data.map((r) => r.crop_name));
    if (!validNames.has(body.crop_name)) {
      return res.status(400).json({ error: 'crop_name does not exist in sensor data' });
    }

    const existing = await getCropByName(body.crop_name);
    if (existing) return res.status(409).json({ error: 'crop_name already exists' });

    const notes = body.notes ?? '';

    db.run(
      `INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [body.crop_name, body.location, body.target_min, body.target_max, body.normal_water, notes],
      function (err) {
        if (err) {
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'crop_name already exists' });
          }
          return next(err);
        }
        getCropById(this.lastID)
          .then((crop) => res.status(201).json(crop))
          .catch(next);
      }
    );
  } catch (err) {
    next(err);
  }
});

// PUT /api/crops/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getCropById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Crop card not found' });

    const body = req.body || {};

    if (body.crop_name !== undefined && body.crop_name !== existing.crop_name) {
      return res.status(400).json({ error: 'crop_name cannot be changed' });
    }

    const fieldError = validateCropBody(body);
    if (fieldError) return res.status(400).json({ error: fieldError });

    const notes = body.notes ?? '';

    db.run(
      `UPDATE crops SET location = ?, target_min = ?, target_max = ?, normal_water = ?, notes = ?
       WHERE id = ?`,
      [body.location, body.target_min, body.target_max, body.normal_water, notes, req.params.id],
      (err) => {
        if (err) return next(err);
        getCropById(req.params.id)
          .then((crop) => res.status(200).json(crop))
          .catch(next);
      }
    );
  } catch (err) {
    next(err);
  }
});

// DELETE /api/crops/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await getCropById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Crop card not found' });

    db.run('DELETE FROM crops WHERE id = ?', [req.params.id], (err) => {
      if (err) return next(err);
      res.status(200).json({ deleted: true, id: Number(req.params.id) });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;