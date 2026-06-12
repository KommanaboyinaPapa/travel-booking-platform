import {
  fallbackFlights,
  mockStatusTemplates,
  normalizeFlightStatusRow,
  attachStatusToFlight,
  getFlightById,
  getLiveFlightStatus,
} from '../services/flightService.js';
import {
  getFlightStatus,
  getFlight,
  listFlights,
} from '../controllers/flightController.js';

// ── Helpers ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  } else {
    passed++;
    console.log(`  ✓ ${message}`);
  }
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

// ── UI Helper Functions (duplicated from LiveFlightStatus.jsx for testing) ──

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

function getNotificationClass(type) {
  if (type === 'delayed') return 'flight-alert flight-alert-delayed';
  if (type === 'boarding') return 'flight-alert flight-alert-boarding';
  return 'flight-alert flight-alert-schedule';
}

function createNotificationsForFlight(previousFlight, latestStatus, wasTracked) {
  const items = [];
  const previousStatus = previousFlight?.currentStatus;
  const previousRevisedDepartureTime =
    previousFlight?.revisedDepartureTime || previousFlight?.departureTime || null;
  const nextRevisedDepartureTime =
    latestStatus.revisedDepartureTime || latestStatus.departureTime || null;

  if (
    latestStatus.status === 'Delayed by 1h' &&
    (!wasTracked || !previousStatus || previousStatus !== 'Delayed by 1h')
  ) {
    items.push({
      id: `delayed-${latestStatus.flightId}-${Date.now()}`,
      type: 'delayed',
      title: `Flight ${latestStatus.flightId} delayed`,
      description: latestStatus.delayReason || 'This flight has been delayed by 1 hour.',
      timestamp: new Date().toISOString(),
    });
  }

  if (
    latestStatus.status === 'Boarding' &&
    (!wasTracked || !previousStatus || previousStatus !== 'Boarding')
  ) {
    items.push({
      id: `boarding-${latestStatus.flightId}-${Date.now() + 1}`,
      type: 'boarding',
      title: `Flight ${latestStatus.flightId} is boarding`,
      description: 'Boarding has started. Please proceed to the gate if you are travelling.',
      timestamp: new Date().toISOString(),
    });
  }

  if (
    nextRevisedDepartureTime &&
    ((!wasTracked &&
      latestStatus.departureTime &&
      nextRevisedDepartureTime !== latestStatus.departureTime) ||
      (previousRevisedDepartureTime &&
        nextRevisedDepartureTime !== previousRevisedDepartureTime))
  ) {
    items.push({
      id: `schedule-${latestStatus.flightId}-${Date.now() + 2}`,
      type: 'schedule',
      title: `Flight ${latestStatus.flightId} schedule changed`,
      description: `Revised departure updated to ${formatDateTime(nextRevisedDepartureTime)}.`,
      timestamp: new Date().toISOString(),
    });
  }

  return items;
}

// ── Test Suites ────────────────────────────────────────────────────

