// routes/shops.js
// GET /api/shops/nearest?lat=XX&lng=YY
// Returns all shops sorted by distance using Haversine formula

const express = require("express");
const router  = express.Router();
const shops   = require("../data/shops");

// Haversine formula: calculates real-world km between two GPS points
// Accounts for Earth's curvature — standard in location-based apps
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/nearest", (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, message: "lat and lng required." });
  }

  const sorted = shops
    .map(shop => {
      const km = haversineKm(lat, lng, shop.lat, shop.lng);
      return {
        ...shop,
        distanceKm:    parseFloat(km.toFixed(1)),
        // Delivery time = base + 1 extra minute per 2km of distance
        deliveryMins:  shop.baseDeliveryMins + Math.round(km / 2),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return res.status(200).json({
    success:  true,
    nearest:  sorted[0],
    allShops: sorted,
  });
});

module.exports = router;