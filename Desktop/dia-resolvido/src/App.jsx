import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPA_URL = "https://jonyxkuuzzbldhyhwbcu.supabase.co";
const SUPA_KEY = "sb_publishable_wPEiFqDRH1f7Ts8oxq0I1Q_ShTwkoDV";

// ─── LOCAL STORAGE (cache/fallback local) ─────────────────────────────────────
const LS = {
  get: (k)   => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k)   => { try { localStorage.removeItem(k); } catch {} },
};

// ─── SUPABASE CLIENT (fetch nativo) ───────────────────────────────────────────
let _token  = LS.get("tf_token")  || null;
let _userId = LS.get("tf_uid")    || null;

const H = (extra={}) => ({
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${_token || SUPA_KEY}`,
  ...extra
});

const supa = {
  // ── AUTH ────────────────────────────────────────────────────────────────────
  auth: {
    async signIn(email, password) {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: H(),
        body: JSON.stringify({ email, password })
      });
      const d = await r.json();
      if (!r.ok) return { user:null, error: d.error_description || d.msg || "E-mail ou senha incorretos." };
      _token  = d.access_token;
      _userId = d.user.id;
      LS.set("tf_token", _token);
      LS.set("tf_uid",   _userId);
      return { user: d.user, error: null };
    },
    async signUp(email, password, name) {
      const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method: "POST", headers: H(),
        body: JSON.stringify({ email, password, data: { full_name: name } })
      });
      const d = await r.json();
      if (!r.ok) return { user:null, error: d.msg || d.error_description || "Erro ao cadastrar." };
      if (d.access_token) {
        _token  = d.access_token;
        _userId = d.user.id;
        LS.set("tf_token", _token);
        LS.set("tf_uid",   _userId);
      }
      return { user: d.user || d, error: null };
    },
    async signOut() {
      if (_token) {
        await fetch(`${SUPA_URL}/auth/v1/logout`, { method:"POST", headers: H() }).catch(()=>{});
      }
      _token = null; _userId = null;
      LS.del("tf_token"); LS.del("tf_uid"); LS.del("tf_session");
    },
    getToken()  { return _token; },
    getUserId() { return _userId; },
    isLoggedIn(){ return !!_token && !!_userId; },
  },

  // ── DATABASE ────────────────────────────────────────────────────────────────
  async select(table, filters={}) {
    let url = `${SUPA_URL}/rest/v1/${table}?select=*`;
    for (const [k,v] of Object.entries(filters)) url += `&${k}=eq.${encodeURIComponent(v)}`;
    const r = await fetch(url, { headers: H({ "Accept":"application/json" }) });
    if (!r.ok) return { data:null, error: await r.json() };
    return { data: await r.json(), error: null };
  },
  async insert(table, rows) {
    const body = Array.isArray(rows) ? rows : [rows];
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?select=*`, {
      method: "POST", headers: H({ "Prefer":"return=representation" }),
      body: JSON.stringify(body)
    });
    if (!r.ok) return { data:null, error: await r.json() };
    return { data: await r.json(), error: null };
  },
  async update(table, filters, obj) {
    let url = `${SUPA_URL}/rest/v1/${table}?select=*`;
    for (const [k,v] of Object.entries(filters)) url += `&${k}=eq.${encodeURIComponent(v)}`;
    const r = await fetch(url, {
      method: "PATCH", headers: H({ "Prefer":"return=representation" }),
      body: JSON.stringify(obj)
    });
    if (!r.ok) return { data:null, error: await r.json() };
    return { data: await r.json(), error: null };
  },
  async delete(table, filters) {
    let url = `${SUPA_URL}/rest/v1/${table}`;
    const entries = Object.entries(filters);
    if (entries.length) url += "?" + entries.map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join("&");
    const r = await fetch(url, { method:"DELETE", headers: H() });
    return { error: r.ok ? null : await r.json() };
  },
  async getProfile(userId) {
    const { data } = await supa.select("profiles", { id: userId });
    return data?.[0] || null;
  },
  async upsertProfile(userId, obj) {
    // Tenta update primeiro, se não existir faz insert
    const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH", headers: H({ "Prefer":"return=representation" }),
      body: JSON.stringify(obj)
    });
    const d = await r.json();
    if (Array.isArray(d) && d.length === 0) {
      await supa.insert("profiles", { id: userId, ...obj });
    }
  }
};


// ─── TOKENS ───────────────────────────────────────────────────────────────────
const G = {
  // greens
  g900: "#0A3D1F",
  g700: "#166534",
  g500: "#16A34A",
  g400: "#22C55E",
  g200: "#BBF7D0",
  g100: "#DCFCE7",
  g50:  "#F0FDF4",
  // neutrals
  n900: "#0F172A",
  n700: "#334155",
  n500: "#64748B",
  n300: "#CBD5E1",
  n200: "#E2E8F0",
  n100: "#F1F5F9",
  n50:  "#F8FAFC",
  white:"#FFFFFF",
  // status
  red:  "#EF4444",
  amber:"#F59E0B",
  // glow
  glow: "rgba(22,163,74,0.12)",
};

const HEADING = "'Plus Jakarta Sans', 'Inter', sans-serif";
const BODY    = "'Inter', system-ui, sans-serif";

const CATS = ["🏠 Casa","💼 Trabalho","🏋️ Saúde","📚 Estudos","💰 Finanças","🎯 Pessoal","📦 Outros"];
const PRIS = ["Alta","Média","Baixa"];
const RECS = ["Nenhuma","Diária","Semanal","Mensal"];

const tod  = () => new Date().toISOString().split("T")[0];
const tmr  = () => new Date(Date.now()+864e5).toISOString().split("T")[0];
const wend = () => new Date(Date.now()+7*864e5).toISOString().split("T")[0];

const TASKS0 = []; // loaded from Supabase

