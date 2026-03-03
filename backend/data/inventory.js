// ============================================================
//  data/inventory.js  —  Mock Inventory Database
//  Stored as a module-level array so updates persist during
//  the server session (resets on restart — fine for a demo).
// ============================================================

let inventory = [
  { id: "8901234567890", name: "Amul Milk 500ml",  stock: 48, price: 28,  emoji: "🥛", category: "Dairy"     },
  { id: "8901234567891", name: "Brown Bread",       stock: 22, price: 45,  emoji: "🍞", category: "Bakery"    },
  { id: "8901234567892", name: "Honey 250g",         stock: 5,  price: 120, emoji: "🍯", category: "Health"    },
  { id: "8901234567893", name: "Chips Variety Pack", stock: 33, price: 120, emoji: "🍟", category: "Snacks"    },
  { id: "8901234567894", name: "Coconut Water",      stock: 0,  price: 40,  emoji: "🥥", category: "Beverages" },
];

module.exports = inventory;