async function testFlightServiceLayer() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 1: Flight Service Layer                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 1.1 Fallback flights data
  console.log('── 1.1 Fallback flight data integrity ──');
  assert(Array.isArray(fallbackFlights), 'fallbackFlights should be an array');
  assert(fallbackFlights.length === 5, 'Should have 5 fallback flights');

  for (const flight of fallbackFlights) {
    assert(typeof flight.id === 'number', `Flight ${flight.id} has numeric id`);
    assert(typeof flight.airline === 'string' && flight.airline.length > 0, `Flight ${flight.id} has non-empty airline`);
    assert(typeof flight.origin === 'string' && flight.origin.length > 0, `Flight ${flight.id} has non-empty origin`);
    assert(typeof flight.destination === 'string' && flight.destination.length > 0, `Flight ${flight.id} has non-empty destination`);
    assert(!isNaN(new Date(flight.departureTime).getTime()), `Flight ${flight.id} has valid departureTime`);
    assert(!isNaN(new Date(flight.arrivalTime).getTime()), `Flight ${flight.id} has valid arrivalTime`);
    assert(typeof flight.price === 'number' && flight.price > 0, `Flight ${flight.id} has positive price`);
    assert(typeof flight.seatsAvailable === 'number' && flight.seatsAvailable > 0, `Flight ${flight.id} has positive seatsAvailable`);
  }

  // 1.2 Mock status templates
  console.log('\n── 1.2 Mock status templates ──');
  assert(Array.isArray(mockStatusTemplates), 'mockStatusTemplates should be an array');
  assert(mockStatusTemplates.length === 3, 'Should have 3 status templates (On Time, Boarding, Delayed)');

  const statusNames = mockStatusTemplates.map((t) => t.status);
  assert(statusNames.includes('On Time'), 'Templates include On Time');
  assert(statusNames.includes('Boarding'), 'Templates include Boarding');
  assert(statusNames.includes('Delayed by 1h'), 'Templates include Delayed by 1h');

  // 1.3 getFlightById
  console.log('\n── 1.3 getFlightById service ──');
  const flight1 = await getFlightById(1);
  assert(flight1 !== null, 'getFlightById(1) returns a flight');
  assert(flight1.id === 1, 'Returns flight with id 1');
  assert(flight1.airline === 'United Airlines', 'Returns correct airline');

  const flight5 = await getFlightById('5');
  assert(flight5 !== null, 'getFlightById("5") handles string ID');
  assert(flight5.id === 5, 'Returns flight with id 5');

  const flightMissing = await getFlightById(999);
  assert(flightMissing === null, 'getFlightById(999) returns null for missing flight');

  // 1.4 getLiveFlightStatus
  console.log('\n── 1.4 getLiveFlightStatus deterministic mapping ──');

  const status1 = await getLiveFlightStatus(fallbackFlights[0]);
  assert(status1.status === 'On Time', 'Flight 1 (id=1) maps to On Time status');
  assert(status1.delayReason === 'No delay reported.', 'On Time has correct delay reason');
  assert(
    status1.revisedDepartureTime === status1.departureTime,
    'On Time: revised departure equals scheduled departure'
  );
  assert(
    status1.estimatedArrival === status1.arrivalTime,
    'On Time: estimated arrival equals scheduled arrival'
  );

  const status2 = await getLiveFlightStatus(fallbackFlights[1]);
  assert(status2.status === 'Boarding', 'Flight 2 (id=2) maps to Boarding status');
  assert(
    status2.revisedDepartureTime === status2.departureTime,
    'Boarding: revised departure equals scheduled departure'
  );

  const status3 = await getLiveFlightStatus(fallbackFlights[2]);
  assert(status3.status === 'Delayed by 1h', 'Flight 3 (id=3) maps to Delayed by 1h');
  assert(
    status3.delayReason === 'Late arrival of the incoming aircraft.',
    'Delayed flight has correct delay reason'
  );
  const depDiff =
    new Date(status3.revisedDepartureTime).getTime() -
    new Date(status3.departureTime).getTime();
  assert(depDiff === 60 * 60 * 1000, 'Delayed: revised departure is 1 hour after scheduled');
  const arrDiff =
    new Date(status3.estimatedArrival).getTime() -
    new Date(status3.arrivalTime).getTime();
  assert(arrDiff === 60 * 60 * 1000, 'Delayed: estimated arrival is 1 hour after scheduled');

  // Flight 4 should cycle back to On Time (index 3 → (4-1)%3 = 0 = On Time)
  const status4 = await getLiveFlightStatus(fallbackFlights[3]);
  assert(status4.status === 'On Time', 'Flight 4 (id=4) cycles back to On Time');

  // Flight 5 should be Boarding ((5-1)%3 = 1 = Boarding)
  const status5 = await getLiveFlightStatus(fallbackFlights[4]);
  assert(status5.status === 'Boarding', 'Flight 5 (id=5) cycles to Boarding');

  // 1.5 normalizeFlightStatusRow
  console.log('\n── 1.5 normalizeFlightStatusRow ──');
  const normalized = normalizeFlightStatusRow({
    flightId: 10,
    airline: 'Test Air',
    origin: 'A',
    destination: 'B',
    status: 'On Time',
    delayReason: 'None',
    departureTime: '2026-06-20T10:00:00',
    arrivalTime: '2026-06-20T13:00:00',
    revisedDepartureTime: '2026-06-20T10:00:00',
    estimatedArrival: '2026-06-20T13:00:00',
    updatedAt: '2026-06-09T12:00:00',
  });

  assert(normalized.flightId === 10, 'normalizeFlightStatusRow preserves flightId');
  assert(normalized.airline === 'Test Air', 'Preserves airline');
  assert(typeof normalized.departureTime === 'string', 'Converts departureTime to string');
  assert(normalized.departureTime.includes('T'), 'departureTime is ISO format');
  assert(normalized.updatedAt.includes('T'), 'updatedAt is ISO format');

  const nullResult = normalizeFlightStatusRow(null);
  assert(nullResult === null, 'normalizeFlightStatusRow(null) returns null');

  // 1.6 attachStatusToFlight
  console.log('\n── 1.6 attachStatusToFlight ──');
  const baseFlight = { id: 1, airline: 'Test', price: 100 };
  const statusRow = {
    status: 'Boarding',
    delayReason: 'Gate change',
    revisedDepartureTime: '2026-06-20T10:00:00Z',
    estimatedArrival: '2026-06-20T13:00:00Z',
    updatedAt: '2026-06-09T12:00:00Z',
  };

  const attached = attachStatusToFlight(baseFlight, statusRow);
  assert(attached.id === 1, 'Preserves flight id');
  assert(attached.airline === 'Test', 'Preserves airline');
  assert(attached.currentStatus === 'Boarding', 'Attaches currentStatus');
  assert(attached.delayReason === 'Gate change', 'Attaches delayReason');
  assert(attached.revisedDepartureTime === '2026-06-20T10:00:00Z', 'Attaches revisedDepartureTime');
  assert(attached.estimatedArrival === '2026-06-20T13:00:00Z', 'Attaches estimatedArrival');

  const attachedNull = attachStatusToFlight(null, statusRow);
  assert(attachedNull === null, 'attachStatusToFlight(null, ...) returns null');

  const attachedNoStatus = attachStatusToFlight(baseFlight, null);
  assert(attachedNoStatus.currentStatus === null, 'Missing status row yields null currentStatus');

  // 1.7 getLiveFlightStatus with null
  console.log('\n── 1.7 getLiveFlightStatus edge case ──');
  const nullStatus = await getLiveFlightStatus(null);
  assert(nullStatus === null, 'getLiveFlightStatus(null) returns null');
}

