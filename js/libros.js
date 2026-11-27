// Sección Libros: biblioteca y lector de PDF (con PDF.js).
// Guarda por dónde vas, marcadores y resaltados en este navegador (ver js/libros-db.js).
(() => {
  const $ = (id) => document.getElementById(id);
  const pdfjs = window.pdfjsLib;
  const WORKER = "js/vendor/pdfjs/pdf.worker.min.js";
  const CSS_UNITS = 96 / 72; // 100 % = tamaño real del papel en pantalla
  const ZOOMS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const COLORES = { amarillo: "Amarillo", verde: "Verde", azul: "Azul", rosa: "Rosa" };
  const fechaCorta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });
  const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  // ---------- Utilidades ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const tamanoLegible = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const tituloDe = (nombre) => nombre.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Sin título";
  const huella = (archivo, tamano) => `${archivo}|${tamano}`;

  function haceCuanto(ms) {
    const s = (ms - Date.now()) / 1000;
    const pasos = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"], [Infinity, "year"]];
    let v = s;
    for (const [div, unidad] of pasos) {
      if (Math.abs(v) < div) return relativo.format(Math.round(v), unidad);
      v /= div;
    }
    return "";
  }

  let toastTimer;
  function toast(texto, tipo = "ok", ms = 2600) {
    const t = $("toast");
    t.textContent = texto;
    t.classList.toggle("is-error", tipo === "error");
    t.classList.toggle("is-info", tipo === "info");
    t.classList.add("is-shown");
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => t.classList.remove("is-shown"), ms);
  }

  // ---------- PDF.js ----------
  // Al abrir el arcade con doble clic (file://) el navegador no deja usar un "worker" aparte,
  // así que se carga el procesador de PDF en la misma página. Desde una dirección web se usa el worker.
  let pdfjsListo = null;
  function prepararPdfjs() {
    if (pdfjsListo) return pdfjsListo;
    if (!pdfjs) return Promise.reject(new Error("No se pudo cargar el lector de PDF."));
    if (location.protocol === "file:") {
      pdfjsListo = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = WORKER;
        s.onload = resolve;
        s.onerror = () => reject(new Error("No se pudo cargar el lector de PDF."));
        document.head.append(s);
      });
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
      pdfjsListo = Promise.resolve();
    }
    return pdfjsListo;
  }

  async function abrirPdf(datos) {
    await prepararPdfjs();
    return pdfjs.getDocument({ data: new Uint8Array(datos.slice(0)), isEvalSupported: false }).promise;
  }

  function mensajeError(e) {
    if (e?.name === "PasswordException") return "Ese PDF tiene contraseña y no se puede abrir.";
    if (e?.name === "InvalidPDFException") return "El archivo no es un PDF válido o está dañado.";
    return e?.message || "Algo salió mal.";
  }

  async function crearPortada(pdf) {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 360 / base.width });
    const canvas = el("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    page.cleanup();
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  // =========================================================
  //  Biblioteca
  // =========================================================
  let libros = [];
  let notasPorLibro = {};

  function progreso(libro) {
    if (!libro.ultimaLectura || !libro.paginas) return 0;
    return Math.min(100, Math.round((libro.pagina / libro.paginas) * 100));
  }

  async function cargarBiblioteca() {
    try {
      const [lista, notas] = await Promise.all([LibrosDB.listar(), LibrosDB.todasLasNotas()]);
      libros = lista.sort((a, b) => (b.ultimaLectura || b.agregado) - (a.ultimaLectura || a.agregado));
      notasPorLibro = Object.fromEntries(notas.map((n) => [n.libroId, n]));
    } catch (e) {
      libros = [];
      notasPorLibro = {};
      toast(mensajeError(e), "error", 6000);
    }
    pintarBiblioteca();
  }

  function tarjetaLibro(libro) {
    const notas = notasPorLibro[libro.id] || { marcadores: [], resaltados: [] };
    const pct = progreso(libro);
    const estado = pct >= 100 ? ["terminado", "Terminado"] : libro.ultimaLectura ? ["leyendo", `${pct} %`] : ["nuevo", "Nuevo"];

    const card = el("article", "game-card book-card reveal");
    card.dataset.search = normalizar(`${libro.titulo} ${libro.archivo}`);

    const link = el("a", "book-link");
    link.href = `#leer=${libro.id}`;
    link.setAttribute("aria-label", `${libro.ultimaLectura ? "Seguir leyendo" : "Leer"} ${libro.titulo}`);

    const art = el("div", "game-art book-art");
    if (libro.portada) {
      art.style.setProperty("--cover", `url("${libro.portada}")`);
      const img = el("img", "book-cover");
      img.src = libro.portada;
      img.alt = "";
      art.append(img);
    } else {
      art.append(el("span", "book-cover book-cover-empty", "📕"));
    }
    art.append(
      el("span", "badge badge-category", `${libro.paginas} págs.`),
      el("span", `badge badge-status status-${estado[0]}`, estado[1]),
    );

    const body = el("div", "game-body");
    const leido = libro.ultimaLectura
      ? `Pág. ${libro.pagina} de ${libro.paginas} · leído ${haceCuanto(libro.ultimaLectura)}`
      : `Añadido el ${fechaCorta.format(libro.agregado)}`;
    const barra = el("div", "book-progress");
    barra.setAttribute("role", "progressbar");
    barra.setAttribute("aria-valuenow", String(pct));
    barra.setAttribute("aria-valuemin", "0");
    barra.setAttribute("aria-valuemax", "100");
    barra.setAttribute("aria-label", "Progreso de lectura");
    const relleno = el("span");
    relleno.style.width = `${pct}%`;
    barra.append(relleno);

    const tags = el("ul", "tags");
    tags.append(
      el("li", "", `🔖 ${notas.marcadores.length}`),
      el("li", "", `🖍 ${notas.resaltados.length}`),
      el("li", "", tamanoLegible(libro.tamano)),
    );

    const cta = el("span", "play-cta");
    cta.append(el("span", "", libro.ultimaLectura ? "Seguir leyendo" : "Leer"), el("span", "play-icon", "▶"));
    cta.lastChild.setAttribute("aria-hidden", "true");

    body.append(el("h3", "", libro.titulo), el("p", "", leido), barra, tags, cta);

    const borrar = el("button", "book-delete", "✕");
    borrar.type = "button";
    borrar.title = "Quitar de la biblioteca";
    borrar.setAttribute("aria-label", `Quitar ${libro.titulo} de la biblioteca`);
    borrar.addEventListener("click", () => quitarLibro(libro));

    card.append(art, body, link, borrar);
    return card;
  }

  function tarjetaAgregar(vacia) {
    const card = el("button", `add-card reveal${vacia ? " is-empty" : ""}`);
    card.type = "button";
    card.append(
      el("span", "add-icon", "📚"),
      el("h3", "", vacia ? "Añade tu primer libro" : "Añadir libro"),
      el("p", "", "Elige un PDF de tu PC o arrástralo a esta página."),
      el("span", "teaser-link", "Elegir PDF ＋"),
    );
    card.addEventListener("click", () => $("input-pdf").click());
    return card;
  }

  function pintarBiblioteca() {
    const tarjetas = libros.map(tarjetaLibro);
    $("book-grid").replaceChildren(...tarjetas, tarjetaAgregar(!libros.length));
    filtrar();

    const todas = Object.values(notasPorLibro);
    $("stat-libros").textContent = libros.length;
    $("stat-marcadores").textContent = todas.reduce((n, x) => n + x.marcadores.length, 0);
    $("stat-resaltados").textContent = todas.reduce((n, x) => n + x.resaltados.length, 0);
    $("btn-exportar").disabled = !libros.length;
    revelar();
  }

  function filtrar() {
    const q = normalizar($("q").value.trim());
    let visibles = 0;
    document.querySelectorAll(".book-card").forEach((card) => {
      card.hidden = !!q && !card.dataset.search.includes(q);
      if (!card.hidden) visibles++;
    });
    $("empty").hidden = !q || visibles > 0;
  }

  async function agregarArchivos(files) {
    const pdfs = [...files].filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (!pdfs.length) {
      toast("Solo se pueden añadir archivos PDF.", "error");
      return;
    }
    LibrosDB.pedirPersistencia();
    let agregados = 0;
    for (const f of pdfs) {
      if (libros.some((l) => l.archivo === f.name && l.tamano === f.size)) {
        toast(`«${tituloDe(f.name)}» ya está en tu biblioteca.`, "info");
        continue;
      }
      toast(`Añadiendo «${tituloDe(f.name)}»…`, "info", 0);
      try {
        const datos = await f.arrayBuffer();
        const pdf = await abrirPdf(datos);
        const portada = await crearPortada(pdf).catch(() => null);
        const libro = {
          id: uid(),
          titulo: tituloDe(f.name),
          archivo: f.name,
          tamano: f.size,
          paginas: pdf.numPages,
          portada,
          agregado: Date.now(),
          ultimaLectura: null,
          pagina: 1,
          posicion: 0,
          zoom: "ancho",
          noche: false,
        };
        pdf.destroy();
        await LibrosDB.agregar(libro, datos);
        await aplicarPendiente(libro);
        libros.push(libro);
        agregados++;
      } catch (e) {
        toast(`«${tituloDe(f.name)}»: ${mensajeError(e)}`, "error", 5000);
        return cargarBiblioteca();
      }
    }
    await cargarBiblioteca();
    if (agregados) toast(agregados === 1 ? "Libro añadido a tu biblioteca." : `${agregados} libros añadidos.`);
  }

  async function quitarLibro(libro) {
    const n = notasPorLibro[libro.id];
    const extra = n && (n.marcadores.length || n.resaltados.length)
      ? ` También se borrarán sus ${n.marcadores.length} marcadores y ${n.resaltados.length} resaltados.`
      : "";
    if (!confirm(`¿Quitar «${libro.titulo}» de la biblioteca?${extra}`)) return;
    await LibrosDB.borrar(libro.id);
    toast("Libro quitado.");
    cargarBiblioteca();
  }

  // ---------- Copia de seguridad ----------
  const CLAVE_PENDIENTES = "vistra-libros-pendientes";

  async function exportar() {
    const notas = Object.fromEntries((await LibrosDB.todasLasNotas()).map((n) => [n.libroId, n]));
    const datos = {
      app: "vistra-libros",
      version: 1,
      exportado: new Date().toISOString(),
      libros: (await LibrosDB.listar()).map((l) => ({
        titulo: l.titulo,
        archivo: l.archivo,
        tamano: l.tamano,
        paginas: l.paginas,
        pagina: l.pagina,
        posicion: l.posicion,
        ultimaLectura: l.ultimaLectura,
        marcadores: notas[l.id]?.marcadores || [],
        resaltados: notas[l.id]?.resaltados || [],
      })),
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const a = el("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notas-libros-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Copia descargada.");
  }

  function unirPorId(a = [], b = []) {
    const ids = new Set(a.map((x) => x.id));
    return [...a, ...b.filter((x) => !ids.has(x.id))];
  }

  async function fusionar(libro, entrada) {
    const notas = await LibrosDB.notas(libro.id);
    notas.marcadores = unirPorId(notas.marcadores, entrada.marcadores);
    notas.resaltados = unirPorId(notas.resaltados, entrada.resaltados);
    await LibrosDB.guardarNotas(notas);
    if ((entrada.ultimaLectura || 0) > (libro.ultimaLectura || 0)) {
      Object.assign(libro, { pagina: entrada.pagina, posicion: entrada.posicion || 0, ultimaLectura: entrada.ultimaLectura });
      await LibrosDB.guardarLibro(libro);
    }
  }

  // Si se importó una copia antes de añadir el PDF, se aplica al añadirlo.
  async function aplicarPendiente(libro) {
    let pendientes;
    try { pendientes = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) || "{}"); } catch { return; }
    const clave = huella(libro.archivo, libro.tamano);
    if (!pendientes[clave]) return;
    await fusionar(libro, pendientes[clave]);
    delete pendientes[clave];
    localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(pendientes));
  }

  async function importar(file) {
    let datos;
    try {
      datos = JSON.parse(await file.text());
      if (datos.app !== "vistra-libros" || !Array.isArray(datos.libros)) throw new Error();
    } catch {
      toast("Ese archivo no es una copia de notas de libros.", "error", 4000);
      return;
    }
    const actuales = await LibrosDB.listar();
    let pendientes = {};
    try { pendientes = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) || "{}"); } catch { /* vacío */ }
    let aplicados = 0;
    let enEspera = 0;
    for (const entrada of datos.libros) {
      const libro = actuales.find((l) => l.archivo === entrada.archivo && l.tamano === entrada.tamano);
      if (libro) {
        await fusionar(libro, entrada);
        aplicados++;
      } else {
        pendientes[huella(entrada.archivo, entrada.tamano)] = entrada;
        enEspera++;
      }
    }
    localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(pendientes));
    await cargarBiblioteca();
    toast(enEspera
      ? `Notas importadas en ${aplicados} libros. ${enEspera} se aplicarán cuando añadas esos PDF.`
      : `Notas importadas en ${aplicados} libros.`, "ok", 5000);
  }

  // ---------- Arrastrar y soltar ----------
  function configurarArrastre() {
    let profundidad = 0;
    const overlay = $("drop-overlay");
    const conArchivos = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
    window.addEventListener("dragenter", (e) => {
      if (!conArchivos(e) || !$("vista-lector").hidden) return;
      e.preventDefault();
      profundidad++;
      overlay.classList.add("is-shown");
    });
    window.addEventListener("dragleave", () => {
      profundidad = Math.max(0, profundidad - 1);
      if (!profundidad) overlay.classList.remove("is-shown");
    });
    window.addEventListener("dragover", (e) => { if (conArchivos(e)) e.preventDefault(); });
    window.addEventListener("drop", (e) => {
      if (!conArchivos(e)) return;
      e.preventDefault();
      profundidad = 0;
      overlay.classList.remove("is-shown");
      if ($("vista-lector").hidden) agregarArchivos(e.dataTransfer.files);
    });
  }

  function revelar() {
    const items = document.querySelectorAll(".reveal:not(.is-visible)");
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

  // =========================================================
  //  Lector
  // =========================================================
  const R = {
    libro: null,
    pdf: null,
    notas: null,
    paginas: [],      // { num, el, canvas, capaTexto, capaResaltados, page, texto, lista, renderizando }
    base: null,       // tamaño de la página 1 a escala 1 (para las páginas aún no cargadas)
    escala: 1,
    version: 0,       // cambia al hacer zoom: invalida renderizados en curso
    actual: 1,
    observador: null,
    guardarTimer: null,
    seleccion: null,
    editando: null,   // { tipo: "resaltado" | "marcador", item }
    busqueda: 0,
  };
  const scroller = () => $("r-scroll");

  async function abrirLector(id) {
    if (R.libro?.id === id) return;
    if (R.libro) await cerrarLector(false);
    $("vista-biblioteca").hidden = true;
    $("vista-lector").hidden = false;
    document.body.classList.add("leyendo");
    $("r-cargando").hidden = false;
    $("r-cargando").textContent = "Abriendo libro…";
    $("r-paginas").replaceChildren();

    try {
      const [libro, datos, notas] = await Promise.all([LibrosDB.obtener(id), LibrosDB.archivo(id), LibrosDB.notas(id)]);
      if (!libro || !datos) throw new Error("Ese libro ya no está en tu biblioteca.");
      R.libro = libro;
      R.notas = notas;
      $("r-titulo").textContent = libro.titulo;
      document.title = `${libro.titulo} · Libros`;
      R.pdf = await abrirPdf(datos);
      if (R.libro !== libro) return; // se cerró mientras cargaba
      if (R.pdf.numPages !== libro.paginas) { libro.paginas = R.pdf.numPages; }
      const primera = await R.pdf.getPage(1);
      const vp = primera.getViewport({ scale: 1 });
      R.base = { w: vp.width, h: vp.height };
      $("r-total").textContent = R.pdf.numPages;
      $("r-pagina").max = R.pdf.numPages;
      $("vista-lector").classList.toggle("noche", !!libro.noche);
      $("r-noche").setAttribute("aria-pressed", String(!!libro.noche));
      construirPaginas();
      $("r-cargando").hidden = true;
      calcularEscala();
      aplicarEscala();
      irAPagina(Math.min(libro.pagina || 1, R.pdf.numPages), libro.posicion || 0);
      pintarPanel();
      scroller().focus({ preventScroll: true });
    } catch (e) {
      toast(mensajeError(e), "error", 5000);
      location.hash = "";
    }
  }

  async function cerrarLector(mostrarBiblioteca = true) {
    if (R.libro) {
      guardarProgreso(true);
      R.observador?.disconnect();
      R.paginas.forEach(liberarPagina);
      const pdf = R.pdf;
      Object.assign(R, { libro: null, pdf: null, notas: null, paginas: [], seleccion: null, editando: null });
      R.version++;
      R.busqueda++;
      pdf?.destroy();
    }
    ocultarBarraResaltar();
    cerrarPopover();
    if (!mostrarBiblioteca) return;
    $("vista-lector").hidden = true;
    $("vista-biblioteca").hidden = false;
    document.body.classList.remove("leyendo");
    document.title = "Libros · Vistra Arcade";
    cargarBiblioteca();
  }

  function construirPaginas() {
    R.observador?.disconnect();
    R.paginas = [];
    const frag = document.createDocumentFragment();
    for (let num = 1; num <= R.pdf.numPages; num++) {
      const pagEl = el("div", "pdf-page");
      pagEl.dataset.page = num;
      const canvas = el("canvas");
      const capaResaltados = el("div", "hl-layer");
      const capaTexto = el("div", "textLayer");
      pagEl.append(canvas, capaResaltados, capaTexto, el("span", "page-num", String(num)), el("span", "page-flag", "🔖"));
      frag.append(pagEl);
      R.paginas.push({ num, el: pagEl, canvas, capaTexto, capaResaltados, w: R.base.w, h: R.base.h, lista: false });
    }
    $("r-paginas").replaceChildren(frag);
    R.paginas.forEach(pintarResaltados);
    marcarPaginasConMarcador();

    R.observador = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const p = R.paginas[+entry.target.dataset.page - 1];
        if (!p) return;
        if (entry.isIntersecting) renderizarPagina(p);
        else liberarPagina(p);
      });
    }, { root: scroller(), rootMargin: "120% 0px" });
    R.paginas.forEach((p) => R.observador.observe(p.el));
  }

  function calcularEscala() {
    const zoom = R.libro.zoom;
    if (zoom === "ancho") {
      const disponible = scroller().clientWidth - 110;
      const anchoMax = Math.min(disponible, 1100);
      R.escala = Math.max(0.4, Math.min(4, anchoMax / R.base.w));
    } else {
      R.escala = zoom * CSS_UNITS;
    }
    $("r-ajustar").textContent = `${Math.round((R.escala / CSS_UNITS) * 100)}%`;
    $("r-ajustar").title = zoom === "ancho" ? "Ajustado al ancho" : "Ajustar al ancho";
  }

  function aplicarEscala() {
    R.version++;
    R.paginas.forEach((p) => {
      p.el.style.width = `${Math.floor(p.w * R.escala)}px`;
      p.el.style.height = `${Math.floor(p.h * R.escala)}px`;
      p.el.style.setProperty("--scale-factor", R.escala);
      liberarPagina(p);
    });
    // Vuelve a pedir al observador las páginas visibles.
    R.paginas.forEach((p) => { R.observador.unobserve(p.el); R.observador.observe(p.el); });
  }

  function liberarPagina(p) {
    if (p.tarea) { p.tarea.cancel(); p.tarea = null; }
    if (p.tareaTexto) { p.tareaTexto.cancel(); p.tareaTexto = null; }
    p.canvas.width = 0;
    p.canvas.height = 0;
    p.capaTexto.replaceChildren();
    p.lista = false;
    p.renderizando = false;
  }

  async function renderizarPagina(p) {
    if (p.lista || p.renderizando || !R.pdf) return;
    p.renderizando = true;
    const version = R.version;
    try {
      p.page ||= await R.pdf.getPage(p.num);
      if (version !== R.version) return;
      const base = p.page.getViewport({ scale: 1 });
      if (Math.abs(base.width - p.w) > 0.5 || Math.abs(base.height - p.h) > 0.5) {
        p.w = base.width;
        p.h = base.height;
        p.el.style.width = `${Math.floor(p.w * R.escala)}px`;
        p.el.style.height = `${Math.floor(p.h * R.escala)}px`;
      }
      const vp = p.page.getViewport({ scale: R.escala });
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      const maxPix = 16e6;
      if (vp.width * vp.height * dpr * dpr > maxPix) dpr = Math.sqrt(maxPix / (vp.width * vp.height));
      p.canvas.width = Math.floor(vp.width * dpr);
      p.canvas.height = Math.floor(vp.height * dpr);
      p.canvas.style.width = `${Math.floor(vp.width)}px`;
      p.canvas.style.height = `${Math.floor(vp.height)}px`;
      const ctx = p.canvas.getContext("2d");
      p.tarea = p.page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
      await p.tarea.promise;
      p.tarea = null;
      if (version !== R.version) return;

      p.texto ||= await p.page.getTextContent();
      if (version !== R.version) return;
      p.capaTexto.replaceChildren();
      p.tareaTexto = pdfjs.renderTextLayer({ textContentSource: p.texto, container: p.capaTexto, viewport: vp });
      await p.tareaTexto.promise;
      p.tareaTexto = null;
      const fin = el("div", "endOfContent");
      p.capaTexto.append(fin);
      p.lista = version === R.version;
    } catch (e) {
      if (e?.name !== "RenderingCancelledException") console.warn(`Página ${p.num}:`, e);
    } finally {
      if (version === R.version) p.renderizando = false;
    }
  }

  // ---------- Navegación ----------
  function paginaEnPantalla() {
    const s = scroller();
    const centro = s.scrollTop + s.clientHeight * 0.35;
    let lo = 0;
    let hi = R.paginas.length - 1;
    while (lo < hi) { // búsqueda binaria: las páginas están en columna
      const mid = (lo + hi + 1) >> 1;
      if (R.paginas[mid].el.offsetTop <= centro) lo = mid; else hi = mid - 1;
    }
    return R.paginas[lo];
  }

  function irAPagina(num, posicion = 0) {
    const p = R.paginas[Math.max(1, Math.min(num, R.paginas.length)) - 1];
    if (!p) return;
    scroller().scrollTop = p.el.offsetTop - 16 + posicion * p.el.offsetHeight;
    actualizarPaginaActual();
  }

  function actualizarPaginaActual() {
    if (!R.paginas.length) return;
    const p = paginaEnPantalla();
    R.actual = p.num;
    if (document.activeElement !== $("r-pagina")) $("r-pagina").value = p.num;
    $("r-progreso").style.width = `${(p.num / R.paginas.length) * 100}%`;
    const marcada = R.notas.marcadores.some((m) => m.pagina === p.num);
    $("r-marcar").setAttribute("aria-pressed", String(marcada));
    $("r-marcar").title = marcada ? "Quitar marcador de esta página (B)" : "Marcar esta página (B)";
    $("r-anterior").disabled = p.num <= 1;
    $("r-siguiente").disabled = p.num >= R.paginas.length;
  }

  function guardarProgreso(ahora = false) {
    clearTimeout(R.guardarTimer);
    const hacer = () => {
      if (!R.libro || !R.paginas.length) return;
      const p = paginaEnPantalla();
      const s = scroller();
      R.libro.pagina = p.num;
      R.libro.posicion = Math.max(0, Math.min(1, (s.scrollTop + 16 - p.el.offsetTop) / p.el.offsetHeight));
      R.libro.ultimaLectura = Date.now();
      LibrosDB.guardarLibro(R.libro).catch(() => {});
    };
    if (ahora) hacer(); else R.guardarTimer = setTimeout(hacer, 500);
  }

  function cambiarZoom(nuevo) {
    if (!R.libro) return;
    const p = paginaEnPantalla();
    const s = scroller();
    const pos = (s.scrollTop + 16 - p.el.offsetTop) / p.el.offsetHeight;
    R.libro.zoom = nuevo;
    calcularEscala();
    aplicarEscala();
    irAPagina(p.num, pos);
    guardarProgreso();
  }

  function pasoZoom(dir) {
    const actual = R.escala / CSS_UNITS;
    const sig = dir > 0 ? ZOOMS.find((z) => z > actual + 0.01) : [...ZOOMS].reverse().find((z) => z < actual - 0.01);
    if (sig) cambiarZoom(sig);
  }

  // ---------- Marcadores ----------
  function marcarPaginasConMarcador() {
    const conMarcador = new Set(R.notas.marcadores.map((m) => m.pagina));
    R.paginas.forEach((p) => p.el.classList.toggle("has-bookmark", conMarcador.has(p.num)));
  }

  function nombreSugerido(num) {
    const p = R.paginas[num - 1];
    // Usa la primera línea con texto de la página (normalmente el título o el inicio del capítulo).
    let texto = "";
    for (const item of p?.texto?.items || []) {
      texto += item.str;
      if (item.hasEOL) {
        if (texto.trim().length >= 4) break;
        texto += " ";
      }
    }
    texto = texto.replace(/\s+/g, " ").trim();
    if (!texto) return `Página ${num}`;
    return texto.length > 60 ? `${texto.slice(0, 60).trim()}…` : texto;
  }

  function alternarMarcador() {
    if (!R.libro) return;
    const num = R.actual;
    const existente = R.notas.marcadores.find((m) => m.pagina === num);
    if (existente) {
      R.notas.marcadores = R.notas.marcadores.filter((m) => m !== existente);
      toast(`Marcador de la página ${num} quitado.`);
    } else {
      R.notas.marcadores.push({ id: uid(), pagina: num, nombre: nombreSugerido(num), fecha: Date.now() });
      toast(`Página ${num} marcada.`);
    }
    guardarNotas();
  }

  // ---------- Resaltados ----------
  function pintarResaltados(p) {
    const lista = R.notas.resaltados.filter((h) => h.pagina === p.num);
    p.capaResaltados.replaceChildren(...lista.flatMap((h) => h.rects.map((r, i) => {
      const d = el("div", `hl hl-${h.color}`);
      d.dataset.id = h.id;
      Object.assign(d.style, { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
      if (i === 0 && h.nota) d.append(el("span", "hl-has-note", "📝"));
      return d;
    })));
  }

  function rectsDeSeleccion(rango, pagEl) {
    const caja = pagEl.getBoundingClientRect();
    const rects = [...rango.getClientRects()]
      .filter((r) => r.width > 1 && r.height > 1)
      .filter((r) => {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return cx >= caja.left && cx <= caja.right && cy >= caja.top && cy <= caja.bottom;
      })
      .map((r) => ({
        x: (r.left - caja.left) / caja.width,
        y: (r.top - caja.top) / caja.height,
        w: r.width / caja.width,
        h: r.height / caja.height,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x);

    // Une los trozos que están en la misma línea para que el resaltado se vea continuo.
    const unidos = [];
    for (const r of rects) {
      const prev = unidos[unidos.length - 1];
      const mismaLinea = prev && Math.abs((prev.y + prev.h / 2) - (r.y + r.h / 2)) < Math.min(prev.h, r.h) * 0.6;
      if (mismaLinea && r.x <= prev.x + prev.w + 0.02) {
        const x2 = Math.max(prev.x + prev.w, r.x + r.w);
        const y1 = Math.min(prev.y, r.y);
        const y2 = Math.max(prev.y + prev.h, r.y + r.h);
        prev.x = Math.min(prev.x, r.x);
        prev.w = x2 - prev.x;
        prev.y = y1;
        prev.h = y2 - y1;
      } else {
        unidos.push({ ...r });
      }
    }
    return unidos.map((r) => ({ x: +r.x.toFixed(5), y: +r.y.toFixed(5), w: +r.w.toFixed(5), h: +r.h.toFixed(5) }));
  }

  function revisarSeleccion() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { ocultarBarraResaltar(); return; }
    const texto = sel.toString().replace(/\s+/g, " ").trim();
    const nodo = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
    const pagEl = nodo?.closest(".pdf-page");
    if (!texto || !pagEl || !$("r-paginas").contains(pagEl)) { ocultarBarraResaltar(); return; }
    const rects = rectsDeSeleccion(sel.getRangeAt(0), pagEl);
    if (!rects.length) { ocultarBarraResaltar(); return; }
    R.seleccion = { pagina: +pagEl.dataset.page, rects, texto };

    const barra = $("hl-toolbar");
    barra.hidden = false;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const bw = barra.offsetWidth;
    const bh = barra.offsetHeight;
    let top = r.top - bh - 10;
    if (top < 70) top = r.bottom + 10;
    const left = Math.max(8, Math.min(window.innerWidth - bw - 8, r.left + r.width / 2 - bw / 2));
    barra.style.top = `${top}px`;
    barra.style.left = `${left}px`;
  }

  function ocultarBarraResaltar() {
    $("hl-toolbar").hidden = true;
    R.seleccion = null;
  }

  function crearResaltado(color, conNota) {
    if (!R.seleccion) return;
    const h = { id: uid(), ...R.seleccion, color, nota: "", fecha: Date.now() };
    R.notas.resaltados.push(h);
    window.getSelection()?.removeAllRanges();
    ocultarBarraResaltar();
    pintarResaltados(R.paginas[h.pagina - 1]);
    guardarNotas();
    if (conNota) abrirPopoverResaltado(h);
  }

  function resaltadoEnPunto(pagEl, x, y) {
    const caja = pagEl.getBoundingClientRect();
    const px = (x - caja.left) / caja.width;
    const py = (y - caja.top) / caja.height;
    const num = +pagEl.dataset.page;
    return [...R.notas.resaltados].reverse().find((h) => h.pagina === num
      && h.rects.some((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h));
  }

  // ---------- Ventana de nota ----------
  function posicionarPopover(ancla) {
    const pop = $("hl-popover");
    pop.hidden = false;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let top = ancla.bottom + 10;
    if (top + h > window.innerHeight - 8) top = Math.max(70, ancla.top - h - 10);
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, ancla.left + ancla.width / 2 - w / 2));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }

  function abrirPopoverResaltado(h) {
    R.editando = { tipo: "resaltado", item: h };
    const cita = $("hl-cita");
    cita.className = `hl-quote hl-quote-${h.color}`;
    cita.textContent = h.texto.length > 220 ? `${h.texto.slice(0, 220)}…` : h.texto;
    $("hl-nota").value = h.nota || "";
    $("hl-nota").placeholder = "Escribe una nota (opcional)…";
    const marca = R.paginas[h.pagina - 1]?.capaResaltados.querySelector(`[data-id="${h.id}"]`);
    posicionarPopover(marca ? marca.getBoundingClientRect() : centroPantalla());
    $("hl-nota").focus();
  }

  function abrirPopoverMarcador(m, ancla) {
    R.editando = { tipo: "marcador", item: m };
    $("hl-cita").className = "hl-quote hl-quote-marcador";
    $("hl-cita").textContent = `🔖 Página ${m.pagina}`;
    $("hl-nota").value = m.nombre;
    $("hl-nota").placeholder = "Nombre del marcador";
    posicionarPopover(ancla || centroPantalla());
    $("hl-nota").select();
  }

  const centroPantalla = () => ({ top: window.innerHeight / 2 - 80, bottom: window.innerHeight / 2 - 80, left: window.innerWidth / 2, width: 0 });

  function cerrarPopover() {
    $("hl-popover").hidden = true;
    R.editando = null;
  }

  function guardarPopover() {
    const e = R.editando;
    if (!e) return;
    const valor = $("hl-nota").value.trim();
    if (e.tipo === "resaltado") {
      e.item.nota = valor;
      pintarResaltados(R.paginas[e.item.pagina - 1]);
    } else {
      e.item.nombre = valor || `Página ${e.item.pagina}`;
    }
    guardarNotas();
    cerrarPopover();
  }

  function borrarDesdePopover() {
    const e = R.editando;
    if (!e) return;
    if (e.tipo === "resaltado") {
      R.notas.resaltados = R.notas.resaltados.filter((h) => h !== e.item);
      pintarResaltados(R.paginas[e.item.pagina - 1]);
      toast("Resaltado borrado.");
    } else {
      R.notas.marcadores = R.notas.marcadores.filter((m) => m !== e.item);
      toast("Marcador borrado.");
    }
    guardarNotas();
    cerrarPopover();
  }

  function guardarNotas() {
    marcarPaginasConMarcador();
    actualizarPaginaActual();
    pintarPanel();
    LibrosDB.guardarNotas(R.notas).catch((e) => toast(mensajeError(e), "error"));
  }

  // ---------- Panel lateral ----------
  function alternarPanel(forzar) {
    const panel = $("r-lateral");
    const abrir = forzar ?? panel.hidden;
    panel.hidden = !abrir;
    $("r-panel").setAttribute("aria-pressed", String(abrir));
    if (R.libro?.zoom === "ancho") cambiarZoom("ancho");
  }

  function elegirPestana(nombre) {
    document.querySelectorAll(".panel-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === nombre)));
    document.querySelectorAll(".panel-body").forEach((b) => { b.hidden = b.dataset.panel !== nombre; });
    if (nombre === "buscar") $("p-buscar").focus();
  }

  function destacarPagina(num) {
    const p = R.paginas[num - 1];
    if (!p) return;
    p.el.classList.remove("flash");
    void p.el.offsetWidth;
    p.el.classList.add("flash");
  }

  function botonIcono(texto, titulo, accion) {
    const b = el("button", "panel-icon", texto);
    b.type = "button";
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    b.addEventListener("click", (e) => { e.stopPropagation(); accion(e); });
    return b;
  }

  function pintarPanel() {
    if (!R.notas) return;
    const marcadores = [...R.notas.marcadores].sort((a, b) => a.pagina - b.pagina);
    $("p-marcadores").replaceChildren(...marcadores.map((m) => {
      const li = el("li", "panel-item");
      const ir = el("button", "panel-go");
      ir.type = "button";
      ir.append(el("span", "panel-page", `Pág. ${m.pagina}`), el("span", "panel-text", m.nombre));
      ir.addEventListener("click", () => { irAPagina(m.pagina); destacarPagina(m.pagina); });
      li.append(ir,
        botonIcono("✏️", "Cambiar nombre", (e) => abrirPopoverMarcador(m, e.currentTarget.getBoundingClientRect())),
        botonIcono("✕", "Borrar marcador", () => {
          R.notas.marcadores = R.notas.marcadores.filter((x) => x !== m);
          guardarNotas();
        }));
      return li;
    }));
    $("p-marcadores-vacio").hidden = marcadores.length > 0;

    const resaltados = [...R.notas.resaltados].sort((a, b) => a.pagina - b.pagina || a.rects[0].y - b.rects[0].y);
    $("p-resaltados").replaceChildren(...resaltados.map((h) => {
      const li = el("li", `panel-item panel-hl hl-border-${h.color}`);
      const ir = el("button", "panel-go");
      ir.type = "button";
      ir.append(el("span", "panel-page", `Pág. ${h.pagina} · ${COLORES[h.color]}`), el("span", "panel-text panel-quote", h.texto));
      if (h.nota) ir.append(el("span", "panel-note", `📝 ${h.nota}`));
      ir.addEventListener("click", () => {
        const p = R.paginas[h.pagina - 1];
        irAPagina(h.pagina, Math.max(0, h.rects[0].y - 0.15));
        p?.capaResaltados.querySelectorAll(`[data-id="${h.id}"]`).forEach((d) => {
          d.classList.remove("flash");
          void d.offsetWidth;
          d.classList.add("flash");
        });
      });
      li.append(ir,
        botonIcono("📝", "Editar nota", () => {
          irAPagina(h.pagina, Math.max(0, h.rects[0].y - 0.15));
          setTimeout(() => abrirPopoverResaltado(h), 50);
        }),
        botonIcono("✕", "Borrar resaltado", () => {
          R.notas.resaltados = R.notas.resaltados.filter((x) => x !== h);
          pintarResaltados(R.paginas[h.pagina - 1]);
          guardarNotas();
        }));
      return li;
    }));
    $("p-resaltados-vacio").hidden = resaltados.length > 0;
  }

  // ---------- Búsqueda en el libro ----------
  async function buscar(termino) {
    const id = ++R.busqueda;
    const q = normalizar(termino.trim());
    const estado = $("p-buscar-estado");
    const lista = $("p-resultados");
    lista.replaceChildren();
    if (q.length < 2) { estado.textContent = "Escribe al menos 2 letras."; return; }
    let total = 0;
    for (const p of R.paginas) {
      if (id !== R.busqueda || !R.pdf) return;
      if (p.num % 10 === 1) estado.textContent = `Buscando… página ${p.num} de ${R.paginas.length}`;
      try {
        p.page ||= await R.pdf.getPage(p.num);
        p.texto ||= await p.page.getTextContent();
      } catch { continue; }
      if (id !== R.busqueda) return;
      const original = p.texto.items.map((i) => i.str + (i.hasEOL ? " " : "")).join("").replace(/\s+/g, " ");
      const plano = normalizar(original);
      let desde = 0;
      let idx;
      while ((idx = plano.indexOf(q, desde)) !== -1 && total < 300) {
        total++;
        desde = idx + q.length;
        const li = el("li", "panel-item");
        const ir = el("button", "panel-go");
        ir.type = "button";
        const fragmento = el("span", "panel-text");
        const ini = Math.max(0, idx - 40);
        fragmento.append(
          (ini > 0 ? "…" : "") + original.slice(ini, idx),
          el("mark", "", original.slice(idx, idx + q.length)),
          original.slice(idx + q.length, idx + q.length + 60) + "…",
        );
        ir.append(el("span", "panel-page", `Pág. ${p.num}`), fragmento);
        const num = p.num;
        ir.addEventListener("click", () => { irAPagina(num); destacarPagina(num); });
        li.append(ir);
        lista.append(li);
      }
    }
    estado.textContent = total
      ? `${total >= 300 ? "Más de 300" : total} resultado${total === 1 ? "" : "s"}.`
      : "No se encontró ese texto. (Los PDF escaneados no tienen texto para buscar).";
  }

  // ---------- Eventos del lector ----------
  function configurarLector() {
    $("r-volver").addEventListener("click", () => { location.hash = ""; });
    $("r-anterior").addEventListener("click", () => irAPagina(R.actual - 1));
    $("r-siguiente").addEventListener("click", () => irAPagina(R.actual + 1));
    $("r-pagina").addEventListener("change", (e) => irAPagina(parseInt(e.target.value, 10) || 1));
    $("r-pagina").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
    $("r-menos").addEventListener("click", () => pasoZoom(-1));
    $("r-mas").addEventListener("click", () => pasoZoom(1));
    $("r-ajustar").addEventListener("click", () => cambiarZoom("ancho"));
    $("r-marcar").addEventListener("click", alternarMarcador);
    $("p-agregar-marcador").addEventListener("click", () => {
      if (!R.notas.marcadores.some((m) => m.pagina === R.actual)) alternarMarcador();
      else toast(`La página ${R.actual} ya tiene marcador.`, "info");
    });
    $("r-panel").addEventListener("click", () => alternarPanel());
    $("r-noche").addEventListener("click", () => {
      R.libro.noche = !R.libro.noche;
      $("vista-lector").classList.toggle("noche", R.libro.noche);
      $("r-noche").setAttribute("aria-pressed", String(R.libro.noche));
      guardarProgreso();
    });
    document.querySelectorAll(".panel-tab").forEach((t) => t.addEventListener("click", () => elegirPestana(t.dataset.tab)));
    $("p-buscar-form").addEventListener("submit", (e) => { e.preventDefault(); buscar($("p-buscar").value); });

    let pendienteScroll = false;
    scroller().addEventListener("scroll", () => {
      if (!$("hl-toolbar").hidden) ocultarBarraResaltar();
      if (pendienteScroll) return;
      pendienteScroll = true;
      setTimeout(() => {
        pendienteScroll = false;
        actualizarPaginaActual();
        guardarProgreso();
      }, 80);
    }, { passive: true });

    const paginasEl = $("r-paginas");
    paginasEl.addEventListener("mouseup", () => setTimeout(revisarSeleccion, 0));
    paginasEl.addEventListener("touchend", () => setTimeout(revisarSeleccion, 250));
    paginasEl.addEventListener("keyup", (e) => { if (e.shiftKey) revisarSeleccion(); });
    paginasEl.addEventListener("click", (e) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const pagEl = e.target.closest(".pdf-page");
      if (!pagEl) return;
      const h = resaltadoEnPunto(pagEl, e.clientX, e.clientY);
      if (h) abrirPopoverResaltado(h);
    });
    let movTimer = 0;
    paginasEl.addEventListener("mousemove", (e) => {
      if (movTimer) return;
      movTimer = setTimeout(() => { movTimer = 0; }, 60);
      const pagEl = e.target.closest(".pdf-page");
      if (pagEl) pagEl.classList.toggle("over-hl", !!resaltadoEnPunto(pagEl, e.clientX, e.clientY));
    });

    $("hl-toolbar").addEventListener("mousedown", (e) => e.preventDefault()); // no perder la selección
    document.querySelectorAll(".hl-color").forEach((b) => b.addEventListener("click", () => crearResaltado(b.dataset.color, false)));
    $("hl-con-nota").addEventListener("click", () => crearResaltado("amarillo", true));
    $("hl-guardar").addEventListener("click", guardarPopover);
    $("hl-borrar").addEventListener("click", borrarDesdePopover);
    $("hl-nota").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey || R.editando?.tipo === "marcador")) { e.preventDefault(); guardarPopover(); }
    });
    document.addEventListener("mousedown", (e) => {
      if (!$("hl-popover").hidden && !$("hl-popover").contains(e.target) && !e.target.closest(".panel-icon")) cerrarPopover();
    });

    document.addEventListener("keydown", (e) => {
      if ($("vista-lector").hidden) return;
      if (e.key === "Escape") {
        if (!$("hl-popover").hidden) cerrarPopover();
        else if (!$("hl-toolbar").hidden) { window.getSelection()?.removeAllRanges(); ocultarBarraResaltar(); }
        else if (!$("r-lateral").hidden) alternarPanel(false);
        return;
      }
      if (e.target.closest("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); irAPagina(R.actual + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); irAPagina(R.actual - 1); }
      else if (e.key === "+" || e.key === "=") pasoZoom(1);
      else if (e.key === "-") pasoZoom(-1);
      else if (e.key.toLowerCase() === "b") alternarMarcador();
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (R.libro?.zoom === "ancho") cambiarZoom("ancho"); }, 200);
    });
    const guardarAlSalir = () => { if (R.libro) guardarProgreso(true); };
    window.addEventListener("pagehide", guardarAlSalir);
    document.addEventListener("visibilitychange", () => { if (document.hidden) guardarAlSalir(); });
  }

  // =========================================================
  //  Inicio
  // =========================================================
  function ruta() {
    const m = location.hash.match(/^#leer=([\w-]+)$/);
    if (m) abrirLector(m[1]);
    else if (R.libro || !$("vista-lector").hidden) cerrarLector();
  }

  function iniciar() {
    $("btn-agregar").addEventListener("click", () => $("input-pdf").click());
    $("input-pdf").addEventListener("change", (e) => {
      agregarArchivos(e.target.files);
      e.target.value = "";
    });
    $("q").addEventListener("input", filtrar);
    $("btn-exportar").addEventListener("click", exportar);
    $("btn-importar").addEventListener("click", () => $("input-backup").click());
    $("input-backup").addEventListener("change", (e) => {
      if (e.target.files[0]) importar(e.target.files[0]);
      e.target.value = "";
    });
    $("year").textContent = new Date().getFullYear();
    const nav = document.querySelector(".site-nav");
    const sombra = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", sombra, { passive: true });
    sombra();

    configurarArrastre();
    configurarLector();
    window.addEventListener("hashchange", ruta);
    cargarBiblioteca().then(ruta);
  }

  iniciar();
})();
