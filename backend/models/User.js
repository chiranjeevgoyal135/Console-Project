// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },   // plain text for demo; bcrypt in production
  name:     { type: String, required: true },
  role:     { type: String, enum: ["buyer","seller","owner"], required: true },
  shopId:   { type: String, default: null },     // sellers only
  shopName: { type: String, default: null },     // sellers only
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);