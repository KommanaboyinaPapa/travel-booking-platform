import {
  getHotelPriceHistory as fetchHotelHistory,
  getFlightPriceHistory as fetchFlightHistory,
  updateEntityPrice,
} from '../services/priceHistoryService.js';

// GET /api/price-history/hotels/:hotelId
export async function getHotelPriceHistory(req, res) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await fetchHotelHistory(req.params.hotelId, { limit, offset });
    return res.json(result);
  } catch (err) {
    console.error('Error fetching hotel price history:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}

// GET /api/price-history/flights/:flightId
export async function getFlightPriceHistory(req, res) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await fetchFlightHistory(req.params.flightId, { limit, offset });
    return res.json(result);
  } catch (err) {
    console.error('Error fetching flight price history:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}

// PUT /api/price-history/update
export async function updatePrice(req, res) {
  try {
    const { entityType, entityId, newPrice } = req.body;

    if (!entityType || !entityId || newPrice === undefined || newPrice === null) {
      return res.status(400).json({ message: 'Missing required fields: entityType, entityId, newPrice.' });
    }

    const result = await updateEntityPrice(entityType, entityId, newPrice);

    if (!result.changed) {
      return res.json({
        message: 'Price is already at the requested value. No change recorded.',
        oldPrice: result.oldPrice,
        newPrice: result.newPrice,
      });
    }

    return res.json({
      message: `Price updated successfully for ${entityType} #${entityId}.`,
      oldPrice: result.oldPrice,
      newPrice: result.newPrice,
    });
  } catch (err) {
    console.error('Error updating price:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
}
