// Sudoku de Vistra Arcade: generador con solución única, notas, pistas y guardado automático.

// ---------- Generador y solucionador ----------
const ALL = 0x3fe;                       // bits 1..9
const bit = (n) => 1 << n;
const rowOf = (i) => Math.floor(i / 9);
const colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

// Casillas relacionadas (misma fila, columna o caja) de cada casilla.
const PEERS = Array.from({ length: 81 }, (_, i) => {
  const set = new Set();
  for (let j = 0; j < 81; j++) {
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) set.add(j);
  }
  return [...set];
});

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Cuenta soluciones (hasta "limit") con vuelta atrás y la casilla con menos candidatos primero.
// Si "fill" es true, rellena la cuadrícula con la primera solución encontrada (orden aleatorio).
function solve(grid, limit = 2, fill = false) {
  const g = grid.slice();
  const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const b = bit(v);
    if (rows[rowOf(i)] & b || cols[colOf(i)] & b || boxes[boxOf(i)] & b) return { count: 0 };
    rows[rowOf(i)] |= b; cols[colOf(i)] |= b; boxes[boxOf(i)] |= b;
  }
  let count = 0;
  let solution = null;

  function search() {
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      const c = popcount(mask);
      if (c === 0) return false;
      if (c < bestCount) { best = i; bestMask = mask; bestCount = c; if (c === 1) break; }
    }
    if (best === -1) {
      count++;
      if (!solution) solution = g.slice();
      return count >= limit;
    }
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & bit(d)) digits.push(d);
    if (fill) shuffle(digits);
    const r = rowOf(best), c = colOf(best), bx = boxOf(best);
    for (const d of digits) {
      const b = bit(d);
      g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bx] |= b;
      if (search()) return true;
      g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b;
    }
    return false;
  }
  search();
  return { count, solution };
}

// Pistas iniciales aproximadas por dificultad (cuantas menos, más difícil).
const LEVELS = {
  easy: { name: "Fácil", clues: 40, hints: 5 },
  medium: { name: "Medio", clues: 33, hints: 3 },
  hard: { name: "Difícil", clues: 28, hints: 2 },
  expert: { name: "Experto", clues: 24, hints: 1 },
};

function generate(level) {
  const solution = solve(Array(81).fill(0), 1, true).solution;
  const puzzle = solution.slice();
  let clues = 81;
  // Quitar números en orden aleatorio mientras la solución siga siendo única.
  for (const i of shuffle([...Array(81).keys()])) {
    if (clues <= LEVELS[level].clues) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (solve(puzzle, 2).count !== 1) puzzle[i] = keep;
    else clues--;
  }
  return { puzzle, solution };
}

// ---------- Estado ----------
const SAVE_KEY = "vistra-sudoku";
const $ = (id) => document.getElementById(id);
const boardEl = $("board");

let level = "easy";
let puzzle, solution;      // arrays de 81 (0 = vacía)
let values;                // valores del jugador (incluye los dados)
let notes;                 // máscara de notas por casilla
let selected = -1;
let notesMode = false;
let history = [];
let mistakes = 0;
let hintsLeft = 0;
let hintsUsed = 0;
let elapsed = 0;           // segundos
let timerId = null;
let finished = false;
let showErrors = true;

// ---------- Partida ----------
function newGame(lv = level) {
  level = lv;
  setLoading(true);
  // Se deja pintar el aviso de "Generando…" antes del cálculo.
  setTimeout(() => {
    ({ puzzle, solution } = generate(level));
    values = puzzle.slice();
    notes = Array(81).fill(0);
    selected = -1;
    history = [];
    mistakes = 0;
    hintsLeft = LEVELS[level].hints;
    hintsUsed = 0;
    elapsed = 0;
    finished = false;
    hideOverlay();
    setLoading(false);
    buildBoard();
    render();
    startTimer();
    save();
  }, 30);
}

function isGiven(i) { return puzzle[i] !== 0; }

function setValue(i, v, { record = true } = {}) {
  if (finished || i < 0 || isGiven(i)) return;
  if (values[i] === v && notes[i] === 0) return;
  if (record) history.push({ i, value: values[i], notes: notes[i], peers: PEERS[i].map((j) => [j, notes[j]]) });
  values[i] = v;
  notes[i] = 0;
  if (v) {
    // Al poner un número, se borra como nota en su fila, columna y caja.
    for (const j of PEERS[i]) notes[j] &= ~bit(v);
    if (v !== solution[i]) mistakes++;
  }
  afterChange();
}

