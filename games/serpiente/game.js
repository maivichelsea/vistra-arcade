// Serpiente Neón de Vistra Arcade.
(() => {
  const $ = (id) => document.getElementById(id);
  const SIZE = 20; // casillas por lado
  const SPEEDS = {
    lenta: { name: "Lenta", start: 170, min: 95, step: 2, points: 1 },
    normal: { name: "Normal", start: 125, min: 70, step: 2.5, points: 2 },
    rapida: { name: "Rápida", start: 90, min: 50, step: 2, points: 3 },
  };
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const KEYS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
  };
  const BONUS_EVERY = 5;      // una estrella cada 5 frutas
  const BONUS_TIME = 6000;    // ms que dura la estrella

  const canvas = $("board");
  const ctx = canvas.getContext("2d");
  const overlay = $("overlay");
  let speedKey = "normal";
  let state;
  let cell = 24;

  // ---------- Récords ----------
  const recordKey = (k) => `vistra_serpiente_record_${k}`;
  function getRecord(k) {
    try { return Number(localStorage.getItem(recordKey(k))) || 0; } catch { return 0; }
  }
  function setRecord(k, v) {
    try { localStorage.setItem(recordKey(k), String(v)); } catch { /* sin almacenamiento */ }
  }

  // ---------- Partida ----------
  function reset() {
    const mid = Math.floor(SIZE / 2);
    state = {
      snake: [{ x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }],
      dir: "right",
      queue: [],
      fruit: null,
      bonus: null,
      eaten: 0,
      score: 0,
      tick: SPEEDS[speedKey].start,
      last: 0,
      phase: "ready", // ready | playing | paused | over
      grow: 0,
    };
    state.fruit = freeCell();
    document.querySelectorAll(".level").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.speed === speedKey)));
    showOverlay("Serpiente Neón", "Pulsa una flecha o desliza el dedo para empezar.", "Jugar");
    updateHud();
  }

  function freeCell() {
    const taken = new Set(state.snake.map((p) => p.y * SIZE + p.x));
    if (state.fruit) taken.add(state.fruit.y * SIZE + state.fruit.x);
    if (state.bonus) taken.add(state.bonus.y * SIZE + state.bonus.x);
    const free = [];
    for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
    if (!free.length) return null;
    const i = free[Math.floor(Math.random() * free.length)];
    return { x: i % SIZE, y: Math.floor(i / SIZE) };
  }

  function start() {
    if (state.phase === "over") reset();
    state.phase = "playing";
    state.last = performance.now();
    if (state.bonus && state.bonus.left != null) {
      state.bonus.until = state.last + state.bonus.left; // la estrella no se gasta durante la pausa
      state.bonus.left = null;
    }
    overlay.hidden = true;
    updatePauseButton();
  }

  function togglePause() {
    if (state.phase === "playing") {
      state.phase = "paused";
      if (state.bonus) state.bonus.left = state.bonus.until - performance.now();
      showOverlay("Pausa", "Pulsa Espacio o el botón para seguir.", "Seguir");
    } else if (state.phase === "paused" || state.phase === "ready") {
      start();
    }
    updatePauseButton();
  }

  function turn(dir) {
    if (state.phase === "over") return;
    if (state.phase !== "playing") start();
    const lastDir = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    const a = DIRS[lastDir], b = DIRS[dir];
    if (dir === lastDir || (a.x + b.x === 0 && a.y + b.y === 0)) return; // ni repetir ni dar media vuelta
    if (state.queue.length < 3) state.queue.push(dir);
  }

  function step(now) {
    if (state.queue.length) state.dir = state.queue.shift();
    const d = DIRS[state.dir];
    const head = { x: state.snake[0].x + d.x, y: state.snake[0].y + d.y };

    // La cola se mueve en este paso (salvo que estemos creciendo), así que no cuenta como choque.
    const body = state.grow > 0 ? state.snake : state.snake.slice(0, -1);
    const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
    const hitSelf = body.some((p) => p.x === head.x && p.y === head.y);
    if (hitWall || hitSelf) return gameOver(hitWall ? "Chocaste con el borde." : "Te mordiste la cola.");

    state.snake.unshift(head);
    if (state.grow > 0) state.grow--;
    else state.snake.pop();

    const cfg = SPEEDS[speedKey];
    if (state.fruit && head.x === state.fruit.x && head.y === state.fruit.y) {
      state.eaten++;
      state.score += 10 * cfg.points;
      state.grow += 1;
      state.tick = Math.max(cfg.min, state.tick - cfg.step);
      state.fruit = freeCell();
      if (state.eaten % BONUS_EVERY === 0 && !state.bonus) {
        const spot = freeCell();
        if (spot) state.bonus = { ...spot, until: now + BONUS_TIME };
      }
      burst(head, "#ff4fd8");
    }
    if (state.bonus && head.x === state.bonus.x && head.y === state.bonus.y) {
      const left = Math.max(0, state.bonus.until - now) / BONUS_TIME;
      state.score += Math.round((25 + 25 * left) * cfg.points);
      state.grow += 2;
      state.bonus = null;
      burst(head, "#ffd54a");
    }
    if (!state.fruit) return gameOver("¡Llenaste todo el tablero!", true);
    updateHud();
  }

  function gameOver(reason, won = false) {
    state.phase = "over";
    const record = getRecord(speedKey);
    const isRecord = state.score > record;
    if (isRecord) setRecord(speedKey, state.score);
    updateHud();
    const title = won ? "🏆 ¡Increíble!" : isRecord ? "🏆 ¡Nuevo récord!" : "Fin de la partida";
    showOverlay(title, `${reason} Hiciste ${state.score} puntos con ${state.snake.length} de largo.`, "Jugar otra vez");
    updatePauseButton();
  }

  // ---------- Interfaz ----------
  function showOverlay(title, text, button) {
    $("overlay-title").textContent = title;
    $("overlay-text").textContent = text;
    $("overlay-btn").textContent = button;
    overlay.hidden = false;
  }

  function updateHud() {
    $("score").textContent = state.score;
    $("best").textContent = getRecord(speedKey);
    $("length").textContent = state.snake.length + state.grow;
    const cfg = SPEEDS[speedKey];
    $("speed-now").textContent = `${(cfg.start / state.tick).toFixed(1).replace(".", ",")}×`;
  }

  function updatePauseButton() {
    const btn = $("pause");
    const paused = state.phase !== "playing";
    btn.textContent = paused ? "▶" : "⏸";
    btn.setAttribute("aria-label", paused ? "Jugar" : "Pausar");
    btn.title = paused ? "Jugar (Espacio)" : "Pausa (Espacio)";
  }

  // ---------- Dibujo ----------
  const particles = [];
  function burst(p, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.6;
      particles.push({ x: p.x + 0.5, y: p.y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(canvas.getBoundingClientRect().width * dpr) || 480;
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    cell = canvas.width / SIZE;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function star(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function draw(now) {
    const W = canvas.width;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = "#07051a";
    ctx.fillRect(0, 0, W, W);

    // Cuadrícula tenue
    ctx.strokeStyle = "rgba(123, 116, 255, .08)";
    ctx.lineWidth = Math.max(1, cell * 0.04);
    ctx.beginPath();
    for (let i = 1; i < SIZE; i++) {
      ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, W);
      ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell);
    }
    ctx.stroke();

    const pulse = 0.5 + 0.5 * Math.sin(now / 220);

    // Fruta
    if (state.fruit) {
      const fx = (state.fruit.x + 0.5) * cell, fy = (state.fruit.y + 0.5) * cell;
      ctx.shadowColor = "#ff4fd8";
      ctx.shadowBlur = cell * (0.6 + 0.4 * pulse);
      ctx.fillStyle = "#ff4fd8";
      ctx.beginPath();
      ctx.arc(fx, fy, cell * (0.3 + 0.04 * pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.beginPath();
      ctx.arc(fx - cell * 0.1, fy - cell * 0.1, cell * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

    // Estrella dorada (bonus)
    if (state.bonus) {
      const left = (state.bonus.left != null ? state.bonus.left : state.bonus.until - now) / BONUS_TIME;
      if (state.phase === "playing" && left <= 0) state.bonus = null;
      else {
        const bx = (state.bonus.x + 0.5) * cell, by = (state.bonus.y + 0.5) * cell;
        ctx.shadowColor = "#ffd54a";
        ctx.shadowBlur = cell;
        ctx.fillStyle = left < 0.3 && Math.floor(now / 120) % 2 ? "rgba(255,213,74,.4)" : "#ffd54a";
        star(bx, by, cell * 0.45);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,213,74,.55)";
        ctx.lineWidth = cell * 0.08;
        ctx.beginPath();
        ctx.arc(bx, by, cell * 0.7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left));
        ctx.stroke();
      }
    }

    // Serpiente: del verde neón de la cabeza al cian de la cola
    const n = state.snake.length;
    ctx.shadowColor = "#6dffb0";
    ctx.shadowBlur = cell * 0.5;
    for (let i = n - 1; i >= 0; i--) {
      const p = state.snake[i];
      const t = n > 1 ? i / (n - 1) : 0;
      const hue = 150 + 40 * t, light = 62 - 14 * t;
      ctx.fillStyle = `hsl(${hue} 100% ${light}%)`;
      const pad = i === 0 ? cell * 0.06 : cell * (0.1 + 0.06 * t);
      roundRect(p.x * cell + pad, p.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.28);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ojos
    const h = state.snake[0], d = DIRS[state.queue[0] || state.dir];
    const cx = (h.x + 0.5) * cell, cy = (h.y + 0.5) * cell;
    const ox = -d.y * cell * 0.18, oy = d.x * cell * 0.18, fx = d.x * cell * 0.12, fy = d.y * cell * 0.12;
    [[1], [-1]].forEach(([s]) => {
      ctx.fillStyle = "#07051a";
      ctx.beginPath();
      ctx.arc(cx + ox * s + fx, cy + oy * s + fy, cell * 0.09, 0, Math.PI * 2);
      ctx.fill();
    });

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.x += q.vx * 0.08; q.y += q.vy * 0.08; q.life -= 0.035;
      if (q.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = q.life;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x * cell - cell * 0.06, q.y * cell - cell * 0.06, cell * 0.12, cell * 0.12);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (state.phase === "playing") {
      // Si la pestaña estuvo oculta, no recupera todos los pasos de golpe.
      if (now - state.last > 1000) state.last = now - state.tick;
      while (state.phase === "playing" && now - state.last >= state.tick) {
        state.last += state.tick;
        step(now);
      }
    }
    resize();
    draw(now);
    requestAnimationFrame(loop);
  }

  // ---------- Controles ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYS[key]) {
      e.preventDefault();
      turn(KEYS[key]);
    } else if (key === " " || key === "p") {
      e.preventDefault();
      if (state.phase === "over") start();
      else togglePause();
    } else if (key === "Enter" && !e.target.closest("button, summary")) {
      reset();
      start();
    }
  });

  // Deslizar el dedo sobre el tablero
  let touch = null;
  canvas.addEventListener("pointerdown", (e) => {
    touch = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    touch = { x: e.clientX, y: e.clientY }; // permite encadenar giros sin levantar el dedo
  });
  ["pointerup", "pointercancel"].forEach((t) => canvas.addEventListener(t, () => { touch = null; }));
  overlay.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    touch = { x: e.clientX, y: e.clientY };
  });
  overlay.addEventListener("pointermove", (e) => {
    if (!touch || state.phase === "over") return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    touch = null;
  });
  overlay.addEventListener("pointerup", () => { touch = null; });

  // Cruceta
  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      turn(btn.dataset.dir);
    });
  });

  $("overlay-btn").addEventListener("click", () => {
    if (state.phase === "paused" || state.phase === "ready") togglePause();
    else start();
  });
  $("pause").addEventListener("click", () => {
    if (state.phase === "over") start();
    else togglePause();
  });
  document.querySelectorAll(".level").forEach((btn) => btn.addEventListener("click", () => {
    speedKey = btn.dataset.speed;
    reset();
    btn.blur();
  }));

  // Si cambias de pestaña, la partida se pausa sola.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === "playing") togglePause();
  });

  reset();
  updatePauseButton();
  requestAnimationFrame(loop);
})();
