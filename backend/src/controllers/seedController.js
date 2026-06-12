import pool from '../config/db.js';

export async function seedDatabase(req, res) {
  // Simple auth check - allow only from localhost for safety
  const isLocalhost = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === 'localhost';
  if (!isLocalhost && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Seeding only allowed from localhost.' });
  }

  try {
    // Check if hotels already seeded
    const [hotelRows] = await pool.query('SELECT COUNT(*) as count FROM hotels');
    if (hotelRows[0].count > 0) {
      return res.json({ message: 'Database already seeded.' });
    }

    // Seed hotels
    const hotelsData = [
      ["Luxury Sunset Resort", "Miami", "A beautiful beachfront resort with stunning sunset views.", 250.00, 4.8, 50],
      ["Mountain View Lodge", "Denver", "Cozy mountain lodge perfect for outdoor enthusiasts.", 150.00, 4.5, 30],
      ["Downtown Urban Hotel", "New York", "Modern hotel in the heart of Manhattan with easy access to attractions.", 300.00, 4.6, 40],
      ["Tropical Paradise Hotel", "Hawaii", "Island getaway with pristine beaches and water sports.", 200.00, 4.9, 35],
      ["Desert Oasis Resort", "Phoenix", "Luxury desert resort with spa and golf course.", 180.00, 4.4, 25],
    ];

    for (const hotel of hotelsData) {
      await pool.query(
        'INSERT INTO hotels (name, location, description, price_per_night, rating, available_rooms) VALUES (?, ?, ?, ?, ?, ?)',
        hotel
      );
    }

    // Seed flights
    const flightsData = [
      ["United Airlines", "New York", "Miami", new Date('2026-06-20 08:00:00'), new Date('2026-06-20 11:00:00'), 150.00, 100],
      ["American Airlines", "Los Angeles", "Denver", new Date('2026-06-21 10:00:00'), new Date('2026-06-21 12:30:00'), 120.00, 80],
      ["Delta Airlines", "Chicago", "New York", new Date('2026-06-20 14:00:00'), new Date('2026-06-20 17:00:00'), 180.00, 120],
      ["Southwest Airlines", "Las Vegas", "Hawaii", new Date('2026-06-22 06:00:00'), new Date('2026-06-22 10:00:00'), 200.00, 150],
      ["JetBlue Airways", "Boston", "Fort Lauderdale", new Date('2026-06-19 09:00:00'), new Date('2026-06-19 13:00:00'), 110.00, 90],
    ];

    for (const flight of flightsData) {
      await pool.query(
        'INSERT INTO flights (airline, origin, destination, departure_time, arrival_time, price, seats_available) VALUES (?, ?, ?, ?, ?, ?, ?)',
        flight
      );
    }

    return res.json({ message: 'Database seeded successfully with hotels and flights.' });
  } catch (err) {
    console.error('Error seeding database:', err);
    return res.status(500).json({ message: 'Error seeding database.', error: err.message });
  }
}
