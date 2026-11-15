/* =========================================================
   well well · Cerca de mí
   Ayuda a pacientes y familiares a encontrar servicios
   después del alta: hospitales, rehabilitación, fisioterapia,
   farmacias, laboratorios y atención especializada.

   Datos y mapa: Google Maps Platform
     - Places API (New)  → Place.searchNearby / Place.searchByText
     - Maps JavaScript API → mapa, marcadores y círculo del radio
   La clave se lee de /api/maps-key (variable de entorno en Vercel)
   o, en tu computadora, de js/config.js (ver js/config.example.js).

   Uso:  Servicios.mount(contenedor, { patient, cat, back })
         Servicios.detect("¿dónde hay fisioterapia?")  (para Lupita)
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const toast = (m) => (window.wwToast ? window.wwToast(m) : null);

  const CENTRO_INICIAL = { lat: 23.6345, lon: -102.5528, zoom: 4 }; // México
  const RADIOS = [1, 5, 10, 20];
  const PAGE = 20;
  const PREFS_KEY = "ww-svc-prefs";
  const ETAPA_KEY = "ww-svc-etapa";
  const LOCAL_SAVED_KEY = "ww-lugares-v1";

  // Campos que pedimos a Places API. Cada campo influye en el costo
  // (teléfono, web, horario y accesibilidad son de nivel "Enterprise").
  const FIELDS = [
    "id", "displayName", "formattedAddress", "location", "primaryType", "primaryTypeDisplayName",
    "nationalPhoneNumber", "internationalPhoneNumber", "websiteURI", "regularOpeningHours",
    "accessibilityOptions", "googleMapsURI", "businessStatus",
  ];

  /* =========================================================
     A. CATEGORÍAS → tipos de Places API (Tabla A) o texto
     "nearby": Place.searchNearby con includedTypes (máx. 20, ordenados por distancia)
     "text":   Place.searchByText dentro del área (para lo que no tiene tipo propio)
     ========================================================= */
  const CATS = {
    hospitales: {
      label: "Hospitales y centros médicos", short: "hospitales y centros médicos", glyph: "✚",
      tip: "Sirven para revisiones médicas o si algo no se ve bien.",
      nearby: ["hospital", "doctor"],
    },
    rehabilitacion: {
      label: "Clínicas de rehabilitación", short: "clínicas de rehabilitación", glyph: "↻",
      tip: "Ahí pueden continuar las sesiones para recuperar fuerza y movimiento.",
      text: "centro de rehabilitación física",
    },
    fisioterapia: {
      label: "Fisioterapia", short: "centros de fisioterapia", glyph: "≈",
      tip: "Ahí guían los ejercicios para mover el cuerpo sin lastimarse.",
      nearby: ["physiotherapist"], text: "fisioterapia",
    },
    farmacias: {
      label: "Farmacias", short: "farmacias", glyph: "℞",
      tip: "Para surtir recetas y comprar material de curación.",
      nearby: ["pharmacy", "drugstore"],
    },
    laboratorios: {
      label: "Laboratorios médicos", short: "laboratorios médicos", glyph: "◉",
      tip: "Para los estudios de sangre u orina que pida su médico.",
      nearby: ["medical_lab"], text: "laboratorio de análisis clínicos",
    },
    especializada: {
      label: "Atención especializada", short: "centros de atención especializada", glyph: "★",
      tip: "Especialistas y terapias como la ocupacional o de lenguaje.",
      text: "clínica de especialidades médicas",
    },
  };
  const CAT_ORDER = ["hospitales", "rehabilitacion", "fisioterapia", "farmacias", "laboratorios", "especializada"];

  /* =========================================================
     Etapas de recuperación → qué buscar
     Solo usa información NO sensible: el avance de la ruta
     (¿ya salió del hospital? ¿hace cuánto?) o lo que elija
     la familia. Nunca el diagnóstico.
     ========================================================= */
  const ETAPAS = {
    preparando_alta: {
      label: "Preparando la salida",
      desc: "Antes de irse a casa conviene ubicar dónde surtir la receta y a dónde ir si algo no se ve bien.",
      sug: [["farmacias", "Para surtir la receta del alta"], ["hospitales", "Por si necesitan una revisión"], ["laboratorios", "Si les pidieron estudios de control"]],
    },
    primeras_semanas: {
      label: "Primeras semanas en casa",
      desc: "Los primeros días en casa: medicinas, curaciones y revisiones cerca.",
      sug: [["farmacias", "Medicinas y material de curación"], ["hospitales", "Revisiones y curaciones cerca de casa"], ["especializada", "Consultas de seguimiento"]],
    },
    rehabilitacion: {
      label: "En rehabilitación",
      desc: "Toca recuperar fuerza y movimiento poco a poco, con ayuda de especialistas.",
      sug: [["rehabilitacion", "Para continuar las sesiones"], ["fisioterapia", "Ejercicios guiados cerca de casa"], ["especializada", "Terapia ocupacional, de lenguaje y más"]],
    },
    seguimiento: {
      label: "Revisiones de control",
      desc: "Ya pasó lo más difícil: ahora vienen estudios y consultas de control.",
      sug: [["laboratorios", "Estudios de control"], ["especializada", "Consultas con especialista"], ["farmacias", "Para el tratamiento que continúa"]],
    },
  };

  function etapaDe(p) {
    if (!p) return null;
    if (p.etapa_recuperacion && ETAPAS[p.etapa_recuperacion]) return p.etapa_recuperacion;
    const pasos = (p.procedimientos || []).slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const alta = pasos.filter((x) => /\balta\b/i.test(x.titulo || "")).pop();
    if (alta) {
      if (alta.estado !== "hecho") return "preparando_alta";
      const dias = (Date.now() - new Date(alta.fecha)) / 86400000;
      return dias <= 21 ? "primeras_semanas" : "seguimiento";
    }
    return p.tipo === "ambulatorio" ? "seguimiento" : "preparando_alta";
  }

  /* =========================================================
     B. Accesibilidad: SOLO lo que Google tiene registrado
     (accessibilityOptions). Google no registra elevadores.
     ========================================================= */
  const ACCESOS = [
    { k: "entrada", label: "Entrada para silla de ruedas" },
    { k: "estacionamiento", label: "Estacionamiento accesible" },
    { k: "banos", label: "Baños adaptados" },
  ];
  function accesibilidad(a) {
    a = a || {};
    const out = [];
    const add = (k, v, si, no) => { if (typeof v === "boolean") out.push({ k, ok: v, txt: v ? si : no }); };
    add("entrada", a.hasWheelchairAccessibleEntrance, "Entrada accesible para silla de ruedas", "Entrada sin acceso para silla de ruedas");
    add("estacionamiento", a.hasWheelchairAccessibleParking, "Estacionamiento accesible", "Sin estacionamiento accesible");
    add("banos", a.hasWheelchairAccessibleRestroom, "Baños adaptados", "Sin baños adaptados");
    add("asientos", a.hasWheelchairAccessibleSeating, "Asientos accesibles", "Sin asientos accesibles");
    return out;
  }

  /* =========================================================
     C. Fichas
     ========================================================= */
  const TIPOS = {
    hospital: "Hospital", doctor: "Consultorio médico", pharmacy: "Farmacia", drugstore: "Farmacia",
    physiotherapist: "Fisioterapia", medical_lab: "Laboratorio", dentist: "Dentista", dental_clinic: "Clínica dental",
  };
  const DEFAULT_TIPO = { rehabilitacion: "Rehabilitación", fisioterapia: "Fisioterapia", laboratorios: "Laboratorio", farmacias: "Farmacia", hospitales: "Centro médico", especializada: "Atención especializada" };

  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const fDist = (d) => (d == null ? "" : d < 1 ? `${Math.max(10, Math.round((d * 1000) / 10) * 10)} m` : `${d.toFixed(d < 10 ? 1 : 0)} km`);
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (_) { return ""; } };

  function toPlace(pl, cat, origin) {
    if (!pl || !pl.location) return null;
    const lat = pl.location.lat(), lon = pl.location.lng();
    const hours = (pl.regularOpeningHours && pl.regularOpeningHours.weekdayDescriptions) || [];
    return {
      id: pl.id,
      name: pl.displayName || "",
      tipo: pl.primaryTypeDisplayName || TIPOS[pl.primaryType] || DEFAULT_TIPO[cat] || "Servicio de salud",
      cat, lat, lon,
      addr: pl.formattedAddress || "",
      phone: pl.nationalPhoneNumber || pl.internationalPhoneNumber || "",
      website: safeUrl(pl.websiteURI || ""),
      hours,
      acc: accesibilidad(pl.accessibilityOptions),
      gmaps: safeUrl(pl.googleMapsURI || ""),
      closed: pl.businessStatus === "CLOSED_PERMANENTLY",
      dist: origin ? km(origin, { lat, lon }) : null,
    };
  }

  /* =========================================================
     Google Maps Platform: carga y consultas
     ========================================================= */
  let gmPromise = null;
  let authFailed = false;

  async function getConfig() {
    try {
      const r = await fetch("/api/maps-key", { headers: { Accept: "application/json" } });
      if (r.ok) { const j = await r.json(); if (j && j.key) return j; }
    } catch (_) {}
    // en tu computadora: js/config.js (no se sube a GitHub)
    if (!window.WW_CONFIG) {
      await new Promise((res) => {
        const s = document.createElement("script");
        s.src = "js/config.js"; s.onload = res; s.onerror = res;
        document.head.appendChild(s);
      });
    }
    const c = window.WW_CONFIG || {};
    return { key: c.googleMapsKey || "", mapId: c.googleMapsMapId || "", region: c.region || "MX" };
  }

  function loadGoogle() {
    if (gmPromise) return gmPromise;
    gmPromise = (async () => {
      const cfg = await getConfig();
      if (!cfg.key) { const e = new Error("sin-clave"); e.code = "NO_KEY"; throw e; }
      // Google llama a esta función si la clave no es válida o no tiene permisos
      window.gm_authFailure = () => { authFailed = true; mostrarErrorClave(); };
      if (!(window.google && google.maps && google.maps.importLibrary)) {
        await new Promise((res, rej) => {
          window.__wwMapsReady = res;
          const s = document.createElement("script");
          s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(cfg.key)}&v=weekly&loading=async&language=es&region=${encodeURIComponent(cfg.region || "MX")}&callback=__wwMapsReady`;
          s.async = true;
          s.onerror = () => rej(new Error("No se pudo cargar Google Maps"));
          document.head.appendChild(s);
        });
      }
      const [maps, places, marker] = await Promise.all([
        google.maps.importLibrary("maps"),
        google.maps.importLibrary("places"),
        google.maps.importLibrary("marker"),
      ]);
      return {
        Map: maps.Map, Circle: maps.Circle, InfoWindow: maps.InfoWindow,
        Place: places.Place, Rank: places.SearchNearbyRankPreference,
        Marker: marker.AdvancedMarkerElement,
        mapId: cfg.mapId || "DEMO_MAP_ID",
        region: (cfg.region || "MX").toLowerCase(),
      };
    })();
    gmPromise.catch(() => { gmPromise = null; });
    return gmPromise;
  }

  // rectángulo que contiene el círculo de búsqueda (para searchByText)
  function boundsOf(o, radiusKm) {
    const dLat = radiusKm / 111.32;
    const dLon = radiusKm / (111.32 * Math.cos((o.lat * Math.PI) / 180));
    return { north: o.lat + dLat, south: o.lat - dLat, east: o.lon + dLon, west: o.lon - dLon };
  }

  async function placesSearch(cat, o, radiusKm) {
    const gm = await loadGoogle();
    const c = CATS[cat];
    const calls = [];
    if (c.nearby) {
      calls.push(gm.Place.searchNearby({
        fields: FIELDS,
        locationRestriction: { center: { lat: o.lat, lng: o.lon }, radius: radiusKm * 1000 },
        includedTypes: c.nearby,
        maxResultCount: 20,
        rankPreference: gm.Rank.DISTANCE,
        language: "es",
        region: gm.region,
      }));
    }
    if (c.text) {
      calls.push(gm.Place.searchByText({
        textQuery: c.text,
        fields: FIELDS,
        locationRestriction: boundsOf(o, radiusKm),
        maxResultCount: 20,
        language: "es",
        region: gm.region,
      }));
    }
    const settled = await Promise.allSettled(calls);
    const ok = settled.filter((r) => r.status === "fulfilled");
    if (!ok.length) throw settled[0].reason || new Error("Sin respuesta");
    const all = ok.flatMap((r) => r.value.places || []);
    const lleno = ok.some((r) => (r.value.places || []).length >= 20);
    const seen = new Set();
    const list = all.filter((p) => p && p.id && !seen.has(p.id) && seen.add(p.id));
    return { list, lleno };
  }

  async function geocode(q) {
    const gm = await loadGoogle();
    const { places } = await gm.Place.searchByText({
      textQuery: q,
      fields: ["displayName", "formattedAddress", "location"],
      maxResultCount: 5,
      language: "es",
      region: gm.region,
    });
    return (places || []).filter((p) => p.location).map((p) => ({
      lat: p.location.lat(), lon: p.location.lng(),
      label: p.formattedAddress || p.displayName || q,
    }));
  }
  const shortLabel = (s) => String(s || "").split(",").slice(0, 3).join(",").trim();

  /* =========================================================
     D. Mis lugares guardados
     Por las reglas de Google solo guardamos el ID del lugar
     (se puede guardar sin límite); los datos se vuelven a
     pedir a Places API al abrir "Mis lugares guardados".
     ========================================================= */
  const savedApi = {
    async list() {
      if (window.Store && Store.places) return Store.places();
      return lsGet(LOCAL_SAVED_KEY, []);
    },
    async add(p) {
      if (window.Store && Store.savePlace) return Store.savePlace(p);
      lsSet(LOCAL_SAVED_KEY, [p, ...lsGet(LOCAL_SAVED_KEY, []).filter((x) => x.id !== p.id)].slice(0, 200));
    },
    async remove(id) {
      if (window.Store && Store.removePlace) return Store.removePlace(id);
      lsSet(LOCAL_SAVED_KEY, lsGet(LOCAL_SAVED_KEY, []).filter((x) => x.id !== id));
    },
  };
  const isGoogleId = (id) => typeof id === "string" && id.length > 10 && !id.includes("/"); // ignora guardados viejos de OSM
  const detailCache = new Map();

  async function fetchSaved(refs) {
    const gm = await loadGoogle();
    return Promise.all(refs.map(async (r) => {
      if (detailCache.has(r.id)) return { ...detailCache.get(r.id), dist: S.origin ? km(S.origin, detailCache.get(r.id)) : null };
      try {
        const pl = new gm.Place({ id: r.id, requestedLanguage: "es" });
        await pl.fetchFields({ fields: FIELDS });
        const p = toPlace(pl, r.cat, S.origin);
        if (p) detailCache.set(r.id, p);
        return p || { id: r.id, missing: true };
      } catch (_) {
        return { id: r.id, missing: true };
      }
    }));
  }

  /* =========================================================
     E. Lupita: entender qué busca la familia
     ========================================================= */
  const KW = [
    ["fisioterapia", /fisio|terapia fisica|physio|ejercicios? (de|para) (rehabilit|recuper|fortalec)/],
    ["rehabilitacion", /rehabilit|rehab\b|terapia ocupacional|terapia de lenguaje|volver a caminar|aprender a caminar|quemad|cicatri/],
    ["laboratorios", /laborator|analisis|examen(es)? de (sangre|orina)|estudios? de (sangre|orina)|muestra de|biometria|quimica sanguinea/],
    ["farmacias", /farmac|medicinas?\b|medicamento|receta|surtir|pastilla|jarabe|gasas|vendas?\b|material de curacion|botica/],
    ["especializada", /especialista|especializad|pediatr|cardiolog|dermatolog|neurolog|psicolog|psiquiatr|nutriolog|nutricion|ortoped|traumatolog|geriatr|oftalmolog|dentista|odontolog|otorrino|audiolog|dialisis/],
    ["hospitales", /hospital|urgencia|emergencia|clinica|centro de salud|centro medico|medico|doctora?\b|revision|consulta|chequeo|curacion|herida/],
  ];
  const INTENT = /donde|encontr|busc|cerca|cercan|lugar|sitio|\bir a\b|llevar|hay (un|una|alguna?)|necesit|ocupo|recomiend|me pued/;
  const URGENTE = /urgencia|emergencia|no respira|sangra mucho|desmay|convuls/;

  function detect(text, opts) {
    const t = norm(text);
    if (!t) return null;
    if (!(opts && opts.any) && !INTENT.test(t)) return null;
    for (const [cat, re] of KW) if (re.test(t)) return { cat, label: CATS[cat].label, short: CATS[cat].short, urgente: URGENTE.test(t) };
    return null;
  }
  function reply(hit) {
    const c = CATS[hit.cat];
    return `¡Claro que te ayudo! Para eso podemos buscar **${c.short}** cerca de casa. ${c.tip}` +
      (hit.urgente ? "\n\n**Si es una emergencia, llama al 911** o ve de inmediato al hospital más cercano." : "");
  }

  /* =========================================================
     ESTADO Y PANTALLA
     ========================================================= */
  const prefs = lsGet(PREFS_KEY, {});
  const S = {
    cat: null,
    origin: null,          // { lat, lon, label } (no se guarda: es la casa de la familia)
    radius: RADIOS.includes(prefs.radius) ? prefs.radius : 5,
    filters: new Set((prefs.filters || []).filter((k) => ACCESOS.some((a) => a.k === k))),
    results: [],
    lleno: false,
    status: "idle",        // idle | loading | done | error
    error: "",
    shown: PAGE,
    tab: "buscar",
    saved: [],             // [{ id, cat, savedAt }]
    savedDetails: null,    // fichas de los guardados (pedidas a Google)
    savedStatus: "idle",
    etapa: null,
    pickEtapa: false,
    candidates: [],
    patient: null,
  };
  const savePrefs = () => lsSet(PREFS_KEY, { radius: S.radius, filters: [...S.filters] });

  let root = null, map = null, gmRef = null, info = null, overlays = [], markers = {};
  let seq = 0;
  const cache = new Map();

  function etapaActual() {
    const who = S.patient ? S.patient.codigo : "";
    const o = lsGet(ETAPA_KEY, null);
    if (o && o.who === who && ETAPAS[o.etapa]) return { key: o.etapa, fuente: "manual" };
    const d = etapaDe(S.patient);
    if (!d) return null;
    return { key: d, fuente: S.patient.etapa_recuperacion === d ? "equipo" : "proceso" };
  }

  function mount(container, opts) {
    opts = opts || {};
    S.patient = opts.patient || null;
    if (opts.cat && CATS[opts.cat] && opts.cat !== S.cat) { S.cat = opts.cat; S.results = []; S.status = "idle"; S.shown = PAGE; }
    if (opts.cat) S.tab = "buscar";
    S.etapa = etapaActual();
    S.pickEtapa = false;

    // contenedor nuevo para no acumular listeners
    root = container.cloneNode(false);
    container.replaceWith(root);
    const back = opts.back || "#/";
    root.innerHTML = `
      <a href="${esc(back)}" class="btn-back">${back === "#/" ? "← Volver" : "← Inicio"}</a>
      <h1 class="screen-title"><span data-cut="Cerca de mí" data-size="32" data-seed="7"></span></h1>
      <p class="svc-intro">Hospitales, rehabilitación, farmacias y más, cerca de donde están. Todo en un solo lugar.</p>
      <div class="seg svc-tabs" role="tablist" id="svcTabs"></div>
      <div class="svc-layout">
        <div class="svc-side" id="svcSide">
          <section class="card svc-etapa" id="svcEtapa" aria-label="Recomendaciones según la etapa de recuperación"></section>

          <form class="svc-lupita" id="svcLupita" autocomplete="off">
            <span class="face" aria-hidden="true">${window.lupiSVG ? lupiSVG(38) : ""}</span>
            <div class="svc-lupita-col">
              <label for="svcLupitaIn">Cuéntale a Lupita qué necesitan</label>
              <div class="svc-inline">
                <input id="svcLupitaIn" maxlength="200" placeholder="Ej.: un lugar para su fisioterapia" />
                <button type="submit" class="pill-slate">Ayúdame</button>
              </div>
              <p class="svc-lupita-msg" id="svcLupitaMsg" aria-live="polite"></p>
            </div>
          </form>

          <section class="block" id="svcStepCat">
            <h2 class="h-sub">1. ¿Qué necesitan?</h2>
            <div class="svc-cats" id="svcCats" role="radiogroup" aria-label="Tipo de servicio"></div>
          </section>

          <section class="block" id="svcStepLoc">
            <h2 class="h-sub">2. ¿Dónde buscamos?</h2>
            <button type="button" class="btn btn-secondary" id="svcGeo">Usar mi ubicación actual</button>
            <form class="svc-inline" id="svcAddrForm" autocomplete="off">
              <label for="svcAddr" class="sr-only">Dirección, colonia o ciudad</label>
              <input id="svcAddr" maxlength="160" placeholder="O escribe dirección, colonia o ciudad" />
              <button type="submit" class="pill-slate">Buscar</button>
            </form>
            <div class="list-col" id="svcCands"></div>
            <p class="svc-origin" id="svcOrigin" aria-live="polite"></p>
          </section>

          <section class="block">
            <h2 class="h-sub">3. ¿Qué tan lejos?</h2>
            <div class="seg" id="svcRadius" role="radiogroup" aria-label="Radio de búsqueda"></div>
          </section>

          <section class="block">
            <h2 class="h-sub">Accesibilidad</h2>
            <p class="small">Muestra solo lugares que tengan registrado que cuentan con:</p>
            <div class="chips-row" id="svcFilters"></div>
            <p class="svc-fine">Google Maps no registra si un lugar tiene elevador, por eso ese dato no aparece.</p>
          </section>
        </div>

        <div class="svc-main">
          <div class="svc-status" id="svcStatus" aria-live="polite"></div>
          <div class="svc-map" id="svcMap" role="region" aria-label="Mapa de resultados"></div>
          <div class="list-col" id="svcList"></div>
          <p class="note-dashed">Los datos de los lugares vienen de Google Maps y pueden cambiar. Llamen antes de ir para confirmar horarios y servicios. <b>En una emergencia llamen al 911.</b></p>
        </div>
      </div>`;
    if (window.Cutout) Cutout.cutAll(root);
    bind();
    drawTabs(); drawEtapa(); drawCats(); drawOrigin(); drawRadius(); drawFilters();
    initMap();
    drawResults(true);
    loadSaved();
    if (S.cat && S.origin && S.status !== "done") search();
  }

  /* ---------- dibujar partes ---------- */
  function drawTabs() {
    const n = S.saved.length;
    $("#svcTabs", root).innerHTML = `
      <button type="button" class="seg-btn ${S.tab === "buscar" ? "on" : ""}" data-tab="buscar" role="tab" aria-selected="${S.tab === "buscar"}">Buscar</button>
      <button type="button" class="seg-btn ${S.tab === "guardados" ? "on" : ""}" data-tab="guardados" role="tab" aria-selected="${S.tab === "guardados"}">Mis lugares guardados${n ? ` <span class="badge-n">${n}</span>` : ""}</button>`;
    $("#svcSide", root).hidden = S.tab !== "buscar";
    root.classList.toggle("svc-saved-mode", S.tab !== "buscar");
  }

  function drawEtapa() {
    const box = $("#svcEtapa", root);
    const e = S.etapa && ETAPAS[S.etapa.key];
    if (!e || S.pickEtapa) {
      box.innerHTML = `
        <div class="row-between"><span class="svc-k">Recomendaciones para su recuperación</span>${e ? `<button type="button" class="link-btn" data-etapa-cancel>Cancelar</button>` : ""}</div>
        <p>¿En qué momento de la recuperación están?</p>
        <div class="chips-row">${Object.entries(ETAPAS).map(([k, x]) => `<button type="button" class="filter ${S.etapa && S.etapa.key === k ? "on" : ""}" data-etapa="${k}">${x.label}</button>`).join("")}</div>
        <p class="svc-fine">Solo usamos la etapa para sugerir qué buscar. No pedimos ni guardamos datos médicos.</p>`;
      return;
    }
    const apoyos = ((S.patient && S.patient.apoyos_sugeridos) || []).filter((c) => CATS[c]);
    const sug = [];
    apoyos.forEach((c) => sug.push([c, "Lo sugiere tu equipo de salud", true]));
    e.sug.forEach(([c, why]) => { if (!sug.some((s) => s[0] === c)) sug.push([c, why, false]); });
    box.innerHTML = `
      <div class="row-between"><span class="svc-k">Para esta etapa</span><button type="button" class="link-btn" data-etapa-cambiar>Cambiar</button></div>
      <p class="svc-etapa-name"><span class="dot-pulse"></span>${esc(e.label)}</p>
      <p class="small">${esc(e.desc)}</p>
      <div class="svc-sugs">${sug.slice(0, 4).map(([c, why, team]) => `
        <button type="button" class="svc-sug ${S.cat === c ? "on" : ""} ${team ? "team" : ""}" data-cat="${c}">
          <span class="svc-glyph" aria-hidden="true">${CATS[c].glyph}</span>
          <span class="svc-sug-t"><b>${esc(CATS[c].label)}</b><small>${esc(why)}</small></span>
        </button>`).join("")}</div>
      <p class="svc-fine">${{
        proceso: "La calculamos con el avance de tu ruta en el hospital, sin usar tu diagnóstico.",
        equipo: "Tu equipo de salud registró esta etapa. No usamos tu diagnóstico.",
        manual: "Elegiste esta etapa en este dispositivo.",
      }[S.etapa.fuente]}</p>`;
  }

  function drawCats() {
    $("#svcCats", root).innerHTML = CAT_ORDER.map((k) => `
      <button type="button" class="svc-cat ${S.cat === k ? "on" : ""}" data-cat="${k}" role="radio" aria-checked="${S.cat === k}">
        <span class="svc-glyph" aria-hidden="true">${CATS[k].glyph}</span><span>${esc(CATS[k].label)}</span>
      </button>`).join("");
    $$(".svc-sug", root).forEach((b) => b.classList.toggle("on", b.dataset.cat === S.cat));
  }

  function drawOrigin() {
    $("#svcOrigin", root).innerHTML = S.origin
      ? `<span class="svc-pin-ico" aria-hidden="true"></span><span>Buscando cerca de: <b>${esc(shortLabel(S.origin.label))}</b></span>`
      : "";
    $("#svcCands", root).innerHTML = S.candidates.length
      ? `<p class="small">¿Cuál de estos lugares es?</p>` + S.candidates.map((c, i) => `<button type="button" class="svc-cand" data-cand="${i}">${esc(c.label)}</button>`).join("")
      : "";
  }

  function drawRadius() {
    $("#svcRadius", root).innerHTML = RADIOS.map((r) => `<button type="button" class="seg-btn ${S.radius === r ? "on" : ""}" data-radius="${r}" role="radio" aria-checked="${S.radius === r}">${r} km</button>`).join("");
  }

  function drawFilters() {
    $("#svcFilters", root).innerHTML = ACCESOS.map((a) => `<button type="button" class="filter acc-filter ${S.filters.has(a.k) ? "on" : ""}" data-filter="${a.k}" aria-pressed="${S.filters.has(a.k)}">${S.filters.has(a.k) ? "✓ " : ""}${esc(a.label)}</button>`).join("");
  }

  const passFilters = (p) => p.missing || [...S.filters].every((k) => (p.acc || []).some((a) => a.k === k && a.ok));

  function currentBase() {
    if (S.tab === "guardados") {
      return (S.savedDetails || []).map((p) => (p.missing ? p : { ...p, dist: S.origin ? km(S.origin, p) : null }))
        .sort((a, b) => (a.dist == null || b.dist == null ? 0 : a.dist - b.dist));
    }
    return S.status === "done" ? S.results : [];
  }

  function noKeyMsg() {
    return `<p><b>Falta configurar Google Maps.</b> Agreguen la variable <code>GOOGLE_MAPS_API_KEY</code> en Vercel (o <code>js/config.js</code> en su computadora) y activen <i>Maps JavaScript API</i> y <i>Places API (New)</i>.</p>`;
  }

  function drawResults(fit) {
    const status = $("#svcStatus", root);
    const base = currentBase();
    const list = base.filter(passFilters);
    const visible = list.slice(0, S.shown);
    let msg = "";

    if (S.tab === "guardados") {
      if (!S.saved.length) msg = `<p>Aún no guardan lugares. Toquen <b>☆ Guardar</b> en cualquier ficha para encontrarla rápido después.</p>`;
      else if (S.savedStatus === "loading") msg = `<p class="svc-loading"><span class="dots-loading"><span></span><span></span><span></span></span> Cargando sus lugares guardados…</p>`;
      else if (S.savedStatus === "error") msg = S.error === "NO_KEY" ? noKeyMsg() : `<p>No pudimos cargar sus lugares guardados. Revisen su conexión.</p><button type="button" class="btn-soft btn-sm" data-retry-saved>Intentar de nuevo</button>`;
      else msg = `<p><b>${S.saved.length}</b> ${S.saved.length === 1 ? "lugar guardado" : "lugares guardados"}${S.filters.size ? ` · ${list.length} con los filtros de accesibilidad` : ""}.</p>`;
    } else if (S.status === "loading") {
      msg = `<p class="svc-loading"><span class="dots-loading"><span></span><span></span><span></span></span> Buscando ${esc(CATS[S.cat].short)} a menos de ${S.radius} km…</p>`;
    } else if (S.status === "error") {
      msg = S.error === "NO_KEY" ? noKeyMsg()
        : `<p>No pudimos consultar Google Maps en este momento. ${esc(S.error)}</p><button type="button" class="btn-soft btn-sm" data-retry>Intentar de nuevo</button>`;
    } else if (S.status === "done") {
      const total = S.results.length;
      if (!total) {
        msg = `<p>No encontramos ${esc(CATS[S.cat].short)} a menos de ${S.radius} km.</p>${S.radius < 20 ? `<button type="button" class="btn-soft btn-sm" data-radius-up>Buscar más lejos (${RADIOS[RADIOS.indexOf(S.radius) + 1]} km)</button>` : ""}`;
      } else {
        msg = `<p>Encontramos <b>${total}</b> ${total === 1 ? "lugar" : "lugares"} de ${esc(CATS[S.cat].short)} a menos de ${S.radius} km${S.filters.size ? `. Con los filtros de accesibilidad: <b>${list.length}</b>` : ""}. Ordenados del más cercano al más lejano.</p>` +
          (S.lleno ? `<p class="svc-fine">Google entrega hasta 20 lugares por búsqueda: si quieren ver otros, elijan un radio más chico.</p>` : "");
      }
    } else {
      msg = !S.cat && !S.origin ? `<p>Elijan <b>qué necesitan</b> y <b>dónde buscar</b>, y aquí aparecerán los lugares más cercanos.</p>`
        : !S.cat ? `<p>Ahora elijan qué tipo de servicio necesitan.</p>`
        : `<p>Ahora dígannos dónde buscar: usen su ubicación o escriban su dirección.</p>`;
    }

    // ¿cuántos lugares tienen registrado cada dato de accesibilidad?
    const conDatos = base.filter((p) => !p.missing);
    if (S.filters.size && conDatos.length) {
      const notes = [...S.filters].map((k) => {
        const n = conDatos.filter((p) => (p.acc || []).some((a) => a.k === k)).length;
        const a = ACCESOS.find((x) => x.k === k);
        return `${a.label.toLowerCase()}: ${n ? `${n} de ${conDatos.length} lo tienen registrado` : "ninguno lo tiene registrado"}`;
      });
      msg += `<p class="svc-fine">Dato registrado en Google Maps · ${notes.map(esc).join(" · ")}.</p>`;
      if (!list.length) msg += `<button type="button" class="btn-soft btn-sm" data-clear-filters>Quitar filtros</button>`;
    }
    status.innerHTML = msg;

    const savedIds = new Set(S.saved.map((p) => p.id));
    $("#svcList", root).innerHTML = visible.map((p, i) => (p.missing ? missingCard(p) : card(p, i + 1, savedIds.has(p.id)))).join("") +
      (list.length > visible.length ? `<button type="button" class="btn btn-secondary" data-more>Ver más lugares (${list.length - visible.length})</button>` : "");

    drawMarkers(visible.filter((p) => !p.missing), savedIds, fit);
  }

  function rutaUrl(p) {
    const q = `&destination=${encodeURIComponent(p.name || `${p.lat},${p.lon}`)}&destination_place_id=${encodeURIComponent(p.id)}`;
    const o = S.origin ? `&origin=${S.origin.lat.toFixed(6)}%2C${S.origin.lon.toFixed(6)}` : "";
    return `https://www.google.com/maps/dir/?api=1${o}${q}`;
  }

  function card(p, n, saved) {
    const tel = (p.phone || "").replace(/[^\d+]/g, "");
    return `
      <article class="place ${saved ? "saved" : ""}" data-id="${esc(p.id)}">
        <div class="place-top">
          <button type="button" class="place-n" data-focus="${esc(p.id)}" aria-label="Ver en el mapa">${n}</button>
          <div class="place-main">
            <h3>${esc(p.name || p.tipo)}</h3>
            <span class="place-type">${esc(p.tipo)}</span>
          </div>
          ${p.dist != null ? `<span class="place-dist" title="Distancia en línea recta">${fDist(p.dist)}</span>` : ""}
        </div>
        ${p.closed ? `<p class="place-closed">Google lo marca como cerrado definitivamente.</p>` : ""}
        <p class="place-addr">${p.addr ? esc(p.addr) : `<span class="muted">Dirección no disponible</span>`}</p>
        ${p.phone ? `<p class="place-line"><span class="place-k">Teléfono</span> ${esc(p.phone)}</p>` : ""}
        ${p.hours && p.hours.length ? `<details class="place-hours"><summary><span class="place-k">Horario</span> ${esc(hoyHorario(p.hours))}</summary><ul>${p.hours.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></details>` : ""}
        ${p.acc && p.acc.length ? `<ul class="place-acc" aria-label="Accesibilidad registrada">${p.acc.map((a) => `<li class="${a.ok ? "ok" : "no"}">${a.ok ? "✓" : "✕"} ${esc(a.txt)}</li>`).join("")}</ul>` : ""}
        <div class="place-actions">
          <a class="pill-slate" href="${rutaUrl(p)}" target="_blank" rel="noopener">Cómo llegar</a>
          ${tel ? `<a class="pill-light" href="tel:${esc(tel)}">Llamar</a>` : ""}
          ${p.website ? `<a class="pill-light" href="${esc(p.website)}" target="_blank" rel="noopener">Página web</a>` : ""}
          <button type="button" class="save-btn ${saved ? "on" : ""}" data-save="${esc(p.id)}" aria-pressed="${saved}">${saved ? "★ Guardado" : "☆ Guardar"}</button>
        </div>
        ${p.gmaps ? `<a class="place-alt" href="${esc(p.gmaps)}" target="_blank" rel="noopener">Ver en Google Maps</a>` : ""}
      </article>`;
  }
  function missingCard(p) {
    return `
      <article class="place" data-id="${esc(p.id)}">
        <p>Este lugar ya no está disponible en Google Maps.</p>
        <div class="place-actions"><button type="button" class="save-btn on" data-save="${esc(p.id)}">Quitar de mis lugares</button></div>
      </article>`;
  }
  // "lunes: 8:00–20:00" → la línea de hoy
  function hoyHorario(lines) {
    const dia = norm(new Date().toLocaleDateString("es-MX", { weekday: "long" }));
    const l = lines.find((x) => norm(x).startsWith(dia));
    return l ? "Hoy " + l.replace(/^[^:]+:\s*/, "") : "Ver horario";
  }

  /* ---------- mapa (Google Maps) ---------- */
  function mostrarErrorClave() {
    const el = root && $("#svcMap", root);
    if (el) el.innerHTML = `<div class="svc-map-off">Google Maps rechazó la clave. Revisen que esté activa la facturación, que estén habilitadas <i>Maps JavaScript API</i> y <i>Places API (New)</i>, y que la clave permita este dominio.</div>`;
  }

  async function initMap() {
    const el = $("#svcMap", root);
    map = null; info = null; overlays = []; markers = {};
    try {
      const gm = await loadGoogle();
      if (!root || !root.contains(el)) return; // ya se cambió de pantalla
      if (authFailed) { mostrarErrorClave(); return; }
      gmRef = gm;
      const c = S.origin || CENTRO_INICIAL;
      map = new gm.Map(el, {
        center: { lat: c.lat, lng: c.lon },
        zoom: S.origin ? 13 : CENTRO_INICIAL.zoom,
        mapId: gm.mapId,
        streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
        clickableIcons: false, gestureHandling: "cooperative",
      });
      info = new gm.InfoWindow();
      drawResults(true);
    } catch (ex) {
      el.innerHTML = `<div class="svc-map-off">${ex.code === "NO_KEY" ? "El mapa aparecerá cuando se configure la clave de Google Maps." : "No se pudo cargar el mapa. Revisen su conexión."}</div>`;
    }
  }

  function clearOverlays() {
    overlays.forEach((o) => { if ("map" in o) o.map = null; if (o.setMap) o.setMap(null); });
    overlays = []; markers = {};
  }

  function drawMarkers(list, savedIds, fit) {
    if (!map || !gmRef) return;
    const gm = gmRef;
    clearOverlays();
    let circle = null;
    if (S.origin) {
      const me = document.createElement("div");
      me.className = "svc-me"; me.innerHTML = "<span></span>";
      overlays.push(new gm.Marker({ map, position: { lat: S.origin.lat, lng: S.origin.lon }, content: me, title: "Punto de búsqueda", zIndex: 1000 }));
      if (S.tab === "buscar") {
        circle = new gm.Circle({ map, center: { lat: S.origin.lat, lng: S.origin.lon }, radius: S.radius * 1000, strokeColor: "#007380", strokeWeight: 2, fillColor: "#21BBBB", fillOpacity: 0.07, clickable: false });
        overlays.push(circle);
      }
    }
    list.forEach((p, i) => {
      const pin = document.createElement("div");
      pin.className = "svc-pin" + (savedIds.has(p.id) ? " saved" : "");
      pin.innerHTML = `<span>${i + 1}</span>`;
      const m = new gm.Marker({ map, position: { lat: p.lat, lng: p.lon }, content: pin, title: p.name || p.tipo });
      m.addListener("click", () => {
        info.setContent(`<div class="svc-info"><b>${esc(p.name || p.tipo)}</b><br>${esc(p.tipo)}${p.dist != null ? " · " + fDist(p.dist) : ""}<br><button type="button" class="link-btn" data-goto="${esc(p.id)}">Ver ficha</button></div>`);
        info.open({ map, anchor: m });
      });
      overlays.push(m);
      markers[p.id] = m;
    });
    if (!fit) return;
    if (circle) map.fitBounds(circle.getBounds(), 10);
    else if (list.length) {
      const b = new google.maps.LatLngBounds();
      list.forEach((p) => b.extend({ lat: p.lat, lng: p.lon }));
      if (S.origin) b.extend({ lat: S.origin.lat, lng: S.origin.lon });
      map.fitBounds(b, 40);
      if (list.length === 1) map.setZoom(16);
    } else if (S.origin) { map.setCenter({ lat: S.origin.lat, lng: S.origin.lon }); map.setZoom(13); }
  }

  /* ---------- acciones ---------- */
  function setCat(c) {
    if (!CATS[c]) return;
    if (S.cat !== c) { S.cat = c; S.results = []; S.status = "idle"; S.shown = PAGE; }
    S.tab = "buscar";
    drawTabs(); drawCats();
    if (S.origin) search();
    else {
      drawResults();
      const loc = $("#svcStepLoc", root);
      if (loc && window.innerWidth < 900) loc.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setOrigin(o) {
    S.origin = o; S.candidates = []; S.results = []; S.status = "idle";
    $$(".svc-ask-loc", root).forEach((x) => x.remove());
    drawOrigin();
    if (S.cat) search();
    else drawResults(true);
  }

  async function search() {
    if (!S.cat || !S.origin) { drawResults(); return; }
    const my = ++seq;
    const key = [S.cat, S.origin.lat.toFixed(4), S.origin.lon.toFixed(4), S.radius].join("|");
    S.status = "loading"; S.shown = PAGE; S.tab = "buscar";
    drawTabs(); drawResults();
    try {
      let r = cache.get(key);
      if (!r) { r = await placesSearch(S.cat, S.origin, S.radius); cache.set(key, r); }
      if (my !== seq) return;
      S.results = r.list.map((pl) => toPlace(pl, S.cat, S.origin))
        .filter((p) => p && p.dist <= S.radius + 0.05)
        .sort((a, b) => a.dist - b.dist);
      S.lleno = r.lleno;
      S.status = "done";
    } catch (ex) {
      if (my !== seq) return;
      S.status = "error";
      S.error = ex && ex.code === "NO_KEY" ? "NO_KEY" : !navigator.onLine ? "Revisen su conexión a internet." : "Intenten de nuevo en un momento.";
      if (ex && ex.code !== "NO_KEY") console.warn("Places API:", ex);
    }
    drawResults(true);
  }

  function useLocation() {
    const btn = $("#svcGeo", root);
    if (!navigator.geolocation) { $("#svcOrigin", root).textContent = "Este dispositivo no permite compartir la ubicación. Escriban su dirección o ciudad."; return; }
    btn.disabled = true; btn.textContent = "Buscando tu ubicación…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.disabled = false; btn.textContent = "Usar mi ubicación actual";
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Tu ubicación actual" });
      },
      (err) => {
        btn.disabled = false; btn.textContent = "Usar mi ubicación actual";
        $("#svcOrigin", root).textContent = err && err.code === 1
          ? "No diste permiso para usar tu ubicación. Puedes escribir tu dirección o ciudad."
          : "No pudimos obtener tu ubicación. Escribe tu dirección o ciudad.";
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }

  async function searchAddress(q) {
    q = q.trim();
    const out = $("#svcOrigin", root);
    if (q.length < 3) { out.textContent = "Escribe un poco más: calle y colonia, o ciudad."; return; }
    out.innerHTML = `<span class="dots-loading"><span></span><span></span><span></span></span> Buscando la dirección…`;
    S.candidates = [];
    try {
      const rows = await geocode(q);
      if (!rows.length) { out.textContent = "No encontramos esa dirección. Prueba con colonia y ciudad, o solo la ciudad."; $("#svcCands", root).innerHTML = ""; return; }
      if (rows.length === 1) { setOrigin(rows[0]); return; }
      S.candidates = rows;
      out.textContent = "";
      drawOrigin();
    } catch (ex) {
      out.innerHTML = ex && ex.code === "NO_KEY" ? noKeyMsg() : "No pudimos buscar la dirección ahora. Revisa tu conexión e intenta de nuevo.";
    }
  }

  function lupita(text) {
    const msg = $("#svcLupitaMsg", root);
    const hit = detect(text, { any: true });
    if (!hit) {
      msg.innerHTML = "Mmm, no estoy segura de qué buscan. Elijan una opción de abajo o díganmelo con otras palabras, por ejemplo: <i>«una farmacia cerca»</i>.";
      return;
    }
    msg.innerHTML = (window.Lupi ? Lupi.fmt(reply(hit)) : esc(reply(hit))) + (S.origin ? "" : `<p class="svc-ask-loc">Ahora díganme <b>dónde buscar</b>.</p>`);
    setCat(hit.cat);
  }

  async function loadSaved() {
    try { S.saved = (await savedApi.list()).filter((p) => isGoogleId(p.id)); } catch (_) { S.saved = []; }
    if (!root) return;
    drawTabs();
    if (S.tab === "guardados") loadSavedDetails();
    else drawResults(false);
  }

  async function loadSavedDetails() {
    if (!S.saved.length) { S.savedDetails = []; drawResults(true); return; }
    S.savedStatus = "loading"; drawResults(false);
    try {
      S.savedDetails = await fetchSaved(S.saved);
      S.savedStatus = "done";
    } catch (ex) {
      S.savedStatus = "error"; S.error = ex && ex.code === "NO_KEY" ? "NO_KEY" : "";
    }
    if (S.tab === "guardados") drawResults(true);
  }

  async function toggleSave(id, btn) {
    const isSaved = S.saved.some((p) => p.id === id);
    btn.disabled = true;
    try {
      if (isSaved) {
        await savedApi.remove(id);
        S.saved = S.saved.filter((p) => p.id !== id);
        if (S.savedDetails) S.savedDetails = S.savedDetails.filter((p) => p.id !== id);
        toast("Quitado de tus lugares guardados");
      } else {
        const p = S.results.find((x) => x.id === id);
        if (!p) return;
        const rec = { id: p.id, cat: p.cat, savedAt: new Date().toISOString() }; // solo el ID (reglas de Google)
        await savedApi.add(rec);
        S.saved = [rec, ...S.saved.filter((x) => x.id !== id)];
        detailCache.set(p.id, p);
        if (S.savedDetails) S.savedDetails = [p, ...S.savedDetails.filter((x) => x.id !== id)];
        toast("Guardado en «Mis lugares»");
      }
    } catch (ex) {
      toast("No se pudo guardar: " + (ex.message || "intenta de nuevo"));
    } finally {
      btn.disabled = false;
    }
    drawTabs();
    drawResults(false);
  }

  function focusPlace(id) {
    const m = markers[id];
    if (m && map) {
      $("#svcMap", root).scrollIntoView({ behavior: "smooth", block: "center" });
      map.panTo(m.position);
      if (map.getZoom() < 16) map.setZoom(16);
      google.maps.event.trigger(m, "click");
    }
  }
  function gotoCard(id) {
    const el = $(`[data-id="${CSS.escape(id)}"]`, root);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  function bind() {
    root.addEventListener("click", (e) => {
      const t = e.target;
      let b;
      if ((b = t.closest("[data-tab]"))) {
        S.tab = b.dataset.tab; drawTabs();
        if (S.tab === "guardados") loadSavedDetails(); else drawResults(true);
        return;
      }
      if ((b = t.closest("[data-etapa]"))) {
        lsSet(ETAPA_KEY, { who: S.patient ? S.patient.codigo : "", etapa: b.dataset.etapa });
        S.etapa = { key: b.dataset.etapa, fuente: "manual" }; S.pickEtapa = false; drawEtapa(); return;
      }
      if (t.closest("[data-etapa-cambiar]")) { S.pickEtapa = true; drawEtapa(); return; }
      if (t.closest("[data-etapa-cancel]")) { S.pickEtapa = false; drawEtapa(); return; }
      if ((b = t.closest("[data-cat]"))) { setCat(b.dataset.cat); return; }
      if ((b = t.closest("[data-radius]"))) {
        S.radius = +b.dataset.radius; savePrefs(); drawRadius();
        if (S.cat && S.origin) search(); else drawResults(true);
        return;
      }
      if (t.closest("[data-radius-up]")) {
        S.radius = RADIOS[Math.min(RADIOS.length - 1, RADIOS.indexOf(S.radius) + 1)]; savePrefs(); drawRadius(); search(); return;
      }
      if ((b = t.closest("[data-filter]"))) {
        const k = b.dataset.filter;
        S.filters.has(k) ? S.filters.delete(k) : S.filters.add(k);
        S.shown = PAGE; savePrefs(); drawFilters(); drawResults(false); return;
      }
      if (t.closest("[data-clear-filters]")) { S.filters.clear(); savePrefs(); drawFilters(); drawResults(false); return; }
      if ((b = t.closest("[data-cand]"))) { setOrigin(S.candidates[+b.dataset.cand]); return; }
      if (t.closest("#svcGeo")) { useLocation(); return; }
      if (t.closest("[data-retry]")) { cache.clear(); search(); return; }
      if (t.closest("[data-retry-saved]")) { loadSavedDetails(); return; }
      if (t.closest("[data-more]")) { S.shown += PAGE; drawResults(false); return; }
      if ((b = t.closest("[data-save]"))) { toggleSave(b.dataset.save, b); return; }
      if ((b = t.closest("[data-focus]"))) { focusPlace(b.dataset.focus); return; }
      if ((b = t.closest("[data-goto]"))) { if (info) info.close(); gotoCard(b.dataset.goto); return; }
    });
    $("#svcAddrForm", root).addEventListener("submit", (e) => { e.preventDefault(); searchAddress($("#svcAddr", root).value); });
    $("#svcLupita", root).addEventListener("submit", (e) => { e.preventDefault(); const v = $("#svcLupitaIn", root).value; if (v.trim()) lupita(v); });
  }

  window.Servicios = { mount, detect, reply, etapaDe, ETAPAS, CATS, CAT_ORDER };
})();
