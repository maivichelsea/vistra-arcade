# Vistra Arcade

Minijuegos originales para el navegador, hechos con HTML, CSS y JavaScript sin dependencias.

## Juegos

- **Buscaminas:** niveles Principiante (8×8, 10 minas), Intermedio (16×16, 40), Experto (16×30, 99) y Personalizado. Primer clic seguro y apertura de vecinas.
- **MundoGuessr:** apareces en un lugar al azar con Google Street View y marcas en el mapa dónde crees que estás. Mapa del mundo, 5 rondas de hasta 5000 puntos y tiempo opcional. Modo de 1 jugador o de 2 jugadores por turnos en el mismo PC. Desafío a distancia: al terminar una partida se crea un código que un amigo pega para jugar los mismos 5 lugares y comparar puntos.

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

1. Crea una carpeta en `games/<nombre>/` con su `index.html`.
2. Añade una tarjeta enlazándola en el `index.html` principal.
