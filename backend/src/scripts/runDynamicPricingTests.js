import {
  checkHoliday,
  isWeekend,
  isPeakSeason,
  getDemandMultiplier,
  calculateDynamicPrice,
  createFreezeFallback,
  getActiveFallbackFreeze,
  fallbackFreezes,
  FREEZE_DURATION_MS,
} from '../services/dynamicPricingService.js';
import { calculatePrice, freezePrice, getFrozenPrice, deleteFreeze } from '../controllers/dynamicPricingController.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function assert(condition, message) {
  if (!condition) throw new Error(`❌ Assertion Failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

function mockRes() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data)   { this.body = data; return this; },
  };
}

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1 }, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function run() {
  console.log('====================================================');
  console.log('🚀 Running Dynamic Pricing Tests...');
  console.log('====================================================\n');

  // Clear fallback freeze store
  fallbackFreezes.length = 0;

  // ------------------------------------------------------------------
  // Test 1: Holiday detection
  // ------------------------------------------------------------------
  console.log('--- Test 1: Holiday detection ---');
  const xmas    = checkHoliday(new Date('2025-12-25'));
  const newYear = checkHoliday('2025-01-01');
  const july4   = checkHoliday('2025-07-04');
  const regular = checkHoliday('2025-03-15');
  assert(xmas.isHoliday && xmas.name === 'Christmas Day', 'Dec 25 is Christmas Day');
  assert(newYear.isHoliday && newYear.name === "New Year's Day", 'Jan 1 is New Year\'s Day');
  assert(july4.isHoliday && july4.name === 'Independence Day', 'Jul 4 is Independence Day');
  assert(!regular.isHoliday, 'Mar 15 is not a holiday');

  // ------------------------------------------------------------------
  // Test 2: Weekend detection
  // ------------------------------------------------------------------
  console.log('\n--- Test 2: Weekend detection ---');
  assert(isWeekend('2025-01-04'),  'Saturday is weekend');  // Sat
  assert(isWeekend('2025-01-05'),  'Sunday is weekend');    // Sun
  assert(!isWeekend('2025-01-06'), 'Monday is not weekend');

  // ------------------------------------------------------------------
  // Test 3: Peak season detection
  // ------------------------------------------------------------------
  console.log('\n--- Test 3: Peak season detection ---');
  assert(isPeakSeason('2025-07-15'),  'July is peak season (summer)');
  assert(isPeakSeason('2025-12-25'),  'Dec 25 is peak season (winter holidays)');
  assert(isPeakSeason('2025-01-02'),  'Jan 2 is peak season (winter holidays)');
  assert(!isPeakSeason('2025-03-10'), 'March is not peak season');

  // ------------------------------------------------------------------
  // Test 4: Demand multiplier
  // ------------------------------------------------------------------
  console.log('\n--- Test 4: Demand multiplier ---');
  assert(getDemandMultiplier(0)    === 0,      'Zero occupancy = 0 multiplier');
  assert(getDemandMultiplier(1)    === 0.15,   'Full occupancy = 0.15 multiplier');
  assert(getDemandMultiplier(0.5)  === 0.075,  '50% occupancy = 0.075 multiplier');
  assert(getDemandMultiplier(-1)   === 0,      'Negative clamped to 0');
  assert(getDemandMultiplier(99)   === 0.15,   'Over 1.0 clamped to 0.15');

  // ------------------------------------------------------------------
  // Test 5: calculateDynamicPrice — no adjustments (weekday, no holiday, off-season)
  // ------------------------------------------------------------------
  console.log('\n--- Test 5: No adjustments (weekday, off-season) ---');
  const plain = calculateDynamicPrice(100, { date: '2025-03-10', occupancyRate: 0 }); // Monday, March
  assert(plain.basePrice === 100,   'Base price is 100');
  assert(plain.finalPrice === 100,  'Final price is 100 (no adjustments)');
  assert(plain.adjustmentPercent === 0, 'No adjustment percent');
  assert(plain.breakdown.length === 0,  'No breakdown entries');

  // ------------------------------------------------------------------
  // Test 6: Weekend pricing (+10%)
  // ------------------------------------------------------------------
  console.log('\n--- Test 6: Weekend pricing ---');
  const weekend = calculateDynamicPrice(100, { date: '2025-03-08', occupancyRate: 0 }); // Saturday
  assert(weekend.adjustmentPercent === 10, 'Weekend adds 10%');
  assert(weekend.finalPrice === 110,       'Final price is 110');
  assert(weekend.breakdown[0].factor === 'weekend', 'Weekend factor in breakdown');

  // ------------------------------------------------------------------
  // Test 7: Holiday pricing (+20%)
  // ------------------------------------------------------------------
  console.log('\n--- Test 7: Holiday pricing ---');
  const xmasPrice = calculateDynamicPrice(100, { date: '2025-12-25', occupancyRate: 0 });
  const hasHoliday = xmasPrice.breakdown.some(b => b.factor === 'holiday');
  assert(hasHoliday, 'Holiday factor in breakdown');
  const holidayBreakdown = xmasPrice.breakdown.find(b => b.factor === 'holiday');
  assert(holidayBreakdown.adjustmentPercent === 20, 'Holiday adds 20%');

  // ------------------------------------------------------------------
  // Test 8: Peak season pricing (+15%)
  // ------------------------------------------------------------------
  console.log('\n--- Test 8: Peak season pricing ---');
  const summer = calculateDynamicPrice(100, { date: '2025-07-10', occupancyRate: 0 }); // Thursday, July
  const hasPeak = summer.breakdown.some(b => b.factor === 'peakSeason');
  assert(hasPeak, 'Peak season factor in breakdown');
  const peakBreakdown = summer.breakdown.find(b => b.factor === 'peakSeason');
  assert(peakBreakdown.adjustmentPercent === 15, 'Peak season adds 15%');

  // ------------------------------------------------------------------
  // Test 9: Demand-based pricing
  // ------------------------------------------------------------------
  console.log('\n--- Test 9: Demand-based pricing ---');
  const highDemand = calculateDynamicPrice(200, { date: '2025-03-10', occupancyRate: 1 }); // 100% occupied
  const hasDemand = highDemand.breakdown.some(b => b.factor === 'demand');
  assert(hasDemand, 'Demand factor in breakdown');
  assert(highDemand.breakdown.find(b => b.factor === 'demand').adjustmentPercent === 15, 'Full demand adds 15%');

  // ------------------------------------------------------------------
  // Test 10: Combined adjustments
  // ------------------------------------------------------------------
  console.log('\n--- Test 10: Combined adjustments ---');
  // Christmas 2025 = Thursday, peak season, holiday, no weekend, demand=0
  const combined = calculateDynamicPrice(100, { date: '2025-12-25', occupancyRate: 0 });
  const pctSum = combined.breakdown.reduce((s, b) => s + b.adjustmentPercent, 0);
  assert(combined.adjustmentPercent === pctSum, 'adjustmentPercent equals sum of breakdown');
  assert(combined.finalPrice === Number((100 * (1 + pctSum / 100)).toFixed(2)), 'finalPrice computed correctly');

  // ------------------------------------------------------------------
  // Test 11: Price breakdown structure
  // ------------------------------------------------------------------
  console.log('\n--- Test 11: Price breakdown structure ---');
  const bd = calculateDynamicPrice(200, { date: '2025-07-12', occupancyRate: 0.5 }); // Saturday July
  bd.breakdown.forEach(item => {
    assert('factor' in item,            `factor present in ${item.factor}`);
    assert('adjustmentPercent' in item, `adjustmentPercent present in ${item.factor}`);
    assert('adjustmentReason' in item,  `adjustmentReason present in ${item.factor}`);
    assert('amount' in item,            `amount present in ${item.factor}`);
  });

  // ------------------------------------------------------------------
  // Test 12: Price freeze — create (fallback)
  // ------------------------------------------------------------------
  console.log('\n--- Test 12: Price freeze creation (fallback) ---');
  const freeze1 = createFreezeFallback(1, 'hotel', 1, 275.00);
  assert(freeze1.id > 0,                     'Freeze has an id');
  assert(freeze1.frozenPrice === 275.00,      'Frozen price is correct');
  assert(new Date(freeze1.expiresAt) > new Date(), 'Freeze expiry is in the future');

  // ------------------------------------------------------------------
  // Test 13: Get active freeze (fallback)
  // ------------------------------------------------------------------
  console.log('\n--- Test 13: Get active freeze (fallback) ---');
  const active = getActiveFallbackFreeze(1, 'hotel', 1);
  assert(active !== null,                'Active freeze found');
  assert(active.frozenPrice === 275.00,  'Correct frozen price retrieved');

  const noFreeze = getActiveFallbackFreeze(2, 'hotel', 1);
  assert(noFreeze === null, 'No freeze for different user');

  // ------------------------------------------------------------------
  // Test 14: Expired freeze not returned
  // ------------------------------------------------------------------
  console.log('\n--- Test 14: Expired freeze not returned ---');
  fallbackFreezes.push({
    id: 999, userId: 1, entityType: 'flight', entityId: 5,
    frozenPrice: 300, expiresAt: new Date(Date.now() - 1000).toISOString(), createdAt: new Date().toISOString(),
  });
  const expired = getActiveFallbackFreeze(1, 'flight', 5);
  assert(expired === null, 'Expired freeze not returned');

  // ------------------------------------------------------------------
  // Test 15: FREEZE_DURATION_MS is 30 minutes
  // ------------------------------------------------------------------
  console.log('\n--- Test 15: Freeze duration is 30 minutes ---');
  assert(FREEZE_DURATION_MS === 30 * 60 * 1000, 'Freeze duration is 30 minutes');

  // ------------------------------------------------------------------
  // Test 16: Controller — calculatePrice — missing fields
  // ------------------------------------------------------------------
  console.log('\n--- Test 16: calculatePrice controller validation ---');
  const res16a = mockRes();
  await calculatePrice(mockReq({ body: {} }), res16a);
  assert(res16a.statusCode === 400, 'Missing entityType/entityId → 400');

  const res16b = mockRes();
  await calculatePrice(mockReq({ body: { entityType: 'invalid', entityId: 1 } }), res16b);
  assert(res16b.statusCode === 400, 'Invalid entityType → 400');

  // ------------------------------------------------------------------
  // Test 17: Controller — freezePrice — auth required
  // ------------------------------------------------------------------
  console.log('\n--- Test 17: freezePrice requires auth ---');
  const res17 = mockRes();
  await freezePrice({ body: { entityType: 'hotel', entityId: 1 }, user: null }, res17);
  assert(res17.statusCode === 401, 'No user → 401');

  // ------------------------------------------------------------------
  // Test 18: Controller — getFrozenPrice — auth required
  // ------------------------------------------------------------------
  console.log('\n--- Test 18: getFrozenPrice requires auth ---');
  const res18 = mockRes();
  await getFrozenPrice({ params: { entityType: 'hotel', entityId: '1' }, user: null }, res18);
  assert(res18.statusCode === 401, 'No user → 401');

  // ------------------------------------------------------------------
  // Test 19: Controller — getFrozenPrice — invalid entityType
  // ------------------------------------------------------------------
  console.log('\n--- Test 19: getFrozenPrice invalid entityType ---');
  const res19 = mockRes();
  await getFrozenPrice(mockReq({ params: { entityType: 'car', entityId: '1' } }), res19);
  assert(res19.statusCode === 400, 'Invalid entityType → 400');

  // ------------------------------------------------------------------
  // Test 20: Controller — deleteFreeze — auth required
  // ------------------------------------------------------------------
  console.log('\n--- Test 20: deleteFreeze requires auth ---');
  const res20 = mockRes();
  await deleteFreeze({ params: { entityType: 'hotel', entityId: '1' }, user: null }, res20);
  assert(res20.statusCode === 401, 'No user → 401');

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log('\n====================================================');
  console.log('🎉 All dynamic pricing tests passed!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('\n❌ Dynamic Pricing Test Run Failed:', err.message || err);
  process.exit(1);
});
