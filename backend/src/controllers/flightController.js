import pool from '../config/db.js';
import {
  attachStatusToFlight,
  fallbackFlights,
  getFlightById,
  getLiveFlightStatus,
  normalizeFlightStatusRow,
} from '../services/flightService.js';

export async function listFlights(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.airline, f.origin, f.destination,
              f.departure_time AS departureTime, f.arrival_time AS arrivalTime,
              f.price, f.seats_available AS seatsAvailable,
              fs.status AS currentStatus, fs.delay_reason AS delayReason,
              fs.revised_departure_time AS revisedDepartureTime,
              fs.estimated_arrival AS estimatedArrival,
              fs.updated_at AS statusUpdatedAt
       FROM flights f
       LEFT JOIN flight_status fs ON fs.flight_id = f.id`
    );
    return res.json({ flights: rows });
  } catch (err) {
    console.warn('Using fallback flights (DB unavailable)');
    const flights = await Promise.all(
      fallbackFlights.map(async (flight) =>
        attachStatusToFlight(flight, await getLiveFlightStatus(flight))
      )
    );
    return res.json({ flights });
  }
}

export async function getFlight(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.airline, f.origin, f.destination,
              f.departure_time AS departureTime, f.arrival_time AS arrivalTime,
              f.price, f.seats_available AS seatsAvailable,
              fs.status AS currentStatus, fs.delay_reason AS delayReason,
              fs.revised_departure_time AS revisedDepartureTime,
              fs.estimated_arrival AS estimatedArrival,
              fs.updated_at AS statusUpdatedAt
       FROM flights f
       LEFT JOIN flight_status fs ON fs.flight_id = f.id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Flight not found.' });
    }
    return res.json({ flight: rows[0] });
  } catch (err) {
    console.warn('Using fallback flight (DB unavailable)');
    const flight = fallbackFlights.find(f => f.id === Number(req.params.id));
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found.' });
    }
    const flightStatus = await getLiveFlightStatus(flight);
    return res.json({ flight: attachStatusToFlight(flight, flightStatus) });
  }
}

export async function getFlightStatus(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT f.id AS flightId, f.airline, f.origin, f.destination,
              f.departure_time AS departureTime, f.arrival_time AS arrivalTime,
              fs.status, fs.delay_reason AS delayReason,
              fs.revised_departure_time AS revisedDepartureTime,
              fs.estimated_arrival AS estimatedArrival,
              fs.updated_at AS updatedAt
       FROM flights f
       LEFT JOIN flight_status fs ON fs.flight_id = f.id
       WHERE f.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Flight not found.' });
    }

    const flightStatus = rows[0].status
      ? normalizeFlightStatusRow(rows[0])
      : await getLiveFlightStatus(rows[0]);
    return res.json({ flightStatus });
  } catch (err) {
    console.warn('Using fallback live flight status (DB unavailable)');
    const flight = await getFlightById(req.params.id);
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found.' });
    }

    const flightStatus = await getLiveFlightStatus(flight);
    return res.json({ flightStatus });
  }
}
