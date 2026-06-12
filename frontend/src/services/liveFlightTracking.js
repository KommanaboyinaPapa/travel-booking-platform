const TRACKED_FLIGHTS_KEY = 'tracked_flight_ids';
const FLIGHT_ALERTS_KEY = 'tracked_flight_alerts';

function readJson(key, fallbackValue) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

export function loadTrackedFlightIds() {
  const value = readJson(TRACKED_FLIGHTS_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function saveTrackedFlightIds(flightIds) {
  localStorage.setItem(TRACKED_FLIGHTS_KEY, JSON.stringify(flightIds));
}

export function loadFlightAlerts() {
  const value = readJson(FLIGHT_ALERTS_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function saveFlightAlerts(alerts) {
  localStorage.setItem(FLIGHT_ALERTS_KEY, JSON.stringify(alerts));
}
