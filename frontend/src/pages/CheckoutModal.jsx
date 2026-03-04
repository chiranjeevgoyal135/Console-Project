import { useState, useEffect } from "react";

export default function CheckoutModal({ cart, shopInfo, onClose, onSuccess }) {
  const [step,      setStep]      = useState("review");
  const [payMethod, setPayMethod] = useState("card");
  const [error,     setError]     = useState("");
  const [orderId,   setOrderId]   = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [countdown, setCountdown] = useState(null);

  const subtotal    = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const deliveryFee = shopInfo ? shopInfo.deliveryFee : 0;
  const total       = subtotal + deliveryFee;
  const delivMins   = shopInfo ? shopInfo.deliveryMins : 30;

  // Countdown timer after success
  useEffect(() => {
    if (step !== "success") return;
    setCountdown(delivMins * 60); // convert to seconds
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  function fmtTime(secs) {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handlePay() {
    setError("");
    setStep("processing");
    try {
      const orderRes  = await fetch("http://localhost:5000/api/payment/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { setError(orderData.message); setStep("review"); return; }

      if (orderData.mode === "razorpay" && window.Razorpay) {
        new window.Razorpay({
          key: orderData.keyId, amount: orderData.amount, currency: "INR",
          order_id: orderData.orderId, name: "SmarterBlinkit",
          description: `${cart.length} items`, theme: { color: "#f6a623" },
          handler: async (response) => {
            const v = await fetch("http://localhost:5000/api/payment/verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
            });
            const vd = await v.json();
            if (vd.success) { setOrderId(response.razorpay_order_id); setPaymentId(response.razorpay_payment_id); setStep("success"); onSuccess && onSuccess(); }
            else { setError("Verification failed."); setStep("review"); }
          },
          modal: { ondismiss: () => setStep("review") },
        }).open();
        return;
      }

      // Mock mode
      await new Promise(r => setTimeout(r, 2000));
      setOrderId(orderData.orderId);
      setPaymentId("mock_pay_" + Date.now());
      setStep("success");
      onSuccess && onSuccess();
    } catch (e) {
      setError("Cannot reach server.");
      setStep("review");
    }
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget && step !== "processing") onClose(); }}>
      <div style={s.modal}>

        {/* ── REVIEW ── */}
        {step === "review" && <>
          <div style={s.head}>
            <span style={s.title}>🛒 Order Summary</span>
            <button style={s.x} onClick={onClose}>✕</button>
          </div>
          <div style={s.items}>
            {cart.map(item => (
              <div key={item.name} style={s.itemRow}>
                <span style={{fontSize:22}}>{item.emoji}</span>
                <span style={s.iName}>{item.name} × {item.qty}</span>
                <span style={s.iAmt}>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div style={s.priceBox}>
            <div style={s.pRow}><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div style={s.pRow}><span>Delivery fee</span><span>₹{deliveryFee}</span></div>
            <div style={{...s.pRow,...s.pTotal}}><span>Total</span><span style={{color:"#f6a623",fontSize:18}}>₹{total}</span></div>
          </div>
          {shopInfo && <div style={s.delivBox}>📍 <strong>{shopInfo.name}</strong> · ~{delivMins} min delivery</div>}
          <div style={s.methTitle}>Payment Method</div>
          <div style={s.methRow}>
            {[{v:"card",l:"💳 Card"},{v:"upi",l:"📱 UPI"},{v:"cod",l:"💵 Cash"}].map(m=>(
              <button key={m.v} style={{...s.methBtn,...(payMethod===m.v?s.methActive:{})}} onClick={()=>setPayMethod(m.v)}>{m.l}</button>
            ))}
          </div>
          {payMethod==="card" && <div style={s.testBox}>
            <div style={s.testTitle}>🧪 Test Card</div>
            <div style={s.testRow}><b>Number:</b> 4111 1111 1111 1111</div>
            <div style={s.testRow}><b>Expiry:</b> 12/26 &nbsp; <b>CVV:</b> 123</div>
            <div style={{...s.testRow,color:"#16a34a"}}>✅ Always succeeds</div>
          </div>}
          {payMethod==="upi" && <div style={s.testBox}>
            <div style={s.testTitle}>🧪 Test UPI</div>
            <div style={s.testRow}><b>UPI ID:</b> success@razorpay</div>
            <div style={{...s.testRow,color:"#16a34a"}}>✅ Always succeeds</div>
          </div>}
          {payMethod==="cod" && <div style={s.codBox}>💵 Pay ₹{total} cash when order arrives.</div>}
          {error && <div style={s.errBox}>{error}</div>}
          <button style={s.payBtn} onClick={handlePay}>Pay ₹{total} →</button>
        </>}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div style={s.centre}>
            <div style={s.spinner}/>
            <div style={s.procTitle}>Processing Payment...</div>
            <div style={s.procSub}>Please wait, do not close this window.</div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div style={s.successWrap}>
            {/* Top green banner */}
            <div style={s.sucBanner}>
              <div style={s.sucCheck}>✅</div>
              <div style={s.sucBannerTitle}>Payment Successful!</div>
              <div style={s.sucBannerSub}>₹{total} paid · Order confirmed</div>
            </div>

            {/* Live countdown */}
            <div style={s.countdownBox}>
              <div style={s.cdLabel}>🛵 Delivering in</div>
              <div style={s.cdTimer}>{fmtTime(countdown)}</div>
              <div style={s.cdSub}>
                {shopInfo ? `from ${shopInfo.name}` : "from nearest store"}
              </div>
              {/* Progress bar */}
              <div style={s.progBarWrap}>
                <div style={{ ...s.progBar, width: countdown !== null ? `${(countdown / (delivMins * 60)) * 100}%` : "100%" }}/>
              </div>
            </div>

            {/* Order steps */}
            <div style={s.stepsBox}>
              {[
                { icon: "✅", label: "Order Confirmed",   done: true  },
                { icon: "📦", label: "Packing Items",     done: true  },
                { icon: "🛵", label: "Out for Delivery",  done: false },
                { icon: "🏠", label: "Delivered",         done: false },
              ].map((step, i) => (
                <div key={i} style={s.stepRow}>
                  <div style={{...s.stepDot,...(step.done?s.stepDotDone:{})}}>{step.icon}</div>
                  <div style={{...s.stepLabel,...(step.done?s.stepLabelDone:{})}}>{step.label}</div>
                  {i < 3 && <div style={{...s.stepLine,...(step.done?s.stepLineDone:{})}}/>}
                </div>
              ))}
            </div>

            {/* Receipt */}
            <div style={s.receipt}>
              <div style={s.receiptTitle}>📄 Receipt</div>
              {cart.map(item => (
                <div key={item.name} style={s.rItemRow}>
                  <span>{item.emoji} {item.name} × {item.qty}</span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
              <div style={s.rDivider}/>
              <div style={{...s.rItemRow,fontWeight:700}}>
                <span>Total Paid</span>
                <span style={{color:"#f6a623"}}>₹{total}</span>
              </div>
              <div style={s.rIdRow}><span style={s.rIdLbl}>Order ID</span><span style={s.rIdVal}>{orderId.slice(0,22)}...</span></div>
            </div>

            {/* Action buttons */}
            <div style={s.actionBtns}>
              <button style={s.orderAgainBtn} onClick={onClose}>🔄 Order Again</button>
              <button style={s.doneBtn} onClick={onClose}>🏠 Back to Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:       { position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16 },
  modal:         { background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 25px 60px #0006" },
  head:          { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 0" },
  title:         { fontSize:18,fontWeight:800,color:"#1a1a1a" },
  x:             { background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa" },
  items:         { display:"flex",flexDirection:"column",gap:8,padding:"16px 24px 0" },
  itemRow:       { display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#fafafa",borderRadius:8 },
  iName:         { flex:1,fontSize:14,color:"#1a1a1a" },
  iAmt:          { fontSize:14,fontWeight:700 },
  priceBox:      { background:"#f9fafb",borderRadius:12,padding:"12px 16px",margin:"14px 24px 0" },
  pRow:          { display:"flex",justifyContent:"space-between",fontSize:14,color:"#666",marginBottom:6 },
  pTotal:        { borderTop:"1px solid #eee",paddingTop:8,marginTop:4,fontSize:16,fontWeight:700,color:"#1a1a1a" },
  delivBox:      { background:"#fff8ee",border:"1px solid #f6a62333",borderRadius:10,padding:"10px 14px",margin:"12px 24px 0",fontSize:13,color:"#555" },
  methTitle:     { fontSize:13,fontWeight:600,color:"#666",margin:"14px 24px 6px" },
  methRow:       { display:"flex",gap:8,padding:"0 24px",marginBottom:12 },
  methBtn:       { flex:1,padding:"10px 0",borderRadius:10,border:"1.5px solid #eee",background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,color:"#555" },
  methActive:    { border:"1.5px solid #f6a623",background:"#fff8ee",color:"#f6a623" },
  testBox:       { background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px",margin:"0 24px 12px" },
  testTitle:     { fontSize:12,fontWeight:700,color:"#15803d",marginBottom:6 },
  testRow:       { fontSize:13,color:"#333",marginBottom:3 },
  codBox:        { background:"#f9fafb",border:"1px dashed #ddd",borderRadius:10,padding:"12px",margin:"0 24px 12px",fontSize:14,color:"#555",textAlign:"center" },
  errBox:        { background:"#fff5f5",border:"1px solid #fecaca",color:"#dc2626",borderRadius:8,padding:"10px 14px",fontSize:13,margin:"0 24px 12px" },
  payBtn:        { display:"block",width:"calc(100% - 48px)",margin:"0 24px 24px",padding:16,borderRadius:12,border:"none",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontSize:17,fontWeight:800,cursor:"pointer" },
  centre:        { display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 24px",textAlign:"center" },
  spinner:       { width:56,height:56,border:"5px solid #eee",borderTopColor:"#f6a623",borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:20 },
  procTitle:     { fontSize:20,fontWeight:700,color:"#1a1a1a",marginBottom:8 },
  procSub:       { fontSize:14,color:"#888" },

  // Success styles
  successWrap:   { display:"flex",flexDirection:"column" },
  sucBanner:     { background:"linear-gradient(135deg,#16a34a,#15803d)",padding:"28px 24px",textAlign:"center" },
  sucCheck:      { fontSize:56,marginBottom:8 },
  sucBannerTitle:{ fontSize:24,fontWeight:800,color:"#fff",marginBottom:4 },
  sucBannerSub:  { fontSize:14,color:"#bbf7d0" },
  countdownBox:  { background:"#fff",border:"2px solid #f6a623",borderRadius:16,margin:"20px 24px 0",padding:"20px",textAlign:"center" },
  cdLabel:       { fontSize:14,color:"#888",marginBottom:4 },
  cdTimer:       { fontSize:52,fontWeight:900,color:"#f6a623",letterSpacing:2,fontFamily:"monospace" },
  cdSub:         { fontSize:12,color:"#aaa",marginTop:4,marginBottom:12 },
  progBarWrap:   { background:"#f5f5f5",borderRadius:99,height:8,overflow:"hidden" },
  progBar:       { height:"100%",background:"linear-gradient(90deg,#f6a623,#f97316)",borderRadius:99,transition:"width 1s linear" },
  stepsBox:      { display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"20px 24px 0",position:"relative" },
  stepRow:       { display:"flex",flexDirection:"column",alignItems:"center",flex:1,position:"relative" },
  stepDot:       { width:36,height:36,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:6,zIndex:1 },
  stepDotDone:   { background:"#dcfce7",border:"2px solid #16a34a" },
  stepLabel:     { fontSize:10,color:"#bbb",textAlign:"center",fontWeight:600 },
  stepLabelDone: { color:"#16a34a" },
  stepLine:      { position:"absolute",top:18,left:"50%",width:"100%",height:2,background:"#f0f0f0",zIndex:0 },
  stepLineDone:  { background:"#16a34a" },
  receipt:       { background:"#f9fafb",borderRadius:12,margin:"20px 24px 0",padding:"16px" },
  receiptTitle:  { fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:10 },
  rItemRow:      { display:"flex",justifyContent:"space-between",fontSize:13,color:"#555",marginBottom:6 },
  rDivider:      { borderTop:"1px solid #eee",margin:"8px 0" },
  rIdRow:        { display:"flex",justifyContent:"space-between",marginTop:8 },
  rIdLbl:        { fontSize:11,color:"#aaa" },
  rIdVal:        { fontSize:11,color:"#888",fontFamily:"monospace" },
  actionBtns:    { display:"flex",gap:12,padding:"16px 24px 24px" },
  orderAgainBtn: { flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid #f6a623",background:"#fff8ee",color:"#f6a623",fontSize:14,fontWeight:700,cursor:"pointer" },
  doneBtn:       { flex:1,padding:"13px 0",borderRadius:12,border:"none",background:"#1a1a1a",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer" },
};