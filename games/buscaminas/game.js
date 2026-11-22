// Buscaminas de Vistra Arcade.
const LEVELS = {
  beginner: { name: "Principiante", rows: 8, cols: 8, mines: 10 },
  intermediate: { name: "Intermedio", rows: 16, cols: 16, mines: 40 },
  expert: { name: "Experto", rows: 16, cols: 30, mines: 99 },
};
const CUSTOM_LIMITS = { minRows: 5, maxRows: 24, minCols: 5, maxCols: 30 };
const SETTINGS_KEY = "vistra-buscaminas-settings";

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const minesLeftEl = $("mines-left");
const timerEl = $("timer");
const faceEl = $("new-game");
const messageEl = $("message");
const flagModeEl = $("flag-mode");
const customForm = $("custom-form");
const customRows = $("custom-rows");
const customCols = $("custom-cols");
const customMines = $("custom-mines");
const customHelp = $("custom-help");

// ---------- Estado ----------
let config;      // { level, rows, cols, mines }
let cells;       // [{ mine, adj, open, flag }]
let status;      // ready | playing | won | lost
let opened, flags, startTime, timerId;
let flagMode = false;
let explodedIndex = -1;

// ---------- Utilidades ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function neighbors(i) {
  const { rows, cols } = config;
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

function maxCustomMines(rows, cols) {
  return rows * cols - 9; // deja libre el área del primer clic
}

// ---------- Partida ----------
function newGame(cfg = config) {
  config = cfg;
  const total = config.rows * config.cols;
  cells = Array.from({ length: total }, () => ({ mine: false, adj: 0, open: false, flag: false }));
  status = "ready";
  opened = 0;
  flags = 0;
  explodedIndex = -1;
  stopTimer();
  timerEl.textContent = "0";
  faceEl.textContent = "🙂";
  setMessage("");
  buildBoard();
  render();
  saveSettings();
}

function placeMines(safeIndex) {
  const forbidden = new Set([safeIndex, ...neighbors(safeIndex)]);
  const candidates = [];
  for (let i = 0; i < cells.length; i++) if (!forbidden.has(i)) candidates.push(i);
  // Fisher-Yates parcial para elegir las minas.
  for (let k = 0; k < config.mines; k++) {
    const j = k + Math.floor(Math.random() * (candidates.length - k));
    [candidates[k], candidates[j]] = [candidates[j], candidates[k]];
    cells[candidates[k]].mine = true;
  }
  cells.forEach((cell, i) => {
    cell.adj = neighbors(i).filter((n) => cells[n].mine).length;
  });
}

function flood(start) {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    const cell = cells[i];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    opened++;
    if (cell.adj === 0) {
      for (const n of neighbors(i)) if (!cells[n].open && !cells[n].mine) stack.push(n);
    }
  }
}

function reveal(i) {
  const cell = cells[i];
  if (cell.open || cell.flag) return;
  if (status === "ready") {
    placeMines(i);
    status = "playing";
    startTimer();
  }
  if (cell.mine) return lose(i);
  flood(i);
  checkWin();
}

function chord(i) {
  const cell = cells[i];
  if (!cell.open || cell.adj === 0) return;
  const around = neighbors(i);
  const flagged = around.filter((n) => cells[n].flag).length;
  if (flagged !== cell.adj) return;
  let hit = -1;
  for (const n of around) {
    const nb = cells[n];
    if (nb.open || nb.flag) continue;
    if (nb.mine) hit = n;
    else flood(n);
  }
  if (hit >= 0) return lose(hit);
  checkWin();
}

function toggleFlag(i) {
  const cell = cells[i];
  if (cell.open) return;
  cell.flag = !cell.flag;
  flags += cell.flag ? 1 : -1;
}

function checkWin() {
  if (opened !== cells.length - config.mines) return;
  status = "won";
  const time = stopTimer();
  cells.forEach((cell) => { if (cell.mine) cell.flag = true; });
  flags = config.mines;
  faceEl.textContent = "😎";

  setMessage(`¡Ganaste en ${formatTime(time)} s!`);
}

function lose(i) {
  status = "lost";
  explodedIndex = i;
  stopTimer();
  faceEl.textContent = "😵";
  setMessage("¡Boom! Pisaste una mina. Pulsa la cara para reintentar.", true);
}

// ---------- Cronómetro ----------
function startTimer() {
  startTime = performance.now();
  timerId = setInterval(() => {
    timerEl.textContent = Math.min(999, Math.floor((performance.now() - startTime) / 1000));
  }, 200);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  return startTime ? (performance.now() - startTime) / 1000 : 0;
}

const formatTime = (t) => t.toFixed(2).replace(".", ",");

// ---------- Dibujo ----------
function buildBoard() {
  boardEl.style.gridTemplateColumns = `repeat(${config.cols}, var(--size))`;
  boardEl.style.setProperty("--size", config.cols > 20 ? "26px" : "30px");
  boardEl.replaceChildren(...cells.map((_, i) => {
    const b = document.createElement("button");
    b.className = "cell";
    b.dataset.i = i;
    return b;
  }));
}

