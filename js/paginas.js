// Página "Páginas permitidas": construye las tarjetas a partir de js/paginas-datos.js.
(() => {
  const $ = (id) => document.getElementById(id);
  const STATUS_LABELS = { "probada": "Probada", "por-probar": "Por probar" };
  const host = (url) => new URL(url).hostname;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Logo del sitio: primero el servicio de íconos de Google; si falla, el favicon del
  // propio sitio; si también falla, la inicial del nombre.
  function siteLogo(page) {
    const box = el("div", "site-logo");
    const img = el("img");
    img.alt = "";
    img.width = 56;
    img.height = 56;
    img.decoding = "async";
    img.src = `https://www.google.com/s2/favicons?domain=${host(page.url)}&sz=128`;
    let step = 0;
    img.addEventListener("error", () => {
      if (step++ === 0) {
        img.src = `https://${host(page.url)}/favicon.ico`;
        return;
      }
      box.classList.add("is-letter");
      box.textContent = page.nombre.charAt(0).toUpperCase();
    });
    box.append(img);
    return box;
  }

  function pageCard(page) {
    const cat = VISTRA_PAGINAS_CATEGORIAS[page.categoria] || { desde: "#2f27ce", hasta: "#1a1546", emoji: "🌐" };
    const card = el("a", "game-card page-card reveal");
    card.href = page.url;
    card.target = "_blank";
    card.rel = "noopener";
    card.dataset.category = page.categoria;
    card.dataset.search = `${page.nombre} ${host(page.url)} ${page.categoria} ${page.descripcion}`.toLowerCase();
    card.setAttribute("aria-label", `${page.nombre}. ${page.categoria}. ${page.descripcion} Abrir en una pestaña nueva.`);

    const art = el("div", "game-art page-art");
    art.style.setProperty("--from", cat.desde);
    art.style.setProperty("--to", cat.hasta);
    const deco = el("span", "page-deco", cat.emoji);
    deco.setAttribute("aria-hidden", "true");
    const center = el("div", "page-cover");
    center.append(siteLogo(page), el("span", "page-host", host(page.url)));
    art.append(
      deco,
      center,
      el("span", "badge badge-category", page.categoria),
      el("span", `badge badge-status status-${page.estado}`, STATUS_LABELS[page.estado] || page.estado),
    );

    const body = el("div", "game-body");
    body.append(el("h3", "", page.nombre), el("p", "", page.descripcion));

    const tags = el("ul", "tags");
    tags.append(el("li", "", "Sin cuenta"));
    if (page.nota) tags.append(el("li", "tag-note", page.nota));
    body.append(tags);

    const cta = el("span", "play-cta");
    cta.append(el("span", "", "Abrir página"), el("span", "play-icon open-icon", "↗"));
    cta.lastChild.setAttribute("aria-hidden", "true");
    body.append(cta);

    card.append(art, body);
    return card;
  }

  const cards = VISTRA_PAGINAS.map(pageCard);
  let activeCategory = "Todas";

  function applyFilters() {
    const q = $("q").value.toLowerCase().trim();
    let visible = 0;
    cards.forEach((card) => {
      const show = (activeCategory === "Todas" || card.dataset.category === activeCategory)
        && (!q || card.dataset.search.includes(q));
      card.hidden = !show;
      if (show) visible++;
    });
    $("empty").hidden = visible > 0;
  }

  function renderFilters() {
    const categories = Object.keys(VISTRA_PAGINAS_CATEGORIAS)
      .filter((name) => VISTRA_PAGINAS.some((p) => p.categoria === name));
    const buttons = ["Todas", ...categories].map((name) => {
      const btn = el("button", "chip", name);
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(name === "Todas"));
      btn.addEventListener("click", () => {
        activeCategory = name;
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        applyFilters();
      });
      return btn;
    });
    $("filters").replaceChildren(...buttons);
  }

  // Copia la lista completa como texto, agrupada por categoría.
  function setupCopy() {
    const toast = $("toast");
    const showToast = (text) => {
      toast.textContent = text;
      toast.classList.add("is-shown");
      setTimeout(() => toast.classList.remove("is-shown"), 2000);
    };
    const fallback = (text) => {
      const ta = el("textarea");
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Lista copiada");
    };
    $("copy").addEventListener("click", () => {
      const groups = {};
      VISTRA_PAGINAS.forEach((p) => (groups[p.categoria] ||= []).push(p));
      const text = Object.entries(groups).map(([cat, list]) =>
        `${cat.toUpperCase()}\n${list.map((p) => `- ${p.nombre}: ${p.url}${p.nota ? ` (${p.nota})` : ""}`).join("\n")}`,
      ).join("\n\n");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast("Lista copiada"), () => fallback(text));
      } else {
        fallback(text);
      }
    });
  }

  function setupReveal() {
    const items = document.querySelectorAll(".reveal");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((item, i) => {
      item.style.setProperty("--delay", `${(i % 4) * 70}ms`);
      observer.observe(item);
    });
  }

  function setupNavShadow() {
    const nav = document.querySelector(".site-nav");
    const update = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  $("page-grid").replaceChildren(...cards);
  $("stat-pages").textContent = VISTRA_PAGINAS.length;
  $("stat-tested").textContent = VISTRA_PAGINAS.filter((p) => p.estado === "probada").length;
  $("year").textContent = new Date().getFullYear();
  $("q").addEventListener("input", applyFilters);
  renderFilters();
  setupCopy();
  setupReveal();
  setupNavShadow();
})();
