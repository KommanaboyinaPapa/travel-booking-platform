import {
  fallbackSeats,
  seatIdCounter
} from '../services/seatService.js';
import {
  getSeatsForFlight,
  getSeat,
  bookSeat,
  releaseSeat,
} from '../controllers/seatController.js';

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

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  💺  SEAT SELECTION — TEST SUITE                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('── 1. Fallback Seats Data Generation ──');
  assert(fallbackSeats.length === 5 * 120, 'Generates 120 seats per flight (5 flights = 600 seats)');
  
  const flight1Seats = fallbackSeats.filter(s => s.flightId === 1);
  assert(flight1Seats.length === 120, 'Flight 1 has exactly 120 seats');

  const businessSeats = flight1Seats.filter(s => s.type === 'business');
  const premiumSeats = flight1Seats.filter(s => s.type === 'premium');
  const economySeats = flight1Seats.filter(s => s.type === 'economy');

  assert(businessSeats.length === 18, 'Flight 1 has 18 business seats (3 rows x 6)');
  assert(premiumSeats.length === 18, 'Flight 1 has 18 premium seats (3 rows x 6)');
  assert(economySeats.length === 84, 'Flight 1 has 84 economy seats (14 rows x 6)');

  // Verify prices (base flight 1 price is 150)
  assert(economySeats[0].price === 150, 'Economy seat price is 1.0x base (150)');
  assert(premiumSeats[0].price === 210, 'Premium seat price is 1.4x base (210)');
  assert(businessSeats[0].price === 270, 'Business seat price is 1.8x base (270)');

  console.log('\n── 2. API Endpoints (Fallback Mode) ──');

  // getSeatsForFlight
  const listReq = { params: { flightId: '1' } };
  const listRes = mockRes();
  await getSeatsForFlight(listReq, listRes);
  assert(listRes.statusCode === 200, 'getSeatsForFlight returns 200');
  assert(listRes.body.seats.length === 120, 'getSeatsForFlight returns 120 seats for flight 1');

  // getSeat
  const seatToTest = flight1Seats[0];
  const getReq = { params: { seatId: String(seatToTest.id) } };
  const getRes = mockRes();
  await getSeat(getReq, getRes);
  assert(getRes.statusCode === 200, 'getSeat returns 200');
  assert(getRes.body.seat.id === seatToTest.id, 'getSeat returns the correct seat');

  // getSeat (Not Found)
  const getReq404 = { params: { seatId: '9999' } };
  const getRes404 = mockRes();
  await getSeat(getReq404, getRes404);
  assert(getRes404.statusCode === 404, 'getSeat returns 404 for non-existent seat');

  console.log('\n── 3. Booking and Releasing Seats ──');

  // Find an available seat
  const availableSeat = fallbackSeats.find(s => s.status === 'available');
  assert(availableSeat != null, 'Found an available seat to test');

  // Book the seat
  const bookReq = { params: { seatId: String(availableSeat.id) } };
  const bookRes = mockRes();
  await bookSeat(bookReq, bookRes);
  assert(bookRes.statusCode === 200, 'bookSeat returns 200');
  assert(availableSeat.status === 'booked', 'Seat status changed to booked');

  // Try booking it again (Conflict)
  const bookReqConflict = { params: { seatId: String(availableSeat.id) } };
  const bookResConflict = mockRes();
  await bookSeat(bookReqConflict, bookResConflict);
  assert(bookResConflict.statusCode === 409, 'Booking an already booked seat returns 409 Conflict');

  // Release the seat
  const releaseReq = { params: { seatId: String(availableSeat.id) } };
  const releaseRes = mockRes();
  await releaseSeat(releaseReq, releaseRes);
  assert(releaseRes.statusCode === 200, 'releaseSeat returns 200');
  assert(availableSeat.status === 'available', 'Seat status changed back to available');

  // Try releasing it again (Bad Request)
  const releaseReqAgain = { params: { seatId: String(availableSeat.id) } };
  const releaseResAgain = mockRes();
  await releaseSeat(releaseReqAgain, releaseResAgain);
  assert(releaseResAgain.statusCode === 400, 'Releasing an already available seat returns 400 Bad Request');

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

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
