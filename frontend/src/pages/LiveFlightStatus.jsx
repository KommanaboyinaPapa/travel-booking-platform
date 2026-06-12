import { useEffect, useMemo, useState } from 'react';
import { getFlights, getFlightStatus } from '../services/api.js';
import {
  loadFlightAlerts,
  loadTrackedFlightIds,
  saveFlightAlerts,
  saveTrackedFlightIds,
} from '../services/liveFlightTracking.js';

const AIRLINE_COLORS = [
  ['#1a237e', '#283593'], ['#004d40', '#00695c'],
  ['#4a148c', '#6a1b9a'], ['#bf360c', '#d84315'],
  ['#01579b', '#0277bd'],
];

function formatDateTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

function getStatusBadgeClass(status) {
  if (status === 'Delayed by 1h') return 'status-badge status-badge-delayed';
  if (status === 'Boarding') return 'status-badge status-badge-boarding';
  return 'status-badge status-badge-on-time';
}

function getAlertIcon(type) {
  if (type === 'delayed') return '⏰';
  if (type === 'boarding') return '🚪';
  return '📅';
}

export default function LiveFlightStatus() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [trackedFlightIds, setTrackedFlightIds] = useState(() => loadTrackedFlightIds());
  const [trackingFlightIds, setTrackingFlightIds] = useState([]);
  const [notifications, setNotifications] = useState(() => loadFlightAlerts());

  useEffect(() => {
    async function loadFlightStatuses() {
      try {
        const response = await getFlights();
        setFlights(response.flights || []);
      } catch (error) {
        setMessage('Unable to load live flight statuses.');
      } finally {
        setLoading(false);
      }
    }
    loadFlightStatuses();
  }, []);

  useEffect(() => { saveTrackedFlightIds(trackedFlightIds); }, [trackedFlightIds]);
  useEffect(() => { saveFlightAlerts(notifications); }, [notifications]);

  const sortedFlights = useMemo(
    () => [...flights].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)),
    [flights]
  );

  const trackedFlights = useMemo(
    () => sortedFlights.filter(f => trackedFlightIds.includes(f.id)),
    [sortedFlights, trackedFlightIds]
  );

  const untrackedFlights = useMemo(
    () => sortedFlights.filter(f => !trackedFlightIds.includes(f.id)),
    [sortedFlights, trackedFlightIds]
  );

  function isFlightLoading(flightId) {
    return trackingFlightIds.includes(flightId);
  }

  function updateFlightStatus(flightId, latestStatus) {
    setFlights(current =>
      current.map(f =>
        f.id === flightId
          ? { ...f, currentStatus: latestStatus.status, delayReason: latestStatus.delayReason, revisedDepartureTime: latestStatus.revisedDepartureTime, estimatedArrival: latestStatus.estimatedArrival, statusUpdatedAt: latestStatus.updatedAt }
          : f
      )
    );
  }

  function addNotifications(items) {
    if (items.length === 0) return;
    setNotifications(current => [...items, ...current].slice(0, 8));
  }

  function createNotificationsForFlight(previousFlight, latestStatus, wasTracked) {
    const items = [];
    const previousStatus = previousFlight?.currentStatus;
    const previousRevised = previousFlight?.revisedDepartureTime || previousFlight?.departureTime || null;
    const nextRevised = latestStatus.revisedDepartureTime || latestStatus.departureTime || null;

    if (latestStatus.status === 'Delayed by 1h' && (!wasTracked || !previousStatus || previousStatus !== 'Delayed by 1h')) {
      items.push({ id: `delayed-${latestStatus.flightId}-${Date.now()}`, type: 'delayed', title: `Flight ${latestStatus.flightId} delayed`, description: latestStatus.delayReason || 'This flight has been delayed by 1 hour.', timestamp: new Date().toISOString() });
    }
    if (latestStatus.status === 'Boarding' && (!wasTracked || !previousStatus || previousStatus !== 'Boarding')) {
      items.push({ id: `boarding-${latestStatus.flightId}-${Date.now() + 1}`, type: 'boarding', title: `Flight ${latestStatus.flightId} is boarding`, description: 'Boarding has started. Please proceed to the gate if you are travelling.', timestamp: new Date().toISOString() });
    }
    if (nextRevised && ((!wasTracked && latestStatus.departureTime && nextRevised !== latestStatus.departureTime) || (previousRevised && nextRevised !== previousRevised))) {
      items.push({ id: `schedule-${latestStatus.flightId}-${Date.now() + 2}`, type: 'schedule', title: `Flight ${latestStatus.flightId} schedule changed`, description: `Revised departure updated to ${formatDateTime(nextRevised)}.`, timestamp: new Date().toISOString() });
    }
    return items;
  }

  async function handleTrackFlight(flightId) {
    setTrackingFlightIds(current => [...current, flightId]);
    setTrackingMessage('');
    try {
      const previousFlight = flights.find(f => f.id === flightId);
      const wasTracked = trackedFlightIds.includes(flightId);
      const response = await getFlightStatus(flightId);
      const latestStatus = response.flightStatus;
      updateFlightStatus(flightId, latestStatus);
      setTrackedFlightIds(current => current.includes(flightId) ? current : [...current, flightId]);
      addNotifications(createNotificationsForFlight(previousFlight, latestStatus, wasTracked));
      setTrackingMessage(`Flight ${flightId} status refreshed successfully.`);
    } catch {
      setTrackingMessage(`Unable to track flight ${flightId} right now.`);
    } finally {
      setTrackingFlightIds(current => current.filter(id => id !== flightId));
    }
  }

  function handleUntrackFlight(flightId) {
    setTrackedFlightIds(current => current.filter(id => id !== flightId));
    setTrackingMessage(`Flight ${flightId} removed from tracked flights.`);
  }

  function handleDismissNotification(notificationId) {
    setNotifications(current => current.filter(n => n.id !== notificationId));
  }

  function renderFlightCard(flight, idx, actionButton) {
    const [from, to] = AIRLINE_COLORS[idx % AIRLINE_COLORS.length];
    return (
      <div key={flight.id} className="live-status-card">
        <div className="live-status-header-bar" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
          <div className="live-status-header-info">
            <p className="live-status-airline">{flight.airline}</p>
            <p className="live-status-route">{flight.origin} ✈ {flight.destination}</p>
          </div>
          <span className={getStatusBadgeClass(flight.currentStatus)}>
            {flight.currentStatus || 'Status unavailable'}
          </span>
        </div>
        <div className="live-status-body">
          <div className="live-status-grid">
            <div className="status-detail">
              <span className="status-label">⏱ Delay Reason</span>
              <span className="status-value">{flight.delayReason || 'No delay reported.'}</span>
            </div>
            <div className="status-detail">
              <span className="status-label">🔄 Revised Departure</span>
              <span className="status-value">{formatDateTime(flight.revisedDepartureTime || flight.departureTime)}</span>
            </div>
            <div className="status-detail">
              <span className="status-label">📍 Estimated Arrival</span>
              <span className="status-value">{formatDateTime(flight.estimatedArrival || flight.arrivalTime)}</span>
            </div>
            <div className="status-detail">
              <span className="status-label">📅 Scheduled Departure</span>
              <span className="status-value">{formatDateTime(flight.departureTime)}</span>
            </div>
          </div>
          <div className="live-status-actions">{actionButton}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h2 className="section-title">📡 Live Flight Status</h2>
      <p className="text-muted" style={{ marginBottom: '24px' }}>
        Monitor real-time flight status, delay reasons, and boarding alerts.
      </p>

      {message && <div className="alert alert-error"><span>⚠️</span> {message}</div>}
      {trackingMessage && <div className="alert alert-success"><span>✅</span> {trackingMessage}</div>}

      {/* ── Notification Alerts ── */}
      <section className="flight-alerts-section">
        <div className="live-status-section-header">
          <div className="live-status-section-title-group">
            <h3 className="live-status-section-title">🔔 Notification Alerts</h3>
            <p className="live-status-section-desc">Alerts for delays, boarding, and schedule changes on tracked flights.</p>
          </div>
          <span className="live-status-count">{notifications.length}</span>
        </div>
        <div className="flight-alerts-list">
          {notifications.length === 0 ? (
            <div className="flight-alerts-empty">No alerts yet. Track a flight and refresh it to receive notifications.</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`flight-alert flight-alert-${n.type}`}>
                <span className="flight-alert-icon">{getAlertIcon(n.type)}</span>
                <div className="flight-alert-copy">
                  <strong>{n.title}</strong>
                  <p>{n.description}</p>
                  <span className="flight-alert-time">{formatDateTime(n.timestamp)}</span>
                </div>
                <button type="button" className="button button-ghost button-sm" onClick={() => handleDismissNotification(n.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Flight List ── */}
      {loading ? (
        <div className="live-status-loading">Loading live flight statuses...</div>
      ) : sortedFlights.length === 0 ? (
        <div className="live-status-loading">No flight statuses available right now.</div>
      ) : (
        <div className="live-status-sections">
          {/* Tracked Flights */}
          <section className="live-status-section">
            <div className="live-status-section-header">
              <div className="live-status-section-title-group">
                <h3 className="live-status-section-title">📌 Tracked Flights</h3>
                <p className="live-status-section-desc">Flights you are actively monitoring.</p>
              </div>
              <span className="live-status-count">{trackedFlights.length}</span>
            </div>
            <div className="live-status-grid-list">
              {trackedFlights.length === 0 ? (
                <div className="live-status-card-empty">No tracked flights yet. Track flights from the section below.</div>
              ) : (
                trackedFlights.map((flight, i) =>
                  renderFlightCard(flight, i,
                    <div className="live-status-btn-group">
                      <button type="button" className="button button-primary button-sm" onClick={() => handleTrackFlight(flight.id)} disabled={isFlightLoading(flight.id)}>
                        {isFlightLoading(flight.id) ? '⟳ Refreshing…' : '⟳ Refresh'}
                      </button>
                      <button type="button" className="button button-outline button-sm" onClick={() => handleUntrackFlight(flight.id)} disabled={isFlightLoading(flight.id)}>
                        Untrack
                      </button>
                    </div>
                  )
                )
              )}
            </div>
          </section>

          {/* Available Flights */}
          <section className="live-status-section">
            <div className="live-status-section-header">
              <div className="live-status-section-title-group">
                <h3 className="live-status-section-title">✈️ Available Flights</h3>
                <p className="live-status-section-desc">Track flights to get live status updates and alerts.</p>
              </div>
              <span className="live-status-count">{untrackedFlights.length}</span>
            </div>
            <div className="live-status-grid-list">
              {untrackedFlights.length === 0 ? (
                <div className="live-status-card-empty">All available flights are currently being tracked.</div>
              ) : (
                untrackedFlights.map((flight, i) =>
                  renderFlightCard(flight, i,
                    <button type="button" className="button button-primary button-sm" onClick={() => handleTrackFlight(flight.id)} disabled={isFlightLoading(flight.id)}>
                      {isFlightLoading(flight.id) ? '⟳ Tracking…' : '🔍 Track'}
                    </button>
                  )
                )
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
