// Billar de Vistra Arcade: bola 8 contra el ordenador o 2 jugadores en el mismo PC.
// Física propia en un canvas: bolas, bandas con troneras, fricción y colisiones elásticas.

// ---------- Mesa (unidades lógicas) ----------
const W = 1000;            // ancho del paño (entre bandas)
const H = 500;             // alto del paño
const R = 11;              // radio de bola
const RAIL = 42;           // grosor de la banda de madera
const CANVAS_W = W + RAIL * 2;
const CANVAS_H = H + RAIL * 2;
const HEAD_X = W * 0.25;   // línea de salida (cocina)
const FOOT = { x: W * 0.73, y: H / 2 };

const CORNER_GAP = 30;     // hueco de la banda en troneras de esquina
const MID_GAP = 24;        // hueco en troneras del centro
const POCKETS = [
  { x: -6, y: -6, r: 26 }, { x: W / 2, y: -15, r: 23 }, { x: W + 6, y: -6, r: 26 },
  { x: -6, y: H + 6, r: 26 }, { x: W / 2, y: H + 15, r: 23 }, { x: W + 6, y: H + 6, r: 26 },
];
// Bandas (segmentos) con las bocas de las troneras.
const CUSHIONS = [
  [CORNER_GAP, 0, W / 2 - MID_GAP, 0], [W / 2 + MID_GAP, 0, W - CORNER_GAP, 0],
  [CORNER_GAP, H, W / 2 - MID_GAP, H], [W / 2 + MID_GAP, H, W - CORNER_GAP, H],
  [0, CORNER_GAP, 0, H - CORNER_GAP], [W, CORNER_GAP, W, H - CORNER_GAP],
  // Mandíbulas inclinadas hacia cada tronera.
  [CORNER_GAP, 0, CORNER_GAP - 16, -16], [0, CORNER_GAP, -16, CORNER_GAP - 16],
  [W - CORNER_GAP, 0, W - CORNER_GAP + 16, -16], [W, CORNER_GAP, W + 16, CORNER_GAP - 16],
  [CORNER_GAP, H, CORNER_GAP - 16, H + 16], [0, H - CORNER_GAP, -16, H - CORNER_GAP + 16],
  [W - CORNER_GAP, H, W - CORNER_GAP + 16, H + 16], [W, H - CORNER_GAP, W + 16, H - CORNER_GAP + 16],
  [W / 2 - MID_GAP, 0, W / 2 - MID_GAP + 5, -18], [W / 2 + MID_GAP, 0, W / 2 + MID_GAP - 5, -18],
  [W / 2 - MID_GAP, H, W / 2 - MID_GAP + 5, H + 18], [W / 2 + MID_GAP, H, W / 2 + MID_GAP - 5, H + 18],
];

// ---------- Física ----------
const MAX_SPEED = 2300;    // velocidad de la blanca a máxima potencia (px/s)
const ROLL_DECEL = 170;    // frenado constante del paño (px/s²)
const DRAG = 0.32;         // frenado proporcional a la velocidad
const BALL_RESTITUTION = 0.96;
const CUSHION_RESTITUTION = 0.76;
const STEP = 1 / 480;      // paso fijo de simulación

const BALL_COLORS = {
  1: "#f5c518", 2: "#1d4ed8", 3: "#dc2626", 4: "#7c3aed", 5: "#f97316", 6: "#15803d", 7: "#7f1d1d", 8: "#111111",
};
const colorOf = (n) => BALL_COLORS[n > 8 ? n - 8 : n];
const typeOf = (n) => (n === 0 ? "cue" : n === 8 ? "eight" : n < 8 ? "solids" : "stripes");
const GROUP_NAMES = { solids: "lisas", stripes: "rayadas" };

const $ = (id) => document.getElementById(id);
const canvas = $("table");
const ctx = canvas.getContext("2d");

