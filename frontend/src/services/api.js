const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchFromApi(path, options = {}) {
  const token = localStorage.getItem('travel_token');
  const isFormData = options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

export async function loginUser(credentials) {
  return fetchFromApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function registerUser(payload) {
  return fetchFromApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getHotels() {
  return fetchFromApi('/hotels');
}

export async function getFlights() {
  return fetchFromApi('/flights');
}

export async function getFlightStatus(flightId) {
  return fetchFromApi(`/flights/${flightId}/status`);
}

export async function getBookings() {
  return fetchFromApi('/bookings');
}

export async function createBooking(payload) {
  return fetchFromApi('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelBooking(bookingId, reason) {
  return fetchFromApi(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getRefundDetails(bookingId) {
  return fetchFromApi(`/refunds/${bookingId}`);
}

export async function createReview(payload) {
  return fetchFromApi('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getReviews(params = {}) {
  const query = new URLSearchParams();
  if (params.hotelId) query.append('hotelId', params.hotelId);
  if (params.flightId) query.append('flightId', params.flightId);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  return fetchFromApi(`/reviews?${query.toString()}`);
}

export async function createReply(reviewId, replyText) {
  return fetchFromApi(`/reviews/${reviewId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ replyText }),
  });
}

export async function markReviewHelpful(reviewId) {
  return fetchFromApi(`/reviews/${reviewId}/helpful`, { method: 'POST' });
}

export async function flagReview(reviewId, reason) {
  return fetchFromApi(`/reviews/${reviewId}/flag`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getFlaggedReviews() {
  return fetchFromApi('/admin/flagged');
}

export async function updateFlagStatus(flagId, status) {
  return fetchFromApi(`/admin/flags/${flagId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteReviewAsAdmin(reviewId) {
  return fetchFromApi(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
}

export async function getSeatsForFlight(flightId) {
  return fetchFromApi(`/seats/flight/${flightId}`);
}

export async function getSeatDetails(seatId) {
  return fetchFromApi(`/seats/${seatId}`);
}

export async function bookSeat(seatId) {
  return fetchFromApi(`/seats/${seatId}/book`, { method: 'POST' });
}

export async function releaseSeat(seatId) {
  return fetchFromApi(`/seats/${seatId}/release`, { method: 'POST' });
}

export async function getRoomsForHotel(hotelId) {
  return fetchFromApi(`/rooms/hotel/${hotelId}`);
}

export async function getRoomDetails(roomId) {
  return fetchFromApi(`/rooms/${roomId}`);
}

export async function bookRoom(roomId) {
  return fetchFromApi(`/rooms/${roomId}/book`, { method: 'POST' });
}

export async function releaseRoom(roomId) {
  return fetchFromApi(`/rooms/${roomId}/release`, { method: 'POST' });
}

export async function calculateDynamicPrice(entityType, entityId, date) {
  return fetchFromApi('/pricing/calculate', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId, date }),
  });
}

export async function freezePrice(entityType, entityId) {
  return fetchFromApi('/pricing/freeze', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId }),
  });
}

export async function getFrozenPrice(entityType, entityId) {
  return fetchFromApi(`/pricing/freeze/${entityType}/${entityId}`);
}

export async function deleteFrozenPrice(entityType, entityId) {
  return fetchFromApi(`/pricing/freeze/${entityType}/${entityId}`, { method: 'DELETE' });
}

// entityType: 'hotel' -> /price-history/hotels/:id  |  'flight' -> /price-history/flights/:id
export async function getPriceHistory(entityType, entityId, limit = 30) {
  const segment = entityType === 'hotel' ? 'hotels' : 'flights';
  return fetchFromApi(`/price-history/${segment}/${entityId}?limit=${limit}`);
}

export async function getRecommendations() {
  return fetchFromApi('/recommendations');
}

export async function submitRecommendationFeedback(payload) {
  return fetchFromApi('/recommendations/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Admin Refund Management
export async function getAllRefunds() {
  return fetchFromApi('/admin/refunds');
}

export async function updateRefundStatus(refundId, status) {
  return fetchFromApi(`/admin/refunds/${refundId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getRefundAnalytics() {
  return fetchFromApi('/admin/refunds/analytics');
}