function toggleNote(i, d) {
  if (finished || i < 0 || isGiven(i) || values[i]) return;
  history.push({ i, value: values[i], notes: notes[i], peers: [] });
  notes[i] ^= bit(d);
  afterChange();
}

function input(d) {
  if (selected < 0) return;
  if (notesMode) toggleNote(selected, d);
  else setValue(selected, values[selected] === d ? 0 : d);
}

function erase() {
  if (selected < 0 || isGiven(selected)) return;
  if (values[selected]) setValue(selected, 0);
  else if (notes[selected]) {
    history.push({ i: selected, value: 0, notes: notes[selected], peers: [] });
    notes[selected] = 0;
    afterChange();
  }
}

function undo() {
  const last = history.pop();
  if (!last || finished) return;
  values[last.i] = last.value;
  notes[last.i] = last.notes;
  for (const [j, n] of last.peers) notes[j] = n;
  selected = last.i;
  afterChange();
}

function hint() {
  if (finished || hintsLeft <= 0) return;
  // Pista en la casilla elegida si está mal o vacía; si no, en una vacía al azar.
  let i = selected >= 0 && !isGiven(selected) && values[selected] !== solution[selected] ? selected : -1;
  if (i < 0) {
    const empty = [...Array(81).keys()].filter((k) => values[k] !== solution[k]);
    if (!empty.length) return;
    i = empty[Math.floor(Math.random() * empty.length)];
  }
  hintsLeft--;
  hintsUsed++;
  selected = i;
  setValue(i, solution[i]);
  flash(i);
}

function afterChange() {
  render();
  save();
  if (values.every((v, i) => v === solution[i])) win();
}

function win() {
  finished = true;
  stopTimer();
  render();
  localStorage.removeItem(SAVE_KEY);
  $("over-title").textContent = "¡Sudoku resuelto! 🎉";
  $("over-text").textContent =
    `${LEVELS[level].name} en ${formatTime(elapsed)} · ${mistakes} ${mistakes === 1 ? "error" : "errores"} · ` +
    `${hintsUsed} ${hintsUsed === 1 ? "pista" : "pistas"}`;
  $("overlay").hidden = false;
  $("again-btn").focus();
}

// ---------- Tiempo ----------
function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    if (document.hidden || finished) return;
    elapsed++;
    $("timer").textContent = formatTime(elapsed);
    if (elapsed % 5 === 0) save();
  }, 1000);
  $("timer").textContent = formatTime(elapsed);
}
function stopTimer() { clearInterval(timerId); timerId = null; }
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ---------- Guardado ----------
function save() {
  if (finished) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    level, puzzle, solution, values, notes, mistakes, hintsLeft, hintsUsed, elapsed,
  }));
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || s.puzzle?.length !== 81 || !LEVELS[s.level]) return false;
    ({ level, puzzle, solution, values, notes, mistakes, hintsLeft, hintsUsed, elapsed } = s);
    history = [];
    finished = false;
    return true;
  } catch {
    return false;
  }
}

// ---------- Dibujo ----------
function buildBoard() {
  boardEl.replaceChildren(...Array.from({ length: 81 }, (_, i) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.type = "button";
    if (colOf(i) % 3 === 2 && colOf(i) < 8) cell.classList.add("box-right");
    if (rowOf(i) % 3 === 2 && rowOf(i) < 8) cell.classList.add("box-bottom");
    return cell;
  }));
}

