// MundoGuessr: aparece en un lugar con Street View y adivina dónde estás.
// Modo de 1 jugador o de 2 jugadores por turnos en el mismo PC.
const ROUNDS = 5;
const MAX_POINTS = 5000;
const WORLD_SIZE_KM = 20000;
const PLACEHOLDER_KEY = "PEGA_AQUI_TU_CLAVE";
const PLAYER_COLORS = ["--guess", "--guess-2"];

const $ = (id) => document.getElementById(id);
const screens = { menu: $("screen-menu"), game: $("screen-game"), result: $("screen-result") };
const numberFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const fmt = (n) => numberFormat.format(n);

// ---------- Geografía y puntuación ----------
const EARTH_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Punto a `km` de distancia en una dirección aleatoria.
function offsetPoint([lat, lng], km) {
  const bearing = Math.random() * 2 * Math.PI;
  const d = km / EARTH_KM;
  const p1 = toRad(lat);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(bearing));
  const l2 = toRad(lng) + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: toDeg(p2), lng: ((toDeg(l2) + 540) % 360) - 180 };
}

// 5000 puntos si aciertas (menos de 50 m) y baja exponencialmente con la distancia:
// a 100 km ~4750 puntos, a 2000 km ~1840, a 10000 km ~30.
function scoreFor(km) {
  if (km < 0.05) return MAX_POINTS;
  return Math.round(MAX_POINTS * Math.exp((-10 * km) / WORLD_SIZE_KM));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`;
  return `${fmt(Math.round(km))} km`;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cssColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------- Estado ----------
let playerCount = 1;
let timeLimit = 0;
let game = null;
let sv, panorama, guessMap, resultMap, guessMarker;
let resultOverlays = [];
let timerId = null;

// ---------- Menú ----------
function buildMenu() {
  document.querySelectorAll('input[name="players"]').forEach((input) => {
    input.addEventListener("change", () => {
      playerCount = Number(input.value);
      $("names").hidden = playerCount !== 2;
      if (playerCount === 2) $("name-1").focus();
    });
  });
  document.querySelectorAll('input[name="time"]').forEach((input) => {
    input.addEventListener("change", () => { timeLimit = Number(input.value); });
  });
}

function playerNames() {
  if (playerCount === 1) return ["Tú"];
  return [1, 2].map((i) => $(`name-${i}`).value.trim().slice(0, 16) || `Jugador ${i}`);
}

// ---------- Carga de Google Maps ----------
function apiKey() {
  const key = window.MUNDOGUESSR_CONFIG?.googleMapsApiKey?.trim();
  return key && key !== PLACEHOLDER_KEY ? key : null;
}

function showKeyWarning(html) {
  const el = $("key-warning");
  el.innerHTML = html;
  el.hidden = false;
  $("play").disabled = true;
  $("play-hint").textContent = "";
}

function loadGoogleMaps() {
  if (!window.MUNDOGUESSR_CONFIG) {
    return showKeyWarning(
      "No se encontró el archivo <code>config.js</code>. En la carpeta <code>games/mundoguessr/</code>, " +
      "copia <code>config.example.js</code> con el nombre <code>config.js</code> y pega ahí tu clave de Google Maps.");
  }
  const key = apiKey();
  if (!key) {
    return showKeyWarning(
      `Falta la clave de Google Maps. Abre <code>games/mundoguessr/config.js</code> y pega tu clave ` +
      `en lugar de <code>${PLACEHOLDER_KEY}</code>. Después recarga esta página.`);
  }

  $("play-hint").textContent = "Cargando Google Maps…";

  // Google llama a esta función si la clave no es válida o no tiene permisos.
  window.gm_authFailure = () => {
    game = null;
    stopTimer();
    goTo("menu");
    showKeyWarning(
      "Google rechazó la clave. Revisa que esté bien copiada, que <strong>Maps JavaScript API</strong> esté activada, " +
      "que la facturación del proyecto esté activa y que la clave <strong>no</strong> tenga restricción de sitios web " +
      "(al abrir el HTML directamente no hay dominio que comprobar).");
  };

  window.__mundoGuessrReady = () => {
    sv = new google.maps.StreetViewService();
    $("play").disabled = false;
    $("play-hint").textContent = "";
  };

  const script = document.createElement("script");
  script.src = "https://maps.googleapis.com/maps/api/js" +
    `?key=${encodeURIComponent(key)}&v=weekly&language=es&loading=async&callback=__mundoGuessrReady`;
  script.async = true;
  script.onerror = () => showKeyWarning("No se pudo cargar Google Maps. Revisa tu conexión a internet y recarga la página.");
  document.head.append(script);
}

// ---------- Pantallas ----------
function goTo(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  document.body.classList.toggle("playing", name !== "menu");
}

// Los mapas y el panorama se crean una sola vez y se reutilizan (cada carga cuenta en Google).
function ensureGoogleObjects() {
  if (panorama) return;
  panorama = new google.maps.StreetViewPanorama($("pano"), {
    addressControl: false,     // sin dirección
    showRoadLabels: false,     // sin nombres de calles
    fullscreenControl: false,
    motionTracking: false,
    motionTrackingControl: false,
    enableCloseButton: false,
    linksControl: true,
    clickToGo: true,
    panControl: true,
    zoomControl: true,
  });

  const common = {
    center: { lat: 20, lng: 0 },
    zoom: 1,
    minZoom: 1,
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    streetViewControl: false,  // sin muñequito: evitaría hacer trampa
    gestureHandling: "greedy",
    keyboardShortcuts: false,
  };
  guessMap = new google.maps.Map($("guess-map"), { ...common, draggableCursor: "crosshair" });
  guessMap.addListener("click", (e) => placeGuess(e.latLng));
  resultMap = new google.maps.Map($("result-map"), { ...common, zoom: 2 });
}

// ---------- Partida ----------
const isDuel = () => game.players.length === 2;

function startGame() {
  game = {
    players: playerNames().map((name) => ({ name, score: 0 })),
    rounds: [],          // [{ location, heading, guesses: [{ guess, km, points }] }]
    used: new Set(),
    current: null,
    turn: 0,
    roundActive: false,
  };
  goTo("game");
  ensureGoogleObjects();
  $("hud-rounds").textContent = ROUNDS;
  startRound();
}

async function startRound() {
  const thisGame = game;
  stopTimer();
  game.roundActive = false;
  game.turn = 0;
  $("handoff").hidden = true;
  $("hud-timer").hidden = true;
  $("loading-text").textContent = "Buscando un lugar…";
  $("loading").hidden = false;
  updateHud();

  let location;
  try {
    location = await findLocation();
  } catch {
    $("loading-text").textContent = "No se encontró un lugar con Street View. Vuelve a intentarlo.";
    setTimeout(() => { if (game === thisGame) goTo("menu"); }, 2500);
    return;
  }
  if (game !== thisGame) return; // se salió de la partida mientras buscaba

  game.used.add(location.pano);
  // Los dos jugadores empiezan en el mismo punto y mirando hacia el mismo lado.
  game.current = { location, heading: Math.random() * 360, guesses: [] };
  beginTurn();
}

// Prepara el turno del jugador actual: mismo lugar de partida, mapa limpio.
async function beginTurn() {
  const thisGame = game;
  stopTimer();
  game.roundActive = false;
  $("hud-timer").hidden = true;
  resetGuessMap();
  updateHud();

  const { location, heading } = game.current;
  // El botón "Estoy listo" responde desde que aparece, aunque el lugar aún esté cargando.
  const ready = isDuel() ? showHandoff() : null;
  panorama.setPano(location.pano);
  panorama.setPov({ heading, pitch: 0 });
  panorama.setZoom(0);
  if (game.turn === 0) await waitForPanorama();
  if (game !== thisGame) return;
  $("loading").hidden = true;

  if (ready) {
    await ready;
    if (game !== thisGame) return;
  }
  game.roundActive = true;
  if (timeLimit) startTimer(timeLimit);
}

// Pantalla de "pasa el turno": tapa el panorama hasta que el jugador está listo.
function showHandoff() {
  const player = game.players[game.turn];
  const other = game.players[1 - game.turn];
  $("handoff-dot").className = `dot big${game.turn === 1 ? " p2" : ""}`;
  $("handoff-title").textContent = `Turno de ${player.name}`;
  $("handoff-text").textContent = `Ronda ${game.rounds.length + 1} de ${ROUNDS}. ${other.name}, no mires la pantalla.`;
  $("handoff").hidden = false;
  return waitForReady();
}

function waitForReady() {
  return new Promise((resolve) => {
    $("handoff-btn").addEventListener("click", () => {
      $("handoff").hidden = true;
      resolve();
    }, { once: true });
    $("handoff-btn").focus();
  });
}

function waitForPanorama() {
  return new Promise((resolve) => {
    const listener = panorama.addListener("status_changed", done);
    const timeout = setTimeout(done, 2500);
    function done() {
      clearTimeout(timeout);
      listener.remove();
      resolve();
    }
  });
}

function updateHud() {
  const player = game.players[game.turn];
  const hudPlayer = $("hud-player");
  hudPlayer.replaceChildren();
  if (isDuel()) {
    const dot = document.createElement("span");
    dot.className = `dot${game.turn === 1 ? " p2" : ""}`;
    hudPlayer.append(dot, ` ${player.name}`);
  } else {
    hudPlayer.textContent = "🌍 Mundo";
  }
  $("hud-round").textContent = game.rounds.length + 1;
  $("hud-score").textContent = fmt(player.score);
}

// Busca un panorama oficial de Google, de exterior y con calles para moverse.
async function findLocation() {
  const { StreetViewSource, StreetViewPreference } = google.maps;
  const source = StreetViewSource.GOOGLE ?? StreetViewSource.OUTDOOR;
  for (let attempt = 0; attempt < 30; attempt++) {
    const country = pick(MG_COUNTRIES);
    const spread = attempt < 15 ? country.spread : country.spread / 3; // si falla, se acerca a la ciudad
    const point = offsetPoint(pick(country.seeds), Math.sqrt(Math.random()) * spread);
    try {
      const { data } = await sv.getPanorama({
        location: point,
        radius: 5000,
        sources: [source],
        preference: StreetViewPreference.NEAREST,
      });
      const loc = data.location;
      if (!loc?.pano || game.used.has(loc.pano) || !data.links?.length) continue;
      return { pano: loc.pano, lat: loc.latLng.lat(), lng: loc.latLng.lng(), country: country.name };
    } catch {
      // Sin cobertura cerca de ese punto: probamos otro.
    }
  }
  throw new Error("Sin cobertura de Street View");
}

function resetGuessMap() {
  guessMarker?.setMap(null);
  guessMarker = null;
  const btn = $("guess-btn");
  btn.disabled = true;
  btn.textContent = "Marca un punto en el mapa";
  guessMap.setCenter({ lat: 20, lng: 0 });
  guessMap.setZoom(1);
}

function placeGuess(latLng) {
  if (!game?.roundActive) return;
  if (!guessMarker) {
    guessMarker = new google.maps.Marker({ map: guessMap, icon: pin(PLAYER_COLORS[game.turn]), clickable: false });
  }
  guessMarker.setPosition(latLng);
  const btn = $("guess-btn");
  btn.disabled = false;
  btn.textContent = "Adivinar";
}

function pin(cssVar, scale = 8) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: cssColor(cssVar),
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

function submitGuess(timedOut = false) {
  if (!game?.roundActive) return;
  if (!guessMarker && !timedOut) return;
  game.roundActive = false;
  stopTimer();

  const { location } = game.current;
  const guess = guessMarker
    ? { lat: guessMarker.getPosition().lat(), lng: guessMarker.getPosition().lng() }
    : null;
  const km = guess ? distanceKm(guess, location) : null;
  const points = guess ? scoreFor(km) : 0;
  game.current.guesses.push({ guess, km, points });
  game.players[game.turn].score += points;

  // En 2 jugadores, el segundo juega el mismo lugar sin ver la respuesta del primero.
  if (game.turn < game.players.length - 1) {
    game.turn++;
    beginTurn();
    return;
  }
  game.rounds.push(game.current);
  showRoundResult();
}

// ---------- Cronómetro ----------
function startTimer(seconds) {
  const deadline = performance.now() + seconds * 1000;
  const el = $("hud-timer");
  el.hidden = false;
  const tick = () => {
    const left = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    el.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    el.classList.toggle("low", left <= 10);
    if (left <= 0) submitGuess(true);
  };
  tick();
  timerId = setInterval(tick, 250);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// ---------- Resultados ----------
function clearResultOverlays() {
  resultOverlays.forEach((o) => o.setMap(null));
  resultOverlays = [];
}

function drawRound(round, label) {
  resultOverlays.push(new google.maps.Marker({
    map: resultMap,
    position: round.location,
    icon: pin("--answer", label ? 11 : 9),
    label: label ? { text: label, color: "#ffffff", fontWeight: "700", fontSize: "12px" } : null,
    title: "Lugar real",
    zIndex: 10,
  }));

  round.guesses.forEach(({ guess }, i) => {
    if (!guess) return;
    const color = PLAYER_COLORS[i];
    resultOverlays.push(
      new google.maps.Marker({ map: resultMap, position: guess, icon: pin(color), title: game.players[i].name }),
      new google.maps.Polyline({
        map: resultMap,
        path: [guess, round.location],
        geodesic: true,
        strokeOpacity: 0,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: cssColor(color), scale: 3 },
          offset: "0",
          repeat: "12px",
        }],
      }),
    );
  });
}

function fitResult(rounds) {
  // Se espera un momento para que el mapa ya tenga tamaño al mostrarse la pantalla.
  setTimeout(() => {
    const bounds = new google.maps.LatLngBounds();
    let points = 0;
    rounds.forEach((r) => {
      bounds.extend(r.location);
      points++;
      r.guesses.forEach(({ guess }) => { if (guess) { bounds.extend(guess); points++; } });
    });
    if (points === 1) {
      resultMap.setCenter(rounds[0].location);
      resultMap.setZoom(5);
      return;
    }
    // Deja libre la parte de abajo, donde está el panel de resultados.
    const panelHeight = document.querySelector(".result-panel").offsetHeight;
    const bottom = Math.min(panelHeight + 50, screens.result.clientHeight * 0.65);
    resultMap.fitBounds(bounds, { top: 60, right: 60, bottom, left: 60 });
    google.maps.event.addListenerOnce(resultMap, "idle", () => {
      // Si con ese margen no caben todos (lugares muy lejanos), se reencuadra con margen pequeño.
      const view = resultMap.getBounds();
      const allVisible = view && view.contains(bounds.getNorthEast()) && view.contains(bounds.getSouthWest());
      if (!allVisible) resultMap.fitBounds(bounds, 30);
      else if (resultMap.getZoom() > 15) resultMap.setZoom(15);
    });
  }, 50);
}

function setBar(fraction) {
  const wrap = $("result-bar-wrap");
  const bar = $("result-bar");
  wrap.hidden = fraction === null;
  if (fraction === null) return;
  bar.style.width = "0";
  bar.getBoundingClientRect(); // fuerza el reinicio para que se vea la animación
  bar.style.width = `${Math.round(fraction * 100)}%`;
}

// Rellena la lista del panel. Cada fila es una lista de celdas (texto o nodos).
function setList(rows, { two = false, head = null } = {}) {
  const list = $("final-list");
  list.classList.toggle("two", two);
  const makeRow = (cells, className = "") => {
    const li = document.createElement("li");
    if (className) li.className = className;
    cells.forEach((cell) => {
      const span = document.createElement("span");
      if (cell && typeof cell === "object" && !(cell instanceof Node)) {
        span.className = cell.className || "";
        span.append(...[].concat(cell.content));
      } else {
        span.append(cell);
      }
      li.append(span);
    });
    return li;
  };
  list.replaceChildren(...(head ? [makeRow(head, "head")] : []), ...rows.map((r) => makeRow(r)));
  list.hidden = rows.length === 0;
}

function playerLabel(i, text) {
  const dot = document.createElement("span");
  dot.className = `dot${i === 1 ? " p2" : ""}`;
  return { className: "who", content: [dot, text] };
}

function setDetail(...parts) {
  const el = $("result-detail");
  el.replaceChildren();
  parts.forEach((part) => {
    if (typeof part === "string") el.append(part);
    else {
      const strong = document.createElement("strong");
      strong.textContent = part.strong;
      el.append(strong);
    }
  });
}

function showRoundResult() {
  const round = game.rounds.at(-1);
  const isLast = game.rounds.length === ROUNDS;
  goTo("result");
  clearResultOverlays();
  drawRound(round, null);

  if (!isDuel()) {
    const { km, points } = round.guesses[0];
    $("result-title").textContent = `${fmt(points)} puntos`;
    if (km === null) setDetail("Se acabó el tiempo sin respuesta. Era en ", { strong: round.location.country }, ".");
    else setDetail("Tu respuesta estaba a ", { strong: formatDistance(km) }, ". Era en ", { strong: round.location.country }, ".");
    setBar(points / MAX_POINTS);
    setList([]);
  } else {
    const [a, b] = round.guesses;
    const winner = a.points === b.points ? null : a.points > b.points ? 0 : 1;
    $("result-title").textContent = winner === null ? "Empate en esta ronda" : `Gana la ronda ${game.players[winner].name}`;
    setDetail("Era en ", { strong: round.location.country }, ".");
    setBar(null);
    setList(round.guesses.map((g, i) => [
      playerLabel(i, `${game.players[i].name} · ${g.guess ? formatDistance(g.km) : "sin respuesta"}`),
      `+${fmt(g.points)} (total ${fmt(game.players[i].score)})`,
    ]));
  }

  fitResult([round]);
  $("result-link").hidden = false;
  $("result-link").href = `https://www.google.com/maps/@?api=1&map_action=pano&pano=${encodeURIComponent(round.location.pano)}`;
  $("next-btn").hidden = false;
  $("next-btn").textContent = isLast ? "Ver resultado final" : "Siguiente ronda";
  $("again-btn").hidden = true;
  $("menu-btn").hidden = true;
}