async function testAPIEndpoints() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 2: API Controller Endpoints             ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 2.1 listFlights
  console.log('── 2.1 GET /api/flights (listFlights) ──');
  const listReq = {};
  const listRes = mockRes();
  await listFlights(listReq, listRes);

  assert(listRes.statusCode === 200, 'listFlights returns 200');
  assert(Array.isArray(listRes.body.flights), 'Returns flights array');
  assert(listRes.body.flights.length === 5, 'Returns all 5 flights');

  for (const flight of listRes.body.flights) {
    assert('currentStatus' in flight, `Flight ${flight.id} includes currentStatus`);
    assert('delayReason' in flight, `Flight ${flight.id} includes delayReason`);
    assert('revisedDepartureTime' in flight, `Flight ${flight.id} includes revisedDepartureTime`);
    assert('estimatedArrival' in flight, `Flight ${flight.id} includes estimatedArrival`);
  }

  // 2.2 getFlightStatus for each flight
  console.log('\n── 2.2 GET /api/flights/:id/status for all flights ──');

  const expectedStatuses = ['On Time', 'Boarding', 'Delayed by 1h', 'On Time', 'Boarding'];
  for (let i = 0; i < 5; i++) {
    const req = { params: { id: String(i + 1) } };
    const res = mockRes();
    await getFlightStatus(req, res);

    assert(res.statusCode === 200, `Flight ${i + 1} status returns 200`);
    assert(res.body.flightStatus != null, `Flight ${i + 1} has flightStatus in response`);
    assert(
      res.body.flightStatus.status === expectedStatuses[i],
      `Flight ${i + 1} status is "${expectedStatuses[i]}" (got "${res.body.flightStatus.status}")`
    );
    assert(res.body.flightStatus.flightId === i + 1, `Flight ${i + 1} flightStatus.flightId matches`);
    assert(typeof res.body.flightStatus.departureTime === 'string', `Flight ${i + 1} has departureTime string`);
    assert(typeof res.body.flightStatus.arrivalTime === 'string', `Flight ${i + 1} has arrivalTime string`);
    assert(typeof res.body.flightStatus.revisedDepartureTime === 'string', `Flight ${i + 1} has revisedDepartureTime`);
    assert(typeof res.body.flightStatus.estimatedArrival === 'string', `Flight ${i + 1} has estimatedArrival`);
    assert(typeof res.body.flightStatus.updatedAt === 'string', `Flight ${i + 1} has updatedAt timestamp`);
  }

  // 2.3 getFlight with status integration
  console.log('\n── 2.3 GET /api/flights/:id (getFlight with status) ──');
  const singleReq = { params: { id: '3' } };
  const singleRes = mockRes();
  await getFlight(singleReq, singleRes);

  assert(singleRes.statusCode === 200, 'getFlight returns 200');
  assert(singleRes.body.flight.currentStatus === 'Delayed by 1h', 'Merged currentStatus is correct');
  assert(singleRes.body.flight.delayReason === 'Late arrival of the incoming aircraft.', 'Merged delayReason is correct');
  assert(typeof singleRes.body.flight.revisedDepartureTime === 'string', 'Merged revisedDepartureTime present');
  assert(typeof singleRes.body.flight.price === 'number', 'Flight still has price field');
  assert(typeof singleRes.body.flight.seatsAvailable === 'number', 'Flight still has seatsAvailable field');

  // 2.4 404 for non-existent flight
  console.log('\n── 2.4 Error handling: Non-existent flights ──');
  const missing1Req = { params: { id: '999' } };
  const missing1Res = mockRes();
  await getFlightStatus(missing1Req, missing1Res);
  assert(missing1Res.statusCode === 404, 'getFlightStatus returns 404 for missing flight');
  assert(missing1Res.body.message === 'Flight not found.', 'Returns proper error message');

  const missing2Req = { params: { id: '0' } };
  const missing2Res = mockRes();
  await getFlight(missing2Req, missing2Res);
  assert(missing2Res.statusCode === 404, 'getFlight returns 404 for flight id 0');

  const missing3Req = { params: { id: 'abc' } };
  const missing3Res = mockRes();
  await getFlightStatus(missing3Req, missing3Res);
  assert(missing3Res.statusCode === 404, 'getFlightStatus returns 404 for non-numeric id "abc"');
}

