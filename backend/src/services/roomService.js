const fallbackHotels = [
  { id: 1, name: 'Luxury Sunset Resort', location: 'Miami', description: 'A beautiful beachfront resort with stunning sunset views.', pricePerNight: 250.00, rating: 4.8, availableRooms: 50 },
  { id: 2, name: 'Mountain View Lodge', location: 'Denver', description: 'Cozy mountain lodge perfect for outdoor enthusiasts.', pricePerNight: 150.00, rating: 4.5, availableRooms: 30 },
  { id: 3, name: 'Downtown Urban Hotel', location: 'New York', description: 'Modern hotel in the heart of Manhattan with easy access to attractions.', pricePerNight: 300.00, rating: 4.6, availableRooms: 40 },
  { id: 4, name: 'Tropical Paradise Hotel', location: 'Hawaii', description: 'Island getaway with pristine beaches and water sports.', pricePerNight: 200.00, rating: 4.9, availableRooms: 35 },
  { id: 5, name: 'Desert Oasis Resort', location: 'Phoenix', description: 'Luxury desert resort with spa and golf course.', pricePerNight: 180.00, rating: 4.4, availableRooms: 25 },
];

export const fallbackRooms = [];
export let roomIdCounter = 1;

// Generate fallback rooms for the fallback hotels if they don't exist yet
if (fallbackRooms.length === 0) {
  const roomTypes = [
    { type: 'Standard', multiplier: 1.0, count: 15, img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=800' },
    { type: 'Deluxe', multiplier: 1.5, count: 10, img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800' },
    { type: 'Suite', multiplier: 2.5, count: 5, img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800' }
  ];
  
  for (const hotel of fallbackHotels) {
    for (const rt of roomTypes) {
      const roomPrice = Number((hotel.pricePerNight * rt.multiplier).toFixed(2));
      fallbackRooms.push({
        id: roomIdCounter++,
        hotelId: hotel.id,
        roomType: rt.type,
        price: roomPrice,
        imageUrl: rt.img,
        availability: rt.count,
        createdAt: new Date().toISOString()
      });
    }
  }
}