function verdict(fraction) {
  if (fraction >= 0.9) return "¡Increíble, eres un experto en geografía!";
  if (fraction >= 0.7) return "¡Muy buen ojo!";
  if (fraction >= 0.4) return "Nada mal.";
  return "A seguir explorando.";
}

function showFinal() {
  const max = ROUNDS * MAX_POINTS;
  clearResultOverlays();
  game.rounds.forEach((r, i) => drawRound(r, String(i + 1)));

  if (!isDuel()) {
    const total = game.players[0].score;
    $("result-title").textContent = `${fmt(total)} / ${fmt(max)} puntos`;
    setDetail(verdict(total / max));
    setBar(total / max);
    setList(game.rounds.map((r, i) => {
      const g = r.guesses[0];
      return [`Ronda ${i + 1} · ${g.guess ? formatDistance(g.km) : "sin respuesta"} · ${r.location.country}`, fmt(g.points)];
    }));
  } else {
    const [p1, p2] = game.players;
    const winner = p1.score === p2.score ? null : p1.score > p2.score ? p1 : p2;
    $("result-title").textContent = winner ? `🏆 Gana ${winner.name}` : "¡Empate!";
    setDetail(`${p1.name} ${fmt(p1.score)} · ${p2.name} ${fmt(p2.score)}`);
    setBar(null);
    setList(
      game.rounds.map((r, i) => {
        const [a, b] = r.guesses.map((g) => g.points);
        return [
          `Ronda ${i + 1} · ${r.location.country}`,
          { className: a > b ? "win" : "", content: fmt(a) },
          { className: b > a ? "win" : "", content: fmt(b) },
        ];
      }),
      { two: true, head: ["", playerLabel(0, p1.name), playerLabel(1, p2.name)] },
    );
  }

  fitResult(game.rounds);
  $("result-link").hidden = true;
  $("next-btn").hidden = true;
  $("again-btn").hidden = false;
  $("menu-btn").hidden = false;
}

// ---------- Eventos ----------
$("play").addEventListener("click", startGame);
$("guess-btn").addEventListener("click", () => submitGuess());
$("back-start").addEventListener("click", () => {
  if (game?.current) panorama.setPano(game.current.location.pano);
});
$("next-btn").addEventListener("click", () => {
  if (game.rounds.length >= ROUNDS) return showFinal();
  goTo("game");
  startRound();
});
$("again-btn").addEventListener("click", startGame);
$("menu-btn").addEventListener("click", () => {
  game = null;
  goTo("menu");
});

addEventListener("keydown", (e) => {
  if (e.key === "Enter" && game?.roundActive && guessMarker && !screens.game.hidden) {
    e.preventDefault();
    submitGuess();
  }
});

// ---------- Arranque ----------
buildMenu();
loadGoogleMaps();