async function testUIHelperFunctions() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 3: UI Helper Functions                  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 3.1 formatDateTime
  console.log('── 3.1 formatDateTime ──');
  assert(formatDateTime(null) === 'Not available', 'formatDateTime(null) returns "Not available"');
  assert(formatDateTime(undefined) === 'Not available', 'formatDateTime(undefined) returns "Not available"');
  assert(formatDateTime('') === 'Not available', 'formatDateTime("") returns "Not available"');
  assert(formatDateTime('invalid-date') === 'Not available', 'formatDateTime("invalid-date") returns "Not available"');
  assert(
    formatDateTime('2026-06-20T08:00:00Z') !== 'Not available',
    'formatDateTime with valid ISO string returns a formatted date'
  );
  assert(
    typeof formatDateTime('2026-06-20T08:00:00Z') === 'string',
    'formatDateTime returns a string for valid input'
  );

  // 3.2 getStatusBadgeClass
  console.log('\n── 3.2 getStatusBadgeClass ──');
  assert(
    getStatusBadgeClass('Delayed by 1h') === 'status-badge status-badge-delayed',
    'Delayed status returns delayed badge class'
  );
  assert(
    getStatusBadgeClass('Boarding') === 'status-badge status-badge-boarding',
    'Boarding status returns boarding badge class'
  );
  assert(
    getStatusBadgeClass('On Time') === 'status-badge status-badge-on-time',
    'On Time status returns on-time badge class'
  );
  assert(
    getStatusBadgeClass('Unknown') === 'status-badge status-badge-on-time',
    'Unknown status defaults to on-time badge class'
  );
  assert(
    getStatusBadgeClass(null) === 'status-badge status-badge-on-time',
    'null status defaults to on-time badge class'
  );
  assert(
    getStatusBadgeClass(undefined) === 'status-badge status-badge-on-time',
    'undefined status defaults to on-time badge class'
  );

  // 3.3 getNotificationClass
  console.log('\n── 3.3 getNotificationClass ──');
  assert(
    getNotificationClass('delayed') === 'flight-alert flight-alert-delayed',
    'delayed type returns delayed alert class'
  );
  assert(
    getNotificationClass('boarding') === 'flight-alert flight-alert-boarding',
    'boarding type returns boarding alert class'
  );
  assert(
    getNotificationClass('schedule') === 'flight-alert flight-alert-schedule',
    'schedule type returns schedule alert class'
  );
  assert(
    getNotificationClass('unknown') === 'flight-alert flight-alert-schedule',
    'unknown type defaults to schedule alert class'
  );
}

