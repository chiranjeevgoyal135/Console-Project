require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const authRoutes        = require("./routes/auth");
const inventoryRoutes   = require("./routes/inventory");
const suggestionsRoutes = require("./routes/suggestions");

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth",        authRoutes);
app.use("/api/inventory",   inventoryRoutes);
app.use("/api/suggestions", suggestionsRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Smarter Blinkit API is running" });
});

app.listen(PORT, () => {
  console.log("Backend running at http://localhost:" + PORT);
  console.log("Groq Key loaded:", process.env.GROQ_API_KEY ? "YES" : "NO - add GROQ_API_KEY to .env");
});