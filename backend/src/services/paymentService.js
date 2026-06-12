export async function createPaymentRecord(data) {
  // Add payment processing logic here.
  return { id: 1, ...data, status: 'pending' };
}

export async function getBookingPayments(bookingId) {
  return [];
}
