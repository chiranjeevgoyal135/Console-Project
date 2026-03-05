// data/users.js
// Sellers are now linked to a specific shop ID
// In production this would be a database

const users = [
  // Buyers
  { id: "b1", email: "buyer@test.com",   password: "buyer123",  role: "buyer",  name: "Rahul Sharma"  },
  { id: "b2", email: "buyer2@test.com",  password: "buyer123",  role: "buyer",  name: "Priya Singh"   },

  // Sellers — each linked to a shop
  { id: "s1", email: "seller@test.com",  password: "seller123", role: "seller", name: "Amit Verma",   shopId: "shop_1", shopName: "QuickMart Delhi"     },
  { id: "s2", email: "seller2@test.com", password: "seller123", role: "seller", name: "Neha Gupta",   shopId: "shop_2", shopName: "Blinkit Hub Mumbai"  },
  { id: "s3", email: "seller3@test.com", password: "seller123", role: "seller", name: "Ravi Kumar",   shopId: "shop_3", shopName: "Zepto Express Bangalore" },
];

module.exports = users;