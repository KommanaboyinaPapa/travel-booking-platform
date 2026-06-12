import {
  fallbackPriceHistory,
  recordPriceChange,
  getHotelPriceHistory,
  getFlightPriceHistory,
  updateEntityPrice,
} from '../services/priceHistoryService.js';
import {
  getHotelPriceHistory as getHotelPriceHistoryHandler,
  getFlightPriceHistory as getFlightPriceHistoryHandler,
  updatePrice as updatePriceHandler,
} from '../controllers/priceHistoryController.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function runPriceHistoryTests() {
  console.log('====================================================');
  console.log('🚀 Running Price History Tests...');
  console.log('====================================================\n');

  // Clear fallback store for a clean run
  fallbackPriceHistory.length = 0;

  // ------------------------------------------------------------------
  // Test 1: recordPriceChange — basic recording (fallback mode)
  // ------------------------------------------------------------------
  console.log('--- Test 1: Record a price change (fallback) ---');
  const id1 = await recordPriceChange('hotel', 1, 250, 275);
  assert(id1 !== null, 'Should return an ID for recorded change');
  assert(fallbackPriceHistory.length === 1, 'Fallback store should have 1 entry');
  assert(fallbackPriceHistory[0].entityType === 'hotel', 'Entity type should be hotel');
  assert(fallbackPriceHistory[0].entityId === 1, 'Entity ID should be 1');
  assert(fallbackPriceHistory[0].oldPrice === 250, 'Old price should be 250');
  assert(fallbackPriceHistory[0].newPrice === 275, 'New price should be 275');

  // ------------------------------------------------------------------
  // Test 2: recordPriceChange — skip when no change
  // ------------------------------------------------------------------
  console.log('\n--- Test 2: Skip when price unchanged ---');
  const id2 = await recordPriceChange('hotel', 1, 275, 275);
  assert(id2 === null, 'Should return null when price unchanged');
  assert(fallbackPriceHistory.length === 1, 'Fallback store should still have 1 entry');

  // ------------------------------------------------------------------
  // Test 3: Record multiple changes and fetch hotel history
  // ------------------------------------------------------------------
  console.log('\n--- Test 3: Multiple changes + fetch hotel history ---');
  await recordPriceChange('hotel', 1, 275, 300);
  await recordPriceChange('hotel', 1, 300, 280);
  await recordPriceChange('hotel', 2, 150, 160);
  await recordPriceChange('flight', 1, 150, 175);
  await recordPriceChange('flight', 1, 175, 200);

  assert(fallbackPriceHistory.length === 6, 'Fallback store should have 6 entries total');

  const hotel1History = await getHotelPriceHistory(1);
  assert(hotel1History.total === 3, 'Hotel 1 should have 3 history entries');
  assert(hotel1History.history.length === 3, 'Should return all 3 entries');
  // Newest first
  assert(hotel1History.history[0].newPrice === 280, 'Most recent entry should have newPrice 280');
  assert(hotel1History.history[2].newPrice === 275, 'Oldest entry should have newPrice 275');

  const hotel2History = await getHotelPriceHistory(2);
  assert(hotel2History.total === 1, 'Hotel 2 should have 1 history entry');

  // ------------------------------------------------------------------
  // Test 4: Fetch flight history
  // ------------------------------------------------------------------
  console.log('\n--- Test 4: Fetch flight price history ---');
  const flight1History = await getFlightPriceHistory(1);
  assert(flight1History.total === 2, 'Flight 1 should have 2 history entries');
  assert(flight1History.history[0].newPrice === 200, 'Most recent flight entry should have newPrice 200');

  const flight2History = await getFlightPriceHistory(2);
  assert(flight2History.total === 0, 'Flight 2 should have 0 history entries');

  // ------------------------------------------------------------------
  // Test 5: Pagination
  // ------------------------------------------------------------------
  console.log('\n--- Test 5: Pagination ---');
  const paged = await getHotelPriceHistory(1, { limit: 2, offset: 0 });
  assert(paged.history.length === 2, 'Paginated result should return 2 entries');
  assert(paged.total === 3, 'Total should still be 3');

  const paged2 = await getHotelPriceHistory(1, { limit: 2, offset: 2 });
  assert(paged2.history.length === 1, 'Offset page should return 1 entry');

  // ------------------------------------------------------------------
  // Test 6: Controller — GET hotel price history
  // ------------------------------------------------------------------
  console.log('\n--- Test 6: Controller — GET hotel price history ---');
  const res6 = mockRes();
  await getHotelPriceHistoryHandler(
    { params: { hotelId: '1' }, query: { limit: '50', offset: '0' } },
    res6
  );
  assert(res6.statusCode === 200, 'Status should be 200');
  assert(res6.body.total === 3, 'Should return total of 3');
  assert(Array.isArray(res6.body.history), 'history should be an array');

  // ------------------------------------------------------------------
  // Test 7: Controller — GET flight price history
  // ------------------------------------------------------------------
  console.log('\n--- Test 7: Controller — GET flight price history ---');
  const res7 = mockRes();
  await getFlightPriceHistoryHandler(
    { params: { flightId: '1' }, query: {} },
    res7
  );
  assert(res7.statusCode === 200, 'Status should be 200');
  assert(res7.body.total === 2, 'Should return total of 2');

  // ------------------------------------------------------------------
  // Test 8: Controller — PUT update price — validation errors
  // ------------------------------------------------------------------
  console.log('\n--- Test 8: Controller — PUT update price — validation ---');

  // Missing fields
  const res8a = mockRes();
  await updatePriceHandler({ body: {} }, res8a);
  assert(res8a.statusCode === 400, 'Missing fields should return 400');

  // Missing newPrice
  const res8b = mockRes();
  await updatePriceHandler({ body: { entityType: 'hotel', entityId: 1 } }, res8b);
  assert(res8b.statusCode === 400, 'Missing newPrice should return 400');

  // ------------------------------------------------------------------
  // Test 9: Non-existent entity history returns empty
  // ------------------------------------------------------------------
  console.log('\n--- Test 9: Non-existent entity — empty history ---');
  const res9 = mockRes();
  await getHotelPriceHistoryHandler(
    { params: { hotelId: '999' }, query: {} },
    res9
  );
  assert(res9.statusCode === 200, 'Status should be 200');
  assert(res9.body.total === 0, 'Non-existent hotel should return 0 entries');
  assert(res9.body.history.length === 0, 'History array should be empty');

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log('\n====================================================');
  console.log('🎉 All price history tests passed!');
  console.log('====================================================');
}

runPriceHistoryTests().catch((err) => {
  console.error('\n❌ Price History Test Run Failed:', err);
  process.exit(1);
});
