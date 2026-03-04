require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const authRoutes        = require("./routes/auth");
const inventoryRoutes   = require("./routes/inventory");
const suggestionsRoutes = require("./routes/suggestions");
const shopsRoutes       = require("./routes/shops");
const paymentRoutes     = require("./routes/payment");

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth",        authRoutes);
app.use("/api/inventory",   inventoryRoutes);
app.use("/api/suggestions", suggestionsRoutes);
app.use("/api/shops",       shopsRoutes);
app.use("/api/payment",     paymentRoutes);

app.get("/", (req, res) => res.json({ message: "Smarter Blinkit API running ✅" }));

app.listen(PORT, () => {
  console.log("Backend running at http://localhost:" + PORT);
  console.log("Groq Key:      ", process.env.GROQ_API_KEY       ? "YES ✅" : "NO ❌");
  console.log("Razorpay Key:  ", process.env.RAZORPAY_KEY_ID    ? "YES ✅" : "NO ❌ (mock mode)");
});