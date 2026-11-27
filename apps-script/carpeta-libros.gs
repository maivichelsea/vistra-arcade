/**
 * Biblioteca de Vistra Arcade: lista los PDF de la carpeta compartida y entrega cada PDF.
 *
 *   .../exec          → lista de los PDF de la carpeta (JSON)
 *   .../exec?id=XXXX  → el PDF en base64 (texto). Solo si está en la carpeta o si ya está
 *                       compartido con "Cualquier persona con el enlace". Nunca archivos privados.
 *
 * El navegador no puede descargar directamente de Drive (Drive lo bloquea), por eso los PDF
 * pasan por este script.
 *
 * Cómo publicarlo (una sola vez):
 *  1. Entra en https://script.google.com con la cuenta dueña de la carpeta y pulsa "Nuevo proyecto".
 *  2. Borra lo que hay, pega todo este archivo y guarda (Ctrl + S). Ponle de nombre "Libros Vistra".
 *  3. Pulsa "Implementar" → "Nueva implementación" → en el engranaje elige "Aplicación web".
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier persona
 *  4. Pulsa "Implementar" y autoriza el acceso con tu cuenta.
 *  5. Copia la "URL de la aplicación web" (termina en /exec) y ponla en js/libros-catalogo.js,
 *     en VISTRA_CARPETA_LIBROS.script.
 *
 * Si cambias este código, publícalo de nuevo con "Implementar" → "Administrar implementaciones" →
 * editar (lápiz) → Versión: "Nueva versión". Así la URL no cambia.
 */

// Código de la carpeta (lo que va después de /folders/ en su enlace).
const CARPETA = "16ZDKv_vM1aUihoUDfgMt9gTkSIbxgt2x";

function doGet(e) {
  const id = e && e.parameter && e.parameter.id;
  return id ? enviarPdf(id) : listarCarpeta();
}

function listarCarpeta() {
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
  return json({ carpeta: CARPETA, libros: libros });
}

function enviarPdf(id) {
  let archivo;
  try {
    archivo = DriveApp.getFileById(id);
  } catch (err) {
    return json({ error: "no-encontrado" });
  }
  if (archivo.isTrashed() || archivo.getMimeType() !== MimeType.PDF) return json({ error: "no-es-pdf" });
  if (!estaEnCarpeta(archivo) && !esPublico(archivo)) return json({ error: "privado" });
  return ContentService
    .createTextOutput(Utilities.base64Encode(archivo.getBlob().getBytes()))
    .setMimeType(ContentService.MimeType.TEXT);
}

function estaEnCarpeta(archivo) {
  const padres = archivo.getParents();
  while (padres.hasNext()) {
    if (padres.next().getId() === CARPETA) return true;
  }
  return false;
}

function esPublico(archivo) {
  try {
    const acceso = archivo.getSharingAccess();
    return acceso === DriveApp.Access.ANYONE || acceso === DriveApp.Access.ANYONE_WITH_LINK;
  } catch (err) {
    return false;
  }
}

function json(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}
