/**
 * Lista los PDF de la carpeta compartida de libros para la biblioteca de Vistra Arcade.
 *
 * Cómo publicarlo (una sola vez):
 *  1. Entra en https://script.google.com con la cuenta dueña de la carpeta y pulsa "Nuevo proyecto".
 *  2. Borra lo que hay, pega todo este archivo y guarda (Ctrl + S). Ponle de nombre "Libros Vistra".
 *  3. Pulsa "Implementar" → "Nueva implementación" → en el engranaje elige "Aplicación web".
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier persona
 *  4. Pulsa "Implementar" y autoriza el acceso con tu cuenta (solo lee tu Drive, no cambia nada).
 *  5. Copia la "URL de la aplicación web" (termina en /exec) y ponla en js/libros-catalogo.js,
 *     en VISTRA_CARPETA_LIBROS.script.
 *
 * Si cambias este código, publícalo de nuevo con "Implementar" → "Gestionar implementaciones" →
 * editar (lápiz) → Versión: "Nueva versión". Así la URL no cambia.
 */

// Código de la carpeta (lo que va después de /folders/ en su enlace).
const CARPETA = "16ZDKv_vM1aUihoUDfgMt9gTkSIbxgt2x";

function doGet() {
  const libros = [];
  const archivos = DriveApp.getFolderById(CARPETA).getFilesByType(MimeType.PDF);
  while (archivos.hasNext()) {
    const archivo = archivos.next();
    if (archivo.isTrashed()) continue;
    libros.push({
      id: archivo.getId(),
      nombre: archivo.getName(),
      tamano: archivo.getSize(),
      subido: archivo.getDateCreated().getTime(),
    });
  }
  // Los más recientes primero.
  libros.sort((a, b) => b.subido - a.subido);

  return ContentService
    .createTextOutput(JSON.stringify({ carpeta: CARPETA, libros: libros }))
    .setMimeType(ContentService.MimeType.JSON);
}
