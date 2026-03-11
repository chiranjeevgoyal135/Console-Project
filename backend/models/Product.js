// backend/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  barcode:  { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  category: { type: String, required: true },
  price:    { type: Number, required: true },
  stock:    { type: Number, default: 0 },
  unit:     { type: String, default: "unit" },
  emoji:    { type: String, default: "📦" },
  shopId:   { type: String, default: "global" }, // "global" = shared catalog
}, { timestamps: true });

productSchema.index({ shopId: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model("Product", productSchema);