import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFlights } from '../services/api.js';
import { loadFlightAlerts, loadTrackedFlightIds } from '../services/liveFlightTracking.js';
import RecommendationSection from '../components/RecommendationSection.jsx';

function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
}

function getStatusBadgeClass(status) {
  if (status === 'Delayed by 1h') return 'status-badge status-badge-delayed';
  if (status === 'Boarding')      return 'status-badge status-badge-boarding';
  return 'status-badge status-badge-on-time';
}

const STATS = [
  { icon: '📋', value: '42',   label: 'Total Bookings',    change: '+8 this month',  color: 'blue'  },
  { icon: '🏨', value: '18',   label: 'Hotel Stays',       change: '+3 this month',  color: 'green' },
  { icon: '✈️', value: '24',   label: 'Flights Booked',    change: '+5 this month',  color: 'blue'  },
  { icon: '⭐', value: '4.8',  label: 'Avg. Rating Given', change: 'Last 10 reviews', color: 'gold' },
];

const MOCK_TRACKED = [
  {
    id: 9991, airline: 'Delta Airlines', origin: 'JFK', destination: 'LAX',
    departureTime: new Date(Date.now() + 2 * 3600000).toISOString(),
    revisedDepartureTime: null,
    arrivalTime: new Date(Date.now() + 7 * 3600000).toISOString(),
    estimatedArrivalTime: new Date(Date.now() + 7 * 3600000).toISOString(),
    currentStatus: 'Boarding', delayReason: null,
  },
  {
    id: 9992, airline: 'American Airlines', origin: 'SFO', destination: 'ORD',
    departureTime: new Date(Date.now() + 5 * 3600000).toISOString(),
    revisedDepartureTime: null,
    arrivalTime: new Date(Date.now() + 10 * 3600000).toISOString(),
    estimatedArrivalTime: new Date(Date.now() + 10 * 3600000).toISOString(),
    currentStatus: 'On Time', delayReason: null,
  },
  {
    id: 9993, airline: 'United Airlines', origin: 'ORD', destination: 'MIA',
    departureTime: new Date(Date.now() - 1 * 3600000).toISOString(),
    revisedDepartureTime: new Date(Date.now() + 2 * 3600000).toISOString(),
    arrivalTime: new Date(Date.now() + 4 * 3600000).toISOString(),
    estimatedArrivalTime: new Date(Date.now() + 7 * 3600000).toISOString(),
    currentStatus: 'Delayed by 1h', delayReason: 'Weather conditions at ORD',
  },
];

const MOCK_ALERTS = [
  { id: 'a1', title: '🛫 Boarding Reminder', description: 'Delta Airlines DL402 from JFK to LAX is now boarding at Gate B12.', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 'a2', title: '⏰ Schedule Change', description: 'United Airlines UA891 from ORD to MIA departure revised to 3:45 PM.', timestamp: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 'a3', title: '🌤️ Weather Advisory', description: 'Light fog expected at SFO this evening; allow extra travel time.', timestamp: new Date(Date.now() - 120 * 60000).toISOString() },
];

export default function Dashboard() {
  const [trackedFlights, setTrackedFlights] = useState([]);
  const [alerts, setAlerts] = useState(() => {
    const stored = loadFlightAlerts();
    return stored.length > 0 ? stored : MOCK_ALERTS;
  });
  const [loadingTrackedFlights, setLoadingTrackedFlights] = useState(true);

  const recentAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);

  useEffect(() => {
    async function load() {
      const ids = loadTrackedFlightIds();
      try {
        if (ids.length > 0) {
          const res = await getFlights();
          const apiFlights = (res.flights || []).filter(f => ids.includes(f.id));
          if (apiFlights.length > 0) {
            setTrackedFlights(apiFlights);
          } else {
            setTrackedFlights(MOCK_TRACKED);
          }
          const storedAlerts = loadFlightAlerts();
          if (storedAlerts.length > 0) setAlerts(storedAlerts);
        } else {
          setTrackedFlights(MOCK_TRACKED);
        }
      } catch {
        setTrackedFlights(MOCK_TRACKED);
      } finally {
        setLoadingTrackedFlights(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page-card">
      <h2 className="section-title">Dashboard</h2>
      <p className="section-subtitle">Your travel overview at a glance.</p>

      <div className="grid-list stat-grid stats-section">
        {STATS.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <span className="stat-card-icon">{s.icon}</span>
            <span className="stat-card-value">{s.value}</span>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-change">{s.change}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-layout-grid">
        <RecommendationSection />

        <div className="card dashboard-widget">
          <div className="dashboard-widget-header">
            <div>
              <h3 className="dashboard-widget-heading">✈️ Live Flight Status</h3>
              <p className="text-muted dashboard-widget-subtitle">Your tracked flights and recent alerts.</p>
            </div>
            <Link to="/live-flight-status" className="button button-outline button-sm">
              Open Tracker →
            </Link>
          </div>

          <div className="dashboard-flight-list">
            {trackedFlights.map(flight => (
              <div key={flight.id} className="dashboard-flight-item">
                <div className="dashboard-flight-item-header">
                  <div>
                    <p className="dashboard-flight-name">{flight.airline}</p>
                    <p className="text-muted dashboard-flight-route">
                      {flight.origin} → {flight.destination}
                    </p>
                  </div>
                  <span className={getStatusBadgeClass(flight.currentStatus)}>
                    {flight.currentStatus || 'Unknown'}
                  </span>
                </div>
                <div className="tracked-flight-details">
                  <div>
                    <p className="tracked-flight-status">Revised Departure</p>
                    <p className="tracked-flight-value">{formatDateTime(flight.revisedDepartureTime || flight.departureTime)}</p>
                  </div>
                  <div>
                    <p className="tracked-flight-status">Estimated Arrival</p>
                    <p className="tracked-flight-value">{formatDateTime(flight.estimatedArrivalTime || flight.arrivalTime)}</p>
                  </div>
                  {flight.delayReason && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className="tracked-flight-status">Delay Reason</p>
                      <p className="tracked-flight-value">{flight.delayReason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="alert-section">
            <h4 className="alert-section-title">🔔 Recent Alerts</h4>
            <div className="dashboard-alert-list">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="dashboard-alert-item">
                  <p className="alert-card-title">{alert.title}</p>
                  <p className="alert-card-text">{alert.description}</p>
                  <span className="flight-alert-time">{formatDateTime(alert.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