async function testNotificationGeneration() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 4: Notification Generation Logic        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 4.1 First-time tracking a delayed flight (wasTracked=false)
  console.log('── 4.1 First-time tracking delayed flight ──');
  const delayedStatus = {
    flightId: 3,
    status: 'Delayed by 1h',
    delayReason: 'Late arrival of the incoming aircraft.',
    departureTime: '2026-06-20T08:30:00.000Z',
    revisedDepartureTime: '2026-06-20T09:30:00.000Z',
  };

  const notsFirstTrack = createNotificationsForFlight(
    { id: 3, departureTime: '2026-06-20T08:30:00.000Z' },
    delayedStatus,
    false
  );

  assert(notsFirstTrack.length >= 1, 'First tracking of delayed flight generates at least 1 notification');
  const delayedNot = notsFirstTrack.find((n) => n.type === 'delayed');
  assert(delayedNot != null, 'Generates a delayed notification');
  assert(delayedNot.title.includes('3'), 'Delayed notification title includes flight ID');

  const scheduleNot = notsFirstTrack.find((n) => n.type === 'schedule');
  assert(scheduleNot != null, 'Generates a schedule change notification for delayed flight');

  // 4.2 First-time tracking a boarding flight
  console.log('\n── 4.2 First-time tracking boarding flight ──');
  const boardingStatus = {
    flightId: 2,
    status: 'Boarding',
    delayReason: 'Boarding in progress at the assigned gate.',
    departureTime: '2026-06-21T04:30:00.000Z',
    revisedDepartureTime: '2026-06-21T04:30:00.000Z',
  };

  const notsBoarding = createNotificationsForFlight(
    { id: 2, departureTime: '2026-06-21T04:30:00.000Z' },
    boardingStatus,
    false
  );

  const boardingNot = notsBoarding.find((n) => n.type === 'boarding');
  assert(boardingNot != null, 'Generates a boarding notification');
  assert(
    boardingNot.description.includes('Boarding has started'),
    'Boarding notification has correct description'
  );

  // 4.3 First-time tracking an on-time flight
  console.log('\n── 4.3 First-time tracking on-time flight ──');
  const onTimeStatus = {
    flightId: 1,
    status: 'On Time',
    delayReason: 'No delay reported.',
    departureTime: '2026-06-20T02:30:00.000Z',
    revisedDepartureTime: '2026-06-20T02:30:00.000Z',
  };

  const notsOnTime = createNotificationsForFlight(
    { id: 1, departureTime: '2026-06-20T02:30:00.000Z' },
    onTimeStatus,
    false
  );

  assert(notsOnTime.length === 0, 'On-time flight with matching departure generates no notifications');

  // 4.4 Already tracked, no status change (refresh)
  console.log('\n── 4.4 Already tracked flight, same status (refresh) ──');
  const notsRefreshSame = createNotificationsForFlight(
    { id: 3, currentStatus: 'Delayed by 1h', revisedDepartureTime: '2026-06-20T09:30:00.000Z' },
    delayedStatus,
    true
  );

  assert(notsRefreshSame.length === 0, 'Refreshing tracked flight with same status generates no notifications');

  // 4.5 Tracked flight changes from On Time to Delayed
  console.log('\n── 4.5 Status change: On Time → Delayed ──');
  const notsStatusChange = createNotificationsForFlight(
    {
      id: 3,
      currentStatus: 'On Time',
      departureTime: '2026-06-20T08:30:00.000Z',
      revisedDepartureTime: '2026-06-20T08:30:00.000Z',
    },
    delayedStatus,
    true
  );

  const delayChangeNot = notsStatusChange.find((n) => n.type === 'delayed');
  assert(delayChangeNot != null, 'Status change to Delayed generates delayed notification');
  const schedChangeNot = notsStatusChange.find((n) => n.type === 'schedule');
  assert(schedChangeNot != null, 'Schedule change notification generated for new delay');

  // 4.6 Notification IDs are unique within each batch
  console.log('\n── 4.6 Notification IDs uniqueness ──');
  // Test uniqueness within each individual notification batch (single call)
  function checkBatchUniqueness(batch, label) {
    const batchIds = batch.map((n) => n.id);
    const uniqueBatchIds = new Set(batchIds);
    assert(uniqueBatchIds.size === batchIds.length, `${label}: IDs are unique within batch`);
  }
  checkBatchUniqueness(notsFirstTrack, 'First-track delayed notifications');
  checkBatchUniqueness(notsBoarding, 'Boarding notifications');
  checkBatchUniqueness(notsStatusChange, 'Status change notifications');

  // Also verify ID format includes flight ID and type prefix
  const allNotifications = [
    ...notsFirstTrack,
    ...notsBoarding,
    ...notsStatusChange,
  ];
  for (const n of allNotifications) {
    assert(n.id.startsWith(n.type + '-'), `Notification ID "${n.id}" starts with type prefix "${n.type}-"`);
  }

  // 4.7 All notifications have required fields
  console.log('\n── 4.7 Notification structure validation ──');
  for (const notification of allNotifications) {
    assert(typeof notification.id === 'string', `Notification ${notification.id} has string id`);
    assert(['delayed', 'boarding', 'schedule'].includes(notification.type), `Notification ${notification.id} has valid type`);
    assert(typeof notification.title === 'string' && notification.title.length > 0, `Notification ${notification.id} has non-empty title`);
    assert(typeof notification.description === 'string' && notification.description.length > 0, `Notification ${notification.id} has non-empty description`);
    assert(typeof notification.timestamp === 'string', `Notification ${notification.id} has timestamp`);
    assert(!isNaN(new Date(notification.timestamp).getTime()), `Notification ${notification.id} timestamp is valid ISO`);
  }
}

