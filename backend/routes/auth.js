const express = require("express");
const router  = express.Router();
const users   = require("../data/users");

router.post("/login", (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: "Email, password and role are required." });
  }
  const user = users.find(u => u.email === email && u.password === password && u.role === role);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials. Please check email, password and role." });
  }
  const { password: _pw, ...safeUser } = user;
  return res.status(200).json({ success: true, user: safeUser });
});

module.exports = router;