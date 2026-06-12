import {
  fallbackRooms,
  roomIdCounter
} from '../services/roomService.js';
import {
  getRoomsForHotel,
  getRoom,
  bookRoom,
  releaseRoom,
} from '../controllers/roomController.js';

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
  console.log('║  🏨  HOTEL ROOM SELECTION — TEST SUITE                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('── 1. Fallback Rooms Data Generation ──');
  assert(fallbackRooms.length === 5 * 3, 'Generates 3 room types per hotel (5 hotels = 15 room types)');
  
  const hotel1Rooms = fallbackRooms.filter(r => r.hotelId === 1);
  assert(hotel1Rooms.length === 3, 'Hotel 1 has exactly 3 room types');

  const standardRooms = hotel1Rooms.filter(r => r.roomType === 'Standard');
  const deluxeRooms = hotel1Rooms.filter(r => r.roomType === 'Deluxe');
  const suiteRooms = hotel1Rooms.filter(r => r.roomType === 'Suite');

  assert(standardRooms.length === 1 && standardRooms[0].availability === 15, 'Hotel 1 has 15 Standard rooms');
  assert(deluxeRooms.length === 1 && deluxeRooms[0].availability === 10, 'Hotel 1 has 10 Deluxe rooms');
  assert(suiteRooms.length === 1 && suiteRooms[0].availability === 5, 'Hotel 1 has 5 Suite rooms');

  // Verify prices (base hotel 1 price is 250)
  assert(standardRooms[0].price === 250, 'Standard room price is 1.0x base (250)');
  assert(deluxeRooms[0].price === 375, 'Deluxe room price is 1.5x base (375)');
  assert(suiteRooms[0].price === 625, 'Suite room price is 2.5x base (625)');

  console.log('\n── 2. API Endpoints (Fallback Mode) ──');

  // getRoomsForHotel
  const listReq = { params: { hotelId: '1' } };
  const listRes = mockRes();
  await getRoomsForHotel(listReq, listRes);
  assert(listRes.statusCode === 200, 'getRoomsForHotel returns 200');
  assert(listRes.body.rooms.length === 3, 'getRoomsForHotel returns 3 room types for hotel 1');

  // getRoom
  const roomToTest = hotel1Rooms[0];
  const getReq = { params: { roomId: String(roomToTest.id) } };
  const getRes = mockRes();
  await getRoom(getReq, getRes);
  assert(getRes.statusCode === 200, 'getRoom returns 200');
  assert(getRes.body.room.id === roomToTest.id, 'getRoom returns the correct room type');

  // getRoom (Not Found)
  const getReq404 = { params: { roomId: '9999' } };
  const getRes404 = mockRes();
  await getRoom(getReq404, getRes404);
  assert(getRes404.statusCode === 404, 'getRoom returns 404 for non-existent room');

  console.log('\n── 3. Booking and Releasing Rooms ──');

  // Find a room with availability
  const availableRoom = fallbackRooms.find(r => r.availability > 0);
  assert(availableRoom != null, 'Found an available room type to test');
  const initialAvailability = availableRoom.availability;

  // Book the room
  const bookReq = { params: { roomId: String(availableRoom.id) } };
  const bookRes = mockRes();
  await bookRoom(bookReq, bookRes);
  assert(bookRes.statusCode === 200, 'bookRoom returns 200');
  assert(availableRoom.availability === initialAvailability - 1, 'Room availability decreased by 1');

  // Exhaust availability for a DIFFERENT room
  const lowAvailabilityRoom = fallbackRooms.find(r => r.id !== availableRoom.id && r.availability > 0);
  const oldAvailability = lowAvailabilityRoom.availability;
  lowAvailabilityRoom.availability = 0; // Manually set to 0 for testing

  const bookReqConflict = { params: { roomId: String(lowAvailabilityRoom.id) } };
  const bookResConflict = mockRes();
  await bookRoom(bookReqConflict, bookResConflict);
  assert(bookResConflict.statusCode === 409, 'Booking a fully booked room type returns 409 Conflict');
  
  lowAvailabilityRoom.availability = oldAvailability; // restore

  // Release the room
  const releaseReq = { params: { roomId: String(availableRoom.id) } };
  const releaseRes = mockRes();
  await releaseRoom(releaseReq, releaseRes);
  assert(releaseRes.statusCode === 200, 'releaseRoom returns 200');
  assert(availableRoom.availability === initialAvailability, 'Room availability restored');

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
