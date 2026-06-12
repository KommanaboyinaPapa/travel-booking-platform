import {
  fallbackReviews,
  fallbackReplies,
  fallbackFlags,
  createReview,
  listReviews,
  addReply,
  markHelpful,
  flagReview
} from '../controllers/reviewController.js';
import {
  getFlaggedReviews,
  removeReview
} from '../controllers/adminController.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✓ ${message}`);
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
    }
  };
}

async function runReviewTests() {
  console.log('====================================================');
  console.log('🚀 Running Review and Rating System Tests...');
  console.log('====================================================\n');

  // Clear fallback stores for a clean test run
  fallbackReviews.length = 0;
  fallbackReplies.length = 0;
  fallbackFlags.length = 0;

  const mockUser = { id: 42, name: 'Test User' };
  const mockAdmin = { id: 1, name: 'Admin User', role: 'admin' };

  // ----------------------------------------------------
  // Cases 1, 3, 4: Create review (Text, Rating, Photo)
  // ----------------------------------------------------
  console.log('--- Cases 1, 3, 4: Create review (Text, Rating, Photo) ---');
  let req = { 
    user: mockUser, 
    body: { hotelId: 1, rating: 5, reviewText: 'Great!', photoUrl: 'http://img.com/a.jpg' } 
  };
  let res = mockRes();
  await createReview(req, res);
  assert(res.statusCode === 201, 'Review created successfully (201)');
  assert(res.body.review.rating === 5, 'Rating is 5');
  assert(res.body.review.reviewText === 'Great!', 'Text review matches');
  assert(res.body.review.photoUrl === 'http://img.com/a.jpg', 'Photo URL matches');
  const reviewId1 = res.body.id;

  // ----------------------------------------------------
  // Case 2: Validate rating bounds
  // ----------------------------------------------------
  console.log('\n--- Case 2: Validate rating bounds ---');
  req = { user: mockUser, body: { hotelId: 1, rating: 6, reviewText: 'Too good!' } };
  res = mockRes();
  await createReview(req, res);
  assert(res.statusCode === 400, 'Rating > 5 rejected with 400');

  req = { user: mockUser, body: { hotelId: 1, rating: 0, reviewText: 'Too bad!' } };
  res = mockRes();
  await createReview(req, res);
  assert(res.statusCode === 400, 'Rating < 1 rejected with 400');

  // ----------------------------------------------------
  // Case 15: Missing required fields
  // ----------------------------------------------------
  console.log('\n--- Case 15: Missing required fields ---');
  req = { user: mockUser, body: { rating: 4, reviewText: 'No target entity' } };
  res = mockRes();
  await createReview(req, res);
  assert(res.statusCode === 400, 'Missing hotelId/flightId rejected with 400');

  req = { user: mockUser, body: { hotelId: 1, rating: 4 } };
  res = mockRes();
  await createReview(req, res);
  assert(res.statusCode === 400, 'Missing reviewText rejected with 400');

  // Seed a second review to test sorting
  await createReview({ user: mockUser, body: { hotelId: 1, rating: 3, reviewText: 'Okay' } }, mockRes());
  
  // Manipulate creation dates to reliably test sorting (mocking DB behavior)
  fallbackReviews[0].createdAt = '2026-06-01T10:00:00Z'; // 5 stars (older)
  fallbackReviews[1].createdAt = '2026-06-02T10:00:00Z'; // 3 stars (newer)
  const reviewId2 = fallbackReviews[1].id;

  // ----------------------------------------------------
  // Case 10: Mark review as helpful
  // ----------------------------------------------------
  console.log('\n--- Case 10: Mark review as helpful ---');
  req = { params: { id: reviewId2 } };
  res = mockRes();
  await markHelpful(req, res);
  assert(res.statusCode === 200, 'Marked helpful successfully');
  assert(fallbackReviews[1].helpfulCount === 1, 'Helpful count incremented for review 2');

  // ----------------------------------------------------
  // Cases 5, 6, 7, 8: List reviews and sort
  // ----------------------------------------------------
  console.log('\n--- Cases 5, 6, 7, 8: List & Sort Reviews ---');
  
  // Sort by newest
  req = { query: { hotelId: 1, sortBy: 'newest' } };
  res = mockRes();
  await listReviews(req, res);
  assert(res.statusCode === 200, 'List reviews returns 200');
  assert(res.body.reviews[0].id === reviewId2, 'Newest sort places Review 2 first');
  
  // Sort by highest rated
  req = { query: { hotelId: 1, sortBy: 'highest' } };
  res = mockRes();
  await listReviews(req, res);
  assert(res.body.reviews[0].id === reviewId1, 'Highest rated sort places Review 1 (5 stars) first');

  // Sort by most helpful
  req = { query: { hotelId: 1, sortBy: 'helpful' } };
  res = mockRes();
  await listReviews(req, res);
  assert(res.body.reviews[0].id === reviewId2, 'Most helpful sort places Review 2 (1 vote) first');

  // ----------------------------------------------------
  // Case 9: Add reply to review
  // ----------------------------------------------------
  console.log('\n--- Case 9: Add reply to review ---');
  req = { user: mockUser, params: { id: reviewId1 }, body: { replyText: 'Thank you!' } };
  res = mockRes();
  await addReply(req, res);
  assert(res.statusCode === 201, 'Reply added successfully (201)');
  assert(fallbackReplies.length === 1, 'Reply persists in data store');

  // ----------------------------------------------------
  // Case 11: Flag inappropriate review
  // ----------------------------------------------------
  console.log('\n--- Case 11: Flag inappropriate review ---');
  req = { user: mockUser, params: { id: reviewId1 }, body: { reason: 'Spam content' } };
  res = mockRes();
  await flagReview(req, res);
  assert(res.statusCode === 201, 'Review flagged successfully (201)');
  assert(fallbackFlags.length === 1, 'Flag persists in data store');

  // ----------------------------------------------------
  // Case 12: Admin fetches flagged reviews
  // ----------------------------------------------------
  console.log('\n--- Case 12: Admin fetches flagged reviews ---');
  req = { user: mockAdmin };
  res = mockRes();
  await getFlaggedReviews(req, res);
  assert(res.statusCode === 200, 'Admin fetches flagged reviews (200)');
  assert(res.body.flaggedReviews.length === 1, 'One flagged review retrieved');
  assert(res.body.flaggedReviews[0].flagReason === 'Spam content', 'Flag reason is correct');

  // ----------------------------------------------------
  // Case 13: Admin deletes flagged review
  // ----------------------------------------------------
  console.log('\n--- Case 13: Admin deletes flagged review ---');
  req = { user: mockAdmin, params: { id: reviewId1 } };
  res = mockRes();
  await removeReview(req, res);
  assert(res.statusCode === 200, 'Review deleted successfully (200)');
  assert(fallbackReviews.length === 1, 'Only one review remains in store (Review 2)');
  assert(fallbackReplies.length === 0, 'Cascading delete removed related replies');
  assert(fallbackFlags.length === 0, 'Cascading delete removed related flags');

  // ----------------------------------------------------
  // Case 14: Invalid review id returns error
  // ----------------------------------------------------
  console.log('\n--- Case 14: Invalid review id returns error ---');
  req = { user: mockAdmin, params: { id: 9999 } };
  res = mockRes();
  await removeReview(req, res);
  assert(res.statusCode === 404, 'Deleting invalid review returns 404');
  
  req = { params: { id: 9999 } };
  res = mockRes();
  await markHelpful(req, res);
  assert(res.statusCode === 404, 'Marking invalid review helpful returns 404');

  console.log('\n====================================================');
  console.log('🎉 All 15 review tests passed successfully!');
  console.log('====================================================');
}

runReviewTests().catch(err => {
  console.error('\n❌ Test Run Failed:', err);
  process.exit(1);
});
