import db from '../db.js';

export const ReviewReply = {
  create: async ({reviewId, userId, replyText}) => {
    const [result] = await db.execute(
      `INSERT INTO review_replies (review_id, user_id, reply_text) VALUES (?,?,?)`,
      [reviewId, userId, replyText]
    );
    return result.insertId;
  },
  listByReview: async (reviewId) => {
    const [rows] = await db.execute(`SELECT * FROM review_replies WHERE review_id = ? ORDER BY created_at ASC`, [reviewId]);
    return rows;
  }
};
