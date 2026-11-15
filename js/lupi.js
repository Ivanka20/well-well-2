/* =========================================================
   Lupita, la asistente que explica palabras médicas
   y ayuda a buscar servicios cerca de casa (Cerca de mí).
   Pregunta a /api/chat (función de Vercel con Claude).
   Si no hay conexión, usa un pequeño diccionario local.
   (El código conserva el nombre interno "Lupi" para no
   romper nada: window.Lupi y window.Lupita son lo mismo.)
   ========================================================= */
(function () {
  const CARDS_KEY = "ww-lupi-cards";
  const COLORS = ["cream", "verdigris", "sea"];
  const SUGGEST = ["¿Dónde hay fisioterapia cerca?", "Anestesia", "Biopsia", "Catéter", "Suero", "Hemograma", "Tomografía", "Ayuno", "Sutura", "Oxímetro", "Alta médica", "Necesito una farmacia cercana"];

  const GLOSARIO = {
    anestesia: { nino: "Es una medicina que hace que te duermas profundito o que una parte de tu cuerpo no sienta nada, para que no te duela cuando los doctores te curan. Cuando se acaba, despiertas poco a poco.", adulto: "Medicamento que bloquea el dolor. Puede ser general (duermes por completo) o local/regional (solo se adormece una zona). Un anestesiólogo vigila tus signos todo el tiempo." },
    biopsia: { nino: "Es cuando el doctor toma un pedacito chiquitito de tu cuerpo para verlo con un microscopio, como un detective que busca pistas.", adulto: "Toma de una pequeña muestra de tejido para analizarla en laboratorio y saber con precisión qué está pasando." },
    cateter: { nino: "Es un tubito muy delgado y suave que entra en tu vena para que las medicinas lleguen rápido sin tener que picarte cada vez.", adulto: "Tubo delgado y flexible que se coloca en una vena (u otra parte del cuerpo) para pasar medicamentos, líquidos o sacar muestras." },
    suero: { nino: "Es agüita con vitaminas y sales que entra por un tubito a tu brazo para que tu cuerpo tenga energía y no se seque.", adulto: "Solución que se pasa por la vena para hidratar, dar sales minerales o llevar medicamentos." },
    hemograma: { nino: "Es un examen de tu sangre que cuenta tus 'soldaditos' (glóbulos blancos), tus 'repartidores de aire' (glóbulos rojos) y más.", adulto: "Análisis de sangre (biometría hemática) que mide glóbulos rojos, blancos y plaquetas. Ayuda a ver infecciones, anemia, etc." },
    tomografia: { nino: "Es una cámara gigante con forma de dona que toma muchas fotos de adentro de tu cuerpo. Solo tienes que quedarte quietito.", adulto: "Estudio de imagen con rayos X que crea cortes del cuerpo en 3D. Es rápido y no duele." },
    ayuno: { nino: "Significa no comer ni tomar nada por un rato, para que tu pancita esté vacía antes de un estudio o una cirugía.", adulto: "No comer ni beber durante cierto tiempo antes de un estudio o cirugía. Pregunta cuántas horas te tocan." },
    sutura: { nino: "Son puntadas, como de costura, que cierran una herida para que tu piel se pegue y sane.", adulto: "Puntos que cierran una herida. Algunos se retiran y otros se absorben solos." },
    oximetro: { nino: "Es una pincita con lucecita que se pone en tu dedo para ver cuánto aire llega a tu sangre. ¡No duele nada!", adulto: "Aparato en el dedo que mide la oxigenación de la sangre y el pulso." },
    "alta medica": { nino: "¡Es cuando los doctores dicen que ya estás listo para irte a casa!", adulto: "Autorización médica para salir del hospital, con indicaciones para seguir en casa." },
  };
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,]/g, "").trim();

  let mode = "adulto";
  let history = [];
  let busy = false;

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

  function loadCards() { try { return JSON.parse(localStorage.getItem(CARDS_KEY) || "[]"); } catch (_) { return []; } }
  function saveCards(c) { try { localStorage.setItem(CARDS_KEY, JSON.stringify(c.slice(0, 24))); } catch (_) {} }

  // Estado de Lupita → estado de ánimo del dibujo 4d
  // idle: normal · thinking: pensando · talking: hablando · happy: feliz (y luego vuelve a normal)
  const MOOD = { idle: "neutral", thinking: "pensando", talking: "hablando", happy: "feliz" };
  let moodTimer = null;
  function setState(s) {
    const el = $("#lupiBig");
    const mood = MOOD[s] || "neutral";
    el.dataset.state = s;
    if (el.dataset.mood !== mood) { el.innerHTML = lupiSVG(260, mood); el.dataset.mood = mood; }
    clearTimeout(moodTimer);
    if (s === "happy") moodTimer = setTimeout(() => setState("idle"), 1600);
  }

  function show(term, text, color, actionHtml) {
    const b = $("#lupiBubble");
    b.className = "bubble bg-" + (color || "cream");
    $("#bubbleTerm").textContent = term;
    $("#bubbleText").innerHTML = fmt(text) + (actionHtml || "");
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  }

  function renderCards() {
    const cards = loadCards();
    $("#clearCards").hidden = !cards.length;
    $("#lupiCards").innerHTML = cards.length
      ? cards.map((c, i) => `<button class="term-card bg-${c.color}" data-i="${i}" style="--rot:${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg"><span>${esc(c.term)}</span></button>`).join("")
      : `<p class="muted">Aquí se guardan las palabras que vayas aprendiendo.</p>`;
  }

  // Pregunta a /api/chat; si falla, usa el mini diccionario
  async function fetchAnswer(q, m, hist) {
    let answer = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, mode: m || mode, history: hist || [] }),
      });
      if (res.ok) {
        const data = await res.json();
        answer = data.answer || null;
      }
    } catch (_) {}
    if (!answer) {
      const hit = GLOSARIO[norm(q)] || Object.entries(GLOSARIO).find(([k]) => norm(q).includes(k))?.[1];
      answer = hit
        ? hit[m || mode]
        : "¡Uy! Ahorita no me pude conectar para buscar esa palabra. Intenta de nuevo en un ratito, o pregúntale a tu enfermera o doctor: a ellos les encanta explicar.";
    }
    return answer;
  }

  // Explicación corta para usar dentro de otras pantallas (Mi ruta, expediente)
  async function explain(q) {
    return fetchAnswer(q, mode, []);
  }

  async function ask(q) {
    if (busy) return;
    q = q.trim();
    if (!q) return;

    // ¿Busca un lugar? ("necesito un lugar donde mi hijo reciba fisioterapia")
    const hit = window.Servicios && Servicios.detect(q);
    if (hit) {
      history.push({ role: "user", content: q }, { role: "assistant", content: Servicios.reply(hit) });
      setState("talking");
      show(q, Servicios.reply(hit), "verdigris",
        `<p><a class="btn btn-primary lupita-go" href="#/servicios/${hit.cat}">Buscar ${esc(hit.short)} cerca →</a></p>`);
      setTimeout(() => setState("happy"), 1800);
      return;
    }

    busy = true;
    $("#lupiSend").disabled = true;
    setState("thinking");
    $("#bubbleTerm").textContent = q;
    $("#bubbleText").innerHTML = `<p class="dots-loading"><span></span><span></span><span></span></p>`;

    const answer = await fetchAnswer(q, mode, history.slice(-6));

    history.push({ role: "user", content: q }, { role: "assistant", content: answer });
    const color = COLORS[loadCards().length % COLORS.length];
    const cards = loadCards().filter((c) => norm(c.term) !== norm(q));
    cards.unshift({ term: q.length > 40 ? q.slice(0, 38) + "…" : q, text: answer, color });
    saveCards(cards);
    renderCards();

    setState("talking");
    show(q, answer, color);
    setTimeout(() => setState("happy"), 1800);
    busy = false;
    $("#lupiSend").disabled = false;
  }

  function init() {
    setState("idle");
    document.querySelectorAll(".nav-lupi").forEach((el) => (el.innerHTML = lupiSVG(28)));
    show("¡Hola! Soy Lupita", "Hago que las palabras difíciles del hospital se vuelvan **chiquitas y fáciles**, para peques y para grandes. Escribe una palabra que hayas escuchado y te la explico.\n\nTambién te ayudo a **encontrar lugares cerca de casa**: dime, por ejemplo, «necesito un lugar donde mi hijo pueda recibir fisioterapia».", "cream");

    $("#lupiChips").innerHTML = SUGGEST.map((s, i) => `<button type="button" class="chip bg-${COLORS[i % COLORS.length]}">${s}</button>`).join("");
    $("#lupiChips").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) ask(b.textContent); });

    $("#lupiForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#lupiInput").value; $("#lupiInput").value = ""; ask(v); });

    document.querySelectorAll(".mode-btn").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll(".mode-btn").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-checked", x === b); });
    }));

    $("#lupiCards").addEventListener("click", (e) => {
      const b = e.target.closest(".term-card");
      if (!b) return;
      const c = loadCards()[+b.dataset.i];
      if (c) { show(c.term, c.text, c.color); setState("talking"); setTimeout(() => setState("idle"), 1200); $("#lupiBubble").scrollIntoView({ behavior: "smooth", block: "center" }); }
    });
    $("#clearCards").addEventListener("click", () => { saveCards([]); renderCards(); });

    // Lupita sigue el cursor con la mirada
    document.addEventListener("pointermove", (e) => {
      const eyes = document.querySelector("#lupiBig .lupi-eyes");
      if (!eyes) return;
      const r = eyes.closest("svg").getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 400));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 400));
      eyes.style.transform = `translate(${dx * 5}px, ${dy * 4}px)`;
    });

    renderCards();
  }

  window.Lupi = window.Lupita = { init, ask, explain, fmt };
})();
