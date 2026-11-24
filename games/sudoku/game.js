// Sudoku de Vistra Arcade: tableros generados al azar con solución única.
(() => {
  const $ = (id) => document.getElementById(id);
  const LEVELS = {
    facil: { name: "Fácil", clues: 40 },
    medio: { name: "Medio", clues: 32 },
    dificil: { name: "Difícil", clues: 27 },
    experto: { name: "Experto", clues: 23 },
  };
  const HINTS = 3;
  const ALL = 0x3fe; // bits 1..9

  // Vecinas de cada casilla (misma fila, columna o caja).
  const PEERS = Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9), c = i % 9;
    const br = r - (r % 3), bc = c - (c % 3);
    const set = new Set();
    for (let k = 0; k < 9; k++) {
      set.add(r * 9 + k);
      set.add(k * 9 + c);
      set.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3));
    }
    set.delete(i);
    return [...set];
  });

  // ---------- Generador ----------
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  function candidates(grid, i) {
    let used = 0;
    for (const p of PEERS[i]) used |= 1 << grid[p];
    return ALL & ~used;
  }

  // Resuelve por backtracking eligiendo la casilla con menos opciones.
  // Devuelve el número de soluciones encontradas (se detiene en `limit`).
  function solve(grid, limit, randomize) {
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      const mask = candidates(grid, i);
      const count = popcount(mask);
      if (count === 0) return 0;
      if (count < bestCount) { best = i; bestMask = mask; bestCount = count; if (count === 1) break; }
    }
    if (best === -1) return 1;
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (randomize) shuffle(digits);
    let found = 0;
    for (const d of digits) {
      grid[best] = d;
      found += solve(grid, limit - found, randomize);
      if (found >= limit) return found; // deja la cuadrícula resuelta
    }
    grid[best] = 0;
    return found;
  }

  function popcount(n) {
    let c = 0;
    while (n) { n &= n - 1; c++; }
    return c;
  }

  function generate(clues) {
    const solution = new Array(81).fill(0);
    solve(solution, 1, true);
    const puzzle = solution.slice();
    let filled = 81;
    for (const i of shuffle([...Array(81).keys()])) {
      if (filled <= clues) break;
      const backup = puzzle[i];
      puzzle[i] = 0;
      if (solve(puzzle.slice(), 2, false) !== 1) puzzle[i] = backup;
      else filled--;
    }
    return { puzzle, solution };
  }

  // ---------- Estado ----------
  const board = $("board");
  const pad = $("pad");
  const cells = [];
  const padButtons = [];
  let state = null;
  let level = "facil";
  let selected = -1;
  let notesMode = false;
  let timerId = null;

  function newGame(lvl = level) {
    level = lvl;
    document.querySelectorAll(".level").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
    // Algunos tableros no admiten quitar tantas casillas: se prueba varias veces y se queda el más vacío.
    const target = LEVELS[level].clues;
    const givens = (g) => g.puzzle.filter(Boolean).length;
    let best = generate(target);
    for (let tries = 0; tries < 8 && givens(best) > target; tries++) {
      const next = generate(target);
      if (givens(next) < givens(best)) best = next;
    }
    const { puzzle, solution } = best;
    state = {
      solution,
      given: puzzle.map((v) => v !== 0),
      values: puzzle.slice(),
      notes: new Array(81).fill(0),
      history: [],
      mistakes: 0,
      hints: HINTS,
      seconds: 0,
      started: false,
      done: false,
    };
    selected = -1;
    board.classList.remove("done");
    $("message").textContent = "";
    clearInterval(timerId);
    timerId = null;
    render();
  }

  function startTimer() {
    if (state.started || state.done) return;
    state.started = true;
    timerId = setInterval(() => {
      state.seconds++;
      $("timer").textContent = formatTime(state.seconds);
    }, 1000);
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ---------- Acciones ----------
  function snapshot(i) {
    state.history.push({ i, value: state.values[i], notes: PEERS[i].concat(i).map((p) => [p, state.notes[p]]) });
  }

  function input(d) {
    const i = selected;
    if (state.done || i < 0 || state.given[i]) return;
    startTimer();
    if (notesMode) {
      if (state.values[i]) return;
      snapshot(i);
      state.notes[i] ^= 1 << d;
    } else {
      if (state.values[i] === d) return;
      snapshot(i);
      state.values[i] = d;
      state.notes[i] = 0;
      if (d !== state.solution[i]) {
        state.mistakes++;
      } else {
        PEERS[i].forEach((p) => { state.notes[p] &= ~(1 << d); });
      }
      cells[i].classList.remove("pop");
      void cells[i].offsetWidth;
      cells[i].classList.add("pop");
    }
    render();
    checkWin();
  }

  function erase() {
    const i = selected;
    if (state.done || i < 0 || state.given[i]) return;
    if (!state.values[i] && !state.notes[i]) return;
    snapshot(i);
    state.values[i] = 0;
    state.notes[i] = 0;
    render();
  }

  function undo() {
    const last = state.history.pop();
    if (!last || state.done) return;
    state.values[last.i] = last.value;
    last.notes.forEach(([p, n]) => { state.notes[p] = n; });
    selected = last.i;
    render();
  }

  function hint() {
    if (state.done || state.hints <= 0) return;
    let i = selected;
    if (i < 0 || state.given[i] || state.values[i] === state.solution[i]) {
      const empty = state.values.map((v, k) => (v === state.solution[k] ? -1 : k)).filter((k) => k >= 0);
      if (!empty.length) return;
      i = empty[Math.floor(Math.random() * empty.length)];
    }
    startTimer();
    state.hints--;
    state.values[i] = state.solution[i];
    state.notes[i] = 0;
    state.given[i] = true; // la pista queda fija
    PEERS[i].forEach((p) => { state.notes[p] &= ~(1 << state.solution[i]); });
    selected = i;
    render();
    checkWin();
  }

  function toggleNotes() {
    notesMode = !notesMode;
    const btn = $("notes");
    btn.setAttribute("aria-pressed", String(notesMode));
    btn.textContent = `✎ Notas: ${notesMode ? "sí" : "no"}`;
  }

  function checkWin() {
    if (!state.values.every((v, i) => v === state.solution[i])) return;
    state.done = true;
    clearInterval(timerId);
    selected = -1;
    render();
    board.classList.add("done");
    const errors = state.mistakes === 1 ? "1 error" : `${state.mistakes} errores`;
    $("message").textContent = `🏆 ¡Sudoku resuelto! Nivel ${LEVELS[level].name} en ${formatTime(state.seconds)} con ${errors}.`;
  }

  function select(i) {
    if (state.done) return;
    selected = i;
    render();
  }

  // ---------- Dibujo ----------
  function build() {
    for (let b = 0; b < 9; b++) {
      const box = document.createElement("div");
      box.className = "box";
      board.append(box);
    }
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.tabIndex = -1;
      cell.style.setProperty("--i", i);
      cell.addEventListener("click", () => select(i));
      board.children[Math.floor(r / 3) * 3 + Math.floor(c / 3)].append(cell);
      cells[i] = cell;
    }
    for (let d = 1; d <= 9; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.addEventListener("click", () => input(d));
      pad.append(btn);
      padButtons[d] = btn;
    }
  }

  function render() {
    const sel = selected;
    const selValue = sel >= 0 ? state.values[sel] : 0;
    const peers = sel >= 0 ? new Set(PEERS[sel]) : new Set();
    const counts = new Array(10).fill(0);

    state.values.forEach((v, i) => {
      if (v === state.solution[i]) counts[v]++;
      const cell = cells[i];
      const wrong = v !== 0 && v !== state.solution[i];
      cell.className = "cell" + (cell.classList.contains("pop") ? " pop" : "");
      if (state.given[i]) cell.classList.add("given");
      if (peers.has(i)) cell.classList.add("peer");
      if (selValue && v === selValue) cell.classList.add("same");
      if (i === sel) cell.classList.add("selected");
      if (wrong) cell.classList.add("error");

      const r = Math.floor(i / 9) + 1, c = (i % 9) + 1;
      if (v) {
        cell.textContent = v;
        cell.setAttribute("aria-label", `Fila ${r}, columna ${c}: ${v}${wrong ? ", incorrecto" : ""}`);
      } else if (state.notes[i]) {
        const notes = document.createElement("span");
        notes.className = "notes";
        for (let d = 1; d <= 9; d++) notes.append(document.createElement("span"));
        for (let d = 1; d <= 9; d++) if (state.notes[i] & (1 << d)) notes.children[d - 1].textContent = d;
        cell.replaceChildren(notes);
        cell.setAttribute("aria-label", `Fila ${r}, columna ${c}: vacía, con notas`);
      } else {
        cell.textContent = "";
        cell.setAttribute("aria-label", `Fila ${r}, columna ${c}: vacía`);
      }
    });

    for (let d = 1; d <= 9; d++) {
      const left = 9 - counts[d];
      const btn = padButtons[d];
      btn.disabled = left === 0 || state.done;
      btn.replaceChildren(document.createTextNode(d), Object.assign(document.createElement("small"), { textContent: left }));
      btn.setAttribute("aria-label", `${d} (quedan ${left})`);
    }

    $("mistakes").textContent = state.mistakes;
    $("timer").textContent = formatTime(state.seconds);
    $("hint-label").textContent = `💡 Pista (${state.hints})`;
    $("hint").disabled = state.hints <= 0 || state.done;
    $("undo").disabled = !state.history.length || state.done;
  }

  // ---------- Controles ----------
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    const key = e.key;
    if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-9]$/.test(key)) { input(Number(key)); return; }
    if (key === "Backspace" || key === "Delete" || key === "0") { erase(); return; }
    if (key.toLowerCase() === "n") { toggleNotes(); return; }
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (key in moves && !state.done) {
      e.preventDefault();
      if (selected < 0) { select(40); return; }
      const r = Math.floor(selected / 9), c = selected % 9;
      const nr = (r + (key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0) + 9) % 9;
      const nc = (c + (key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0) + 9) % 9;
      select(nr * 9 + nc);
    }
  });

  document.querySelectorAll(".level").forEach((btn) => btn.addEventListener("click", () => newGame(btn.dataset.level)));
  $("new-game").addEventListener("click", () => newGame());
  $("undo").addEventListener("click", undo);
  $("erase").addEventListener("click", erase);
  $("notes").addEventListener("click", toggleNotes);
  $("hint").addEventListener("click", hint);

  build();
  newGame("facil");
})();