function fmtDate(d) {
  if (d===tod()) return "Hoje";
  if (d===tmr()) return "Amanhã";
  return new Date(d+"T00:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
}
function priColor(p) { return p==="Alta"?G.red:p==="Média"?G.amber:G.g500; }
function priBg(p)    { return p==="Alta"?"#FEF2F2":p==="Média"?"#FFFBEB":G.g50; }

// ─── CSS ──────────────────────────────────────────────────────────────────────
const GStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
    html, body { background:${G.white}; }
    ::-webkit-scrollbar { width:3px; }
    ::-webkit-scrollbar-thumb { background:${G.n200}; border-radius:4px; }
    input::placeholder { color:${G.n300}; font-family:${BODY}; font-size:14px; }
    input[type=date]::-webkit-calendar-picker-indicator,
    input[type=time]::-webkit-calendar-picker-indicator { opacity:.45; cursor:pointer; }

    @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
    @keyframes dot-blink{ 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes progress { from{width:0} }

    .fade-up { animation:fadeUp .4s cubic-bezier(0.22,1,0.36,1) both; }
    .slide-up { animation:slideUp .38s cubic-bezier(0.22,1,0.36,1); }

    .task-row { transition:box-shadow .14s; cursor:default; }

    .pill-btn { transition:all .15s; }
    .pill-btn:hover { opacity:.85; }
    .pill-btn:active { transform:scale(.96); }

    .menu-row { transition:background .14s; }
    .menu-row:hover { background:${G.n50} !important; }

    .check-box { transition:all .2s; }
    .check-box:hover { border-color:${G.g500} !important; }
  `}</style>
);

// ─── SUBTLE BACKGROUND PATTERN ────────────────────────────────────────────────
function BgPattern() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      {/* solid green hero band top-40% */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"42%",background:"linear-gradient(160deg,#166534 0%,#16A34A 60%,#22C55E 100%)"}}/>


      {/* soft overlap blend */}
      <div style={{position:"absolute",top:"30%",left:0,right:0,height:"18%",background:"linear-gradient(180deg,transparent,#F0FDF4)"}}/>
      {/* green light bottom */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"62%",background:"#F0FDF4"}}/>
      {/* large circle glow on green area */}
      <div style={{position:"absolute",top:"-80px",right:"-80px",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 65%)"}}/>
      <div style={{position:"absolute",top:"5%",left:"-40px",width:"180px",height:"180px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,.10) 0%,transparent 65%)"}}/>
      {/* SVG icons ON the green band */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"42%"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 280" preserveAspectRatio="xMidYMid slice">
        {/* ── ICON LAYER ── */}
        {/* checklist top-left */}
        <g transform="translate(14,28) rotate(-10,24,29)" stroke="rgba(255,255,255,.38)" strokeWidth="2" fill="none" strokeLinecap="round">
          <rect x="0" y="0" width="48" height="58" rx="7"/>
          <path d="M10 18 L17 25 L32 12"/>
          <line x1="10" y1="34" x2="38" y2="34"/>
          <line x1="10" y1="44" x2="30" y2="44"/>
        </g>
        {/* bar chart top-right */}
        <g transform="translate(312,14) rotate(8,28,26)" stroke="rgba(255,255,255,.32)" strokeWidth="2" fill="none" strokeLinecap="round">
          <rect x="0" y="28" width="14" height="32" rx="2"/>
          <rect x="18" y="14" width="14" height="46" rx="2"/>
          <rect x="36" y="0" width="14" height="60" rx="2"/>
        </g>
        {/* clock top-centre */}
        <g transform="translate(172,12) rotate(5,20,20)" stroke="rgba(255,255,255,.25)" strokeWidth="2" fill="none" strokeLinecap="round">
          <circle cx="20" cy="20" r="18"/>
          <path d="M20 8 L20 20 L28 26"/>
          <circle cx="20" cy="4" r="1.5" fill="rgba(255,255,255,.25)"/>
          <circle cx="36" cy="20" r="1.5" fill="rgba(255,255,255,.25)"/>
          <circle cx="20" cy="36" r="1.5" fill="rgba(255,255,255,.25)"/>
          <circle cx="4"  cy="20" r="1.5" fill="rgba(255,255,255,.25)"/>
        </g>
        {/* calendar mid-left */}
        <g transform="translate(12,130) rotate(-6,24,22)" stroke="rgba(255,255,255,.28)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="6" width="46" height="40" rx="5"/>
          <line x1="0" y1="16" x2="46" y2="16"/>
          <line x1="12" y1="0" x2="12" y2="12"/>
          <line x1="34" y1="0" x2="34" y2="12"/>
          <circle cx="12" cy="28" r="2" fill="rgba(255,255,255,.28)"/>
          <circle cx="23" cy="28" r="2" fill="rgba(255,255,255,.28)"/>
          <circle cx="34" cy="28" r="2" fill="rgba(255,255,255,.28)"/>
          <circle cx="12" cy="38" r="2" fill="rgba(255,255,255,.28)"/>
          <circle cx="23" cy="38" r="2" fill="rgba(255,255,255,.28)"/>
        </g>
        {/* checklist mid-right */}
        <g transform="translate(318,110) rotate(12,22,28)" stroke="rgba(255,255,255,.26)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="0" width="44" height="54" rx="6"/>
          <path d="M9 16 L15 22 L30 10"/>
          <line x1="9" y1="30" x2="35" y2="30"/>
          <line x1="9" y1="40" x2="27" y2="40"/>
        </g>
        {/* small bar chart bottom-centre */}
        <g transform="translate(168,170) rotate(-5,18,18)" stroke="rgba(255,255,255,.22)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="18" width="10" height="20" rx="2"/>
          <rect x="14" y="8"  width="10" height="30" rx="2"/>
          <rect x="28" y="0"  width="10" height="38" rx="2"/>
        </g>
        {/* check circles scattered */}
        <g stroke="rgba(255,255,255,.22)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <circle cx="88"  cy="88"  r="14"/><path d="M80 88 L86 94 L96 82"/>
          <circle cx="302" cy="76"  r="12"/><path d="M295 76 L300 81 L309 70"/>
          <circle cx="72"  cy="210" r="12"/><path d="M65 210 L70 215 L79 204"/>
          <circle cx="320" cy="200" r="14"/><path d="M312 200 L318 206 L328 194"/>
          <circle cx="190" cy="245" r="10"/><path d="M184 245 L188 249 L196 240"/>
        </g>
        {/* tag / label icons */}
        <g stroke="rgba(255,255,255,.20)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M120 130 L142 130 L154 142 L142 154 L120 154 Z"/>
          <circle cx="128" cy="142" r="3" fill="rgba(255,255,255,.20)"/>
          <path d="M230 160 L250 160 L260 170 L250 180 L230 180 Z"/>
          <circle cx="238" cy="170" r="2.5" fill="rgba(255,255,255,.20)"/>
        </g>
        {/* ── FULL DOT GRID covering entire height ── */}
        <g fill="rgba(255,255,255,.13)">
          <circle cx="55"  cy="15" r="2.2"/><circle cx="95"  cy="15" r="2.2"/><circle cx="135" cy="15" r="2.2"/>
          <circle cx="215" cy="15" r="2.2"/><circle cx="255" cy="15" r="2.2"/><circle cx="295" cy="15" r="2.2"/>
          <circle cx="35"  cy="45" r="2"/><circle cx="75"  cy="45" r="2"/><circle cx="195" cy="45" r="2"/>
          <circle cx="235" cy="45" r="2"/><circle cx="275" cy="45" r="2"/><circle cx="355" cy="45" r="2"/>
          <circle cx="115" cy="75" r="2"/><circle cx="155" cy="75" r="2"/><circle cx="255" cy="75" r="2"/>
          <circle cx="335" cy="75" r="2"/><circle cx="375" cy="75" r="2"/>
          <circle cx="55"  cy="105" r="2"/><circle cx="195" cy="105" r="2"/><circle cx="235" cy="105" r="2"/>
          <circle cx="355" cy="105" r="2"/>
          <circle cx="75"  cy="135" r="2"/><circle cx="155" cy="135" r="2"/><circle cx="295" cy="135" r="2"/>
          <circle cx="375" cy="135" r="2"/>
          <circle cx="35"  cy="165" r="2"/><circle cx="115" cy="165" r="2"/><circle cx="215" cy="165" r="2"/>
          <circle cx="335" cy="165" r="2"/>
          <circle cx="55"  cy="195" r="2"/><circle cx="135" cy="195" r="2"/><circle cx="255" cy="195" r="2"/>
          <circle cx="375" cy="195" r="2"/>
          <circle cx="95"  cy="225" r="2"/><circle cx="215" cy="225" r="2"/><circle cx="295" cy="225" r="2"/>
          <circle cx="355" cy="225" r="2"/>
          <circle cx="35"  cy="255" r="2"/><circle cx="155" cy="255" r="2"/><circle cx="235" cy="255" r="2"/>
          <circle cx="315" cy="255" r="2"/>
        </g>
      </svg>

    </div>
  );
}

// ─── APP BACKGROUND (dark green full screen, same style as login top) ──────────
function AppBgPattern() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      {/* full dark green */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,#166534 0%,#16A34A 60%,#14532D 100%)"}}/>
      {/* circle glows */}
      <div style={{position:"absolute",top:"-80px",right:"-80px",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,.10) 0%,transparent 65%)"}}/>
      <div style={{position:"absolute",top:"5%",left:"-40px",width:"180px",height:"180px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,.07) 0%,transparent 65%)"}}/>
      <div style={{position:"absolute",bottom:"-60px",right:"-60px",width:"220px",height:"220px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,.06) 0%,transparent 65%)"}}/>
      {/* icons + dots covering full screen */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 700" preserveAspectRatio="xMidYMid slice">
        {/* checklist top-left */}
        <g transform="translate(16,40) rotate(-10,24,29)" stroke="rgba(255,255,255,.28)" strokeWidth="2" fill="none" strokeLinecap="round">
          <rect x="0" y="0" width="48" height="58" rx="7"/>
          <path d="M10 18 L17 25 L32 12"/>
          <line x1="10" y1="34" x2="38" y2="34"/>
          <line x1="10" y1="44" x2="30" y2="44"/>
        </g>
        {/* bar chart top-right */}
        <g transform="translate(292,22) rotate(8,28,26)" stroke="rgba(255,255,255,.25)" strokeWidth="2" fill="none" strokeLinecap="round">
          <rect x="0" y="28" width="14" height="32" rx="2"/>
          <rect x="18" y="14" width="14" height="46" rx="2"/>
          <rect x="36" y="0"  width="14" height="60" rx="2"/>
        </g>
        {/* clock top-centre */}
        <g transform="translate(172,12) rotate(5,20,20)" stroke="rgba(255,255,255,.20)" strokeWidth="2" fill="none" strokeLinecap="round">
          <circle cx="20" cy="20" r="18"/>
          <path d="M20 8 L20 20 L28 26"/>
        </g>
        {/* calendar mid-left */}
        <g transform="translate(12,200) rotate(-6,24,22)" stroke="rgba(255,255,255,.22)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="6" width="46" height="40" rx="5"/>
          <line x1="0" y1="16" x2="46" y2="16"/>
          <line x1="12" y1="0" x2="12" y2="12"/>
          <line x1="34" y1="0" x2="34" y2="12"/>
          <circle cx="12" cy="28" r="2" fill="rgba(255,255,255,.22)"/>
          <circle cx="23" cy="28" r="2" fill="rgba(255,255,255,.22)"/>
          <circle cx="34" cy="28" r="2" fill="rgba(255,255,255,.22)"/>
        </g>
        {/* checklist mid-right */}
        <g transform="translate(318,190) rotate(12,22,28)" stroke="rgba(255,255,255,.20)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="0" width="44" height="54" rx="6"/>
          <path d="M9 16 L15 22 L30 10"/>
          <line x1="9" y1="30" x2="35" y2="30"/>
          <line x1="9" y1="40" x2="27" y2="40"/>
        </g>
        {/* bar chart bottom-centre */}
        <g transform="translate(162,390) rotate(-5,18,18)" stroke="rgba(255,255,255,.18)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="18" width="10" height="20" rx="2"/>
          <rect x="14" y="8"  width="10" height="30" rx="2"/>
          <rect x="28" y="0"  width="10" height="38" rx="2"/>
        </g>
        {/* clock bottom-left */}
        <g transform="translate(14,430) rotate(8,20,20)" stroke="rgba(255,255,255,.18)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <circle cx="20" cy="20" r="18"/>
          <path d="M20 8 L20 20 L28 26"/>
        </g>
        {/* calendar bottom-right */}
        <g transform="translate(300,500) rotate(-7,22,20)" stroke="rgba(255,255,255,.18)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="0" y="5" width="42" height="36" rx="4"/>
          <line x1="0" y1="14" x2="42" y2="14"/>
          <line x1="11" y1="0" x2="11" y2="10"/>
          <line x1="31" y1="0" x2="31" y2="10"/>
          <circle cx="11" cy="24" r="2" fill="rgba(255,255,255,.18)"/>
          <circle cx="21" cy="24" r="2" fill="rgba(255,255,255,.18)"/>
          <circle cx="31" cy="24" r="2" fill="rgba(255,255,255,.18)"/>
        </g>
        {/* check circles */}
        <g stroke="rgba(255,255,255,.20)" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <circle cx="88"  cy="120" r="13"/><path d="M81 120 L86 125 L95 114"/>
          <circle cx="302" cy="100" r="12"/><path d="M295 100 L300 105 L309 94"/>
          <circle cx="60"  cy="340" r="12"/><path d="M53 340 L58 345 L67 334"/>
          <circle cx="330" cy="370" r="13"/><path d="M323 370 L328 375 L337 364"/>
          <circle cx="180" cy="560" r="11"/><path d="M174 560 L178 564 L186 555"/>
          <circle cx="350" cy="620" r="12"/><path d="M343 620 L348 625 L357 614"/>
        </g>
        {/* dots grid full height */}
        <g fill="rgba(255,255,255,.12)">
          <circle cx="55"  cy="15"  r="2"/><circle cx="135" cy="15"  r="2"/><circle cx="215" cy="15"  r="2"/><circle cx="295" cy="15"  r="2"/><circle cx="375" cy="15"  r="2"/>
          <circle cx="35"  cy="50"  r="2"/><circle cx="115" cy="50"  r="2"/><circle cx="195" cy="50"  r="2"/><circle cx="275" cy="50"  r="2"/><circle cx="355" cy="50"  r="2"/>
          <circle cx="75"  cy="85"  r="2"/><circle cx="155" cy="85"  r="2"/><circle cx="235" cy="85"  r="2"/><circle cx="315" cy="85"  r="2"/>
          <circle cx="55"  cy="120" r="2"/><circle cx="175" cy="120" r="2"/><circle cx="255" cy="120" r="2"/><circle cx="375" cy="120" r="2"/>
          <circle cx="95"  cy="155" r="2"/><circle cx="215" cy="155" r="2"/><circle cx="335" cy="155" r="2"/>
          <circle cx="35"  cy="190" r="2"/><circle cx="155" cy="190" r="2"/><circle cx="275" cy="190" r="2"/><circle cx="375" cy="190" r="2"/>
          <circle cx="75"  cy="225" r="2"/><circle cx="195" cy="225" r="2"/><circle cx="315" cy="225" r="2"/>
          <circle cx="55"  cy="260" r="2"/><circle cx="135" cy="260" r="2"/><circle cx="255" cy="260" r="2"/><circle cx="355" cy="260" r="2"/>
          <circle cx="95"  cy="295" r="2"/><circle cx="215" cy="295" r="2"/><circle cx="335" cy="295" r="2"/>
          <circle cx="35"  cy="330" r="2"/><circle cx="155" cy="330" r="2"/><circle cx="375" cy="330" r="2"/>
          <circle cx="75"  cy="365" r="2"/><circle cx="195" cy="365" r="2"/><circle cx="315" cy="365" r="2"/>
          <circle cx="115" cy="400" r="2"/><circle cx="235" cy="400" r="2"/><circle cx="355" cy="400" r="2"/>
          <circle cx="55"  cy="435" r="2"/><circle cx="175" cy="435" r="2"/><circle cx="295" cy="435" r="2"/>
          <circle cx="95"  cy="470" r="2"/><circle cx="215" cy="470" r="2"/><circle cx="375" cy="470" r="2"/>
          <circle cx="35"  cy="505" r="2"/><circle cx="155" cy="505" r="2"/><circle cx="275" cy="505" r="2"/>
          <circle cx="75"  cy="540" r="2"/><circle cx="235" cy="540" r="2"/><circle cx="355" cy="540" r="2"/>
          <circle cx="115" cy="575" r="2"/><circle cx="195" cy="575" r="2"/><circle cx="315" cy="575" r="2"/>
          <circle cx="55"  cy="610" r="2"/><circle cx="175" cy="610" r="2"/><circle cx="375" cy="610" r="2"/>
          <circle cx="95"  cy="645" r="2"/><circle cx="215" cy="645" r="2"/><circle cx="295" cy="645" r="2"/>
          <circle cx="35"  cy="680" r="2"/><circle cx="155" cy="680" r="2"/><circle cx="335" cy="680" r="2"/>
        </g>
      </svg>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function Input({ label, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      {label && <label style={{display:"block",color:G.n500,fontSize:"11px",fontWeight:"600",
        letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>{label}</label>}
      <input {...props}
        onFocus={e=>{ setFocus(true); props.onFocus&&props.onFocus(e); }}
        onBlur={e=>{ setFocus(false); props.onBlur&&props.onBlur(e); }}
        style={{
          width:"100%", background:G.white,
          border:`1.5px solid ${focus ? G.g500 : G.n200}`,
          borderRadius:"10px", padding:"11px 14px",
          color:G.n900, fontSize:"14px", fontFamily:BODY,
          outline:"none", transition:"border-color .18s, box-shadow .18s",
          boxShadow: focus ? `0 0 0 3px ${G.glow}` : "none",
          ...(props.style||{})
        }}
      />
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode,  setMode]  = useState("login");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [busy,  setBusy]  = useState(false);
  const [ready, setReady] = useState(false);
  const [err,   setErr]   = useState("");

  useEffect(() => { setTimeout(()=>setReady(true), 60); }, []);

  const submit = async () => {
    if (!email || !pass) { setErr("Preencha e-mail e senha."); return; }
    setBusy(true); setErr("");
    try {
      if (mode === "login") {
        const { user, error } = await supa.auth.signIn(email, pass);
        if (error) throw new Error(error);
        const prof = await supa.getProfile(user.id);
        onLogin({ id: user.id, name: prof?.name || user.email.split("@")[0], email: user.email });
      } else {
        if (!name) { setErr("Preencha seu nome."); setBusy(false); return; }
        const { user, error } = await supa.auth.signUp(email, pass, name);
        if (error) throw new Error(error);
        if (user?.id) {
          onLogin({ id: user.id, name, email: user.email });
        } else {
          setErr("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
          setMode("login");
        }
      }
    } catch(e) {
      const msgs = {
        "Invalid login credentials": "E-mail ou senha incorretos.",
        "Email not confirmed": "Confirme seu e-mail antes de entrar.",
        "User already registered": "Este e-mail já possui cadastro.",
      };
      setErr(msgs[e.message] || e.message);
    } finally { setBusy(false); }
  };

  const iStyle = {
    width:"100%", background:G.n50, border:`1.5px solid ${G.n200}`,
    borderRadius:"10px", padding:"13px 14px", color:G.n900, fontSize:"15px",
    fontFamily:BODY, outline:"none", transition:"border-color .18s", boxSizing:"border-box"
  };

  return (
    <div style={{minHeight:"100vh",background:"transparent",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <GStyle/><BgPattern/>

      <div style={{
        flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-start",
        padding:"60px 24px 24px", position:"relative", zIndex:1,
        opacity:ready?1:0, transform:ready?"translateY(0)":"translateY(16px)",
        transition:"all .55s cubic-bezier(0.22,1,0.36,1)"
      }}>
        {/* Logo + título */}
        <div style={{marginBottom:"28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
            <div style={{
              width:"40px",height:"40px",borderRadius:"12px",flexShrink:0,
              background:`linear-gradient(135deg,${G.g700},${G.g500})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:`0 4px 16px ${G.glow}`
            }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{fontFamily:HEADING,fontSize:"24px",fontWeight:"800",color:"#FFFFFF",letterSpacing:"-0.5px"}}>TaskFlow</span>
          </div>
          <h1 style={{fontFamily:HEADING,fontSize:"30px",fontWeight:"800",color:"#FFFFFF",letterSpacing:"-1px",lineHeight:1.1,marginBottom:"6px"}}>
            {mode==="login" ? "Bem-vindo." : "Criar conta."}
          </h1>
          <p style={{color:"rgba(255,255,255,.75)",fontSize:"14px",fontFamily:BODY,lineHeight:1.5}}>
            {mode==="login" ? "Entre com seu e-mail e senha." : "Preencha seus dados para começar."}
          </p>
        </div>

        {/* Card branco com form */}
        <div style={{background:"#FFFFFF",borderRadius:"20px",padding:"24px",boxShadow:"0 8px 40px rgba(0,0,0,.18)"}}>
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            {mode==="register" && (
              <div>
                <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>Nome completo</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"
                  style={iStyle}
                  onFocus={e=>{e.target.style.borderColor=G.g500; e.target.style.background=G.white;}}
                  onBlur={e=>{e.target.style.borderColor=G.n200; e.target.style.background=G.n50;}}
                />
              </div>
            )}
            <div>
              <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>E-mail</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" type="email"
                style={iStyle}
                onFocus={e=>{e.target.style.borderColor=G.g500; e.target.style.background=G.white;}}
                onBlur={e=>{e.target.style.borderColor=G.n200; e.target.style.background=G.n50;}}
              />
            </div>
            <div>
              <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>Senha</label>
              <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" type="password"
                style={iStyle}
                onFocus={e=>{e.target.style.borderColor=G.g500; e.target.style.background=G.white;}}
                onBlur={e=>{e.target.style.borderColor=G.n200; e.target.style.background=G.n50;}}
                onKeyDown={e=>e.key==="Enter"&&submit()}
              />
              {mode==="login" && (
                <p style={{textAlign:"right",marginTop:"6px"}}>
                  <span style={{color:G.g500,fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:BODY}}>Esqueceu a senha?</span>
                </p>
              )}
            </div>

            {err && (
              <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:"8px",padding:"10px 14px",display:"flex",gap:"8px",alignItems:"flex-start"}}>
                <span style={{fontSize:"14px",flexShrink:0}}>⚠️</span>
                <p style={{color:G.red,fontFamily:BODY,fontSize:"13px",lineHeight:1.4}}>{err}</p>
              </div>
            )}

            <button onClick={submit} disabled={busy} style={{
              width:"100%", background:busy?G.n300:G.g500, color:G.white,
              border:"none", borderRadius:"12px", padding:"14px",
              fontSize:"15px", fontWeight:"700", fontFamily:BODY,
              cursor:busy?"not-allowed":"pointer",
              boxShadow:busy?"none":`0 4px 16px ${G.glow}`,
              transition:"all .2s", letterSpacing:"0.2px"
            }}>
              {busy ? "Aguarde…" : mode==="login" ? "Entrar" : "Criar conta"}
            </button>
          </div>

          <div style={{textAlign:"center",marginTop:"18px",paddingTop:"16px",borderTop:`1px solid ${G.n100}`}}>
            <span style={{color:G.n500,fontSize:"13px",fontFamily:BODY}}>
              {mode==="login" ? "Não tem uma conta? " : "Já tem uma conta? "}
            </span>
            <span onClick={()=>{setMode(m=>m==="login"?"register":"login"); setErr("");}}
              style={{color:G.g500,fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:BODY}}>
              {mode==="login" ? "Cadastre-se" : "Entrar"}
            </span>
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{textAlign:"center",padding:"10px 16px 24px",position:"relative",zIndex:1}}>
        <p style={{color:"rgba(255,255,255,.45)",fontSize:"11px",fontFamily:BODY,marginBottom:"4px"}}>Seguro · Criptografado · TaskFlow © 2026</p>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:"12px",fontFamily:BODY}}>Um aplicativo <strong style={{color:"rgba(255,255,255,.9)",fontWeight:"700"}}>V&V Consultoria</strong></p>
      </div>
    </div>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onEdit, onDelete, i=0 }) {

  return (
    <div className="task-row fade-up" style={{
      animationDelay:`${i*.04}s`,
      background: G.white,
      border:`1px solid ${G.n200}`,
      borderRadius:"14px", padding:"16px",
      opacity: 1,
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      transition:"all .18s"
    }}

    >
      {/* Row 1: title left + actions right */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px",marginBottom:"16px"}}>
        <p style={{
          color: task.done ? G.n300 : G.n900,
          fontSize:"15px",fontWeight:"700",fontFamily:HEADING,
          letterSpacing:"-0.2px",lineHeight:1.3,
          textDecoration: task.done ? "line-through" : "none",
          flex:1,margin:0
        }}>{task.title}</p>
        <div style={{display:"flex",gap:"10px",flexShrink:0}}>
          <span onClick={()=>onEdit(task)} style={{color:G.n500,fontSize:"12px",fontFamily:BODY,cursor:"pointer",fontWeight:"500",whiteSpace:"nowrap"}}
            onMouseEnter={e=>e.target.style.color=G.g500} onMouseLeave={e=>e.target.style.color=G.n500}>Editar</span>
          <span onClick={()=>onDelete(task.id)} style={{color:G.n500,fontSize:"12px",fontFamily:BODY,cursor:"pointer",fontWeight:"500",whiteSpace:"nowrap"}}
            onMouseEnter={e=>e.target.style.color=G.red} onMouseLeave={e=>e.target.style.color=G.n500}>Remover</span>
        </div>
      </div>
      {/* Row 2: check + chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px",alignItems:"center"}}>
        {/* Checkbox inline */}
        <div onClick={()=>onToggle(task.id)} className="check-box" style={{
          width:"20px",height:"20px",borderRadius:"6px",flexShrink:0,
          border:`2px solid ${task.done ? G.g500 : G.n300}`,
          background: task.done ? G.g500 : G.white,
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",marginRight:"2px",
          boxShadow: task.done ? `0 2px 8px ${G.glow}` : "none"
        }}>
          {task.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span style={{background:priBg(task.priority),color:priColor(task.priority),borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:"600",fontFamily:BODY}}>● {task.priority}</span>
        <span style={{background:G.n100,color:G.n500,borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontFamily:BODY}}>{task.category}</span>
        {task.time && <span style={{color:G.n500,fontSize:"11px",fontFamily:BODY}}>⏰ {task.time}</span>}
        {task.recurrence!=="Nenhuma" && <span style={{color:G.n500,fontSize:"11px",fontFamily:BODY}}>↻ {task.recurrence}</span>}
        {task.photo && <span style={{color:G.n500,fontSize:"11px",fontFamily:BODY}}>📷</span>}
      </div>
    </div>
  );
}

// ─── GENERATE RECURRENCE OCCURRENCES ─────────────────────────────────────────
function generateOccurrences(form) {
  // No recurrence or no dateEnd → single task
  if (form.recurrence === "Nenhuma" || !form.dateEnd || form.dateEnd <= form.date) {
    return [{ ...form, id: form.id || Date.now(), groupId: null }];
  }

  const stepDays = { "Diária":1, "Semanal":7, "Mensal":30 }[form.recurrence] || 1;
  const results = [];
  let cur = new Date(form.date + "T00:00:00");
  const end = new Date(form.dateEnd + "T00:00:00");
  const groupId = form.groupId || Date.now();
  let idx = 0;

  while (cur <= end) {
    const dateStr = cur.toISOString().split("T")[0];
    results.push({
      ...form,
      date: dateStr,
      id: idx === 0 && form.id ? form.id : Date.now() + idx,
      groupId,
      done: false,
    });
    if (form.recurrence === "Mensal") {
      const next = new Date(cur);
      next.setMonth(next.getMonth() + 1);
      cur = next;
    } else {
      cur = new Date(cur.getTime() + stepDays * 864e5);
    }
    idx++;
    if (idx > 365) break; // safety cap
  }
  return results;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function TaskModal({ task, onSave, onClose }) {
  const td = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(task ? {...task, dateEnd:task.dateEnd||"", timeEnd:task.timeEnd||""} : {title:"",category:CATS[0],date:td,dateEnd:"",time:"",timeEnd:"",priority:"Média",recurrence:"Nenhuma",notes:"",photo:null,done:false,groupId:null});
  const [errors, setErrors] = useState(false);
  const previewCount = (() => { if(form.recurrence==="Nenhuma"||!form.dateEnd||form.dateEnd<=form.date) return 1; return generateOccurrences(form).length; })();
  const fileRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  // também adicionar timeEnd ao form inicial


  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(15,23,42,.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-up" style={{
        width:"100%",maxWidth:"480px",maxHeight:"94vh",overflowY:"auto",overflowX:"hidden",
        background:G.white,borderRadius:"24px 24px 0 0",padding:"0 0 36px",
        boxShadow:"0 -12px 60px rgba(0,0,0,.15)"
      }}>
        {/* handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 0"}}>
          <div style={{width:"32px",height:"4px",borderRadius:"2px",background:G.n200}}/>
        </div>

        {/* header */}
        <div style={{padding:"16px 24px 18px",borderBottom:`1px solid ${G.n100}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{color:G.g500,fontSize:"11px",fontWeight:"600",letterSpacing:"1px",textTransform:"uppercase",fontFamily:BODY,marginBottom:"2px"}}>
              {task ? "Modificar" : "Nova tarefa"}
            </p>
            <h2 style={{fontFamily:HEADING,fontSize:"20px",fontWeight:"800",color:G.n900,letterSpacing:"-0.5px"}}>
              {task ? "Editar Tarefa" : "Criar Tarefa"}
            </h2>
          </div>
          <button onClick={onClose} style={{width:"34px",height:"34px",borderRadius:"50%",border:`1px solid ${G.n200}`,background:G.n50,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:G.n500,fontSize:"18px",fontFamily:BODY}}>×</button>
        </div>

        <div style={{padding:"22px 20px",display:"flex",flexDirection:"column",gap:"18px",width:"100%",boxSizing:"border-box"}}>

          {/* Título — obrigatório */}
          <div>
            <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>
              Título <span style={{color:G.red}}>*</span>
            </label>
            <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Descreva a tarefa…"
              style={{width:"100%",background:G.white,border:`1.5px solid ${errors&&!form.title?G.red:G.n200}`,borderRadius:"10px",padding:"12px 14px",color:G.n900,fontSize:"15px",fontFamily:HEADING,fontWeight:"600",outline:"none",transition:"border-color .18s"}}
              onFocus={e=>{e.target.style.borderColor=G.g500;e.target.style.boxShadow=`0 0 0 3px ${G.glow}`}}
              onBlur={e=>{e.target.style.borderColor=(!form.title&&errors)?G.red:G.n200;e.target.style.boxShadow="none"}}
            />
            {errors&&!form.title&&<p style={{color:G.red,fontSize:"11px",fontFamily:BODY,marginTop:"4px"}}>Campo obrigatório</p>}
          </div>

          {/* Data de início — obrigatório | Horário */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",width:"100%"}}>
            <div>
              <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>
                Data de início <span style={{color:G.red}}>*</span>
              </label>
              <input value={form.date||""} onChange={e=>set("date",e.target.value)} type="date"
                style={{width:"100%",boxSizing:"border-box",background:G.white,border:`1.5px solid ${errors&&!form.date?G.red:G.n200}`,borderRadius:"10px",padding:"11px 10px",color:G.n900,fontSize:"13px",fontFamily:BODY,outline:"none",colorScheme:"light",transition:"border-color .18s"}}
                onFocus={e=>e.target.style.borderColor=G.g500} onBlur={e=>e.target.style.borderColor=(!form.date&&errors)?G.red:G.n200}
              />
              {errors&&!form.date&&<p style={{color:G.red,fontSize:"11px",fontFamily:BODY,marginTop:"4px"}}>Campo obrigatório</p>}
            </div>
            <div>
              <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>Horário</label>
              <input value={form.time||""} onChange={e=>set("time",e.target.value)} type="time"
                style={{width:"100%",boxSizing:"border-box",background:G.white,border:`1.5px solid ${G.n200}`,borderRadius:"10px",padding:"11px 10px",color:G.n900,fontSize:"13px",fontFamily:BODY,outline:"none",colorScheme:"light",transition:"border-color .18s"}}
                onFocus={e=>e.target.style.borderColor=G.g500} onBlur={e=>e.target.style.borderColor=G.n200}
              />
            </div>
          </div>

          {/* Data final | Horário final */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",width:"100%"}}>
            <div>
              <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>Data final</label>
              <input value={form.dateEnd||""} onChange={e=>set("dateEnd",e.target.value)} type="date"
                style={{width:"100%",boxSizing:"border-box",background:G.white,border:`1.5px solid ${G.n200}`,borderRadius:"10px",padding:"11px 10px",color:G.n900,fontSize:"13px",fontFamily:BODY,outline:"none",colorScheme:"light",transition:"border-color .18s"}}
                onFocus={e=>e.target.style.borderColor=G.g500} onBlur={e=>e.target.style.borderColor=G.n200}
              />
            </div>
            <div>
              <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>Horário final</label>
              <input value={form.timeEnd||""} onChange={e=>set("timeEnd",e.target.value)} type="time"
                style={{width:"100%",boxSizing:"border-box",background:G.white,border:`1.5px solid ${G.n200}`,borderRadius:"10px",padding:"11px 10px",color:G.n900,fontSize:"13px",fontFamily:BODY,outline:"none",colorScheme:"light",transition:"border-color .18s"}}
                onFocus={e=>e.target.style.borderColor=G.g500} onBlur={e=>e.target.style.borderColor=G.n200}
              />
            </div>
          </div>

          {/* Preview recorrência */}
          {form.recurrence !== "Nenhuma" && form.dateEnd && form.dateEnd > form.date && (
            <div style={{background:G.g50,border:`1px solid ${G.g200}`,borderRadius:"8px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"14px"}}>📅</span>
              <p style={{color:G.g700,fontFamily:BODY,fontSize:"12px",fontWeight:"500"}}>
                Serão criadas <strong>{previewCount} ocorrências</strong> de "{form.title||"esta tarefa"}" ({form.recurrence.toLowerCase()})
              </p>
            </div>
          )}

          {/* Anotações */}
          <div>
            <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"6px",fontFamily:BODY}}>Anotações</label>
            <input value={form.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Detalhes opcionais…"
              style={{width:"100%",background:G.white,border:`1.5px solid ${G.n200}`,borderRadius:"10px",padding:"11px 14px",color:G.n900,fontSize:"14px",fontFamily:BODY,outline:"none",transition:"border-color .18s"}}
              onFocus={e=>e.target.style.borderColor=G.g500} onBlur={e=>e.target.style.borderColor=G.n200}
            />
          </div>

          {/* Categoria */}
          <div>
            <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"9px",fontFamily:BODY}}>Categoria</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>set("category",c)} style={{
                  background: form.category===c ? G.g500 : G.n100,
                  color: form.category===c ? G.white : G.n700,
                  border:"none", borderRadius:"20px", padding:"8px 14px",
                  fontSize:"12px", fontWeight:"500", fontFamily:BODY, cursor:"pointer",
                  transition:"all .15s", boxShadow: form.category===c ? `0 2px 10px ${G.glow}` : "none"
                }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"9px",fontFamily:BODY}}>Prioridade</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {PRIS.map((p,i)=>{
                const clr = [G.red,G.amber,G.g500][i];
                const bg  = [G.g50,G.g50,G.g50][i];
                const on  = form.priority===p;
                return <button key={p} onClick={()=>set("priority",p)} style={{
                  background: on ? clr : G.n100,
                  color: on ? G.white : G.n700,
                  border:"none", borderRadius:"10px", padding:"11px 6px",
                  fontSize:"13px", fontWeight:"600", fontFamily:BODY, cursor:"pointer",
                  transition:"all .15s", boxShadow: on ? `0 3px 12px ${clr}33` : "none"
                }}>{p}</button>;
              })}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"9px",fontFamily:BODY}}>Recorrência</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px"}}>
              {RECS.map(r=>(
                <button key={r} onClick={()=>set("recurrence",r)} style={{
                  background: form.recurrence===r ? G.g100 : G.n100,
                  color: form.recurrence===r ? G.g700 : G.n500,
                  border: `1.5px solid ${form.recurrence===r ? G.g400 : "transparent"}`,
                  borderRadius:"9px", padding:"9px 2px", fontSize:"11px",
                  fontWeight:"600", fontFamily:BODY, cursor:"pointer", transition:"all .15s"
                }}>{r}</button>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div>
            <label style={{display:"block",color:G.n900,fontSize:"11px",fontWeight:"700",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"9px",fontFamily:BODY}}>Foto</label>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
              const f=e.target.files[0]; if(!f) return;
              const r=new FileReader(); r.onload=ev=>set("photo",ev.target.result); r.readAsDataURL(f);
            }}/>
            <button onClick={()=>fileRef.current.click()} style={{
              width:"100%", background:G.n50, border:`1.5px dashed ${G.n200}`,
              borderRadius:"10px", padding:"14px", color:G.n500, fontFamily:BODY,
              fontSize:"13px", cursor:"pointer", transition:"border-color .2s, color .2s"
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=G.g400;e.currentTarget.style.color=G.g500;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=G.n200;e.currentTarget.style.color=G.n500;}}
            >{form.photo ? "📷  Foto anexada ✓" : "📷  Adicionar foto"}</button>
            {form.photo && <img src={form.photo} alt="" style={{width:"100%",borderRadius:"10px",marginTop:"8px",maxHeight:"150px",objectFit:"cover"}}/>}
          </div>

          {/* Save */}
          <button onClick={()=>{
            if(!form.title||!form.date){ setErrors(true); return; }
            const occurrences = generateOccurrences({...form, id:form.id||Date.now()});
            onSave(occurrences);
            onClose();
          }} style={{
            width:"100%", background:G.g500, color:G.white, border:"none",
            borderRadius:"12px", padding:"14px", fontSize:"15px", fontWeight:"600",
            fontFamily:BODY, cursor:"pointer", marginTop:"4px",
            boxShadow:`0 4px 20px ${G.glow}`, transition:"opacity .18s"
          }}
            onMouseEnter={e=>e.currentTarget.style.background=G.g700}
            onMouseLeave={e=>e.currentTarget.style.background=G.g500}
          >{task ? "Salvar alterações" : "Criar tarefa"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function BarChart({ tasks }) {
  const [range, setRange] = useState(7);
  const days = Array.from({length:range}, (_,i)=>{
    const d = new Date(Date.now() - i*864e5);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit"}).replace(".","·");
    const done  = tasks.filter(t=>t.date===key&&t.done).length;
    const total = tasks.filter(t=>t.date===key).length;
    const late  = key < tod() ? tasks.filter(t=>t.date===key&&!t.done).length : 0;
    const pend  = key >= tod() ? total-done : 0;
    return {key,label,done,pend,late,total};
  });
  const maxVal = Math.max(...days.map(d=>d.total), 1);
  const BAR_H = 120;

  return (
    <div className="fade-up" style={{animationDelay:".36s",background:G.white,border:`1px solid ${G.n200}`,borderRadius:"18px",padding:"20px",marginBottom:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
        <h3 style={{fontFamily:HEADING,fontSize:"14px",fontWeight:"700",color:G.n900}}>Tarefas</h3>
        <div style={{display:"flex",gap:"4px",background:G.n100,borderRadius:"8px",padding:"3px"}}>
          {[7,14,30].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{
              background:range===r?G.g500:"transparent",
              color:range===r?G.white:G.n500,
              border:"none",borderRadius:"6px",padding:"4px 10px",
              fontSize:"11px",fontWeight:"600",fontFamily:BODY,cursor:"pointer",transition:"all .15s"
            }}>{r}d</button>
          ))}
        </div>
      </div>

      {/* bars */}
      <div style={{display:"flex",alignItems:"flex-end",gap:range<=7?"6px":"4px",height:`${BAR_H+28}px`,overflowX:range>7?"auto":"visible",paddingBottom:"4px"}}>
        {days.map((d,i)=>{
            const isToday = d.key===tod();
          return (
            <div key={d.key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",flex:range<=7?"1":"0 0 auto",minWidth:range<=7?"0":`${Math.max(100/Math.min(range,10),8)}%`}}>
              {/* tooltip on hover handled via title */}
              {(()=>{
                const pendH = d.pend>0 ? Math.max(Math.round((d.pend/maxVal)*BAR_H),18) : 0;
                const lateH = d.late>0 ? Math.max(Math.round((d.late/maxVal)*BAR_H),18) : 0;
                const doneH = d.done>0 ? Math.max(Math.round((d.done/maxVal)*BAR_H),18) : 0;
                const lblStyle = {position:"absolute",left:0,right:0,textAlign:"center",color:"rgba(0,0,0,.55)",fontSize:"9px",fontWeight:"700",fontFamily:"Inter,sans-serif",lineHeight:1,pointerEvents:"none"};
                const lblStyleW = {...lblStyle,color:"rgba(255,255,255,.9)"};
                return (
                  <div title={`${d.done} feitas · ${d.pend} pendentes · ${d.late} atrasadas`} style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",height:`${BAR_H}px`,width:"100%",gap:"2px",cursor:"default"}}>
                    {d.pend>0 && <div style={{width:"100%",height:`${pendH}px`,background:G.n200,borderRadius:"4px 4px 0 0",transition:"height .6s ease",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {pendH>=14 && <span style={lblStyle}>{d.pend}</span>}
                    </div>}
                    {d.late>0 && <div style={{width:"100%",height:`${lateH}px`,background:"#FCA5A5",borderRadius:d.done>0?"0":"4px 4px 0 0",transition:"height .6s ease",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {lateH>=14 && <span style={lblStyle}>{d.late}</span>}
                    </div>}
                    {d.done>0 && <div style={{width:"100%",height:`${doneH}px`,background:isToday?G.g500:`linear-gradient(180deg,${G.g400},${G.g700})`,borderRadius:(d.pend>0||d.late>0)?"0":"4px 4px 0 0",transition:"height .6s ease",boxShadow:isToday?`0 2px 8px ${G.glow}`:"none",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {doneH>=14 && <span style={lblStyleW}>{d.done}</span>}
                    </div>}
                    {d.total===0 && <div style={{width:"100%",height:"3px",background:G.n100,borderRadius:"2px"}}/>}
                  </div>
                );
              })()}
              <span style={{color:G.n900,fontSize:"9px",fontFamily:BODY,fontWeight:isToday?"700":"500",letterSpacing:"0.3px",textAlign:"center",lineHeight:1.2}}>{d.label}</span>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{display:"flex",gap:"14px",marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${G.n200}`}}>
        {[{c:G.g500,l:"Concluídas"},{c:G.n200,l:"Pendentes"},{c:"#FCA5A5",l:"Atrasadas"}].map(x=>(
          <div key={x.l} style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"10px",height:"10px",borderRadius:"2px",background:x.c,flexShrink:0}}/>
            <span style={{color:G.n500,fontSize:"11px",fontFamily:BODY}}>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reports({ tasks, allTasks }) {
  const [repFilter, setRepFilter] = useState("Tudo");
  const filtered = (() => {
    if(repFilter==="Atrasadas") return tasks.filter(t=>!t.done&&t.date<tod());
    if(repFilter==="Hoje")      return tasks.filter(t=>t.date===tod());
    if(repFilter==="Amanhã")    return tasks.filter(t=>t.date===tmr());
    if(repFilter==="Semana")    return tasks.filter(t=>t.date>=tod()&&t.date<=wend());
    return tasks;
  })();
  const total = filtered.length;
  const done  = filtered.filter(t=>t.done).length;
  const pct   = total ? Math.round(done/total*100) : 0;
  const late  = filtered.filter(t=>!t.done&&t.date<tod()).length;
  const REP_FILTERS = ["Atrasadas","Hoje","Amanhã","Semana","Tudo"];
  const repCounts = {
    "Atrasadas": tasks.filter(t=>!t.done&&t.date<tod()).length,
    "Hoje":      tasks.filter(t=>t.date===tod()).length,
    "Amanhã":    tasks.filter(t=>t.date===tmr()).length,
    "Semana":    tasks.filter(t=>t.date>=tod()&&t.date<=wend()).length,
    "Tudo":      tasks.length,
  };

  return (
    <div style={{paddingBottom:"110px"}}>
      {/* Filter bar */}
      <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"12px",marginBottom:"4px"}}>
        {REP_FILTERS.map(f=>(
          <button key={f} onClick={()=>setRepFilter(f)} style={{
            background: repFilter===f ? (f==="Atrasadas"?G.red:G.g500) : G.white,
            color: repFilter===f ? G.white : (f==="Atrasadas"&&repCounts[f]>0?G.red:G.n500),
            border:`1.5px solid ${repFilter===f?(f==="Atrasadas"?G.red:G.g500):(f==="Atrasadas"&&repCounts[f]>0?"#FEE2E2":G.n200)}`,
            borderRadius:"20px",padding:"6px 12px",fontSize:"12px",fontWeight:"600",
            fontFamily:BODY,cursor:"pointer",whiteSpace:"nowrap",transition:"all .18s",
            display:"flex",alignItems:"center",gap:"5px",
            boxShadow: repFilter===f?`0 2px 8px ${f==="Atrasadas"?"rgba(239,68,68,.25)":G.glow}`:"none"
          }}>
            {f}
            <span style={{
              background:repFilter===f?"rgba(255,255,255,.25)":(f==="Atrasadas"&&repCounts[f]>0?"#FEE2E2":G.n100),
              color:repFilter===f?G.white:(f==="Atrasadas"&&repCounts[f]>0?G.red:G.n500),
              borderRadius:"10px",padding:"1px 6px",fontSize:"10px",fontWeight:"700"
            }}>{repCounts[f]}</span>
          </button>
        ))}
      </div>

      {/* KPI strip — compact horizontal row */}
      <div className="fade-up" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"14px"}}>
        {[
          {v:total,     l:"Total",    c:G.g700,  icon:"📋"},
          {v:done,      l:"Feitas",   c:G.g700,  icon:"✅"},
          {v:total-done,l:"Pend.",    c:G.amber, icon:"⏳"},
          {v:late,      l:"Atraso",   c:G.red,   icon:"⚠️"},  // eslint-disable-line
        ].map((s,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.n200}`,borderRadius:"12px",padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:"16px",marginBottom:"5px"}}>{s.icon}</div>
            <p style={{color:s.c,fontFamily:HEADING,fontSize:"20px",fontWeight:"800",letterSpacing:"-0.8px",lineHeight:1}}>{s.v}</p>
            <p style={{color:G.n400||G.n500,fontFamily:BODY,fontSize:"10px",marginTop:"3px"}}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Completion ring — compact inline */}
      <div className="fade-up" style={{animationDelay:".12s",background:G.white,border:`1px solid ${G.n200}`,borderRadius:"16px",padding:"16px 20px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"16px"}}>
        <div style={{position:"relative",flexShrink:0,width:"60px",height:"60px"}}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="none" stroke={G.n200} strokeWidth="5"/>
            <circle cx="30" cy="30" r="24" fill="none" stroke={G.g500} strokeWidth="5"
              strokeDasharray={`${2*Math.PI*24*pct/100} ${2*Math.PI*24}`}
              strokeLinecap="round" transform="rotate(-90 30 30)"
              style={{transition:"stroke-dasharray 1.1s ease"}}/>
            <text x="30" y="34" textAnchor="middle" fill={G.n900} fontSize="12" fontWeight="800" fontFamily="Plus Jakarta Sans,sans-serif">{pct}%</text>
          </svg>
        </div>
        <div style={{flex:1}}>
          <p style={{color:G.n900,fontFamily:HEADING,fontSize:"14px",fontWeight:"700",marginBottom:"3px"}}>Taxa de conclusão</p>
          <p style={{color:G.n500,fontFamily:BODY,fontSize:"12px",marginBottom:"8px"}}>{done} de {total} tarefas</p>
          <div style={{height:"4px",background:G.n100,borderRadius:"2px"}}>
            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${G.g700},${G.g400})`,borderRadius:"2px",transition:"width 1.1s ease"}}/>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <BarChart tasks={tasks}/>

      {/* By category */}
      <div className="fade-up" style={{animationDelay:".44s",background:G.white,border:`1px solid ${G.n200}`,borderRadius:"16px",padding:"18px",marginBottom:"12px"}}>
        <h3 style={{fontFamily:HEADING,fontSize:"14px",fontWeight:"700",color:G.n900,marginBottom:"14px"}}>Por Categoria</h3>
        {CATS.map(cat=>{
          const cnt=filtered.filter(t=>t.category===cat).length;
          const dn=filtered.filter(t=>t.category===cat&&t.done).length;
          return <div key={cat} style={{marginBottom:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
              <span style={{color:G.n700,fontFamily:BODY,fontSize:"12px",fontWeight:"500"}}>{cat}</span>
              <span style={{color:G.n900,fontFamily:BODY,fontSize:"11px",fontWeight:"600"}}>{dn}/{cnt}</span>
            </div>
            <div style={{height:"5px",background:G.n100,borderRadius:"3px"}}>
              <div style={{height:"100%",width:`${cnt?(dn/cnt)*100:0}%`,background:`linear-gradient(90deg,${G.g700},${G.g400})`,borderRadius:"3px",transition:"width 1.1s ease"}}/>
            </div>
          </div>;
        })}
      </div>

      {/* By priority */}
      <div className="fade-up" style={{animationDelay:".52s",background:G.white,border:`1px solid ${G.n200}`,borderRadius:"16px",padding:"18px"}}>
        <h3 style={{fontFamily:HEADING,fontSize:"14px",fontWeight:"700",color:G.n900,marginBottom:"14px"}}>Por Prioridade</h3>
        {PRIS.map((p,i)=>{
          const clr=[G.red,G.amber,G.g500][i];
          const cnt=filtered.filter(t=>t.priority===p).length;
          const dn=filtered.filter(t=>t.priority===p&&t.done).length;
          return <div key={p} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"11px"}}>
            <span style={{color:clr,fontFamily:BODY,fontSize:"11px",fontWeight:"700",width:"52px",flexShrink:0,whiteSpace:"nowrap"}}>● {p}</span>
            <div style={{flex:1,height:"5px",background:G.n100,borderRadius:"3px"}}>
              <div style={{height:"100%",width:`${cnt?(dn/cnt)*100:0}%`,background:clr,borderRadius:"3px",transition:"width 1.1s ease",opacity:.9}}/>
            </div>
            <span style={{color:G.n900,fontFamily:BODY,fontSize:"10px",fontWeight:"600",width:"26px",textAlign:"right",flexShrink:0}}>{dn}/{cnt}</span>
          </div>;
        })}
      </div>
    </div>
  );
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function Profile({ user, setUser, tasks, onLogout }) {
  const [screen, setScreen]   = useState("main"); // main | editUser | notifications | privacy | support
  const [editData, setEditData] = useState({ name: user.name, phone: "", address: "", city: "" });
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifBefore, setNotifBefore]   = useState("15min");

  const NOTIF_OPTIONS = [
    { val:"5min",   label:"5 minutos antes" },
    { val:"15min",  label:"15 minutos antes" },
    { val:"30min",  label:"30 minutos antes" },
    { val:"1h",     label:"1 hora antes" },
    { val:"2h",     label:"2 horas antes" },
    { val:"1d",     label:"1 dia antes" },
  ];

  const iStyle = {
    width:"100%", boxSizing:"border-box", background:G.n50,
    border:`1.5px solid ${G.n200}`, borderRadius:"10px",
    padding:"11px 14px", color:G.n900, fontSize:"14px",
    fontFamily:BODY, outline:"none", transition:"border-color .18s"
  };
  const lStyle = {
    display:"block", color:G.n900, fontSize:"11px", fontWeight:"700",
    letterSpacing:"0.7px", textTransform:"uppercase", marginBottom:"6px", fontFamily:BODY
  };

  // ── EDIT USER ──
  if (screen === "editUser") return (
    <div style={{paddingBottom:"110px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
        <button onClick={()=>setScreen("main")} style={{background:"none",border:"none",cursor:"pointer",fontSize:"20px",color:G.white}}>←</button>
        <h2 style={{fontFamily:HEADING,fontSize:"18px",fontWeight:"800",color:G.white,margin:0}}>Editar Perfil</h2>
      </div>
      <div style={{background:G.white,borderRadius:"16px",padding:"20px",display:"flex",flexDirection:"column",gap:"14px",marginBottom:"14px"}}>
        {[
          {label:"Nome completo", key:"name",    placeholder:"Seu nome"},
          {label:"Telefone",      key:"phone",   placeholder:"(00) 00000-0000"},
          {label:"Endereço",      key:"address", placeholder:"Rua, número"},
          {label:"Cidade",        key:"city",    placeholder:"Cidade / Estado"},
        ].map(f=>(
          <div key={f.key}>
            <label style={lStyle}>{f.label}</label>
            <input value={editData[f.key]||""} onChange={e=>setEditData(d=>({...d,[f.key]:e.target.value}))}
              placeholder={f.placeholder} style={iStyle}
              onFocus={e=>e.target.style.borderColor=G.g500}
              onBlur={e=>e.target.style.borderColor=G.n200}
            />
          </div>
        ))}
        <div>
          <label style={lStyle}>E-mail (não editável)</label>
          <input value={user.email} disabled style={{...iStyle, background:G.n100, color:G.n500, cursor:"not-allowed"}}/>
        </div>
      </div>
      <button onClick={()=>{ setUser(u=>({...u, name:editData.name||u.name})); setScreen("main"); }} style={{
        width:"100%", background:G.g500, color:G.white, border:"none",
        borderRadius:"12px", padding:"14px", fontSize:"15px", fontWeight:"600",
        fontFamily:BODY, cursor:"pointer", boxShadow:`0 4px 16px ${G.glow}`
      }}>Salvar alterações</button>
    </div>
  );

  // ── NOTIFICAÇÕES ──
  if (screen === "notifications") return (
    <div style={{paddingBottom:"110px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
        <button onClick={()=>setScreen("main")} style={{background:"none",border:"none",cursor:"pointer",fontSize:"20px",color:G.white}}>←</button>
        <h2 style={{fontFamily:HEADING,fontSize:"18px",fontWeight:"800",color:G.white,margin:0}}>Notificações</h2>
      </div>
      <div style={{background:G.white,borderRadius:"16px",padding:"20px",marginBottom:"12px"}}>
        {/* Toggle */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"16px",borderBottom:`1px solid ${G.n100}`,marginBottom:"16px"}}>
          <div>
            <p style={{color:G.n900,fontFamily:BODY,fontSize:"15px",fontWeight:"600",marginBottom:"2px"}}>Ativar alertas</p>
            <p style={{color:G.n500,fontFamily:BODY,fontSize:"12px"}}>Receber lembretes das tarefas</p>
          </div>
          <div onClick={()=>setNotifEnabled(v=>!v)} style={{
            width:"48px",height:"26px",borderRadius:"13px",cursor:"pointer",
            background:notifEnabled?G.g500:G.n200,
            transition:"background .2s",position:"relative",flexShrink:0
          }}>
            <div style={{
              position:"absolute",top:"3px",
              left:notifEnabled?"23px":"3px",
              width:"20px",height:"20px",borderRadius:"50%",
              background:G.white,boxShadow:"0 1px 4px rgba(0,0,0,.2)",
              transition:"left .2s"
            }}/>
          </div>
        </div>
        {/* Antecedência */}
        {notifEnabled && (
          <div>
            <p style={{color:G.n900,fontFamily:BODY,fontSize:"14px",fontWeight:"600",marginBottom:"12px"}}>Lembrar com antecedência</p>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {NOTIF_OPTIONS.map(opt=>(
                <div key={opt.val} onClick={()=>setNotifBefore(opt.val)} style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"12px 14px",borderRadius:"10px",cursor:"pointer",
                  background:notifBefore===opt.val?G.g50:G.n50,
                  border:`1.5px solid ${notifBefore===opt.val?G.g500:G.n200}`,
                  transition:"all .15s"
                }}>
                  <span style={{color:G.n900,fontFamily:BODY,fontSize:"14px"}}>{opt.label}</span>
                  {notifBefore===opt.val && (
                    <div style={{width:"18px",height:"18px",borderRadius:"50%",background:G.g500,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={()=>setScreen("main")} style={{
        width:"100%", background:G.g500, color:G.white, border:"none",
        borderRadius:"12px", padding:"14px", fontSize:"15px", fontWeight:"600",
        fontFamily:BODY, cursor:"pointer", boxShadow:`0 4px 16px ${G.glow}`
      }}>Salvar preferências</button>
    </div>
  );

  // ── PRIVACIDADE ──
  if (screen === "privacy") return (
    <div style={{paddingBottom:"110px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
        <button onClick={()=>setScreen("main")} style={{background:"none",border:"none",cursor:"pointer",fontSize:"20px",color:G.white}}>←</button>
        <h2 style={{fontFamily:HEADING,fontSize:"18px",fontWeight:"800",color:G.white,margin:0}}>Privacidade</h2>
      </div>
      <div style={{background:G.white,borderRadius:"16px",padding:"20px",marginBottom:"12px"}}>
        <p style={{color:G.n900,fontFamily:HEADING,fontSize:"15px",fontWeight:"700",marginBottom:"12px"}}>Seus dados</p>
        <p style={{color:G.n500,fontFamily:BODY,fontSize:"13px",lineHeight:1.6,marginBottom:"16px"}}>
          O TaskFlow armazena suas tarefas e preferências localmente no dispositivo. Nenhum dado pessoal é compartilhado com terceiros.
        </p>
        {[
          {icon:"🔐", t:"Dados criptografados", s:"Suas informações são protegidas localmente"},
          {icon:"🚫", t:"Sem rastreamento",      s:"Não coletamos dados de uso ou comportamento"},
          {icon:"📵", t:"Sem anúncios",          s:"O app não exibe publicidade de nenhum tipo"},
        ].map(item=>(
          <div key={item.t} style={{display:"flex",gap:"12px",alignItems:"flex-start",padding:"12px 0",borderBottom:`1px solid ${G.n100}`}}>
            <span style={{fontSize:"20px",flexShrink:0}}>{item.icon}</span>
            <div>
              <p style={{color:G.n900,fontFamily:BODY,fontSize:"13px",fontWeight:"600"}}>{item.t}</p>
              <p style={{color:G.n500,fontFamily:BODY,fontSize:"12px",marginTop:"2px"}}>{item.s}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onLogout} style={{
        width:"100%", background:G.white, color:G.red,
        border:`1.5px solid #FEE2E2`, borderRadius:"12px", padding:"13px",
        fontSize:"14px", fontWeight:"600", fontFamily:BODY, cursor:"pointer"
      }}>Excluir minha conta</button>
    </div>
  );

  // ── SUPORTE ──
  if (screen === "support") return (
    <div style={{paddingBottom:"110px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
        <button onClick={()=>setScreen("main")} style={{background:"none",border:"none",cursor:"pointer",fontSize:"20px",color:G.white}}>←</button>
        <h2 style={{fontFamily:HEADING,fontSize:"18px",fontWeight:"800",color:G.white,margin:0}}>Suporte</h2>
      </div>
      <div style={{background:G.white,borderRadius:"16px",padding:"20px",marginBottom:"12px"}}>
        <p style={{color:G.n900,fontFamily:HEADING,fontSize:"15px",fontWeight:"700",marginBottom:"4px"}}>Precisa de ajuda?</p>
        <p style={{color:G.n500,fontFamily:BODY,fontSize:"13px",marginBottom:"20px"}}>Entre em contato com nossa equipe.</p>
        {[
          {icon:"📧", t:"E-mail", s:"suporte@vvConsultoria.com.br", color:G.g500},
          {icon:"💬", t:"WhatsApp", s:"(00) 00000-0000", color:G.g500},
          {icon:"🌐", t:"Site", s:"www.vvconsultoria.com.br", color:G.g500},
        ].map(item=>(
          <div key={item.t} style={{display:"flex",gap:"14px",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${G.n100}`}}>
            <div style={{width:"40px",height:"40px",borderRadius:"12px",background:G.g50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{item.icon}</div>
            <div>
              <p style={{color:G.n500,fontFamily:BODY,fontSize:"11px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.5px"}}>{item.t}</p>
              <p style={{color:item.color,fontFamily:BODY,fontSize:"14px",fontWeight:"600",marginTop:"1px"}}>{item.s}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:G.white,borderRadius:"16px",padding:"20px"}}>
        <p style={{color:G.n900,fontFamily:HEADING,fontSize:"14px",fontWeight:"700",marginBottom:"14px"}}>Perguntas frequentes</p>
        {[
          {q:"Como criar uma tarefa recorrente?", a:"Ao criar a tarefa, selecione a recorrência desejada e defina a data final do período."},
          {q:"Como exportar minhas tarefas?", a:"Em breve disponível. Nossa equipe está desenvolvendo essa funcionalidade."},
          {q:"Posso usar em vários dispositivos?", a:"Atualmente o app funciona localmente. Sincronização em nuvem está no roadmap."},
        ].map((item,i,arr)=>(
          <details key={item.q} style={{borderBottom:i<arr.length-1?`1px solid ${G.n100}`:"none",paddingBottom:"12px",marginBottom:"12px"}}>
            <summary style={{color:G.n900,fontFamily:BODY,fontSize:"13px",fontWeight:"600",cursor:"pointer",listStyle:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {item.q} <span style={{color:G.g500,fontSize:"16px"}}>+</span>
            </summary>
            <p style={{color:G.n500,fontFamily:BODY,fontSize:"12px",lineHeight:1.6,marginTop:"8px"}}>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );

  // ── MAIN ──
  return (
    <div style={{paddingBottom:"110px"}}>
      {/* user hero */}
      <div className="fade-up" style={{background:`linear-gradient(135deg,${G.g900},${G.g700})`,borderRadius:"20px",padding:"24px",marginBottom:"14px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-40px",right:"-40px",width:"160px",height:"160px",borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"20px"}}>
          <div style={{
            width:"56px",height:"56px",borderRadius:"16px",
            background:`linear-gradient(135deg,${G.g400},${G.g500})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"22px",fontWeight:"800",color:G.white,fontFamily:HEADING,
            boxShadow:"0 4px 16px rgba(0,0,0,.2)",flexShrink:0
          }}>{user.name[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <h2 style={{fontFamily:HEADING,fontSize:"18px",fontWeight:"800",color:G.white,marginBottom:"2px",letterSpacing:"-0.3px"}}>{user.name}</h2>
            <p style={{color:"rgba(255,255,255,.55)",fontFamily:BODY,fontSize:"13px"}}>{user.email}</p>
          </div>
          <button onClick={()=>setScreen("editUser")} style={{
            background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",
            borderRadius:"10px",padding:"8px 14px",color:G.white,fontFamily:BODY,
            fontSize:"12px",fontWeight:"600",cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",gap:"6px"
          }}>✏️ Editar</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1px",background:"rgba(255,255,255,.1)",borderRadius:"12px",overflow:"hidden"}}>
          {[["Tarefas",tasks.length],["Feitas",tasks.filter(t=>t.done).length],["Streak","4🔥"]].map(([l,v])=>(
            <div key={l} style={{background:G.g900,padding:"14px 8px",textAlign:"center"}}>
              <p style={{color:G.white,fontFamily:HEADING,fontSize:"20px",fontWeight:"800",letterSpacing:"-0.5px"}}>{v}</p>
              <p style={{color:"rgba(255,255,255,.45)",fontFamily:BODY,fontSize:"11px",marginTop:"2px"}}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* menu */}
      <div style={{background:G.white,border:`1px solid ${G.n200}`,borderRadius:"18px",overflow:"hidden",marginBottom:"12px"}}>
        {[
          {icon:"🔔", label:"Notificações", sub: notifEnabled?"Ativado — "+NOTIF_OPTIONS.find(o=>o.val===notifBefore)?.label:"Desativado", action:()=>setScreen("notifications")},
          {icon:"🔒", label:"Privacidade",  sub:"Dados e segurança",  action:()=>setScreen("privacy")},
          {icon:"❓", label:"Suporte",      sub:"Ajuda e contato",    action:()=>setScreen("support")},
        ].map((item,i,arr)=>(
          <div key={item.label} onClick={item.action} className="menu-row" style={{
            padding:"16px 18px",
            borderBottom: i<arr.length-1 ? `1px solid ${G.n100}` : "none",
            display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",
            background:G.white
          }}>
            <div style={{display:"flex",gap:"14px",alignItems:"center"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"10px",background:G.n50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px"}}>{item.icon}</div>
              <div>
                <p style={{color:G.n900,fontFamily:BODY,fontSize:"14px",fontWeight:"500"}}>{item.label}</p>
                <p style={{color:G.n300,fontFamily:BODY,fontSize:"12px",marginTop:"1px"}}>{item.sub}</p>
              </div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke={G.n300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        ))}
      </div>

      <button onClick={onLogout} style={{
        width:"100%", background:G.white, color:G.red,
        border:`1.5px solid #FEE2E2`, borderRadius:"14px", padding:"14px",
        fontSize:"14px", fontWeight:"600", fontFamily:BODY, cursor:"pointer", transition:"all .18s"
      }}
        onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";}}
        onMouseLeave={e=>{e.currentTarget.style.background=G.white;}}
      >Sair da conta</button>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,     setUser]      = useState(null);
  const [tasks,    setTasks]     = useState([]);
  const [loading,  setLoading]   = useState(true);
  const [tab,      setTab]       = useState("home");
  const [filter,   setFilter]    = useState("Hoje");
  const [modal,    setModal]     = useState(false);
  const [editTask, setEditTask]  = useState(null);
  const [search,   setSearch]    = useState("");
  const [sfocus,   setSfocus]    = useState(false);

  // ── Restaurar sessão do localStorage ──
  useEffect(() => {
    try {
      const token  = LS.get("tf_token");
      const uid    = LS.get("tf_uid");
      const cached = LS.get("tf_session");
      if (token && uid && cached?.id) {
        setUser(cached);
      }
    } catch(e) {}
    setLoading(false);
  }, []);

  // ── Load tasks when user logs in ──
  useEffect(() => {
    if (!user?.id) return;
    loadTasks();
  }, [user?.id]);

  const loadTasks = async () => {
    const { data, error } = await supa.select("tasks", { user_id: user.id });
    if (error) { console.error("loadTasks:", error); return; }
    if (data) {
      const sorted = [...data].sort((a,b)=>{
        const da = (a.date||"") + (a.time||"00:00");
        const db2 = (b.date||"") + (b.time||"00:00");
        return da < db2 ? -1 : da > db2 ? 1 : 0;
      });
      // mapear campos do banco para o app
      setTasks(sorted.map(r => ({
        id: r.id, title: r.title, category: r.category, date: r.date,
        dateEnd: r.date_end, time: r.time, timeEnd: r.time_end,
        priority: r.priority, recurrence: r.recurrence, notes: r.notes,
        photo: r.photo, done: r.done, groupId: r.group_id, user_id: r.user_id
      })));
    }
  };

  // ── DB ↔ App converters ──
  // ── Helpers localStorage ──────────────────────────────────────────────────

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks(ts => ts.map(t => t.id === id ? {...t, done:newDone} : t));
    await supa.update("tasks", { id }, { done: newDone });
  };

  const [confirmDelete, setConfirmDelete] = useState(null);
  const deleteTask = id => setConfirmDelete(id);
  const confirmDeleteTask = async () => {
    await supa.delete("tasks", { id: confirmDelete });
    setTasks(ts => ts.filter(t => t.id !== confirmDelete));
    setConfirmDelete(null);
  };

  const saveTask = async (input) => {
    const arr = Array.isArray(input) ? input : [input];
    const groupId = arr[0].groupId;

    // Remove grupo antigo se edição recorrente
    if (groupId) {
      await supa.delete("tasks", { group_id: groupId });
      setTasks(ts => ts.filter(t => t.groupId !== groupId));
    } else {
      const existingId = arr[0].id;
      if (existingId && tasks.find(t => t.id === existingId)) {
        await supa.delete("tasks", { id: existingId });
        setTasks(ts => ts.filter(t => t.id !== existingId));
      }
    }

    // Converte campos app → banco
    const rows = arr.map(t => ({
      user_id:    user.id,
      title:      t.title,
      category:   t.category,
      date:       t.date       || null,
      date_end:   t.dateEnd    || null,
      time:       t.time       || null,
      time_end:   t.timeEnd    || null,
      priority:   t.priority,
      recurrence: t.recurrence,
      notes:      t.notes      || null,
      photo:      t.photo      || null,
      done:       t.done       || false,
      group_id:   t.groupId    || null,
    }));

    const { data, error } = await supa.insert("tasks", rows);
    if (error) { console.error("saveTask:", error); return; }
    if (data) {
      const mapped = data.map(r => ({
        id: r.id, title: r.title, category: r.category, date: r.date,
        dateEnd: r.date_end, time: r.time, timeEnd: r.time_end,
        priority: r.priority, recurrence: r.recurrence, notes: r.notes,
        photo: r.photo, done: r.done, groupId: r.group_id, user_id: r.user_id
      }));
      setTasks(ts => [...ts, ...mapped]);
    }
  };

  const FILTERS = ["Atrasadas","Hoje","Amanhã","Semana","Tudo"];
  const counts = {
    "Atrasadas":tasks.filter(t=>!t.done&&t.date<tod()).length,
    "Hoje":  tasks.filter(t=>t.date===tod()).length,
    "Amanhã":tasks.filter(t=>t.date===tmr()).length,
    "Semana":tasks.filter(t=>t.date>=tod()&&t.date<=wend()).length,
    "Tudo":  tasks.length,
  };
  const filtered = tasks.filter(t=>{
    const ms = t.title.toLowerCase().includes(search.toLowerCase());
    if(filter==="Atrasadas") return !t.done&&t.date<tod()&&ms;
    if(filter==="Hoje")   return t.date===tod()&&ms;
    if(filter==="Amanhã") return t.date===tmr()&&ms;
    if(filter==="Semana") return t.date>=tod()&&t.date<=wend()&&ms;
    return ms;
  });

  const doneT  = tasks.filter(t=>t.date===tod()&&t.done).length;
  const pendT  = tasks.filter(t=>t.date===tod()&&!t.done).length;
  const totT   = doneT+pendT;
  const pctT   = totT ? Math.round(doneT/totT*100) : 0;



  const dateLabel = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});

  if (loading) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#166534 0%,#16A34A 60%,#14532D 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <GStyle/>
      <div style={{textAlign:"center"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"14px",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:"24px"}}>✦</div>
        <p style={{color:"rgba(255,255,255,.8)",fontFamily:"'Inter',sans-serif",fontSize:"14px"}}>Carregando...</p>
      </div>
    </div>
  );
  if (!user) return <LoginScreen onLogin={(u)=>{ setUser(u); LS.set("tf_session", u); }}/>;

  const NAV = [
    {id:"home",   icon:<HomeIcon/>,   label:"Início"},
    {id:"reports",icon:<ChartIcon/>,  label:"Relatórios"},
    {id:"profile",icon:<UserIcon/>,   label:"Perfil"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"transparent",maxWidth:"480px",margin:"0 auto",fontFamily:BODY,position:"relative"}}>
      <GStyle/><AppBgPattern/>
      <div style={{position:"relative",zIndex:1}}>

        {/* ── HEADER ── */}
        <div style={{position:"sticky",top:0,zIndex:50}}>

          {/* ── TÍTULO PADRÃO (card branco) ── */}
          <div style={{
            background:G.white,
            margin:"16px 16px 0",
            borderRadius:"16px",
            padding:"14px 18px",
            boxShadow:"0 4px 20px rgba(0,0,0,.18)",
            display:"flex",justifyContent:"space-between",alignItems:"center"
          }}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:G.g500,fontSize:"11px",fontFamily:BODY,fontWeight:"600",
                letterSpacing:"0.5px",textTransform:"capitalize",marginBottom:"3px"}}>
                {dateLabel}
              </p>
              <h1 style={{fontFamily:HEADING,fontSize:"20px",fontWeight:"800",
                color:G.g900,letterSpacing:"-0.5px",lineHeight:1.15,margin:0}}>
                {tab==="home" && <>TAREFAS <span style={{color:G.g500,fontWeight:"600",fontSize:"16px"}}>— Para hoje: {totT} tarefa{totT!==1?"s":""}</span></>}
                {tab==="reports" && "RELATÓRIOS"}
                {tab==="profile" && "PERFIL"}
              </h1>
            </div>
            {tab==="home" && (
              <button onClick={()=>{setEditTask(null);setModal(true);}} style={{
                width:"40px",height:"40px",borderRadius:"11px",border:"none",flexShrink:0,marginLeft:"12px",
                background:G.g500,color:G.white,fontSize:"22px",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:`0 4px 14px ${G.glow}`,transition:"background .18s"
              }}
                onMouseEnter={e=>e.currentTarget.style.background=G.g700}
                onMouseLeave={e=>e.currentTarget.style.background=G.g500}
              >+</button>
            )}
          </div>

          {/* ── CONTEÚDO EXTRA DO HOME (progresso, busca, filtros) ── */}
          {tab==="home" && (
            <div style={{padding:"12px 16px 0"}}>
              {/* progress */}
              {totT>0 && (
                <div style={{background:G.white,border:`1px solid ${G.g200}`,borderRadius:"12px",padding:"12px 14px",marginBottom:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <span style={{color:G.n700,fontSize:"12px",fontFamily:BODY,fontWeight:"500"}}>Progresso de hoje</span>
                    <span style={{color:G.g500,fontSize:"13px",fontWeight:"700",fontFamily:HEADING}}>{pctT}%</span>
                  </div>
                  <div style={{height:"5px",background:G.n100,borderRadius:"3px"}}>
                    <div style={{height:"100%",width:`${pctT}%`,background:`linear-gradient(90deg,${G.g700},${G.g400})`,borderRadius:"3px",transition:"width .7s ease"}}/>
                  </div>
                  <p style={{color:G.n900,fontSize:"11px",fontFamily:BODY,marginTop:"6px",fontWeight:"500"}}>{doneT}/{totT} concluídas</p>
                </div>
              )}
              {/* search */}
              <div style={{position:"relative",marginBottom:"10px"}}>
                <span style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:sfocus?G.g500:G.n300,fontSize:"14px",transition:"color .18s"}}>⌕</span>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  onFocus={()=>setSfocus(true)} onBlur={()=>setSfocus(false)}
                  placeholder="Buscar tarefa…"
                  style={{width:"100%",background:G.white,border:`1.5px solid ${sfocus?G.g500:G.g200}`,borderRadius:"10px",padding:"10px 14px 10px 34px",color:G.n900,fontSize:"14px",fontFamily:BODY,outline:"none",transition:"border-color .18s",boxShadow:sfocus?`0 0 0 3px ${G.glow}`:"none"}}
                />
              </div>
              {/* filter pills */}
              <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"12px"}}>
                {FILTERS.map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{
                    background: filter===f
                      ? (f==="Atrasadas" ? G.red : G.g500)
                      : (f==="Atrasadas"&&counts[f]>0 ? "#FFF0F0" : G.white),
                    color: filter===f ? G.white : (f==="Atrasadas"&&counts[f]>0 ? G.red : G.n700),
                    border:`1.5px solid ${filter===f
                      ? (f==="Atrasadas" ? G.red : G.g500)
                      : (f==="Atrasadas"&&counts[f]>0 ? "#FECACA" : G.n200)}`,
                    borderRadius:"20px",padding:"7px 14px",fontSize:"12px",fontWeight:"600",
                    fontFamily:BODY,cursor:"pointer",whiteSpace:"nowrap",transition:"all .18s",
                    display:"flex",alignItems:"center",gap:"6px",
                    boxShadow: filter===f
                      ? (f==="Atrasadas" ? "0 2px 12px rgba(239,68,68,.35)" : `0 2px 10px ${G.glow}`)
                      : "none"
                  }}>
                    {f}
                    <span style={{
                      background: filter===f ? "rgba(255,255,255,.28)" : (f==="Atrasadas"&&counts[f]>0?"#FEE2E2":G.g100),
                      color: filter===f ? G.white : (f==="Atrasadas"&&counts[f]>0?G.red:G.g700),
                      borderRadius:"10px",padding:"1px 7px",fontSize:"10px",fontWeight:"700"
                    }}>{counts[f]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        <div style={{padding:"14px 16px 110px",background:"transparent"}}>

          {tab==="home" && (
            filtered.length===0
            ? <div style={{textAlign:"center",padding:"72px 0",animation:"fadeUp .4s ease both"}}>
                <div style={{width:"56px",height:"56px",borderRadius:"16px",background:G.g50,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:"24px"}}>📋</div>
                <p style={{color:G.n500,fontFamily:BODY,fontSize:"14px",marginBottom:"18px"}}>Nenhuma tarefa encontrada</p>

              </div>
            : <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {(filter==="Semana"||filter==="Tudo") ? (() => {
                  const grp = {};
                  filtered.forEach(t=>{if(!grp[t.date])grp[t.date]=[];grp[t.date].push(t);});
                  return Object.keys(grp).sort().map(date=>(
                    <div key={date}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px",margin:"16px 0 9px"}}>
                        <span style={{color:G.g500,fontSize:"11px",fontWeight:"700",fontFamily:BODY,letterSpacing:"1px",textTransform:"uppercase"}}>{fmtDate(date)}</span>
                        <div style={{flex:1,height:"1px",background:G.n200}}/>
                        <span style={{color:G.n300,fontSize:"11px",fontFamily:BODY}}>{grp[date].length} item{grp[date].length>1?"s":""}</span>
                      </div>
                      {[...grp[date]].sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; const ta=a.time||"00:00", tb=b.time||"00:00"; return ta<tb?-1:ta>tb?1:0; }).map((t,i)=><div key={t.id} style={{marginBottom:"8px"}}>
                        <TaskCard task={t} onToggle={toggleTask} onEdit={t=>{setEditTask(t);setModal(true);}} onDelete={deleteTask} i={i}/>
                      </div>)}
                    </div>
                  ));
                })()
                : [...filtered].sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; const ta=a.time||"00:00", tb=b.time||"00:00"; return ta<tb?-1:ta>tb?1:0; }).map((t,i)=><TaskCard key={t.id} task={t} onToggle={toggleTask} onEdit={t=>{setEditTask(t);setModal(true);}} onDelete={deleteTask} i={i}/>)
                }
              </div>
          )}

          {tab==="reports" && <Reports tasks={tasks} allTasks={tasks}/>}
          {tab==="profile" && <Profile user={user} setUser={setUser} tasks={tasks} onLogout={async()=>{ await supa.auth.signOut(); setUser(null); setTasks([]); }}/>}
        </div>

        {/* ── BOTTOM NAV ── */}
        <div style={{
          position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:"480px",zIndex:50,
          background:"rgba(240,253,244,.97)",backdropFilter:"blur(20px)",
          borderTop:`1px solid ${G.n200}`,padding:"4px 24px 12px",
          display:"flex",justifyContent:"space-around",alignItems:"center"
        }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{
              background:"none",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:"1px",padding:"1px 14px"
            }}>
              <div style={{
                width:"36px",height:"36px",borderRadius:"10px",
                background: tab===n.id ? G.g50 : "transparent",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"background .18s"
              }}>
                <div style={{color: tab===n.id ? G.g500 : G.n300, transition:"color .18s", transform:"scale(1.18)"}}>
                  {n.icon}
                </div>
              </div>
              <span style={{color:tab===n.id?G.g500:G.n300,fontSize:"11px",fontWeight:"600",fontFamily:BODY,letterSpacing:".2px",transition:"color .18s"}}>
                {n.label}
              </span>

            </button>
          ))}


        </div>
      </div>

      {modal && <TaskModal task={editTask} onSave={t=>{saveTask(t);setEditTask(null);}} onClose={()=>{setModal(false);setEditTask(null);}}/>}
      {confirmDelete && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(15,23,42,.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}} onClick={()=>setConfirmDelete(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:G.white,borderRadius:"18px",padding:"28px 24px",width:"100%",maxWidth:"320px",boxShadow:"0 20px 60px rgba(0,0,0,.18)",animation:"fadeUp .25s ease both"}}>
            <div style={{width:"48px",height:"48px",borderRadius:"14px",background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:"22px"}}>🗑️</div>
            <h3 style={{fontFamily:HEADING,fontSize:"18px",fontWeight:"800",color:G.n900,textAlign:"center",marginBottom:"8px",letterSpacing:"-0.3px"}}>Remover tarefa?</h3>
            <p style={{color:G.n500,fontFamily:BODY,fontSize:"13px",textAlign:"center",lineHeight:1.5,marginBottom:"22px"}}>Essa ação não pode ser desfeita. Tem certeza que deseja deletar esta tarefa?</p>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:G.n100,color:G.n700,border:"none",borderRadius:"10px",padding:"12px",fontSize:"14px",fontWeight:"600",fontFamily:BODY,cursor:"pointer"}}>Cancelar</button>
              <button onClick={confirmDeleteTask} style={{flex:1,background:G.red,color:G.white,border:"none",borderRadius:"10px",padding:"12px",fontSize:"14px",fontWeight:"600",fontFamily:BODY,cursor:"pointer",boxShadow:"0 4px 12px rgba(239,68,68,.3)"}}>Sim, deletar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NAV ICONS ───────────────────────────────────────────────────────────────
function HomeIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3L17 9.5V17H13V13H7V17H3V9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function ChartIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="11" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.6"/><rect x="8.5" y="7" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="1.6"/></svg>;
}
function UserIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
