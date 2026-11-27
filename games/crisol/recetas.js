// Crisol: elementos y recetas.
// Cada elemento tiene un emoji. Cada receta es "A + B = Resultado" (el orden de A y B no importa).
// Para añadir elementos basta con añadir líneas aquí: el juego calcula el resto (total, finales, pistas).

const CRISOL_BASICOS = ["Agua", "Fuego", "Tierra", "Aire"];

const CRISOL_EMOJI = {
  "Agua": "💧", "Fuego": "🔥", "Tierra": "🟫", "Aire": "💨",
  "Vapor": "♨️", "Barro": "🟤", "Lava": "🟧", "Energía": "⚡", "Polvo": "🌫️", "Lluvia": "🌧️",
  "Charco": "💦", "Lago": "🏞️", "Mar": "🌊", "Océano": "🐋", "Presión": "🗜️", "Viento": "🌬️",
  "Nube": "☁️", "Rayo": "🌩️", "Tormenta": "⛈️", "Huracán": "🌀", "Tornado": "🌪️",
  "Piedra": "🪨", "Metal": "🔩", "Arena": "⏳", "Vidrio": "🪟", "Muro": "🧱", "Casa": "🏠",
  "Ladrillo": "🧱", "Volcán": "🌋", "Pólvora": "🧨", "Explosión": "💥", "Electricidad": "🔌",
  "Montaña": "⛰️", "Frío": "🥶", "Hielo": "🧊", "Nieve": "❄️", "Muñeco de nieve": "☃️",
  "Glaciar": "🏔️", "Iceberg": "🧊", "Terremoto": "📳", "Tsunami": "🌊", "Río": "🏞️", "Cascada": "🚿",
  "Niebla": "🌁", "Isla": "🏝️", "Desierto": "🏜️", "Playa": "🏖️", "Oasis": "🌴", "Sal": "🧂",
  "Planta": "🌱", "Hierba": "🌿", "Flor": "🌸", "Árbol": "🌳", "Bosque": "🌲", "Jardín": "🏡",
  "Cactus": "🌵", "Alga": "🪸", "Carbón": "⚫", "Diamante": "💎", "Ceniza": "🩶",
  "Vida": "🧬", "Bacteria": "🦠", "Animal": "🐾", "Humano": "🧑", "Pájaro": "🐦", "Huevo": "🥚",
  "Pez": "🐟", "Ballena": "🐳", "Rana": "🐸", "Lagarto": "🦎", "Dinosaurio": "🦖", "Fósil": "🦴",
  "Petróleo": "🛢️", "Lobo": "🐺", "Perro": "🐕", "Gato": "🐈", "Vaca": "🐄", "Caballo": "🐎",
  "Camello": "🐫", "Pingüino": "🐧", "Oso polar": "🐻‍❄️", "Abeja": "🐝", "Miel": "🍯",
  "Dragón": "🐉", "Unicornio": "🦄", "Gallina": "🐔",
  "Leche": "🥛", "Queso": "🧀", "Campo": "🌾", "Granja": "🚜", "Trigo": "🌾", "Maíz": "🌽",
  "Harina": "🫓", "Masa": "🥟", "Pan": "🍞", "Arepa": "🫓", "Pizza": "🍕", "Sándwich": "🥪",
  "Tortilla": "🍳", "Pastel": "🎂", "Café": "☕", "Tiempo": "⌛", "Reloj de arena": "⏳", "Reloj": "⏰",
  "Herramienta": "🔨", "Madera": "🪵", "Cabaña": "🛖", "Pueblo": "🏘️", "Ciudad": "🏙️", "Rueda": "🛞",
  "Carreta": "🛒", "Motor": "⚙️", "Coche": "🚗", "Tren": "🚆", "Barco": "🚢", "Velero": "⛵",
  "Avión": "✈️", "Cielo": "🌤️", "Sol": "☀️", "Luna": "🌙", "Estrella": "⭐", "Espacio": "🌌",
  "Planeta": "🪐", "Arcoíris": "🌈", "Cohete": "🚀", "Astronauta": "🧑‍🚀", "Bombilla": "💡",
  "Chip": "🔲", "Computadora": "💻", "Internet": "🌐", "Robot": "🤖", "Panel solar": "🔆",
  "Videojuego": "🎮", "Vistra Arcade": "🕹️", "Molino": "🌬️", "Oro": "🪙", "Dinero": "💵",
  "Banco": "🏦", "Amor": "❤️", "Bebé": "👶", "Familia": "👨‍👩‍👧", "Papel": "📄", "Tinta": "🖋️",
  "Libro": "📕", "Biblioteca": "📚", "Estudiante": "🧑‍🎓", "Ley": "⚖️", "Abogada": "👩‍⚖️",
  "Música": "🎵", "Guitarra": "🎸", "Granjero": "🧑‍🌾", "Pescador": "🎣", "Marinero": "🧑‍✈️",
  "Piloto": "🧑‍✈️", "Programadora": "👩‍💻", "Chef": "🧑‍🍳", "Fantasma": "👻", "Golem": "🗿",
  "Espada": "🗡️", "Caballero": "🛡️", "Castillo": "🏰", "Rey": "🤴", "Corona": "👑",
};

