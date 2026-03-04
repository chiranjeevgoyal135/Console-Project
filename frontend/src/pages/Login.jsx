import { useState } from "react";
import { loginUser } from "../api/api.js";

export default function Login({ onLoginSuccess }) {
  const [role,     setRole]     = useState("buyer");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Please enter both email and password."); return; }
    setError(""); setLoading(true);
    try {
      const data = await loginUser(email, password, role);
      if (!data.success) setError(data.message || "Login failed.");
      else onLoginSuccess(data.user);
    } catch { setError("Cannot reach server. Make sure backend is running on port 5000."); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.card}>
        <div style={s.logoRow}>
          <span style={s.logoIcon}>⚡</span>
          <span style={s.logoText}>Smarter<span style={s.logoAccent}>Blinkit</span></span>
        </div>
        <p style={s.tagline}>India's smartest grocery assistant</p>
        <div style={s.toggleWrap}>
          {["buyer", "seller"].map(r => (
            <button key={r} style={{ ...s.toggleBtn, ...(role === r ? s.toggleActive : {}) }}
              onClick={() => { setRole(r); setError(""); }}>
              {r === "buyer" ? "🛒 I'm a Buyer" : "🏪 I'm a Seller"}
            </button>
          ))}
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Email Address</label>
          <input style={s.input} type="email"
            placeholder={role === "buyer" ? "buyer@test.com" : "seller@test.com"}
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Password</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...s.input, paddingRight: 44 }}
              type={showPass ? "text" : "password"}
              placeholder={role === "buyer" ? "buyer123" : "seller123"}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <button style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        {error && <div style={s.errorBox}>{error}</div>}
        <button style={s.loginBtn} onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : `Login as ${role === "buyer" ? "Buyer" : "Seller"} →`}
        </button>
        <div style={s.demoBox}>
          <span style={s.demoTitle}>🧪 Demo Credentials</span>
          <span style={s.demoText}>
            {role === "buyer" ? "buyer@test.com / buyer123" : "seller@test.com / seller123"}
          </span>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:         { minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", position: "relative", overflow: "hidden" },
  blob1:        { position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #f6a62344 0%, transparent 70%)", top: "-100px", right: "-100px", pointerEvents: "none" },
  blob2:        { position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #5bc47a33 0%, transparent 70%)", bottom: "-80px", left: "-80px", pointerEvents: "none" },
  card:         { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 420, position: "relative", zIndex: 1, boxShadow: "0 25px 60px #0009" },
  logoRow:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  logoIcon:     { fontSize: 28, filter: "drop-shadow(0 0 8px #f6a623)" },
  logoText:     { fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -1 },
  logoAccent:   { color: "#f6a623" },
  tagline:      { color: "#666", fontSize: 13, marginBottom: 28, marginTop: 0 },
  toggleWrap:   { display: "flex", gap: 8, marginBottom: 24, background: "#111", borderRadius: 12, padding: 4 },
  toggleBtn:    { flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: "transparent", color: "#888", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  toggleActive: { background: "#f6a623", color: "#000" },
  formGroup:    { marginBottom: 16 },
  label:        { display: "block", color: "#aaa", fontSize: 13, marginBottom: 6, fontWeight: 500 },
  input:        { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" },
  eyeBtn:       { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18 },
  errorBox:     { background: "#2a1111", border: "1px solid #5a1a1a", color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
  loginBtn:     { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #f6a623, #f97316)", color: "#000", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 16 },
  demoBox:      { background: "#111", border: "1px dashed #333", borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 },
  demoTitle:    { color: "#666", fontSize: 12, fontWeight: 600 },
  demoText:     { color: "#f6a623", fontSize: 13, fontFamily: "monospace" },
};