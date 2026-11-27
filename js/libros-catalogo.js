// Libros que aparecen en la biblioteca de todos.
// Se descargan la primera vez que alguien los abre y luego quedan guardados en su navegador.

// 1. Carpeta compartida de Google Drive: cada PDF que se suba aparece solo en la biblioteca.
//    carpeta: código de la carpeta (lo que va después de /folders/ en su enlace).
//    script:  URL de la aplicación web de apps-script/carpeta-libros.gs (termina en /exec).
//             Mientras esté vacía, la biblioteca no puede ver qué hay en la carpeta.
const VISTRA_CARPETA_LIBROS = {
  carpeta: "16ZDKv_vM1aUihoUDfgMt9gTkSIbxgt2x",
  script: "https://script.google.com/macros/s/AKfycbxfQ5vMpC4IoGr93APK5-Ioclwi1Hc8SoIeexpieX2QqjrvpKW60kASkhjlSQKZHKek/exec",
};

// 2. Libros sueltos de Drive, con título, autor y descripción escritos a mano.
//    Cada uno debe estar compartido con "Cualquier persona con el enlace".
//    drive: el código del enlace (lo que va después de /file/d/ en la dirección).
//    Si un libro también está en la carpeta, se usan estos datos.
const VISTRA_LIBROS = [
  {
    drive: "1PpVEMyQ3BEaHSc29W2gZ5PjUrHF7eE0G",
    titulo: "1984",
    autor: "George Orwell",
    descripcion: "Winston Smith vive bajo la mirada del Gran Hermano en un Estado que vigila hasta el pensamiento.",
  },
];
