require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());

app.use("/api/auth",             require("./routes/auth"));
app.use("/api/inventory",        require("./routes/inventory"));
app.use("/api/suggestions",      require("./routes/suggestions"));
app.use("/api/shops",            require("./routes/shops"));
app.use("/api/payment",          require("./routes/payment"));
app.use("/api/recipe",           require("./routes/recipe"));
app.use("/api/similar",          require("./routes/similar"));
app.use("/api/cart-suggestions", require("./routes/cart-suggestions"));

app.get("/", (req, res) => res.json({ message: "Smarter Blinkit API ✅" }));

app.listen(PORT, () => {
  console.log("Backend at http://localhost:" + PORT);
  console.log("Groq:    ", process.env.GROQ_API_KEY    ? "✅" : "❌");
  console.log("Neo4j:   ", process.env.NEO4J_URI        ? "✅" : "❌ (fallback)");
  console.log("Razorpay:", process.env.RAZORPAY_KEY_ID  ? "✅" : "❌ (mock)");
});