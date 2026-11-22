// Orbit Dodge: gira alrededor del núcleo y esquiva los meteoritos.
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const CX = W / 2;
const CY = H / 2;
const ORBIT = 150;
const PLAYER_R = 10;

const bestEl = document.getElementById("best");
let best = Number(localStorage.getItem("orbit-dodge-best") || 0);
bestEl.textContent = best;

const keys = { left: false, right: false };
let state = "menu"; // menu | playing | over
let angle, rocks, score, spawnTimer, last;

function reset() {
  angle = -Math.PI / 2;
  rocks = [];
  score = 0;
  spawnTimer = 0;
}

function spawnRock() {
  const a = Math.random() * Math.PI * 2;
  const dist = Math.hypot(W, H) / 2 + 20;
  const speed = 90 + Math.random() * 60 + score * 2;
  // Apunta cerca del centro con algo de desviación.
  const aim = a + Math.PI + (Math.random() - 0.5) * 0.6;
  rocks.push({
    x: CX + Math.cos(a) * dist,
    y: CY + Math.sin(a) * dist,
    vx: Math.cos(aim) * speed,
    vy: Math.sin(aim) * speed,
    r: 8 + Math.random() * 10,
  });
}

function update(dt) {
  if (state !== "playing") return;

  const turn = 3.2;
  if (keys.left) angle -= turn * dt;
  if (keys.right) angle += turn * dt;

  score += dt;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnRock();
    spawnTimer = Math.max(0.25, 1.1 - score * 0.02);
  }

  const px = CX + Math.cos(angle) * ORBIT;
  const py = CY + Math.sin(angle) * ORBIT;
  const limit = Math.hypot(W, H) / 2 + 60;

  rocks = rocks.filter((r) => {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    if (Math.hypot(r.x - px, r.y - py) < r.r + PLAYER_R) gameOver();
    return Math.hypot(r.x - CX, r.y - CY) < limit;
  });
}

function gameOver() {
  state = "over";
  const s = Math.floor(score);
  if (s > best) {
    best = s;
    localStorage.setItem("orbit-dodge-best", best);
    bestEl.textContent = best;
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Órbita
  ctx.strokeStyle = "#84cd97";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, CY, ORBIT, 0, Math.PI * 2);
  ctx.stroke();

  // Núcleo
  ctx.fillStyle = "#2c633a";
  ctx.shadowColor = "#2c633a";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(CX, CY, 28, 0, Math.PI * 2);
  ctx.fill();

  // Jugador
  if (angle !== undefined) {
    ctx.fillStyle = "#46b463";
    ctx.shadowColor = "#46b463";
    ctx.beginPath();
    ctx.arc(CX + Math.cos(angle) * ORBIT, CY + Math.sin(angle) * ORBIT, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Meteoritos
  ctx.fillStyle = "#0c180f";
  for (const r of rocks || []) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#0c180f";
  ctx.textAlign = "center";
  ctx.font = "bold 28px Inter, system-ui, sans-serif";
  if (state === "playing") {
    ctx.fillText(Math.floor(score), CX, 50);
  } else if (state === "menu") {
    ctx.fillText("ORBIT DODGE", CX, 80);
    ctx.font = "18px Inter, system-ui, sans-serif";
    ctx.fillText("Pulsa Espacio o toca para empezar", CX, H - 60);
  } else {
    ctx.fillText(`Game over · ${Math.floor(score)}`, CX, 80);
    ctx.font = "18px Inter, system-ui, sans-serif";
    ctx.fillText("Pulsa Espacio o toca para reintentar", CX, H - 60);
  }
}

function loop(t) {
  const dt = Math.min(0.05, (t - (last ?? t)) / 1000);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function start() {
  if (state === "playing") return;
  reset();
  state = "playing";
}

function setKey(e, down) {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = down;
  else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = down;
  else if (e.code === "Space" && down) start();
  else return;
  e.preventDefault();
}

addEventListener("keydown", (e) => setKey(e, true));
addEventListener("keyup", (e) => setKey(e, false));

canvas.addEventListener("pointerdown", (e) => {
  if (state !== "playing") return start();
  const rect = canvas.getBoundingClientRect();
  const left = e.clientX - rect.left < rect.width / 2;
  keys.left = left;
  keys.right = !left;
});
addEventListener("pointerup", () => { keys.left = keys.right = false; });

reset();
requestAnimationFrame(loop);
