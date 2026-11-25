// Banderas y Capitales de Vistra Arcade: quiz por continentes contra el reloj.
(() => {
  const $ = (id) => document.getElementById(id);
  const QUESTIONS = 10;
  const BASE_POINTS = 100;
  const TIME_POINTS = 100;   // extra máximo por responder al instante
  const STREAK_POINTS = 10;  // extra por cada acierto seguido (hasta 50)
  const fmt = new Intl.NumberFormat("es-ES", { useGrouping: "always" }).format;

  const screens = { menu: $("screen-menu"), quiz: $("screen-quiz"), end: $("screen-end") };
  let game = null;
  let rafId = null;
  let nextTimer = null;

  // ---------- Utilidades ----------
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const flagOf = (code) => String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  const option = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
  }

  // ---------- Récords ----------
  const recordKey = () => `vistra_banderas_record_${option("mode")}_${option("continent")}_${option("time")}`;
  function getRecord() {
    try { return Number(localStorage.getItem(recordKey())) || 0; } catch { return 0; }
  }
  function setRecord(v) {
    try { localStorage.setItem(recordKey(), String(v)); } catch { /* sin almacenamiento */ }
  }
  const updateMenuRecord = () => { $("menu-record").textContent = fmt(getRecord()); };

  // ---------- Preguntas ----------
  function makeQuestions(mode, continent) {
    const inContinent = (c) => continent === "mundo" || c.continent === continent;
    const pool = BC_PAISES.filter(inContinent);
    const chosen = [];
    for (const country of shuffle(pool)) {
      if (chosen.length === QUESTIONS) break;
      const type = mode === "mezcla" ? (Math.random() < 0.5 ? "banderas" : "capitales") : mode;
      if (type === "capitales" && !country.capital) {
        if (mode === "capitales") continue;
        chosen.push(makeQuestion(country, "banderas", pool));
      } else {
        chosen.push(makeQuestion(country, type, pool));
      }
    }
    return chosen;
  }

  // Las opciones falsas salen del mismo continente para que no sea demasiado fácil.
  function makeQuestion(country, type, pool) {
    const near = pool.filter((c) => c !== country && c.continent === country.continent);
    const others = near.length >= 3 ? near : pool.filter((c) => c !== country);
    if (type === "banderas") {
      const wrong = shuffle(others).slice(0, 3).map((c) => c.name);
      return { type, country, answer: country.name, options: shuffle([country.name, ...wrong]) };
    }
    const capitals = [...new Set(others.map((c) => c.capital).filter((c) => c && c !== country.capital))];
    const wrong = shuffle(capitals).slice(0, 3);
    return { type, country, answer: country.capital, options: shuffle([country.capital, ...wrong]) };
  }

  // ---------- Partida ----------
  function start() {
    clearTimeout(nextTimer);
    const mode = option("mode");
    const continent = option("continent");
    game = {
      questions: makeQuestions(mode, continent),
      index: 0,
      score: 0,
      hits: 0,
      streak: 0,
      bestStreak: 0,
      misses: [],
      seconds: Number(option("time")),
      answered: false,
    };
    $("q-total").textContent = game.questions.length;
    show("quiz");
    ask();
  }

  function ask() {
    const q = game.questions[game.index];
    game.answered = false;
    $("q-num").textContent = game.index + 1;
    $("score").textContent = fmt(game.score);
    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    const streak = $("streak");
    streak.hidden = game.streak < 2;
    streak.textContent = `🔥 Racha de ${game.streak}`;

    const flag = $("flag");
    flag.textContent = flagOf(q.country.code);
    flag.classList.toggle("small", q.type === "capitales");
    // Reinicia la animación de entrada.
    flag.style.animation = "none";
    void flag.offsetWidth;
    flag.style.animation = "";

    const prompt = $("prompt");
    if (q.type === "banderas") {
      prompt.textContent = "¿De qué país es esta bandera?";
      flag.setAttribute("aria-label", "Bandera de un país");
    } else {
      const strong = document.createElement("strong");
      strong.textContent = q.country.name;
      prompt.replaceChildren("¿Cuál es la capital de ", strong, "?");
      flag.setAttribute("aria-label", `Bandera de ${q.country.name}`);
    }

    $("options").replaceChildren(...q.options.map((text, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = i + 1;
      btn.append(key, text);
      btn.addEventListener("click", () => answer(i));
      return btn;
    }));

    game.deadline = performance.now() + game.seconds * 1000;
    cancelAnimationFrame(rafId);
    tick();
  }

  function tick() {
    const left = Math.max(0, game.deadline - performance.now()) / (game.seconds * 1000);
    const bar = $("timer-bar");
    bar.style.transform = `scaleX(${left})`;
    bar.classList.toggle("low", left < 0.3);
    if (left <= 0) return answer(null);
    rafId = requestAnimationFrame(tick);
  }

  function answer(i) {
    if (!game || game.answered) return;
    game.answered = true;
    cancelAnimationFrame(rafId);
    const q = game.questions[game.index];
    const left = Math.max(0, game.deadline - performance.now()) / (game.seconds * 1000);
    const buttons = [...$("options").children];
    const rightIndex = q.options.indexOf(q.answer);
    buttons.forEach((b, k) => {
      b.disabled = true;
      if (k === rightIndex) b.classList.add("right");
      else if (k === i) b.classList.add("wrong");
      else b.classList.add("faded");
    });

    const feedback = $("feedback");
    if (i === rightIndex) {
      game.hits++;
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      const points = BASE_POINTS + Math.round(TIME_POINTS * left) + Math.min(50, STREAK_POINTS * (game.streak - 1));
      game.score += points;
      feedback.textContent = `¡Correcto! +${points}`;
      feedback.className = "feedback ok";
    } else {
      game.streak = 0;
      game.misses.push({ q, given: i === null ? null : q.options[i] });
      feedback.textContent = i === null ? `Se acabó el tiempo. Era ${q.answer}.` : `Era ${q.answer}.`;
      feedback.className = "feedback bad";
    }
    $("score").textContent = fmt(game.score);
    $("streak").hidden = true;

    nextTimer = setTimeout(() => {
      game.index++;
      if (game.index < game.questions.length) ask();
      else finish();
    }, i === rightIndex ? 1100 : 1900);
  }

  function finish() {
    const total = game.questions.length;
    const record = getRecord();
    const isRecord = game.score > record;
    if (isRecord) setRecord(game.score);

    const ratio = game.hits / total;
    $("end-eyebrow").textContent = `${option("mode") === "capitales" ? "Capitales" : option("mode") === "mezcla" ? "Mezcla" : "Banderas"} · ${continentName(option("continent"))} · ${option("time")} s`;
    $("end-title").textContent = `${fmt(game.score)} puntos`;
    const verdict = ratio === 1 ? "¡Perfecto! Te las sabes todas." : ratio >= 0.8 ? "¡Muy bien! Casi todas." : ratio >= 0.5 ? "Nada mal, sigue practicando." : "A repasar el mapa.";
    const detail = $("end-detail");
    detail.replaceChildren(`${game.hits} de ${total} aciertos. ${verdict}`);
    if (isRecord && game.score > 0) {
      const extra = document.createElement("span");
      extra.className = "new";
      extra.textContent = "🏆 ¡Nuevo récord!";
      detail.append(extra);
    }
    $("end-hits").textContent = `${game.hits}/${total}`;
    $("end-streak").textContent = game.bestStreak;
    $("end-record").textContent = fmt(Math.max(record, game.score));

    $("review-wrap").hidden = !game.misses.length;
    $("review").replaceChildren(...game.misses.map(({ q, given }) => {
      const li = document.createElement("li");
      const mini = document.createElement("span");
      mini.className = "mini";
      mini.textContent = flagOf(q.country.code);
      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = q.country.name;
      text.append(strong, q.type === "capitales" ? ` · capital: ${q.country.capital}` : "");
      const you = document.createElement("span");
      you.className = "you";
      you.textContent = given === null ? "Sin respuesta" : `Dijiste: ${given}`;
      li.append(mini, text, you);
      return li;
    }));
    show("end");
    $("again").focus();
  }

  const continentName = (key) => (key === "mundo" ? "Todo el mundo" : BC_CONTINENTES[key]);

  // ---------- Menú y controles ----------
  const CONTINENT_ICONS = { america: "🌎", europa: "🏰", asia: "🏯", africa: "🦁", oceania: "🏝️" };
  Object.entries(BC_CONTINENTES).forEach(([key, name]) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "continent";
    input.value = key;
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${CONTINENT_ICONS[key]} ${name}`;
    label.append(input, chip);
    $("continents").append(label);
  });
  document.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener("change", updateMenuRecord));

  $("play").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("to-menu").addEventListener("click", () => {
    updateMenuRecord();
    show("menu");
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!screens.quiz.hidden && /^[1-4]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < game.questions[game.index].options.length) answer(i);
    }
  });

  updateMenuRecord();
})();
