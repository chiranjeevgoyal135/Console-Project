// ============================================================
//  data/users.js  —  Mock User Database
//  In a real app this would be a MongoDB / PostgreSQL database.
//  For now we store users in a plain JS array.
// ============================================================

const users = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "buyer@test.com",
    password: "buyer123",   // In real apps: always hash passwords with bcrypt
    role: "buyer",
  },
  {
    id: 2,
    name: "Mohan Stores",
    email: "seller@test.com",
    password: "seller123",
    role: "seller",
  },
];

module.exports = users;
