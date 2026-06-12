import { generateRecommendations, storeFeedback } from '../services/recommendationService.js';

// GET /api/recommendations
export async function getRecommendations(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const { recommendations, hasHistory } = await generateRecommendations(userId);
    return res.json({ recommendations, hasHistory });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal server error.' });
  }
}

// POST /api/recommendations/feedback
export async function submitFeedback(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const { recommendationType, entityId, destination, feedback } = req.body;

    if (!recommendationType || !feedback) {
      return res.status(400).json({ message: 'Missing required fields: recommendationType, feedback.' });
    }
    if (!['hotel', 'flight', 'destination'].includes(recommendationType)) {
      return res.status(400).json({ message: 'Invalid recommendationType.' });
    }
    if (!['helpful', 'irrelevant'].includes(feedback)) {
      return res.status(400).json({ message: 'feedback must be "helpful" or "irrelevant".' });
    }
    if (recommendationType !== 'destination' && !entityId) {
      return res.status(400).json({ message: 'entityId required for hotel/flight recommendations.' });
    }
    if (recommendationType === 'destination' && !destination) {
      return res.status(400).json({ message: 'destination required for destination recommendations.' });
    }

    const id = await storeFeedback({ userId, recommendationType, entityId: entityId || null, destination: destination || null, feedback });
    return res.status(201).json({ message: 'Feedback recorded.', id });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal server error.' });
  }
}
