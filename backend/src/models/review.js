import db from '../db.js';

export const Review = {
  create: async ({ userId, hotelId, flightId, rating, reviewText, photoUrl }) => {
    const [result] = await db.execute(
      `INSERT INTO reviews (user_id, hotel_id, flight_id, rating, review_text, photo_url) VALUES (?,?,?,?,?,?)`,
      [userId, hotelId, flightId, rating, reviewText, photoUrl]
    );
    return result.insertId;
  },
  findById: async (id) => {
    const [rows] = await db.execute(`SELECT * FROM reviews WHERE id = ?`, [id]);
    return rows[0];
  },
  list: async ({ productId, productType, sort, limit = 20, offset = 0 }) => {
    const column = productType === 'hotel' ? 'hotel_id' : 'flight_id';
    let orderClause = '';
    if (sort === 'newest') orderClause = 'ORDER BY created_at DESC';
    else if (sort === 'rating_desc') orderClause = 'ORDER BY rating DESC';
    else if (sort === 'helpful') orderClause = 'ORDER BY helpful_count DESC';
    const [rows] = await db.execute(
      `SELECT * FROM reviews WHERE ${column} = ? ${orderClause} LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );
    return rows;
  },
  addHelpful: async (id) => {
    await db.execute(`UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?`, [id]);
  },
  flag: async (reviewId, userId, reason) => {
    await db.execute(
      `INSERT INTO review_flags (review_id, user_id, reason) VALUES (?,?,?)`,
      [reviewId, userId, reason]
    );
  }
};
