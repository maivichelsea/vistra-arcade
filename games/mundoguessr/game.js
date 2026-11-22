// MundoGuessr: aparece en un lugar con Street View y adivina dónde estás.
const ROUNDS = 5;
const MAX_POINTS = 5000;
const WORLD_SIZE_KM = 20000;
const PLACEHOLDER_KEY = "PEGA_AQUI_TU_CLAVE";

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

// Tamaño aproximado del país (diagonal de sus ciudades) para escalar la puntuación.
function countrySizeKm(country) {
  const lats = country.seeds.map((s) => s[0]);
  const lngs = country.seeds.map((s) => s[1]);
  const sw = { lat: Math.min(...lats), lng: Math.min(...lngs) };
  const ne = { lat: Math.max(...lats), lng: Math.max(...lngs) };
  return Math.max(300, distanceKm(sw, ne) * 1.2);
}

// 5000 puntos si aciertas (menos de 50 m) y baja exponencialmente con la distancia,
// relativa al tamaño del mapa: en Mundo, a 2000 km obtienes ~1840 puntos.
function scoreFor(km, sizeKm) {
  if (km < 0.05) return MAX_POINTS;
  return Math.round(MAX_POINTS * Math.exp((-10 * km) / sizeKm));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`;
  return `${fmt(Math.round(km))} km`;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- Estado ----------
let selectedMap = "world";
let timeLimit = 0;
let game = null;
let sv, panorama, guessMap, resultMap, guessMarker;
let resultOverlays = [];
let timerId = null;

// ---------- Menú ----------
function buildMenu() {
  const items = [
    { id: "world", name: "Mundo", sub: `${MG_COUNTRIES.length} países mezclados` },
    ...MG_COUNTRIES.map((c) => ({ id: c.id, name: c.name, sub: `${c.seeds.length} zonas` })),
  ];
  $("map-list").replaceChildren(...items.map((item) => {
    const b = document.createElement("button");
    b.className = "map-option" + (item.id === "world" ? " world" : "");
    b.dataset.id = item.id;
    b.innerHTML = `<strong></strong><small></small>`;
    b.querySelector("strong").textContent = item.id === "world" ? "🌍 Mundo" : item.name;
    b.querySelector("small").textContent = item.sub;
    b.addEventListener("click", () => selectMap(item.id));
    return b;
  }));
  selectMap(selectedMap);

  document.querySelectorAll('input[name="time"]').forEach((input) => {
    input.addEventListener("change", () => { timeLimit = Number(input.value); });
  });
}

function selectMap(id) {
  selectedMap = id;
  document.querySelectorAll(".map-option").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
}

function mapInfo(id) {
  if (id === "world") return { id, name: "Mundo", sizeKm: WORLD_SIZE_KM, country: null };
  const country = MG_COUNTRIES.find((c) => c.id === id);
  return { id, name: country.name, sizeKm: countrySizeKm(country), country };
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
function startGame() {
  game = { map: mapInfo(selectedMap), rounds: [], used: new Set(), current: null, roundActive: false };
  goTo("game");
  ensureGoogleObjects();
  $("hud-map").textContent = game.map.name;
  $("hud-rounds").textContent = ROUNDS;
  startRound();
}

async function startRound() {
  const thisGame = game;
  stopTimer();
  game.roundActive = false;
  $("hud-round").textContent = game.rounds.length + 1;
  $("hud-score").textContent = fmt(totalScore());
  $("hud-timer").hidden = true;
  $("loading-text").textContent = "Buscando un lugar…";
  $("loading").hidden = false;
  resetGuessMap();

  let location;
  try {
    location = await findLocation(game.map);
  } catch {
    $("loading-text").textContent = "No se encontró un lugar con Street View. Vuelve a intentarlo.";
    setTimeout(() => { if (game === thisGame) goTo("menu"); }, 2500);
    return;
  }
  if (game !== thisGame) return; // se salió de la partida mientras buscaba

  game.used.add(location.pano);
  game.current = { location };
  panorama.setPano(location.pano);
  panorama.setPov({ heading: Math.random() * 360, pitch: 0 });
  panorama.setZoom(0);
  await waitForPanorama();

  $("loading").hidden = true;
  game.roundActive = true;
  if (timeLimit) startTimer(timeLimit);
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

// Busca un panorama oficial de Google, de exterior y con calles para moverse.
async function findLocation(map) {
  const { StreetViewSource, StreetViewPreference } = google.maps;
  const source = StreetViewSource.GOOGLE ?? StreetViewSource.OUTDOOR;
  for (let attempt = 0; attempt < 30; attempt++) {
    const country = map.country ?? pick(MG_COUNTRIES);
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
  if (game.map.country) {
    const bounds = new google.maps.LatLngBounds();
    game.map.country.seeds.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    guessMap.fitBounds(bounds, 10);
  } else {
    guessMap.setCenter({ lat: 20, lng: 0 });
    guessMap.setZoom(1);
  }
}

function placeGuess(latLng) {
  if (!game?.roundActive) return;
  if (!guessMarker) guessMarker = new google.maps.Marker({ map: guessMap, icon: pin("--guess"), clickable: false });
  guessMarker.setPosition(latLng);
  const btn = $("guess-btn");
  btn.disabled = false;
  btn.textContent = "Adivinar";
}

function pin(cssVar, scale = 8) {
  const color = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
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

  const location = game.current.location;
  const guess = guessMarker
    ? { lat: guessMarker.getPosition().lat(), lng: guessMarker.getPosition().lng() }
    : null;
  const km = guess ? distanceKm(guess, location) : null;
  const points = guess ? scoreFor(km, game.map.sizeKm) : 0;
  game.rounds.push({ location, guess, km, points });
  showRoundResult();
}

const totalScore = () => (game ? game.rounds.reduce((sum, r) => sum + r.points, 0) : 0);

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
  const answer = new google.maps.Marker({
    map: resultMap,
    position: round.location,
    icon: pin("--answer", label ? 11 : 9),
    label: label ? { text: label, color: "#ffffff", fontWeight: "700", fontSize: "12px" } : null,
    title: "Lugar real",
  });
  resultOverlays.push(answer);
  if (!round.guess) return;

  const guess = new google.maps.Marker({ map: resultMap, position: round.guess, icon: pin("--guess"), title: "Tu respuesta" });
  const line = new google.maps.Polyline({
    map: resultMap,
    path: [round.guess, round.location],
    geodesic: true,
    strokeOpacity: 0,
    icons: [{
      icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: getComputedStyle(document.documentElement).getPropertyValue("--guess").trim(), scale: 3 },
      offset: "0",
      repeat: "12px",
    }],
  });
  resultOverlays.push(guess, line);
}

function fitResult(rounds) {
  // Se espera un momento para que el mapa ya tenga tamaño al mostrarse la pantalla.
  setTimeout(() => {
    const bounds = new google.maps.LatLngBounds();
    rounds.forEach((r) => {
      bounds.extend(r.location);
      if (r.guess) bounds.extend(r.guess);
    });
    const onlyOnePoint = rounds.length === 1 && !rounds[0].guess;
    if (onlyOnePoint) {
      resultMap.setCenter(rounds[0].location);
      resultMap.setZoom(5);
      return;
    }
    // Deja libre la parte de abajo, donde está el panel de resultados.
    const panelHeight = document.querySelector(".result-panel").offsetHeight;
    const bottom = Math.min(panelHeight + 50, screens.result.clientHeight * 0.65);
    resultMap.fitBounds(bounds, { top: 60, right: 60, bottom, left: 60 });
    google.maps.event.addListenerOnce(resultMap, "idle", () => {
      if (resultMap.getZoom() > 15) resultMap.setZoom(15);
    });
  }, 50);
}

function setBar(fraction) {
  const bar = $("result-bar");
  bar.style.width = "0";
  bar.getBoundingClientRect(); // fuerza el reinicio para que se vea la animación
  bar.style.width = `${Math.round(fraction * 100)}%`;
}

function showRoundResult() {
  const round = game.rounds.at(-1);
  const isLast = game.rounds.length === ROUNDS;
  goTo("result");
  clearResultOverlays();
  drawRound(round, null);
  fitResult([round]);

  const where = game.map.country ? "" : ` Era en <strong>${round.location.country}</strong>.`;
  $("result-title").textContent = `${fmt(round.points)} puntos`;
  $("result-detail").innerHTML = round.guess
    ? `Tu respuesta estaba a <strong>${formatDistance(round.km)}</strong>.${where}`
    : `Se acabó el tiempo sin respuesta.${where}`;
  setBar(round.points / MAX_POINTS);

  $("final-list").hidden = true;
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
  const total = totalScore();
  const max = ROUNDS * MAX_POINTS;
  clearResultOverlays();
  game.rounds.forEach((r, i) => drawRound(r, String(i + 1)));
  fitResult(game.rounds);

  $("result-title").textContent = `${fmt(total)} / ${fmt(max)} puntos`;
  $("result-detail").textContent = `${game.map.name} · ${verdict(total / max)}`;
  setBar(total / max);

  $("final-list").replaceChildren(...game.rounds.map((r, i) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    const right = document.createElement("span");
    left.textContent = `Ronda ${i + 1} · ${r.guess ? formatDistance(r.km) : "sin respuesta"}${game.map.country ? "" : ` · ${r.location.country}`}`;
    right.textContent = fmt(r.points);
    li.append(left, right);
    return li;
  }));
  $("final-list").hidden = false;
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
