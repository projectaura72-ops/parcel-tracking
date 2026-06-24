const TrackingHistory = require('../models/TrackingHistory');

exports.getTrackingHistory = async (req, res, next) => {
  try {
    const history = await TrackingHistory.find({ parcelId: req.params.parcelId })
      .populate('carrierId', 'name email')
      .sort('timestamp');

    res.json(history);
  } catch (err) {
    next(err);
  }
};
