/* =========================================================
   well well · interfaz
   Rutas:  #/              inicio
           #/asistente     Lupi
           #/ingresar      acceso con ID
           #/app/<sección> paciente o familiar
           #/personal      personal de apoyo (recepción)
   ========================================================= */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLORS = ["frosted", "slate", "honeydew"];

  /* ---------- formato de fechas ---------- */
  const fFecha = (d) => new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  const fHora = (d) => new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const fDia = (d) => new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  function cuando(d) {
    const now = new Date(); const t = new Date(d);
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const days = Math.round((b - a) / 86400000);
    if (days === 0) return "hoy";
    if (days === 1) return "mañana";
    if (days === -1) return "ayer";
    if (days > 1) return `en ${days} días`;
    return `hace ${-days} días`;
  }
  function edad(fn) {
    if (!fn) return "";
    const b = new Date(fn + "T12:00:00"), n = new Date();
    let e = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) e--;
    return e + " años";
  }

  /* ---------- íconos ---------- */
  const I = {
    inicio: '<path d="M6 22L24 7l18 15"/><path d="M11 19v22h26V19"/><path d="M20 41V29h8v12"/>',
    ruta: '<circle cx="11" cy="38" r="4"/><path d="M15 38h12a7 7 0 0 0 0-14H19a7 7 0 0 1 0-14h10"/><path d="M33 4v14M33 4l9 4-9 4"/>',
    medicinas: '<rect x="6" y="18" width="36" height="14" rx="7" transform="rotate(-35 24 25)"/><path d="M20 15l10 16"/>',
    citas: '<rect x="6" y="10" width="36" height="32" rx="5"/><path d="M6 20h36M16 6v8M32 6v8"/><circle cx="24" cy="31" r="4"/>',
    expediente: '<path d="M6 14a4 4 0 0 1 4-4h10l4 5h14a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/><path d="M16 28h16M16 34h10"/>',
    avisos: '<path d="M12 34V22a12 12 0 0 1 24 0v12l4 4H8z"/><path d="M20 42a4 4 0 0 0 8 0"/>',
    chat: '<circle cx="16" cy="18" r="9"/><circle cx="32" cy="28" r="9"/><path d="M13 18h.01M19 18h.01M29 28h.01M35 28h.01"/>',
    equipo: '<circle cx="17" cy="16" r="6"/><circle cx="33" cy="18" r="5"/><path d="M5 40c0-7 6-12 12-12s12 5 12 12M28 40c0-6 3-10 8-10s8 4 8 10"/>',
    megafono: '<path d="M8 20v8h6l16 10V10L14 20z"/><path d="M36 18a8 8 0 0 1 0 12"/>',
    ver: '<path d="M4 24s7-13 20-13 20 13 20 13-7 13-20 13S4 24 4 24z"/><circle cx="24" cy="24" r="6"/>',
    bajar: '<path d="M24 6v24M14 20l10 10 10-10"/><path d="M8 36v6h32v-6"/>',
    casa: '<path d="M6 22L24 7l18 15"/><path d="M11 19v22h26V19"/>',
  };
  const icon = (k, cls) => `<svg class="ico ${cls || ""}" viewBox="0 0 48 48" aria-hidden="true">${I[k] || ""}</svg>`;

  const STICKERS = {
    star: '<path d="M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2z" fill="var(--honeydew)"/>',
    heart: '<path d="M24 42S6 30 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 25-18 25z" fill="var(--slate)"/>',
    sun: '<circle cx="24" cy="24" r="10" fill="var(--honeydew)"/><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5"/>',
    smile: '<circle cx="24" cy="24" r="18" fill="var(--frosted)"/><path d="M16 27q8 8 16 0M18 19h.01M30 19h.01"/>',
    cloud: '<path d="M14 36a9 9 0 0 1 0-18 12 12 0 0 1 22 2 8 8 0 0 1-1 16z" fill="var(--frosted)"/>',
  };
  const sticker = (k) => `<svg class="stk" viewBox="0 0 48 48" aria-label="sticker">${STICKERS[k] || ""}</svg>`;

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* =========================================================
     INICIO: avisos del hospital, carrusel y desplegables
     ========================================================= */
  const A = "var(--slate)", B = "var(--frosted)", C = "var(--honeydew)", P = "var(--frosted)";
  // carita feliz (el mismo personaje de Lupi) en (x, y) con radio r
  const face = (x, y, r, cls) => `
    <g class="${cls || ""}" transform="translate(${x} ${y})">
      <circle r="${r}" fill="${B}" stroke="${A}" stroke-width="${r / 7}"/>
      <ellipse cx="${-r * 0.32}" cy="${-r * 0.15}" rx="${r * 0.1}" ry="${r * 0.15}" fill="${A}" class="sc-eye"/>
      <ellipse cx="${r * 0.32}" cy="${-r * 0.15}" rx="${r * 0.1}" ry="${r * 0.15}" fill="${A}" class="sc-eye"/>
      <path d="M${-r * 0.42} ${r * 0.2} q${r * 0.42} ${r * 0.45} ${r * 0.84} 0" fill="none" stroke="${A}" stroke-width="${r / 8}" stroke-linecap="round"/>
    </g>`;

  const SCENES = [
    {
      title: "Llegas", line: "Te recibimos y te explicamos todo, sin prisa.",
      svg: `
        <rect x="40" y="120" width="220" height="14" rx="4" fill="${P}"/>
        <rect x="40" y="96" width="14" height="60" rx="4" fill="${A}"/>
        <rect x="246" y="108" width="14" height="48" rx="4" fill="${A}"/>
        <rect x="58" y="98" width="56" height="24" rx="10" fill="${C}" stroke="${A}" stroke-width="4"/>
        ${face(88, 88, 22, "sc-breathe")}
        <path d="M110 104 h136 v18 h-136z" fill="${B}" stroke="${A}" stroke-width="4"/>
        <line x1="270" y1="30" x2="270" y2="156" stroke="${A}" stroke-width="5" stroke-linecap="round"/>
        <rect x="258" y="34" width="24" height="32" rx="6" fill="${C}" stroke="${A}" stroke-width="4"/>
        <circle cx="270" cy="76" r="3.5" fill="${A}" class="sc-drip"/>
        <text x="120" y="60" class="sc-z" fill="${A}">z</text>
        <text x="138" y="44" class="sc-z sc-z2" fill="${A}">z</text>`,
    },
    {
      title: "Te cuidamos", line: "Tu equipo está contigo de día y de noche.",
      svg: `
        ${face(110, 86, 42, "sc-bob")}
        <path d="M215 72 c0-14 22-18 26-2 c4-16 26-12 26 2 c0 20-26 34-26 34 s-26-14-26-34z" fill="${A}" class="sc-beat"/>
        <polyline points="20,160 90,160 105,136 120,182 138,124 152,160 280,160" fill="none" stroke="${A}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="sc-ecg"/>`,
    },
    {
      title: "Vas mejorando", line: "Cada día, un pasito más arriba.",
      svg: `
        <rect x="40" y="140" width="44" height="30" fill="${P}" class="sc-grow"/>
        <rect x="92" y="114" width="44" height="56" fill="${B}" stroke="${A}" stroke-width="4" class="sc-grow sc-g2"/>
        <rect x="144" y="88" width="44" height="82" fill="${P}" class="sc-grow sc-g3"/>
        <rect x="196" y="58" width="44" height="112" fill="${A}" class="sc-grow sc-g4"/>
        <line x1="30" y1="170" x2="270" y2="170" stroke="${A}" stroke-width="5" stroke-linecap="round"/>
        <g class="sc-climb">${face(0, 0, 18)}</g>
        <path d="M250 50 l14 -16 l14 16 M264 34 v40" fill="none" stroke="${A}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="sc-arrow"/>`,
    },
    {
      title: "¡De alta!", line: "De regreso a casa. ¡Lo lograste!",
      svg: `
        <path d="M180 80 l50 -40 l50 40 v90 h-100z" fill="${B}" stroke="${A}" stroke-width="5" stroke-linejoin="round"/>
        <rect x="212" y="114" width="36" height="56" fill="${C}" stroke="${A}" stroke-width="4"/>
        <rect x="212" y="114" width="36" height="56" fill="${A}" class="sc-door"/>
        <line x1="20" y1="170" x2="290" y2="170" stroke="${A}" stroke-width="5" stroke-linecap="round"/>
        <g class="sc-walk">${face(0, 0, 22)}</g>
        ${[[30, P], [70, A], [110, B], [150, P], [190, A], [250, B], [280, P]].map(([x, c], k) => `<rect x="${x}" y="-12" width="8" height="12" rx="2" fill="${c}" class="sc-confetti" style="animation-delay:${(k * 0.35).toFixed(2)}s"/>`).join("")}`,
    },
  ];

  // Banda de avisos del hospital: la llena recepción desde su panel
  async function renderTicker() {
    const list = await Store.avisos().catch(() => []);
    const band = $("#avisosBand");
    band.hidden = !list.length;
    if (!list.length) return;
    const strip = list.map((a) => `<span class="mq-item">${esc(a.texto)}</span><span class="mq-star" aria-hidden="true">✶</span>`).join("");
    $("#marqueeTrack").innerHTML = strip + strip;
    $("#marqueeTrack").style.animationDuration = Math.max(24, list.length * 9) + "s";
  }

  function buildHome() {
    renderTicker();

    $("#carousel").innerHTML = SCENES.map((s, i) => `
      <article class="slide bg-${COLORS[i % COLORS.length]}" style="--tilt:${i % 2 ? 1.2 : -1.2}deg">
        <div class="scene"><svg viewBox="0 0 300 200" aria-hidden="true">${s.svg}</svg></div>
        <span class="kicker">Paso ${i + 1} de ${SCENES.length}</span>
        <h3 class="slide-title">${esc(s.title)}</h3>
        <p class="slide-line">${esc(s.line)}</p>
      </article>`).join("");
    $("#carDots").innerHTML = SCENES.map((_, i) => `<button class="dot" data-i="${i}" aria-label="Ir al paso ${i + 1}"></button>`).join("");

    const car = $("#carousel");
    const step = () => { const s = car.querySelector(".slide"); return s ? s.getBoundingClientRect().width + 20 : 300; };
    $("#carPrev").onclick = () => car.scrollBy({ left: -step(), behavior: "smooth" });
    $("#carNext").onclick = () => {
      const end = car.scrollLeft + car.clientWidth >= car.scrollWidth - 8;
      end ? car.scrollTo({ left: 0, behavior: "smooth" }) : car.scrollBy({ left: step(), behavior: "smooth" });
    };
    $("#carDots").onclick = (e) => { const d = e.target.closest(".dot"); if (d) car.scrollTo({ left: step() * +d.dataset.i, behavior: "smooth" }); };
    car.addEventListener("scroll", () => {
      const i = Math.round(car.scrollLeft / step());
      $$(".dot", $("#carDots")).forEach((d, j) => d.classList.toggle("on", i === j));
    }, { passive: true });
    $$(".dot", $("#carDots"))[0].classList.add("on");

    // arrastrar con el mouse
    let down = false, sx = 0, sl = 0, moved = false;
    car.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = car.scrollLeft; car.classList.add("dragging"); });
    window.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; car.scrollLeft = sl - dx; });
    window.addEventListener("pointerup", () => { down = false; car.classList.remove("dragging"); });
    car.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } });

    // avance automático (se detiene al interactuar)
    let auto = setInterval(() => { if (document.visibilityState === "visible" && currentView === "home") $("#carNext").click(); }, 5000);
    ["pointerdown", "wheel", "keydown", "focusin"].forEach((ev) => car.addEventListener(ev, () => { clearInterval(auto); }, { passive: true }));

    // desplegables
    const FOLDS = [
      { t: "Estoy internado", go: ["ruta", "expediente", "medicinas", "chat"] },
      { t: "Tengo citas", go: ["citas", "medicinas", "expediente", "avisos"] },
      { t: "Soy familiar", go: ["ruta", "expediente", "citas", "avisos"] },
      { t: "Soy personal de apoyo", go: ["personal"] },
    ];
    const label = { ruta: "Mi ruta", medicinas: "Medicinas", chat: "Chat", citas: "Citas", expediente: "Expediente", avisos: "Mis avisos", personal: "Entrar al panel de apoyo" };
    $("#folds").innerHTML = FOLDS.map((f, i) => `
      <div class="fold bg-${COLORS[(i + 1) % COLORS.length]}">
        <button class="fold-btn" aria-expanded="false" aria-controls="fold${i}">
          <span>${f.t}</span><span class="fold-plus" aria-hidden="true">+</span>
        </button>
        <div class="fold-body" id="fold${i}" hidden>
          ${f.go.map((g) => `<button class="pill" data-go="${g}">${icon(g === "personal" ? "equipo" : g)}${label[g]}</button>`).join("")}
        </div>
      </div>`).join("");
    $("#folds").addEventListener("click", (e) => {
      const b = e.target.closest(".fold-btn");
      if (b) {
        const open = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", !open);
        b.nextElementSibling.hidden = open;
        b.parentElement.classList.toggle("open", !open);
        return;
      }
      const p = e.target.closest(".pill");
      if (p) p.dataset.go === "personal" ? goLogin("personal", "#/personal") : goApp(p.dataset.go);
    });
  }

  /* =========================================================
     RUTAS
     ========================================================= */
  let currentView = "home";
  let pending = null;
  let unsub = null;

  function goApp(sec) {
    const s = Store.state;
    if (s.role === "paciente") location.hash = "#/app/" + sec;
    else if (s.role === "personal") location.hash = "#/personal";
    else goLogin("paciente", "#/app/" + sec);
  }
  function goLogin(role, next) {
    pending = next || null;
    setRole(role);
    location.hash = "#/ingresar";
  }

  function show(view) {
    currentView = view;
    $$(".view").forEach((v) => (v.hidden = v.dataset.view !== view));
    $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.nav === view || (a.dataset.nav === "ingresar" && (view === "app" || view === "personal"))));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const s = Store.state;
    switch (parts[0]) {
      case "asistente": show("asistente"); break;
      case "ingresar":
        if (s.role === "paciente") { location.replace("#/app/inicio"); return; }
        if (s.role === "personal") { location.replace("#/personal"); return; }
        show("ingresar"); break;
      case "app":
        if (s.role !== "paciente") { goLogin("paciente", location.hash); return; }
        show("app"); renderApp(parts[1] || "inicio"); break;
      case "personal":
        if (s.role !== "personal") { goLogin("personal", "#/personal"); return; }
        show("personal"); renderStaff(); break;
      default: show("home"); renderTicker();
    }
    updateNav();
  }

  function updateNav() {
    const s = Store.state;
    const a = $("#navIngresar");
    if (s.role === "paciente") { a.textContent = "Mi espacio"; a.href = "#/app/inicio"; }
    else if (s.role === "personal") { a.textContent = "Mi panel"; a.href = "#/personal"; }
    else { a.textContent = "Ingresar"; a.href = "#/ingresar"; }
  }

  // Un solo aviso en vivo para toda la app
  function ensureLive() {
    if (unsub || !Store.state.role) return;
    unsub = Store.subscribe(() => {
      if (currentView === "app") refreshPatientLive();
      if (currentView === "personal") refreshStaffLive();
      if (currentView === "home") renderTicker();
    });
  }

  /* =========================================================
     INGRESAR
     ========================================================= */
  let loginRole = "paciente";
  function setRole(role) {
    loginRole = role;
    $$(".role-card").forEach((c) => { const on = c.dataset.role === role; c.classList.toggle("active", on); c.setAttribute("aria-selected", on); });
    $("#loginIdLabel").textContent = role === "paciente" ? "ID de paciente" : "ID de personal de apoyo";
    $("#loginId").placeholder = role === "paciente" ? "WW-0000-00" : "REC-0000";
    $("#loginError").textContent = "";
    $("#loginHint").innerHTML = role === "paciente"
      ? `Prueba: <button type="button" class="link-btn" data-demo="WW-2048-17|123456">WW-2048-17</button> (internada) · <button type="button" class="link-btn" data-demo="WW-3301-09|123456">WW-3301-09</button> (con citas) · código 123456`
      : `Prueba: <button type="button" class="link-btn" data-demo="REC-0042|apoyo26">REC-0042</button> · <button type="button" class="link-btn" data-demo="REC-0107|apoyo26">REC-0107</button> · código apoyo26`;
  }

  function initLogin() {
    $$(".role-card").forEach((c) => c.addEventListener("click", () => setRole(c.dataset.role)));
    $("#loginHint").addEventListener("click", (e) => {
      const b = e.target.closest("[data-demo]"); if (!b) return;
      const [id, code] = b.dataset.demo.split("|");
      $("#loginId").value = id; $("#loginCode").value = code;
    });
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#loginBtn");
      btn.disabled = true; btn.textContent = "Entrando…";
      $("#loginError").textContent = "";
      try {
        await Store.login(loginRole, $("#loginId").value, $("#loginCode").value);
        $("#loginForm").reset();
        const next = pending; pending = null;
        location.hash = Store.state.role === "personal" ? "#/personal" : (next && next.startsWith("#/app") ? next : "#/app/inicio");
      } catch (ex) {
        $("#loginError").textContent = ex.message || "No se pudo entrar.";
      } finally {
        btn.disabled = false; btn.textContent = "Entrar";
      }
    });
    setRole("paciente");
  }

  async function doLogout() {
    if (unsub) { unsub(); unsub = null; }
    await Store.logout();
    staffSel = null;
    location.hash = "#/";
    toast("Sesión cerrada");
  }

  /* =========================================================
     APP DEL PACIENTE
     ========================================================= */
  const TABS = [
    ["inicio", "Inicio"], ["ruta", "Mi ruta"], ["expediente", "Expediente"], ["medicinas", "Medicinas"],
    ["citas", "Citas"], ["avisos", "Mis avisos"], ["chat", "Chat"],
  ];
  let salaRoom = "juegos";
  let unreadCount = 0;

  async function renderApp(sec) {
    const p = Store.state.me;
    if (sec === "hoy") sec = "inicio";
    if (!TABS.some((t) => t[0] === sec)) sec = "inicio";
    $("#appHello").innerHTML = "";
    const hello = document.createElement("span");
    hello.dataset.cut = `hola ${(p.apodo || p.nombre.split(" ")[0]).toLowerCase()}`;
    hello.dataset.seed = "5";
    $("#appHello").appendChild(hello);
    Cutout.cut(hello);
    $("#appSub").textContent = [p.hospital, p.cuarto ? "Cuarto " + p.cuarto : p.area, p.codigo].filter(Boolean).join(" · ");
    $("#modeBadge").hidden = Store.state.mode !== "demo";

    const msgs = await Store.messages(p).catch(() => []);
    unreadCount = msgs.filter((m) => !m.leido).length;

    $("#appTabs").innerHTML = TABS.map(([k, t]) => `
      <a href="#/app/${k}" class="tab ${k === sec ? "on" : ""}">${icon(k)}<span>${t}</span>${k === "avisos" && unreadCount ? `<b class="count">${unreadCount}</b>` : ""}</a>`).join("");
    const on = $(".tab.on", $("#appTabs")); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });

    const body = $("#appBody");
    body.dataset.sec = sec;
    ({ inicio: secInicio, ruta: secRuta, expediente: secExpediente, medicinas: secMeds, citas: secCitas, avisos: secAvisos, chat: secChat })[sec](body, p, msgs);
    ensureLive();
  }

  function refreshPatientLive() {
    const sec = $("#appBody").dataset.sec;
    if (sec === "chat") loadSala();
    else if (sec === "avisos" || sec === "inicio") renderApp(sec);
  }

  /* ---- próxima toma de medicina ---- */
  function nextDoses(p, limit) {
    const now = new Date(); const out = [];
    for (let d = 0; d < 2; d++) {
      p.medicamentos.forEach((m) => {
        (m.horarios || []).forEach((h) => {
          if (!/^\d{1,2}:\d{2}$/.test(h)) return;
          const [hh, mm] = h.split(":").map(Number);
          const t = new Date(); t.setDate(t.getDate() + d); t.setHours(hh, mm, 0, 0);
          const hasta = m.hasta ? new Date(m.hasta + "T23:59:00") : null;
          if (t > now && (!hasta || t <= hasta)) out.push({ m, t });
        });
      });
    }
    return out.sort((a, b) => a.t - b.t).slice(0, limit || 3);
  }

  /* ---- Inicio: dos botones grandes y cuatro medianos ---- */
  function secInicio(body, p, msgs) {
    const dose = nextDoses(p, 1)[0];
    const cita = p.citas.filter((c) => new Date(c.inicio) > new Date()).sort((a, b) => new Date(a.inicio) - new Date(b.inicio))[0];
    const urgente = msgs.filter((m) => m.tipo === "urgente" && !m.leido).sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0];

    body.innerHTML = `
      ${urgente ? `<a href="#/app/avisos" class="alert-urgent">${icon("avisos")}<span><strong>Aviso urgente:</strong> ${esc(urgente.texto)}</span></a>` : ""}
      <div class="big-actions">
        <a href="#/app/expediente" class="big-btn bg-slate">
          <span class="big-ico">${icon("expediente")}</span>
          <span class="big-label">Mi expediente</span>
          <span class="big-sub">Tus datos y tus documentos</span>
        </a>
        <a href="#/app/ruta" class="big-btn bg-frosted">
          <span class="big-ico">${icon("ruta")}</span>
          <span class="big-label">Mi ruta</span>
          <span class="big-sub">Por dónde vas en tu tratamiento</span>
        </a>
      </div>
      <div class="mid-actions">
        <a href="#/app/medicinas" class="mid-btn">${icon("medicinas")}<span class="mid-label">Medicinas</span><span class="mid-sub">${dose ? "Próxima: " + fHora(dose.t) : "Sin tomas pendientes"}</span></a>
        <a href="#/app/citas" class="mid-btn">${icon("citas")}<span class="mid-label">Citas</span><span class="mid-sub">${cita ? "Próxima: " + cuando(cita.inicio) : "Sin citas"}</span></a>
        <a href="#/app/avisos" class="mid-btn">${icon("avisos")}<span class="mid-label">Mis avisos</span><span class="mid-sub">${unreadCount ? unreadCount + (unreadCount === 1 ? " nuevo" : " nuevos") : "Todo leído"}</span></a>
        <a href="#/app/chat" class="mid-btn">${icon("chat")}<span class="mid-label">Chat</span><span class="mid-sub">Platica con otros pacientes</span></a>
      </div>`;
  }

  /* ---- Mi ruta: un camino con paradas hasta el alta ---- */
  function routeHTML(p, interactive) {
    const items = p.procedimientos.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let cur = items.findIndex((x) => x.estado === "hoy");
    if (cur < 0) cur = items.findIndex((x) => x.estado === "pendiente");
    if (cur < 0) cur = items.length; // todo listo
    const finished = cur >= items.length;
    const ST = { hecho: "Listo", aqui: "En proceso", pendiente: "Por hacer" };
    const goal = p.tipo === "internado" ? "¡Alta médica!" : "¡Tratamiento terminado!";

    const steps = items.map((x, i) => {
      const st = i < cur ? "hecho" : i === cur ? "aqui" : "pendiente";
      const tag = interactive ? `button type="button" data-stop="${i}"` : "div";
      return `
        <li class="step ${st}">
          <span class="step-num" aria-hidden="true">${st === "hecho" ? "✓" : i + 1}</span>
          <${tag} class="step-card">
            <span class="step-top"><strong class="step-title">${esc(x.titulo)}</strong><span class="step-chip">${ST[st]}</span></span>
            <span class="step-meta">${fFecha(x.fecha)} · ${fHora(x.fecha)}${x.lugar ? " · " + esc(x.lugar) : ""}</span>
          </${interactive ? "button" : "div"}>
        </li>`;
    }).join("");

    return `
      <div class="bake">
        <ol class="recipe">
          ${steps}
          <li class="step meta ${finished ? "aqui" : ""}">
            <span class="step-num" aria-hidden="true">★</span>
            <div class="step-card"><span class="step-top"><strong class="step-title">${goal}</strong></span>
              <span class="step-meta">Tu meta final</span></div>
          </li>
        </ol>
      </div>`;
  }
  function secRuta(body, p) {
    body.innerHTML = `
      <div class="sec-head"><h2 class="mag-h">Mi ruta</h2></div>
      <div class="legend"><span><i class="lg hecho"></i>Listo</span><span><i class="lg aqui"></i>En proceso</span><span><i class="lg pendiente"></i>Por hacer</span></div>
      ${routeHTML(p, true)}
      <div class="stop-detail" id="stopDetail" hidden></div>`;
    const items = p.procedimientos.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    body.querySelector(".recipe").addEventListener("click", (e) => {
      const b = e.target.closest("[data-stop]"); if (!b) return;
      const x = items[+b.dataset.stop];
      const d = $("#stopDetail");
      d.hidden = false;
      d.innerHTML = `
        <button type="button" class="close-x" aria-label="Cerrar">×</button>
        <p class="kicker">${fFecha(x.fecha)} · ${fHora(x.fecha)}</p>
        <h3>${esc(x.titulo)}</h3>
        <p>${esc(x.descripcion)}</p>
        <p class="small">📍 ${esc(x.lugar)}${x.responsable ? " · " + esc(x.responsable) : ""}</p>
        <button class="btn btn-frosted btn-small ask-lupi" data-q="${esc(x.titulo)}">¿Qué es esto? Pregúntale a Lupi</button>`;
      d.querySelector(".close-x").onclick = () => (d.hidden = true);
      d.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function appBodyClicks(e) {
    const q = e.target.closest(".ask-lupi");
    if (q) { location.hash = "#/asistente"; setTimeout(() => Lupi.ask(q.dataset.q), 150); return; }
    const ics = e.target.closest("[data-ics]");
    if (ics) {
      const p = Store.state.me;
      Calendar.addCita(p.citas.find((c) => String(c.id) === ics.dataset.ics), p);
      toast("Te avisaremos 1 día y 1 hora antes");
    }
  }

  /* ---- Expediente: datos generales + documentos para ver y descargar ---- */
  function expedienteHTML(p) {
    return `
      <div class="exp-grid">
        <article class="id-card paper">
          <span class="tape"></span>
          <p class="card-k">ID único</p>
          <p class="id-code">${esc(p.codigo)}</p>
          <dl>
            <dt>Nombre</dt><dd>${esc(p.nombre)}</dd>
            <dt>Edad</dt><dd>${edad(p.fecha_nacimiento)}</dd>
            <dt>Tipo de sangre</dt><dd>${esc(p.tipo_sangre || "—")}</dd>
            <dt>Hospital</dt><dd>${esc(p.hospital)}</dd>
            <dt>Contacto de emergencia</dt><dd>${esc(p.contacto_emergencia || "—")}</dd>
          </dl>
        </article>
        <div class="exp-side">
          <div class="card bg-slate"><p class="card-k">Alergias</p>${p.alergias.length ? p.alergias.map((a) => `<span class="tag big">${esc(a)}</span>`).join(" ") : "<p>Ninguna registrada</p>"}</div>
          <div class="card bg-frosted"><p class="card-k">Diagnósticos</p>${p.diagnosticos.map((d) => `<p>${esc(d)}</p>`).join("") || "<p>—</p>"}</div>
        </div>
      </div>
      <h3 class="sub">Documentos</h3>
      <div class="docs">${p.documentos.length ? p.documentos.map((d) => `
        <div class="doc-row">
          <span class="doc-ico">${icon("expediente")}</span>
          <div class="doc-info"><strong>${esc(d.titulo)}</strong><span class="small">${esc(d.tipo || "")} · ${fDia(d.fecha)}</span></div>
          <div class="doc-actions">
            <button class="btn btn-frosted btn-small" data-ver="${esc(d.id)}">${icon("ver")}Ver</button>
            <button class="btn btn-ink btn-small" data-bajar="${esc(d.id)}">${icon("bajar")}Descargar</button>
          </div>
        </div>`).join("") : `<p class="muted">Aún no hay documentos.</p>`}</div>`;
  }

  function bindDocs(root, p) {
    root.addEventListener("click", (e) => {
      const v = e.target.closest("[data-ver]");
      const b = e.target.closest("[data-bajar]");
      const d = (v || b) && p.documentos.find((x) => String(x.id) === (v || b).dataset[v ? "ver" : "bajar"]);
      if (!d) return;
      if (v) verDoc(d, p); else bajarDoc(d, p);
    });
  }

  // Si el documento tiene archivo (url de Supabase Storage) se abre ese archivo;
  // si no, se arma una hoja con los datos que hay.
  function docPage(d, p) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(d.titulo)}</title>
      <style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;padding:0 20px;color:#222}h1{margin:0 0 4px}p.meta{color:#666;margin:0 0 24px}dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px}dt{font-weight:bold}</style>
      </head><body><h1>${esc(d.titulo)}</h1><p class="meta">${esc(d.tipo || "")} · ${fDia(d.fecha)}</p>
      <dl><dt>Paciente</dt><dd>${esc(p.nombre)}</dd><dt>ID</dt><dd>${esc(p.codigo)}</dd><dt>Hospital</dt><dd>${esc(p.hospital)}</dd></dl>
      <h2>Resumen</h2><p>${esc(d.resumen || "")}</p></body></html>`;
  }
  function verDoc(d, p) {
    if (d.url) { window.open(d.url, "_blank", "noopener"); return; }
    const dlg = $("#docDialog");
    $("#docDialogBody").innerHTML = `
      <p class="kicker">${esc(d.tipo || "")} · ${fDia(d.fecha)}</p>
      <h2 class="mag-h">${esc(d.titulo)}</h2>
      <p>${esc(d.resumen || "")}</p>
      <p class="small muted">${esc(p.nombre)} · ${esc(p.codigo)} · ${esc(p.hospital)}</p>`;
    $("#docDialogDownload").onclick = () => bajarDoc(d, p);
    dlg.showModal();
  }
  function bajarDoc(d, p) {
    const a = document.createElement("a");
    if (d.url) { a.href = d.url; a.download = ""; a.target = "_blank"; }
    else {
      a.href = URL.createObjectURL(new Blob([docPage(d, p)], { type: "text/html;charset=utf-8" }));
      a.download = `${d.titulo.replace(/[^\wáéíóúñ ]+/gi, "").trim().replace(/\s+/g, "-")}.html`;
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    document.body.appendChild(a); a.click(); a.remove();
  }

  function secExpediente(body, p) {
    body.innerHTML = `<div class="sec-head"><h2 class="mag-h">Mi expediente</h2></div>${expedienteHTML(p)}`;
    bindDocs(body, p);
  }

  /* ---- Medicinas: un botón grande por medicina ---- */
  function secMeds(body, p) {
    const dose = nextDoses(p, 1)[0];
    body.innerHTML = `
      <div class="sec-head"><h2 class="mag-h">Mis medicinas</h2>
        <button class="btn btn-ink" id="medsCal">${icon("citas")} Recordatorios en mi calendario</button></div>
      ${dose ? `<div class="next-dose">${icon("medicinas")}<span>Tu próxima medicina es <strong>${esc(dose.m.nombre)}</strong> a las <strong>${fHora(dose.t)}</strong> (${cuando(dose.t)})</span></div>` : ""}
      <div class="med-list">${p.medicamentos.map((m, i) => `
        <div class="med-item bg-${COLORS[i % COLORS.length]}">
          <button type="button" class="med-btn" aria-expanded="false">
            <span class="med-ico">${icon("medicinas")}</span>
            <span class="med-main"><span class="med-name">${esc(m.nombre)}</span><span class="med-why">${esc(m.para_que)}</span></span>
            <span class="hours">${(m.horarios || []).map((h) => `<span class="hour">${esc(h)}</span>`).join("")}</span>
            <span class="med-more" aria-hidden="true">+</span>
          </button>
          <div class="med-detail" hidden>
            <p><strong>Cuánto:</strong> ${esc(m.dosis)}</p>
            <p><strong>Cómo:</strong> ${esc(m.via)}</p>
            ${m.indicaciones ? `<p><strong>Ojo:</strong> ${esc(m.indicaciones)}</p>` : ""}
            <p class="small">${m.desde ? "Del " + fDia(m.desde) : ""}${m.hasta ? " al " + fDia(m.hasta) : ""}</p>
          </div>
        </div>`).join("")}</div>`;
    $("#medsCal").onclick = () => { Calendar.addMeds(p); toast("Abre el archivo para agregar los recordatorios"); };
    body.querySelector(".med-list").addEventListener("click", (e) => {
      const b = e.target.closest(".med-btn"); if (!b) return;
      const open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", !open);
      b.nextElementSibling.hidden = open;
      b.parentElement.classList.toggle("open", !open);
    });
  }

  function secCitas(body, p) {
    const now = new Date();
    const prox = p.citas.filter((c) => new Date(c.inicio) >= now).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    const pas = p.citas.filter((c) => new Date(c.inicio) < now);
    const TIPO = { consulta: "slate", cirugia: "honeydew", estudio: "frosted", terapia: "frosted" };
    const card = (c, past) => `
      <article class="cita bg-${TIPO[c.tipo] || "honeydew"} ${past ? "past" : ""}">
        <div class="cita-date"><span class="cd-day">${new Date(c.inicio).getDate()}</span><span class="cd-mon">${new Date(c.inicio).toLocaleDateString("es-MX", { month: "short" })}</span></div>
        <div class="cita-info">
          <p class="small"><span class="tag">${esc(c.tipo)}</span> ${past ? "" : cuando(c.inicio)}</p>
          <h3>${esc(c.titulo)}</h3>
          <p>${fHora(c.inicio)} · ${esc(c.lugar)}</p>
          ${c.con_quien ? `<p class="small">Con ${esc(c.con_quien)}</p>` : ""}
          ${c.indicaciones ? `<p class="small">📝 ${esc(c.indicaciones)}</p>` : ""}
          ${past ? "" : `<div class="cita-actions"><button class="btn btn-ink btn-small" data-ics="${c.id}">Agregar a mi calendario</button><a class="btn btn-small btn-ghost" target="_blank" rel="noopener" href="${Calendar.googleLink(c, p)}">Google Calendar</a></div>`}
        </div>
      </article>`;
    body.innerHTML = `
      <div class="sec-head"><h2 class="mag-h">Mis citas</h2>
        ${prox.length ? `<button class="btn btn-ink" id="allCal">Agregar todas (con recordatorios)</button>` : ""}</div>
      <div class="citas">${prox.length ? prox.map((c) => card(c)).join("") : `<p class="muted">No tienes citas próximas.</p>`}</div>
      ${pas.length ? `<details class="past-box"><summary>Citas pasadas (${pas.length})</summary><div class="citas">${pas.map((c) => card(c, true)).join("")}</div></details>` : ""}`;
    const all = $("#allCal"); if (all) all.onclick = () => { Calendar.addAllCitas(p); toast("Abre el archivo para guardar tus citas"); };
  }

  /* ---- Mis avisos: mensajes y recordatorios de recepción ---- */
  const TIPO_AVISO = { urgente: ["Urgente", "slate"], recordatorio: ["Recordatorio", "frosted"], mensaje: ["Mensaje", "honeydew"] };
  function avisoHTML(m, forStaff) {
    const [lbl, col] = TIPO_AVISO[m.tipo] || TIPO_AVISO.mensaje;
    return `
      <article class="aviso bg-${col} ${m.leido ? "leido" : ""}">
        <div class="aviso-top"><span class="tag">${lbl}</span><span class="small">${fFecha(m.created_at)} · ${fHora(m.created_at)}</span></div>
        <p class="aviso-text">${esc(m.texto)}</p>
        <div class="aviso-foot">
          <span class="small">De: ${esc(m.autor_nombre)}</span>
          ${forStaff ? `<span class="small">${m.leido ? "✓ Leído" : "Sin leer"}</span>`
            : m.leido ? `<span class="small">✓ Leído</span>` : `<button class="btn btn-ink btn-small" data-leido="${esc(m.id)}">¡Entendido!</button>`}
        </div>
      </article>`;
  }

  function secAvisos(body, p, msgs) {
    const list = msgs.slice().sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    body.innerHTML = `
      <div class="sec-head"><h2 class="mag-h">Mis avisos</h2></div>
      <p class="muted">Aquí te escribe recepción: recordatorios, permisos de visita y avisos importantes.</p>
      <div class="avisos-list">${list.length ? list.map((m) => avisoHTML(m)).join("") : `<p class="muted">No tienes avisos.</p>`}</div>`;
    body.querySelector(".avisos-list").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-leido]"); if (!b) return;
      b.disabled = true;
      try { await Store.markRead(p, b.dataset.leido); renderApp("avisos"); } catch (ex) { toast("No se pudo guardar: " + ex.message); b.disabled = false; }
    });
  }

  /* ---- Chat entre pacientes ---- */
  const ROOMS = [["juegos", "Niñas y niños", "slate"], ["general", "Pacientes y familias", "frosted"]];
  const BLOCK = /(\d[\s-]?){7,}|@|https?:\/\/|www\.|\.com\b/i;
  const BAD = ["idiota", "estupido", "estúpido", "tonto", "pendejo", "imbecil", "imbécil"];

  function secChat(body) {
    body.innerHTML = `
      <div class="sec-head"><h2 class="mag-h">Chat</h2>
        <div class="filter">${ROOMS.map(([k, t, c]) => `<button class="pill bg-${c} ${k === salaRoom ? "on" : ""}" data-room="${k}">${t}</button>`).join("")}</div></div>
      <div class="sala-box">
        <div class="sala-wall" id="salaWall"></div>
        <form class="composer" id="salaForm">
          <input id="salaInput" maxlength="240" placeholder="Escribe algo bonito…" autocomplete="off" />
          <button class="btn btn-ink" type="submit">Enviar</button>
        </form>
        <div class="stk-row">${Object.keys(STICKERS).map((k) => `<button type="button" class="stk-btn" data-stk="${k}" aria-label="Enviar sticker ${k}">${sticker(k)}</button>`).join("")}</div>
        <p class="small center">Por tu seguridad no compartas teléfonos, direcciones ni redes sociales. Recepción cuida este chat.</p>
      </div>`;
    body.querySelector(".filter").onclick = (e) => { const b = e.target.closest("[data-room]"); if (b) { salaRoom = b.dataset.room; secChat(body); } };
    $("#salaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = $("#salaInput").value.trim(); if (!v) return;
      if (BLOCK.test(v)) { toast("Ups: no compartas teléfonos, correos ni enlaces aquí."); return; }
      if (BAD.some((w) => v.toLowerCase().includes(w))) { toast("Usemos palabras amables 💛"); return; }
      $("#salaInput").value = "";
      try { await Store.sendSala(salaRoom, v, ""); loadSala(); } catch (ex) { toast("No se pudo enviar: " + ex.message); }
    });
    $(".stk-row", body).onclick = async (e) => { const b = e.target.closest("[data-stk]"); if (!b) return; await Store.sendSala(salaRoom, "", b.dataset.stk); loadSala(); };
    loadSala();
  }

  async function loadSala(el, canDelete) {
    el = el || $("#salaWall"); if (!el) return;
    const list = await Store.sala(salaRoom).catch(() => []);
    el.innerHTML = list.length ? list.map((m, i) => `
      <div class="postit bg-${COLORS[i % COLORS.length]} ${m.mine ? "mine" : ""}" style="--rot:${((i * 37) % 7) - 3}deg">
        ${m.sticker ? sticker(m.sticker) : `<p>${esc(m.texto)}</p>`}
        <p class="postit-who">${esc(m.autor_nombre)} · ${fHora(m.created_at)}</p>
        ${canDelete ? `<button class="link-btn del" data-del="${m.id}">quitar</button>` : ""}
      </div>`).join("") : `<p class="muted center">Nadie ha escrito todavía. ¡Sé la primera persona!</p>`;
    el.scrollTop = el.scrollHeight;
  }

  /* =========================================================
     PANEL DEL PERSONAL DE APOYO (RECEPCIÓN)
     ========================================================= */
  let staffPatients = [];
  let staffSel = null;
  let staffTab = "avisar";
  let avisoTipo = "mensaje";

  async function renderStaff() {
    const me = Store.state.me;
    $("#staffHello").innerHTML = "";
    const h = document.createElement("span");
    h.dataset.cut = "mi panel"; h.dataset.seed = "9";
    $("#staffHello").appendChild(h); Cutout.cut(h);
    $("#staffSub").textContent = `${me.nombre} · ${me.puesto || "Personal de apoyo"} · ${me.codigo}`;
    $("#staffBadge").hidden = Store.state.mode !== "demo";

    $("#staffList").innerHTML = `<p class="muted">Cargando pacientes…</p>`;
    try { staffPatients = await Store.myPatients(); } catch (ex) { $("#staffList").innerHTML = `<p class="form-error">${esc(ex.message)}</p>`; return; }
    if (!staffSel && staffPatients[0]) staffSel = staffPatients[0].codigo;
    drawStaffList();
    drawStaffMain();
    ensureLive();
  }

  function drawStaffList() {
    $("#staffList").innerHTML = `
      <p class="card-k">Pacientes</p>
      ${staffPatients.map((p) => `
        <button class="pt-btn ${p.codigo === staffSel ? "on" : ""}" data-pt="${esc(p.codigo)}">
          <strong>${esc(p.nombre)}</strong>
          <span class="small">${esc(p.codigo)} · ${p.tipo === "internado" ? "Cuarto " + esc(p.cuarto) : "Con citas"}</span>
        </button>`).join("") || `<p class="muted">No tienes pacientes asignados.</p>`}
      <p class="card-k" style="margin-top:1rem">Hospital</p>
      <button class="pt-btn tool ${staffSel === "__avisos" ? "on" : ""}" data-pt="__avisos">${icon("megafono")}<strong>Avisos del hospital</strong></button>
      <button class="pt-btn tool ${staffSel === "__sala" ? "on" : ""}" data-pt="__sala">${icon("chat")}<strong>Cuidar el chat</strong></button>`;
    $("#staffList").onclick = (e) => { const b = e.target.closest("[data-pt]"); if (!b) return; staffSel = b.dataset.pt; drawStaffList(); drawStaffMain(); };
  }

  function drawStaffMain() {
    const main = $("#staffMain");

    if (staffSel === "__sala") {
      main.innerHTML = `
        <div class="sec-head"><h2 class="mag-h">Cuidar el chat</h2>
          <div class="filter">${ROOMS.map(([k, t, c]) => `<button class="pill bg-${c} ${k === salaRoom ? "on" : ""}" data-room="${k}">${t}</button>`).join("")}</div></div>
        <div class="sala-box"><div class="sala-wall" id="staffSala"></div>
          <form class="composer" id="staffSalaForm"><input id="staffSalaInput" maxlength="240" placeholder="Mensaje de recepción para el chat…" autocomplete="off"/><button class="btn btn-ink">Enviar</button></form></div>`;
      $(".filter", main).onclick = (e) => { const b = e.target.closest("[data-room]"); if (b) { salaRoom = b.dataset.room; drawStaffMain(); } };
      $("#staffSalaForm").onsubmit = async (e) => { e.preventDefault(); const v = $("#staffSalaInput").value.trim(); if (!v) return; $("#staffSalaInput").value = ""; await Store.sendSala(salaRoom, v, ""); loadSala($("#staffSala"), true); };
      $("#staffSala").onclick = async (e) => { const b = e.target.closest("[data-del]"); if (!b) return; try { await Store.deleteSala(salaRoom, b.dataset.del); loadSala($("#staffSala"), true); } catch (ex) { toast(ex.message); } };
      loadSala($("#staffSala"), true);
      return;
    }

    if (staffSel === "__avisos") {
      main.innerHTML = `
        <div class="sec-head"><h2 class="mag-h">Avisos del hospital</h2></div>
        <p class="muted">Se muestran a todos en la banda de la página de inicio.</p>
        <form class="composer big" id="hospAvisoForm"><input id="hospAvisoInput" maxlength="140" placeholder="Ej.: Horario de visitas de 16:00 a 18:00" autocomplete="off"/><button class="btn btn-ink">Publicar</button></form>
        <div class="hosp-avisos" id="hospAvisos"></div>`;
      $("#hospAvisoForm").onsubmit = async (e) => {
        e.preventDefault(); const v = $("#hospAvisoInput").value.trim(); if (!v) return;
        try { await Store.addAviso(v); $("#hospAvisoInput").value = ""; loadHospAvisos(); toast("Aviso publicado"); } catch (ex) { toast("No se pudo publicar: " + ex.message); }
      };
      $("#hospAvisos").onclick = async (e) => { const b = e.target.closest("[data-delaviso]"); if (!b) return; try { await Store.deleteAviso(b.dataset.delaviso); loadHospAvisos(); } catch (ex) { toast(ex.message); } };
      loadHospAvisos();
      return;
    }

    const p = staffPatients.find((x) => x.codigo === staffSel);
    if (!p) { main.innerHTML = `<p class="muted">Elige un paciente.</p>`; return; }
    main.innerHTML = `
      <div class="pt-head bg-frosted">
        <h2>${esc(p.nombre)}</h2>
        <p class="small">${esc(p.codigo)} · ${edad(p.fecha_nacimiento)} · ${esc(p.area)}${p.cuarto ? " · Cuarto " + esc(p.cuarto) : ""}</p>
        <p class="small">Alergias: <strong>${p.alergias.length ? p.alergias.map(esc).join(", ") : "ninguna"}</strong></p>
      </div>
      <div class="filter staff-tabs">
        ${[["avisar", "Enviar aviso", "avisos"], ["expediente", "Expediente", "expediente"], ["ruta", "Ruta", "ruta"]].map(([k, t, ic]) => `<button class="pill ${k === staffTab ? "on" : ""}" data-st="${k}">${icon(ic)}${t}</button>`).join("")}
      </div>
      <div id="staffPane"></div>`;
    $(".staff-tabs", main).onclick = (e) => { const b = e.target.closest("[data-st]"); if (b) { staffTab = b.dataset.st; drawStaffMain(); } };
    const pane = $("#staffPane");

    if (staffTab === "avisar") {
      pane.innerHTML = `
        <form class="paper send-form" id="sendForm">
          <p class="lbl">¿Qué tipo de aviso es?</p>
          <div class="type-pick">
            ${Object.entries(TIPO_AVISO).reverse().map(([k, [t, c]]) => `<button type="button" class="type-btn bg-${c} ${k === avisoTipo ? "on" : ""}" data-tipo="${k}">${t}</button>`).join("")}
          </div>
          <label class="lbl" for="sendText">Mensaje para ${esc(p.apodo || p.nombre)}</label>
          <textarea id="sendText" rows="3" maxlength="600" placeholder="Escribe el aviso…"></textarea>
          <button class="btn btn-ink" type="submit">Enviar aviso</button>
        </form>
        <h3 class="sub">Avisos enviados</h3>
        <div class="avisos-list" id="sentList"></div>`;
      $(".type-pick", pane).onclick = (e) => { const b = e.target.closest("[data-tipo]"); if (!b) return; avisoTipo = b.dataset.tipo; $$(".type-btn", pane).forEach((x) => x.classList.toggle("on", x === b)); };
      $("#sendForm").onsubmit = async (e) => {
        e.preventDefault(); const v = $("#sendText").value.trim(); if (!v) return;
        try { await Store.sendMessage(p, v, avisoTipo); $("#sendText").value = ""; toast("Aviso enviado"); loadSent(p); } catch (ex) { toast("No se pudo enviar: " + ex.message); }
      };
      loadSent(p);
    } else if (staffTab === "expediente") {
      pane.innerHTML = expedienteHTML(p);
      bindDocs(pane, p);
    } else {
      pane.innerHTML = routeHTML(p, false);
    }
  }

  async function loadSent(p) {
    const el = $("#sentList"); if (!el) return;
    const list = (await Store.messages(p).catch(() => [])).sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    el.innerHTML = list.length ? list.map((m) => avisoHTML(m, true)).join("") : `<p class="muted">Aún no le has enviado avisos.</p>`;
  }

  async function loadHospAvisos() {
    const el = $("#hospAvisos"); if (!el) return;
    const list = await Store.avisos().catch(() => []);
    el.innerHTML = list.length ? list.map((a) => `
      <div class="hosp-aviso">${icon("megafono")}<span>${esc(a.texto)}</span><button class="btn btn-ghost btn-small" data-delaviso="${esc(a.id)}">Quitar</button></div>`).join("")
      : `<p class="muted">No hay avisos publicados.</p>`;
  }

  function refreshStaffLive() {
    if (staffSel === "__sala") return loadSala($("#staffSala"), true);
    if (staffSel === "__avisos") return loadHospAvisos();
    const p = staffPatients.find((x) => x.codigo === staffSel);
    if (p && staffTab === "avisar") loadSent(p);
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  document.addEventListener("DOMContentLoaded", async () => {
    buildHome();
    Lupi.init();
    initLogin();
    $("#logoutBtn").onclick = doLogout;
    $("#staffLogout").onclick = doLogout;
    $("#appBody").addEventListener("click", appBodyClicks);
    $("#docDialogClose").onclick = () => $("#docDialog").close();
    await Store.restore().catch(() => null);
    window.addEventListener("hashchange", route);
    route();
  });
})();