// ---------- Estado ----------
let balls = [];            // { n, x, y, vx, vy, out }
let players = [];          // { name, group, cpu }
let turn = 0;
let state = "menu";        // menu | placing | aiming | moving | cpu | over
let ballInHand = false;
let kitchenOnly = false;   // en la salida, la blanca solo se coloca detrás de la línea
let isBreak = true;
let shot = null;           // registro del tiro en curso
let aim = 0;               // ángulo del taco (radianes)
let power = 0.6;
let dragging = null;       // { x, y } al arrastrar para dar potencia
let pointer = { x: W / 2, y: H / 2, inside: false };
let breaker = 0;
let mode = 1;
let lastTime = 0;
let accumulator = 0;

const cueBall = () => balls.find((b) => b.n === 0);
const onTable = () => balls.filter((b) => !b.out);
const current = () => players[turn];
const isHumanTurn = () => !current().cpu;

// ---------- Utilidades geométricas ----------
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
function closestOnSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return { x: x1 + t * dx, y: y1 + t * dy };
}
function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const c = closestOnSegment(px, py, [ax, ay, bx, by]);
  return dist(px, py, c.x, c.y);
}

// ---------- Preparar partida ----------
function rack() {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  // Las esquinas traseras llevan una lisa y una rayada; el 8 va en el centro.
  const solid = numbers.splice(Math.floor(Math.random() * 7), 1)[0];
  const stripe = numbers.splice(7 + Math.floor(Math.random() * 6) - 1, 1)[0];
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  const spots = [];
  const dx = R * Math.sqrt(3) + 0.3;
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k <= row; k++) spots.push({ row, k, x: FOOT.x + row * dx, y: FOOT.y + (k - row / 2) * (2 * R + 0.3) });
  }
  const result = [];
  spots.forEach(({ row, k, x, y }) => {
    let n;
    if (row === 2 && k === 1) n = 8;
    else if (row === 4 && k === 0) n = Math.random() < 0.5 ? solid : stripe;
    else if (row === 4 && k === 4) n = result.some((b) => b.n === solid) ? stripe : solid;
    else n = numbers.pop();
    result.push({ n, x, y, vx: 0, vy: 0, out: false });
  });
  return result;
}

function newGame() {
  balls = [{ n: 0, x: HEAD_X - 60, y: H / 2, vx: 0, vy: 0, out: false }, ...rack()];
  players.forEach((p) => { p.group = null; });
  turn = breaker;
  isBreak = true;
  shot = null;
  aim = 0;
  power = 0.85;
  setBallInHand(true, true);
  hideOverlay();
  updateHud();
  say(`${current().name} rompe. Coloca la blanca detrás de la línea y tira.`);
  startTurn();
}

function setBallInHand(value, kitchen = false) {
  ballInHand = value;
  kitchenOnly = kitchen;
}

function startTurn() {
  updateHud();
  if (current().cpu) {
    state = "cpu";
    setTimeout(cpuPlay, 700);
    return;
  }
  state = ballInHand ? "placing" : "aiming";
}

// ---------- Física ----------
function simulate(dt) {
  const live = onTable();
  for (const b of live) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed === 0) continue;
    const next = Math.max(0, speed - (ROLL_DECEL + DRAG * speed) * dt);
    if (next < 3) { b.vx = 0; b.vy = 0; continue; }
    b.vx *= next / speed;
    b.vy *= next / speed;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  // Choques entre bolas
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= 2 * R || d === 0) continue;
      const nx = dx / d, ny = dy / d;
      const overlap = 2 * R - d;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      const impulse = rel * (1 + BALL_RESTITUTION) / 2;
      a.vx -= impulse * nx; a.vy -= impulse * ny;
      b.vx += impulse * nx; b.vy += impulse * ny;
      if (shot) {
        if (a.n === 0 && shot.firstHit === null) shot.firstHit = b.n;
        else if (b.n === 0 && shot.firstHit === null) shot.firstHit = a.n;
      }
    }
  }

  // Bandas y troneras
  for (const b of live) {
    for (const seg of CUSHIONS) {
      const c = closestOnSegment(b.x, b.y, seg);
      const dx = b.x - c.x, dy = b.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d >= R || d === 0) continue;
      const nx = dx / d, ny = dy / d;
      b.x += nx * (R - d); b.y += ny * (R - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + CUSHION_RESTITUTION) * vn * nx;
        b.vy -= (1 + CUSHION_RESTITUTION) * vn * ny;
        b.vx *= 0.97; b.vy *= 0.97;
      }
    }
    const inPocket = POCKETS.some((p) => dist(b.x, b.y, p.x, p.y) < p.r - 2);
    const escaped = b.x < -R * 2 || b.x > W + R * 2 || b.y < -R * 2 || b.y > H + R * 2;
    if (inPocket || escaped) pocket(b);
  }
}

