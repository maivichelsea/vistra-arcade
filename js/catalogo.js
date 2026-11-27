// Catálogo de Vistra Arcade.
// La portada se construye a partir de estas listas: para añadir un juego, o una novedad, basta con añadir una entrada aquí (no hace falta tocar el HTML).

// Juegos disponibles.
// estado: "nuevo" | "disponible" | "beta"
// imagen: ilustración 16:9 (se recomienda SVG de 320×180 en img/juegos/).
const VISTRA_JUEGOS = [
  {
    id: "crisol",
    nombre: "Crisol",
    url: "games/crisol/index.html",
    imagen: "img/juegos/crisol.svg",
    categoria: "Lógica",
    estado: "nuevo",
    descripcion: "Empieza con agua, fuego, tierra y aire y combínalos para descubrir más de 160 elementos: animales, personas e inventos.",
    etiquetas: ["1 jugador", "163 elementos", "Funciona sin conexión"],
  },
  {
    id: "banderas",
    nombre: "Banderas y Capitales",
    url: "games/banderas/index.html",
    imagen: "img/juegos/banderas.svg",
    categoria: "Geografía",
    estado: "nuevo",
    descripcion: "Quiz contra el reloj: adivina banderas y capitales de todo el mundo o de un solo continente.",
    etiquetas: ["1 jugador", "Sin clave de Google", "Funciona sin conexión"],
  },
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
    descripcion: "Rellena el tablero del 1 al 9 sin repetir. Cuatro dificultades, notas, pistas y guardado automático.",
    etiquetas: ["1 jugador", "4 dificultades", "Funciona sin conexión"],
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
    fecha: "2026-11-27",
    juego: "crisol",
    titulo: "Nuevo juego: Crisol",
    texto: "Mezcla los cuatro elementos y descubre 163 cosas: del vapor y el barro hasta dragones, cohetes y el propio Vistra Arcade.",
  },
  {
    fecha: "2026-11-27",
    juego: "banderas",
    titulo: "Nuevo juego: Banderas y Capitales",
    texto: "Más de 190 países, preguntas por continente, tres tiempos por pregunta y bonus por rachas de aciertos.",
  },
  {
    fecha: "2026-11-26",
    juego: null,
    titulo: "Nueva sección: Libros",
    texto: "Lee tus PDF en el arcade: guarda por dónde vas, añade marcadores y resalta texto en cuatro colores.",
  },
  {
    fecha: "2026-11-25",
    juego: "mundoguessr",
    titulo: "MundoGuessr: tabla de récords",
    texto: "Escribe tu nombre antes de jugar y tu mejor resultado entra al ranking. Javier lidera con 24.966 puntos.",
  },
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
    fecha: "2026-11-22",
    juego: "sudoku",
    titulo: "Nuevo juego: Sudoku",
    texto: "Sudokus nuevos en cada partida, con solución única, notas, pistas y cuatro niveles de dificultad.",
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
