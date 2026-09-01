/**
 * getAvailableCropNames
 * Unique crop_name values present in the sensor JSON, minus names already
 * used by an existing Crop Card. Powers the Create dropdown; after a
 * card is deleted its crop_name becomes available again automatically
 * because this is recomputed from current state every render.
 */
export function getAvailableCropNames(readings, crops) {
    const usedNames = new Set(crops.map((c) => c.crop_name));
    const allNames = new Set(readings.map((r) => r.crop_name));
    return [...allNames].filter((name) => !usedNames.has(name)).sort();
  }
  
  /**
   * getLatestReading
   * Exact, case-sensitive match on crop_name, then picks the greatest
   * timestamp. Never assumes the last array element is the latest -
   * the sensor-readings.json is deliberately shuffled to test this.
   * Because the timestamp format is fixed-width (YYYY-MM-DDTHH:mm:ss),
   * a plain string comparison sorts correctly.
   */
  export function getLatestReading(cropName, readings) {
    const matches = readings.filter((r) => r.crop_name === cropName);
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }
  
  /**
   * analyseCrop
   * Implements the authoritative decision table (Assignment Section 10).
   * Checked top to bottom - the FIRST matching main condition wins and
   * later main-condition rows are not checked. High temperature and Rain
   * detected are additional alerts layered on top of a valid Online
   * reading only; they never change recommended_water or override the
   * main condition.
   *
   * Boundary rules:
   *  - soil_moisture exactly target_min or target_max -> Healthy
   *  - temperature exactly 35 -> NOT high (must be strictly > 35)
   *  - rainfall exactly 5 -> Rain detected (>= 5)
   */
  export function analyseCrop(crop, reading) {
    if (!reading) {
      return { condition: null, recommended_water: 'N/A', alerts: [], action: null };
    }
  
    // Priority 1: sensor problem - checked before anything else, including
    // an otherwise "Invalid Data" numeric value.
    if (reading.sensor_status === 'Offline' || reading.sensor_status === 'Faulty') {
      return {
        condition: 'Sensor Problem',
        recommended_water: 'N/A',
        alerts: ['Check sensor'],
        action: 'Check sensor',
      };
    }
  
    // Priority 2: invalid data - only relevant once we know the reading is Online.
    let invalidField = null;
    if (reading.soil_moisture < 0 || reading.soil_moisture > 100) invalidField = 'soil_moisture';
    else if (reading.temperature < 0 || reading.temperature > 50) invalidField = 'temperature';
    else if (reading.rainfall < 0 || reading.rainfall > 50) invalidField = 'rainfall';
  
    if (invalidField) {
      return {
        condition: 'Invalid Data',
        recommended_water: 'N/A',
        alerts: [`Invalid ${invalidField}`],
        action: 'Check reading',
      };
    }
  
    // Priority 3-5: moisture-based main condition.
    let condition;
    let recommended_water;
    let action;
  
    if (reading.soil_moisture < crop.target_min) {
      condition = 'Dry';
      recommended_water = crop.normal_water;
      action = 'Water crop';
    } else if (reading.soil_moisture <= crop.target_max) {
      condition = 'Healthy';
      recommended_water = 0;
      action = 'Monitor';
    } else {
      condition = 'Too Wet';
      recommended_water = 0;
      action = 'Stop watering';
    }
  
    // Additional alerts - valid Online reading only, never change recommended_water.
    const alerts = [];
    if (reading.temperature > 35) alerts.push('High temperature');
    if (reading.rainfall >= 5) alerts.push('Rain detected');
  
    return { condition, recommended_water, alerts, action };
  }
  
  /**
   * calculateFarmStatus
   * Derives the Overall Farm Status from the current dashboard results.
   * Checked in this order:
   *  1. No Crop Cards at all -> "No Crops" (always takes priority)
   *  2. At least one card but sensor data never successfully loaded -> "Sensor Feed Unavailable"
   *  3. Any card is Sensor Problem or Invalid Data -> "Critical"
   *  4. Any card is Dry, Too Wet, or has a High temperature alert -> "Watch"
   *  5. Otherwise -> "Normal"
   * Rain detected alone never changes the farm status.
   */
  export function calculateFarmStatus(results) {
    if (results.length === 0) return 'No Crops';
    if (results.some((r) => !r.latest_reading)) return 'Sensor Feed Unavailable';
    if (results.some((r) => r.condition === 'Sensor Problem' || r.condition === 'Invalid Data')) return 'Critical';
    if (
      results.some(
        (r) => r.condition === 'Dry' || r.condition === 'Too Wet' || r.alerts.includes('High temperature')
      )
    ) {
      return 'Watch';
    }
    return 'Normal';
  }