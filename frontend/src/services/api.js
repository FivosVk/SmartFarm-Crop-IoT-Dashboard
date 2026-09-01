const BASE_URL = 'http://localhost:3001/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the backend server');
  }

  let body = {};
  try {
    body = await res.json();
  } catch (parseErr) {
    // Non-JSON response body (e.g. an unhandled 500 HTML page) - fall through
  }

  if (!res.ok) {
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return body;
}

export const getCrops = () => request('/crops');
export const getCropById = (id) => request(`/crops/${id}`);
export const createCrop = (data) => request('/crops', { method: 'POST', body: JSON.stringify(data) });
export const updateCrop = (id, data) => request(`/crops/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCrop = (id) => request(`/crops/${id}`, { method: 'DELETE' });
export const getReadings = () => request('/readings');