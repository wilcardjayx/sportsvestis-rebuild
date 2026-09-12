import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   WEBGL LIQUID GLASS CANVAS
   ═══════════════════════════════════════════════════════════════════════════ */
function LiquidGlassCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTime = useRef(Date.now());

  const vert = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.,1.);}`;
  const frag = `
    precision highp float;
    uniform vec2 u_res; uniform float u_time;
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
    vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
    float snoise(vec2 v){
      const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
      vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
      vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
      vec3 p=permute(permute(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
      vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
      m=m*m;m=m*m;
      vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;
      vec3 ox=floor(x+.5);vec3 a0=x-ox;
      m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
      vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.*dot(m,g);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/u_res; float t=u_time*.15;
      float n1=snoise(uv*2.+vec2(t*.7,t*.5));
      float n2=snoise(uv*3.5-vec2(t*.4,t*.8));
      float n3=snoise(uv*5.+vec2(t*.3,-t*.6));
      float n4=snoise(uv*1.2+vec2(-t*.2,t*.3));
      float c=n1*.4+n2*.3+n3*.15+n4*.15;
      vec2 dUV=uv+vec2(snoise(uv*3.+t*.5)*.06,snoise(uv*3.-t*.4)*.06);
      vec3 col=vec3(.02,.02,.06);
      col=mix(col,vec3(0,.15,.45),smoothstep(-.3,.5,n1)*.8);
      col=mix(col,vec3(.35,0,.65),smoothstep(-.1,.6,n2)*.5);
      float c1=pow(max(0.,sin(c*6.28318+t)),8.);
      float c2=pow(max(0.,sin(n2*9.42478-t*1.5)),6.);
      col=mix(col,vec3(0,.7,.95),c1*.4);
      col=mix(col,vec3(.95,.35,.05),c2*.15);
      col+=vec3(.6,.8,1.)*pow(max(0.,c*.5+.5),12.)*.3;
      col+=vec3(0,.7,.95)*pow(1.-abs(dUV.y-.5)*1.5,3.)*.08;
      col+=vec3(.3,.5,.7)*pow(sin(dUV.y*25.+c*8.+t*2.)*.5+.5,16.)*.1;
      float vig=1.-length((uv-.5)*vec2(1.2,1.8));
      col*=smoothstep(0.,.7,vig)*1.1;
      col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.015;
      gl_FragColor=vec4(col,1.);
    }`;

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: true, alpha: false }); if (!gl) return;
    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
    const pg = gl.createProgram();
    gl.attachShader(pg, cs(gl.VERTEX_SHADER, vert));
    gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(pg); gl.useProgram(pg);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(pg, "a_position");
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d;
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize(); window.addEventListener("resize", resize);
    const render = () => {
      gl.uniform2f(gl.getUniformLocation(pg, "u_res"), cv.width, cv.height);
      gl.uniform1f(gl.getUniformLocation(pg, "u_time"), (Date.now() - startTime.current) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animRef.current); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE PLACEHOLDER
   ═══════════════════════════════════════════════════════════════════════════ */
function ImgPlaceholder({ label = "Image", aspect = "1/1", style = {}, h, rounded = 16 }) {
  return (
    <div style={{
      aspectRatio: h ? undefined : aspect, height: h || undefined,
      borderRadius: rounded, background: "rgba(255,255,255,0.04)",
      border: "1px dashed rgba(255,255,255,0.12)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.2)",
      fontSize: 13, overflow: "hidden", ...style,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      <span style={{ textAlign: "center", padding: "0 12px", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */
const Icon = {
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Cart: ({ n = 0 }) => <div style={{ position: "relative" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>{n > 0 && <span style={{ position: "absolute", top: -6, right: -8, background: "#00b4ff", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{n}</span>}</div>,
  Menu: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Chev: ({ up }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: up ? "rotate(180deg)" : "", transition: "transform .3s" }}><polyline points="6 9 12 15 18 9"/></svg>,
  Star: ({ filled = true }) => <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#FFB800" : "none"} stroke="#FFB800" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>,
  Truck: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Shield: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Leaf: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C8 16 10 12 17 8z"/><path d="M20.9 3.1S17 3 14 6c-3 3-4 8-4 8s5-1 8-4c3-3 3-6.9 3-6.9z"/></svg>,
  Return: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  Minus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ArrowLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Mail: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>,
  MapPin: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Phone: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Grid4: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Grid2: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="7"/><rect x="3" y="14" width="18" height="7"/></svg>,
};

/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { name: "Football", emoji: "🏈", slug: "football" },
  { name: "Soccer", emoji: "⚽", slug: "soccer" },
  { name: "Basketball", emoji: "🏀", slug: "basketball" },
  { name: "Baseball", emoji: "⚾", slug: "baseball" },
  { name: "Skateboard", emoji: "🛹", slug: "skateboard" },
];

const SIZES = ["S", "M", "L", "XL", "2XL"];
const COLORS = [
  { name: "Black", hex: "#111" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Navy", hex: "#1a2744" },
  { name: "Red", hex: "#cc2222" },
];

const PRODUCTS = [
  { id: 1, name: "Dragon Mode Endzone Tee", price: 29.99, cat: "football", badge: "Best Seller", desc: "Unleash your inner beast on game day with this fire-breathing dragon graphic. Premium cotton blend, pre-shrunk, tagless comfort." },
  { id: 2, name: "Football Forever Vintage Tee", price: 29.99, cat: "football", badge: null, desc: "Road to the end zone: a vintage-inspired graphic for the lifelong football fan. Soft hand feel with distressed ink print." },
  { id: 3, name: "Touchdown Devil Game Day Tee", price: 29.99, cat: "football", badge: "Hot", desc: "Hellish season energy in a bold graphic tee. Made from ringspun cotton with a relaxed fit that moves with you." },
  { id: 4, name: "Field General Eagle Tee", price: 29.99, cat: "football", badge: null, desc: "Channel your inner quarterback with this retro eagle graphic. Classic crew neck, double-stitched for durability." },
  { id: 5, name: "Game Face Retro Helmet Tee", price: 29.99, cat: "football", badge: null, desc: "Retro helmet player graphic for the old-school football enthusiast. Heavyweight cotton, true to size." },
  { id: 6, name: "Iron Valley Rams Tee", price: 29.99, cat: "football", badge: "New", desc: "Hit Hard Stay Humble. The mantra of champions. Soft jersey cotton with a modern slim fit." },
  { id: 7, name: "Play Loud Dream Big Tee", price: 29.99, cat: "football", badge: null, desc: "Riverside team vintage graphic for dreamers and doers. Garment-dyed for a lived-in feel from day one." },
  { id: 8, name: "Eastside Yard Dogs Tee", price: 29.99, cat: "football", badge: null, desc: "No Easy Plays. Vintage gridiron attitude. Enzyme-washed cotton with a broken-in softness." },
  { id: 9, name: "Striker's Flame Soccer Tee", price: 29.99, cat: "soccer", badge: "New", desc: "Blaze past defenders with this bold striker graphic. Lightweight performance cotton blend." },
  { id: 10, name: "Golden Boot Legends Tee", price: 29.99, cat: "soccer", badge: null, desc: "For the one chasing the golden boot. Vintage wash with a super-soft drape." },
  { id: 11, name: "Slam Dunk Thunder Tee", price: 34.99, cat: "basketball", badge: "Hot", desc: "Rise above the rim with explosive thunder energy. Premium heavyweight cotton." },
  { id: 12, name: "Court Vision Retro Tee", price: 34.99, cat: "basketball", badge: null, desc: "See the whole court: a retro basketball graphic that channels 90s energy." },
  { id: 13, name: "Grand Slam Vintage Tee", price: 29.99, cat: "baseball", badge: null, desc: "A grand slam graphic with vintage Americana flair. Tubular construction, no side seams." },
  { id: 14, name: "Diamond Kings Tee", price: 29.99, cat: "baseball", badge: "New", desc: "Rule the diamond with royal energy. Combed cotton, silky smooth print." },
  { id: 15, name: "Kickflip Culture Tee", price: 32.99, cat: "skateboard", badge: null, desc: "Skate culture meets street art. Oversized fit, dropped shoulders, heavy cotton." },
  { id: 16, name: "Grind State Tee", price: 32.99, cat: "skateboard", badge: "Hot", desc: "Always grinding. A tribute to the skatepark lifestyle. Relaxed box fit." },
];

const REVIEWS = [
  { name: "Marcus T.", rating: 5, text: "Best fitting graphic tee I've ever owned. The print quality is insane, held up through 20+ washes.", date: "Aug 2026" },
  { name: "Sarah K.", rating: 5, text: "Bought the Dragon Mode for my husband and he won't stop wearing it. Ordering more for the whole family.", date: "Jul 2026" },
  { name: "DeAndre W.", rating: 4, text: "Super comfortable cotton and the designs are fire. Only wish there were more color options.", date: "Jul 2026" },
  { name: "Jessica M.", rating: 5, text: "Shipped fast, arrived in perfect condition. The vintage feel of these shirts is spot on.", date: "Jun 2026" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card" style={{ marginBottom: 10, borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, fontWeight: 600, textAlign: "left", cursor: "pointer", background: "none", border: "none", color: "inherit", fontFamily: "inherit" }}>
        {q} <span style={{ flexShrink: 0, marginLeft: 12 }}><Icon.Chev up={open} /></span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height .35s cubic-bezier(.25,.46,.45,.94)" }}>
        <p style={{ padding: "0 24px 18px", fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{a}</p>
      </div>
    </div>
  );
}

function SectionHeader({ tag, title, center = true }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: 40 }}>
      {tag && <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#00b4ff", marginBottom: 8 }}>{tag}</p>}
      <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15 }}>{title}</h2>
    </div>
  );
}

function TrustBar() {
  const items = [
    { icon: <Icon.Truck />, t: "Free Shipping", d: "On orders over $75" },
    { icon: <Icon.Shield />, t: "Secure Checkout", d: "256-bit SSL encryption" },
    { icon: <Icon.Leaf />, t: "Eco-Friendly", d: "Sustainable materials" },
    { icon: <Icon.Return />, t: "30-Day Returns", d: "Hassle-free guarantee" },
  ];
  return (
    <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
      {items.map((t, i) => (
        <div key={i} className="glass-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <div className="trust-icon-box">{t.icon}</div>
          <div><p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t.t}</p><p style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{t.d}</p></div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGES
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── HOME ────────────────────────────────────────────────────────────────── */
function HomePage({ nav, addToCart, cur, sym, conv }) {
  return (
    <>
      {/* Hero */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <LiquidGlassCanvas />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,rgba(6,6,8,.15) 0%,rgba(6,6,8,.55) 70%)" }} />
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: 900 }}>
          <span className="glass-surface" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.8)", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} /> New Collection 2026
          </span>
          <h1 className="hero-headline">WEAR YOUR<br />PASSION</h1>
          <p className="hero-sub" style={{ fontSize: 18, color: "rgba(255,255,255,.5)", lineHeight: 1.6, maxWidth: 520, margin: "28px auto 0" }}>
            Bold graphic tees for every sport, every season. Designed in America, built to stand out.
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 40 }}>
            <button className="btn-primary" onClick={() => nav("shop")}>Shop Best Sellers</button>
            <button className="btn-secondary" onClick={() => nav("shop")}>Explore Collections</button>
          </div>
          <div className="glass-surface social-proof" style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "12px 24px", borderRadius: 50, marginTop: 44, fontSize: 13, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 2 }}>{[...Array(5)].map((_, i) => <Icon.Star key={i} />)}</div>
            <span style={{ color: "rgba(255,255,255,.55)" }}>Rated 4.9/5</span>
            <span className="proof-sep" style={{ width: 1, height: 14, background: "rgba(255,255,255,.1)" }} />
            <span style={{ color: "rgba(255,255,255,.55)" }}>10,000+ happy customers</span>
            <span className="proof-sep" style={{ width: 1, height: 14, background: "rgba(255,255,255,.1)" }} />
            <span style={{ color: "rgba(255,255,255,.55)" }}>Made in USA 🇺🇸</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(to top,#060608,transparent)", zIndex: 5 }} />
      </section>

      {/* Category Pills */}
      <section style={{ padding: "60px 24px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="cat-scroll" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.slug} className="category-pill" onClick={() => nav("shop", c.slug)}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span> {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <SectionHeader tag="Curated for you" title="Best Sellers" />
          <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {PRODUCTS.filter(p => p.badge).slice(0, 8).map(p => (
              <ProductCard key={p.id} p={p} nav={nav} addToCart={addToCart} sym={sym} conv={conv} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className="btn-secondary" onClick={() => nav("shop")}>View All Products</button>
          </div>
        </div>
      </section>

      {/* Featured Collection Banner */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 400 }} className="featured-grid">
              <div style={{ padding: "clamp(32px,5vw,60px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#00b4ff", marginBottom: 12 }}>Featured Collection</p>
                <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: 16 }}>Game Day<br />Essentials</h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 32, maxWidth: 380 }}>
                  From tailgates to touchdowns. Gear up with tees that hit different. Premium fabrics, bold graphics, all-day comfort.
                </p>
                <button className="btn-primary" onClick={() => nav("shop")} style={{ alignSelf: "flex-start" }}>Shop Collection</button>
              </div>
              <ImgPlaceholder label="Featured Collection Hero Image" aspect="auto" rounded={0} style={{ height: "100%", minHeight: 300, borderRadius: 0 }} />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}><TrustBar /></div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeader tag="What people say" title="Customer Reviews" />
          <div className="reviews-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {REVIEWS.map((r, i) => (
              <div key={i} className="glass-card" style={{ padding: 28 }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>{[...Array(r.rating)].map((_, j) => <Icon.Star key={j} />)}{[...Array(5 - r.rating)].map((_, j) => <Icon.Star key={j} filled={false} />)}</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 16 }}>"{r.text}"</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <SectionHeader tag="Got questions?" title="Frequently Asked" />
          {[
            { q: "Where are you located?", a: "We're a proud US-based company with production facilities in Florida and Texas. We also ship worldwide through trusted international partners." },
            { q: "Do you ship internationally?", a: "Yes, worldwide shipping is available. Costs depend on location. Orders over $75 within the US ship free." },
            { q: "Will I get a tracking number?", a: "Absolutely. You'll receive a tracking email the moment your order ships so you can follow its journey to your door." },
            { q: "What materials do you use?", a: "Every tee is crafted from high-quality, soft, durable fabrics that hold up wash after wash. Check individual product pages for specific material details." },
          ].map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* Newsletter */}
      <section style={{ padding: "0 24px 80px" }}>
        <div className="glass-card" style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(32px,5vw,56px)", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#00b4ff", marginBottom: 8 }}>Stay in the game</p>
          <h2 style={{ fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>Get Early Access & Exclusive Deals</h2>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 15, maxWidth: 440, margin: "0 auto 28px" }}>Join the crew. Be the first to know about new drops and special offers.</p>
          <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto" }}>
            <input type="email" placeholder="Enter your email" className="glass-input" style={{ flex: 1 }} />
            <button className="btn-primary" style={{ padding: "13px 28px", whiteSpace: "nowrap" }}>Subscribe</button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── PRODUCT CARD ────────────────────────────────────────────────────────── */
function ProductCard({ p, nav, addToCart, sym, conv }) {
  return (
    <div className="glass-card" style={{ padding: 10 }}>
      <div className="product-img-wrap" style={{ cursor: "pointer" }} onClick={() => nav("product", p.id)}>
        {p.badge && <span className={`product-badge ${p.badge === "Best Seller" ? "badge-best" : p.badge === "Hot" ? "badge-hot" : "badge-new"}`}>{p.badge}</span>}
        <ImgPlaceholder label={p.name} rounded={14} />
        <div className="quick-add" style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
          <button onClick={e => { e.stopPropagation(); addToCart(p); }} style={{ width: "100%", padding: 10, borderRadius: 12, background: "rgba(0,180,255,.9)", backdropFilter: "blur(10px)", color: "#fff", fontWeight: 600, fontSize: 12, letterSpacing: ".3px", cursor: "pointer", border: "none", fontFamily: "inherit" }}>
            Quick Add: {sym}{conv(p.price)}
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 4px 4px" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", fontWeight: 500, marginBottom: 3, textTransform: "capitalize" }}>{p.cat}</p>
        <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginBottom: 6, cursor: "pointer" }} onClick={() => nav("product", p.id)}>{p.name}</h3>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#00b4ff" }}>{sym}{conv(p.price)}</p>
      </div>
    </div>
  );
}

/* ─── SHOP PAGE ───────────────────────────────────────────────────────────── */
function ShopPage({ nav, addToCart, sym, conv, initCat }) {
  const [cat, setCat] = useState(initCat || "all");
  const [sort, setSort] = useState("popular");
  const [priceMax, setPriceMax] = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = cat === "all" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
    list = list.filter(p => p.price <= priceMax);
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [cat, sort, priceMax]);

  return (
    <section style={{ padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          <span style={{ cursor: "pointer" }} onClick={() => nav("home")}>Home</span>
          <span>/</span>
          <span style={{ color: "#fff" }}>{cat === "all" ? "All Products" : CATEGORIES.find(c => c.slug === cat)?.name || "Shop"}</span>
        </div>

        <SectionHeader title={cat === "all" ? "All Products" : CATEGORIES.find(c => c.slug === cat)?.name || "Shop"} center={false} />

        {/* Filter bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="cat-scroll" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="category-pill" onClick={() => setCat("all")} style={{ background: cat === "all" ? "rgba(0,180,255,.15)" : undefined, borderColor: cat === "all" ? "rgba(0,180,255,.3)" : undefined }}>All</button>
            {CATEGORIES.map(c => (
              <button key={c.slug} className="category-pill" onClick={() => setCat(c.slug)} style={{ background: cat === c.slug ? "rgba(0,180,255,.15)" : undefined, borderColor: cat === c.slug ? "rgba(0,180,255,.3)" : undefined }}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="category-pill" onClick={() => setShowFilters(!showFilters)}><Icon.Filter /> Filters</button>
            <select value={sort} onChange={e => setSort(e.target.value)} className="currency-select" style={{ padding: "8px 12px", borderRadius: 50 }}>
              <option value="popular">Sort: Popular</option>
              <option value="low">Price: Low → High</option>
              <option value="high">Price: High → Low</option>
              <option value="az">Name: A → Z</option>
            </select>
          </div>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 28, borderRadius: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Max Price: {sym}{conv(priceMax)}</p>
                <input type="range" min="10" max="50" value={priceMax} onChange={e => setPriceMax(+e.target.value)} style={{ width: "100%", accentColor: "#00b4ff" }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Size</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SIZES.map(s => <button key={s} className="category-pill" style={{ padding: "6px 14px", fontSize: 12 }}>{s}</button>)}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Color</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {COLORS.map(c => <button key={c.name} title={c.name} style={{ width: 28, height: 28, borderRadius: "50%", background: c.hex, border: "2px solid rgba(255,255,255,.15)", cursor: "pointer" }} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 20 }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>

        {/* Product Grid */}
        <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
          {filtered.map(p => <ProductCard key={p.id} p={p} nav={nav} addToCart={addToCart} sym={sym} conv={conv} />)}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,.3)" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
            <p style={{ fontWeight: 600 }}>No products match your filters</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── PRODUCT DETAIL PAGE ─────────────────────────────────────────────────── */
function ProductPage({ nav, addToCart, sym, conv, productId }) {
  const p = PRODUCTS.find(x => x.id === productId) || PRODUCTS[0];
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("Black");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("desc");
  const related = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  return (
    <section style={{ padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          <span style={{ cursor: "pointer" }} onClick={() => nav("home")}>Home</span><span>/</span>
          <span style={{ cursor: "pointer" }} onClick={() => nav("shop", p.cat)}>{p.cat}</span><span>/</span>
          <span style={{ color: "#fff" }}>{p.name}</span>
        </div>

        <button onClick={() => nav("shop")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(255,255,255,.5)", marginBottom: 24, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
          <Icon.ArrowLeft /> Back to shop
        </button>

        {/* Product Layout */}
        <div className="pdp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 60 }}>
          {/* Images */}
          <div>
            <ImgPlaceholder label={`${p.name}: Main Image`} aspect="4/5" rounded={20} style={{ marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[1, 2, 3, 4].map(n => <ImgPlaceholder key={n} label={`View ${n}`} aspect="1/1" rounded={12} />)}
            </div>
          </div>

          {/* Details */}
          <div style={{ paddingTop: 8 }}>
            {p.badge && <span className={`product-badge ${p.badge === "Best Seller" ? "badge-best" : p.badge === "Hot" ? "badge-hot" : "badge-new"}`} style={{ position: "static", display: "inline-block", marginBottom: 12 }}>{p.badge}</span>}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textTransform: "capitalize", marginBottom: 6 }}>{p.cat}</p>
            <h1 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15, marginBottom: 12 }}>{p.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 2 }}>{[...Array(5)].map((_, i) => <Icon.Star key={i} />)}</div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>4.9 (127 reviews)</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#00b4ff", marginBottom: 28 }}>{sym}{conv(p.price)}</p>

            <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, marginBottom: 32 }}>{p.desc}</p>

            {/* Color */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Color: {color}</p>
              <div style={{ display: "flex", gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c.name} onClick={() => setColor(c.name)} style={{ width: 36, height: 36, borderRadius: "50%", background: c.hex, border: color === c.name ? "2px solid #00b4ff" : "2px solid rgba(255,255,255,.12)", cursor: "pointer", outline: color === c.name ? "2px solid rgba(0,180,255,.3)" : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>

            {/* Size */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Size</p>
              <div style={{ display: "flex", gap: 8 }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s)} style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: size === s ? "rgba(0,180,255,.15)" : "rgba(255,255,255,.04)", border: `1px solid ${size === s ? "rgba(0,180,255,.4)" : "rgba(255,255,255,.08)"}`, color: size === s ? "#00b4ff" : "#fff", cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Quantity</p>
              <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", overflow: "hidden" }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: "10px 14px", cursor: "pointer", background: "none", border: "none", color: "#fff" }}><Icon.Minus /></button>
                <span style={{ padding: "10px 20px", fontWeight: 700, minWidth: 40, textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)", borderRight: "1px solid rgba(255,255,255,.06)" }}>{qty}</span>
                <button onClick={() => setQty(qty + 1)} style={{ padding: "10px 14px", cursor: "pointer", background: "none", border: "none", color: "#fff" }}><Icon.Plus /></button>
              </div>
            </div>

            {/* Add to Cart */}
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-primary" style={{ flex: 1, textAlign: "center" }} onClick={() => { for (let i = 0; i < qty; i++) addToCart(p); }}>
                Add to Cart: {sym}{conv(p.price * qty)}
              </button>
            </div>

            {/* Micro trust */}
            <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
              {["Free shipping over $75", "30-day returns", "Secure checkout"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.4)" }}><Icon.Check /> {t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs: Description / Reviews / Shipping */}
        <div className="glass-card" style={{ borderRadius: 20, padding: 0, overflow: "hidden", marginBottom: 60 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {[["desc", "Description"], ["reviews", "Reviews (127)"], ["shipping", "Shipping & Returns"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding: "16px 28px", fontSize: 14, fontWeight: tab === k ? 700 : 500, color: tab === k ? "#fff" : "rgba(255,255,255,.4)", borderBottom: tab === k ? "2px solid #00b4ff" : "2px solid transparent", cursor: "pointer", background: "none", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: tab === k ? "#00b4ff" : "transparent", fontFamily: "inherit" }}>{l}</button>
            ))}
          </div>
          <div style={{ padding: "28px 32px" }}>
            {tab === "desc" && (
              <div style={{ maxWidth: 640 }}>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.8, marginBottom: 20 }}>{p.desc}</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.8 }}>Made from 100% premium ringspun cotton. Pre-shrunk for a consistent fit. Tagless neck label for itch-free comfort. Double-needle stitched hems for extra durability. Machine washable, tumble dry low.</p>
              </div>
            )}
            {tab === "reviews" && (
              <div>
                {REVIEWS.map((r, i) => (
                  <div key={i} style={{ padding: "20px 0", borderBottom: i < REVIEWS.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                    <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>{[...Array(r.rating)].map((_, j) => <Icon.Star key={j} />)}</div>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.7, marginBottom: 10 }}>"{r.text}"</p>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginLeft: 12 }}>{r.date}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === "shipping" && (
              <div style={{ maxWidth: 640, fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 16 }}>Free standard shipping on all US orders over $75. Orders under $75 ship for a flat $4.99. International shipping rates calculated at checkout.</p>
                <p style={{ marginBottom: 16 }}>Orders are processed within 1–2 business days. Standard US delivery takes 5–7 business days. Express options are available at checkout.</p>
                <p>Not happy? No worries. We offer hassle-free returns within 30 days of delivery. Free size exchanges. Just reach out to our support team.</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <>
            <SectionHeader tag="You might also like" title="Related Products" />
            <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
              {related.map(rp => <ProductCard key={rp.id} p={rp} nav={nav} addToCart={addToCart} sym={sym} conv={conv} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ─── ABOUT PAGE — flowing narrative ───────────────────────────────────────── */
function AboutPage({ nav }) {
  const P = ({ children, style: s }) => <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", lineHeight: 1.9, maxWidth: 620, ...s }}>{children}</p>;
  return (
    <section style={{ padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          <span style={{ cursor: "pointer" }} onClick={() => nav("home")}>Home</span><span>/</span><span style={{ color: "#fff" }}>About Us</span>
        </div>

        <h1 style={{ fontSize: "clamp(30px,5vw,48px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 32 }}>
          Built by fans,<br />for fans.
        </h1>

        <P>Sportsvestis started with one idea: your game-day gear should be as bold as the plays you cheer for. We're a US-based brand making graphic tees for people who live and breathe sports, from Friday night football to Sunday pickup basketball to the skatepark after school.</P>

        <ImgPlaceholder label="Brand Story Image" aspect="2.4/1" rounded={16} style={{ margin: "36px 0" }} />

        <P>Every design is drawn in-house and printed at our facilities in Florida and Texas. We use premium ringspun cotton, eco-friendly water-based inks, and recycled packaging because we think great gear shouldn't cost the planet. Each tee is pre-shrunk, tagless, and double-stitched at the hems so it holds up season after season.</P>

        <div style={{ margin: "40px 0", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[["10,000+", "happy customers"], ["5", "sports covered"], ["2", "US print facilities"]].map(([n, l]) => (
            <div key={l}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#00b4ff", display: "block", lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginTop: 4, display: "block" }}>{l}</span>
            </div>
          ))}
        </div>

        <P>We cover football, soccer, basketball, baseball, and skateboarding. Five communities, one shop. Our customers are fans who want to rep their sport without settling for generic merch. Bold graphics, real comfort, fair prices.</P>

        <P style={{ marginTop: 20 }}>We also believe in giving back. A portion of every order goes toward youth athletics programs across the country, because the next generation of athletes deserves support on and off the field.</P>

        <ImgPlaceholder label="Team / Workshop Image" aspect="16/9" rounded={16} style={{ margin: "36px 0" }} />

        <P>We ship worldwide, offer free US shipping over $75, and back every order with a 30-day hassle-free return policy and free size exchanges. If something isn't right, we make it right.</P>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 40 }}>
          <button className="btn-primary" onClick={() => nav("shop")}>Shop the Collection</button>
          <button className="btn-secondary" onClick={() => nav("contact")}>Get in Touch</button>
        </div>
      </div>
    </section>
  );
}

/* ─── CONTACT PAGE ────────────────────────────────────────────────────────── */
function ContactPage({ nav }) {
  const [sent, setSent] = useState(false);
  return (
    <section style={{ padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          <span style={{ cursor: "pointer" }} onClick={() => nav("home")}>Home</span><span>/</span><span style={{ color: "#fff" }}>Contact</span>
        </div>

        <SectionHeader tag="Get in touch" title="We'd Love to Hear from You" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="contact-grid">
          {/* Form */}
          <div className="glass-card" style={{ padding: 32, borderRadius: 20 }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>✉️</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14 }}>We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Send us a message</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <input placeholder="First Name" className="glass-input" />
                  <input placeholder="Last Name" className="glass-input" />
                </div>
                <input placeholder="Email Address" className="glass-input" style={{ marginBottom: 14, width: "100%" }} />
                <input placeholder="Subject" className="glass-input" style={{ marginBottom: 14, width: "100%" }} />
                <textarea placeholder="Your message..." className="glass-input" rows={5} style={{ marginBottom: 20, width: "100%", resize: "vertical" }} />
                <button className="btn-primary" style={{ width: "100%", textAlign: "center" }} onClick={() => setSent(true)}>Send Message</button>
              </>
            )}
          </div>

          {/* Info */}
          <div>
            <div style={{ marginBottom: 32 }}>
              <ImgPlaceholder label="Contact / Storefront Image" aspect="16/9" rounded={20} />
            </div>
            {[
              { icon: <Icon.Mail />, title: "Email", text: "support@sportsvestis.com" },
              { icon: <Icon.Phone />, title: "Phone", text: "+1 (555) 123-4567" },
              { icon: <Icon.MapPin />, title: "Location", text: "United States, FL & TX" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
                <div className="trust-icon-box">{c.icon}</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.title}</p>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)" }}>{c.text}</p>
                </div>
              </div>
            ))}

            <div className="glass-card" style={{ padding: 20, borderRadius: 14, marginTop: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Response Time</p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>We typically respond within 24 hours. For order issues, include your order number for fastest resolution.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── LOGIN / SIGNUP PAGE — secure UI/UX ──────────────────────────────────── */
function LoginPage({ nav }) {
  const [mode, setMode] = useState("login");     // login | signup | forgot | verify
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lockout, setLockout] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const otpRefs = useRef([]);

  // Password strength calculator
  const pwStrength = useMemo(() => {
    if (!pw) return { score: 0, label: "", color: "transparent" };
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const levels = [
      { label: "Very weak", color: "#ff3333" },
      { label: "Weak", color: "#ff6633" },
      { label: "Fair", color: "#ffaa00" },
      { label: "Strong", color: "#88cc00" },
      { label: "Very strong", color: "#00cc66" },
    ];
    return { score: s, ...levels[Math.min(s, levels.length) - 1] || levels[0] };
  }, [pw]);

  const pwChecks = useMemo(() => [
    { ok: pw.length >= 8, text: "At least 8 characters" },
    { ok: /[A-Z]/.test(pw), text: "One uppercase letter" },
    { ok: /[0-9]/.test(pw), text: "One number" },
    { ok: /[^A-Za-z0-9]/.test(pw), text: "One special character" },
  ], [pw]);

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (mode === "login" || mode === "signup") {
      if (!pw) e.pw = "Password is required";
      else if (pw.length < 8) e.pw = "Password must be at least 8 characters";
    }
    if (mode === "signup") {
      if (!name.trim()) e.name = "Full name is required";
      if (pw && pw2 && pw !== pw2) e.pw2 = "Passwords don't match";
      if (!pw2) e.pw2 = "Please confirm your password";
      if (!agreed) e.agreed = "You must agree to the terms";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (lockout > 0) return;
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mode === "login") {
        // simulate failed attempt for demo
        if (attempts >= 2) {
          setLockout(30);
          const t = setInterval(() => setLockout(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
          return;
        }
        setAttempts(a => a + 1);
        setMode("verify");
      } else if (mode === "signup") {
        setMode("verify");
      }
    }, 1200);
  };

  const handleOtpChange = (idx, val) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.35)", padding: 4 }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  const InputField = ({ label, error, children }) => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: error ? "#ff5555" : "rgba(255,255,255,.7)" }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: "#ff5555", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        {error}
      </p>}
    </div>
  );

  const SocialBtn = ({ icon, label }) => (
    <button style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.04)",
      border: "1px solid rgba(255,255,255,.1)", fontSize: 13, fontWeight: 600,
      transition: "all .2s", cursor: "pointer", color: "#fff", fontFamily: "inherit",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; }}>
      <span style={{ fontSize: 18 }}>{icon}</span> {label}
    </button>
  );

  return (
    <section style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px 80px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Back link */}
        <button onClick={() => nav("home")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 32, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
          <Icon.ArrowLeft /> Back to store
        </button>

        <div className="glass-card" style={{ padding: "36px 32px", borderRadius: 24 }}>

          {/* ── LOGIN ── */}
          {mode === "login" && (<>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#00b4ff,#7b2ff7)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, marginBottom: 16 }}>S</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6 }}>Welcome back</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)" }}>Sign in to your Sportsvestis account</p>
            </div>

            {lockout > 0 && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,60,60,.1)", border: "1px solid rgba(255,60,60,.2)", marginBottom: 20, fontSize: 13, color: "#ff6666", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Too many attempts. Try again in {lockout}s.
              </div>
            )}

            <InputField label="Email address" error={errors.email}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="glass-input" style={{ width: "100%", borderColor: errors.email ? "rgba(255,60,60,.4)" : undefined }} autoComplete="email" />
            </InputField>

            <InputField label="Password" error={errors.pw}>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter your password" className="glass-input" style={{ width: "100%", paddingRight: 44, borderColor: errors.pw ? "rgba(255,60,60,.4)" : undefined }} autoComplete="current-password" />
                <EyeBtn show={showPw} toggle={() => setShowPw(!showPw)} />
              </div>
            </InputField>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,.5)", cursor: "pointer" }}>
                <div onClick={() => setRemember(!remember)} style={{
                  width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${remember ? "#00b4ff" : "rgba(255,255,255,.2)"}`,
                  background: remember ? "rgba(0,180,255,.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .2s", cursor: "pointer",
                }}>{remember && <Icon.Check />}</div>
                Remember me
              </label>
              <button onClick={() => { setMode("forgot"); setErrors({}); }} style={{ fontSize: 13, color: "#00b4ff", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>Forgot password?</button>
            </div>

            <button className="btn-primary" style={{ width: "100%", textAlign: "center", opacity: lockout > 0 ? .5 : 1, pointerEvents: lockout > 0 ? "none" : "auto" }} onClick={handleSubmit}>
              {loading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="login-spinner" />Signing in...</span> : "Sign In"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>or continue with</span>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <SocialBtn icon="G" label="Google" />
              <SocialBtn icon="" label="Apple" />
            </div>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,.4)" }}>
              Don't have an account? <button onClick={() => { setMode("signup"); setErrors({}); setPw(""); }} style={{ color: "#00b4ff", fontWeight: 600, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", fontSize: 14 }}>Create one</button>
            </p>
          </>)}

          {/* ── SIGNUP ── */}
          {mode === "signup" && (<>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6 }}>Create your account</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)" }}>Join 10,000+ fans who wear their passion</p>
            </div>

            <InputField label="Full name" error={errors.name}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="glass-input" style={{ width: "100%", borderColor: errors.name ? "rgba(255,60,60,.4)" : undefined }} autoComplete="name" />
            </InputField>

            <InputField label="Email address" error={errors.email}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="glass-input" style={{ width: "100%", borderColor: errors.email ? "rgba(255,60,60,.4)" : undefined }} autoComplete="email" />
            </InputField>

            <InputField label="Password" error={errors.pw}>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Create a strong password" className="glass-input" style={{ width: "100%", paddingRight: 44, borderColor: errors.pw ? "rgba(255,60,60,.4)" : undefined }} autoComplete="new-password" />
                <EyeBtn show={showPw} toggle={() => setShowPw(!showPw)} />
              </div>
            </InputField>

            {/* Password strength */}
            {pw && (
              <div style={{ marginTop: -10, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwStrength.score ? pwStrength.color : "rgba(255,255,255,.08)", transition: "background .3s" }} />
                  ))}
                </div>
                <p style={{ fontSize: 12, color: pwStrength.color, fontWeight: 600, marginBottom: 8 }}>{pwStrength.label}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                  {pwChecks.map((c, i) => (
                    <span key={i} style={{ fontSize: 11, color: c.ok ? "rgba(0,204,102,.8)" : "rgba(255,255,255,.25)", display: "flex", alignItems: "center", gap: 4 }}>
                      {c.ok ? <Icon.Check /> : <span style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>○</span>}
                      {c.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <InputField label="Confirm password" error={errors.pw2}>
              <div style={{ position: "relative" }}>
                <input type={showPw2 ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Re-enter your password" className="glass-input" style={{ width: "100%", paddingRight: 44, borderColor: errors.pw2 ? "rgba(255,60,60,.4)" : undefined }} autoComplete="new-password" />
                <EyeBtn show={showPw2} toggle={() => setShowPw2(!showPw2)} />
              </div>
            </InputField>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, cursor: "pointer" }}>
              <div onClick={() => setAgreed(!agreed)} style={{
                width: 18, height: 18, borderRadius: 5, marginTop: 1, flexShrink: 0,
                border: `1.5px solid ${errors.agreed ? "rgba(255,60,60,.5)" : agreed ? "#00b4ff" : "rgba(255,255,255,.2)"}`,
                background: agreed ? "rgba(0,180,255,.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .2s", cursor: "pointer",
              }}>{agreed && <Icon.Check />}</div>
              <span style={{ fontSize: 12, color: errors.agreed ? "#ff6666" : "rgba(255,255,255,.4)", lineHeight: 1.5 }}>
                I agree to the <span style={{ color: "#00b4ff", textDecoration: "underline" }}>Terms of Service</span> and <span style={{ color: "#00b4ff", textDecoration: "underline" }}>Privacy Policy</span>
              </span>
            </label>

            <button className="btn-primary" style={{ width: "100%", textAlign: "center" }} onClick={handleSubmit}>
              {loading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="login-spinner" />Creating account...</span> : "Create Account"}
            </button>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,.4)" }}>
              Already have an account? <button onClick={() => { setMode("login"); setErrors({}); setPw(""); }} style={{ color: "#00b4ff", fontWeight: 600, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", fontSize: 14 }}>Sign in</button>
            </p>
          </>)}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (<>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,180,255,.1)", border: "1px solid rgba(0,180,255,.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon.Mail />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6 }}>Reset your password</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>Enter the email address associated with your account and we'll send you a secure link to reset your password.</p>
            </div>

            <InputField label="Email address" error={errors.email}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="glass-input" style={{ width: "100%" }} autoComplete="email" />
            </InputField>

            <button className="btn-primary" style={{ width: "100%", textAlign: "center", marginBottom: 16 }} onClick={() => { if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrors({ email: "Enter a valid email" }); return; } setErrors({}); setLoading(true); setTimeout(() => { setLoading(false); setMode("verify"); }, 1000); }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button onClick={() => { setMode("login"); setErrors({}); }} style={{ width: "100%", textAlign: "center", fontSize: 14, color: "rgba(255,255,255,.4)", padding: 10, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
              Back to sign in
            </button>
          </>)}

          {/* ── 2FA / OTP VERIFICATION ── */}
          {mode === "verify" && (<>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,180,255,.1)", border: "1px solid rgba(0,180,255,.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon.Shield />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6 }}>Verify your identity</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>
                We sent a 6-digit code to <span style={{ color: "#fff", fontWeight: 600 }}>{email || "your email"}</span>. Enter it below to continue.
              </p>
            </div>

            <div className="login-otp-box" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
              {otp.map((d, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    const next = [...otp];
                    for (let j = 0; j < pasted.length; j++) next[i + j] = pasted[j];
                    setOtp(next);
                    otpRefs.current[Math.min(i + pasted.length, 5)]?.focus();
                  }}
                  style={{
                    width: 48, height: 56, borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: 700,
                    background: d ? "rgba(0,180,255,.08)" : "rgba(255,255,255,.04)",
                    border: `1.5px solid ${d ? "rgba(0,180,255,.3)" : "rgba(255,255,255,.1)"}`,
                    color: "#fff", outline: "none", caretColor: "#00b4ff",
                    transition: "all .2s", fontFamily: "inherit",
                  }}
                />
              ))}
            </div>

            <button className="btn-primary" style={{ width: "100%", textAlign: "center", marginBottom: 16 }} onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); nav("home"); }, 1200); }}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.35)" }}>
              Didn't receive a code? <button style={{ color: "#00b4ff", fontWeight: 600, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", fontSize: 13 }}>Resend</button>
            </p>

            <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", fontSize: 12, color: "rgba(255,255,255,.3)", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon.Shield />
              <span style={{ lineHeight: 1.5 }}>Your session is encrypted end-to-end. We'll never ask for your password by email or phone. This code expires in 10 minutes.</span>
            </div>
          </>)}
        </div>

        {/* Security footer */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
          {[
            { icon: <Icon.Shield />, t: "256-bit SSL" },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, t: "Encrypted" },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>, t: "Secure login" },
          ].map((s, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,.2)" }}>{s.icon} {s.t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — product management, orders, customers, messages
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({ nav }) {
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState([...PRODUCTS]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orders, setOrders] = useState(() => [
    { id: "ORD-1001", customer: "Marcus Thompson", email: "marcus@email.com", items: 3, total: 89.97, status: "delivered", date: "2026-09-08" },
    { id: "ORD-1002", customer: "Sarah Kim", email: "sarah@email.com", items: 2, total: 59.98, status: "shipped", date: "2026-09-09" },
    { id: "ORD-1003", customer: "DeAndre Wilson", email: "deandre@email.com", items: 1, total: 29.99, status: "paid", date: "2026-09-10" },
    { id: "ORD-1004", customer: "Jessica Moore", email: "jessica@email.com", items: 4, total: 119.96, status: "pending", date: "2026-09-11" },
    { id: "ORD-1005", customer: "Tyler Robinson", email: "tyler@email.com", items: 2, total: 64.98, status: "paid", date: "2026-09-11" },
  ]);
  const [messages, setMessages] = useState([
    { id: 1, name: "Alex Chen", email: "alex@email.com", subject: "Size exchange request", message: "Hi, I ordered a Large but need an XL. Order #ORD-998. Can I exchange?", date: "2026-09-10", read: false },
    { id: 2, name: "Priya Patel", email: "priya@email.com", subject: "International shipping question", message: "Do you ship to India? What are the costs and delivery times?", date: "2026-09-09", read: true },
    { id: 3, name: "Jordan Smith", email: "jordan@email.com", subject: "Wholesale inquiry", message: "I run a sports shop and would love to carry your tees. Do you offer wholesale pricing?", date: "2026-09-08", read: false },
  ]);

  // Admin login — authenticates against the real backend only.
  // No hardcoded credential bypass: if the API is unreachable or the
  // credentials are wrong, login fails. This is intentional — a client-side
  // fallback password is a public authentication bypass once code ships.
  const handleAdminLogin = async () => {
    setAdminError("");
    setAdminLoading(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: adminEmail, password: adminPw }),
      });
      const data = await resp.json();

      if (resp.ok && data.user?.role === "admin") {
        setAdminAuth(true);
      } else if (resp.ok && data.user?.role !== "admin") {
        setAdminError("This account does not have admin access.");
      } else {
        setAdminError(data.error || "Invalid email or password.");
      }
    } catch (e) {
      setAdminError("Can't reach the server. Check that the backend is running and try again.");
    }
    setAdminLoading(false);
  };

  // Product form state
  const emptyProduct = { name: "", price: 29.99, cat: "football", badge: "", desc: "" };
  const [formData, setFormData] = useState(emptyProduct);

  const handleSaveProduct = () => {
    if (!formData.name || !formData.price || !formData.cat) return;
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...formData, price: parseFloat(formData.price) } : p));
      setEditingProduct(null);
    } else {
      setProducts(prev => [...prev, { ...formData, id: Date.now(), price: parseFloat(formData.price), badge: formData.badge || null }]);
    }
    setFormData(emptyProduct);
    setShowAddForm(false);
  };

  const handleDeleteProduct = (id) => {
    if (confirm("Delete this product? This cannot be undone.")) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const updateOrderStatus = (id, newStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const markRead = (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const deleteMessage = (id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  // Stats
  const totalRevenue = orders.reduce((a, o) => a + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "paid").length;
  const unreadMessages = messages.filter(m => !m.read).length;

  const statusColor = (s) => {
    const map = { pending: "#ff9500", paid: "#00b4ff", shipped: "#7b2ff7", delivered: "#00cc66", cancelled: "#ff3b30" };
    return map[s] || "#888";
  };

  // ── Admin Login Screen — Liquid Glass ────────────────────────────────────
  if (!adminAuth) {
    return (
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* WebGL liquid glass background */}
        <LiquidGlassCanvas />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(6,6,8,.3) 0%, rgba(6,6,8,.7) 70%)" }} />

        <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "0 20px" }}>

          {/* Back to store */}
          <button onClick={() => nav("home")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(255,255,255,.5)", marginBottom: 28, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", transition: "color .2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.5)"}>
            <Icon.ArrowLeft /> Back to store
          </button>

          {/* Glass login card */}
          <div style={{
            backdropFilter: "blur(40px) saturate(200%)", WebkitBackdropFilter: "blur(40px) saturate(200%)",
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 28, padding: "40px 32px", position: "relative", overflow: "hidden",
          }}>
            {/* Decorative glow orbs */}
            <div style={{ position: "absolute", top: -60, right: -60, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,0,.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,255,.1) 0%, transparent 70%)", pointerEvents: "none" }} />

            {/* Logo + heading */}
            <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, margin: "0 auto 18px",
                background: "linear-gradient(135deg, #ff6b00 0%, #ff3b30 50%, #cc0000 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 32px rgba(255,60,0,.3), inset 0 1px 0 rgba(255,255,255,.2)",
                position: "relative",
              }}>
                <span style={{ fontSize: 28, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.3))" }}>⚡</span>
                {/* Pulse ring */}
                <div style={{
                  position: "absolute", inset: -4, borderRadius: 24,
                  border: "2px solid rgba(255,107,0,.3)",
                  animation: "adminPulse 2s ease-in-out infinite",
                }} />
              </div>
              <h2 style={{
                fontSize: 26, fontWeight: 900, letterSpacing: "-.03em", marginBottom: 6,
                background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,.7) 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Command Center</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", letterSpacing: ".02em" }}>Store administration portal</p>
            </div>

            {/* Error message */}
            {adminError && (
              <div style={{
                padding: "12px 16px", borderRadius: 14, marginBottom: 20,
                background: "rgba(255,60,60,.08)", border: "1px solid rgba(255,60,60,.15)",
                backdropFilter: "blur(10px)",
                display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#ff7777",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ flex: 1, lineHeight: 1.4 }}>{adminError}</span>
              </div>
            )}

            {/* Email field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 7, color: "rgba(255,255,255,.5)", letterSpacing: ".04em" }}>EMAIL ADDRESS</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.25)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
                </div>
                <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@sportsvestis.com" autoComplete="email"
                  style={{
                    width: "100%", padding: "14px 16px 14px 42px", borderRadius: 14, fontSize: 14,
                    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                    color: "#fff", outline: "none", transition: "all .3s", fontFamily: "inherit",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(255,107,0,.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,107,0,.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 7, color: "rgba(255,255,255,.5)", letterSpacing: ".04em" }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.25)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input type={showAdminPw ? "text" : "password"} value={adminPw} onChange={e => setAdminPw(e.target.value)}
                  placeholder="Enter your password" autoComplete="current-password"
                  onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                  style={{
                    width: "100%", padding: "14px 48px 14px 42px", borderRadius: 14, fontSize: 14,
                    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                    color: "#fff", outline: "none", transition: "all .3s", fontFamily: "inherit",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(255,107,0,.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,107,0,.08)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.08)"; e.target.style.boxShadow = "none"; }}
                />
                <button onClick={() => setShowAdminPw(!showAdminPw)} type="button" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.3)", cursor: "pointer", background: "none", border: "none", padding: 4 }}>
                  {showAdminPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button onClick={handleAdminLogin} disabled={adminLoading} style={{
              width: "100%", padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #ff6b00 0%, #ff3b30 100%)",
              color: "#fff", cursor: adminLoading ? "wait" : "pointer", border: "none", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(255,60,0,.25), inset 0 1px 0 rgba(255,255,255,.15)",
              transition: "all .3s", position: "relative", overflow: "hidden",
              opacity: adminLoading ? .7 : 1,
              textAlign: "center",
            }}
              onMouseEnter={e => { if (!adminLoading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,60,0,.35), inset 0 1px 0 rgba(255,255,255,.15)"; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,60,0,.25), inset 0 1px 0 rgba(255,255,255,.15)"; }}>
              {adminLoading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span className="login-spinner" style={{ borderColor: "rgba(255,255,255,.3)", borderTopColor: "#fff" }} />
                  Authenticating...
                </span>
              ) : "Access Dashboard"}
            </button>

            {/* Security badges */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.05)" }}>
              {[
                { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, t: "SSL Secured" },
                { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, t: "Encrypted" },
                { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>, t: "Admin Only" },
              ].map((s, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,.2)" }}>{s.icon} {s.t}</span>
              ))}
            </div>
          </div>

          {/* Bottom text */}
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,.2)" }}>
            Sportsvestis Administration · Authorized personnel only
          </p>
        </div>

        {/* Pulse animation */}
        <style>{`
          @keyframes adminPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: .4; transform: scale(1.15); }
          }
        `}</style>
      </section>
    );
  }

  // ── Sidebar Tab Button ─────────────────────────────────────────────────
  const TabBtn = ({ id, label, icon, count }) => (
    <button onClick={() => setTab(id)} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", borderRadius: 10,
      fontSize: 14, fontWeight: tab === id ? 700 : 500, textAlign: "left", cursor: "pointer",
      background: tab === id ? "rgba(0,180,255,.12)" : "transparent",
      color: tab === id ? "#00b4ff" : "rgba(255,255,255,.5)",
      border: "none", fontFamily: "inherit", transition: "all .2s",
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count > 0 && <span style={{ background: "#ff3b30", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{count}</span>}
    </button>
  );

  // ── Admin Dashboard Rendered ───────────────────────────────────────────
  return (
    <section style={{ padding: "24px", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>Store Admin</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginTop: 4 }}>Welcome back, Admin</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={() => nav("home")} style={{ padding: "10px 20px", fontSize: 13 }}>View Store</button>
            <button onClick={() => { setAdminAuth(false); setAdminEmail(""); setAdminPw(""); }} style={{ padding: "10px 20px", borderRadius: 50, background: "rgba(255,60,60,.1)", border: "1px solid rgba(255,60,60,.2)", color: "#ff6666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
          </div>
        </div>

        <div className="admin-layout" style={{ display: "flex", gap: 24 }}>
          {/* Sidebar */}
          <div className="admin-sidebar" style={{ width: 220, flexShrink: 0 }}>
            <div className="glass-card" style={{ padding: 12, borderRadius: 16 }}>
              <TabBtn id="dashboard" label="Dashboard" icon="📊" />
              <TabBtn id="products" label="Products" icon="👕" />
              <TabBtn id="orders" label="Orders" icon="📦" count={pendingOrders} />
              <TabBtn id="customers" label="Customers" icon="👥" />
              <TabBtn id="messages" label="Messages" icon="✉️" count={unreadMessages} />
              <TabBtn id="settings" label="Settings" icon="⚙️" />
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ── DASHBOARD TAB ──────────────────────────────────────── */}
            {tab === "dashboard" && (
              <div>
                {/* Stat cards */}
                <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
                  {[
                    { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: "💰", color: "#00cc66" },
                    { label: "Total Orders", value: orders.length, icon: "📦", color: "#00b4ff" },
                    { label: "Products", value: products.length, icon: "👕", color: "#7b2ff7" },
                    { label: "Pending", value: pendingOrders, icon: "⏳", color: "#ff9500" },
                  ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ padding: 20, borderRadius: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 600 }}>{s.label}</span>
                        <span style={{ fontSize: 22 }}>{s.icon}</span>
                      </div>
                      <p style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent orders table */}
                <div className="glass-card" style={{ padding: 24, borderRadius: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Orders</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                          {["Order ID", "Customer", "Items", "Total", "Status", "Date"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "rgba(255,255,255,.4)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                            <td style={{ padding: "12px", fontWeight: 600 }}>{o.id}</td>
                            <td style={{ padding: "12px" }}>{o.customer}</td>
                            <td style={{ padding: "12px" }}>{o.items}</td>
                            <td style={{ padding: "12px", fontWeight: 700 }}>${o.total.toFixed(2)}</td>
                            <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor(o.status)}20`, color: statusColor(o.status) }}>{o.status}</span></td>
                            <td style={{ padding: "12px", color: "rgba(255,255,255,.4)" }}>{o.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PRODUCTS TAB ────────────────────────────────────────── */}
            {tab === "products" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Products ({products.length})</h3>
                  <button className="btn-primary" style={{ padding: "10px 24px", fontSize: 13 }} onClick={() => { setShowAddForm(true); setEditingProduct(null); setFormData(emptyProduct); }}>+ Add Product</button>
                </div>

                {/* Add/Edit form */}
                {showAddForm && (
                  <div className="glass-card" style={{ padding: 24, borderRadius: 16, marginBottom: 20 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{editingProduct ? "Edit Product" : "Add New Product"}</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="admin-form-grid">
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Product Name *</label>
                        <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Dragon Mode Endzone Tee" className="glass-input" style={{ width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Price ($) *</label>
                        <input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} className="glass-input" style={{ width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Category *</label>
                        <select value={formData.cat} onChange={e => setFormData(p => ({ ...p, cat: e.target.value }))} className="currency-select" style={{ width: "100%", padding: "12px 14px", borderRadius: 12 }}>
                          {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Badge (optional)</label>
                        <select value={formData.badge || ""} onChange={e => setFormData(p => ({ ...p, badge: e.target.value }))} className="currency-select" style={{ width: "100%", padding: "12px 14px", borderRadius: 12 }}>
                          <option value="">None</option>
                          <option value="New">New</option>
                          <option value="Hot">Hot</option>
                          <option value="Best Seller">Best Seller</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Description</label>
                        <textarea value={formData.desc} onChange={e => setFormData(p => ({ ...p, desc: e.target.value }))} placeholder="Describe the product..." className="glass-input" rows={3} style={{ width: "100%", resize: "vertical" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button className="btn-primary" style={{ padding: "10px 28px", fontSize: 13 }} onClick={handleSaveProduct}>{editingProduct ? "Save Changes" : "Add Product"}</button>
                      <button className="btn-secondary" style={{ padding: "10px 28px", fontSize: 13 }} onClick={() => { setShowAddForm(false); setEditingProduct(null); }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Products table */}
                <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                          {["Image", "Name", "Category", "Price", "Badge", "Actions"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "12px 14px", color: "rgba(255,255,255,.4)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px dashed rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "rgba(255,255,255,.2)" }}>IMG</div>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{p.name}</td>
                            <td style={{ padding: "10px 14px", textTransform: "capitalize" }}>{p.cat}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#00b4ff" }}>${p.price.toFixed(2)}</td>
                            <td style={{ padding: "10px 14px" }}>{p.badge ? <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.badge === "Best Seller" ? "rgba(0,180,255,.15)" : p.badge === "Hot" ? "rgba(255,60,60,.15)" : "rgba(123,47,247,.15)", color: p.badge === "Best Seller" ? "#00b4ff" : p.badge === "Hot" ? "#ff4444" : "#7b2ff7" }}>{p.badge}</span> : <span style={{ color: "rgba(255,255,255,.2)" }}>-</span>}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => { setEditingProduct(p); setFormData({ name: p.name, price: p.price, cat: p.cat, badge: p.badge || "", desc: p.desc || "" }); setShowAddForm(true); }} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,180,255,.1)", border: "1px solid rgba(0,180,255,.2)", color: "#00b4ff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                                <button onClick={() => handleDeleteProduct(p.id)} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,60,60,.1)", border: "1px solid rgba(255,60,60,.2)", color: "#ff6666", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── ORDERS TAB ──────────────────────────────────────────── */}
            {tab === "orders" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Orders ({orders.length})</h3>
                <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                          {["Order ID", "Customer", "Email", "Items", "Total", "Status", "Date", "Actions"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "12px 14px", color: "rgba(255,255,255,.4)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>{o.id}</td>
                            <td style={{ padding: "12px 14px" }}>{o.customer}</td>
                            <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)" }}>{o.email}</td>
                            <td style={{ padding: "12px 14px" }}>{o.items}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 700 }}>${o.total.toFixed(2)}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className="currency-select" style={{ padding: "5px 8px", borderRadius: 8, color: statusColor(o.status), borderColor: `${statusColor(o.status)}40` }}>
                                {["pending", "paid", "shipped", "delivered", "cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)" }}>{o.date}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <button style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,180,255,.1)", border: "1px solid rgba(0,180,255,.2)", color: "#00b4ff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── CUSTOMERS TAB ───────────────────────────────────────── */}
            {tab === "customers" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Customers</h3>
                <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                          {["Customer", "Email", "Orders", "Total Spent", "Joined", "Status"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "12px 14px", color: "rgba(255,255,255,.4)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: "Marcus Thompson", email: "marcus@email.com", orders: 5, spent: 149.95, joined: "2026-07-15", active: true },
                          { name: "Sarah Kim", email: "sarah@email.com", orders: 3, spent: 89.97, joined: "2026-08-02", active: true },
                          { name: "DeAndre Wilson", email: "deandre@email.com", orders: 2, spent: 64.98, joined: "2026-08-20", active: true },
                          { name: "Jessica Moore", email: "jessica@email.com", orders: 4, spent: 119.96, joined: "2026-06-10", active: true },
                          { name: "Tyler Robinson", email: "tyler@email.com", orders: 1, spent: 32.99, joined: "2026-09-01", active: false },
                        ].map((c, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,180,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#00b4ff" }}>{c.name.charAt(0)}</div>
                                {c.name}
                              </div>
                            </td>
                            <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)" }}>{c.email}</td>
                            <td style={{ padding: "12px 14px" }}>{c.orders}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 700, color: "#00cc66" }}>${c.spent.toFixed(2)}</td>
                            <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)" }}>{c.joined}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.active ? "rgba(0,204,102,.1)" : "rgba(255,255,255,.05)", color: c.active ? "#00cc66" : "rgba(255,255,255,.3)" }}>{c.active ? "Active" : "Inactive"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── MESSAGES TAB ────────────────────────────────────────── */}
            {tab === "messages" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Contact Messages ({messages.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {messages.map(m => (
                    <div key={m.id} className="glass-card" style={{ padding: 20, borderRadius: 14, borderLeft: m.read ? "3px solid transparent" : "3px solid #00b4ff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                            {!m.read && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(0,180,255,.15)", color: "#00b4ff" }}>New</span>}
                          </div>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{m.email} · {m.date}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {!m.read && <button onClick={() => markRead(m.id)} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(0,180,255,.1)", border: "1px solid rgba(0,180,255,.2)", color: "#00b4ff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Mark Read</button>}
                          <button onClick={() => deleteMessage(m.id)} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,60,60,.1)", border: "1px solid rgba(255,60,60,.2)", color: "#ff6666", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{m.subject}</p>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>{m.message}</p>
                    </div>
                  ))}
                  {messages.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.3)" }}><p style={{ fontSize: 36, marginBottom: 10 }}>✉️</p><p style={{ fontWeight: 600 }}>No messages</p></div>}
                </div>
              </div>
            )}

            {/* ── SETTINGS TAB ────────────────────────────────────────── */}
            {tab === "settings" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Store Settings</h3>
                <div className="glass-card" style={{ padding: 28, borderRadius: 16, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>General</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="admin-form-grid">
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Store Name</label>
                      <input defaultValue="Sportsvestis" className="glass-input" style={{ width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Contact Email</label>
                      <input defaultValue="support@sportsvestis.com" className="glass-input" style={{ width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Free Shipping Threshold ($)</label>
                      <input type="number" defaultValue="75" className="glass-input" style={{ width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Default Currency</label>
                      <select defaultValue="USD" className="currency-select" style={{ width: "100%", padding: "12px 14px", borderRadius: 12 }}>
                        <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn-primary" style={{ marginTop: 20, padding: "10px 28px", fontSize: 13 }}>Save Changes</button>
                </div>

                <div className="glass-card" style={{ padding: 28, borderRadius: 16 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Change Admin Password</h4>
                  <div style={{ maxWidth: 400 }}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Current Password</label>
                      <input type="password" className="glass-input" style={{ width: "100%" }} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>New Password</label>
                      <input type="password" className="glass-input" style={{ width: "100%" }} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "rgba(255,255,255,.5)" }}>Confirm New Password</label>
                      <input type="password" className="glass-input" style={{ width: "100%" }} />
                    </div>
                    <button className="btn-primary" style={{ padding: "10px 28px", fontSize: 13 }}>Update Password</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:900px){
          .admin-layout{flex-direction:column!important}
          .admin-sidebar{width:100%!important}
          .admin-sidebar .glass-card{display:flex!important;flex-wrap:wrap!important;gap:4px!important}
          .admin-sidebar button{width:auto!important;flex:1 1 auto!important;min-width:100px!important}
          .admin-stats{grid-template-columns:repeat(2,1fr)!important}
          .admin-form-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:480px){
          .admin-stats{grid-template-columns:1fr!important}
        }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP — ROUTING & LAYOUT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  // Read the real URL path on first load so /admin (and other routes) work
  // when typed directly, bookmarked, or refreshed, not just via in-app clicks.
  const getPageFromPath = () => {
    if (typeof window === "undefined") return { page: "home", arg: null };
    const path = window.location.pathname.replace(/^\/|\/$/g, ""); // strip slashes
    const known = ["home", "shop", "product", "about", "contact", "login", "admin"];
    if (!path) return { page: "home", arg: null };
    const [base, rawArg] = path.split("/");
    // Product IDs are numbers in the data set — convert back from the URL string
    const arg = rawArg && /^\d+$/.test(rawArg) ? Number(rawArg) : (rawArg || null);
    return known.includes(base) ? { page: base, arg } : { page: "home", arg: null };
  };
  const initial = getPageFromPath();

  const [page, setPage] = useState(initial.page);
  const [pageArg, setPageArg] = useState(initial.arg);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [catDrop, setCatDrop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);

  // Keep the address bar in sync so /admin, /shop, etc. are real,
  // shareable, refreshable URLs, not just in-memory state.
  useEffect(() => {
    const path = page === "home" ? "/" : pageArg ? `/${page}/${pageArg}` : `/${page}`;
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, [page, pageArg]);

  // Support browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const { page: p, arg } = getPageFromPath();
      setPage(p); setPageArg(arg);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const nav = useCallback((p, arg = null) => {
    setPage(p); setPageArg(arg); setMenuOpen(false); setCatDrop(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addToCart = useCallback((product) => {
    setCartItems(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  }, []);

  const removeFromCart = useCallback((id) => { setCartItems(prev => prev.filter(i => i.id !== id)); }, []);

  const cartCount = cartItems.reduce((a, i) => a + i.qty, 0);
  const cartTotal = cartItems.reduce((a, i) => a + i.price * i.qty, 0);

  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  const conv = useCallback((p) => {
    if (currency === "EUR") return (p * 0.92).toFixed(2);
    if (currency === "GBP") return (p * 0.79).toFixed(2);
    return p.toFixed(2);
  }, [currency]);

  const navLinks = [
    { label: "Shop All", action: () => nav("shop") },
    { label: "Best Sellers", action: () => nav("shop") },
    { label: "About Us", action: () => nav("about") },
    { label: "Contact", action: () => nav("contact") },
  ];

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,system-ui,sans-serif", background: "#060608", color: "#f0f0f0", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        a{color:inherit;text-decoration:none} button{cursor:pointer;border:none;background:none;color:inherit;font-family:inherit} input,textarea,select{font-family:inherit}

        .glass-nav{backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);background:rgba(6,6,8,${scrolled?.7:.25});border-bottom:1px solid rgba(255,255,255,${scrolled?.06:.03});transition:background .4s,border-color .4s}
        .glass-surface{backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
        .glass-card{backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;transition:all .35s cubic-bezier(.25,.46,.45,.94)}
        .glass-card:hover{background:rgba(255,255,255,.06);border-color:rgba(0,180,255,.2);transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,100,200,.08)}
        .glass-input{padding:13px 18px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:14px;outline:none;transition:border-color .2s;display:block}
        .glass-input:focus{border-color:rgba(0,180,255,.4)}

        .btn-primary{background:linear-gradient(135deg,#00b4ff,#0066cc);color:#fff;padding:14px 36px;border-radius:50px;font-weight:600;font-size:15px;letter-spacing:.3px;transition:all .3s;position:relative;overflow:hidden}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,180,255,.3)}
        .btn-secondary{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#fff;padding:14px 36px;border-radius:50px;font-weight:500;font-size:15px;transition:all .3s;backdrop-filter:blur(10px)}
        .btn-secondary:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25)}

        .quick-add{opacity:0;transform:translateY(8px);transition:all .3s cubic-bezier(.25,.46,.45,.94)}
        .glass-card:hover .quick-add{opacity:1;transform:translateY(0)}

        .announcement-bar{background:linear-gradient(90deg,#00b4ff,#0055cc,#7b2ff7,#0055cc,#00b4ff);background-size:300% 100%;animation:shimmer 8s ease-in-out infinite}
        @keyframes shimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

        .hero-headline{font-size:clamp(40px,8vw,96px);font-weight:900;line-height:.95;letter-spacing:-.03em;background:linear-gradient(180deg,#fff,rgba(255,255,255,.65));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .category-pill{display:flex;align-items:center;gap:8px;padding:10px 22px;border-radius:50px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:14px;font-weight:500;transition:all .3s;white-space:nowrap;cursor:pointer;color:inherit;font-family:inherit}
        .category-pill:hover{background:rgba(0,180,255,.12);border-color:rgba(0,180,255,.3)}

        .slide-drawer{position:fixed;top:0;right:0;width:400px;max-width:92vw;height:100vh;z-index:1000;backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);background:rgba(15,15,20,.94);border-left:1px solid rgba(255,255,255,.08);transform:translateX(100%);transition:transform .4s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column}
        .slide-drawer.open{transform:translateX(0)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;opacity:0;pointer-events:none;transition:opacity .3s}
        .overlay.open{opacity:1;pointer-events:all}
        .mobile-menu{position:fixed;top:0;left:0;width:320px;max-width:85vw;height:100vh;z-index:1000;backdrop-filter:blur(40px) saturate(200%);-webkit-backdrop-filter:blur(40px) saturate(200%);background:rgba(15,15,20,.95);border-right:1px solid rgba(255,255,255,.08);transform:translateX(-100%);transition:transform .4s cubic-bezier(.16,1,.3,1);overflow-y:auto}
        .mobile-menu.open{transform:translateX(0)}

        .nav-link{font-size:13px;font-weight:500;letter-spacing:.3px;color:rgba(255,255,255,.7);transition:color .2s;cursor:pointer;position:relative}
        .nav-link:hover{color:#fff}
        .nav-link::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1.5px;background:#00b4ff;transition:width .3s}
        .nav-link:hover::after{width:100%}

        .trust-icon-box{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(0,180,255,.08);border:1px solid rgba(0,180,255,.15);color:#00b4ff;flex-shrink:0}

        .product-img-wrap{border-radius:16px;overflow:hidden;aspect-ratio:1;background:rgba(255,255,255,.02);position:relative}
        .product-badge{position:absolute;top:10px;left:10px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px;z-index:2}
        .badge-best{background:#00b4ff;color:#fff} .badge-hot{background:#ff4444;color:#fff} .badge-new{background:#7b2ff7;color:#fff}

        .currency-select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;cursor:pointer;outline:none}
        .currency-select option{background:#1a1a1e;color:#fff}

        .search-modal{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;backdrop-filter:blur(20px);background:rgba(0,0,0,.7)}

        /* ── TABLET 601-900px ── */
        @media(max-width:900px){
          .desktop-nav{display:none!important} .mobile-toggle{display:flex!important}
          .product-grid{grid-template-columns:repeat(2,1fr)!important;gap:14px!important}
          .hero-btns{flex-direction:column!important;width:100%!important;max-width:340px!important;margin-left:auto!important;margin-right:auto!important} .hero-btns button{width:100%!important}
          .trust-grid{grid-template-columns:1fr 1fr!important}
          .cat-scroll{justify-content:flex-start!important;overflow-x:auto!important;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch;padding-bottom:8px!important;scrollbar-width:none}
          .cat-scroll::-webkit-scrollbar{display:none}
          .pdp-grid{grid-template-columns:1fr!important;gap:32px!important}
          .featured-grid{grid-template-columns:1fr!important}
          .contact-grid{grid-template-columns:1fr!important}
          .reviews-grid{grid-template-columns:1fr!important}
          .social-proof{flex-direction:column;gap:8px!important} .proof-sep{display:none!important}
          .footer-links{justify-content:center!important;gap:32px!important}
          .footer-link-col{flex:0 0 auto!important;min-width:110px!important;text-align:center!important}
          .footer-bottom{flex-direction:column!important;text-align:center!important;gap:6px!important}
        }

        /* ── SMALL PHONE ≤480px ── */
        @media(max-width:480px){
          .product-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .trust-grid{grid-template-columns:1fr!important}
          .hero-headline{font-size:clamp(32px,10vw,52px)!important}
          .hero-sub{font-size:14px!important}
          .glass-card{border-radius:14px!important}
          .announcement-bar-text{font-size:11px!important}
          .nav-bar-inner{padding:0 12px!important}
          .site-footer{padding-left:0!important;padding-right:0!important}
          .footer-links{flex-direction:row!important;flex-wrap:wrap!important;gap:20px 28px!important;justify-content:space-around!important;padding-left:16px!important;padding-right:16px!important}
          .footer-link-col{flex:0 0 calc(50% - 16px)!important;min-width:0!important;text-align:left!important}
          .login-otp-box{gap:6px!important}
          .login-otp-box input{width:40px!important;height:48px!important;font-size:18px!important}
          .btn-primary,.btn-secondary{padding:12px 24px!important;font-size:14px!important}
        }

        /* ── LARGE DESKTOP ≥1400px ── */
        @media(min-width:1400px){
          .product-grid{grid-template-columns:repeat(4,1fr)!important;gap:24px!important}
        }

        @media(min-width:901px){.mobile-toggle{display:none!important}}

        .login-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ═══ Announcement Bar ═══ */}
      {page !== "admin" && (
      <div className="announcement-bar" style={{ padding: "9px 16px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#fff", position: "relative", zIndex: 100 }}>
        <span className="announcement-bar-text">🏈 FREE SHIPPING on orders over $75 &nbsp;·&nbsp; 30-Day Money-Back Guarantee</span>
      </div>
      )}

      {/* ═══ Navigation ═══ */}
      {page !== "admin" && (
      <nav className="glass-nav" style={{ position: "sticky", top: 0, zIndex: 100, padding: "0 24px" }}>
        <div className="nav-bar-inner" style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <button className="mobile-toggle" onClick={() => setMenuOpen(true)} style={{ display: "flex", alignItems: "center" }}><Icon.Menu /></button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => nav("home")}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#00b4ff,#7b2ff7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>S</div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-.02em" }}>SPORTSVESTIS</span>
          </div>

          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <span className="nav-link" onClick={() => nav("shop")}>Shop All</span>
            <span className="nav-link" onClick={() => nav("shop")}>Best Sellers</span>
            <div style={{ position: "relative" }}>
              <span className="nav-link" onClick={() => setCatDrop(!catDrop)} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Categories <Icon.Chev />
              </span>
              {catDrop && (
                <div className="glass-surface" style={{ position: "absolute", top: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)", borderRadius: 16, padding: 8, minWidth: 200, zIndex: 200 }}>
                  {CATEGORIES.map(c => (
                    <div key={c.slug} onClick={() => nav("shop", c.slug)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "background .2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: 18 }}>{c.emoji}</span> {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="nav-link" onClick={() => nav("about")}>About Us</span>
            <span className="nav-link" onClick={() => nav("contact")}>Support</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <select className="currency-select" value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">USD $</option><option value="EUR">EUR €</option><option value="GBP">GBP £</option>
            </select>
            <button onClick={() => { setSearchOpen(true); setSearchQ(""); }} style={{ color: "rgba(255,255,255,.7)" }}><Icon.Search /></button>
            <button onClick={() => nav("login")} style={{ color: "rgba(255,255,255,.7)" }}><Icon.User /></button>
            <button onClick={() => setCartOpen(true)} style={{ color: "rgba(255,255,255,.7)" }}><Icon.Cart n={cartCount} /></button>
          </div>
        </div>
      </nav>
      )}

      {/* ═══ Page Content ═══ */}
      {page === "home" && <HomePage nav={nav} addToCart={addToCart} cur={currency} sym={sym} conv={conv} />}
      {page === "shop" && <ShopPage key={pageArg || "all"} nav={nav} addToCart={addToCart} sym={sym} conv={conv} initCat={pageArg} />}
      {page === "product" && <ProductPage nav={nav} addToCart={addToCart} sym={sym} conv={conv} productId={pageArg} />}
      {page === "about" && <AboutPage nav={nav} />}
      {page === "contact" && <ContactPage nav={nav} />}
      {page === "login" && <LoginPage nav={nav} />}
      {page === "admin" && <AdminDashboard nav={nav} />}

      {/* ═══ Footer — full width edge-to-edge ═══ */}
      {page !== "admin" && (
      <footer className="site-footer" style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.01)", width: "100%", marginTop: 40 }}>
        <div style={{ padding: "44px 24px 0", maxWidth: 1280, margin: "0 auto" }}>
          {/* Brand row */}
          <div className="footer-brand" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 10 }} onClick={() => nav("home")}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#00b4ff,#7b2ff7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14 }}>S</div>
              <span style={{ fontWeight: 800, fontSize: 16 }}>SPORTSVESTIS</span>
            </div>
            <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13, lineHeight: 1.7, maxWidth: 380 }}>One shop for all sports. Bold graphic tees designed in America for athletes and fans who wear their passion.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {["𝕏", "f", "IG"].map(s => <span key={s} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer", transition: "background .2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}>{s}</span>)}
            </div>
          </div>

          {/* Links row — 4 columns that collapse to 2x2 then stack */}
          <div className="footer-links" style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", paddingBottom: 32 }}>
            {[
              { title: "Shop", items: [["All Products","shop"],["Football","shop"],["Soccer","shop"],["Basketball","shop"],["Baseball","shop"],["Skateboard","shop"]] },
              { title: "Company", items: [["About Us","about"],["Contact","contact"],["Login","login"]] },
              { title: "Policies", items: [["Privacy Policy"],["Refund Policy"],["Shipping Policy"],["Terms of Service"]] },
              { title: "Support", items: [["FAQ"],["Size Guide"],["Track Order"],["Returns"]] },
            ].map(col => (
              <div key={col.title} className="footer-link-col" style={{ minWidth: 0, flex: "1 1 120px" }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,.55)" }}>{col.title}</h4>
                {col.items.map(([label, route]) => (
                  <p key={label} onClick={route ? () => nav(route) : undefined} style={{ fontSize: 13, color: "rgba(255,255,255,.28)", marginBottom: 6, cursor: "pointer", transition: "color .2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.7)"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.28)"}>{label}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar — truly edge-to-edge, no maxWidth constraint */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "14px 24px", width: "100%" }}>
          <div className="footer-bottom" style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11, color: "rgba(255,255,255,.18)" }}>
            <span>© 2026 Sportsvestis. All rights reserved.</span>
            <span>Wear Your Passion.</span>
          </div>
        </div>
      </footer>
      )}

      {/* ═══ Cart Drawer ═══ */}
      <div className={`overlay ${cartOpen ? "open" : ""}`} onClick={() => setCartOpen(false)} />
      <div className={`slide-drawer ${cartOpen ? "open" : ""}`}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Your Cart ({cartCount})</h3>
          <button onClick={() => setCartOpen(false)}><Icon.Close /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.3)" }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🛒</p>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Your cart is empty</p>
              <p style={{ fontSize: 13 }}>Add items to get started</p>
            </div>
          ) : cartItems.map(item => (
            <div key={item.id} style={{ display: "flex", gap: 14, marginBottom: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ width: 68, height: 68, borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px dashed rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,.2)", flexShrink: 0, textAlign: "center", padding: 4 }}>IMG</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{item.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
                    <button onClick={() => updateQty(item.id, -1)} style={{ padding: "4px 8px", fontSize: 12 }}>−</button>
                    <span style={{ padding: "4px 10px", fontSize: 13, fontWeight: 600, borderLeft: "1px solid rgba(255,255,255,.05)", borderRight: "1px solid rgba(255,255,255,.05)" }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} style={{ padding: "4px 8px", fontSize: 12 }}>+</button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#00b4ff", fontSize: 14 }}>{sym}{conv(item.price * item.qty)}</span>
                  <button onClick={() => removeFromCart(item.id)} style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textDecoration: "underline" }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cartItems.length > 0 && (
          <div style={{ padding: 20, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 15 }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{sym}{conv(cartTotal)}</span>
            </div>
            {cartTotal >= 75 && <p style={{ fontSize: 12, color: "#00ff88", marginBottom: 12, textAlign: "center" }}>✓ You qualify for free shipping!</p>}
            <button className="btn-primary" style={{ width: "100%", textAlign: "center" }}>Checkout</button>
          </div>
        )}
      </div>

      {/* ═══ Mobile Menu ═══ */}
      <div className={`overlay ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>SPORTSVESTIS</span>
          <button onClick={() => setMenuOpen(false)}><Icon.Close /></button>
        </div>
        <div style={{ padding: 24 }}>
          {navLinks.map(l => (
            <div key={l.label} onClick={l.action} style={{ padding: "14px 0", fontSize: 16, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,.05)", cursor: "pointer" }}>{l.label}</div>
          ))}
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", marginTop: 24, marginBottom: 10 }}>Categories</p>
          {CATEGORIES.map(c => (
            <div key={c.slug} onClick={() => nav("shop", c.slug)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", fontSize: 15, borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>{c.emoji}</span> {c.name}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Search Modal ═══ */}
      {searchOpen && (
        <div className="search-modal" onClick={() => setSearchOpen(false)}>
          <div className="glass-surface" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, borderRadius: 20, padding: 8, margin: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px" }}>
              <Icon.Search />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search products..." style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 16, outline: "none" }} />
              <button onClick={() => setSearchOpen(false)} style={{ fontSize: 12, color: "rgba(255,255,255,.35)", padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)" }}>ESC</button>
            </div>
            {searchQ && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: 12, maxHeight: 320, overflowY: "auto" }}>
                {PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase())).map(p => (
                  <div key={p.id} onClick={() => { setSearchOpen(false); nav("product", p.id); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 10, cursor: "pointer", transition: "background .2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px dashed rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "rgba(255,255,255,.2)", flexShrink: 0 }}>IMG</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                      <p style={{ fontSize: 13, color: "#00b4ff" }}>{sym}{conv(p.price)}</p>
                    </div>
                  </div>
                ))}
                {PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase())).length === 0 && (
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.3)", textAlign: "center", padding: 20 }}>No products found for "{searchQ}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
