// Almacenamiento de la sección Libros. Todo se guarda solo en este navegador (IndexedDB):
// nada se sube a internet.
//
// Almacenes:
//   libros    → datos de cada libro (título, páginas, portada, por dónde va…)
//   archivos  → el PDF de cada libro (ArrayBuffer), aparte para no cargarlo al listar
//   notas     → marcadores y resaltados de cada libro
const LibrosDB = (() => {
  const NOMBRE = "vistra-libros";
  const VERSION = 1;
  let abierta = null;

  function abrir() {
    if (abierta) return abierta;
    abierta = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Este navegador no permite guardar libros."));
        return;
      }
      const req = indexedDB.open(NOMBRE, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("libros")) db.createObjectStore("libros", { keyPath: "id" });
        if (!db.objectStoreNames.contains("archivos")) db.createObjectStore("archivos");
        if (!db.objectStoreNames.contains("notas")) db.createObjectStore("notas", { keyPath: "libroId" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return abierta;
  }

  // Ejecuta una operación en uno o varios almacenes y espera a que la transacción termine.
  async function tx(almacenes, modo, trabajo) {
    const db = await abrir();
    return new Promise((resolve, reject) => {
      const t = db.transaction(almacenes, modo);
      let resultado;
      const stores = [].concat(almacenes).map((n) => t.objectStore(n));
      const req = trabajo(...stores);
      if (req) req.onsuccess = () => { resultado = req.result; };
      t.oncomplete = () => resolve(resultado);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("No se pudo guardar. Puede que no quede espacio."));
    });
  }

  const notasVacias = (libroId) => ({ libroId, marcadores: [], resaltados: [] });

  return {
    listar: () => tx("libros", "readonly", (s) => s.getAll()),
    obtener: (id) => tx("libros", "readonly", (s) => s.get(id)),
    archivo: (id) => tx("archivos", "readonly", (s) => s.get(id)),
    guardarLibro: (libro) => tx("libros", "readwrite", (s) => s.put(libro)),

    agregar: (libro, datos) => tx(["libros", "archivos", "notas"], "readwrite", (l, a, n) => {
      l.put(libro);
      a.put(datos, libro.id);
      n.put(notasVacias(libro.id));
    }),

    borrar: (id) => tx(["libros", "archivos", "notas"], "readwrite", (l, a, n) => {
      l.delete(id);
      a.delete(id);
      n.delete(id);
    }),

    notas: async (id) => (await tx("notas", "readonly", (s) => s.get(id))) || notasVacias(id),
    todasLasNotas: () => tx("notas", "readonly", (s) => s.getAll()),
    guardarNotas: (notas) => tx("notas", "readwrite", (s) => s.put(notas)),

    // Pide al navegador que no borre estos datos cuando le falte espacio.
    pedirPersistencia: () => navigator.storage?.persist?.().catch(() => false),
  };
})();
