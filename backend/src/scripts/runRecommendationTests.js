import {
  fallbackFeedback,
  generateRecommendations,
  storeFeedback,
} from '../services/recommendationService.js';
import { getRecommendations, submitFeedback } from '../controllers/recommendationController.js';

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
  console.log('🚀 Running Recommendation Feature Tests...');
  console.log('====================================================\n');

  // Clear fallback store
  fallbackFeedback.length = 0;

  // ------------------------------------------------------------------
  // Test 1: generateRecommendations — no history → fallback top picks
  // ------------------------------------------------------------------
  console.log('--- Test 1: No booking history → fallback recommendations ---');
  const { recommendations: recs1, hasHistory: h1 } = await generateRecommendations(99999);
  assert(Array.isArray(recs1), 'recommendations is an array');
  assert(h1 === false, 'hasHistory is false for new user');

  // ------------------------------------------------------------------
  // Test 2: Each recommendation has required fields
  // ------------------------------------------------------------------
  console.log('\n--- Test 2: Recommendation object structure ---');
  const { recommendations: recs2 } = await generateRecommendations(99999);
  if (recs2.length > 0) {
    const r = recs2[0];
    assert('type' in r,   'recommendation has type');
    assert('entity' in r, 'recommendation has entity');
    assert('reason' in r, 'recommendation has reason');
    assert('score' in r,  'recommendation has score');
    assert(['hotel', 'flight', 'destination'].includes(r.type), 'type is valid enum value');
  } else {
    console.log('  (No candidates in DB — structure test skipped)');
  }

  // ------------------------------------------------------------------
  // Test 3: storeFeedback — helpful (fallback)
  // ------------------------------------------------------------------
  console.log('\n--- Test 3: storeFeedback helpful (fallback) ---');
  const id3 = await storeFeedback({ userId: 1, recommendationType: 'hotel', entityId: 5, destination: null, feedback: 'helpful' });
  assert(id3 > 0, 'storeFeedback returns a positive id');
  assert(fallbackFeedback.length === 1, 'fallback store has 1 entry');
  assert(fallbackFeedback[0].feedback === 'helpful', 'feedback value is helpful');
  assert(fallbackFeedback[0].entityId === 5, 'entityId stored correctly');

  // ------------------------------------------------------------------
  // Test 4: storeFeedback — irrelevant (fallback)
  // ------------------------------------------------------------------
  console.log('\n--- Test 4: storeFeedback irrelevant (fallback) ---');
  const id4 = await storeFeedback({ userId: 1, recommendationType: 'flight', entityId: 2, destination: null, feedback: 'irrelevant' });
  assert(id4 > 0, 'storeFeedback returns a positive id');
  assert(fallbackFeedback.length === 2, 'fallback store has 2 entries');
  assert(fallbackFeedback[1].feedback === 'irrelevant', 'feedback value is irrelevant');

  // ------------------------------------------------------------------
  // Test 5: storeFeedback — upsert replaces old feedback
  // ------------------------------------------------------------------
  console.log('\n--- Test 5: storeFeedback upserts (replaces old) ---');
  await storeFeedback({ userId: 1, recommendationType: 'hotel', entityId: 5, destination: null, feedback: 'irrelevant' });
  const hotelFeedbacks = fallbackFeedback.filter(f => f.userId === 1 && f.recommendationType === 'hotel' && f.entityId === 5);
  assert(hotelFeedbacks.length === 1, 'Only one feedback entry per user+item');
  assert(hotelFeedbacks[0].feedback === 'irrelevant', 'Feedback updated to irrelevant');

  // ------------------------------------------------------------------
  // Test 6: storeFeedback — destination type
  // ------------------------------------------------------------------
  console.log('\n--- Test 6: storeFeedback for destination type ---');
  const id6 = await storeFeedback({ userId: 1, recommendationType: 'destination', entityId: null, destination: 'Bali, Indonesia', feedback: 'helpful' });
  assert(id6 > 0, 'destination feedback stored');
  const destFeedback = fallbackFeedback.find(f => f.destination === 'Bali, Indonesia');
  assert(destFeedback !== undefined, 'Destination feedback found in store');
  assert(destFeedback.feedback === 'helpful', 'Destination feedback value correct');

  // ------------------------------------------------------------------
  // Test 7: Controller — getRecommendations — unauthorized
  // ------------------------------------------------------------------
  console.log('\n--- Test 7: getRecommendations — unauthorized ---');
  const res7 = mockRes();
  await getRecommendations({ user: null }, res7);
  assert(res7.statusCode === 401, 'No user → 401');

  // ------------------------------------------------------------------
  // Test 8: Controller — getRecommendations — authorized
  // ------------------------------------------------------------------
  console.log('\n--- Test 8: getRecommendations — authorized ---');
  const res8 = mockRes();
  await getRecommendations(mockReq({ user: { id: 99999 } }), res8);
  assert(res8.statusCode === 200, 'Status 200');
  assert(Array.isArray(res8.body.recommendations), 'body.recommendations is array');
  assert('hasHistory' in res8.body, 'body.hasHistory present');

  // ------------------------------------------------------------------
  // Test 9: Controller — submitFeedback — unauthorized
  // ------------------------------------------------------------------
  console.log('\n--- Test 9: submitFeedback — unauthorized ---');
  const res9 = mockRes();
  await submitFeedback({ user: null, body: {} }, res9);
  assert(res9.statusCode === 401, 'No user → 401');

  // ------------------------------------------------------------------
  // Test 10: Controller — submitFeedback — missing fields
  // ------------------------------------------------------------------
  console.log('\n--- Test 10: submitFeedback — missing fields ---');
  const res10a = mockRes();
  await submitFeedback(mockReq({ body: {} }), res10a);
  assert(res10a.statusCode === 400, 'Missing recommendationType+feedback → 400');

  const res10b = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'hotel', feedback: 'helpful' } }), res10b);
  assert(res10b.statusCode === 400, 'Missing entityId for hotel → 400');

  const res10c = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'destination', feedback: 'helpful' } }), res10c);
  assert(res10c.statusCode === 400, 'Missing destination for destination type → 400');

  // ------------------------------------------------------------------
  // Test 11: Controller — submitFeedback — invalid values
  // ------------------------------------------------------------------
  console.log('\n--- Test 11: submitFeedback — invalid values ---');
  const res11a = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'car', entityId: 1, feedback: 'helpful' } }), res11a);
  assert(res11a.statusCode === 400, 'Invalid recommendationType → 400');

  const res11b = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'hotel', entityId: 1, feedback: 'meh' } }), res11b);
  assert(res11b.statusCode === 400, 'Invalid feedback value → 400');

  // ------------------------------------------------------------------
  // Test 12: Controller — submitFeedback — valid hotel feedback
  // ------------------------------------------------------------------
  console.log('\n--- Test 12: submitFeedback — valid hotel feedback ---');
  const res12 = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'hotel', entityId: 3, feedback: 'helpful' } }), res12);
  assert(res12.statusCode === 201, 'Valid hotel feedback → 201');
  assert(res12.body.message === 'Feedback recorded.', 'Success message present');
  assert(res12.body.id > 0, 'Feedback id returned');

  // ------------------------------------------------------------------
  // Test 13: Controller — submitFeedback — valid flight feedback
  // ------------------------------------------------------------------
  console.log('\n--- Test 13: submitFeedback — valid flight feedback ---');
  const res13 = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'flight', entityId: 2, feedback: 'irrelevant' } }), res13);
  assert(res13.statusCode === 201, 'Valid flight feedback → 201');

  // ------------------------------------------------------------------
  // Test 14: Controller — submitFeedback — valid destination feedback
  // ------------------------------------------------------------------
  console.log('\n--- Test 14: submitFeedback — valid destination feedback ---');
  const res14 = mockRes();
  await submitFeedback(mockReq({ body: { recommendationType: 'destination', destination: 'Bali, Indonesia', feedback: 'helpful' } }), res14);
  assert(res14.statusCode === 201, 'Valid destination feedback → 201');

  // ------------------------------------------------------------------
  // Test 15: generateRecommendations returns stable structure
  // ------------------------------------------------------------------
  console.log('\n--- Test 15: generateRecommendations response shape ---');
  const { recommendations: recs15, hasHistory: h15 } = await generateRecommendations(1);
  assert(Array.isArray(recs15), 'recommendations is array');
  assert(typeof h15 === 'boolean', 'hasHistory is boolean');
  for (const r of recs15) {
    assert(typeof r.type === 'string', `type is string (${r.type})`);
    assert(typeof r.reason === 'string', `reason is string for ${r.type}`);
    assert(typeof r.score === 'number', `score is number for ${r.type}`);
    assert(r.entity !== null && typeof r.entity === 'object', `entity is object for ${r.type}`);
  }

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log('\n====================================================');
  console.log('🎉 All recommendation tests passed!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('\n❌ Recommendation Test Run Failed:', err.message || err);
  process.exit(1);
});
