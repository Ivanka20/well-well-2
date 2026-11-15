/* =========================================================
   Letras recortadas de revista (estilo del rediseño)
   Uso: <span data-cut="texto" data-size="40" data-seed="0"></span>
   Solo para el logo y el título de cada pantalla.
   ========================================================= */
(function () {
  const FONTS = ["'Abril Fatface'", "'Rubik Mono One'", "'Shrikhand'", "'Young Serif'", "'Bungee'", "'Space Mono'", "'DM Serif Display'"];
  // [fondo, letra]
  const COMBOS = [["var(--sea)", "var(--ink)"], ["var(--cream)", "var(--ink)"], ["var(--tomato)", "var(--cream)"], ["var(--cream)", "var(--tomato)"], ["var(--white)", "var(--ink)"]];

  function cut(el) {
    const text = el.dataset.cut;
    if (text == null) return;
    const size = parseFloat(el.dataset.size || 40);
    const seed = parseInt(el.dataset.seed || 0, 10);
    el.textContent = "";
    el.classList.add("cut");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", text);

    let prev = -1;
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.setAttribute("aria-hidden", "true");
      if (ch === " ") {
        s.className = "cut-sp";
        s.style.width = size * 0.2 + "px";
        el.appendChild(s);
        return;
      }
      const h = ch.charCodeAt(0) * 31 + i * 17 + seed * 13;
      let fi = h % 7; if (fi === prev) fi = (fi + 1) % 7; prev = fi;
      const [bg, fg] = COMBOS[(i + seed) % COMBOS.length];
      const rot = ((h * 7) % 13) - 6;
      const small = fi === 1 || fi === 4 || fi === 5;
      s.className = "cut-l";
      s.textContent = ch;
      Object.assign(s.style, {
        fontFamily: FONTS[fi],
        fontSize: size * (small ? 0.8 : 1) + "px",
        padding: `${size * 0.1}px ${size * 0.13}px ${size * 0.14}px`,
        background: bg,
        color: fg,
        transform: `rotate(${rot}deg)`,
        borderRadius: (h % 3) * 4 + "px",
        fontStyle: fi === 6 ? "italic" : "normal",
        fontWeight: fi === 5 ? "700" : "400",
      });
      el.appendChild(s);
    });
  }

  function cutAll(root) {
    (root || document).querySelectorAll("[data-cut]").forEach(cut);
  }

  window.Cutout = { cut, cutAll };
  document.addEventListener("DOMContentLoaded", () => cutAll());
})();
