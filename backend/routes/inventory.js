// backend/routes/inventory.js  (MongoDB version)
const express = require("express");
const router  = express.Router();
const Product = require("../models/Product");

// GET /api/inventory — all products (optionally filter by shopId)
router.get("/", async (req, res) => {
  try {
    const filter = req.query.shopId ? { shopId: req.query.shopId } : {};
    const inventory = await Product.find(filter).lean();
    res.json({ success:true, inventory });
  } catch (err) {
    res.status(500).json({ success:false, message:"DB error." });
  }
});

// GET /api/inventory/barcode/:code
router.get("/barcode/:code", async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.code }).lean();
    if (!product) return res.status(404).json({ success:false, message:"Barcode not found." });
    res.json({ success:true, product });
  } catch (err) {
    res.status(500).json({ success:false, message:"DB error." });
  }
});

// POST /api/inventory/update — update stock
router.post("/update", async (req, res) => {
  const { barcode, action, quantity } = req.body;
  const qty = parseInt(quantity);
  if (!barcode || !action || isNaN(qty) || qty < 0)
    return res.status(400).json({ success:false, message:"barcode, action and quantity required." });

  try {
    const product = await Product.findOne({ barcode });
    if (!product) return res.status(404).json({ success:false, message:"Barcode not found." });

    const before = product.stock;
    if      (action === "add")      product.stock = Math.max(0, product.stock + qty);
    else if (action === "subtract") product.stock = Math.max(0, product.stock - qty);
    else if (action === "set")      product.stock = qty;
    else return res.status(400).json({ success:false, message:"action must be add, subtract or set." });

    await product.save();
    console.log(`Stock update: ${product.name} | ${before} → ${product.stock} (${action} ${qty})`);
    res.json({ success:true, product, before, after: product.stock });
  } catch (err) {
    res.status(500).json({ success:false, message:"DB error." });
  }
});

// POST /api/inventory/add — add new product (seller adds custom product)
router.post("/add", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json({ success:true, product });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success:false, message:"Barcode already exists." });
    res.status(500).json({ success:false, message:"DB error." });
  }
});

module.exports = router;