function render() {
  const sel = selected;
  const selValue = sel >= 0 ? values[sel] : 0;
  const counts = Array(10).fill(0);
  values.forEach((v) => { if (v) counts[v]++; });

  [...boardEl.children].forEach((cell, i) => {
    const v = values[i];
    const wrong = showErrors && v && v !== solution[i];
    const conflict = v && PEERS[i].some((j) => values[j] === v);
    cell.classList.toggle("given", isGiven(i));
    cell.classList.toggle("user", !isGiven(i) && !!v);
    cell.classList.toggle("selected", i === sel);
    cell.classList.toggle("related", sel >= 0 && i !== sel && PEERS[sel].includes(i));
    cell.classList.toggle("same", !!selValue && v === selValue && i !== sel);
    cell.classList.toggle("wrong", !!wrong);
    cell.classList.toggle("conflict", !wrong && !!conflict && showErrors);
    if (v) {
      cell.textContent = v;
    } else if (notes[i]) {
      const grid = document.createElement("span");
      grid.className = "notes";
      for (let d = 1; d <= 9; d++) {
        const n = document.createElement("span");
        n.textContent = notes[i] & bit(d) ? d : "";
        if (selValue === d && notes[i] & bit(d)) n.className = "hit";
        grid.append(n);
      }
      cell.replaceChildren(grid);
    } else {
      cell.textContent = "";
    }
    cell.setAttribute("aria-label",
      `Fila ${rowOf(i) + 1}, columna ${colOf(i) + 1}: ${v ? v : "vacía"}${isGiven(i) ? " (fija)" : ""}${wrong ? ", incorrecta" : ""}`);
  });

  document.querySelectorAll(".num").forEach((btn) => {
    const d = Number(btn.dataset.n);
    const left = 9 - counts[d];
    btn.querySelector("small").textContent = left > 0 ? left : "✓";
    btn.classList.toggle("done", left <= 0);
  });

  document.querySelectorAll(".level").forEach((b) => b.classList.toggle("active", b.dataset.level === level));
  $("mistakes").textContent = mistakes;
  $("hint-btn").querySelector("small").textContent = hintsLeft;
  $("hint-btn").disabled = hintsLeft <= 0 || finished;
  $("notes-btn").setAttribute("aria-pressed", String(notesMode));
  $("notes-btn").querySelector("small").textContent = notesMode ? "Sí" : "No";
  $("undo-btn").disabled = !history.length || finished;
  $("level-name").textContent = LEVELS[level].name;
  $("filled").textContent = `${values.filter(Boolean).length}/81`;
}

function flash(i) {
  const cell = boardEl.children[i];
  cell.classList.remove("flash");
  void cell.offsetWidth;
  cell.classList.add("flash");
}

function setLoading(on) {
  $("loading").hidden = !on;
}
function hideOverlay() { $("overlay").hidden = true; }

// ---------- Entrada ----------
boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  selected = Number(cell.dataset.i);
  render();
});

document.querySelectorAll(".num").forEach((btn) => {
  btn.addEventListener("click", () => input(Number(btn.dataset.n)));
});
$("erase-btn").addEventListener("click", erase);
$("undo-btn").addEventListener("click", undo);
$("hint-btn").addEventListener("click", hint);
$("notes-btn").addEventListener("click", () => { notesMode = !notesMode; render(); });
$("errors-toggle").addEventListener("change", (e) => { showErrors = e.target.checked; render(); });
$("new-btn").addEventListener("click", () => {
  if (finished || !values.some((v, i) => v && !isGiven(i)) || confirm("¿Empezar un sudoku nuevo? Se perderá el actual.")) newGame();
});
$("again-btn").addEventListener("click", () => newGame());
document.querySelectorAll(".level").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.level === level && !finished) return;
    const started = values && values.some((v, i) => v && !isGiven(i));
    if (!finished && started && !confirm(`¿Empezar un sudoku ${LEVELS[btn.dataset.level].name.toLowerCase()}? Se perderá el actual.`)) return;
    newGame(btn.dataset.level);
  });
});

addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  const k = e.key;
  if (/^[1-9]$/.test(k)) { input(Number(k)); e.preventDefault(); return; }
  if (k === "Backspace" || k === "Delete" || k === "0") { erase(); e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "z") { undo(); e.preventDefault(); return; }
  if (k.toLowerCase() === "n") { notesMode = !notesMode; render(); return; }
  if (k.toLowerCase() === "h") { hint(); return; }
  const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
  if (k in moves) {
    e.preventDefault();
    if (selected < 0) selected = 40;
    else {
      const r = rowOf(selected), c = colOf(selected);
      if (k === "ArrowUp") selected = ((r + 8) % 9) * 9 + c;
      if (k === "ArrowDown") selected = ((r + 1) % 9) * 9 + c;
      if (k === "ArrowLeft") selected = r * 9 + (c + 8) % 9;
      if (k === "ArrowRight") selected = r * 9 + (c + 1) % 9;
    }
    render();
    boardEl.children[selected].focus({ preventScroll: true });
  }
});

// ---------- Arranque ----------
if (load()) {
  buildBoard();
  render();
  startTimer();
  $("resume-note").hidden = false;
  setTimeout(() => { $("resume-note").hidden = true; }, 4000);
} else {
  newGame("easy");
}
