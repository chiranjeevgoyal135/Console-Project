// ============================================================
//  routes/auth.js  —  Authentication Routes
//
//  POST /api/auth/login
//    Body:  { email, password, role }
//    Returns: { success, user } or { success: false, message }
//
//  Interview explanation:
//    - "router" is a mini Express app for grouping related routes
//    - We match the email + password against our mock user list
//    - In production we'd use bcrypt to compare hashed passwords
//      and return a JWT token for session management
// ============================================================

const express = require("express");
const router  = express.Router();
const users   = require("../data/users");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  // Validate that all fields were sent
  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Email, password and role are required.",
    });
  }

  // Find user matching email, password AND role
  const user = users.find(
    (u) => u.email === email && u.password === password && u.role === role
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials. Please check email, password and role.",
    });
  }

  // Don't send password back to frontend — security best practice
  const { password: _pw, ...safeUser } = user;

  return res.status(200).json({
    success: true,
    user: safeUser,
  });
});

module.exports = router;
