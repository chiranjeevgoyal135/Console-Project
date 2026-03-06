const express = require("express");
const router  = express.Router();
const users   = require("../data/users");

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success:false, message:"Email and password are required." });
  }
  // Match on email + password only — role comes from the DB, not the frontend
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success:false, message:"Wrong email or password." });
  }
  const { password: _pw, ...safeUser } = user;
  return res.status(200).json({ success:true, user: safeUser });
});

module.exports = router;