function pocket(b) {
  b.out = true;
  b.vx = 0; b.vy = 0;
  if (shot) shot.potted.push(b.n);
}

const moving = () => onTable().some((b) => b.vx !== 0 || b.vy !== 0);

// ---------- Tiro ----------
function shoot(angle, strength) {
  const cue = cueBall();
  shot = { firstHit: null, potted: [], wasBreak: isBreak };
  const speed = Math.max(0.04, strength) * MAX_SPEED;
  cue.vx = Math.cos(angle) * speed;
  cue.vy = Math.sin(angle) * speed;
  setBallInHand(false);
  dragging = null;
  state = "moving";
  say("");
}

// Reglas de bola 8 (simplificadas, sin cantar tronera).
function resolveShot() {
  const me = current();
  const other = players[1 - turn];
  const { firstHit, potted, wasBreak } = shot;
  const cueIn = potted.includes(0);
  const eightIn = potted.includes(8);
  const objectPotted = potted.filter((n) => n !== 0 && n !== 8);
  const myGroupBefore = me.group;
  const clearedBefore = myGroupBefore && remaining(myGroupBefore, potted) === 0;
  isBreak = false;

  // ¿Falta?
  let foul = null;
  if (firstHit === null) foul = "no tocó ninguna bola";
  else if (myGroupBefore) {
    const legal = clearedBefore ? 8 : null;
    if (legal === 8 && firstHit !== 8) foul = "tenía que tocar primero la bola 8";
    if (legal === null && typeOf(firstHit) !== myGroupBefore) foul = `tocó primero una bola que no es de sus ${GROUP_NAMES[myGroupBefore]}`;
  } else if (firstHit === 8 && !wasBreak) foul = "tocó primero la bola 8";
  if (cueIn) foul = foul ? `${foul} y metió la blanca` : "metió la blanca";

  // Bola 8
  if (eightIn) {
    if (wasBreak) {
      respot(8);
    } else if (clearedBefore && !foul) {
      return endGame(turn, `${me.name} mete la bola 8 y gana la partida.`);
    } else {
      const why = !clearedBefore ? "metió la bola 8 antes de tiempo" : `metió la bola 8 con falta (${foul})`;
      return endGame(1 - turn, `${me.name} ${why}. Gana ${other.name}.`);
    }
  }

  if (cueIn) {
    const cue = cueBall();
    cue.out = false;
    cue.x = HEAD_X - 60; cue.y = H / 2; cue.vx = 0; cue.vy = 0;
  }

  // Asignar grupos con la primera bola metida tras la salida.
  if (!me.group && !wasBreak && !foul && objectPotted.length) {
    me.group = typeOf(objectPotted[0]);
    other.group = me.group === "solids" ? "stripes" : "solids";
    say(`${me.name} juega con las ${GROUP_NAMES[me.group]} y ${other.name} con las ${GROUP_NAMES[other.group]}.`);
  }

  const scoredOwn = me.group
    ? objectPotted.some((n) => typeOf(n) === me.group)
    : objectPotted.length > 0;

  if (foul) {
    turn = 1 - turn;
    setBallInHand(true, false);
    say(`Falta: ${me.name} ${foul}. Bola en mano para ${players[turn].name}.`);
  } else if (scoredOwn) {
    if (!(me.group && !myGroupBefore)) say(`${me.name} sigue tirando.`);
  } else {
    turn = 1 - turn;
    say(`Turno de ${players[turn].name}.`);
  }
  shot = null;
  startTurn();
}

