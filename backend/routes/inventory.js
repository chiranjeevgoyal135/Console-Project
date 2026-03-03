// ============================================================
//  routes/inventory.js  —  Seller Inventory Routes
//
//  GET  /api/inventory          → fetch all inventory items
//  POST /api/inventory/update   → update stock via barcode
//    Body: { barcode, quantity, action }   action = "add" | "remove"
//
//  Interview explanation:
//    - GET is used to READ data (safe, no side effects)
//    - POST is used to MODIFY data
//    - We find the item by barcode (acts like a product ID)
//    - This simulates what a barcode scanner would trigger
// ============================================================

const express   = require("express");
const router    = express.Router();
const inventory = require("../data/inventory");

// GET /api/inventory  — return full inventory list
router.get("/", (req, res) => {
  res.status(200).json({ success: true, inventory });
});

// POST /api/inventory/update  — update stock by barcode
router.post("/update", (req, res) => {
  const { barcode, quantity, action } = req.body;

  if (!barcode || !quantity || !action) {
    return res.status(400).json({
      success: false,
      message: "barcode, quantity and action are required.",
    });
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: "Quantity must be a positive number." });
  }

  // Find the item with matching barcode
  const item = inventory.find((i) => i.id === barcode);
  if (!item) {
    return res.status(404).json({ success: false, message: "Product with this barcode not found." });
  }

  // Mutate the in-memory array (in production: update the database)
  if (action === "add") {
    item.stock += qty;
  } else if (action === "remove") {
    item.stock = Math.max(0, item.stock - qty);  // never go below 0
  } else {
    return res.status(400).json({ success: false, message: 'Action must be "add" or "remove".' });
  }

  return res.status(200).json({
    success: true,
    message: `Stock ${action === "add" ? "increased" : "decreased"} by ${qty}.`,
    updatedItem: item,
  });
});

module.exports = router;
