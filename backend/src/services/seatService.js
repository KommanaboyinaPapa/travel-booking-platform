import { fallbackFlights } from './flightService.js';

export const fallbackSeats = [];
export let seatIdCounter = 1;

// Generate fallback seats for the fallback flights if they don't exist yet
if (fallbackSeats.length === 0) {
  const seatColumns = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  for (const flight of fallbackFlights) {
    for (let row = 1; row <= 20; row++) {
      let type = 'economy';
      let priceMultiplier = 1.0;

      if (row <= 3) {
        type = 'business';
        priceMultiplier = 1.8;
      } else if (row <= 6) {
        type = 'premium';
        priceMultiplier = 1.4;
      }

      const seatPrice = Number((flight.price * priceMultiplier).toFixed(2));

      for (const col of seatColumns) {
        const seatNumber = `${row}${col}`;
        const seatStatus = Math.random() < 0.15 ? 'booked' : 'available';

        fallbackSeats.push({
          id: seatIdCounter++,
          flightId: flight.id,
          seatNumber,
          type,
          price: seatPrice,
          status: seatStatus,
          createdAt: new Date().toISOString()
        });
      }
    }
  }
}
