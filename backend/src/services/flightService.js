export const fallbackFlights = [
  {
    id: 1,
    airline: 'United Airlines',
    origin: 'New York',
    destination: 'Miami',
    departureTime: '2026-06-20T08:00:00',
    arrivalTime: '2026-06-20T11:00:00',
    price: 150.0,
    seatsAvailable: 100,
  },
  {
    id: 2,
    airline: 'American Airlines',
    origin: 'Los Angeles',
    destination: 'Denver',
    departureTime: '2026-06-21T10:00:00',
    arrivalTime: '2026-06-21T12:30:00',
    price: 120.0,
    seatsAvailable: 80,
  },
  {
    id: 3,
    airline: 'Delta Airlines',
    origin: 'Chicago',
    destination: 'New York',
    departureTime: '2026-06-20T14:00:00',
    arrivalTime: '2026-06-20T17:00:00',
    price: 180.0,
    seatsAvailable: 120,
  },
  {
    id: 4,
    airline: 'Southwest Airlines',
    origin: 'Las Vegas',
    destination: 'Hawaii',
    departureTime: '2026-06-22T06:00:00',
    arrivalTime: '2026-06-22T10:00:00',
    price: 200.0,
    seatsAvailable: 150,
  },
  {
    id: 5,
    airline: 'JetBlue Airways',
    origin: 'Boston',
    destination: 'Fort Lauderdale',
    departureTime: '2026-06-19T09:00:00',
    arrivalTime: '2026-06-19T13:00:00',
    price: 110.0,
    seatsAvailable: 90,
  },
];

export const mockStatusTemplates = [
  {
    status: 'On Time',
    delayReason: 'No delay reported.',
    departureDelayHours: 0,
    arrivalDelayHours: 0,
  },
  {
    status: 'Boarding',
    delayReason: 'Boarding in progress at the assigned gate.',
    departureDelayHours: 0,
    arrivalDelayHours: 0,
  },
  {
    status: 'Delayed by 1h',
    delayReason: 'Late arrival of the incoming aircraft.',
    departureDelayHours: 1,
    arrivalDelayHours: 1,
  },
];

function shiftIsoTime(dateTime, hoursToAdd) {
  const date = new Date(dateTime);
  date.setHours(date.getHours() + hoursToAdd);
  return date.toISOString();
}

function toIsoString(dateTime) {
  return new Date(dateTime).toISOString();
}

function getStatusTemplate(flightId) {
  const normalizedId = Number(flightId);
  return mockStatusTemplates[(normalizedId - 1) % mockStatusTemplates.length];
}

export function normalizeFlightStatusRow(row) {
  if (!row) {
    return null;
  }

  return {
    flightId: Number(row.flightId ?? row.flight_id ?? row.id),
    airline: row.airline,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    delayReason: row.delayReason ?? row.delay_reason ?? 'No delay reported.',
    departureTime: toIsoString(row.departureTime ?? row.departure_time),
    arrivalTime: toIsoString(row.arrivalTime ?? row.arrival_time),
    revisedDepartureTime: toIsoString(
      row.revisedDepartureTime ?? row.revised_departure_time ?? row.departureTime ?? row.departure_time
    ),
    estimatedArrival: toIsoString(
      row.estimatedArrival ?? row.estimated_arrival ?? row.arrivalTime ?? row.arrival_time
    ),
    updatedAt: row.updatedAt ?? row.updated_at
      ? toIsoString(row.updatedAt ?? row.updated_at)
      : new Date().toISOString(),
  };
}

export function attachStatusToFlight(flight, statusRow) {
  if (!flight) {
    return null;
  }

  return {
    ...flight,
    currentStatus: statusRow?.status ?? null,
    delayReason: statusRow?.delayReason ?? null,
    revisedDepartureTime: statusRow?.revisedDepartureTime ?? null,
    estimatedArrival: statusRow?.estimatedArrival ?? null,
    statusUpdatedAt: statusRow?.updatedAt ?? null,
  };
}

export async function getAvailableFlights() {
  return fallbackFlights;
}

export async function getFlightById(id) {
  return fallbackFlights.find((flight) => flight.id === Number(id)) || null;
}

export async function getLiveFlightStatus(flight) {
  if (!flight) {
    return null;
  }

  const template = getStatusTemplate(flight.id);
  return normalizeFlightStatusRow({
    flightId: flight.id,
    airline: flight.airline,
    origin: flight.origin,
    destination: flight.destination,
    status: template.status,
    delayReason: template.delayReason,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    revisedDepartureTime: shiftIsoTime(
      flight.departureTime,
      template.departureDelayHours
    ),
    estimatedArrival: shiftIsoTime(
      flight.arrivalTime,
      template.arrivalDelayHours
    ),
    updatedAt: new Date().toISOString(),
  });
}
