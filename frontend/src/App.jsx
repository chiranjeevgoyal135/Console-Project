import { useState } from "react";
import Login          from "./pages/Login.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import Storeboard     from "./pages/Storeboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);

  function handleLogin(userData) { setUser(userData); }
  function handleLogout()        { setUser(null); }

  if (!user) return <Login onLogin={handleLogin} />;
  if (user.role === "buyer")  return <BuyerDashboard  user={user} onLogout={handleLogout} />;
  if (user.role === "seller") return <SellerDashboard user={user} onLogout={handleLogout} />;
  if (user.role === "owner")  return <Storeboard      user={user} onLogout={handleLogout} />;

  return <Login onLogin={handleLogin} />;
}