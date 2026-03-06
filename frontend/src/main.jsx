import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Global animation keyframes
const style = document.createElement("style");
style.textContent = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  * { box-sizing: border-box; }
  body { margin: 0; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);