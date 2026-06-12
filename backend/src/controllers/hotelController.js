import pool from '../config/db.js';

// Fallback in-memory hotels
export const fallbackHotels = [
  { id: 1, name: 'Luxury Sunset Resort', location: 'Miami', description: 'A beautiful beachfront resort with stunning sunset views.', pricePerNight: 250.00, rating: 4.8, availableRooms: 50 },
  { id: 2, name: 'Mountain View Lodge', location: 'Denver', description: 'Cozy mountain lodge perfect for outdoor enthusiasts.', pricePerNight: 150.00, rating: 4.5, availableRooms: 30 },
  { id: 3, name: 'Downtown Urban Hotel', location: 'New York', description: 'Modern hotel in the heart of Manhattan with easy access to attractions.', pricePerNight: 300.00, rating: 4.6, availableRooms: 40 },
  { id: 4, name: 'Tropical Paradise Hotel', location: 'Hawaii', description: 'Island getaway with pristine beaches and water sports.', pricePerNight: 200.00, rating: 4.9, availableRooms: 35 },
  { id: 5, name: 'Desert Oasis Resort', location: 'Phoenix', description: 'Luxury desert resort with spa and golf course.', pricePerNight: 180.00, rating: 4.4, availableRooms: 25 },
];

export async function listHotels(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, name, location, description, price_per_night AS pricePerNight, rating, available_rooms AS availableRooms FROM hotels');
    return res.json({ hotels: rows });
  } catch (err) {
    console.warn('Using fallback hotels (DB unavailable)');
    return res.json({ hotels: fallbackHotels });
  }
}

export async function getHotel(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, location, description, price_per_night AS pricePerNight, rating, available_rooms AS availableRooms FROM hotels WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }
    return res.json({ hotel: rows[0] });
  } catch (err) {
    console.warn('Using fallback hotel (DB unavailable)');
    const hotel = fallbackHotels.find(h => h.id === Number(req.params.id));
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }
    return res.json({ hotel });
  }
}
