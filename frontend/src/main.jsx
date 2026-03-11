import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

const style = document.createElement("style");
style.textContent = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  * { box-sizing: border-box; }
  body { margin: 0; }

  /* ── Global scrollbar theme ── */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #060c1a;
  }
  ::-webkit-scrollbar-thumb {
    background: #1a2d45;
    border-radius: 6px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #2563eb;
  }
  ::-webkit-scrollbar-corner {
    background: #060c1a;
  }

  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: #1a2d45 #060c1a;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);