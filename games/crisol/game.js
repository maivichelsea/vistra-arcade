// Crisol: combina elementos para descubrir otros nuevos.
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "vistra-crisol-v1";

  // ---------- Datos ----------
  const recetas = new Map();          // "A|B" (ordenado) -> resultado
  const ingredientesDe = new Map();   // resultado -> [[A, B], ...]
  const usados = new Set();           // elementos que sirven de ingrediente
  for (const linea of CRISOL_RECETAS.trim().split("\n")) {
    const m = linea.trim().match(/^(.+?) \+ (.+?) = (.+)$/);
    if (!m) continue;
    const [, a, b, r] = m;
    recetas.set(clave(a, b), r);
    if (!ingredientesDe.has(r)) ingredientesDe.set(r, []);
    ingredientesDe.get(r).push([a, b]);
    usados.add(a); usados.add(b);
  }
  const todos = new Set([...CRISOL_BASICOS, ...ingredientesDe.keys()]);
  const esFinal = (e) => !usados.has(e);
  function clave(a, b) { return [a, b].sort((x, y) => x.localeCompare(y, "es")).join("|"); }
  const emoji = (e) => CRISOL_EMOJI[e] || "✨";

  // ---------- Estado ----------
  let descubiertos = [];  // en orden de descubrimiento
  let orden = "az";
  function cargar() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && Array.isArray(s.descubiertos)) descubiertos = s.descubiertos.filter((e) => todos.has(e));
    } catch { /* sin guardado */ }
    for (const b of CRISOL_BASICOS) if (!descubiertos.includes(b)) descubiertos.unshift(b);
  }
  function guardar() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ descubiertos })); } catch { /* sin almacenamiento */ }
  }

  // ---------- Colección ----------
  const lista = $("coleccion");
  function pintarColeccion() {
    const q = $("buscar").value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/\p{M}/gu, "");
    let items = descubiertos.slice();
    if (orden === "az") items.sort((a, b) => a.localeCompare(b, "es"));
    else items.reverse();
    if (q) items = items.filter((e) => e.toLocaleLowerCase("es").normalize("NFD").replace(/\p{M}/gu, "").includes(q));
    const recientes = new Set(descubiertos.slice(-3));
    lista.replaceChildren(...items.map((e) => {
      const li = document.createElement("li");
      li.className = "item" + (recientes.has(e) && descubiertos.length > 4 ? " reciente" : "");
      li.dataset.elemento = e;
      li.title = esFinal(e) ? `${e} (elemento final)` : e;
      li.innerHTML = `<span class="emoji"></span><span class="nombre"></span>${esFinal(e) ? '<span class="final" aria-label="final">✦</span>' : ""}`;
      li.querySelector(".emoji").textContent = emoji(e);
      li.querySelector(".nombre").textContent = e;
      return li;
    }));
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "sin-resultados";
      li.textContent = q ? "Todavía no has descubierto nada con ese nombre." : "";
      lista.append(li);
    }
    $("cuenta").textContent = descubiertos.length;
    $("total").textContent = todos.size;
    $("progreso-fill").style.width = `${(descubiertos.length / todos.size) * 100}%`;
  }

  // ---------- Mesa ----------
  const mesa = $("mesa");
  function actualizarVacia() { $("mesa-vacia").hidden = !!mesa.querySelector(".ficha"); }

  function crearFicha(e, x, y, nueva = false) {
    const f = document.createElement("div");
    f.className = "ficha" + (nueva ? " nueva" : "");
    f.dataset.elemento = e;
    f.innerHTML = `<span class="emoji"></span><span class="nombre"></span>`;
    f.querySelector(".emoji").textContent = emoji(e);
    f.querySelector(".nombre").textContent = e;
    mesa.append(f);
    colocar(f, x, y);
    actualizarVacia();
    return f;
  }
  // x, y: centro de la ficha relativo a la mesa
  function colocar(f, x, y) {
    const w = f.offsetWidth || 84, h = f.offsetHeight || 70;
    const maxX = mesa.clientWidth - w, maxY = mesa.clientHeight - h;
    f.style.left = `${Math.max(0, Math.min(maxX, x - w / 2))}px`;
    f.style.top = `${Math.max(0, Math.min(maxY, y - h / 2))}px`;
  }
  function centro(f) { return { x: f.offsetLeft + f.offsetWidth / 2, y: f.offsetTop + f.offsetHeight / 2 }; }
  function lugarLibre() {
    const w = mesa.clientWidth, h = mesa.clientHeight;
    for (let i = 0; i < 30; i++) {
      const x = 60 + Math.random() * Math.max(1, w - 120), y = 50 + Math.random() * Math.max(1, h - 100);
      const choca = [...mesa.querySelectorAll(".ficha")].some((f) => { const c = centro(f); return Math.hypot(c.x - x, c.y - y) < 80; });
      if (!choca) return { x, y };
    }
    return { x: w / 2 + (Math.random() - .5) * 80, y: h / 2 + (Math.random() - .5) * 80 };
  }
  function fichaDebajo(x, y, excepto) {
    // x, y en coordenadas de la mesa
    let mejor = null, dist = Infinity;
    for (const f of mesa.querySelectorAll(".ficha")) {
      if (f === excepto) continue;
      const r = { l: f.offsetLeft, t: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight };
      if (x >= r.l - 6 && x <= r.l + r.w + 6 && y >= r.t - 6 && y <= r.t + r.h + 6) {
        const c = centro(f), d = Math.hypot(c.x - x, c.y - y);
        if (d < dist) { dist = d; mejor = f; }
      }
    }
    return mejor;
  }

  // ---------- Combinar ----------
  function combinar(a, b, x, y) {
    const r = recetas.get(clave(a, b));
    if (!r) return null;
    const nuevo = !descubiertos.includes(r);
    if (nuevo) {
      descubiertos.push(r);
      guardar();
      pintarColeccion();
      aviso(`<span class="grande">${emoji(r)}</span>¡Descubriste ${r}!<br><small>${emoji(a)} ${a} + ${emoji(b)} ${b}</small>` +
        (descubiertos.length === todos.size ? "<br>🏆 ¡Completaste el Crisol!" : ""), nuevo ? 2600 : 1500);
    }
    chispas(x, y);
    return r;
  }
  function chispas(x, y) {
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("span");
      s.className = "chispa";
      const ang = (Math.PI * 2 * i) / 10, d = 40 + Math.random() * 30;
      s.style.left = `${x - 4}px`; s.style.top = `${y - 4}px`;
      s.style.setProperty("--dx", `${Math.cos(ang) * d}px`);
      s.style.setProperty("--dy", `${Math.sin(ang) * d}px`);
      mesa.append(s);
      setTimeout(() => s.remove(), 650);
    }
  }

  let toastTimer;
  function aviso(html, ms = 2200) {
    const t = $("toast");
    t.innerHTML = html;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), ms);
  }

  // Suelta la ficha f (ya en la mesa) en su posición: combina si cae sobre otra.
  function soltarEnMesa(f) {
    const c = centro(f);
    const otra = fichaDebajo(c.x, c.y, f);
    if (!otra) return;
    const r = combinar(f.dataset.elemento, otra.dataset.elemento, c.x, c.y);
    if (r) {
      const co = centro(otra);
      f.remove(); otra.remove();
      crearFicha(r, (c.x + co.x) / 2, (c.y + co.y) / 2, true);
    } else {
      otra.classList.remove("nada"); void otra.offsetWidth; otra.classList.add("nada");
      f.classList.remove("nada"); void f.offsetWidth; f.classList.add("nada");
      // Rebota a un lado para que no quede tapando a la otra.
      const co = centro(otra);
      const ang = Math.atan2(c.y - co.y, c.x - co.x) || Math.random() * Math.PI * 2;
      setTimeout(() => colocar(f, co.x + Math.cos(ang) * 95, co.y + Math.sin(ang) * 85), 200);
    }
  }

  // ---------- Arrastrar ----------
  // Desde la mesa: se mueve la ficha. Desde la colección: se crea una ficha flotante.
  let drag = null;
  const posMesa = (e) => { const r = mesa.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, dentro: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; };

  mesa.addEventListener("pointerdown", (e) => {
    const f = e.target.closest(".ficha");
    if (!f || e.button > 0) return;
    e.preventDefault();
    const c = centro(f), p = posMesa(e);
    drag = { tipo: "mesa", f, dx: p.x - c.x, dy: p.y - c.y, sx: e.clientX, sy: e.clientY, movio: false };
    f.classList.add("arrastrando");
    f.setPointerCapture(e.pointerId);
  });

  lista.addEventListener("pointerdown", (e) => {
    const it = e.target.closest(".item");
    if (!it || e.button > 0) return;
    e.preventDefault();
    drag = { tipo: "lista", elemento: it.dataset.elemento, sx: e.clientX, sy: e.clientY, movio: false, flot: null };
    it.setPointerCapture(e.pointerId);
  });

  function marcarObjetivo(p, excepto) {
    mesa.querySelectorAll(".ficha.encima").forEach((x) => x.classList.remove("encima"));
    if (p.dentro) fichaDebajo(p.x, p.y, excepto)?.classList.add("encima");
  }

  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.movio && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.movio = true;
    if (!drag.movio) return;
    const p = posMesa(e);
    if (drag.tipo === "mesa") {
      colocar(drag.f, p.x - drag.dx, p.y - drag.dy);
      marcarObjetivo({ ...centro(drag.f), dentro: true }, drag.f);
    } else {
      if (!drag.flot) {
        drag.flot = document.createElement("div");
        drag.flot.className = "ficha flotante arrastrando";
        drag.flot.innerHTML = `<span class="emoji"></span><span class="nombre"></span>`;
        drag.flot.querySelector(".emoji").textContent = emoji(drag.elemento);
        drag.flot.querySelector(".nombre").textContent = drag.elemento;
        document.body.append(drag.flot);
      }
      drag.flot.style.left = `${e.clientX - 42}px`;
      drag.flot.style.top = `${e.clientY - 35}px`;
      mesa.classList.toggle("objetivo", p.dentro);
      marcarObjetivo(p, null);
    }
  });

  function terminar(e) {
    if (!drag) return;
    const d = drag; drag = null;
    mesa.classList.remove("objetivo");
    mesa.querySelectorAll(".ficha.encima").forEach((x) => x.classList.remove("encima"));
    const p = posMesa(e);
    if (d.tipo === "mesa") {
      d.f.classList.remove("arrastrando");
      if (!d.movio) return;
      // Fuera de la mesa (o sobre la colección): se quita.
      const sobreLista = lista.getBoundingClientRect();
      const enLista = e.clientX >= sobreLista.left && e.clientX <= sobreLista.right && e.clientY >= sobreLista.top && e.clientY <= sobreLista.bottom;
      if (!p.dentro || enLista) { d.f.remove(); actualizarVacia(); return; }
      soltarEnMesa(d.f);
    } else {
      d.flot?.remove();
      if (!d.movio) {
        const l = lugarLibre();
        crearFicha(d.elemento, l.x, l.y, true);
      } else if (p.dentro) {
        const f = crearFicha(d.elemento, p.x, p.y);
        soltarEnMesa(f);
      }
    }
  }
  document.addEventListener("pointerup", terminar);
  document.addEventListener("pointercancel", (e) => { if (drag) { drag.flot?.remove(); drag.f?.classList.remove("arrastrando"); drag = null; } });

  // Doble clic (o doble toque) en la mesa: duplicar.
  let ultimoToque = { f: null, t: 0 };
  mesa.addEventListener("pointerup", (e) => {
    const f = e.target.closest(".ficha");
    if (!f) return;
    const ahora = Date.now();
    if (ultimoToque.f === f && ahora - ultimoToque.t < 350) {
      const c = centro(f);
      crearFicha(f.dataset.elemento, c.x + 50, c.y + 30, true);
      ultimoToque = { f: null, t: 0 };
    } else ultimoToque = { f, t: ahora };
  });

  // ---------- Botones ----------
  $("btn-limpiar").addEventListener("click", () => { mesa.querySelectorAll(".ficha").forEach((f) => f.remove()); actualizarVacia(); });

  $("btn-pista").addEventListener("click", () => {
    const tengo = new Set(descubiertos);
    const posibles = [];
    for (const [r, pares] of ingredientesDe) {
      if (tengo.has(r)) continue;
      for (const [a, b] of pares) if (tengo.has(a) && tengo.has(b)) posibles.push([r, a, b]);
    }
    if (!posibles.length) { aviso("🏆 Ya descubriste todo lo que se puede crear."); return; }
    const [, a] = posibles[Math.floor(Math.random() * posibles.length)];
    aviso(`💡 Prueba a combinar <strong>${emoji(a)} ${a}</strong> con algo que ya tienes.`, 3500);
  });

  $("btn-reiniciar").addEventListener("click", () => {
    if (!confirm("¿Borrar todo lo que has descubierto y empezar de nuevo con los 4 elementos?")) return;
    descubiertos = CRISOL_BASICOS.slice();
    guardar();
    mesa.querySelectorAll(".ficha").forEach((f) => f.remove());
    actualizarVacia();
    pintarColeccion();
  });

  $("buscar").addEventListener("input", pintarColeccion);
  document.querySelectorAll("[data-orden]").forEach((b) => b.addEventListener("click", () => {
    orden = b.dataset.orden;
    document.querySelectorAll("[data-orden]").forEach((x) => x.classList.toggle("active", x === b));
    pintarColeccion();
  }));

  // ---------- Inicio ----------
  cargar();
  pintarColeccion();
  if (descubiertos.length === CRISOL_BASICOS.length) {
    const w = mesa.clientWidth, h = mesa.clientHeight;
    CRISOL_BASICOS.forEach((e, i) => crearFicha(e, w * (0.2 + 0.2 * i), h * 0.45));
  }
  actualizarVacia();
})();
