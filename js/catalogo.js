// Catálogo de Vistra Arcade.
// La portada se construye a partir de estas listas: para añadir un juego o una novedad,
// basta con añadir una entrada aquí (no hace falta tocar el HTML).

// Juegos disponibles.
// estado: "nuevo" | "disponible" | "beta"
// imagen: ilustración 16:9 (se recomienda SVG de 320×180 en img/juegos/).
const VISTRA_JUEGOS = [
  {
    id: "serpiente",
    nombre: "Serpiente Neón",
    url: "games/serpiente/index.html",
    imagen: "img/juegos/serpiente.svg",
    categoria: "Arcade",
    estado: "nuevo",
    descripcion: "Recorre la cuadrícula, come fruta y crece sin chocar. Cada fruta te hace más rápida.",
    etiquetas: ["1 jugador", "3 velocidades", "Funciona sin conexión"],
  },
  {
    id: "sudoku",
    nombre: "Sudoku",
    url: "games/sudoku/index.html",
    imagen: "img/juegos/sudoku.svg",
    categoria: "Lógica",
    estado: "nuevo",
    descripcion: "Completa la cuadrícula de 9×9 sin repetir números en filas, columnas ni cajas. Cuatro niveles de dificultad.",
    etiquetas: ["1 jugador", "Notas y pistas", "Funciona sin conexión"],
  },
  {
    id: "billar",
    nombre: "Billar",
    url: "games/billar/index.html",
    imagen: "img/juegos/billar.svg",
    categoria: "Deportes",
    estado: "nuevo",
    descripcion: "Bola 8 con física realista: elige tu grupo, mete tus bolas y cierra la partida con la 8.",
    etiquetas: ["1 jugador vs CPU", "2 jugadores", "Funciona sin conexión"],
  },
  {
    id: "mundoguessr",
    nombre: "MundoGuessr",
    url: "games/mundoguessr/index.html",
    imagen: "img/juegos/mundoguessr.svg",
    categoria: "Geografía",
    estado: "nuevo",
    descripcion: "Apareces en algún lugar del mundo con Street View. Explora, busca pistas y marca dónde crees que estás.",
    etiquetas: ["1–2 jugadores", "Requiere internet"],
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

// Novedades, de la más reciente a la más antigua. fecha en formato AAAA-MM-DD.
const VISTRA_NOVEDADES = [
  {
    fecha: "2026-11-25",
    juego: "serpiente",
    titulo: "Nuevo juego: Serpiente Neón",
    texto: "Tres velocidades, estrellas doradas que dan puntos extra y récord para cada velocidad. En el móvil se juega deslizando el dedo.",
  },
  {
    fecha: "2026-11-25",
    juego: "mundoguessr",
    titulo: "MundoGuessr: 14 países nuevos",
    texto: "Llegan Bolivia, Guatemala, Costa Rica, Panamá, República Dominicana, Puerto Rico, Países Bajos, Bélgica, Suiza, Austria, Irlanda, Polonia, Croacia y Grecia.",
  },
  {
    fecha: "2026-11-24",
    juego: "sudoku",
    titulo: "Nuevo juego: Sudoku",
    texto: "Tableros generados al azar con solución única, cuatro niveles, modo notas, pistas y deshacer.",
  },
  {
    fecha: "2026-11-22",
    juego: "billar",
    titulo: "Nuevo juego: Billar",
    texto: "Partidas de bola 8 contra el ordenador o con un amigo en el mismo PC.",
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
