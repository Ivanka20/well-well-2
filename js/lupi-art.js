/* =========================================================
   Lupita · diseño 4d «Con cejas»
   Una lupa con cara: aro azul, lente crema, mango coral,
   ojos de punto con cejas finas.
   Estados de ánimo: "neutral" | "pensando" | "hablando" | "feliz"

   Uso:  lupiSVG(tamaño)                → Lupita normal
         lupiSVG(tamaño, "pensando")    → con otro estado
   Solo usa los colores de la paleta (variables de styles.css).
   ========================================================= */
(function () {
  const D = "var(--ink)";     // contorno, ojos, boca
  const T = "var(--sea)";     // aro de la lupa (azul)
  const C = "var(--tomato)";  // mango y mejillas
  const K = "var(--cream)";   // lente
  const n = (v) => Math.round(v * 100) / 100;

  // Cara dentro de la lente (centro cx, cy; escala s)
  function face(cx, cy, s, mood) {
    const ex = [cx - 11 * s, cx + 11 * s];
    const p = mood === "pensando";
    const dx = p ? 2 * s : 0, dy = p ? -2.5 * s : 0;
    let eyes;
    if (mood === "feliz") {
      // ojos cerrados de alegría
      eyes = ex.map((x) => `<path d="M${n(x - 5 * s)} ${n(cy + 1)} Q${n(x)} ${n(cy - 7 * s)} ${n(x + 5 * s)} ${n(cy + 1)}" stroke="${D}" stroke-width="${n(3.5 * s)}" fill="none" stroke-linecap="round"/>`).join("");
    } else {
      // ojos de punto + cejas finas (parpadean)
      eyes = `<g class="lp-blink">` + ex.map((x, i) => {
        const ceja = i === 0
          ? `M${n(x - 6 * s)} ${n(cy - 8 * s)} Q${n(x)} ${n(cy - (p ? 13 : 11) * s)} ${n(x + 5 * s)} ${n(cy - 9 * s)}`
          : `M${n(x - 5 * s)} ${n(cy - 9 * s)} Q${n(x)} ${n(cy - 11 * s)} ${n(x + 6 * s)} ${n(cy - 8 * s)}`;
        return `<circle cx="${n(x + dx)}" cy="${n(cy + dy)}" r="${n(3.8 * s)}" fill="${D}"/>` +
          `<path d="${ceja}" stroke="${D}" stroke-width="${n(2.6 * s)}" fill="none" stroke-linecap="round"/>`;
      }).join("") + `</g>`;
    }
    // la clase lupi-eyes permite que la mirada siga al cursor
    let g = `<g class="lupi-eyes">${eyes}</g>`;

    // mejillas
    const rubor = mood === "feliz" ? 0.45 : 0.25;
    g += `<circle cx="${n(cx - 19 * s)}" cy="${n(cy + 9 * s)}" r="${n(4.5 * s)}" fill="${C}" opacity="${rubor}"/>`;
    g += `<circle cx="${n(cx + 19 * s)}" cy="${n(cy + 9 * s)}" r="${n(4.5 * s)}" fill="${C}" opacity="${rubor}"/>`;

    // boca
    const my = cy + 11 * s;
    if (mood === "hablando") {
      g += `<g class="lp-talk"><ellipse cx="${n(cx)}" cy="${n(my + 3 * s)}" rx="${n(6 * s)}" ry="${n(5.5 * s)}" fill="${D}"/>` +
        `<ellipse cx="${n(cx)}" cy="${n(my + 6 * s)}" rx="${n(3.5 * s)}" ry="${n(2 * s)}" fill="${C}"/></g>`;
    } else if (mood === "feliz") {
      g += `<path d="M${n(cx - 9 * s)} ${n(my)} Q${n(cx)} ${n(my + 13 * s)} ${n(cx + 9 * s)} ${n(my)} Z" fill="${D}" stroke="${D}" stroke-width="${n(2 * s)}" stroke-linejoin="round"/>`;
    } else if (p) {
      g += `<path d="M${n(cx - 2 * s)} ${n(my + 3 * s)} Q${n(cx + 4 * s)} ${n(my + 1 * s)} ${n(cx + 8 * s)} ${n(my + 3 * s)}" stroke="${D}" stroke-width="${n(3.2 * s)}" fill="none" stroke-linecap="round"/>`;
    } else {
      g += `<path d="M${n(cx - 7 * s)} ${n(my)} Q${n(cx)} ${n(my + 7 * s)} ${n(cx + 7 * s)} ${n(my)}" stroke="${D}" stroke-width="${n(3.2 * s)}" fill="none" stroke-linecap="round"/>`;
    }

    // puntitos de "estoy pensando"
    if (p) {
      [0, 1, 2].forEach((i) => {
        g += `<circle class="lp-dot" style="animation-delay:${i * 0.2}s" cx="${n(cx + (26 + i * 8) * s)}" cy="${n(cy - (24 + i * 4) * s)}" r="${n((2 + i * 0.6) * s)}" fill="${D}"/>`;
      });
    }
    return g;
  }

  window.lupiSVG = function (size, mood) {
    const s = size || 200;
    mood = ["neutral", "pensando", "hablando", "feliz"].includes(mood) ? mood : "neutral";
    const rot = 'transform="rotate(-40 84 98)"';
    return `
<svg class="lupi-svg" data-mood="${mood}" viewBox="-4 -4 128 128" width="${s}" height="${s}" aria-hidden="true" style="overflow:visible">
  <g class="lupi-body">
    <g class="${mood === "feliz" ? "lp-wig" : ""}">
      <rect x="76" y="78" width="16" height="40" rx="8" ${rot} fill="${C}" stroke="${D}" stroke-width="4"/>
      <rect x="79" y="90" width="10" height="4" rx="2" ${rot} fill="${K}"/>
    </g>
    <circle cx="56" cy="54" r="40" fill="${T}" stroke="${D}" stroke-width="4"/>
    <circle cx="56" cy="54" r="30" fill="${K}" stroke="${D}" stroke-width="3"/>
    <path d="M34 42 Q38 30 50 27" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${face(56, 52, 0.9, mood)}
  </g>
</svg>`;
  };
})();
