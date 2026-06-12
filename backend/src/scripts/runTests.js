import {
  fallbackBookings,
  fallbackCancellations,
  fallbackRefunds,
  cancelBooking
} from '../controllers/bookingController.js';
import { getRefund } from '../controllers/refundController.js';
import { getFlight, getFlightStatus, listFlights } from '../controllers/flightController.js';

// Simple assert helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

// Request and response mock helpers
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
    }
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Cancellation and Refund System Tests...');
  console.log('====================================================\n');

  // Clear fallback stores for clean test run
  fallbackBookings.length = 0;
  fallbackCancellations.length = 0;
  fallbackRefunds.length = 0;

  const mockUser = { id: 42, name: 'Test User', email: 'test@example.com' };

  // ----------------------------------------------------
  // Test Case 1: Cancel within 24 hours (Refund 50%)
  // ----------------------------------------------------
  console.log('--- Test Case 1: Cancel within 24 hours (50% Refund) ---');
  
  // Seed a confirmed booking created right now
  const booking1 = {
    id: 101,
    userId: mockUser.id,
    hotelId: null,
    flightId: 12,
    checkIn: null,
    checkOut: null,
    totalPrice: 200.00,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  fallbackBookings.push(booking1);

  const req1 = {
    user: mockUser,
    params: { id: '101' },
    body: { reason: 'Found a better deal' }
  };
  const res1 = mockRes();

  await cancelBooking(req1, res1);

  assert(res1.statusCode === 200, 'Response status code should be 200');
  assert(booking1.status === 'cancelled', 'Booking status should be updated to cancelled');
  assert(fallbackCancellations.length === 1, 'Cancellation record should be created');
  assert(fallbackCancellations[0].bookingId === 101, 'Cancellation should reference booking ID 101');
  assert(fallbackCancellations[0].reason === 'Found a better deal', 'Cancellation reason should match');
  assert(fallbackRefunds.length === 1, 'Refund record should be created');
  assert(fallbackRefunds[0].bookingId === 101, 'Refund should reference booking ID 101');
  assert(fallbackRefunds[0].refundPercentage === 50, 'Refund percentage should be 50%');
  assert(fallbackRefunds[0].refundAmount === 100, 'Refund amount should be 100 (50% of 200)');
  assert(fallbackRefunds[0].status === 'Pending', 'Refund status should initially be Pending');

  // ----------------------------------------------------
  // Test Case 2: Cancel after 24 hours (Refund 25%)
  // ----------------------------------------------------
  console.log('\n--- Test Case 2: Cancel after 24 hours (25% Refund) ---');
  
  // Seed a confirmed booking created 25 hours ago
  const created25HoursAgo = new Date();
  created25HoursAgo.setHours(created25HoursAgo.getHours() - 25);

  const booking2 = {
    id: 102,
    userId: mockUser.id,
    hotelId: 3,
    flightId: null,
    checkIn: '2026-06-15',
    checkOut: '2026-06-18',
    totalPrice: 400.00,
    status: 'confirmed',
    createdAt: created25HoursAgo.toISOString(),
  };
  fallbackBookings.push(booking2);

  const req2 = {
    user: mockUser,
    params: { id: '102' },
    body: { reason: 'Change of plans' }
  };
  const res2 = mockRes();

  await cancelBooking(req2, res2);

  assert(res2.statusCode === 200, 'Response status code should be 200');
  assert(booking2.status === 'cancelled', 'Booking status should be updated to cancelled');
  assert(fallbackCancellations.length === 2, 'A second cancellation record should be created');
  assert(fallbackRefunds.length === 2, 'A second refund record should be created');
  assert(fallbackRefunds[1].bookingId === 102, 'Refund should reference booking ID 102');
  assert(fallbackRefunds[1].refundPercentage === 25, 'Refund percentage should be 25%');
  assert(fallbackRefunds[1].refundAmount === 100, 'Refund amount should be 100 (25% of 400)');

  // ----------------------------------------------------
  // Test Case 3: Verify Refund status tracker updates
  // ----------------------------------------------------
  console.log('\n--- Test Case 3: Verify Refund status tracker updates ---');
  
  const req3 = {
    user: mockUser,
    params: { bookingId: '101' }
  };
  const res3 = mockRes();

  // Get initial refund details (Pending status)
  await getRefund(req3, res3);
  assert(res3.statusCode === 200, 'Response status should be 200');
  assert(res3.body.refund.status === 'Pending', 'Initial retrieved status should be Pending');

  // Update refund status to Processed and retrieve again
  fallbackRefunds[0].status = 'Processed';
  const res4 = mockRes();
  await getRefund(req3, res4);
  assert(res4.statusCode === 200, 'Response status should be 200');
  assert(res4.body.refund.status === 'Processed', 'Retrieved status should be Processed');

  // Update refund status to Completed and retrieve again
  fallbackRefunds[0].status = 'Completed';
  const res5 = mockRes();
  await getRefund(req3, res5);
  assert(res5.statusCode === 200, 'Response status should be 200');
  assert(res5.body.refund.status === 'Completed', 'Retrieved status should be Completed');

  // ----------------------------------------------------
  // Test Case 4: Live Flight Status mock API
  // ----------------------------------------------------
  console.log('\n--- Test Case 4: Live Flight Status Mock API ---');

  const onTimeReq = { params: { id: '1' } };
  const onTimeRes = mockRes();
  await getFlightStatus(onTimeReq, onTimeRes);
  assert(onTimeRes.statusCode === 200, 'On-time flight status request should return 200');
  assert(onTimeRes.body.flightStatus.status === 'On Time', 'Flight 1 should return On Time status');
  assert(onTimeRes.body.flightStatus.delayReason === 'No delay reported.', 'On-time flight should include a delay reason message');
  assert(onTimeRes.body.flightStatus.revisedDepartureTime === onTimeRes.body.flightStatus.departureTime, 'On-time flight revised departure time should match scheduled departure');

  const boardingReq = { params: { id: '2' } };
  const boardingRes = mockRes();
  await getFlightStatus(boardingReq, boardingRes);
  assert(boardingRes.statusCode === 200, 'Boarding flight status request should return 200');
  assert(boardingRes.body.flightStatus.status === 'Boarding', 'Flight 2 should return Boarding status');

  const flightsListReq = {};
  const flightsListRes = mockRes();
  await listFlights(flightsListReq, flightsListRes);
  assert(flightsListRes.statusCode === 200, 'Flights list request should return 200');
  assert(Array.isArray(flightsListRes.body.flights), 'Flights list should return an array');
  assert(flightsListRes.body.flights[0].currentStatus === 'On Time', 'Flights list should include currentStatus from status integration');

  const singleFlightReq = { params: { id: '2' } };
  const singleFlightRes = mockRes();
  await getFlight(singleFlightReq, singleFlightRes);
  assert(singleFlightRes.statusCode === 200, 'Single flight request should return 200');
  assert(singleFlightRes.body.flight.currentStatus === 'Boarding', 'Single flight response should include currentStatus from status integration');

  const delayedReq = { params: { id: '3' } };
  const delayedRes = mockRes();
  await getFlightStatus(delayedReq, delayedRes);
  assert(delayedRes.statusCode === 200, 'Delayed flight status request should return 200');
  assert(delayedRes.body.flightStatus.status === 'Delayed by 1h', 'Flight 3 should return Delayed by 1h status');
  assert(delayedRes.body.flightStatus.delayReason === 'Late arrival of the incoming aircraft.', 'Delayed flight should include the mock delay reason');
  assert(new Date(delayedRes.body.flightStatus.revisedDepartureTime).getTime() - new Date(delayedRes.body.flightStatus.departureTime).getTime() === 60 * 60 * 1000, 'Delayed flight revised departure should be 1 hour later');
  assert(new Date(delayedRes.body.flightStatus.estimatedArrival).getTime() - new Date(delayedRes.body.flightStatus.arrivalTime).getTime() === 60 * 60 * 1000, 'Delayed flight estimated arrival should be 1 hour later than scheduled arrival');

  // ----------------------------------------------------
  // Test Case 5: Security and Validation checks
  // ----------------------------------------------------
  console.log('\n--- Test Case 5: Security and Validation Checks ---');
  
  // Try cancelling booking that does not exist
  const reqNonExist = {
    user: mockUser,
    params: { id: '999' },
    body: { reason: 'No' }
  };
  const resNonExist = mockRes();
  await cancelBooking(reqNonExist, resNonExist);
  assert(resNonExist.statusCode === 404, 'Non-existent booking cancel should return 404');

  // Try cancelling booking belonging to another user
  const otherUser = { id: 99, name: 'Other User' };
  const reqOtherUser = {
    user: otherUser,
    params: { id: '101' },
    body: { reason: 'Not mine' }
  };
  const resOtherUser = mockRes();
  await cancelBooking(reqOtherUser, resOtherUser);
  assert(resOtherUser.statusCode === 404, 'Cancel booking of other user should return 404');

  // Try cancelling already cancelled booking
  const resAlreadyCancel = mockRes();
  await cancelBooking(req1, resAlreadyCancel);
  assert(resAlreadyCancel.statusCode === 400, 'Already cancelled booking should return 400');

  const missingFlightReq = { params: { id: '999' } };
  const missingFlightRes = mockRes();
  await getFlightStatus(missingFlightReq, missingFlightRes);
  assert(missingFlightRes.statusCode === 404, 'Unknown flight status request should return 404');

  console.log('\n====================================================');
  console.log('🎉 All tests passed successfully!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Run Failed:', err);
  process.exit(1);
});