// Bolas del grupo que siguen en la mesa (sin contar las metidas en este tiro).
function remaining(group, alsoPotted = []) {
  return balls.filter((b) => typeOf(b.n) === group && (!b.out || alsoPotted.includes(b.n))).length;
}

function respot(n) {
  const b = balls.find((x) => x.n === n);
  b.out = false; b.vx = 0; b.vy = 0;
  let x = FOOT.x;
  while (onTable().some((o) => o !== b && dist(o.x, o.y, x, FOOT.y) < 2 * R + 1)) x += 2 * R + 1;
  b.x = Math.min(x, W - R); b.y = FOOT.y;
}

function endGame(winner, text) {
  state = "over";
  shot = null;
  breaker = 1 - breaker;
  say("");
  updateHud(winner);
  showOverlay(`🏆 Gana ${players[winner].name}`, text);
}

// ---------- Colocar la blanca ----------
function validCuePosition(x, y) {
  if (x < R || x > W - R || y < R || y > H - R) return false;
  if (kitchenOnly && x > HEAD_X) return false;
  return onTable().every((b) => b.n === 0 || dist(b.x, b.y, x, y) > 2 * R + 0.5);
}

function placeCue(x, y) {
  if (!validCuePosition(x, y)) return false;
  const cue = cueBall();
  cue.x = x; cue.y = y; cue.out = false;
  setBallInHand(false, kitchenOnly);
  return true;
}

// ---------- Ordenador ----------
function legalTargets(player) {
  const live = onTable().filter((b) => b.n !== 0);
  if (!player.group) return live.filter((b) => b.n !== 8);
  const mine = live.filter((b) => typeOf(b.n) === player.group);
  return mine.length ? mine : live.filter((b) => b.n === 8);
}

function pathClear(ax, ay, bx, by, ignore) {
  return onTable().every((o) => ignore.includes(o) || pointSegmentDistance(o.x, o.y, ax, ay, bx, by) > 2 * R - 0.5);
}

// Busca el mejor tiro directo: bola objetivo → tronera, con la blanca libre hasta la "bola fantasma".
function planShot(cue, player) {
  let best = null;
  for (const t of legalTargets(player)) {
    for (const p of POCKETS) {
      const px = p.x + (W / 2 - p.x) * 0.02, py = p.y + (H / 2 - p.y) * 0.04;
      const tpx = px - t.x, tpy = py - t.y;
      const tpLen = Math.hypot(tpx, tpy);
      const ux = tpx / tpLen, uy = tpy / tpLen;
      const gx = t.x - ux * 2 * R, gy = t.y - uy * 2 * R;
      if (gx < R || gx > W - R || gy < R || gy > H - R) continue;
      const cgx = gx - cue.x, cgy = gy - cue.y;
      const cgLen = Math.hypot(cgx, cgy);
      if (cgLen < 1) continue;
      const cut = Math.acos(Math.max(-1, Math.min(1, (cgx * ux + cgy * uy) / cgLen)));
      if (cut > 1.3) continue;
      if (!pathClear(cue.x, cue.y, gx, gy, [cue, t])) continue;
      if (!pathClear(t.x, t.y, px, py, [t, cue])) continue;
      const score = Math.cos(cut) * 2 - cgLen / 1400 - tpLen / 1400;
      if (!best || score > best.score) {
        best = { score, angle: Math.atan2(cgy, cgx), power: Math.min(0.95, Math.max(0.28, (cgLen + tpLen * 1.5) / 1500 / Math.max(0.35, Math.cos(cut)) + 0.12)), target: t, ghost: { x: gx, y: gy }, dir: { x: ux, y: uy } };
      }
    }
  }
  return best;
}

