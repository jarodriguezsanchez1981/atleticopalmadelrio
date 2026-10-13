const { categoriaDelUsuario } = require('../utils/filtroCategoria');

/**
 * Un usuario con rol 'entrenador' y categoría solo ve y toca los registros de
 * su categoría (los coordinadores, todo). Se monta en cada router, detrás de
 * authenticate/authorize, con las reglas de esa entidad:
 *
 * - registro(id, ctx): ¿el registro /:id (ver, editar, borrar, acciones como
 *   /:id/finalizar-acta) es de su categoría? null si no existe (el
 *   controlador da el 404).
 * - cuerpo(body, ctx): en POST/PUT, ¿lo que se quiere guardar es de su
 *   categoría? (p. ej. id_plantilla); true si el cuerpo no dice nada.
 * - enListado(item, ctx): en los listados (GET de `listados`), qué elementos
 *   se devuelven.
 * - bloqueadas: rutas que un entrenador no puede usar (p. ej. crear las
 *   plantillas de todas las categorías).
 *
 * Además, si la petición trae ?id_plantilla= de otra categoría, se rechaza.
 * ctx: { categoria, plantillas (Set de ids de su categoría, de todas las
 * temporadas), jugadores(), entrenadores(), delegados(), entrenamientos() }
 * (Sets que se calculan solo si una regla los pide).
 */

const MENSAJE = 'Solo puedes acceder a los datos de tu categoría.';

function contexto(categoria) {
  // require diferido: los modelos importan cosas que a su vez usan middlewares.
  const { Plantilla, PlantillaJugador, PlantillaEntrenador, PlantillaDelegado, Entrenamiento } = require('../models');
  const cache = {};
  const unaVez = (clave, fn) => () => {
    if (!cache[clave]) cache[clave] = fn();
    return cache[clave];
  };
  const idsPlantillas = unaVez('plantillas', async () =>
    new Set(((await Plantilla.findAll({ where: { id_categoria: categoria }, attributes: ['id'] })) || []).map((p) => Number(p.id))));
  const dePlantillas = (Modelo, campo) => async () => {
    const ids = [...await idsPlantillas()];
    if (!ids.length) return new Set();
    const filas = (await Modelo.findAll({ where: { id_plantilla: ids }, attributes: [campo] })) || [];
    return new Set(filas.map((f) => Number(f[campo])));
  };
  return {
    categoria: Number(categoria),
    plantillas: idsPlantillas,
    jugadores: unaVez('jugadores', dePlantillas(PlantillaJugador, 'id_jugador')),
    entrenadores: unaVez('entrenadores', dePlantillas(PlantillaEntrenador, 'id_entrenador')),
    delegados: unaVez('delegados', dePlantillas(PlantillaDelegado, 'id_delegado')),
    entrenamientos: unaVez('entrenamientos', dePlantillas(Entrenamiento, 'id'))
  };
}

function prohibido(res) {
  return res.status(403).json({ message: MENSAJE });
}

function restringirACategoria({ registro, cuerpo, enListado, listados = ['/'], bloqueadas = [] } = {}) {
  return async (req, res, next) => {
    const categoria = categoriaDelUsuario(req);
    if (!categoria) return next();
    try {
      const ctx = contexto(categoria);
      const ruta = req.path;
      if (bloqueadas.some((b) => ruta === b || ruta.startsWith(`${b}/`))) return prohibido(res);

      const idPlantillaQuery = req.query?.id_plantilla;
      if (idPlantillaQuery && !(await ctx.plantillas()).has(Number(idPlantillaQuery))) return prohibido(res);

      const id = /^\/(\d+)(\/|$)/.exec(ruta)?.[1];
      if (id && registro) {
        const permitido = await registro(Number(id), ctx);
        if (permitido === false) return prohibido(res);
      }
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && cuerpo) {
        if (!(await cuerpo(req.body || {}, ctx))) return prohibido(res);
      }
      if (req.method === 'GET' && !id && enListado && listados.includes(ruta)) {
        const json = res.json.bind(res);
        res.json = (datos) => {
          if (!Array.isArray(datos)) return json(datos);
          // enListado puede ser asíncrono (los Sets se calculan una vez).
          Promise.all(datos.map((item) => enListado(item?.toJSON ? item.toJSON() : item, ctx)))
            .then((ok) => json(datos.filter((_, i) => ok[i])))
            .catch(next);
          return res;
        };
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// ---- Reglas comunes ----

/** ¿id_plantilla (número o texto) es de su categoría? */
async function plantillaSuya(idPlantilla, ctx) {
  return (await ctx.plantillas()).has(Number(idPlantilla));
}

/** Regla para entidades con id_plantilla (partidos, entrenamientos, torneos, convocatorias…). */
function porPlantilla(Modelo) {
  return {
    registro: async (id, ctx) => {
      const r = await Modelo.findByPk(id, { attributes: ['id', 'id_plantilla'] });
      return r ? plantillaSuya(r.id_plantilla, ctx) : null;
    },
    cuerpo: async (body, ctx) => body.id_plantilla == null || plantillaSuya(body.id_plantilla, ctx),
    enListado: async (item, ctx) => plantillaSuya(item.id_plantilla, ctx)
  };
}

module.exports = { restringirACategoria, porPlantilla, plantillaSuya, MENSAJE };
