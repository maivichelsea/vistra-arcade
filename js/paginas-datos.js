// Páginas que abren en la red del trabajo y se pueden usar sin iniciar sesión.
// La página paginas.html se construye a partir de esta lista: para añadir una, basta con
// añadir una entrada aquí (no hace falta tocar el HTML).
//
// estado: "probada" (se comprobó que abre) | "por-probar" (de Google/Microsoft, debería abrir)
// nota: aviso opcional que se muestra en la tarjeta (límites, si pide cuenta para algo, etc.).

// Portada de cada categoría: degradado, emoji decorativo y orden en la página.
const VISTRA_PAGINAS_CATEGORIAS = {
  "Inteligencia artificial": { desde: "#5b2be0", hasta: "#1a1546", emoji: "✨" },
  "Herramientas de Google":  { desde: "#0f7a55", hasta: "#12213f", emoji: "🧰" },
  "Entidades del Estado":    { desde: "#9a6a00", hasta: "#2a1a08", emoji: "🏛️" },
  "Noticias":                { desde: "#44476a", hasta: "#12112a", emoji: "📰" },
  "Diseño e imágenes":       { desde: "#c2185b", hasta: "#2b0b2a", emoji: "🎨" },
  "Programación":            { desde: "#00796b", hasta: "#0b1f2a", emoji: "💻" },
  "Clima":                   { desde: "#0288d1", hasta: "#0f2547", emoji: "⛅" },
};

const VISTRA_PAGINAS = [
  // Inteligencia artificial
  { nombre: "Gemini", url: "https://gemini.google.com", categoria: "Inteligencia artificial", estado: "probada",
    descripcion: "Asistente de IA de Google para preguntar, resumir, traducir y redactar textos.",
    nota: "Chat con límites y no guarda el historial." },
  { nombre: "Microsoft Copilot", url: "https://copilot.microsoft.com", categoria: "Inteligencia artificial", estado: "probada",
    descripcion: "Asistente de IA de Microsoft con respuestas apoyadas en búsquedas de la web.",
    nota: "Chat con límites." },

  // Herramientas de Google
  { nombre: "Google Translate", url: "https://translate.google.com", categoria: "Herramientas de Google", estado: "probada",
    descripcion: "Traduce textos, documentos y páginas web entre más de cien idiomas." },
  { nombre: "Google Maps", url: "https://maps.google.com", categoria: "Herramientas de Google", estado: "probada",
    descripcion: "Mapas, rutas, tráfico y lugares de todo el mundo, con Street View." },
  { nombre: "Google Lens", url: "https://lens.google.com", categoria: "Herramientas de Google", estado: "por-probar",
    descripcion: "Sube una imagen y busca información sobre lo que aparece en ella." },
  { nombre: "Google Earth", url: "https://earth.google.com", categoria: "Herramientas de Google", estado: "por-probar",
    descripcion: "Recorre el planeta en 3D desde el navegador y visita cualquier ciudad." },
  { nombre: "Google Trends", url: "https://trends.google.com", categoria: "Herramientas de Google", estado: "por-probar",
    descripcion: "Descubre qué se está buscando y cómo cambia el interés con el tiempo." },
  { nombre: "Google Fonts", url: "https://fonts.google.com", categoria: "Herramientas de Google", estado: "probada",
    descripcion: "Catálogo de tipografías gratuitas para probar y descargar." },

  // Entidades del Estado
  { nombre: "Corte Constitucional", url: "https://www.corteconstitucional.gov.co", categoria: "Entidades del Estado", estado: "probada",
    descripcion: "Consulta sentencias, autos y comunicados de la Corte Constitucional." },
  { nombre: "Contraloría", url: "https://www.contraloria.gov.co", categoria: "Entidades del Estado", estado: "probada",
    descripcion: "Portal de la Contraloría General de la República: informes, trámites y noticias." },

  // Noticias
  { nombre: "Semana", url: "https://www.semana.com", categoria: "Noticias", estado: "probada",
    descripcion: "Actualidad, política, economía y opinión de Colombia." },
  { nombre: "El País", url: "https://elpais.com", categoria: "Noticias", estado: "probada",
    descripcion: "Noticias internacionales, de España y de América en español.",
    nota: "Algunas notas piden suscripción." },
  { nombre: "Infobae", url: "https://www.infobae.com", categoria: "Noticias", estado: "probada",
    descripcion: "Noticias de última hora de América Latina y el mundo." },

  // Diseño e imágenes
  { nombre: "Flaticon", url: "https://www.flaticon.com", categoria: "Diseño e imágenes", estado: "probada",
    descripcion: "Millones de íconos y stickers para presentaciones y documentos.",
    nota: "Algunas descargas piden cuenta." },

  // Programación
  { nombre: "W3Schools", url: "https://www.w3schools.com", categoria: "Programación", estado: "probada",
    descripcion: "Tutoriales de HTML, CSS, JavaScript, SQL y más, con el editor “Try it”." },

  // Clima
  { nombre: "AccuWeather", url: "https://www.accuweather.com", categoria: "Clima", estado: "probada",
    descripcion: "Pronóstico del tiempo por horas y por días para tu ciudad." },
];
