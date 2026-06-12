import pool from '../config/db.js';

export const fallbackReviews = [];
export const fallbackReplies = [];
export const fallbackFlags = [];

function getEntityIds(source = {}) {
  return {
    hotelId: source.hotelId ? Number(source.hotelId) : null,
    flightId: source.flightId ? Number(source.flightId) : null,
  };
}

function getSortClause(sortBy = 'newest') {
  if (sortBy === 'highest') return 'ORDER BY r.rating DESC, r.created_at DESC';
  if (sortBy === 'helpful') return 'ORDER BY r.helpful_count DESC, r.created_at DESC';
  return 'ORDER BY r.created_at DESC';
}

function mapReplyRow(reply) {
  return {
    id: reply.id,
    reviewId: Number(reply.reviewId ?? reply.review_id),
    userId: Number(reply.userId ?? reply.user_id),
    userName: reply.userName ?? reply.name ?? `User #${reply.userId ?? reply.user_id}`,
    replyText: reply.replyText ?? reply.reply_text,
    createdAt: reply.createdAt ?? reply.created_at,
  };
}

function mapReviewRow(review, replies = []) {
  return {
    id: review.id,
    userId: Number(review.userId ?? review.user_id),
    userName: review.userName ?? review.name ?? `User #${review.userId ?? review.user_id}`,
    hotelId: review.hotelId ?? review.hotel_id ?? null,
    flightId: review.flightId ?? review.flight_id ?? null,
    rating: Number(review.rating),
    reviewText: review.reviewText ?? review.review_text,
    photoUrl: review.photoUrl ?? review.photo_url ?? null,
    helpfulCount: Number(review.helpfulCount ?? review.helpful_count ?? 0),
    createdAt: review.createdAt ?? review.created_at,
    replies: replies.map(mapReplyRow),
  };
}

function nextId(collection) {
  return collection.length > 0 ? Math.max(...collection.map((item) => Number(item.id))) + 1 : 1;
}

export async function createReview(req, res) {
  const userId = req.user?.id;
  const userName = req.user?.name || `User #${userId}`;
  const rating = Number(req.body.rating);
  const reviewText = (req.body.reviewText ?? req.body.review_text ?? '').trim();
  const photoUrl = req.body.photoUrl ?? req.body.photo_url ?? null;
  const { hotelId, flightId } = getEntityIds(req.body);

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }
  if (!reviewText) {
    return res.status(400).json({ message: 'Review text is required.' });
  }
  if (!hotelId && !flightId) {
    return res.status(400).json({ message: 'A hotel or flight review target is required.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO reviews (user_id, hotel_id, flight_id, rating, review_text, photo_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, hotelId, flightId, rating, reviewText, photoUrl]
    );

    return res.status(201).json({
      id: result.insertId,
      review: {
        id: result.insertId,
        userId,
        userName,
        hotelId,
        flightId,
        rating,
        reviewText,
        photoUrl,
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        replies: [],
      },
    });
  } catch (err) {
    console.warn('DB error, creating review in fallback store:', err.message || err);

    const review = {
      id: nextId(fallbackReviews),
      userId,
      userName,
      hotelId,
      flightId,
      rating,
      reviewText,
      photoUrl,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    fallbackReviews.push(review);

    return res.status(201).json({ id: review.id, review: { ...review, replies: [] } });
  }
}

export async function listReviews(req, res) {
  const { hotelId, flightId } = getEntityIds(req.query);
  const sortBy = req.query.sortBy || req.query.sort || 'newest';
  const limit = Number(req.query.limit || 20);
  const offset = Number(req.query.offset || 0);

  if (!hotelId && !flightId) {
    return res.status(400).json({ message: 'hotelId or flightId is required.' });
  }

  try {
    const targetColumn = hotelId ? 'r.hotel_id' : 'r.flight_id';
    const targetId = hotelId || flightId;
    const sortClause = getSortClause(sortBy);

    const [reviewRows] = await pool.execute(
      `SELECT r.id, r.user_id, r.hotel_id, r.flight_id, r.rating, r.review_text, r.photo_url,
              r.helpful_count, r.created_at, u.name AS userName
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE ${targetColumn} = ?
       ${sortClause}
       LIMIT ? OFFSET ?`,
      [targetId, limit, offset]
    );

    const reviews = await Promise.all(
      reviewRows.map(async (review) => {
        const [replyRows] = await pool.execute(
          `SELECT rr.id, rr.review_id, rr.user_id, rr.reply_text, rr.created_at, u.name AS userName
           FROM review_replies rr
           JOIN users u ON u.id = rr.user_id
           WHERE rr.review_id = ?
           ORDER BY rr.created_at ASC`,
          [review.id]
        );
        return mapReviewRow(review, replyRows);
      })
    );

    return res.status(200).json({ reviews });
  } catch (err) {
    console.warn('DB error, loading reviews from fallback store:', err.message || err);

    const reviews = fallbackReviews
      .filter((review) => (hotelId ? review.hotelId === hotelId : review.flightId === flightId))
      .map((review) => ({
        ...review,
        replies: fallbackReplies.filter((reply) => reply.reviewId === review.id),
      }));

    reviews.sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'helpful') return b.helpfulCount - a.helpfulCount || new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({ reviews: reviews.slice(offset, offset + limit) });
  }
}

export async function addReply(req, res) {
  const userId = req.user?.id;
  const userName = req.user?.name || `User #${userId}`;
  const reviewId = Number(req.params.id);
  const replyText = (req.body.replyText ?? req.body.reply_text ?? '').trim();

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (!replyText) {
    return res.status(400).json({ message: 'Reply text is required.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO review_replies (review_id, user_id, reply_text) VALUES (?, ?, ?)`,
      [reviewId, userId, replyText]
    );

    return res.status(201).json({
      id: result.insertId,
      reply: {
        id: result.insertId,
        reviewId,
        userId,
        userName,
        replyText,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('DB error, creating reply in fallback store:', err.message || err);

    const reply = {
      id: nextId(fallbackReplies),
      reviewId,
      userId,
      userName,
      replyText,
      createdAt: new Date().toISOString(),
    };
    fallbackReplies.push(reply);

    return res.status(201).json({ id: reply.id, reply });
  }
}

export async function markHelpful(req, res) {
  const reviewId = Number(req.params.id);

  try {
    await pool.execute(`UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?`, [reviewId]);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.warn('DB error, incrementing helpful count in fallback store:', err.message || err);

    const review = fallbackReviews.find((item) => item.id === reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.helpfulCount += 1;
    return res.status(200).json({ success: true, helpfulCount: review.helpfulCount });
  }
}

export async function flagReview(req, res) {
  const userId = req.user?.id;
  const reviewId = Number(req.params.id);
  const reason = (req.body.reason || '').trim();

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (!reason) {
    return res.status(400).json({ message: 'Flag reason is required.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO review_flags (review_id, user_id, reason) VALUES (?, ?, ?)`,
      [reviewId, userId, reason]
    );
    return res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    console.warn('DB error, flagging review in fallback store:', err.message || err);

    const flag = {
      id: nextId(fallbackFlags),
      reviewId,
      userId,
      reason,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    fallbackFlags.push(flag);

    return res.status(201).json({ id: flag.id, success: true });
  }
}