function render() {
  const done = status === "won" || status === "lost";
  boardEl.classList.toggle("done", done);
  const els = boardEl.children;
  cells.forEach((cell, i) => {
    const el = els[i];
    let cls = "cell";
    let text = "";
    if (cell.open) {
      cls += " open";
      if (cell.adj) { cls += ` n${cell.adj}`; text = cell.adj; }
    } else if (status === "lost" && cell.mine && !cell.flag) {
      cls += " open";
      text = "💣";
      if (i === explodedIndex) cls += " exploded";
    } else if (status === "lost" && cell.flag && !cell.mine) {
      cls += " wrong";
      text = "❌";
    } else if (cell.flag) {
      text = "🚩";
    }
    el.className = cls;
    el.textContent = text;
    el.setAttribute("aria-label", cell.open ? (cell.adj ? `${cell.adj}` : "vacía") : cell.flag ? "bandera" : "cerrada");
  });
  minesLeftEl.textContent = config.mines - flags;
}

function setMessage(text, lost = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("lost", lost);
}

// ---------- Entrada ----------
boardEl.addEventListener("click", (e) => {
  const el = e.target.closest(".cell");
  if (!el || status === "won" || status === "lost") return;
  const i = Number(el.dataset.i);
  if (cells[i].open) chord(i);
  else if (flagMode) toggleFlag(i);
  else reveal(i);
  render();
});

boardEl.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const el = e.target.closest(".cell");
  if (!el || status === "won" || status === "lost") return;
  const i = Number(el.dataset.i);
  if (cells[i].open) chord(i);
  else toggleFlag(i);
  render();
});

faceEl.addEventListener("click", () => newGame());

addEventListener("keydown", (e) => {
  if (e.key === "F2") {
    e.preventDefault();
    newGame();
  }
});

flagModeEl.addEventListener("click", () => {
  flagMode = !flagMode;
  flagModeEl.setAttribute("aria-pressed", flagMode);
  flagModeEl.textContent = `🚩 Modo bandera: ${flagMode ? "sí" : "no"}`;
});

// ---------- Niveles ----------
function selectLevelButton(level) {
  document.querySelectorAll(".level").forEach((b) => b.classList.toggle("active", b.dataset.level === level));
  customForm.hidden = level !== "custom";
}

document.querySelectorAll(".level").forEach((btn) => {
  btn.addEventListener("click", () => {
    const level = btn.dataset.level;
    selectLevelButton(level);
    if (level === "custom") {
      updateCustomHelp();
      customForm.querySelector("button").focus();
      return;
    }
    newGame({ level, ...LEVELS[level] });
  });
});

function readCustom() {
  const rows = clamp(Number(customRows.value) || 0, CUSTOM_LIMITS.minRows, CUSTOM_LIMITS.maxRows);
  const cols = clamp(Number(customCols.value) || 0, CUSTOM_LIMITS.minCols, CUSTOM_LIMITS.maxCols);
  const mines = clamp(Number(customMines.value) || 0, 1, maxCustomMines(rows, cols));
  return { rows, cols, mines };
}

function updateCustomHelp() {
  const { rows, cols } = readCustom();
  customMines.max = maxCustomMines(rows, cols);
  customHelp.textContent =
    `Filas ${CUSTOM_LIMITS.minRows}–${CUSTOM_LIMITS.maxRows}, columnas ${CUSTOM_LIMITS.minCols}–${CUSTOM_LIMITS.maxCols}, ` +
    `minas 1–${maxCustomMines(rows, cols)}.`;
}
[customRows, customCols].forEach((el) => el.addEventListener("input", updateCustomHelp));

customForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const cfg = readCustom();
  customRows.value = cfg.rows;
  customCols.value = cfg.cols;
  customMines.value = cfg.mines;
  updateCustomHelp();
  newGame({ level: "custom", ...cfg });
});

// ---------- Ajustes y arranque ----------
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s?.level === "custom") {
      const rows = clamp(s.rows, CUSTOM_LIMITS.minRows, CUSTOM_LIMITS.maxRows);
      const cols = clamp(s.cols, CUSTOM_LIMITS.minCols, CUSTOM_LIMITS.maxCols);
      return { level: "custom", rows, cols, mines: clamp(s.mines, 1, maxCustomMines(rows, cols)) };
    }
    if (LEVELS[s?.level]) return { level: s.level, ...LEVELS[s.level] };
  } catch {}
  return { level: "beginner", ...LEVELS.beginner };
}

const initial = loadSettings();
if (initial.level === "custom") {
  customRows.value = initial.rows;
  customCols.value = initial.cols;
  customMines.value = initial.mines;
  updateCustomHelp();
}
selectLevelButton(initial.level);
newGame(initial);

// Limpia los récords que guardaban versiones anteriores del juego.
localStorage.removeItem("vistra-buscaminas-records");