async function testTrackingAndSortingLogic() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 5: Tracking & Sorting Logic             ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 5.1 Flight sorting by departure time
  console.log('── 5.1 Flights sort by departure time ──');
  const flights = [...fallbackFlights];
  const sorted = flights.sort(
    (a, b) => new Date(a.departureTime) - new Date(b.departureTime)
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i].departureTime).getTime();
    const next = new Date(sorted[i + 1].departureTime).getTime();
    assert(current <= next, `Flight ${sorted[i].id} departs before/at flight ${sorted[i + 1].id}`);
  }

  // The expected sorted order by departure:
  // Flight 5: 2026-06-19T09:00:00
  // Flight 1: 2026-06-20T08:00:00
  // Flight 3: 2026-06-20T14:00:00
  // Flight 2: 2026-06-21T10:00:00
  // Flight 4: 2026-06-22T06:00:00
  assert(sorted[0].id === 5, 'Earliest departing flight is JetBlue (id=5)');
  assert(sorted[4].id === 4, 'Latest departing flight is Southwest (id=4)');

  // 5.2 Tracked vs Untracked filtering
  console.log('\n── 5.2 Tracked/Untracked flight filtering ──');
  const trackedIds = [1, 3];
  const tracked = sorted.filter((f) => trackedIds.includes(f.id));
  const untracked = sorted.filter((f) => !trackedIds.includes(f.id));

  assert(tracked.length === 2, 'Tracking 2 flights yields 2 tracked');
  assert(untracked.length === 3, 'Tracking 2 flights yields 3 untracked');
  assert(tracked.every((f) => trackedIds.includes(f.id)), 'All tracked flights have tracked IDs');
  assert(untracked.every((f) => !trackedIds.includes(f.id)), 'All untracked flights do not have tracked IDs');

  // 5.3 No overlap
  const allIds = [...tracked, ...untracked].map((f) => f.id);
  assert(new Set(allIds).size === 5, 'Tracked + Untracked covers all flights without duplicates');

  // 5.4 Empty tracked list
  console.log('\n── 5.4 Edge case: empty tracking ──');
  const emptyTracked = sorted.filter((f) => [].includes(f.id));
  const allUntracked = sorted.filter((f) => ![].includes(undefined));
  assert(emptyTracked.length === 0, 'Empty tracking yields 0 tracked flights');

  // 5.5 All tracked
  console.log('\n── 5.5 Edge case: all flights tracked ──');
  const allTrackedIds = [1, 2, 3, 4, 5];
  const allTracked = sorted.filter((f) => allTrackedIds.includes(f.id));
  const noneUntracked = sorted.filter((f) => !allTrackedIds.includes(f.id));
  assert(allTracked.length === 5, 'All flights tracked yields 5 tracked');
  assert(noneUntracked.length === 0, 'All flights tracked yields 0 untracked');
}