function cpuPlaceCue() {
  const cue = cueBall();
  const player = current();
  if (kitchenOnly) {
    for (let i = 0; i < 20; i++) {
      if (placeCue(HEAD_X - 30 - Math.random() * 80, H / 2 + (Math.random() - 0.5) * 160)) return;
    }
    placeCue(HEAD_X - 60, H / 2);
    return;
  }
  // Busca una posición para un tiro recto a una tronera.
  let bestPos = null;
  for (const t of legalTargets(player)) {
    for (const p of POCKETS) {
      const ux = (p.x - t.x), uy = (p.y - t.y);
      const len = Math.hypot(ux, uy);
      for (const back of [90, 140, 200, 260]) {
        const x = t.x - ux / len * (2 * R + back), y = t.y - uy / len * (2 * R + back);
        if (!validCuePosition(x, y)) continue;
        cue.x = x; cue.y = y; cue.out = false;
        const plan = planShot(cue, player);
        if (plan && (!bestPos || plan.score > bestPos.score)) bestPos = { x, y, score: plan.score };
      }
    }
  }
  if (bestPos && placeCue(bestPos.x, bestPos.y)) return;
  for (let i = 0; i < 50; i++) if (placeCue(R + Math.random() * (W - 2 * R), R + Math.random() * (H - 2 * R))) return;
}

