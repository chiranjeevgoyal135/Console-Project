// backend/models/Sale.js
const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  shopId:      { type: String, required: true },
  shopName:    { type: String, required: true },
  city:        { type: String, required: true },
  productName: { type: String, required: true },
  category:    { type: String, required: true },
  price:       { type: Number, required: true },
  emoji:       { type: String, default: "📦" },
  qty:         { type: Number, default: 1 },
  buyer:       { type: String, default: "Guest" },
  isLive:      { type: Boolean, default: false },
  timestamp:   { type: Date, default: Date.now },
}, { timestamps: true });

saleSchema.index({ shopId: 1, timestamp: -1 });
saleSchema.index({ timestamp: -1 });
saleSchema.index({ category: 1 });

module.exports = mongoose.model("Sale", saleSchema);