const CRISOL_RECETAS = `
Agua + Fuego = Vapor
Tierra + Agua = Barro
Tierra + Fuego = Lava
Fuego + Aire = Energía
Tierra + Aire = Polvo
Agua + Aire = Lluvia
Agua + Agua = Charco
Charco + Agua = Lago
Lago + Agua = Mar
Mar + Agua = Océano
Tierra + Tierra = Presión
Tierra + Presión = Montaña
Aire + Aire = Viento
Vapor + Aire = Nube
Nube + Energía = Rayo
Lluvia + Viento = Tormenta
Tormenta + Mar = Huracán
Tormenta + Viento = Tornado
Lava + Agua = Piedra
Lava + Aire = Piedra
Piedra + Fuego = Metal
Piedra + Agua = Arena
Arena + Fuego = Vidrio
Piedra + Piedra = Muro
Muro + Muro = Casa
Barro + Fuego = Ladrillo
Ladrillo + Ladrillo = Muro
Lava + Tierra = Volcán
Polvo + Fuego = Pólvora
Pólvora + Fuego = Explosión
Energía + Metal = Electricidad
Montaña + Aire = Frío
Agua + Frío = Hielo
Lluvia + Frío = Nieve
Nieve + Humano = Muñeco de nieve
Hielo + Montaña = Glaciar
Hielo + Mar = Iceberg
Tierra + Energía = Terremoto
Terremoto + Mar = Tsunami
Lluvia + Montaña = Río
Río + Montaña = Cascada
Nube + Tierra = Niebla
Tierra + Mar = Isla
Arena + Arena = Desierto
Arena + Mar = Playa
Desierto + Agua = Oasis
Mar + Sol = Sal
Lluvia + Tierra = Planta
Planta + Tierra = Hierba
Planta + Planta = Flor
Planta + Tiempo = Árbol
Árbol + Árbol = Bosque
Flor + Casa = Jardín
Planta + Desierto = Cactus
Planta + Mar = Alga
Árbol + Fuego = Carbón
Carbón + Presión = Diamante
Planta + Fuego = Ceniza
Mar + Energía = Vida
Océano + Energía = Vida
Vida + Charco = Bacteria
Vida + Tierra = Animal
Vida + Barro = Humano
Animal + Aire = Pájaro
Pájaro + Pájaro = Huevo
Pájaro + Granja = Gallina
Animal + Mar = Pez
Vida + Océano = Pez
Pez + Océano = Ballena
Pez + Barro = Rana
Huevo + Arena = Lagarto
Lagarto + Tiempo = Dinosaurio
Dinosaurio + Tiempo = Fósil
Fósil + Presión = Petróleo
Animal + Bosque = Lobo
Lobo + Humano = Perro
Animal + Casa = Gato
Animal + Hierba = Vaca
Animal + Viento = Caballo
Animal + Desierto = Camello
Pájaro + Hielo = Pingüino
Animal + Nieve = Oso polar
Animal + Flor = Abeja
Abeja + Flor = Miel
Lagarto + Fuego = Dragón
Caballo + Arcoíris = Unicornio
Vaca + Humano = Leche
Leche + Tiempo = Queso
Hierba + Hierba = Campo
Campo + Casa = Granja
Campo + Planta = Trigo
Campo + Sol = Maíz
Trigo + Piedra = Harina
Harina + Agua = Masa
Masa + Fuego = Pan
Maíz + Fuego = Arepa
Masa + Queso = Pizza
Pan + Queso = Sándwich
Huevo + Fuego = Tortilla
Masa + Huevo = Pastel
Planta + Vapor = Café
Vidrio + Arena = Reloj de arena
Reloj de arena + Reloj de arena = Tiempo
Tiempo + Herramienta = Reloj
Humano + Metal = Herramienta
Árbol + Herramienta = Madera
Madera + Madera = Cabaña
Casa + Casa = Pueblo
Pueblo + Pueblo = Ciudad
Madera + Herramienta = Rueda
Rueda + Caballo = Carreta
Vapor + Metal = Motor
Motor + Rueda = Coche
Coche + Coche = Tren
Madera + Mar = Barco
Barco + Viento = Velero
Motor + Pájaro = Avión
Nube + Aire = Cielo
Cielo + Fuego = Sol
Cielo + Energía = Estrella
Cielo + Cielo = Espacio
Espacio + Piedra = Luna
Espacio + Tierra = Planeta
Sol + Lluvia = Arcoíris
Avión + Espacio = Cohete
Humano + Cohete = Astronauta
Electricidad + Vidrio = Bombilla
Electricidad + Arena = Chip
Chip + Chip = Computadora
Computadora + Computadora = Internet
Computadora + Metal = Robot
Sol + Chip = Panel solar
Computadora + Humano = Videojuego
Videojuego + Videojuego = Vistra Arcade
Viento + Madera = Molino
Metal + Sol = Oro
Oro + Humano = Dinero
Dinero + Casa = Banco
Humano + Humano = Amor
Amor + Humano = Bebé
Bebé + Casa = Familia
Madera + Agua = Papel
Agua + Carbón = Tinta
Papel + Tinta = Libro
Libro + Libro = Biblioteca
Humano + Libro = Estudiante
Libro + Ciudad = Ley
Estudiante + Ley = Abogada
Humano + Viento = Música
Madera + Música = Guitarra
Humano + Campo = Granjero
Humano + Pez = Pescador
Humano + Barco = Marinero
Humano + Avión = Piloto
Humano + Internet = Programadora
Humano + Pan = Chef
Humano + Niebla = Fantasma
Barro + Piedra = Golem
Metal + Herramienta = Espada
Humano + Espada = Caballero
Muro + Caballero = Castillo
Castillo + Humano = Rey
Rey + Oro = Corona
`;
