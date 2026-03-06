// Login.jsx — handles buyer, seller, owner login
import { useState } from "react";

export default function Login({ onLogin }) {
  const [role,     setRole]     = useState("buyer");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const DEMO = {
    buyer:  { email:"buyer@test.com",  password:"buyer123"  },
    seller: { email:"seller@test.com", password:"seller123" },
    owner:  { email:"owner@test.com",  password:"owner123"  },
  };

  async function handleLogin() {
    setError(""); setLoading(true);
    try {
      const res  = await fetch("http://localhost:5000/api/auth/login", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email, password }), // role is determined server-side
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || "Wrong email or password.");
      }
    } catch(e) {
      setError("Cannot reach server. Is backend running?");
    }
    setLoading(false);
  }

  function fillDemo() {
    setEmail(DEMO[role].email);
    setPassword(DEMO[role].password);
  }

  const roleConfig = {
    buyer:  { icon:"🛒", label:"Buyer",  color:"#f6a623" },
    seller: { icon:"🏪", label:"Seller", color:"#3b82f6" },
    owner:  { icon:"👑", label:"Owner",  color:"#7c3aed" },
  };

  return (
    <div style={s.page}>
      <div style={s.blob1}/><div style={s.blob2}/>
      <div style={s.card}>
        <div style={s.logoRow}>
          <span style={s.logoIcon}>⚡</span>
          <span style={s.logoText}>Smarter<span style={s.logoAccent}>Blinkit</span></span>
        </div>
        <p style={s.tagline}>India's smartest grocery assistant</p>

        {/* Role tabs */}
        <div style={s.tabs}>
          {Object.entries(roleConfig).map(([r, cfg]) => (
            <button key={r}
              style={{...s.tab,...(role===r?{...s.tabActive,background:cfg.color,color:"#fff"}:{})}}
              onClick={()=>{setRole(r);setEmail(DEMO[r].email);setPassword(DEMO[r].password);setError("");}}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        <div style={s.formGroup}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder={DEMO[role].email}
            value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Password</label>
          <div style={{position:"relative"}}>
            <input style={{...s.input,paddingRight:44}} type={showPass?"text":"password"}
              placeholder={DEMO[role].password} value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            <button style={s.eye} onClick={()=>setShowPass(!showPass)}>{showPass?"🙈":"👁️"}</button>
          </div>
        </div>

        {error && <div style={s.err}>{error}</div>}

        <button style={{...s.loginBtn,background:`linear-gradient(135deg,${roleConfig[role].color},${roleConfig[role].color}cc)`}}
          onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : `Login as ${roleConfig[role].label} →`}
        </button>

        <div style={s.demoBox} onClick={fillDemo}>
          <span style={s.demoTitle}>🧪 Click to fill demo credentials</span>
          <span style={s.demoText}>{DEMO[role].email} / {DEMO[role].password}</span>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       {minHeight:"100vh",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif",position:"relative",overflow:"hidden"},
  blob1:      {position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#f6a62344 0%,transparent 70%)",top:"-100px",right:"-100px",pointerEvents:"none"},
  blob2:      {position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,#7c3aed33 0%,transparent 70%)",bottom:"-80px",left:"-80px",pointerEvents:"none"},
  card:       {background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:420,position:"relative",zIndex:1,boxShadow:"0 25px 60px #0009"},
  logoRow:    {display:"flex",alignItems:"center",gap:10,marginBottom:4},
  logoIcon:   {fontSize:28,filter:"drop-shadow(0 0 8px #f6a623)"},
  logoText:   {fontSize:26,fontWeight:800,color:"#fff",letterSpacing:-1},
  logoAccent: {color:"#f6a623"},
  tagline:    {color:"#666",fontSize:13,marginBottom:24,marginTop:0},
  tabs:       {display:"flex",gap:6,marginBottom:24,background:"#111",borderRadius:12,padding:4},
  tab:        {flex:1,padding:"9px 0",borderRadius:9,border:"none",background:"transparent",color:"#888",fontSize:13,fontWeight:600,cursor:"pointer"},
  tabActive:  {color:"#fff"},
  formGroup:  {marginBottom:16},
  label:      {display:"block",color:"#aaa",fontSize:13,marginBottom:6,fontWeight:500},
  input:      {width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid #333",background:"#111",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"},
  eye:        {position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18},
  err:        {background:"#2a1111",border:"1px solid #5a1a1a",color:"#f87171",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:16},
  loginBtn:   {width:"100%",padding:14,borderRadius:12,border:"none",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:16,opacity:1},
  demoBox:    {background:"#111",border:"1px dashed #333",borderRadius:10,padding:"12px 16px",display:"flex",flexDirection:"column",gap:4,cursor:"pointer"},
  demoTitle:  {color:"#666",fontSize:12,fontWeight:600},
  demoText:   {color:"#f6a623",fontSize:13,fontFamily:"monospace"},
};