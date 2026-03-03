// ============================================================
//  App.jsx  —  Root Component (Screen Router)
//
//  Interview explanation:
//    - This is the top-level component. It manages which screen
//      is currently visible using a `screen` state variable.
//    - We pass `setScreen` down to child pages so they can
//      trigger navigation (e.g. after login, after logout)
//    - This is "state-based routing" — simple alternative to
//      react-router for smaller apps
// ============================================================

import { useState } from "react";
import Login          from "./pages/Login.jsx";
import BuyerDashboard  from "./pages/BuyerDashboard.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";

export default function App() {
  // `screen` decides which page to show: "login" | "buyer" | "seller"
  const [screen, setScreen] = useState("login");

  // `user` stores the logged-in user's info (name, email, role)
  const [user, setUser]     = useState(null);

  // Called by Login page after successful API response
  function handleLoginSuccess(userData) {
    setUser(userData);
    setScreen(userData.role);   // route to "buyer" or "seller"
  }

  // Called by dashboard pages when user clicks Logout
  function handleLogout() {
    setUser(null);
    setScreen("login");
  }

  if (screen === "buyer")  return <BuyerDashboard  user={user} onLogout={handleLogout} />;
  if (screen === "seller") return <SellerDashboard user={user} onLogout={handleLogout} />;
  return <Login onLoginSuccess={handleLoginSuccess} />;
}
