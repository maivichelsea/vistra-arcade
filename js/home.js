// Portada de Vistra Arcade: construye las secciones a partir de js/catalogo.js.
(() => {
  const $ = (id) => document.getElementById(id);
  const STATUS_LABELS = { nuevo: "Nuevo", disponible: "Disponible", beta: "Beta" };
  const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

  // Crea un elemento con clase y texto (el texto nunca se interpreta como HTML).
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function image(src, width, height) {
    const img = el("img");
    img.src = src;
    img.alt = "";
    img.width = width;
    img.height = height;
    img.loading = "lazy";
    img.decoding = "async";
    return img;
  }

  // ---------- Catálogo ----------
  function gameCard(game) {
    const card = el("a", "game-card reveal");
    card.href = game.url;
    card.dataset.category = game.categoria;
    card.setAttribute("aria-label", `${game.nombre}. ${game.categoria}. ${game.descripcion} Jugar.`);

    const art = el("div", "game-art");
    art.append(
      image(game.imagen, 320, 180),
      el("span", "badge badge-category", game.categoria),
      el("span", `badge badge-status status-${game.estado}`, STATUS_LABELS[game.estado] || game.estado),
    );

    const body = el("div", "game-body");
    const tags = el("ul", "tags");
    (game.etiquetas || []).forEach((tag) => tags.append(el("li", "", tag)));

    const cta = el("span", "play-cta");
    cta.append(el("span", "", "Jugar ahora"), el("span", "play-icon", "▶"));
    cta.lastChild.setAttribute("aria-hidden", "true");

    body.append(el("h3", "", game.nombre), el("p", "", game.descripcion), tags, cta);
    card.append(art, body);
    return card;
  }

  function renderCatalog() {
    const grid = $("game-grid");
    const cards = VISTRA_JUEGOS.map(gameCard);
    grid.replaceChildren(...cards);

    // Filtros por categoría (solo si hay más de una).
    const categories = [...new Set(VISTRA_JUEGOS.map((g) => g.categoria))];
    const filters = $("filters");
    if (categories.length < 2) {
      filters.hidden = true;
      return;
    }
    const buttons = ["Todos", ...categories].map((name) => {
      const btn = el("button", "chip", name);
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(name === "Todos"));
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        cards.forEach((card) => {
          card.hidden = name !== "Todos" && card.dataset.category !== name;
        });
      });
      return btn;
    });
    filters.replaceChildren(...buttons);
  }

  // ---------- Novedades ----------
  function renderNews() {
    const gamesById = Object.fromEntries(VISTRA_JUEGOS.map((g) => [g.id, g]));
    $("news-list").replaceChildren(...VISTRA_NOVEDADES.map((item) => {
      const li = el("li", "news-item reveal");
      const time = el("time", "news-date", dateFormat.format(new Date(`${item.fecha}T12:00:00`)));
      time.dateTime = item.fecha;

      const content = el("div", "news-content");
      content.append(el("h3", "", item.titulo), el("p", "", item.texto));
      const game = item.juego && gamesById[item.juego];
      if (game) {
        const link = el("a", "news-link", `Jugar ${game.nombre} →`);
        link.href = game.url;
        content.append(link);
      }
      li.append(time, content);
      return li;
    }));
  }

  // ---------- Cabecera y pie ----------
  function renderExtras() {
    $("stat-games").textContent = VISTRA_JUEGOS.length;

    const featured = VISTRA_JUEGOS.find((g) => g.estado === "nuevo") || VISTRA_JUEGOS[0];
    if (featured) {
      const link = $("hero-featured");
      link.href = featured.url;
      link.firstChild.textContent = `Probar ${featured.nombre} `;
    }

    $("footer-games").replaceChildren(...VISTRA_JUEGOS.map((g) => {
      const li = el("li");
      const a = el("a", "", g.nombre);
      a.href = g.url;
      li.append(a);
      return li;
    }));
    $("year").textContent = new Date().getFullYear();
  }

  // ---------- Animaciones y navegación ----------
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

  // Marca en el menú la sección que se está viendo.
  function setupActiveNav() {
    const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window) || !sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => observer.observe(s));
  }

  // Sombra en la barra de navegación al hacer scroll.
  function setupNavShadow() {
    const nav = document.querySelector(".site-nav");
    const update = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  renderCatalog();
  renderNews();
  renderExtras();
  setupReveal();
  setupActiveNav();
  setupNavShadow();
})();
