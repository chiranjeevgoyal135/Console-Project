// backend/routes/auth.js  (MongoDB version)
const express = require("express");
const router  = express.Router();
const User    = require("../models/User");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success:false, message:"Email and password are required." });

  try {
    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user)
      return res.status(401).json({ success:false, message:"Wrong email or password." });

    const { password: _pw, __v, ...safeUser } = user.toObject();
    return res.status(200).json({ success:true, user: safeUser });
  } catch (err) {
    return res.status(500).json({ success:false, message:"Server error." });
  }
});

module.exports = router;