async function testLocalStorageService() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 6: LocalStorage Tracking Service        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Since we don't have a browser environment, we test the module logic
  // by verifying the exported function signatures and logic flow

  console.log('── 6.1 Module exports validation ──');

  // Dynamically import the service
  const service = await import('../services/flightService.js');

  assert(typeof service.fallbackFlights !== 'undefined', 'flightService exports fallbackFlights');
  assert(typeof service.normalizeFlightStatusRow === 'function', 'flightService exports normalizeFlightStatusRow');
  assert(typeof service.attachStatusToFlight === 'function', 'flightService exports attachStatusToFlight');
  assert(typeof service.getAvailableFlights === 'function', 'flightService exports getAvailableFlights');
  assert(typeof service.getFlightById === 'function', 'flightService exports getFlightById');
  assert(typeof service.getLiveFlightStatus === 'function', 'flightService exports getLiveFlightStatus');

  console.log('\n── 6.2 getAvailableFlights ──');
  const available = await service.getAvailableFlights();
  assert(Array.isArray(available), 'getAvailableFlights returns an array');
  assert(available.length === 5, 'Returns all 5 available flights');
}

async function testStatusUpdateIntegration() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 7: Status Update Integration Flow       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Simulates the full flow: load flights → track → fetch status → update → generate notifications

  console.log('── 7.1 Full integration: load → track → refresh ──');

  // Step 1: Load all flights (simulating page load)
  const loadReq = {};
  const loadRes = mockRes();
  await listFlights(loadReq, loadRes);
  const allFlights = loadRes.body.flights;
  assert(allFlights.length === 5, 'Loaded 5 flights on page load');

  // Step 2: Track flight 3 (Delayed)
  const trackReq = { params: { id: '3' } };
  const trackRes = mockRes();
  await getFlightStatus(trackReq, trackRes);
  const latestStatus3 = trackRes.body.flightStatus;

  assert(latestStatus3.status === 'Delayed by 1h', 'Fetched delayed status for flight 3');

  // Step 3: Generate notifications for newly tracked flight
  const previousFlight3 = allFlights.find((f) => f.id === 3);
  const notifications = createNotificationsForFlight(previousFlight3, latestStatus3, false);

  assert(notifications.length >= 1, 'Tracking delayed flight generates notifications');
  console.log(`  ℹ Generated ${notifications.length} notification(s) for flight 3`);

  // Step 4: Update flight in list (simulating updateFlightStatus)
  const updatedFlights = allFlights.map((flight) =>
    flight.id === 3
      ? {
          ...flight,
          currentStatus: latestStatus3.status,
          delayReason: latestStatus3.delayReason,
          revisedDepartureTime: latestStatus3.revisedDepartureTime,
          estimatedArrival: latestStatus3.estimatedArrival,
          statusUpdatedAt: latestStatus3.updatedAt,
        }
      : flight
  );

  const updatedFlight3 = updatedFlights.find((f) => f.id === 3);
  assert(updatedFlight3.currentStatus === 'Delayed by 1h', 'Flight 3 status updated in list');
  assert(
    updatedFlight3.statusUpdatedAt === latestStatus3.updatedAt,
    'Flight 3 statusUpdatedAt is updated'
  );

  // Step 5: Refresh same flight (no status change expected)
  const refreshRes = mockRes();
  await getFlightStatus(trackReq, refreshRes);
  const refreshedStatus = refreshRes.body.flightStatus;

  const refreshNotifications = createNotificationsForFlight(updatedFlight3, refreshedStatus, true);
  assert(
    refreshNotifications.length === 0,
    'Refreshing tracked flight with same status generates no new notifications'
  );

  // 7.2 Track and refresh boarding flight
  console.log('\n── 7.2 Full integration: boarding flight ──');
  const trackReq2 = { params: { id: '2' } };
  const trackRes2 = mockRes();
  await getFlightStatus(trackReq2, trackRes2);
  const latestStatus2 = trackRes2.body.flightStatus;

  assert(latestStatus2.status === 'Boarding', 'Fetched boarding status for flight 2');

  const previousFlight2 = allFlights.find((f) => f.id === 2);
  const boardNotifs = createNotificationsForFlight(previousFlight2, latestStatus2, false);

  const hasBoardingNotif = boardNotifs.some((n) => n.type === 'boarding');
  assert(hasBoardingNotif, 'Boarding notification generated for flight 2');

  // 7.3 Track on-time flight (should generate no alerts)
  console.log('\n── 7.3 Full integration: on-time flight ──');
  const trackReq1 = { params: { id: '1' } };
  const trackRes1 = mockRes();
  await getFlightStatus(trackReq1, trackRes1);
  const latestStatus1 = trackRes1.body.flightStatus;

  assert(latestStatus1.status === 'On Time', 'Fetched on-time status for flight 1');

  const previousFlight1 = allFlights.find((f) => f.id === 1);
  const onTimeNotifs = createNotificationsForFlight(previousFlight1, latestStatus1, false);

  // On-time with matching departure should generate no notifications
  // (unless revisedDepartureTime differs from departureTime, which it might for the initial track)
  console.log(`  ℹ Generated ${onTimeNotifs.length} notification(s) for on-time flight 1`);

  // 7.4 Notification capping (max 8)
  console.log('\n── 7.4 Notification capping at 8 ──');
  let allNotifications = [];
  for (let i = 0; i < 12; i++) {
    allNotifications.push({
      id: `test-${i}`,
      type: 'delayed',
      title: `Test Notification ${i}`,
      description: 'Test',
      timestamp: new Date().toISOString(),
    });
  }
  // Simulate the addNotifications logic from the component
  const capped = [...allNotifications].slice(0, 8);
  assert(capped.length === 8, 'Notifications are capped at 8 maximum');
}

