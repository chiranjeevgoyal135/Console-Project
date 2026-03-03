# ⚡ Smarter Blinkit

> An AI-powered grocery assistant with a smart buyer experience and a barcode-based seller inventory system.

---

## 📁 Project Structure

```
smarter-blinkit/
├── backend/                  ← Node.js + Express API server
│   ├── data/
│   │   ├── users.js          ← Mock user database
│   │   └── inventory.js      ← Mock product inventory
│   ├── routes/
│   │   ├── auth.js           ← POST /api/auth/login
│   │   ├── inventory.js      ← GET/POST /api/inventory
│   │   └── suggestions.js    ← GET /api/suggestions
│   ├── server.js             ← Entry point, registers all routes
│   └── package.json
│
├── frontend/                 ← React + Vite app
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js        ← All fetch() calls to backend
│   │   ├── pages/
│   │   │   ├── Login.jsx           ← Dual login (buyer/seller)
│   │   │   ├── BuyerDashboard.jsx  ← AI cart suggestions
│   │   │   └── SellerDashboard.jsx ← Barcode inventory manager
│   │   ├── App.jsx           ← Root component, screen router
│   │   └── main.jsx          ← ReactDOM entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 How to Run

### Step 1 — Start the Backend

```bash
cd backend
npm install
npm run dev
```

> Backend runs at: **http://localhost:5000**

---

### Step 2 — Start the Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs at: **http://localhost:5173**

---

## 🔑 Demo Login Credentials

| Role   | Email              | Password   |
|--------|--------------------|------------|
| Buyer  | buyer@test.com     | buyer123   |
| Seller | seller@test.com    | seller123  |

---

## 🛠️ Tech Stack

| Layer     | Technology         | Why                                      |
|-----------|--------------------|------------------------------------------|
| Frontend  | React 18 + Vite    | Fast, component-based UI                 |
| Backend   | Node.js + Express  | Lightweight REST API                     |
| Styling   | Inline CSS (React) | No extra dependency, easy to read        |
| Data      | In-memory JS arrays| Simple mock DB (replace with MongoDB)    |

---

## 🌟 Features

### 👤 Dual Login System
- Single login page with role toggle (Buyer / Seller)
- Backend validates credentials + role and returns user data
- Frontend routes to the correct dashboard based on role

### 🛒 Buyer — AI Smart Cart
- Type any symptom or occasion (e.g. "I have cold", "planning a party")
- Backend matches keywords and returns relevant product suggestions
- Add suggestions to cart, adjust quantities, see running total
- Debounced search (waits 500ms before calling API)

### 🏪 Seller — Barcode Inventory Manager
- Live inventory table with colour-coded stock status
- Enter any product barcode + quantity to add/remove stock
- Stats dashboard: total products, total stock, low stock alerts

---

## 📡 API Endpoints

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| POST   | /api/auth/login         | Validate login credentials         |
| GET    | /api/inventory          | Get all inventory items            |
| POST   | /api/inventory/update   | Update stock via barcode           |
| GET    | /api/suggestions?query= | Get AI product suggestions         |

---

## 🧪 Test Barcodes (for Seller)

| Barcode       | Product          |
|---------------|------------------|
| 8901234567890 | Amul Milk 500ml  |
| 8901234567892 | Honey 250g       |
| 8901234567894 | Coconut Water    |

---

## 🔮 Future Improvements

- [ ] Connect real AI (OpenAI / Gemini) for smarter suggestions
- [ ] Real camera-based barcode scanning (QuaggaJS / ZXing)
- [ ] MongoDB database instead of in-memory arrays
- [ ] JWT authentication tokens
- [ ] Order management and payment integration

---

## 👨‍💻 Interview Talking Points

**"Why separate frontend and backend?"**
> Separation of concerns — the frontend only handles UI, the backend handles data and logic. This makes it easier to scale, test, and maintain independently.

**"Why put API calls in one file (api.js)?"**
> Single source of truth. If the backend URL changes, we update one file, not every component.

**"What is debouncing in BuyerDashboard?"**
> Instead of calling the API on every keystroke, we wait 500ms after the user stops typing. This reduces unnecessary API calls and improves performance.

**"How would you make this production-ready?"**
> Add bcrypt for password hashing, JWT tokens for sessions, MongoDB for persistent storage, and connect to a real AI API for smarter suggestions.
