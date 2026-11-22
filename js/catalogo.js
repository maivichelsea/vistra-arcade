// Catálogo de Vistra Arcade.
// La portada se construye a partir de estas listas: para añadir un juego, una novedad
// o un próximo lanzamiento, basta con añadir una entrada aquí (no hace falta tocar el HTML).

// Juegos disponibles.
// estado: "nuevo" | "disponible" | "beta"
// imagen: ilustración 16:9 (se recomienda SVG de 320×180 en img/juegos/).
const VISTRA_JUEGOS = [
  {
    id: "mundoguessr",
    nombre: "MundoGuessr",
    url: "games/mundoguessr/index.html",
    imagen: "img/juegos/mundoguessr.svg",
    categoria: "Geografía",
    estado: "nuevo",
    descripcion: "Apareces en algún lugar del mundo con Street View. Explora, busca pistas y marca dónde crees que estás.",
    etiquetas: ["1–2 jugadores", "Desafío a distancia", "Requiere internet"],
  },
  {
    id: "buscaminas",
    nombre: "Buscaminas",
    url: "games/buscaminas/index.html",
    imagen: "img/juegos/buscaminas.svg",
    categoria: "Lógica",
    estado: "disponible",
    descripcion: "Despeja el tablero sin pisar ninguna mina. Cuatro niveles, desde principiante hasta personalizado.",
    etiquetas: ["1 jugador", "Funciona sin conexión"],
  },
];

// Juegos en desarrollo. Son ideas de ejemplo: cámbialas por las tuyas.
const VISTRA_PROXIMOS = [
  {
    nombre: "Memoria",
    categoria: "Memoria",
    imagen: "img/proximos/memoria.svg",
    descripcion: "Encuentra todas las parejas de cartas en el menor número de intentos.",
  },
  {
    nombre: "Serpiente Neón",
    categoria: "Arcade",
    imagen: "img/proximos/serpiente.svg",
    descripcion: "Recorre la cuadrícula, come fruta y crece sin chocar contigo misma.",
  },
  {
    nombre: "Palabra Oculta",
    categoria: "Palabras",
    imagen: "img/proximos/palabra.svg",
    descripcion: "Adivina la palabra secreta letra a letra con pistas de colores.",
  },
];

// Novedades, de la más reciente a la más antigua. fecha en formato AAAA-MM-DD.
const VISTRA_NOVEDADES = [
  {
    fecha: "2026-11-22",
    juego: "mundoguessr",
    titulo: "Desafío a distancia en MundoGuessr",
    texto: "Al terminar una partida, crea un código y mándaselo a un amigo: jugará tus mismos 5 lugares y comparará su puntuación con la tuya.",
  },
  {
    fecha: "2026-11-22",
    juego: "mundoguessr",
    titulo: "Modo 2 jugadores en el mismo PC",
    texto: "Jugad por turnos el mismo lugar, sin ver la respuesta del otro. Gana quien sume más puntos en 5 rondas.",
  },
  {
    fecha: "2026-11-22",
    juego: "mundoguessr",
    titulo: "Nuevo juego: MundoGuessr",
    texto: "Explora lugares de todo el mundo con Google Street View y adivina dónde estás.",
  },
  {
    fecha: "2026-11-22",
    juego: null,
    titulo: "Modo oscuro automático",
    texto: "Todo el arcade se adapta al modo claro u oscuro de tu sistema.",
  },
];
