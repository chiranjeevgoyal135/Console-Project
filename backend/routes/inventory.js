// routes/inventory.js
const express   = require("express");
const router    = express.Router();
const inventory = require("../data/inventory");

// GET /api/inventory — return all products
router.get("/", (req, res) => {
  res.json({ success: true, inventory });
});

// GET /api/inventory/barcode/:code — look up single product by barcode
router.get("/barcode/:code", (req, res) => {
  const product = inventory.find(p => p.barcode === req.params.code);
  if (!product) return res.status(404).json({ success: false, message: "Barcode not found in system." });
  res.json({ success: true, product });
});

// POST /api/inventory/update — update stock for one barcode
// body: { barcode, action: "add"|"set"|"subtract", quantity }
router.post("/update", (req, res) => {
  const { barcode, action, quantity } = req.body;
  const qty = parseInt(quantity);

  if (!barcode || !action || isNaN(qty) || qty < 0) {
    return res.status(400).json({ success: false, message: "barcode, action and quantity required." });
  }

  const product = inventory.find(p => p.barcode === barcode);
  if (!product) return res.status(404).json({ success: false, message: "Barcode not found." });

  const before = product.stock;
  if      (action === "add")      product.stock = Math.max(0, product.stock + qty);
  else if (action === "subtract") product.stock = Math.max(0, product.stock - qty);
  else if (action === "set")      product.stock = qty;
  else return res.status(400).json({ success: false, message: "action must be add, subtract or set." });

  console.log(`Stock update: ${product.name} | ${before} → ${product.stock} (${action} ${qty})`);
  res.json({ success: true, product, before, after: product.stock });
});

// POST /api/inventory/bulk — update multiple barcodes at once
// body: { updates: [{ barcode, action, quantity }] }
router.post("/bulk", (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ success: false, message: "updates array required." });

  const results = [];
  for (const u of updates) {
    const product = inventory.find(p => p.barcode === u.barcode);
    if (!product) { results.push({ barcode: u.barcode, success: false, message: "Not found" }); continue; }
    const before = product.stock;
    const qty    = parseInt(u.quantity) || 0;
    if      (u.action === "add")      product.stock = Math.max(0, product.stock + qty);
    else if (u.action === "subtract") product.stock = Math.max(0, product.stock - qty);
    else if (u.action === "set")      product.stock = qty;
    results.push({ barcode: u.barcode, name: product.name, before, after: product.stock, success: true });
  }
  res.json({ success: true, results });
});

module.exports = router;