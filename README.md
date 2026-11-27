# Vistra Arcade

Minijuegos originales para el navegador, hechos con HTML, CSS y JavaScript sin dependencias.

## Juegos

- **Buscaminas:** niveles Principiante (8×8, 10 minas), Intermedio (16×16, 40), Experto (16×30, 99) y Personalizado. Primer clic seguro y apertura de vecinas.
- **Sudoku:** tableros generados al momento con solución única y 4 dificultades (Fácil, Medio, Difícil, Experto). Notas, deshacer, pistas, marcado de errores y guardado automático de la partida.
- **Billar:** bola 8 con física propia en canvas (deslizamiento y rodadura, efecto de seguimiento y retroceso, choques exactos y troneras con mandíbulas). 1 jugador contra la CPU o 2 jugadores en el mismo PC. Lisas y rayadas, faltas con bola en mano y victoria al meter la 8.
- **MundoGuessr:** apareces en un lugar al azar con Google Street View y marcas en el mapa dónde crees que estás. Mapa del mundo, 5 rondas de hasta 5000 puntos y tiempo opcional. Modo de 1 jugador o de 2 jugadores por turnos en el mismo PC.

### Clave de Google Maps (MundoGuessr)

MundoGuessr necesita una clave de Google Maps Platform con **Maps JavaScript API** activada.

1. Copia `games/mundoguessr/config.example.js` como `games/mundoguessr/config.js`.
2. Pega tu clave en `googleMapsApiKey`.

`config.js` está en `.gitignore`: la clave no se sube a GitHub. Como el juego se abre directamente
como archivo HTML, la clave no puede restringirse por sitio web; restríngela a Maps JavaScript API
y pon un límite diario de uso y un presupuesto con alertas en Google Cloud.

### Carpeta compartida de libros

Los PDF que se suban a la carpeta compartida de Google Drive aparecen solos en la biblioteca.
Para que la página pueda ver qué hay en la carpeta y descargar los PDF se usa un pequeño script de Google
(el navegador no puede descargar directamente de Drive: Drive responde 403 a las páginas web):

1. Abre https://script.google.com con la cuenta dueña de la carpeta y crea un proyecto nuevo.
2. Pega el contenido de `apps-script/carpeta-libros.gs` y publícalo como **Aplicación web**
   (Ejecutar como: Yo · Quién tiene acceso: Cualquier persona). Las instrucciones están dentro del archivo.
3. Copia la URL que termina en `/exec` en `VISTRA_CARPETA_LIBROS.script`, en `js/libros-catalogo.js`.

La carpeta debe estar compartida con «Cualquier persona con el enlace» (lector). Quien vaya a subir
libros necesita permiso de editor.

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
- `libros.html`, `css/libros.css`, `js/libros.js`, `js/libros-db.js`: lector de libros PDF. Guarda por dónde vas, marcadores y resaltados en el navegador (IndexedDB). Usa PDF.js 3.11 (`js/vendor/pdfjs/`, licencia Apache 2.0).
- `paginas.html`, `css/paginas.css`, `js/paginas.js`: páginas permitidas en el trabajo (sin cuenta). La lista está en `js/paginas-datos.js`.
- `css/style.css`: colores (modo claro y oscuro) y estilos compartidos con los juegos.
- `img/`: logotipo e ilustraciones (SVG locales, sin depender de internet).
- `games/`: cada juego en su carpeta.