function cpuPlay() {
  if (state !== "cpu") return;
  const player = current();
  if (ballInHand) cpuPlaceCue();
  const cue = cueBall();
  let angle, strength;
  if (isBreak) {
    angle = Math.atan2(FOOT.y - cue.y, FOOT.x - cue.x) + (Math.random() - 0.5) * 0.01;
    strength = 1;
  } else {
    const plan = planShot(cue, player);
    if (plan) {
      angle = plan.angle + (Math.random() - 0.5) * 0.022; // pequeño error humano
      strength = plan.power;
    } else {
      // Sin tiro claro: tocar la bola legal más cercana.
      const targets = legalTargets(player).sort((a, b) => dist(cue.x, cue.y, a.x, a.y) - dist(cue.x, cue.y, b.x, b.y));
      const t = targets[0];
      angle = t ? Math.atan2(t.y - cue.y, t.x - cue.x) : Math.random() * Math.PI * 2;
      strength = 0.55;
    }
  }
  // Animación de apuntado antes de tirar.
  const from = aim;
  let diff = ((angle - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const start = performance.now();
  const animate = (now) => {
    if (state !== "cpu") return;
    const t = Math.min(1, (now - start) / 700);
    aim = from + diff * (1 - (1 - t) ** 3);
    power = strength * Math.min(1, t * 1.3);
    if (t < 1) return requestAnimationFrame(animate);
    setTimeout(() => { if (state === "cpu") shoot(angle, strength); }, 250);
  };
  requestAnimationFrame(animate);
}

// ---------- Entrada ----------
function toTable(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / CANVAS_W;
  return { x: (e.clientX - rect.left) / scale - RAIL, y: (e.clientY - rect.top) / scale - RAIL };
}

canvas.addEventListener("pointermove", (e) => {
  const p = toTable(e);
  pointer = { ...p, inside: true };
  if (state === "aiming" && !dragging) {
    const cue = cueBall();
    aim = Math.atan2(p.y - cue.y, p.x - cue.x);
  }
  if (state === "aiming" && dragging) {
    // Arrastrar hacia atrás (alejándose de la dirección de tiro) carga potencia.
    const back = -((p.x - dragging.x) * Math.cos(aim) + (p.y - dragging.y) * Math.sin(aim));
    power = Math.max(0, Math.min(1, back / 220));
    updatePowerUi();
  }
});
canvas.addEventListener("pointerleave", () => { pointer.inside = false; });

canvas.addEventListener("pointerdown", (e) => {
  if (!isHumanTurn()) return;
  const p = toTable(e);
  if (state === "placing") {
    if (placeCue(p.x, p.y)) {
      state = "aiming";
      say(kitchenOnly ? "Apunta con el ratón. Mantén pulsado y arrastra hacia atrás para dar fuerza." : "Apunta y tira.");
    } else {
      say(kitchenOnly ? "Coloca la blanca a la izquierda de la línea, sin tocar otras bolas." : "Ahí no cabe la blanca.");
    }
    return;
  }
  if (state === "aiming") {
    canvas.setPointerCapture(e.pointerId);
    dragging = { x: p.x, y: p.y };
    power = 0;
    updatePowerUi();
  }
});

canvas.addEventListener("pointerup", () => {
  if (state !== "aiming" || !dragging) return;
  const strength = power;
  dragging = null;
  if (strength < 0.04) { power = Number($("power").value) / 100; updatePowerUi(); return; }
  shoot(aim, strength);
});

// Teclado: flechas para afinar, espacio para tirar con la potencia del control.
addEventListener("keydown", (e) => {
  if (state !== "aiming" || !isHumanTurn() || e.target.tagName === "INPUT" && e.target.type !== "range") return;
  const fine = e.shiftKey ? 0.002 : 0.012;
  if (e.key === "ArrowLeft") { aim -= fine; e.preventDefault(); }
  if (e.key === "ArrowRight") { aim += fine; e.preventDefault(); }
  if (e.key === "ArrowUp") { power = Math.min(1, power + 0.05); updatePowerUi(); e.preventDefault(); }
  if (e.key === "ArrowDown") { power = Math.max(0.04, power - 0.05); updatePowerUi(); e.preventDefault(); }
  if (e.key === " ") { e.preventDefault(); shoot(aim, power); }
});

$("power").addEventListener("input", () => {
  power = Number($("power").value) / 100;
  updatePowerUi();
});
$("shoot-btn").addEventListener("click", () => {
  if (state === "aiming" && isHumanTurn()) shoot(aim, power);
});

function updatePowerUi() {
  const pct = Math.round(power * 100);
  $("power").value = pct;
  $("power-value").textContent = `${pct}%`;
  $("power-fill").style.width = `${pct}%`;
}

// ---------- Dibujo ----------
function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(width * CANVAS_H / CANVAS_W * dpr);
}

function drawTable() {
  // Madera
  const wood = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  wood.addColorStop(0, "#3a2a5c");
  wood.addColorStop(1, "#1d1436");
  ctx.fillStyle = wood;
  roundRect(0, 0, CANVAS_W, CANVAS_H, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 2;
  roundRect(6, 6, CANVAS_W - 12, CANVAS_H - 12, 22);
  ctx.stroke();

  ctx.save();
  ctx.translate(RAIL, RAIL);

  // Paño
  const felt = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.65);
  felt.addColorStop(0, "#3b33d6");
  felt.addColorStop(1, "#241c9a");
  ctx.fillStyle = felt;
  ctx.fillRect(-4, -4, W + 8, H + 8);

  // Línea de salida y punto de pie
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(HEAD_X, 0); ctx.lineTo(HEAD_X, H); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.beginPath(); ctx.arc(FOOT.x, FOOT.y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(HEAD_X, H / 2, 3, 0, Math.PI * 2); ctx.fill();

  // Bandas (borde del paño)
  ctx.strokeStyle = "#1a1478";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (const [x1, y1, x2, y2] of CUSHIONS.slice(0, 6)) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // Troneras
  for (const p of POCKETS) {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
    g.addColorStop(0, "#000");
    g.addColorStop(0.85, "#05030f");
    g.addColorStop(1, "#2b2160");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }

  // Diamantes de la banda (acento naranja del arcade)
  ctx.fillStyle = "#ff8a3d";
  for (let i = 1; i < 8; i++) {
    if (i === 4) continue;
    diamond(i * W / 8, -RAIL / 2); diamond(i * W / 8, H + RAIL / 2);
  }
  for (let i = 1; i < 4; i++) { diamond(-RAIL / 2, i * H / 4); diamond(W + RAIL / 2, i * H / 4); }
  ctx.restore();
}

function diamond(x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y);
  ctx.closePath(); ctx.fill();
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

function drawBall(b, x = b.x, y = b.y, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Sombra
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath(); ctx.ellipse(x + 2.5, y + 3.5, R, R * 0.9, 0, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  if (b.n === 0) {
    ctx.fillStyle = "#f8f6ee";
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  } else if (b.n > 8) {
    ctx.fillStyle = "#f8f6ee";
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    ctx.fillStyle = colorOf(b.n);
    ctx.fillRect(x - R, y - R * 0.55, 2 * R, R * 1.1);
  } else {
    ctx.fillStyle = colorOf(b.n);
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
  if (b.n !== 0) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, R * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `800 ${b.n > 9 ? 8 : 9}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.n), x, y + 0.5);
  }
  // Brillo
  const shine = ctx.createRadialGradient(x - R * 0.4, y - R * 0.45, 1, x, y, R * 1.1);
  shine.addColorStop(0, "rgba(255,255,255,.75)");
  shine.addColorStop(0.25, "rgba(255,255,255,.12)");
  shine.addColorStop(1, "rgba(0,0,0,.28)");
  ctx.fillStyle = shine;
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  ctx.restore();
}

// Calcula dónde golpeará la blanca: primera bola o banda en la dirección de tiro.
function traceAim(cue, angle) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = { t: Infinity, ball: null };
  for (const b of onTable()) {
    if (b.n === 0) continue;
    const fx = cue.x - b.x, fy = cue.y - b.y;
    const bq = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - 4 * R * R;
    const disc = bq * bq - c;
    if (disc < 0) continue;
    const t = -bq - Math.sqrt(disc);
    if (t > 0 && t < best.t) best = { t, ball: b };
  }
  // Banda
  const tx = dx > 0 ? (W - R - cue.x) / dx : dx < 0 ? (R - cue.x) / dx : Infinity;
  const ty = dy > 0 ? (H - R - cue.y) / dy : dy < 0 ? (R - cue.y) / dy : Infinity;
  const railT = Math.min(tx, ty);
  if (railT < best.t) best = { t: railT, ball: null };
  return { x: cue.x + dx * best.t, y: cue.y + dy * best.t, ball: best.ball };
}

function drawAim() {
  const cue = cueBall();
  const hit = traceAim(cue, aim);
  ctx.save();
  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = "rgba(255,255,255,.65)";
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(hit.x, hit.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.beginPath(); ctx.arc(hit.x, hit.y, R, 0, Math.PI * 2); ctx.stroke();
  if (hit.ball) {
    // Dirección aproximada de la bola golpeada
    const nx = hit.ball.x - hit.x, ny = hit.ball.y - hit.y;
    const len = Math.hypot(nx, ny);
    const legal = !current().group || typeOf(hit.ball.n) === current().group ||
      (hit.ball.n === 8 && remaining(current().group) === 0);
    ctx.strokeStyle = legal ? "rgba(255,180,90,.95)" : "rgba(255,90,90,.95)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hit.ball.x, hit.ball.y);
    ctx.lineTo(hit.ball.x + nx / len * 70, hit.ball.y + ny / len * 70);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCue() {
  const cue = cueBall();
  const back = 16 + power * 70;
  const ux = Math.cos(aim), uy = Math.sin(aim);
  const sx = cue.x - ux * back, sy = cue.y - uy * back;
  const ex = sx - ux * 420, ey = sy - uy * 420;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(sx + 4, sy + 5); ctx.lineTo(ex + 4, ey + 5); ctx.stroke();
  const grad = ctx.createLinearGradient(sx, sy, ex, ey);
  grad.addColorStop(0, "#f2e6c9");
  grad.addColorStop(0.04, "#f2e6c9");
  grad.addColorStop(0.05, "#2f27ce");
  grad.addColorStop(0.08, "#d9a96a");
  grad.addColorStop(0.7, "#8b5a2b");
  grad.addColorStop(0.72, "#ff8a3d");
  grad.addColorStop(0.75, "#3a2414");
  grad.addColorStop(1, "#24160c");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.restore();
}

function draw() {
  const scale = canvas.width / CANVAS_W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawTable();
  ctx.save();
  ctx.translate(RAIL, RAIL);

  if (kitchenOnly && (state === "placing" || (state === "cpu" && ballInHand))) {
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.fillRect(0, 0, HEAD_X, H);
  }

  for (const b of onTable()) {
    if (b.n === 0 && state === "placing") continue;
    drawBall(b);
  }

  if (state === "placing") {
    const ok = validCuePosition(pointer.x, pointer.y);
    if (pointer.inside) {
      drawBall(cueBall(), pointer.x, pointer.y, ok ? 0.9 : 0.4);
      if (!ok) {
        ctx.strokeStyle = "#ff5a4e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, R + 3, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      drawBall(cueBall(), cueBall().x, cueBall().y, 0.6);
    }
  }
  if (state === "aiming" || state === "cpu") {
    if (state === "aiming") drawAim();
    if (!(state === "cpu" && ballInHand)) drawCue();
  }
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
  lastTime = now;
  if (state === "moving") {
    accumulator += dt;
    while (accumulator >= STEP) {
      simulate(STEP);
      accumulator -= STEP;
    }
    if (!moving()) {
      accumulator = 0;
      resolveShot();
    }
    renderTray();
  }
  draw();
  requestAnimationFrame(loop);
}

// ---------- Interfaz ----------
function say(text) {
  const el = $("message");
  el.textContent = text;
  el.hidden = !text;
}

function renderTray() {
  players.forEach((p, i) => {
    const tray = $(`tray-${i}`);
    tray.replaceChildren();
    const group = p.group;
    const nums = group === "solids" ? [1, 2, 3, 4, 5, 6, 7] : group === "stripes" ? [9, 10, 11, 12, 13, 14, 15] : [];
    nums.forEach((n) => {
      const b = balls.find((x) => x.n === n);
      const dot = document.createElement("span");
      dot.className = `mini-ball${n > 8 ? " stripe" : ""}${b && b.out ? " potted" : ""}`;
      dot.style.setProperty("--ball", colorOf(n));
      dot.textContent = n;
      tray.append(dot);
    });
    if (group && remaining(group) === 0) {
      const eight = document.createElement("span");
      eight.className = "mini-ball";
      eight.style.setProperty("--ball", "#111");
      eight.textContent = 8;
      tray.append(eight);
    }
  });
}

function updateHud(winner = null) {
  players.forEach((p, i) => {
    const card = $(`player-${i}`);
    card.classList.toggle("active", state !== "over" && i === turn && winner === null);
    card.classList.toggle("winner", winner === i);
    $(`name-${i}-label`).textContent = p.name;
    $(`group-${i}`).textContent = p.group
      ? `${p.group === "solids" ? "● Lisas" : "◐ Rayadas"} · quedan ${remaining(p.group)}`
      : "Mesa abierta";
  });
  renderTray();
}

function showOverlay(title, text) {
  $("over-title").textContent = title;
  $("over-text").textContent = text;
  $("overlay").hidden = false;
  $("again-btn").focus();
}
function hideOverlay() { $("overlay").hidden = true; }

// ---------- Menú ----------
document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    mode = Number(input.value);
    $("p2-field").hidden = mode !== 2;
  });
});

$("play").addEventListener("click", () => {
  const n1 = $("name-1").value.trim().slice(0, 16) || (mode === 1 ? "Tú" : "Jugador 1");
  const n2 = mode === 1 ? "CPU" : $("name-2").value.trim().slice(0, 16) || "Jugador 2";
  players = [{ name: n1, group: null, cpu: false }, { name: n2, group: null, cpu: mode === 1 }];
  breaker = 0;
  $("screen-menu").hidden = true;
  $("screen-game").hidden = false;
  resizeCanvas();
  newGame();
});

$("again-btn").addEventListener("click", newGame);
$("restart-btn").addEventListener("click", () => {
  if (state === "over" || confirm("¿Empezar una partida nueva? Se perderá la actual.")) newGame();
});
$("menu-btn").addEventListener("click", () => {
  if (state !== "over" && state !== "menu" && !confirm("¿Volver al menú? Se perderá la partida actual.")) return;
  state = "menu";
  hideOverlay();
  $("screen-game").hidden = true;
  $("screen-menu").hidden = false;
});
$("overlay-menu-btn").addEventListener("click", () => {
  state = "menu";
  hideOverlay();
  $("screen-game").hidden = true;
  $("screen-menu").hidden = false;
});

addEventListener("resize", resizeCanvas);
updatePowerUi();
requestAnimationFrame(loop);
