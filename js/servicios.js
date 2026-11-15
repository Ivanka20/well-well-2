/* =========================================================
   well well · Cerca de mí
   Ayuda a pacientes y familiares a encontrar servicios
   después del alta: hospitales, rehabilitación, fisioterapia,
   farmacias, laboratorios y atención especializada.

   Datos:  OpenStreetMap
           - Overpass API  → establecimientos reales cercanos
           - Nominatim     → convertir una dirección en coordenadas
   Mapa:   Leaflet + mosaicos de OpenStreetMap

   Uso:    Servicios.mount(contenedor, { patient, cat, back })
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

  /* ---------- servicios externos (OpenStreetMap) ---------- */
  // Si un servidor de Overpass está saturado se intenta con el siguiente
  const OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];
  const NOMINATIM = "https://nominatim.openstreetmap.org/search";
  const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const CENTRO_INICIAL = { lat: 23.6345, lon: -102.5528, zoom: 4 }; // México

  const RADIOS = [1, 5, 10, 20];
  const PAGE = 20;
  const PREFS_KEY = "ww-svc-prefs";
  const ETAPA_KEY = "ww-svc-etapa";
  const LOCAL_SAVED_KEY = "ww-lugares-v1";

  /* =========================================================
     A. CATEGORÍAS · cada una se traduce a etiquetas de OSM
     (los filtros con "name" buscan por nombre porque muchos
     lugares no tienen la etiqueta exacta)
     ========================================================= */
  const CATS = {
    hospitales: {
      label: "Hospitales y centros médicos", short: "hospitales y centros médicos", glyph: "✚",
      tip: "Sirven para revisiones médicas o si algo no se ve bien.",
      q: ['["amenity"="hospital"]', '["healthcare"="hospital"]', '["amenity"="clinic"]', '["healthcare"="clinic"]', '["healthcare"="centre"]', '["amenity"="doctors"]', '["healthcare"="doctor"]'],
    },
    rehabilitacion: {
      label: "Clínicas de rehabilitación", short: "clínicas de rehabilitación", glyph: "↻",
      tip: "Ahí pueden continuar las sesiones para recuperar fuerza y movimiento.",
      q: ['["healthcare"="rehabilitation"]', '["healthcare:speciality"~"rehabilitation|physical_medicine"]', '["name"~"rehabilit",i]'],
    },
    fisioterapia: {
      label: "Fisioterapia", short: "centros de fisioterapia", glyph: "≈",
      tip: "Ahí guían los ejercicios para mover el cuerpo sin lastimarse.",
      q: ['["healthcare"="physiotherapist"]', '["healthcare:speciality"~"physiotherapy"]', '["name"~"fisioter|physio",i]'],
    },
    farmacias: {
      label: "Farmacias", short: "farmacias", glyph: "℞",
      tip: "Para surtir recetas y comprar material de curación.",
      q: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]'],
    },
    laboratorios: {
      label: "Laboratorios médicos", short: "laboratorios médicos", glyph: "◉",
      tip: "Para los estudios de sangre u orina que pida su médico.",
      q: ['["healthcare"="laboratory"]', '["healthcare"="sample_collection"]', '["name"~"laboratorio cl[ií]nico|laboratorios? m[eé]dicos?|an[aá]lisis cl[ií]nicos|laboratorio de an[aá]lisis",i]'],
    },
    especializada: {
      label: "Atención especializada", short: "centros de atención especializada", glyph: "★",
      tip: "Especialistas y terapias como la ocupacional o de lenguaje.",
      q: ['["healthcare"~"^(occupational_therapist|speech_therapist|psychotherapist|audiologist|optometrist|podiatrist|dialysis|counselling)$"]', '["healthcare:speciality"]["healthcare:speciality"!~"^(general|general_practice|family_medicine)$"]'],
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
     B. Filtro de accesibilidad: SOLO lo que está registrado
     ========================================================= */
  const ACCESOS = [
    { k: "entrada", label: "Entrada para silla de ruedas" },
    { k: "estacionamiento", label: "Estacionamiento accesible" },
    { k: "elevador", label: "Elevador" },
    { k: "banos", label: "Baños adaptados" },
  ];
  const first = (t, keys) => { for (const k of keys) if (t[k] != null && t[k] !== "") return t[k]; return null; };
  function siNo(v) {
    if (v == null) return null;
    v = norm(v).trim();
    if (/^(yes|designated|true|si)$/.test(v) || /^[1-9]\d*$/.test(v)) return "si";
    if (v === "limited") return "limitado";
    if (/^(no|false|0)$/.test(v)) return "no";
    return null; // valor desconocido: no lo mostramos
  }
  function accesibilidad(t) {
    const out = [];
    const ent = siNo(t.wheelchair);
    if (ent) out.push({ k: "entrada", ok: ent === "si", txt: ent === "si" ? "Entrada accesible para silla de ruedas" : ent === "limitado" ? "Entrada con accesibilidad limitada" : "Entrada sin acceso para silla de ruedas" });
    const capRaw = first(t, ["capacity:disabled", "parking:disabled", "disabled_parking"]);
    const est = siNo(capRaw);
    if (est) out.push({ k: "estacionamiento", ok: est === "si", txt: est === "si" ? "Estacionamiento accesible" + (/^\d+$/.test(capRaw) ? ` (${capRaw} ${capRaw === "1" ? "lugar" : "lugares"})` : "") : est === "limitado" ? "Estacionamiento accesible limitado" : "Sin estacionamiento accesible" });
    const ele = siNo(first(t, ["elevator", "building:elevator", "lift"]));
    if (ele) out.push({ k: "elevador", ok: ele === "si", txt: ele === "si" ? "Tiene elevador" : ele === "limitado" ? "Elevador con acceso limitado" : "Sin elevador" });
    const ban = siNo(first(t, ["toilets:wheelchair", "toilets:disability"]));
    if (ban) out.push({ k: "banos", ok: ban === "si", txt: ban === "si" ? "Baños adaptados" : ban === "limitado" ? "Baños con adaptación limitada" : "Sin baños adaptados" });
    return out;
  }

  /* =========================================================
     C. Fichas: convertir datos de OSM a algo legible
     ========================================================= */
  const ESPECIALIDAD = {
    paediatrics: "Pediatría", pediatrics: "Pediatría", orthopaedics: "Ortopedia", orthopedics: "Ortopedia", cardiology: "Cardiología",
    dermatology: "Dermatología", neurology: "Neurología", ophthalmology: "Oftalmología", gynaecology: "Ginecología", obstetrics: "Obstetricia",
    physiotherapy: "Fisioterapia", rehabilitation: "Rehabilitación", physical_medicine: "Medicina física", psychiatry: "Psiquiatría",
    psychology: "Psicología", geriatrics: "Geriatría", trauma: "Traumatología", traumatology: "Traumatología", plastic_surgery: "Cirugía plástica",
    dentistry: "Odontología", internal: "Medicina interna", oncology: "Oncología", nephrology: "Nefrología", otolaryngology: "Otorrinolaringología",
    urology: "Urología", general: "Medicina general", surgery: "Cirugía", radiology: "Radiología", endocrinology: "Endocrinología",
    gastroenterology: "Gastroenterología", pulmonology: "Neumología", nutrition: "Nutrición", speech_therapy: "Terapia de lenguaje",
    occupational_therapy: "Terapia ocupacional", allergology: "Alergología", rheumatology: "Reumatología", vascular_surgery: "Cirugía vascular",
  };
  const espLabel = (v) => String(v || "").split(";").map((x) => ESPECIALIDAD[x.trim()] || x.trim().replace(/_/g, " ")).filter(Boolean).slice(0, 2).join(", ");

  function tipoDe(t, cat) {
    const h = t.healthcare, a = t.amenity, sp = t["healthcare:speciality"];
    if (a === "hospital" || h === "hospital") return "Hospital";
    if (a === "pharmacy" || h === "pharmacy") return "Farmacia";
    if (h === "physiotherapist") return "Fisioterapia";
    if (h === "rehabilitation") return "Rehabilitación";
    if (h === "laboratory" || h === "sample_collection") return "Laboratorio";
    const extra = { occupational_therapist: "Terapia ocupacional", speech_therapist: "Terapia de lenguaje", psychotherapist: "Psicoterapia", audiologist: "Audiología", optometrist: "Optometría", podiatrist: "Podología", dialysis: "Diálisis", counselling: "Orientación psicológica" };
    if (extra[h]) return extra[h];
    if (a === "clinic" || h === "clinic" || h === "centre") return sp ? "Clínica · " + espLabel(sp) : "Clínica o centro de salud";
    if (a === "doctors" || h === "doctor") return sp ? "Consultorio · " + espLabel(sp) : "Consultorio médico";
    if (sp) return espLabel(sp);
    return { rehabilitacion: "Rehabilitación", fisioterapia: "Fisioterapia", laboratorios: "Laboratorio", farmacias: "Farmacia", hospitales: "Centro médico", especializada: "Atención especializada" }[cat] || "Servicio de salud";
  }

  function direccion(t) {
    if (t["addr:full"]) return t["addr:full"];
    const calle = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    return [calle, first(t, ["addr:suburb", "addr:neighbourhood", "addr:quarter"]), first(t, ["addr:city", "addr:municipality", "addr:district"]), t["addr:postcode"] ? "C.P. " + t["addr:postcode"] : ""]
      .filter(Boolean).join(", ");
  }
  function telefono(t) {
    const v = first(t, ["phone", "contact:phone", "contact:mobile", "phone:mobile"]);
    return v ? String(v).split(/[;,]/)[0].trim() : "";
  }
  function web(t) {
    let v = first(t, ["website", "contact:website", "url"]);
    if (!v) return "";
    v = String(v).split(";")[0].trim();
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch (_) { return ""; }
  }
  function horario(v) {
    if (!v) return "";
    if (/^24\/7$/.test(v.trim())) return "Abierto las 24 horas";
    const D = { Mo: "Lu", Tu: "Ma", We: "Mi", Th: "Ju", Fr: "Vi", Sa: "Sá", Su: "Do", PH: "Festivos" };
    return v.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (m) => D[m]).replace(/\boff\b/g, "cerrado").replace(/;\s*/g, " · ");
  }

  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const fDist = (d) => (d == null ? "" : d < 1 ? `${Math.max(10, Math.round((d * 1000) / 10) * 10)} m` : `${d.toFixed(d < 10 ? 1 : 0)} km`);

  function toPlace(el, cat, origin) {
    const t = el.tags || {};
    const lat = el.lat != null ? el.lat : el.center && el.center.lat;
    const lon = el.lon != null ? el.lon : el.center && el.center.lon;
    if (lat == null || lon == null) return null;
    return {
      id: el.type + "/" + el.id,
      name: t["name:es"] || t.name || t.brand || t.operator || "",
      tipo: tipoDe(t, cat),
      cat, lat, lon,
      addr: direccion(t),
      phone: telefono(t),
      website: web(t),
      hours: horario(t.opening_hours),
      acc: accesibilidad(t),
      accNote: t["wheelchair:description:es"] || t["wheelchair:description"] || "",
      dist: origin ? km(origin, { lat, lon }) : null,
    };
  }

  // Un mismo lugar puede venir como punto y como edificio: nos quedamos con uno
  function dedupe(list) {
    const seen = new Map(), out = [];
    list.sort((a, b) => a.dist - b.dist).forEach((p) => {
      const key = norm(p.name);
      if (key) {
        const prev = seen.get(key) || [];
        if (prev.some((q) => km(q, p) < 0.15)) return;
        prev.push(p); seen.set(key, prev);
      }
      out.push(p);
    });
    return out;
  }

  /* ---------- consultas ---------- */
  function buildQuery(cat, o, radiusKm) {
    const around = `(around:${Math.round(radiusKm * 1000)},${o.lat.toFixed(5)},${o.lon.toFixed(5)})`;
    const parts = CATS[cat].q.map((sel) => `  ${sel.startsWith('["name"') ? "nw" : "nwr"}${sel}${around};`).join("\n");
    return `[out:json][timeout:25];\n(\n${parts}\n);\nout center tags;`;
  }

  // Prueba cada servidor; si todos están ocupados, espera un poco y hace una segunda ronda
  async function overpass(query, onTry) {
    let lastErr = null;
    const t0 = Date.now();
    for (let ronda = 0; ronda < 2; ronda++) {
      if (ronda) {
        if (Date.now() - t0 > 30000) break; // ya esperamos bastante
        await new Promise((r) => setTimeout(r, 4000));
      }
      for (let i = 0; i < OVERPASS.length; i++) {
        if (onTry && (ronda || i)) onTry(ronda * OVERPASS.length + i);
        try { return await overpassOnce(OVERPASS[i], query); } catch (ex) { lastErr = ex; }
      }
    }
    throw lastErr || new Error("Sin respuesta");
  }

  async function overpassOnce(url, query) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 28000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.remark && /error|timed out/i.test(data.remark) && !(data.elements || []).length) throw new Error(data.remark);
      return data.elements || [];
    } finally {
      clearTimeout(timer);
    }
  }

  // Nominatim pide máximo 1 consulta por segundo
  let lastGeo = 0;
  async function geocode(q) {
    const wait = 1100 - (Date.now() - lastGeo);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastGeo = Date.now();
    const url = `${NOMINATIM}?format=jsonv2&limit=5&addressdetails=0&accept-language=es&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = await res.json();
    return rows.map((r) => ({ lat: +r.lat, lon: +r.lon, label: r.display_name }));
  }
  const shortLabel = (s) => String(s || "").split(",").slice(0, 3).join(",").trim();

  /* =========================================================
     D. Mis lugares guardados (Store con Supabase; si no, navegador)
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
  const slim = (p) => ({ id: p.id, name: p.name, tipo: p.tipo, cat: p.cat, lat: p.lat, lon: p.lon, addr: p.addr, phone: p.phone, website: p.website, hours: p.hours, acc: p.acc, accNote: p.accNote, savedAt: new Date().toISOString() });

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
    status: "idle",        // idle | loading | done | error
    error: "",
    shown: PAGE,
    tab: "buscar",
    saved: [],
    etapa: null,           // { key, fuente: "proceso" | "manual" }
    pickEtapa: false,
    candidates: [],
    patient: null,
  };
  const savePrefs = () => lsSet(PREFS_KEY, { radius: S.radius, filters: [...S.filters] });

  let root = null, map = null, markersLayer = null, originLayer = null, markers = {};
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
          </section>
        </div>

        <div class="svc-main">
          <div class="svc-status" id="svcStatus" aria-live="polite"></div>
          <div class="svc-map" id="svcMap" role="region" aria-label="Mapa de resultados"></div>
          <div class="list-col" id="svcList"></div>
          <p class="note-dashed">Los datos vienen de <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>, un mapa que hace la comunidad, y pueden estar incompletos. Llamen antes de ir para confirmar horarios y servicios. <b>En una emergencia llamen al 911.</b></p>
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

  const passFilters = (p) => [...S.filters].every((k) => (p.acc || []).some((a) => a.k === k && a.ok));

  function currentBase() {
    if (S.tab === "guardados") {
      return S.saved.map((p) => ({ ...p, dist: S.origin ? km(S.origin, p) : null }))
        .sort((a, b) => (a.dist == null || b.dist == null ? 0 : a.dist - b.dist));
    }
    return S.status === "done" ? S.results : [];
  }

  function drawResults(fit) {
    const status = $("#svcStatus", root);
    const base = currentBase();
    const list = base.filter(passFilters);
    const visible = list.slice(0, S.shown);
    let msg = "";

    if (S.tab === "guardados") {
      msg = S.saved.length
        ? `<p><b>${S.saved.length}</b> ${S.saved.length === 1 ? "lugar guardado" : "lugares guardados"}${S.filters.size ? ` · ${list.length} con los filtros de accesibilidad` : ""}.</p>`
        : `<p>Aún no guardan lugares. Toca <b>☆ Guardar</b> en cualquier ficha para encontrarla rápido después.</p>`;
    } else if (S.status === "loading") {
      msg = `<p class="svc-loading"><span class="dots-loading"><span></span><span></span><span></span></span> Buscando ${esc(CATS[S.cat].short)} a menos de ${S.radius} km…</p>`;
    } else if (S.status === "error") {
      msg = `<p>No pudimos consultar el mapa en este momento. ${esc(S.error)}</p><button type="button" class="btn-soft btn-sm" data-retry>Intentar de nuevo</button>`;
    } else if (S.status === "done") {
      const total = S.results.length;
      if (!total) {
        msg = `<p>No encontramos ${esc(CATS[S.cat].short)} registrados a menos de ${S.radius} km.</p>${S.radius < 20 ? `<button type="button" class="btn-soft btn-sm" data-radius-up>Buscar más lejos (${RADIOS[RADIOS.indexOf(S.radius) + 1]} km)</button>` : ""}`;
      } else {
        msg = `<p>Encontramos <b>${total}</b> ${total === 1 ? "lugar" : "lugares"} de ${esc(CATS[S.cat].short)} a menos de ${S.radius} km${S.filters.size ? `. Con los filtros de accesibilidad: <b>${list.length}</b>` : ""}. Ordenados del más cercano al más lejano.</p>`;
      }
    } else {
      msg = !S.cat && !S.origin ? `<p>Elijan <b>qué necesitan</b> y <b>dónde buscar</b>, y aquí aparecerán los lugares más cercanos.</p>`
        : !S.cat ? `<p>Ahora elijan qué tipo de servicio necesitan.</p>`
        : `<p>Ahora dígannos dónde buscar: usen su ubicación o escriban su dirección.</p>`;
    }

    // ¿cuántos lugares tienen registrado cada dato de accesibilidad?
    if (S.filters.size && base.length) {
      const notes = [...S.filters].map((k) => {
        const n = base.filter((p) => (p.acc || []).some((a) => a.k === k)).length;
        const a = ACCESOS.find((x) => x.k === k);
        return `${a.label.toLowerCase()}: ${n ? `${n} de ${base.length} lo tienen registrado` : "ninguno lo tiene registrado"}`;
      });
      msg += `<p class="svc-fine">Dato registrado en el mapa · ${notes.map(esc).join(" · ")}.</p>`;
      if (!list.length) msg += `<button type="button" class="btn-soft btn-sm" data-clear-filters>Quitar filtros</button>`;
    }
    status.innerHTML = msg;

    const savedIds = new Set(S.saved.map((p) => p.id));
    $("#svcList", root).innerHTML = visible.map((p, i) => card(p, i + 1, savedIds.has(p.id))).join("") +
      (list.length > visible.length ? `<button type="button" class="btn btn-secondary" data-more>Ver más lugares (${list.length - visible.length})</button>` : "");

    drawMarkers(visible, savedIds, fit);
  }

  function rutaUrl(p) {
    const to = `${p.lat.toFixed(5)}%2C${p.lon.toFixed(5)}`;
    return S.origin
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${S.origin.lat.toFixed(5)}%2C${S.origin.lon.toFixed(5)}%3B${to}`
      : `https://www.openstreetmap.org/directions?to=${to}`;
  }

  function card(p, n, saved) {
    const tel = (p.phone || "").replace(/[^\d+]/g, "");
    return `
      <article class="place ${saved ? "saved" : ""}" id="pl-${esc(p.id.replace("/", "-"))}" data-id="${esc(p.id)}">
        <div class="place-top">
          <button type="button" class="place-n" data-focus="${esc(p.id)}" aria-label="Ver en el mapa">${n}</button>
          <div class="place-main">
            <h3>${p.name ? esc(p.name) : `${esc(p.tipo)} <small>(sin nombre registrado)</small>`}</h3>
            <span class="place-type">${esc(p.tipo)}</span>
          </div>
          ${p.dist != null ? `<span class="place-dist" title="Distancia en línea recta">${fDist(p.dist)}</span>` : ""}
        </div>
        <p class="place-addr">${p.addr ? esc(p.addr) : `<span class="muted">Dirección no registrada en el mapa</span>`}</p>
        ${p.hours ? `<p class="place-line"><span class="place-k">Horario</span> ${esc(p.hours)}</p>` : ""}
        ${p.phone ? `<p class="place-line"><span class="place-k">Teléfono</span> ${esc(p.phone)}</p>` : ""}
        ${p.acc && p.acc.length ? `<ul class="place-acc" aria-label="Accesibilidad registrada">${p.acc.map((a) => { const lim = !a.ok && /limitad/.test(a.txt); return `<li class="${a.ok ? "ok" : lim ? "lim" : "no"}">${a.ok ? "✓" : lim ? "◐" : "✕"} ${esc(a.txt)}</li>`; }).join("")}</ul>` : ""}
        ${p.accNote ? `<p class="svc-fine">Nota de accesibilidad: ${esc(p.accNote)}</p>` : ""}
        <div class="place-actions">
          <a class="pill-slate" href="${rutaUrl(p)}" target="_blank" rel="noopener">Cómo llegar</a>
          ${tel ? `<a class="pill-light" href="tel:${esc(tel)}">Llamar</a>` : ""}
          ${p.website ? `<a class="pill-light" href="${esc(p.website)}" target="_blank" rel="noopener">Página web</a>` : ""}
          <button type="button" class="save-btn ${saved ? "on" : ""}" data-save="${esc(p.id)}" aria-pressed="${saved}">${saved ? "★ Guardado" : "☆ Guardar"}</button>
        </div>
        <a class="place-alt" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)}%2C${p.lon.toFixed(6)}" target="_blank" rel="noopener">Abrir en Google Maps</a>
      </article>`;
  }

  /* ---------- mapa (Leaflet) ---------- */
  function initMap() {
    const el = $("#svcMap", root);
    if (map) { map.remove(); map = null; }
    markers = {};
    if (!window.L) { el.innerHTML = `<div class="svc-map-off">No se pudo cargar el mapa. La lista de lugares sigue funcionando.</div>`; return; }
    const c = S.origin || CENTRO_INICIAL;
    map = L.map(el, { scrollWheelZoom: false, tap: true }).setView([c.lat, c.lon], S.origin ? 13 : CENTRO_INICIAL.zoom);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    originLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    setTimeout(() => map && map.invalidateSize(), 120);
  }

  function drawMarkers(list, savedIds, fit) {
    if (!map) return;
    markersLayer.clearLayers(); originLayer.clearLayers(); markers = {};
    let circle = null;
    if (S.origin) {
      L.marker([S.origin.lat, S.origin.lon], { icon: L.divIcon({ className: "svc-me", html: "<span></span>", iconSize: [24, 24], iconAnchor: [12, 12] }), title: "Punto de búsqueda", keyboard: false, zIndexOffset: 1000 }).addTo(originLayer);
      if (S.tab === "buscar") circle = L.circle([S.origin.lat, S.origin.lon], { radius: S.radius * 1000, color: "#007380", weight: 2, dashArray: "6 6", fillColor: "#21BBBB", fillOpacity: 0.07, interactive: false }).addTo(originLayer);
    }
    list.forEach((p, i) => {
      const m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: "svc-pin" + (savedIds.has(p.id) ? " saved" : ""), html: `<span>${i + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] }),
        title: p.name || p.tipo, riseOnHover: true,
      });
      m.bindPopup(`<b>${esc(p.name || p.tipo)}</b><br>${esc(p.tipo)}${p.dist != null ? " · " + fDist(p.dist) : ""}<br><button type="button" class="link-btn" data-goto="${esc(p.id)}">Ver ficha</button>`);
      m.addTo(markersLayer);
      markers[p.id] = m;
    });
    if (!fit) return;
    if (circle) map.fitBounds(circle.getBounds(), { padding: [10, 10] });
    else if (list.length) {
      const b = L.latLngBounds(list.map((p) => [p.lat, p.lon]));
      if (S.origin) b.extend([S.origin.lat, S.origin.lon]);
      map.fitBounds(b, { padding: [30, 30], maxZoom: 16 });
    } else if (S.origin) map.setView([S.origin.lat, S.origin.lon], 13);
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
      let els = cache.get(key);
      if (!els) {
        els = await overpass(buildQuery(S.cat, S.origin, S.radius), () => {
          if (my !== seq) return;
          const st = $(".svc-loading", root);
          if (st) st.lastChild.textContent = " El mapa está muy ocupado, probando con otro servidor…";
        });
        cache.set(key, els);
      }
      if (my !== seq) return;
      S.results = dedupe(els.map((e) => toPlace(e, S.cat, S.origin)).filter((p) => p && p.dist <= S.radius + 0.05));
      S.status = "done";
    } catch (ex) {
      if (my !== seq) return;
      S.status = "error";
      S.error = !navigator.onLine ? "Revisen su conexión a internet."
        : "Los servidores de OpenStreetMap están muy ocupados o tardaron demasiado. Intenten en un minuto o con un radio más chico.";
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
    if (q.length < 3) { $("#svcOrigin", root).textContent = "Escribe un poco más: calle y colonia, o ciudad."; return; }
    const out = $("#svcOrigin", root);
    out.innerHTML = `<span class="dots-loading"><span></span><span></span><span></span></span> Buscando la dirección…`;
    S.candidates = [];
    try {
      const rows = await geocode(q);
      if (!rows.length) { out.textContent = "No encontramos esa dirección. Prueba con colonia y ciudad, o solo la ciudad."; $("#svcCands", root).innerHTML = ""; return; }
      if (rows.length === 1) { setOrigin(rows[0]); return; }
      S.candidates = rows;
      out.textContent = "";
      drawOrigin();
    } catch (_) {
      out.textContent = "No pudimos buscar la dirección ahora. Revisa tu conexión e intenta de nuevo.";
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
    try { S.saved = await savedApi.list(); } catch (_) { S.saved = []; }
    if (!root) return;
    drawTabs();
    drawResults(S.tab === "guardados");
  }

  async function toggleSave(id, btn) {
    const isSaved = S.saved.some((p) => p.id === id);
    btn.disabled = true;
    try {
      if (isSaved) {
        await savedApi.remove(id);
        S.saved = S.saved.filter((p) => p.id !== id);
        toast("Quitado de tus lugares guardados");
      } else {
        const p = S.results.find((x) => x.id === id);
        if (!p) return;
        const rec = slim(p);
        await savedApi.add(rec);
        S.saved = [rec, ...S.saved.filter((x) => x.id !== id)];
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
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 16));
      m.openPopup();
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
      if ((b = t.closest("[data-tab]"))) { S.tab = b.dataset.tab; drawTabs(); drawResults(true); if (S.tab === "guardados") loadSaved(); return; }
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
      if (t.closest("[data-more]")) { S.shown += PAGE; drawResults(false); return; }
      if ((b = t.closest("[data-save]"))) { toggleSave(b.dataset.save, b); return; }
      if ((b = t.closest("[data-focus]"))) { focusPlace(b.dataset.focus); return; }
      if ((b = t.closest("[data-goto]"))) { if (map) map.closePopup(); gotoCard(b.dataset.goto); return; }
    });
    $("#svcAddrForm", root).addEventListener("submit", (e) => { e.preventDefault(); searchAddress($("#svcAddr", root).value); });
    $("#svcLupita", root).addEventListener("submit", (e) => { e.preventDefault(); const v = $("#svcLupitaIn", root).value; if (v.trim()) lupita(v); });
  }

  window.Servicios = { mount, detect, reply, etapaDe, ETAPAS, CATS, CAT_ORDER, buildQuery };
})();