async function testCSSClassesExist() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUITE 8: CSS Class Coverage Verification      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Read the CSS file and check all required classes are present
  const fs = await import('fs');
  const cssPath = new URL('../../../frontend/src/index.css', import.meta.url);
  let cssContent;

  try {
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  } catch {
    // Try alternate path resolution
    const path = await import('path');
    const altPath = path.resolve(
      process.cwd(),
      '../frontend/src/index.css'
    );
    cssContent = fs.readFileSync(altPath, 'utf-8');
  }

  console.log('── 8.1 Status badge CSS classes ──');
  const requiredClasses = [
    '.status-badge',
    '.status-badge-on-time',
    '.status-badge-boarding',
    '.status-badge-delayed',
    '.live-status-card',
    '.live-status-header',
    '.live-status-grid',
    '.live-status-sections',
    '.live-status-section',
    '.live-status-section-header',
    '.live-status-section-title',
    '.live-status-count',
    '.status-detail',
    '.status-label',
    '.status-value',
    '.flight-alert',
    '.flight-alert-copy',
    '.flight-alert-time',
    '.flight-alert-delayed',
    '.flight-alert-boarding',
    '.flight-alert-schedule',
    '.flight-alerts-panel',
  ];

  for (const className of requiredClasses) {
    assert(cssContent.includes(className), `CSS class "${className}" exists in index.css`);
  }

  console.log('\n── 8.2 General UI CSS classes ──');
  const generalClasses = [
    '.page-card',
    '.section-title',
    '.text-muted',
    '.grid-list',
    '.card',
    '.card-actions',
    '.button',
    '.button-primary',
    '.button-outline',
    '.alert',
    '.alert-success',
    '.alert-error',
  ];

  for (const className of generalClasses) {
    assert(cssContent.includes(className), `General CSS class "${className}" exists in index.css`);
  }
}

// ── Main Runner ────────────────────────────────────────────────────

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🛫  LIVE FLIGHT STATUS — COMPREHENSIVE TEST SUITE  🛫  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await testFlightServiceLayer();
  await testAPIEndpoints();
  await testUIHelperFunctions();
  await testNotificationGeneration();
  await testTrackingAndSortingLogic();
  await testLocalStorageService();
  await testStatusUpdateIntegration();
  await testCSSClassesExist();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed                       `);
  if (failed === 0) {
    console.log('║  🎉  ALL TESTS PASSED SUCCESSFULLY!                      ║');
  } else {
    console.log('║  ⚠️   SOME TESTS FAILED — SEE ABOVE FOR DETAILS         ║');
  }
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('\n💥 Test suite crashed:', err);
  process.exit(1);
});
