# Vistra Arcade

Minijuegos originales para el navegador, hechos con HTML, CSS y JavaScript sin dependencias.

## Juegos

- **Buscaminas:** niveles Principiante (8×8, 10 minas), Intermedio (16×16, 40), Experto (16×30, 99) y Personalizado. Primer clic seguro y apertura de vecinas.
- **Serpiente Neón:** come fruta y crece sin chocar. Velocidades Lenta, Normal y Rápida que aceleran con cada fruta, estrellas doradas con puntos extra y récord por velocidad. Teclado, deslizar el dedo o cruceta en el móvil.
- **Sudoku:** tableros de 9×9 generados al azar con solución única. Niveles Fácil, Medio, Difícil y Experto, modo notas, pistas, deshacer y resaltado de errores.
- **Billar:** bola 8 con física propia en canvas. 1 jugador contra la CPU o 2 jugadores en el mismo PC. Lisas y rayadas, faltas con bola en mano y victoria al meter la 8.
- **MundoGuessr:** apareces en un lugar al azar con Google Street View y marcas en el mapa dónde crees que estás. Mapa del mundo, 5 rondas de hasta 5000 puntos y tiempo opcional. Modo de 1 jugador o de 2 jugadores por turnos en el mismo PC, y tabla de récords con el mejor resultado de cada persona (se guarda en el navegador).

### Clave de Google Maps (MundoGuessr)

MundoGuessr necesita una clave de Google Maps Platform con **Maps JavaScript API** activada.

1. Copia `games/mundoguessr/config.example.js` como `games/mundoguessr/config.js`.
2. Pega tu clave en `googleMapsApiKey`.

`config.js` está en `.gitignore`: la clave no se sube a GitHub. Como el juego se abre directamente
como archivo HTML, la clave no puede restringirse por sitio web; restríngela a Maps JavaScript API
y pon un límite diario de uso y un presupuesto con alertas en Google Cloud.

## Ejecutar en local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
npx serve .
```

## Añadir un juego

La portada se construye a partir de `js/catalogo.js`, así que no hace falta tocar el HTML:

1. Crea una carpeta en `games/<nombre>/` con su `index.html`.
2. Añade una ilustración 16:9 en `img/juegos/` (por ejemplo un SVG de 320×180).
3. Añade una entrada en `VISTRA_JUEGOS` dentro de `js/catalogo.js` (nombre, enlace, imagen, categoría, estado, descripción y etiquetas).

En el mismo archivo está `VISTRA_NOVEDADES` (novedades).

## Estructura

- `index.html`, `css/home.css`, `js/home.js`: portada del arcade.
- `js/catalogo.js`: juegos y novedades.
- `css/style.css`: colores (modo claro y oscuro) y estilos compartidos con los juegos.
- `img/`: logotipo e ilustraciones (SVG locales, sin depender de internet).
- `games/`: cada juego en su carpeta.
