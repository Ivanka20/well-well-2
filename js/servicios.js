/* =========================================================
   well well · Cerca de mí
   Ayuda a pacientes y familiares a encontrar servicios
   después del alta: hospitales, rehabilitación, fisioterapia,
   farmacias, laboratorios y atención especializada.

   Sin claves: la familia escribe qué busca, dice dónde, y la
   app devuelve la lista con nombre y dirección, un mapa con
   los lugares y la ruta desde su punto de partida.

   Datos: OpenStreetMap (gratis, sin registro)
     - Overpass API → establecimientos reales cercanos
     - Nominatim    → dirección escrita → coordenadas;
                      coordenadas → dirección (cuando el lugar
                      no tiene su dirección registrada); y
                      respaldo de búsqueda si Overpass está saturado
     - OSRM (routing.openstreetmap.de) → ruta en auto o a pie
   Mapa: Leaflet + mosaicos de OpenStreetMap

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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- servicios de OpenStreetMap ---------- */
  // Si un servidor de Overpass está saturado se intenta con el siguiente
  // Si los dos están saturados, se usa Nominatim como respaldo (ver nominatimSearch)
  const OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];
  const OVERPASS_TIMEOUT = 10000;
  const NOMINATIM = "https://nominatim.openstreetmap.org";
  const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const CENTRO_INICIAL = { lat: 23.6345, lon: -102.5528, zoom: 4 }; // México
  // Rutas (OSRM). El de FOSSGIS es el que usa openstreetmap.org; el segundo es respaldo para auto.
  const ROUTERS = {
    auto: ["https://routing.openstreetmap.de/routed-car/route/v1/driving/", "https://router.project-osrm.org/route/v1/driving/"],
    pie: ["https://routing.openstreetmap.de/routed-foot/route/v1/foot/"],
  };

  const RADIOS = [1, 5, 10, 20];
  const PAGE = 20;
  const PREFS_KEY = "ww-svc-prefs";
  const ETAPA_KEY = "ww-svc-etapa";
  const DIR_KEY = "ww-svc-direcciones";
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
     B. Accesibilidad: SOLO lo que está registrado en OSM
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
    const add = (k, v, si, lim, no) => { const x = siNo(v); if (x) out.push({ k, ok: x === "si", lim: x === "limitado", txt: x === "si" ? si : x === "limitado" ? lim : no }); };
    add("entrada", t.wheelchair, "Entrada accesible para silla de ruedas", "Entrada con accesibilidad limitada", "Entrada sin acceso para silla de ruedas");
    add("estacionamiento", first(t, ["capacity:disabled", "parking:disabled", "disabled_parking"]), "Estacionamiento accesible", "Estacionamiento accesible limitado", "Sin estacionamiento accesible");
    add("elevador", first(t, ["elevator", "building:elevator", "lift"]), "Tiene elevador", "Elevador con acceso limitado", "Sin elevador");
    add("banos", first(t, ["toilets:wheelchair", "toilets:disability"]), "Baños adaptados", "Baños con adaptación limitada", "Sin baños adaptados");
    return out;
  }

  /* =========================================================
     C. Resultados: nombre y dirección
     ========================================================= */
  const ESPECIALIDAD = {
    paediatrics: "Pediatría", pediatrics: "Pediatría", orthopaedics: "Ortopedia", orthopedics: "Ortopedia", cardiology: "Cardiología",
    dermatology: "Dermatología", neurology: "Neurología", ophthalmology: "Oftalmología", gynaecology: "Ginecología", obstetrics: "Obstetricia",
    physiotherapy: "Fisioterapia", rehabilitation: "Rehabilitación", physical_medicine: "Medicina física", psychiatry: "Psiquiatría",
    psychology: "Psicología", geriatrics: "Geriatría", trauma: "Traumatología", traumatology: "Traumatología", plastic_surgery: "Cirugía plástica",
    dentistry: "Odontología", internal: "Medicina interna", oncology: "Oncología", nephrology: "Nefrología", otolaryngology: "Otorrinolaringología",
    urology: "Urología", general: "Medicina general", surgery: "Cirugía", radiology: "Radiología", endocrinology: "Endocrinología",
    gastroenterology: "Gastroenterología", pulmonology: "Neumología", nutrition: "Nutrición", speech_therapy: "Terapia de lenguaje",
    occupational_therapy: "Terapia ocupacional", allergology: "Alergología", rheumatology: "Reumatología",
  };
  const espLabel = (v) => String(v || "").split(";").map((x) => ESPECIALIDAD[x.trim()] || x.trim().replace(/_/g, " ")).filter(Boolean).slice(0, 2).join(", ");

  function tipoDe(t, cat) {
    const h = t.healthcare, a = t.amenity, sp = t["healthcare:speciality"];
    if (a === "hospital" || h === "hospital") return "Hospital";
    if (a === "pharmacy" || h === "pharmacy") return "Farmacia";
    if (h === "physiotherapist") return "Fisioterapia";
    if (h === "rehabilitation") return "Rehabilitación";
    if (h === "laboratory" || h === "sample_collection") return "Laboratorio";
    const extra = { occupational_therapist: "Terapia ocupacional", speech_therapist: "Terapia de lenguaje", psychotherapist: "Psicoterapia", audiologist: "Audiología", optometrist: "Optometría", podiatrist: "Podología", dialysis: "Diálisis", counselling: "Orientación psicológica", dentist: "Dentista" };
    if (extra[h]) return extra[h];
    if (a === "dentist") return "Dentista";
    if (a === "clinic" || h === "clinic" || h === "centre") return sp ? "Clínica · " + espLabel(sp) : "Clínica o centro de salud";
    if (a === "doctors" || h === "doctor") return sp ? "Consultorio · " + espLabel(sp) : "Consultorio médico";
    if (sp) return espLabel(sp);
    return { rehabilitacion: "Rehabilitación", fisioterapia: "Fisioterapia", laboratorios: "Laboratorio", farmacias: "Farmacia", hospitales: "Centro médico", especializada: "Atención especializada" }[cat] || "Lugar";
  }

  function direccion(t) {
    if (t["addr:full"]) return t["addr:full"];
    const calle = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    if (!calle && !t["addr:suburb"] && !t["addr:neighbourhood"]) return "";
    return [calle, first(t, ["addr:suburb", "addr:neighbourhood", "addr:quarter"]), first(t, ["addr:city", "addr:municipality", "addr:district"]), t["addr:postcode"] ? "C.P. " + t["addr:postcode"] : ""]
      .filter(Boolean).join(", ");
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
    const addr = direccion(t);
    return {
      id: el.type + "/" + el.id,
      name: t["name:es"] || t.name || t.brand || t.operator || "",
      tipo: tipoDe(t, cat),
      cat, lat, lon,
      addr,
      addrAprox: false,
      acc: accesibilidad(t),
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

  /* ---------- consultas a Overpass ---------- */
  // Texto libre → expresión que ignora acentos ("teleton" encuentra "Teletón")
  function textoARegex(s) {
    const MAP = { a: "[aá]", e: "[eé]", i: "[ií]", o: "[oó]", u: "[uúü]", n: "[nñ]" };
    return norm(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40)
      .split("").map((c) => MAP[c] || c).join("");
  }

  function buildQuery(query, o, radiusKm) {
    const around = `(around:${Math.round(radiusKm * 1000)},${o.lat.toFixed(5)},${o.lon.toFixed(5)})`;
    let parts;
    if (query.cat) {
      parts = CATS[query.cat].q.map((sel) => `  ${sel.startsWith('["name"') ? "nw" : "nwr"}${sel}${around};`);
    } else {
      parts = [`  nw["name"~"${textoARegex(query.text)}",i][!"highway"]${around};`];
    }
    return `[out:json][timeout:25];\n(\n${parts.join("\n")}\n);\nout center tags;`;
  }

  async function overpassOnce(url, q) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OVERPASS_TIMEOUT);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
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

  // Prueba cada servidor de Overpass una vez (máx. ~10 s cada uno)
  async function overpass(q, onTry) {
    let lastErr = null;
    for (let i = 0; i < OVERPASS.length; i++) {
      if (onTry && i) onTry("El servidor está muy ocupado, probando con otro…");
      try { return await overpassOnce(OVERPASS[i], q); } catch (ex) { lastErr = ex; }
    }
    throw lastErr || new Error("Sin respuesta");
  }

  /* ---------- Respaldo: Nominatim (también OpenStreetMap, sin clave) ----------
     Entiende etiquetas exactas como "[healthcare=physiotherapist]" y devuelve
     nombre y dirección completa. Máximo 40 resultados por consulta. */
  const NOM_TERMS = {
    farmacias: ["[amenity=pharmacy]"],
    hospitales: ["[amenity=hospital]", "[amenity=clinic]", "[amenity=doctors]"],
    rehabilitacion: ["[healthcare=rehabilitation]", "rehabilitación"],
    fisioterapia: ["[healthcare=physiotherapist]", "fisioterapia"],
    laboratorios: ["[healthcare=laboratory]", "laboratorio clínico"],
    especializada: ["[healthcare=occupational_therapist]", "[healthcare=speech_therapist]", "especialidades médicas"],
  };
  const NOM_OK_CLASS = /^(amenity|healthcare|office|shop|craft)$/;
  const NOM_BAD_TYPE = /^(university|college|school|research|research_institute|bus_stop|veterinary|parking)$/;

  function boundsOf(o, radiusKm) {
    const dLat = radiusKm / 111.32;
    const dLon = radiusKm / (111.32 * Math.cos((o.lat * Math.PI) / 180));
    return { north: o.lat + dLat, south: o.lat - dLat, east: o.lon + dLon, west: o.lon - dLon };
  }

  function dirNominatim(a) {
    a = a || {};
    const calle = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(" ");
    return [calle, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village || a.borough || a.municipality, a.postcode ? "C.P. " + a.postcode : ""]
      .filter(Boolean).join(", ");
  }

  async function nominatimSearch(query, o, radiusKm) {
    const b = boundsOf(o, radiusKm);
    const vb = `${b.west.toFixed(5)},${b.north.toFixed(5)},${b.east.toFixed(5)},${b.south.toFixed(5)}`;
    const terms = query.cat ? NOM_TERMS[query.cat] : [query.text];
    const out = [];
    let respondio = false;
    for (const term of terms) {
      try {
        const rows = await nominatim(`/search?format=jsonv2&limit=40&bounded=1&addressdetails=1&extratags=1&accept-language=es&viewbox=${vb}&q=${encodeURIComponent(term)}`);
        respondio = true;
        rows.forEach((r) => {
          const cls = r.category || r.class;
          if (!NOM_OK_CLASS.test(cls || "") || NOM_BAD_TYPE.test(r.type || "")) return;
          const lat = +r.lat, lon = +r.lon;
          const tags = { ...(r.extratags || {}), [cls]: r.type };
          out.push({
            id: `${r.osm_type}/${r.osm_id}`,
            name: r.name || "",
            tipo: tipoDe(tags, query.cat),
            cat: query.cat || null, lat, lon,
            addr: dirNominatim(r.address),
            addrAprox: false,
            acc: accesibilidad(tags),
            dist: km(o, { lat, lon }),
          });
        });
      } catch (_) { /* seguimos con el siguiente término */ }
    }
    if (!respondio) throw new Error("Nominatim no respondió");
    return out;
  }

  /* ---------- Nominatim (máximo 1 consulta por segundo) ---------- */
  let lastNom = 0;
  async function nominatim(path) {
    const wait = 1100 - (Date.now() - lastNom);
    if (wait > 0) await sleep(wait);
    lastNom = Date.now();
    const res = await fetch(`${NOMINATIM}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }
  async function geocode(q) {
    const rows = await nominatim(`/search?format=jsonv2&limit=5&accept-language=es&q=${encodeURIComponent(q)}`);
    return rows.map((r) => ({ lat: +r.lat, lon: +r.lon, label: r.display_name }));
  }
  const shortLabel = (s) => String(s || "").split(",").slice(0, 3).join(",").trim();

  // Dirección aproximada para lugares que no la tienen registrada
  const dirCache = lsGet(DIR_KEY, {});
  async function reverse(p) {
    const k = p.lat.toFixed(5) + "," + p.lon.toFixed(5);
    if (dirCache[k] != null) return dirCache[k];
    const r = await nominatim(`/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat=${p.lat}&lon=${p.lon}`);
    const a = (r && r.address) || {};
    const calle = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(" ");
    const txt = [calle, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village || a.borough || a.municipality, a.postcode ? "C.P. " + a.postcode : ""]
      .filter(Boolean).join(", ");
    dirCache[k] = txt;
    const keys = Object.keys(dirCache);
    if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((x) => delete dirCache[x]);
    lsSet(DIR_KEY, dirCache);
    return txt;
  }

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
  const slim = (p) => ({ id: p.id, name: p.name, tipo: p.tipo, cat: p.cat, lat: p.lat, lon: p.lon, addr: p.addr, addrAprox: p.addrAprox, acc: p.acc, savedAt: new Date().toISOString() });

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
    query: null,           // { cat } o { text } · lo que buscan
    origin: null,          // { lat, lon, label } (no se guarda: es la casa de la familia)
    radius: RADIOS.includes(prefs.radius) ? prefs.radius : 5,
    filters: new Set(),    // los filtros de accesibilidad empiezan apagados en cada visita
    results: [],
    status: "idle",        // idle | loading | done | error
    error: "",
    shown: PAGE,
    tab: "buscar",
    saved: [],
    etapa: null,
    pickEtapa: false,
    candidates: [],
    patient: null,
  };
  const savePrefs = () => lsSet(PREFS_KEY, { radius: S.radius });
  const queryLabel = (q) => (q ? (q.cat ? CATS[q.cat].short : `«${q.text}»`) : "");

  let root = null;
  let seq = 0;        // búsquedas
  let dirSeq = 0;     // relleno de direcciones
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
    if (opts.cat && CATS[opts.cat] && !(S.query && S.query.cat === opts.cat)) { S.query = { cat: opts.cat }; S.results = []; S.status = "idle"; S.shown = PAGE; }
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
      <p class="svc-intro">Escriban qué necesitan y dónde están: les damos el nombre y la dirección de los lugares más cercanos.</p>
      <div class="seg svc-tabs" role="tablist" id="svcTabs"></div>
      <div class="svc-layout">
        <div class="svc-side" id="svcSide">
          <form class="card svc-ask" id="svcAskForm" autocomplete="off">
            <div class="svc-ask-head">
              <span class="face" aria-hidden="true">${window.lupiSVG ? lupiSVG(38) : ""}</span>
              <label for="svcQ" class="h-sub">1. ¿Qué buscan?</label>
            </div>
            <div class="svc-inline">
              <input id="svcQ" maxlength="120" placeholder="Ej.: fisioterapia para mi hijo, farmacia…" />
              <button type="submit" class="pill-slate">Listo</button>
            </div>
            <p class="svc-understood" id="svcUnderstood" aria-live="polite"></p>
            <div class="chips-row" id="svcCats" aria-label="Ideas de búsqueda"></div>
          </form>

          <section class="block" id="svcStepLoc">
            <h2 class="h-sub">2. ¿Dónde están?</h2>
            <button type="button" class="btn btn-secondary" id="svcGeo">Usar mi ubicación actual</button>
            <form class="svc-inline" id="svcAddrForm" autocomplete="off">
              <label for="svcAddr" class="sr-only">Dirección, colonia o ciudad</label>
              <input id="svcAddr" maxlength="160" placeholder="O escriban dirección, colonia o ciudad" />
              <button type="submit" class="pill-slate">Usar</button>
            </form>
            <div class="list-col" id="svcCands"></div>
            <p class="svc-origin" id="svcOrigin" aria-live="polite"></p>
          </section>

          <section class="block">
            <h2 class="h-sub">3. ¿Qué tan lejos?</h2>
            <div class="seg" id="svcRadius" role="radiogroup" aria-label="Radio de búsqueda"></div>
          </section>

          <details class="svc-more" id="svcAccBox" ${S.filters.size ? "open" : ""}>
            <summary>Accesibilidad (opcional)</summary>
            <p class="small">Muestra solo lugares que tengan registrado que cuentan con:</p>
            <div class="chips-row" id="svcFilters"></div>
          </details>

          <section class="card svc-etapa" id="svcEtapa" aria-label="Sugerencias según la etapa de recuperación"></section>
        </div>

        <div class="svc-main">
          <div class="svc-status" id="svcStatus" aria-live="polite"></div>
          <section class="svc-route" id="svcRoute" aria-live="polite" hidden></section>
          <div class="svc-map" id="svcMap" role="region" aria-label="Mapa con los lugares encontrados"></div>
          <ol class="svc-results" id="svcList"></ol>
          <div id="svcMore"></div>
          <p class="note-dashed">Los datos vienen de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, un mapa que hace la comunidad, y pueden estar incompletos. Llamen antes de ir para confirmar horarios y servicios. <b>En una emergencia llamen al 911.</b></p>
        </div>
      </div>`;
    if (window.Cutout) Cutout.cutAll(root);
    bind();
    drawTabs(); drawAsk(); drawEtapa(); drawOrigin(); drawRadius(); drawFilters();
    initMap();
    drawResults(true);
    drawRoute();
    loadSaved();
    if (S.query && S.origin && S.status !== "done") search();
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

  function drawAsk(msgHtml) {
    $("#svcCats", root).innerHTML = CAT_ORDER.map((k) => `<button type="button" class="filter ${S.query && S.query.cat === k ? "on" : ""}" data-cat="${k}">${esc(CATS[k].label)}</button>`).join("");
    const u = $("#svcUnderstood", root);
    if (msgHtml != null) u.innerHTML = msgHtml;
    else u.innerHTML = S.query ? `Buscaremos: <b>${esc(queryLabel(S.query))}</b>` : "";
    $$(".svc-sug", root).forEach((b) => b.classList.toggle("on", !!(S.query && b.dataset.cat === S.query.cat)));
  }

  function drawEtapa() {
    const box = $("#svcEtapa", root);
    const e = S.etapa && ETAPAS[S.etapa.key];
    if (!e || S.pickEtapa) {
      box.innerHTML = `
        <div class="row-between"><span class="svc-k">Ideas para su recuperación</span>${e ? `<button type="button" class="link-btn" data-etapa-cancel>Cancelar</button>` : ""}</div>
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
        <button type="button" class="svc-sug ${S.query && S.query.cat === c ? "on" : ""} ${team ? "team" : ""}" data-cat="${c}">
          <span class="svc-glyph" aria-hidden="true">${CATS[c].glyph}</span>
          <span class="svc-sug-t"><b>${esc(CATS[c].label)}</b><small>${esc(why)}</small></span>
        </button>`).join("")}</div>
      <p class="svc-fine">${{
        proceso: "La calculamos con el avance de tu ruta en el hospital, sin usar tu diagnóstico.",
        equipo: "Tu equipo de salud registró esta etapa. No usamos tu diagnóstico.",
        manual: "Elegiste esta etapa en este dispositivo.",
      }[S.etapa.fuente]}</p>`;
  }

  function drawOrigin() {
    $("#svcOrigin", root).innerHTML = S.origin
      ? `<span class="svc-pin-ico" aria-hidden="true"></span><span>Cerca de: <b>${esc(shortLabel(S.origin.label))}</b></span>`
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
    const filtrados = base.filter(passFilters);
    // Si los filtros dejan 0, igual mostramos todos los lugares (nunca una lista vacía sin nombres)
    const sinCoincidencias = S.filters.size > 0 && base.length > 0 && filtrados.length === 0;
    const list = sinCoincidencias ? base : filtrados;
    const visible = list.slice(0, S.shown);
    let msg = "";

    if (S.tab === "guardados") {
      msg = S.saved.length
        ? `<p><b>${S.saved.length}</b> ${S.saved.length === 1 ? "lugar guardado" : "lugares guardados"}${S.filters.size ? ` · ${list.length} con los filtros de accesibilidad` : ""}.</p>`
        : `<p>Aún no guardan lugares. Toquen <b>☆ Guardar</b> en cualquier resultado para encontrarlo rápido después.</p>`;
    } else if (S.status === "loading") {
      msg = `<p class="svc-loading"><span class="dots-loading"><span></span><span></span><span></span></span> Buscando ${esc(queryLabel(S.query))} a menos de ${S.radius} km…</p>`;
    } else if (S.status === "error") {
      msg = `<p>No pudimos consultar el mapa en este momento. ${esc(S.error)}</p><button type="button" class="btn-soft btn-sm" data-retry>Intentar de nuevo</button>`;
    } else if (S.status === "done") {
      const total = S.results.length;
      if (!total) {
        msg = `<p>No encontramos ${esc(queryLabel(S.query))} a menos de ${S.radius} km.</p>` +
          (S.radius < 20 ? `<button type="button" class="btn-soft btn-sm" data-radius-up>Buscar más lejos (${RADIOS[RADIOS.indexOf(S.radius) + 1]} km)</button>` : "") +
          (S.query.cat ? "" : `<p class="svc-fine">Prueben con otras palabras o elijan una de las ideas de búsqueda.</p>`);
      } else {
        msg = `<p><b>${total}</b> ${total === 1 ? "lugar" : "lugares"} de ${esc(queryLabel(S.query))} a menos de ${S.radius} km${S.filters.size && !sinCoincidencias ? `. Con los filtros de accesibilidad: <b>${filtrados.length}</b>` : ""}. Del más cercano al más lejano.</p>`;
      }
    } else {
      msg = !S.query && !S.origin ? `<p>Escriban <b>qué buscan</b> y <b>dónde están</b>, y aquí aparecerá la lista de lugares.</p>`
        : !S.query ? `<p>Ahora escriban qué buscan.</p>`
        : `<p>Ahora dígannos dónde están: usen su ubicación o escriban su dirección.</p>`;
    }

    // ¿cuántos lugares tienen registrado cada dato de accesibilidad?
    if (S.filters.size && base.length) {
      const notes = [...S.filters].map((k) => {
        const n = base.filter((p) => (p.acc || []).some((a) => a.k === k)).length;
        const a = ACCESOS.find((x) => x.k === k);
        return `${a.label.toLowerCase()}: ${n ? `${n} de ${base.length} lo tienen registrado` : "ninguno lo tiene registrado"}`;
      });
      msg += `<p class="svc-fine">Dato registrado · ${notes.map(esc).join(" · ")}.</p>`;
      if (sinCoincidencias) msg += `<p class="svc-nofilter">Ningún lugar tiene registrado ese dato de accesibilidad, así que les mostramos <b>todos</b> los lugares encontrados. Llamen para preguntar.</p><button type="button" class="btn-soft btn-sm" data-clear-filters>Quitar filtros</button>`;
    }
    status.innerHTML = msg;

    const savedIds = new Set(S.saved.map((p) => p.id));
    $("#svcList", root).innerHTML = visible.map((p, i) => row(p, i + 1, savedIds.has(p.id))).join("");
    $("#svcMore", root).innerHTML = list.length > visible.length ? `<button type="button" class="btn btn-secondary" data-more>Ver más lugares (${list.length - visible.length})</button>` : "";
    S.visible = visible;
    drawMarkers(visible, savedIds, fit);
    fillAddresses(visible);
  }

  function rutaUrl(p) {
    const o = S.origin ? `&origin=${S.origin.lat.toFixed(6)}%2C${S.origin.lon.toFixed(6)}` : "";
    return `https://www.google.com/maps/dir/?api=1${o}&destination=${p.lat.toFixed(6)}%2C${p.lon.toFixed(6)}`;
  }

  function addrHtml(p) {
    if (p.addr) return `${esc(p.addr)}${p.addrAprox ? ` <span class="svc-fine">(aprox.)</span>` : ""}`;
    if (p.addrPending) return `<span class="muted">Buscando la dirección…</span>`;
    return `<span class="muted">Dirección no registrada</span>`;
  }

  function row(p, n, saved) {
    const enRuta = S.route && S.route.id === p.id;
    return `
      <li class="place ${saved ? "saved" : ""} ${enRuta ? "routed" : ""}" data-id="${esc(p.id)}">
        <div class="place-top">
          <button type="button" class="place-n" data-focus="${esc(p.id)}" aria-label="Ver en el mapa">${n}</button>
          <div class="place-main">
            <h3>${p.name ? esc(p.name) : `${esc(p.tipo)} <small>(sin nombre registrado)</small>`}</h3>
            <p class="place-addr" data-addr-for="${esc(p.id)}">${addrHtml(p)}</p>
          </div>
          ${p.dist != null ? `<span class="place-dist" title="Distancia en línea recta">${fDist(p.dist)}</span>` : ""}
        </div>
        <span class="place-type">${esc(p.tipo)}</span>
        ${p.acc && p.acc.length ? `<ul class="place-acc" aria-label="Accesibilidad registrada">${p.acc.map((a) => `<li class="${a.ok ? "ok" : a.lim ? "lim" : "no"}">${a.ok ? "✓" : a.lim ? "◐" : "✕"} ${esc(a.txt)}</li>`).join("")}</ul>` : ""}
        <div class="place-actions">
          <button type="button" class="pill-slate" data-route="${esc(p.id)}">${enRuta ? "Ruta en el mapa ✓" : "Cómo llegar"}</button>
          <button type="button" class="save-btn ${saved ? "on" : ""}" data-save="${esc(p.id)}" aria-pressed="${saved}">${saved ? "★ Guardado" : "☆ Guardar"}</button>
        </div>
      </li>`;
  }

  /* =========================================================
     MAPA (Leaflet) Y RUTAS (OSRM)
     ========================================================= */
  let map = null, markersLayer = null, originLayer = null, routeLayer = null, markers = {};

  function initMap() {
    const el = $("#svcMap", root);
    if (map) { map.remove(); map = null; }
    markers = {};
    if (!window.L) { el.innerHTML = `<div class="svc-map-off">No se pudo cargar el mapa. La lista de lugares sigue funcionando.</div>`; return; }
    const c = S.origin || CENTRO_INICIAL;
    map = L.map(el, { scrollWheelZoom: false }).setView([c.lat, c.lon], S.origin ? 13 : CENTRO_INICIAL.zoom);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    originLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    setTimeout(() => map && map.invalidateSize(), 120);
  }

  function drawMarkers(list, savedIds, fit) {
    if (!map) return;
    markersLayer.clearLayers(); originLayer.clearLayers(); markers = {};
    let circle = null;
    if (S.origin) {
      L.marker([S.origin.lat, S.origin.lon], {
        icon: L.divIcon({ className: "svc-me", html: "<span></span>", iconSize: [24, 24], iconAnchor: [12, 12] }),
        title: "Punto de partida", keyboard: false, zIndexOffset: 1000,
      }).bindTooltip("Punto de partida").addTo(originLayer);
      if (S.tab === "buscar") circle = L.circle([S.origin.lat, S.origin.lon], { radius: S.radius * 1000, color: "#007380", weight: 2, dashArray: "6 6", fillColor: "#A9C9D5", fillOpacity: 0.06, interactive: false }).addTo(originLayer);
    }
    list.forEach((p, i) => {
      const enRuta = S.route && S.route.id === p.id;
      const m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: "svc-pin" + (savedIds.has(p.id) ? " saved" : "") + (enRuta ? " routed" : ""), html: `<span>${i + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] }),
        title: p.name || p.tipo, riseOnHover: true, zIndexOffset: enRuta ? 900 : 0,
      });
      m.bindPopup(() => `<div class="svc-info"><b>${esc(p.name || p.tipo)}</b><br>${esc(p.addr || p.tipo)}${p.dist != null ? "<br>" + fDist(p.dist) : ""}<br>
        <button type="button" class="link-btn" data-route="${esc(p.id)}">Cómo llegar</button> · <button type="button" class="link-btn" data-goto="${esc(p.id)}">Ver en la lista</button></div>`);
      m.addTo(markersLayer);
      markers[p.id] = m;
    });
    if (!fit || (S.route && S.route.data)) return; // si hay ruta, el mapa se queda enfocado en ella
    map.invalidateSize(); // por si el mapa cambió de tamaño (pantalla girada, ventana)
    if (circle) map.fitBounds(circle.getBounds(), { padding: [10, 10] });
    else if (list.length) {
      const b = L.latLngBounds(list.map((p) => [p.lat, p.lon]));
      if (S.origin) b.extend([S.origin.lat, S.origin.lon]);
      map.fitBounds(b, { padding: [30, 30], maxZoom: 16 });
    } else if (S.origin) map.setView([S.origin.lat, S.origin.lon], 13);
  }

  /* ---------- rutas ---------- */
  const fDur = (s) => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + " min" : ""}`.trim(); };
  const GIRO = { left: "a la izquierda", right: "a la derecha", "slight left": "ligeramente a la izquierda", "slight right": "ligeramente a la derecha", "sharp left": "bien cerrado a la izquierda", "sharp right": "bien cerrado a la derecha", straight: "derecho", uturn: "en U" };

  // Convierte un paso de OSRM en una instrucción en español sencillo
  function instruccion(s) {
    const m = s.maneuver || {}, g = GIRO[m.modifier] || "", calle = s.name || "";
    switch (m.type) {
      case "depart": return calle ? `Sal por ${calle}` : "Empieza el camino";
      case "arrive": return "Llegas a tu destino";
      case "roundabout": case "rotary": case "roundabout turn":
        return `En la glorieta, toma la ${m.exit ? m.exit + "ª " : ""}salida${calle ? " hacia " + calle : ""}`;
      case "merge": case "on ramp": return `Incorpórate${calle ? " a " + calle : ""}`;
      case "off ramp": return `Toma la salida${g ? " " + g : ""}${calle ? " hacia " + calle : ""}`;
      case "turn": case "end of road": case "fork":
        if (m.modifier === "straight") return `Sigue derecho${calle ? " por " + calle : ""}`;
        if (m.modifier === "uturn") return `Da vuelta en U${calle ? " en " + calle : ""}`;
        return `Gira ${g}${calle ? " en " + calle : ""}`;
      default: return `Continúa${g && m.modifier !== "straight" ? " " + g : ""}${calle ? " por " + calle : ""}`;
    }
  }

  async function fetchRoute(o, p, modo) {
    let lastErr = null;
    for (const base of ROUTERS[modo]) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const url = `${base}${o.lon.toFixed(6)},${o.lat.toFixed(6)};${p.lon.toFixed(6)},${p.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const j = await res.json();
        if (j.code !== "Ok" || !j.routes || !j.routes.length) throw new Error(j.code || "Sin ruta");
        const r = j.routes[0];
        return {
          distance: r.distance, duration: r.duration,
          line: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          steps: (r.legs || []).flatMap((l) => l.steps || []).filter((s) => s.distance > 0 || (s.maneuver && s.maneuver.type === "arrive")),
        };
      } catch (ex) {
        lastErr = ex;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr || new Error("Sin ruta");
  }

  let routeSeq = 0;
  async function showRoute(id, modo) {
    const p = (S.visible || []).find((x) => x.id === id) || S.results.find((x) => x.id === id) || S.saved.find((x) => x.id === id);
    if (!p) return;
    modo = modo || (S.route && S.route.modo) || "auto";
    if (!S.origin) {
      S.route = { id, modo, place: p, status: "sin-origen" };
      drawRoute(); scrollToMap();
      return;
    }
    const my = ++routeSeq;
    S.route = { id, modo, place: p, status: "loading" };
    drawRoute(); refreshRows(); scrollToMap();
    if (map && markers[id]) markers[id].closePopup();
    try {
      const data = await fetchRoute(S.origin, p, modo);
      if (my !== routeSeq) return;
      S.route = { id, modo, place: p, status: "done", data };
    } catch (_) {
      if (my !== routeSeq) return;
      S.route = { id, modo, place: p, status: "error" };
    }
    drawRoute(); refreshRows();
  }

  function clearRoute() {
    routeSeq++;
    S.route = null;
    if (routeLayer) routeLayer.clearLayers();
    drawRoute();
  }

  // vuelve a dibujar fichas y marcadores para marcar el destino de la ruta
  function refreshRows() {
    drawResults(false);
  }

  function scrollToMap() {
    const el = $("#svcRoute", root);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function drawRoute() {
    const box = $("#svcRoute", root);
    if (!box) return;
    if (routeLayer) routeLayer.clearLayers();
    const r = S.route;
    if (!r) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    const nombre = esc(r.place.name || r.place.tipo);
    const modos = `<div class="seg svc-modo" role="radiogroup" aria-label="Cómo van a ir">
        <button type="button" class="seg-btn ${r.modo === "auto" ? "on" : ""}" data-modo="auto" role="radio" aria-checked="${r.modo === "auto"}">En auto</button>
        <button type="button" class="seg-btn ${r.modo === "pie" ? "on" : ""}" data-modo="pie" role="radio" aria-checked="${r.modo === "pie"}">A pie</button>
      </div>`;
    const head = `<div class="row-between"><span class="svc-k">Cómo llegar</span><button type="button" class="link-btn" data-route-close>Cerrar ruta</button></div>
      <p class="svc-route-to">A <b>${nombre}</b>${r.place.addr ? `<br><span class="small">${esc(r.place.addr)}</span>` : ""}</p>`;
    const externo = `<a class="place-alt" href="${rutaUrl(r.place)}" target="_blank" rel="noopener">Abrir la ruta en Google Maps</a>`;

    if (r.status === "sin-origen") {
      box.innerHTML = head + `<p>Para trazar la ruta, primero digan <b>de dónde salen</b>: usen su ubicación o escriban su dirección (paso 2).</p>${externo}`;
      return;
    }
    if (r.status === "loading") {
      box.innerHTML = head + modos + `<p class="svc-loading"><span class="dots-loading"><span></span><span></span><span></span></span> Calculando la ruta…</p>`;
      return;
    }
    if (r.status === "error") {
      box.innerHTML = head + modos + `<p>No pudimos calcular la ruta en este momento.</p><button type="button" class="btn-soft btn-sm" data-route="${esc(r.id)}">Intentar de nuevo</button> ${externo}`;
      return;
    }
    const d = r.data;
    box.innerHTML = head + modos + `
      <p class="svc-route-sum"><b>${fDur(d.duration)}</b> · ${fDist(d.distance / 1000)} ${r.modo === "auto" ? "en auto" : "a pie"} <span class="svc-fine">(tiempo aproximado, sin tráfico)</span></p>
      <details class="svc-steps"><summary>Ver indicaciones paso a paso (${d.steps.length})</summary>
        <ol>${d.steps.map((s) => `<li>${esc(instruccion(s))}${s.distance > 0 ? ` <span class="svc-fine">· ${fDist(s.distance / 1000)}</span>` : ""}</li>`).join("")}</ol>
      </details>
      ${externo}`;
    if (map) {
      L.polyline(d.line, { color: "#FFFFFF", weight: 9, opacity: 0.9, interactive: false }).addTo(routeLayer);
      const line = L.polyline(d.line, { color: "#FF644F", weight: 5, opacity: 0.95, interactive: false }).addTo(routeLayer);
      map.invalidateSize();
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    }
  }

  // Completa, uno por uno, las direcciones que no están registradas
  async function fillAddresses(list) {
    const my = ++dirSeq;
    const faltan = list.filter((p) => !p.addr && !p.addrTried);
    faltan.forEach((p) => { p.addrPending = true; });
    faltan.forEach((p) => { const el = root && $(`[data-addr-for="${CSS.escape(p.id)}"]`, root); if (el) el.innerHTML = addrHtml(p); });
    for (const p of faltan) {
      if (my !== dirSeq || !root) return;
      try {
        const txt = await reverse(p);
        if (txt) { p.addr = txt; p.addrAprox = true; }
      } catch (_) { /* sin dirección */ }
      p.addrPending = false; p.addrTried = true;
      const el = root && $(`[data-addr-for="${CSS.escape(p.id)}"]`, root);
      if (el) el.innerHTML = addrHtml(p);
    }
  }

  /* ---------- acciones ---------- */
  function setQuery(q, msgHtml) {
    const same = S.query && q && S.query.cat === q.cat && S.query.text === q.text;
    S.query = q;
    if (!same) { S.results = []; S.status = "idle"; S.shown = PAGE; }
    S.tab = "buscar";
    drawTabs(); drawAsk(msgHtml);
    if (S.origin) search();
    else {
      drawResults();
      const loc = $("#svcStepLoc", root);
      if (loc && window.innerWidth < 900) loc.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function askText(text) {
    text = text.trim();
    if (!text) return;
    const hit = detect(text, { any: true });
    if (hit) {
      setQuery({ cat: hit.cat }, `Lupita entendió: <b>${esc(hit.short)}</b>` +
        (hit.urgente ? `<br><b>Si es una emergencia, llamen al 911.</b>` : ""));
    } else if (textoARegex(text).length >= 3) {
      setQuery({ text: text.slice(0, 40) }, `Buscaremos lugares con el nombre <b>«${esc(text.slice(0, 40))}»</b>.`);
    } else {
      drawAsk("Escriban un poco más, por ejemplo: <i>«farmacia»</i> o <i>«fisioterapia»</i>.");
    }
  }

  function setOrigin(o) {
    const pendiente = S.route && S.route.status === "sin-origen" ? S.route : null;
    S.origin = o; S.candidates = []; S.results = []; S.status = "idle";
    clearRoute();
    drawOrigin();
    if (S.query) search();
    else drawResults(true);
    if (pendiente) showRoute(pendiente.id, pendiente.modo); // ruta que esperaba el punto de partida
  }

  async function search() {
    if (!S.query || !S.origin) { drawResults(); return; }
    const my = ++seq;
    dirSeq++; // detiene el relleno de direcciones anterior
    const qKey = S.query.cat ? "c:" + S.query.cat : "t:" + norm(S.query.text);
    const key = [qKey, S.origin.lat.toFixed(4), S.origin.lon.toFixed(4), S.radius].join("|");
    S.status = "loading"; S.shown = PAGE; S.tab = "buscar";
    if (S.route && S.route.status !== "sin-origen") clearRoute();
    drawTabs(); drawResults();
    const aviso = (txt) => {
      if (my !== seq) return;
      const st = $(".svc-loading", root);
      if (st) st.lastChild.textContent = " " + txt;
    };
    try {
      let list = cache.get(key);
      if (!list) {
        try {
          const els = await overpass(buildQuery(S.query, S.origin, S.radius), aviso);
          list = els.map((e) => toPlace(e, S.query.cat, S.origin));
        } catch (_) {
          if (my !== seq) return;
          aviso("Overpass está saturado; buscando con Nominatim…");
          list = await nominatimSearch(S.query, S.origin, S.radius);
        }
        cache.set(key, list);
      }
      if (my !== seq) return;
      S.results = dedupe(list.filter((p) => p && p.dist <= S.radius + 0.05).map((p) => ({ ...p })));
      S.status = "done";
    } catch (ex) {
      if (my !== seq) return;
      S.status = "error";
      S.error = !navigator.onLine ? "Revisen su conexión a internet."
        : "Los servidores de OpenStreetMap están muy ocupados. Intenten de nuevo en un minuto.";
    }
    drawResults(true);
    if (S.status === "done" && window.innerWidth < 900) $("#svcStatus", root).scrollIntoView({ behavior: "smooth", block: "start" });
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
    } catch (_) {
      out.textContent = "No pudimos buscar la dirección ahora. Revisa tu conexión e intenta de nuevo.";
    }
  }

  async function loadSaved() {
    try { S.saved = (await savedApi.list()).filter((p) => p && p.name != null && p.lat != null); } catch (_) { S.saved = []; }
    if (!root) return;
    drawTabs();
    drawResults();
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
    drawResults();
  }

  function focusPlace(id) {
    const m = markers[id];
    if (!m || !map) return;
    $("#svcMap", root).scrollIntoView({ behavior: "smooth", block: "center" });
    map.setView(m.getLatLng(), Math.max(map.getZoom(), 16));
    m.openPopup();
  }
  function gotoCard(id) {
    const el = $(`.place[data-id="${CSS.escape(id)}"]`, root);
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
      if ((b = t.closest("[data-cat]"))) {
        $("#svcQ", root).value = CATS[b.dataset.cat].label;
        setQuery({ cat: b.dataset.cat });
        return;
      }
      if ((b = t.closest("[data-radius]"))) {
        S.radius = +b.dataset.radius; savePrefs(); drawRadius();
        if (S.query && S.origin) search(); else drawResults();
        return;
      }
      if (t.closest("[data-radius-up]")) {
        S.radius = RADIOS[Math.min(RADIOS.length - 1, RADIOS.indexOf(S.radius) + 1)]; savePrefs(); drawRadius(); search(); return;
      }
      if ((b = t.closest("[data-filter]"))) {
        const k = b.dataset.filter;
        S.filters.has(k) ? S.filters.delete(k) : S.filters.add(k);
        S.shown = PAGE; savePrefs(); drawFilters(); drawResults(); return;
      }
      if (t.closest("[data-clear-filters]")) { S.filters.clear(); savePrefs(); drawFilters(); drawResults(); return; }
      if ((b = t.closest("[data-cand]"))) { setOrigin(S.candidates[+b.dataset.cand]); return; }
      if (t.closest("#svcGeo")) { useLocation(); return; }
      if (t.closest("[data-retry]")) { cache.clear(); search(); return; }
      if (t.closest("[data-more]")) { S.shown += PAGE; drawResults(); return; }
      if ((b = t.closest("[data-save]"))) { toggleSave(b.dataset.save, b); return; }
      if ((b = t.closest("[data-route]"))) { showRoute(b.dataset.route); return; }
      if ((b = t.closest("[data-modo]"))) { if (S.route && S.route.modo !== b.dataset.modo) showRoute(S.route.id, b.dataset.modo); return; }
      if (t.closest("[data-route-close]")) { clearRoute(); refreshRows(); return; }
      if ((b = t.closest("[data-focus]"))) { focusPlace(b.dataset.focus); return; }
      if ((b = t.closest("[data-goto]"))) { if (map) map.closePopup(); gotoCard(b.dataset.goto); return; }
    });
    $("#svcAskForm", root).addEventListener("submit", (e) => { e.preventDefault(); askText($("#svcQ", root).value); });
    $("#svcAddrForm", root).addEventListener("submit", (e) => { e.preventDefault(); searchAddress($("#svcAddr", root).value); });
  }

  window.Servicios = { mount, detect, reply, etapaDe, ETAPAS, CATS, CAT_ORDER, buildQuery };
})();
