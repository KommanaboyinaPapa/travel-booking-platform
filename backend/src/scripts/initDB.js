import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbHost = process.env.DB_HOST || 'localhost';
const isLocalHost = dbHost === 'localhost' || dbHost === '127.0.0.1';

const connection = await mysql.createConnection({
  host: dbHost,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
  ...(!isLocalHost ? { ssl: {} } : {}),
});

try {
  console.log('🔧 Initializing database...');

  // Read and execute schema.sql
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await connection.query(schema);
  console.log('✓ Schema created');

  // Use the database
  await connection.query(`USE travel_booking_db`);

  // Seed hotels
  const hotelsData = [
    ["Luxury Sunset Resort", "Miami", "A beautiful beachfront resort with stunning sunset views.", 250.00, 4.8, 50],
    ["Mountain View Lodge", "Denver", "Cozy mountain lodge perfect for outdoor enthusiasts.", 150.00, 4.5, 30],
    ["Downtown Urban Hotel", "New York", "Modern hotel in the heart of Manhattan with easy access to attractions.", 300.00, 4.6, 40],
    ["Tropical Paradise Hotel", "Hawaii", "Island getaway with pristine beaches and water sports.", 200.00, 4.9, 35],
    ["Desert Oasis Resort", "Phoenix", "Luxury desert resort with spa and golf course.", 180.00, 4.4, 25],
  ];

  for (const hotel of hotelsData) {
    const [result] = await connection.query(
      'INSERT INTO hotels (name, location, description, price_per_night, rating, available_rooms) VALUES (?, ?, ?, ?, ?, ?)',
      hotel
    );
    
    const hotelId = result.insertId;
    const basePrice = hotel[3]; // price_per_night is at index 3

    // Seed rooms
    const roomTypes = [
      { type: 'Standard', multiplier: 1.0, count: 15, img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=800' },
      { type: 'Deluxe', multiplier: 1.5, count: 10, img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800' },
      { type: 'Suite', multiplier: 2.5, count: 5, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800' }
    ];

    for (const rt of roomTypes) {
      const roomPrice = (basePrice * rt.multiplier).toFixed(2);
      await connection.query(
        'INSERT INTO rooms (hotel_id, room_type, price, image_url, availability) VALUES (?, ?, ?, ?, ?)',
        [hotelId, rt.type, roomPrice, rt.img, rt.count]
      );
    }
  }
  console.log('✓ Hotels and rooms seeded');

  // Seed flights
  const flightsData = [
    ["United Airlines", "New York", "Miami", new Date('2026-06-20 08:00:00'), new Date('2026-06-20 11:00:00'), 150.00, 100],
    ["American Airlines", "Los Angeles", "Denver", new Date('2026-06-21 10:00:00'), new Date('2026-06-21 12:30:00'), 120.00, 80],
    ["Delta Airlines", "Chicago", "New York", new Date('2026-06-20 14:00:00'), new Date('2026-06-20 17:00:00'), 180.00, 120],
    ["Southwest Airlines", "Las Vegas", "Hawaii", new Date('2026-06-22 06:00:00'), new Date('2026-06-22 10:00:00'), 200.00, 150],
    ["JetBlue Airways", "Boston", "Fort Lauderdale", new Date('2026-06-19 09:00:00'), new Date('2026-06-19 13:00:00'), 110.00, 90],
  ];

  const flightStatuses = [
    ['On Time', 'No delay reported.', new Date('2026-06-20 08:00:00'), new Date('2026-06-20 11:00:00')],
    ['Boarding', 'Boarding in progress at the assigned gate.', new Date('2026-06-21 10:00:00'), new Date('2026-06-21 12:30:00')],
    ['Delayed by 1h', 'Late arrival of the incoming aircraft.', new Date('2026-06-20 15:00:00'), new Date('2026-06-20 18:00:00')],
    ['On Time', 'No delay reported.', new Date('2026-06-22 06:00:00'), new Date('2026-06-22 10:00:00')],
    ['Boarding', 'Passengers are currently boarding through the main gate.', new Date('2026-06-19 09:00:00'), new Date('2026-06-19 13:00:00')],
  ];

  for (const [index, flight] of flightsData.entries()) {
    const [result] = await connection.query(
      'INSERT INTO flights (airline, origin, destination, departure_time, arrival_time, price, seats_available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      flight
    );

    const flightId = result.insertId;
    const basePrice = flight[5]; // index 5 is price

    const [status, delayReason, revisedDepartureTime, estimatedArrival] = flightStatuses[index];
    await connection.query(
      'INSERT INTO flight_status (flight_id, status, delay_reason, revised_departure_time, estimated_arrival) VALUES (?, ?, ?, ?, ?)',
      [flightId, status, delayReason, revisedDepartureTime, estimatedArrival]
    );

    // Seed seats
    const seatColumns = ['A', 'B', 'C', 'D', 'E', 'F'];
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

      const seatPrice = (basePrice * priceMultiplier).toFixed(2);

      for (const col of seatColumns) {
        const seatNumber = `${row}${col}`;
        const seatStatus = Math.random() < 0.15 ? 'booked' : 'available';

        await connection.query(
          'INSERT INTO seats (flight_id, seat_number, type, price, status) VALUES (?, ?, ?, ?, ?)',
          [flightId, seatNumber, type, seatPrice, seatStatus]
        );
      }
    }
  }
  console.log('✓ Flights, flight statuses, and seats seeded');

  // Create price_history table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type ENUM('hotel', 'flight') NOT NULL,
      entity_id INT NOT NULL,
      old_price DECIMAL(10,2) NOT NULL,
      new_price DECIMAL(10,2) NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_entity (entity_type, entity_id),
      INDEX idx_changed_at (changed_at)
    )
  `);

  // Seed baseline price history for hotels
  const [seededHotels] = await connection.query('SELECT id, price_per_night FROM hotels');
  for (const hotel of seededHotels) {
    await connection.query(
      'INSERT INTO price_history (entity_type, entity_id, old_price, new_price) VALUES (?, ?, ?, ?)',
      ['hotel', hotel.id, hotel.price_per_night, hotel.price_per_night]
    );
  }

  // Seed baseline price history for flights
  const [seededFlights] = await connection.query('SELECT id, price FROM flights');
  for (const flight of seededFlights) {
    await connection.query(
      'INSERT INTO price_history (entity_type, entity_id, old_price, new_price) VALUES (?, ?, ?, ?)',
      ['flight', flight.id, flight.price, flight.price]
    );
  }
  console.log('✓ Price history baseline seeded');

  console.log('\n✓ Database initialized successfully!');
  console.log('✓ Ready to use at:', `mysql://${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_NAME}`);
} catch (err) {
  console.error('✗ Database initialization failed:', err.message);
  process.exit(1);
} finally {
  await connection.end();
}
