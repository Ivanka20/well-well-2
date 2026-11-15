/* =========================================================
   well well · interfaz (rediseño de Claude Design)
   Rutas:  #/                   portada
           #/asistente          Lupita
           #/servicios[/<cat>]  Cerca de mí (servicios después del alta)
           #/ingresar           acceso con ID
           #/app/<sección>      pacientes y familiares
           #/personal           recepción (personal del hospital)
   ========================================================= */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cutTitle = (text, size, seed) => `<h1 class="screen-title"><span data-cut="${esc(text)}" data-size="${size || 32}" data-seed="${seed || 0}"></span></h1>`;
  const face = (px, mood) => `<span class="face">${lupiSVG(px || 30, mood)}</span>`;

  /* ---------- fechas ---------- */
  const fFecha = (d) => new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  const fCorta = (d) => new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const fHora = (d) => new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const fDia = (d) => new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  function dayDiff(d) {
    const now = new Date(), t = new Date(d);
    return Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  }
  function cuando(d) {
    const n = dayDiff(d);
    if (n === 0) return "hoy";
    if (n === 1) return "mañana";
    if (n === -1) return "ayer";
    return n > 1 ? `en ${n} días` : `hace ${-n} días`;
  }
  function falta(d) {
    const min = Math.round((new Date(d) - new Date()) / 60000);
    if (min < 1) return "ahora";
    if (min < 60) return `en ${min} min`;
    if (dayDiff(d) === 0) return `en ${Math.round(min / 60)} h`;
    return cuando(d);
  }
  function edad(fn) {
    if (!fn) return "—";
    const b = new Date(fn + "T12:00:00"), n = new Date();
    let e = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) e--;
    return e + " años";
  }

  /* ---------- stickers del chat ---------- */
  const STICKERS = {
    star: '<path d="M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2z" fill="var(--verdigris)"/>',
    heart: '<path d="M24 42S6 30 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 25-18 25z" fill="var(--sea)"/>',
    sun: '<circle cx="24" cy="24" r="10" fill="var(--verdigris)"/><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5"/>',
    smile: '<circle cx="24" cy="24" r="18" fill="var(--cream)"/><path d="M16 27q8 8 16 0M18 19h.01M30 19h.01"/>',
    cloud: '<path d="M14 36a9 9 0 0 1 0-18 12 12 0 0 1 22 2 8 8 0 0 1-1 16z" fill="var(--cream)"/>',
  };
  const sticker = (k) => `<svg class="stk" viewBox="0 0 48 48" aria-label="sticker">${STICKERS[k] || ""}</svg>`;

  /* ---------- aviso flotante (con acción opcional, p. ej. "Deshacer") ---------- */
  let toastT;
  function toast(msg, action) {
    const t = $("#toast");
    t.innerHTML = `<span class="dot-bang">✓</span><span class="msg">${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    if (action) t.querySelector("button").onclick = () => { t.classList.remove("show"); action.run(); };
    t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), action ? 4000 : 2600);
  }
  window.wwToast = toast;

  /* ---------- hoja inferior ---------- */
  function openSheet(html, mount) {
    const panel = $("#sheetPanel");
    panel.innerHTML = html;
    $("#sheet").hidden = false;
    $$("[data-close]", panel).forEach((b) => (b.onclick = closeSheet));
    if (mount) mount(panel);
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheetPanel").innerHTML = ""; }

  /* =========================================================
     PORTADA
     ========================================================= */
  const RUMBO = [["Llegas", "Te damos tu ID y te explicamos todo."], ["Te cuidamos", "Estudios y tratamiento, paso a paso."], ["Vas mejorando", "Cada paso listo suma."], ["¡De alta!", "¡A casa!"]];
  let rumboPaso = 0, rumboTimer = null, quienOpen = -1;

  function drawRumbo() {
    $("#rumbo").innerHTML = RUMBO.map((r, i) => `
      <button type="button" class="rumbo-tile ${i === rumboPaso ? "on" : i < rumboPaso ? "past" : ""}" data-paso="${i}">
        <span class="n">${i + 1}</span><span class="t">${r[0]}</span>
      </button>`).join("");
    $("#rumboTxt").textContent = `${RUMBO[rumboPaso][0]}: ${RUMBO[rumboPaso][1]}`;
  }

  const QUIEN = [
    ["Estoy internado", "Ve tu ruta, medicinas y avisos.", "Entrar con mi ID", () => goApp("ruta")],
    ["Tengo citas", "Ve cuándo, dónde y con quién.", "Ver mis citas", () => goApp("citas")],
    ["Soy familiar", "Entra con el ID de tu familiar.", "Entrar con su ID", () => goLogin("paciente", "#/app/inicio")],
    ["Ya salimos del hospital", "Encuentra rehabilitación, farmacias y más cerca de casa.", "Buscar cerca de mí", () => (location.hash = "#/servicios")],
    ["Soy personal del hospital", "Manda avisos y revisa expedientes.", "Entrar al panel", () => goLogin("personal", "#/personal")],
  ];
  function drawQuien() {
    $("#quien").innerHTML = QUIEN.map((q, i) => `
      <div class="q-item">
        <button type="button" class="q-head" data-q="${i}" aria-expanded="${quienOpen === i}">
          <span class="q-shape s${i}"></span><span>${q[0]}</span><span class="arrow">${quienOpen === i ? "−" : "+"}</span>
        </button>
        ${quienOpen === i ? `<div class="q-body"><span>${q[1]}</span><button type="button" class="pill-slate" data-cta="${i}">${q[2]}</button></div>` : ""}
      </div>`).join("");
  }

  async function renderTicker() {
    const list = await Store.avisos().catch(() => []);
    $("#avisosBand").hidden = !list.length;
    if (!list.length) return;
    const strip = list.map((a) => `<span>${esc(a.texto)}</span><span aria-hidden="true">✦</span>`).join("");
    $("#marqueeTrack").innerHTML = strip + strip;
    $("#marqueeTrack").style.animationDuration = Math.max(18, list.length * 7) + "s";
  }

  function buildHome() {
    drawRumbo();
    drawQuien();
    rumboTimer = setInterval(() => { if (currentView === "home") { rumboPaso = (rumboPaso + 1) % 4; drawRumbo(); } }, 2800);
    $("#rumbo").addEventListener("click", (e) => {
      const b = e.target.closest("[data-paso]"); if (!b) return;
      clearInterval(rumboTimer); rumboPaso = +b.dataset.paso; drawRumbo();
    });
    $("#quien").addEventListener("click", (e) => {
      const h = e.target.closest("[data-q]");
      if (h) { quienOpen = quienOpen === +h.dataset.q ? -1 : +h.dataset.q; drawQuien(); return; }
      const c = e.target.closest("[data-cta]");
      if (c) QUIEN[+c.dataset.cta][3]();
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
    const role = Store.state.role;
    const conBarra = view === "app" || view === "asistente" || view === "servicios";
    $("#topbar").hidden = view === "app" || view === "personal" || (role === "paciente" && conBarra);
    $("#bottomNav").hidden = !(role === "paciente" && conBarra);
    $$(".lupi-pill").forEach((a) => a.classList.toggle("active", view === "asistente"));
    $("#navServicios").classList.toggle("on", view === "servicios");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function setBottom(tab) {
    $$("#bottomNav a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  }

  function route() {
    closeSheet();
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const s = Store.state;
    switch (parts[0]) {
      case "asistente":
        show("asistente");
        $("#lupiBack").href = s.role === "paciente" ? "#/app/inicio" : s.role === "personal" ? "#/personal" : "#/";
        $("#lupiBack").textContent = s.role ? "← Inicio" : "← Volver";
        setBottom("asistente");
        break;
      case "servicios":
        show("servicios");
        setBottom("servicios");
        Servicios.mount($("#svcBody"), {
          patient: s.role === "paciente" ? s.me : null,
          cat: decodeURIComponent(parts[1] || ""),
          back: s.role === "paciente" ? "#/app/inicio" : s.role === "personal" ? "#/personal" : "#/",
        });
        break;
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
    $("#loginIdLabel").textContent = role === "paciente" ? "ID de paciente" : "ID de personal del hospital";
    $("#loginId").placeholder = role === "paciente" ? "WW-0000-00" : "REC-0000";
    $("#loginError").textContent = "";
    $("#loginHint").innerHTML = role === "paciente"
      ? `Prueba: <button type="button" class="link-btn" data-demo="WW-2048-17|123456">WW-2048-17</button> (internada) · <button type="button" class="link-btn" data-demo="WW-3301-09|123456">WW-3301-09</button> (con citas) · <button type="button" class="link-btn" data-demo="WW-5120-03|123456">WW-5120-03</button> (niño en rehabilitación) · <button type="button" class="link-btn" data-demo="WW-7702-44|123456">WW-7702-44</button> (adulta mayor, ya en casa) · código 123456`
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
        btn.disabled = false; btn.textContent = "Entrar →";
      }
    });
    setRole("paciente");
  }

  async function doLogout() {
    if (unsub) { unsub(); unsub = null; }
    await Store.logout();
    staffView = null;
    location.hash = "#/";
  }

  /* =========================================================
     DATOS CALCULADOS
     ========================================================= */
  function sortedSteps(p) {
    const items = p.procedimientos.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let cur = items.findIndex((x) => x.estado === "hoy");
    if (cur < 0) cur = items.findIndex((x) => x.estado === "pendiente");
    if (cur < 0) cur = items.length;
    return { items, cur };
  }

  function activeMed(m, day) {
    const d0 = m.desde ? new Date(m.desde + "T00:00:00") : null;
    const d1 = m.hasta ? new Date(m.hasta + "T23:59:00") : null;
    return (!d0 || day >= d0) && (!d1 || day <= d1);
  }
  // tomas de hoy: listas (ya pasó la hora) y por tomar
  function dosesToday(p) {
    const now = new Date(); let done = 0, left = 0;
    p.medicamentos.forEach((m) => (m.horarios || []).forEach((h) => {
      if (!/^\d{1,2}:\d{2}$/.test(h)) return;
      const [hh, mm] = h.split(":").map(Number);
      const t = new Date(); t.setHours(hh, mm, 0, 0);
      if (!activeMed(m, t)) return;
      t <= now ? done++ : left++;
    }));
    return { done, left };
  }
  function nextDose(p) {
    const now = new Date(); let best = null;
    for (let d = 0; d < 2; d++) p.medicamentos.forEach((m) => (m.horarios || []).forEach((h) => {
      if (!/^\d{1,2}:\d{2}$/.test(h)) return;
      const [hh, mm] = h.split(":").map(Number);
      const t = new Date(); t.setDate(t.getDate() + d); t.setHours(hh, mm, 0, 0);
      if (t > now && activeMed(m, t) && (!best || t < best.t)) best = { t, m };
    }));
    return best;
  }
  // "Lo que sigue": el siguiente evento (paso de la ruta, cita o medicina)
  function nextThing(p) {
    const now = new Date(); const c = [];
    p.procedimientos.forEach((x) => { if (x.estado !== "hecho" && new Date(x.fecha) > now) c.push({ t: new Date(x.fecha), titulo: x.titulo, lugar: x.lugar, go: "ruta" }); });
    p.citas.forEach((x) => { if (new Date(x.inicio) > now) c.push({ t: new Date(x.inicio), titulo: x.titulo, lugar: x.lugar, go: "citas" }); });
    const d = nextDose(p); if (d) c.push({ t: d.t, titulo: d.m.nombre + " · " + d.m.dosis, lugar: d.m.via, go: "medicinas" });
    return c.sort((a, b) => a.t - b.t)[0] || null;
  }

  /* =========================================================
     APP DEL PACIENTE
     ========================================================= */
  const SECTIONS = ["inicio", "ruta", "expediente", "medicinas", "citas", "avisos", "chat"];
  let msgs = [];
  let avisoFiltro = "Todos";
  let justRead = new Set();
  let medOpen = 0;
  let salaRoom = "general";

  const backHead = (title, seed, right) => `
    <div class="row-between"><a href="#/app/inicio" class="btn-back">← Inicio</a>${right || ""}</div>
    ${cutTitle(title, 32, seed)}`;

  async function renderApp(sec) {
    const p = Store.state.me;
    if (sec === "hoy") sec = "inicio";
    if (!SECTIONS.includes(sec)) sec = "inicio";
    setBottom(["inicio", "ruta", "expediente"].includes(sec) ? sec : "");
    msgs = await Store.messages(p).catch(() => []);
    // contenedor nuevo en cada pantalla, para no acumular listeners
    const old = $("#appBody"); const body = old.cloneNode(false); old.replaceWith(body);
    body.dataset.sec = sec;
    ({ inicio: secInicio, ruta: secRuta, expediente: secExpediente, medicinas: secMeds, citas: secCitas, avisos: secAvisos, chat: secChat })[sec](body, p);
    Cutout.cutAll(body);
    ensureLive();
  }

  function refreshPatientLive() {
    const sec = $("#appBody").dataset.sec;
    if (sec === "chat") loadSala($("#chatWall"));
    else if (sec === "avisos" || sec === "inicio") renderApp(sec);
  }

  /* ---- Inicio (variante 1a · Clásico claro) ---- */
  function secInicio(body, p) {
    const unread = msgs.filter((m) => !m.leido);
    const urg = unread.filter((m) => m.tipo === "urgente").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const nx = nextThing(p);
    const { items, cur } = sortedSteps(p);
    const doses = dosesToday(p);
    const cita = p.citas.filter((c) => new Date(c.inicio) > new Date()).sort((a, b) => new Date(a.inicio) - new Date(b.inicio))[0];
    const nombre = p.apodo || p.nombre.split(" ")[0];

    body.innerHTML = `
      <div class="hello-row">
        <div>
          ${cutTitle(`¡Hola, ${nombre}!`, 30, 2)}
          <p class="hello-sub">${esc([p.cuarto ? "Cuarto " + p.cuarto : p.area, p.hospital].filter(Boolean).join(" · "))}</p>
        </div>
        <div class="hello-tools">
          ${Store.state.mode === "demo" ? `<span class="demo-badge">modo demo</span>` : ""}
          <button type="button" class="btn-soft btn-sm" id="logoutBtn">Salir</button>
        </div>
      </div>
      ${urg ? `<a href="#/app/avisos" class="urgent-banner"><span class="dot-bang">!</span><span>${esc(urg.texto)}</span></a>` : ""}
      ${nx ? `
        <a href="#/app/${nx.go}" class="card-strong next-card">
          <span class="next-k"><span class="dot-pulse"></span>Lo que sigue · ${falta(nx.t)}</span>
          <span class="next-t">${fHora(nx.t)} · ${esc(nx.titulo)}</span>
          ${nx.lugar ? `<span class="next-p">${esc(nx.lugar)}</span>` : ""}
        </a>` : ""}
      <div class="grid-2">
        <a href="#/app/expediente" class="big-tile t-exp"><span class="i-folder"></span><span class="lbl-big">Mi expediente</span></a>
        <a href="#/app/ruta" class="big-tile t-ruta"><span class="i-steps"><i></i><i></i><i></i></span>
          <span><span class="lbl-big">Mi ruta</span><span class="lbl-sm">${cur >= items.length ? "¡Todo listo!" : `Paso ${cur + 1} de ${items.length}`}</span></span></a>
      </div>
      <div class="grid-2">
        <a href="#/app/medicinas" class="mini-tile"><span class="i-pill"></span><span class="mini-row"><span>Medicinas</span><small>${doses.left ? doses.left + " hoy" : ""}</small></span></a>
        <a href="#/app/citas" class="mini-tile"><span class="i-cal"></span><span class="mini-row"><span>Citas</span><small>${cita ? (dayDiff(cita.inicio) === 0 ? fHora(cita.inicio) : cuando(cita.inicio)) : ""}</small></span></a>
        <a href="#/app/avisos" class="mini-tile"><span class="i-bell"></span><span class="mini-row"><span>Mis avisos</span></span>${unread.length ? `<span class="badge-n">${unread.length}</span>` : ""}</a>
        <a href="#/app/chat" class="mini-tile"><span class="i-chat"></span><span class="mini-row"><span>Chat</span></span></a>
      </div>
      ${svcTile(p)}`;
    $("#logoutBtn").onclick = doLogout;
  }

  // Acceso a "Cerca de mí" con una sugerencia según la etapa de recuperación
  function svcTile(p) {
    const etapa = Servicios.ETAPAS[Servicios.etapaDe(p)];
    const cat = ((p.apoyos_sugeridos || [])[0]) || (etapa && etapa.sug[0][0]);
    const c = Servicios.CATS[cat];
    return `
      <a href="#/servicios${c ? "/" + cat : ""}" class="svc-tile">
        <span class="svc-tile-pin" aria-hidden="true"></span>
        <span class="svc-tile-t"><span class="lbl-big">Cerca de mí</span>
          <span class="lbl-sm">${etapa && c ? `${esc(etapa.label)} · sugerimos buscar ${esc(c.short)}` :"Rehabilitación, farmacias y más cerca de casa"}</span></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>`;
  }

  /* ---- Mi ruta (variante 1d · Receta que se completa) ---- */
  function rutaHTML(p, interactive) {
    const { items, cur } = sortedSteps(p);
    const finished = cur >= items.length;
    const last = cur > 0 ? items[cur - 1] : null;
    const goal = p.tipo === "internado" ? "Meta: ¡Alta médica!" : "Meta: ¡Tratamiento terminado!";
    const tag = (i) => (interactive ? `button type="button" data-step="${i}"` : "div");
    const close = interactive ? "button" : "div";
    return `<div class="ruta-wrap">
      ${last ? `<div class="r-new"><span class="sq">✓</span><span class="col"><span class="k">${finished ? "¡Completaste todo!" : "¡Último paso listo!"}</span><span class="t">${esc(last.titulo)}</span></span>
        <span class="confetti c1"></span><span class="confetti c2"></span><span class="confetti c3"></span></div>` : ""}
      <div class="ruta-list">
        ${items.map((x, i) => {
          if (i < cur) return `<${tag(i)} class="r-row"><span class="r-num">✓</span><span class="t">${esc(x.titulo)}</span><span class="s">Listo</span></${close}>`;
          if (i === cur) return `
            <div class="r-now">
              <div class="r-head"><span class="r-ring"><span class="dot-pulse"></span></span><span class="t">${esc(x.titulo)}</span><span class="s">En proceso</span></div>
              <span class="meta">${cuando(x.fecha).replace(/^./, (c) => c.toUpperCase())} ${fHora(x.fecha)}${x.lugar ? " · " + esc(x.lugar) : ""}</span>
              ${x.descripcion ? `<span class="desc">${esc(x.descripcion)}</span>` : ""}
              <div class="lupi-box">${face(30)}<span class="col" id="lupiNow"><span>¿Quieres saber qué es?</span><button type="button" class="pill-slate" data-explain="${esc(x.titulo)}">Pregúntale a Lupita</button></span></div>
            </div>`;
          return `<${tag(i)} class="r-row next"><span class="r-num">${i + 1}</span><span class="t">${esc(x.titulo)}</span></${close}>`;
        }).join("")}
        <div class="r-goal ${finished ? "done" : ""}">${goal}</div>
      </div>
      <div id="stepDetail"></div></div>`;
  }

  function bindRuta(root, p) {
    const { items } = sortedSteps(p);
    root.addEventListener("click", async (e) => {
      const ex = e.target.closest("[data-explain]");
      if (ex) {
        const box = $("#lupiNow", root);
        box.innerHTML = `<p class="dots-loading"><span></span><span></span><span></span></p>`;
        const txt = await Lupi.explain(ex.dataset.explain);
        box.innerHTML = Lupi.fmt(txt);
        return;
      }
      const st = e.target.closest("[data-step]");
      if (st) {
        const x = items[+st.dataset.step];
        const d = $("#stepDetail", root);
        d.innerHTML = `
          <div class="r-detail">
            <div class="row-between"><span class="t">${esc(x.titulo)}</span><button type="button" class="pill-light" data-x>Cerrar</button></div>
            <span>${fFecha(x.fecha)} · ${fHora(x.fecha)}</span>
            ${x.lugar ? `<span>📍 ${esc(x.lugar)}${x.responsable ? " · " + esc(x.responsable) : ""}</span>` : ""}
            ${x.descripcion ? `<span>${esc(x.descripcion)}</span>` : ""}
          </div>`;
        $("[data-x]", d).onclick = () => (d.innerHTML = "");
        d.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  function secRuta(body, p) {
    body.innerHTML = backHead("Mi ruta", 3) + rutaHTML(p, true);
    bindRuta(body, p);
  }

  /* ---- Expediente ---- */
  function expedienteHTML(p) {
    const [cName, cPhone] = String(p.contacto_emergencia || "").split(" · ");
    const tel = (cPhone || "").replace(/[^\d+]/g, "");
    return `
      <div class="exp-layout"><div class="exp-left">
      <div class="card-strong">
        <span class="small">Mi ID</span>
        <div class="id-row"><span class="id-code">${esc(p.codigo)}</span><button type="button" class="pill-light" id="copyId">Copiar</button></div>
        <span style="font-size:20px">${esc(p.nombre)}</span>
      </div>
      <div class="info-grid">
        <div class="info"><span class="k">Edad</span><span class="v">${edad(p.fecha_nacimiento)}</span></div>
        <div class="info"><span class="k">Sangre</span><span class="v">${esc(p.tipo_sangre || "—")}</span></div>
        <div class="info full"><span class="k">Hospital</span><span class="v md">${esc(p.hospital || "—")}</span></div>
        ${p.contacto_emergencia ? `
        <div class="info full call"><span><span class="k">Si pasa algo, llamar a</span><span class="v md">${esc(cName)}</span>${cPhone ? `<span class="small">${esc(cPhone)}</span>` : ""}</span>
          ${tel ? `<a class="pill-slate" href="tel:${esc(tel)}">Llamar</a>` : ""}</div>` : ""}
      </div>
      </div><div class="exp-right">
      <div class="block"><h2 class="h-sub">Alergias</h2>
        <div class="chips-row">${p.alergias.length ? p.alergias.map((a) => `<span class="tag tag-urgente"><span class="dot-bang">!</span>${esc(a)}</span>`).join("") : `<span class="note-dashed">Ninguna registrada</span>`}</div></div>
      <div class="block"><h2 class="h-sub">Diagnóstico</h2>
        ${p.diagnosticos.length ? p.diagnosticos.map((d) => `<div class="diag"><span>${esc(d)}</span><button type="button" class="pill-frost" data-quees="${esc(d)}">¿Qué es?</button></div>`).join("") : `<span class="note-dashed">Sin diagnósticos</span>`}</div>
      <div class="block"><h2 class="h-sub">Documentos</h2>
        ${p.documentos.length ? p.documentos.map((d) => `
          <div class="doc"><span class="doc-top"><span>${esc(d.titulo)}</span><small>${fCorta(d.fecha)}</small></span>
            <div class="grid-2"><button type="button" class="doc-btn" data-ver="${esc(d.id)}">Ver</button><button type="button" class="doc-btn fill" data-bajar="${esc(d.id)}">Descargar</button></div></div>`).join("")
          : `<span class="note-dashed">Aún no hay documentos.</span>`}</div>
      </div></div>`;
  }

  function bindExpediente(root, p) {
    root.addEventListener("click", async (e) => {
      if (e.target.closest("#copyId")) {
        const b = e.target.closest("#copyId");
        try { await navigator.clipboard.writeText(p.codigo); } catch (_) {}
        b.textContent = "✓ Copiado"; setTimeout(() => (b.textContent = "Copiar"), 1800);
        return;
      }
      const q = e.target.closest("[data-quees]");
      if (q) {
        openSheet(`<div class="sheet-top"><span class="sheet-step">Lupita te explica</span><button type="button" class="btn-soft btn-sm" data-close>Cerrar</button></div>
          <h3>${esc(q.dataset.quees)}</h3><div class="lupi-box">${face(30)}<span class="col" id="sheetLupi"><p class="dots-loading"><span></span><span></span><span></span></p></span></div>`);
        const txt = await Lupi.explain(q.dataset.quees);
        const box = $("#sheetLupi"); if (box) box.innerHTML = Lupi.fmt(txt);
        return;
      }
      const v = e.target.closest("[data-ver]"), b = e.target.closest("[data-bajar]");
      const d = (v || b) && p.documentos.find((x) => String(x.id) === (v ? v.dataset.ver : b.dataset.bajar));
      if (!d) return;
      v ? verDoc(d, p) : bajarDoc(d, p);
    });
  }

  // Si el documento tiene archivo (url de Supabase Storage) se abre ese archivo;
  // si no, se arma una hoja con los datos que hay.
  function docPage(d, p) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(d.titulo)}</title>
      <style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;padding:0 20px;color:#2B2D2F;background:#FFEFDB}h1{margin:0 0 4px;padding-bottom:6px;border-bottom:4px solid #A9C9D5}p.meta{margin:0 0 24px}dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px}dt{font-weight:bold}</style>
      </head><body><h1>${esc(d.titulo)}</h1><p class="meta">${esc(d.tipo || "")} · ${fDia(d.fecha)}</p>
      <dl><dt>Paciente</dt><dd>${esc(p.nombre)}</dd><dt>ID</dt><dd>${esc(p.codigo)}</dd><dt>Hospital</dt><dd>${esc(p.hospital)}</dd></dl>
      <h2>Resumen</h2><p>${esc(d.resumen || "")}</p></body></html>`;
  }
  function verDoc(d, p) {
    if (d.url) { window.open(d.url, "_blank", "noopener"); return; }
    openSheet(`
      <div class="sheet-top"><span class="sheet-step">${esc(d.tipo || "Documento")} · ${fCorta(d.fecha)}</span><button type="button" class="btn-soft btn-sm" data-close>Cerrar</button></div>
      <h3>${esc(d.titulo)}</h3>
      <p>${esc(d.resumen || "")}</p>
      <p class="small">${esc(p.nombre)} · ${esc(p.codigo)} · ${esc(p.hospital)}</p>
      <button type="button" class="btn btn-primary" id="sheetDownload">Descargar</button>`,
      (panel) => ($("#sheetDownload", panel).onclick = () => bajarDoc(d, p)));
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
    body.innerHTML = backHead("Expediente", 9) + expedienteHTML(p);
    bindExpediente(body, p);
  }

  /* ---- Medicinas ---- */
  function secMeds(body, p) {
    const doses = dosesToday(p);
    const now = new Date();
    const slots = p.medicamentos.reduce((n, m) => n + (m.horarios || []).filter((h) => /^\d{1,2}:\d{2}$/.test(h)).length, 0);
    body.innerHTML = `
      ${backHead("Medicinas", 4)}
      <p style="font-size:17px">${doses.done + doses.left ? `Hoy: ${doses.done} ${doses.done === 1 ? "toma lista" : "tomas listas"}, ${doses.left} por tomar` : "Hoy no tienes tomas con horario."}</p>
      <div class="med-grid">${p.medicamentos.map((m, i) => `
        <div class="med ${i === medOpen ? "open" : ""}">
          <button type="button" class="med-head" data-med="${i}" aria-expanded="${i === medOpen}">
            <span class="i-pill lg"></span>
            <span class="nm"><b>${esc(m.nombre)}</b><small>${esc(m.para_que)}</small></span>
            <span class="arrow">${i === medOpen ? "−" : "+"}</span>
          </button>
          <div class="med-times">${(m.horarios || []).map((h) => {
            let done = false;
            if (/^\d{1,2}:\d{2}$/.test(h)) { const [hh, mm] = h.split(":").map(Number); const t = new Date(); t.setHours(hh, mm, 0, 0); done = t <= now && activeMed(m, t); }
            return `<span class="time ${done ? "done" : ""}">${done ? "✓ " : ""}${esc(h)}</span>`;
          }).join("")}</div>
          ${i === medOpen ? `<div class="med-detail"><span>Dosis</span><span>${esc(m.dosis)}</span><span>Cómo</span><span>${esc([m.via, m.indicaciones].filter(Boolean).join(". "))}</span>${m.hasta ? `<span>Hasta</span><span>${fDia(m.hasta)}</span>` : ""}</div>` : ""}
        </div>`).join("")}</div>
      <div class="sticky-cta">
        <span class="ok" id="calOk" hidden>✓ ${slots} ${slots === 1 ? "recordatorio" : "recordatorios"} en tu calendario</span>
        <button type="button" class="btn btn-primary btn-xl" id="medsCal">Recordármelo en el calendario</button>
      </div>`;
    body.onclick = (e) => {
      const b = e.target.closest("[data-med]"); if (!b) return;
      medOpen = medOpen === +b.dataset.med ? -1 : +b.dataset.med;
      secMeds(body, p); Cutout.cutAll(body);
    };
    $("#medsCal").onclick = (e) => { e.stopPropagation(); Calendar.addMeds(p); $("#calOk").hidden = false; };
  }

  /* ---- Citas ---- */
  function secCitas(body, p) {
    const now = new Date();
    const prox = p.citas.filter((c) => new Date(c.inicio) >= now).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    const pas = p.citas.filter((c) => new Date(c.inicio) < now);
    const card = (c, past) => `
      <div class="card cita ${past ? "past" : ""}">
        <div class="cita-date"><b>${new Date(c.inicio).getDate()}</b><small>${new Date(c.inicio).toLocaleDateString("es-MX", { month: "short" })}</small></div>
        <div class="cita-info">
          <span class="small">${past ? fFecha(c.inicio) : cuando(c.inicio).replace(/^./, (x) => x.toUpperCase())} · ${fHora(c.inicio)}</span>
          <span class="t">${esc(c.titulo)}</span>
          <span>${esc(c.lugar)}</span>
          ${c.con_quien ? `<span>Con ${esc(c.con_quien)}</span>` : ""}
          ${c.indicaciones ? `<span>📝 ${esc(c.indicaciones)}</span>` : ""}
          ${past ? "" : `<div class="cita-actions"><button type="button" class="pill-slate" data-ics="${esc(c.id)}">Agregar a mi calendario</button><a class="btn-soft btn-sm" target="_blank" rel="noopener" href="${Calendar.googleLink(c, p)}">Google Calendar</a></div>`}
        </div>
      </div>`;
    body.innerHTML = `
      ${backHead("Citas", 6)}
      ${prox.length ? `<div class="cita-grid">${prox.map((c) => card(c)).join("")}</div>` : `<div class="empty">No tienes citas próximas.</div>`}
      ${prox.length > 1 ? `<button type="button" class="btn btn-secondary" id="allCal">Agregar todas con recordatorios</button>` : ""}
      ${pas.length ? `<details class="past-box"><summary>Citas pasadas (${pas.length})</summary><div>${pas.map((c) => card(c, true)).join("")}</div></details>` : ""}`;
    body.onclick = (e) => {
      const b = e.target.closest("[data-ics]"); if (!b) return;
      Calendar.addCita(p.citas.find((c) => String(c.id) === b.dataset.ics), p);
      toast("Te avisaremos 1 día y 1 hora antes");
    };
    const all = $("#allCal"); if (all) all.onclick = () => { Calendar.addAllCitas(p); toast("Abre el archivo para guardar tus citas"); };
  }

  /* ---- Mis avisos ---- */
  const TIPO_LBL = { urgente: "Urgente", recordatorio: "Recordatorio", mensaje: "Mensaje" };
  function secAvisos(body, p) {
    const unreadN = msgs.filter((m) => !m.leido).length;
    const list = msgs.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .filter((m) => avisoFiltro === "Todos" || TIPO_LBL[m.tipo || "mensaje"] === avisoFiltro);
    const unread = list.filter((m) => !m.leido), read = list.filter((m) => m.leido);
    body.innerHTML = `
      ${backHead("Mis avisos", 6, `<span style="font-size:16px">${unreadN ? unreadN + (unreadN === 1 ? " nuevo" : " nuevos") : "Todo leído"}</span>`)}
      <div class="filters">${["Todos", "Urgente", "Recordatorio", "Mensaje"].map((f) => `<button type="button" class="filter ${f === avisoFiltro ? "on" : ""}" data-f="${f}">${f}</button>`).join("")}</div>
      ${msgs.length && unreadN === 0 && avisoFiltro === "Todos" ? `<div class="all-done">${face(72, "feliz")}<b>¡Todo al día!</b><span style="font-size:16px">Si llega algo nuevo, aparece aquí.</span></div>` : ""}
      ${!list.length ? `<div class="empty">Nada por aquí. ¡Qué tranquilidad!</div>` : ""}
      ${unread.map((m) => `
        <div class="aviso ${m.tipo || "mensaje"}">
          <div class="aviso-top"><span class="aviso-tag">${TIPO_LBL[m.tipo || "mensaje"]}</span><span>${dayDiff(m.created_at) === 0 ? fHora(m.created_at) : fFecha(m.created_at)}</span></div>
          <span class="aviso-txt">${esc(m.texto)}</span>
          <span class="aviso-from">De: ${esc(m.autor_nombre)}</span>
          <button type="button" class="aviso-ok" data-leido="${esc(m.id)}">¡Entendido!</button>
        </div>`).join("")}
      ${read.map((m) => `
        <div class="aviso-read"><span class="dot-check">✓</span><span class="t">${esc(m.texto)}</span>${justRead.has(m.id) ? `<span class="thanks">¡Gracias!</span>` : ""}</div>`).join("")}`;
    body.onclick = async (e) => {
      const f = e.target.closest("[data-f]");
      if (f) { avisoFiltro = f.dataset.f; secAvisos(body, p); Cutout.cutAll(body); return; }
      const b = e.target.closest("[data-leido]"); if (!b) return;
      b.disabled = true;
      try { await Store.markRead(p, b.dataset.leido); justRead.add(b.dataset.leido); renderApp("avisos"); }
      catch (ex) { toast("No se pudo guardar: " + ex.message); b.disabled = false; }
    };
  }

  /* ---- Chat entre pacientes ---- */
  const ROOMS = [["general", "Pacientes y familias"], ["juegos", "Peques"]];
  const BLOCK = /(\d[\s-]?){7,}|@|https?:\/\/|www\.|\.com\b/i;
  const BAD = ["idiota", "estupido", "estúpido", "tonto", "pendejo", "imbecil", "imbécil"];

  function secChat(body) {
    body.innerHTML = `
      ${backHead("Chat", 1)}
      <div class="seg">${ROOMS.map(([k, t]) => `<button type="button" class="seg-btn ${k === salaRoom ? "on" : ""}" data-room="${k}">${t}</button>`).join("")}</div>
      <div class="chat-wall" id="chatWall"></div>
      <form class="composer" id="salaForm"><input id="salaInput" maxlength="240" placeholder="Escribe algo bonito…" autocomplete="off" /><button class="btn btn-primary" type="submit">Enviar</button></form>
      <div class="stk-row">${Object.keys(STICKERS).map((k) => `<button type="button" class="stk-btn" data-stk="${k}" aria-label="Enviar sticker">${sticker(k)}</button>`).join("")}</div>
      <p class="note-dashed">Por tu seguridad no compartas teléfonos, direcciones ni redes sociales. Recepción cuida este chat.</p>`;
    body.onclick = async (e) => {
      const r = e.target.closest("[data-room]");
      if (r) { salaRoom = r.dataset.room; secChat(body); Cutout.cutAll(body); return; }
      const s = e.target.closest("[data-stk]");
      if (s) { await Store.sendSala(salaRoom, "", s.dataset.stk); loadSala($("#chatWall")); }
    };
    $("#salaForm").onsubmit = async (e) => {
      e.preventDefault();
      const v = $("#salaInput").value.trim(); if (!v) return;
      if (BLOCK.test(v)) { toast("No compartas teléfonos, correos ni enlaces aquí."); return; }
      if (BAD.some((w) => v.toLowerCase().includes(w))) { toast("Usemos palabras amables"); return; }
      $("#salaInput").value = "";
      try { await Store.sendSala(salaRoom, v, ""); loadSala($("#chatWall")); } catch (ex) { toast("No se pudo enviar: " + ex.message); }
    };
    loadSala($("#chatWall"));
  }

  async function loadSala(el, canDelete) {
    if (!el) return;
    const list = await Store.sala(salaRoom).catch(() => []);
    el.innerHTML = list.length ? list.map((m) => `
      <div class="postit ${m.mine ? "mine" : ""}">
        ${m.sticker ? sticker(m.sticker) : `<p>${esc(m.texto)}</p>`}
        <span class="who">${esc(m.autor_nombre)} · ${fHora(m.created_at)}</span>
        ${canDelete ? `<button type="button" class="link-btn" data-del="${esc(m.id)}">Quitar</button>` : ""}
      </div>`).join("") : `<div class="empty">Nadie ha escrito todavía. ¡Saluda!</div>`;
    el.scrollTop = el.scrollHeight;
  }

  /* =========================================================
     RECEPCIÓN (personal de apoyo)
     ========================================================= */
  let staffPatients = [];
  let staffTab = "pacientes";
  let staffView = null;      // { type: "aviso" | "ficha" | "ruta", codigo }
  let staffSearch = "";
  let avisoTipo = "mensaje";
  const PRESETS = ["Ven a recepción, por favor", "Empieza tu ayuno ahora", "Tu cita se adelantó 30 min", "Tu familiar te espera abajo"];

  async function renderStaff() {
    try { staffPatients = await Store.myPatients(); } catch (ex) { $("#staffBody").innerHTML = `<p class="form-error">${esc(ex.message)}</p>`; return; }
    drawStaff();
    ensureLive();
  }

  function ptInfo(p) {
    const { items, cur } = sortedSteps(p);
    if (p.tipo === "internado") return `Cuarto ${p.cuarto} · ruta ${Math.min(cur, items.length)}/${items.length}`;
    const c = p.citas.filter((x) => new Date(x.inicio) > new Date()).sort((a, b) => new Date(a.inicio) - new Date(b.inicio))[0];
    return c ? `Cita ${cuando(c.inicio)} ${fHora(c.inicio)} · ${c.titulo}` : "Sin citas próximas";
  }

  function drawStaff() {
    const me = Store.state.me;
    const old = $("#staffBody"); const body = old.cloneNode(false); old.replaceWith(body);
    const header = `
      <div class="staff-head">
        ${cutTitle("Recepción", 24, 8)}
        <div class="staff-who"><span>${esc(me.nombre.split(" ")[0])}<br>${esc(me.horario || me.puesto || "")}</span>
          <span style="display:flex;gap:6px;align-items:center">${Store.state.mode === "demo" ? `<span class="demo-badge">demo</span>` : ""}<button type="button" class="btn-soft btn-sm" id="staffLogout">Salir</button></span></div>
      </div>`;

    if (staffView) {
      const p = staffPatients.find((x) => x.codigo === staffView.codigo);
      body.innerHTML = header + `<button type="button" class="btn-back" id="staffBack">← Pacientes</button>` + staffDetail(p);
      Cutout.cutAll(body);
      $("#staffLogout").onclick = doLogout;
      $("#staffBack").onclick = () => { staffView = null; drawStaff(); };
      mountStaffDetail(body, p);
      return;
    }

    body.innerHTML = header + `
      <div class="seg">
        <button type="button" class="seg-btn ${staffTab === "pacientes" ? "on" : ""}" data-tab="pacientes">Pacientes</button>
        <button type="button" class="seg-btn ${staffTab === "hospital" ? "on" : ""}" data-tab="hospital">Hospital</button>
        <button type="button" class="seg-btn ${staffTab === "chat" ? "on" : ""}" data-tab="chat">Chat</button>
      </div>
      <div id="staffPane" class="list-col"></div>`;
    Cutout.cutAll(body);
    $("#staffLogout").onclick = doLogout;
    $$("[data-tab]", body).forEach((b) => (b.onclick = () => { staffTab = b.dataset.tab; drawStaff(); }));
    const pane = $("#staffPane");
    if (staffTab === "pacientes") drawPatients(pane);
    else if (staffTab === "hospital") drawHospital(pane);
    else drawStaffChat(pane);
  }

  function drawPatients(pane) {
    pane.innerHTML = `
      <input class="search" id="ptSearch" placeholder="Buscar nombre o ID…" value="${esc(staffSearch)}" autocomplete="off" />
      <div id="ptList" class="pt-grid"></div>
      <button type="button" class="fab-wide" id="fabAviso">+ Publicar aviso del hospital</button>`;
    const draw = () => {
      const q = staffSearch.toLowerCase();
      const list = staffPatients.filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
      $("#ptList").innerHTML = list.length ? list.map((p) => `
        <div class="pt-card">
          <div class="pt-top"><span>${esc(p.nombre)}</span><span class="mono">${esc(p.codigo)}</span></div>
          <span class="pt-info">${esc(ptInfo(p))}</span>
          <div class="pt-actions">
            <button type="button" class="urg" data-urg="${esc(p.codigo)}">! Urgente</button>
            <button type="button" data-view="aviso" data-pt="${esc(p.codigo)}">Aviso</button>
            <button type="button" data-view="ficha" data-pt="${esc(p.codigo)}">Ficha</button>
            <button type="button" data-view="ruta" data-pt="${esc(p.codigo)}">Ruta</button>
          </div>
        </div>`).join("") : `<div class="empty">No encontré a nadie con ese nombre o ID.</div>`;
    };
    draw();
    $("#ptSearch").oninput = (e) => { staffSearch = e.target.value; draw(); };
    $("#ptList").onclick = (e) => {
      const u = e.target.closest("[data-urg]");
      if (u) return openUrgent(staffPatients.find((p) => p.codigo === u.dataset.urg));
      const v = e.target.closest("[data-view]");
      if (v) { staffView = { type: v.dataset.view, codigo: v.dataset.pt }; drawStaff(); }
    };
    $("#fabAviso").onclick = openHospAviso;
  }

  // Urgente en 2 toques: 1) "! Urgente"  2) un mensaje listo
  function openUrgent(p) {
    const who = p.apodo || p.nombre.split(" ")[0];
    openSheet(`
      <div class="sheet-top"><span class="sheet-step">Toque 2 de 2</span><button type="button" class="btn-soft btn-sm" data-close>Cancelar</button></div>
      <h3>Urgente para ${esc(who)}</h3>
      ${PRESETS.map((t, i) => `<button type="button" class="preset" data-preset="${i}">${esc(t)}</button>`).join("")}
      <button type="button" class="btn-soft" id="otherMsg">Escribir otro…</button>`,
      (panel) => {
        panel.onclick = (e) => {
          const b = e.target.closest("[data-preset]");
          if (b) sendUrgent(p, PRESETS[+b.dataset.preset]);
          if (e.target.closest("#otherMsg")) {
            panel.innerHTML = `
              <div class="sheet-top"><span class="sheet-step">Urgente</span><button type="button" class="btn-soft btn-sm" data-close>Cancelar</button></div>
              <h3>Urgente para ${esc(who)}</h3>
              <textarea id="urgText" maxlength="600" placeholder="Escribe el aviso…"></textarea>
              <button type="button" class="btn btn-primary" id="urgSend">Enviar urgente</button>`;
            $$("[data-close]", panel).forEach((x) => (x.onclick = closeSheet));
            $("#urgText", panel).focus();
            $("#urgSend", panel).onclick = () => { const v = $("#urgText", panel).value.trim(); if (v) sendUrgent(p, v); };
          }
        };
      });
  }
  async function sendUrgent(p, texto, tipo) {
    closeSheet();
    try {
      const id = await Store.sendMessage(p, texto, tipo || "urgente");
      const who = p.apodo || p.nombre.split(" ")[0];
      toast(`Enviado a ${who}`, { label: "Deshacer", run: async () => { try { await Store.deleteMessage(p, id); toast("Aviso cancelado"); refreshStaffLive(); } catch (ex) { toast("No se pudo deshacer: " + ex.message); } } });
      refreshStaffLive();
    } catch (ex) { toast("No se pudo enviar: " + ex.message); }
  }

  function openHospAviso() {
    openSheet(`
      <div class="sheet-top"><span class="sheet-step">Aviso del hospital</span><button type="button" class="btn-soft btn-sm" data-close>Cancelar</button></div>
      <h3>Lo verán todos en la portada</h3>
      <input id="hospText" maxlength="140" placeholder="Ej.: Visitas de 16:00 a 18:00" autocomplete="off" />
      <button type="button" class="btn btn-primary" id="hospSend">Publicar</button>`,
      (panel) => {
        $("#hospText", panel).focus();
        $("#hospSend", panel).onclick = async () => {
          const v = $("#hospText", panel).value.trim(); if (!v) return;
          try { await Store.addAviso(v); closeSheet(); toast("Aviso publicado"); if (staffTab === "hospital") drawStaff(); }
          catch (ex) { toast("No se pudo publicar: " + ex.message); }
        };
      });
  }

  async function drawHospital(pane) {
    const list = await Store.avisos().catch(() => []);
    pane.innerHTML = `
      <p class="small">Se muestran a todos en la banda de la portada.</p>
      ${list.length ? list.map((a) => `<div class="hosp-aviso"><span>${esc(a.texto)}</span><button type="button" class="pill-light" data-delaviso="${esc(a.id)}">Quitar</button></div>`).join("") : `<div class="empty">No hay avisos publicados.</div>`}
      <button type="button" class="fab-wide" id="fabAviso">+ Publicar aviso del hospital</button>`;
    $("#fabAviso").onclick = openHospAviso;
    pane.onclick = async (e) => {
      const b = e.target.closest("[data-delaviso]"); if (!b) return;
      try { await Store.deleteAviso(b.dataset.delaviso); drawHospital(pane); } catch (ex) { toast(ex.message); }
    };
  }

  function drawStaffChat(pane) {
    pane.innerHTML = `
      <div class="seg">${ROOMS.map(([k, t]) => `<button type="button" class="seg-btn ${k === salaRoom ? "on" : ""}" data-room="${k}">${t}</button>`).join("")}</div>
      <div class="chat-wall" id="staffWall"></div>
      <form class="composer" id="staffSalaForm"><input id="staffSalaInput" maxlength="240" placeholder="Mensaje de recepción…" autocomplete="off" /><button class="btn btn-primary">Enviar</button></form>`;
    pane.onclick = async (e) => {
      const r = e.target.closest("[data-room]");
      if (r) { salaRoom = r.dataset.room; drawStaffChat(pane); return; }
      const d = e.target.closest("[data-del]");
      if (d) { try { await Store.deleteSala(salaRoom, d.dataset.del); loadSala($("#staffWall"), true); } catch (ex) { toast(ex.message); } }
    };
    $("#staffSalaForm").onsubmit = async (e) => {
      e.preventDefault(); const v = $("#staffSalaInput").value.trim(); if (!v) return;
      $("#staffSalaInput").value = ""; await Store.sendSala(salaRoom, v, ""); loadSala($("#staffWall"), true);
    };
    loadSala($("#staffWall"), true);
  }

  function staffDetail(p) {
    const head = `<div class="card"><div class="pt-top"><span>${esc(p.nombre)}</span><span class="mono">${esc(p.codigo)}</span></div><span class="pt-info" style="margin:0">${esc(ptInfo(p))}</span></div>`;
    if (staffView.type === "ficha") return head + expedienteHTML(p);
    if (staffView.type === "ruta") return head + rutaHTML(p, true);
    return head + `
      <div class="send-layout"><div class="card">
        <p class="lbl" style="margin-top:0">¿Qué tipo de aviso es?</p>
        <div class="type-pick">${["mensaje", "recordatorio", "urgente"].map((k) => `<button type="button" class="type-btn ${k === avisoTipo ? "on" : ""}" data-tipo="${k}">${TIPO_LBL[k]}</button>`).join("")}</div>
        <label for="sendText">Mensaje para ${esc(p.apodo || p.nombre.split(" ")[0])}</label>
        <textarea id="sendText" maxlength="600" placeholder="Escribe el aviso…"></textarea>
        <button type="button" class="btn btn-primary" id="sendBtn" style="margin-top:12px;width:100%">Enviar aviso</button>
      </div>
      <div class="list-col"><h2 class="h-sub">Avisos enviados</h2>
      <div class="list-col" id="sentList"></div></div></div>`;
  }

  function mountStaffDetail(body, p) {
    if (staffView.type === "ficha") return bindExpediente(body, p);
    if (staffView.type === "ruta") return bindRuta(body, p);
    $$("[data-tipo]", body).forEach((b) => (b.onclick = () => { avisoTipo = b.dataset.tipo; $$("[data-tipo]", body).forEach((x) => x.classList.toggle("on", x === b)); }));
    $("#sendBtn").onclick = () => { const v = $("#sendText").value.trim(); if (!v) return; $("#sendText").value = ""; sendUrgent(p, v, avisoTipo); };
    loadSent(p);
  }

  async function loadSent(p) {
    const el = $("#sentList"); if (!el) return;
    const list = (await Store.messages(p).catch(() => [])).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    el.innerHTML = list.length ? list.map((m) => `
      <div class="aviso ${m.tipo || "mensaje"}" style="animation:none">
        <div class="aviso-top"><span class="aviso-tag">${TIPO_LBL[m.tipo || "mensaje"]}</span><span>${fFecha(m.created_at)} · ${fHora(m.created_at)}</span></div>
        <span class="aviso-txt" style="font-size:17px">${esc(m.texto)}</span>
        <span class="aviso-from">${m.leido ? "✓ Leído" : "Sin leer"} · De: ${esc(m.autor_nombre)}</span>
      </div>`).join("") : `<div class="empty">Aún no le has enviado avisos.</div>`;
  }

  function refreshStaffLive() {
    if (currentView !== "personal") return;
    if (staffView && staffView.type === "aviso") {
      const p = staffPatients.find((x) => x.codigo === staffView.codigo);
      if (p) loadSent(p);
    } else if (!staffView && staffTab === "chat") loadSala($("#staffWall"), true);
    else if (!staffView && staffTab === "hospital") drawHospital($("#staffPane"));
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  document.addEventListener("DOMContentLoaded", async () => {
    buildHome();
    Lupi.init();
    initLogin();
    $("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
    await Store.restore().catch(() => null);
    window.addEventListener("hashchange", route);
    route();
  });
})();
