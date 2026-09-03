const { Usuario, Seccion } = require('../models');
const { isPasswordValid, hashPassword } = require('../utils/password.utils');

const includeUsuario = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'clave', 'nombre', 'icono', 'orden'], through: { attributes: ['puede_ver', 'puede_editar'] } }
];

function normalizePermisos(body) {
  if (body.permisos && typeof body.permisos === 'object') return body.permisos;
  if (Array.isArray(body.ids_secciones)) {
    const permisos = {};
    body.ids_secciones.forEach(id => { permisos[id] = { ver: true, editar: false }; });
    return permisos;
  }
  if (Array.isArray(body.secciones)) {
    const permisos = {};
    body.secciones.forEach(s => {
      const id = typeof s === 'object' ? s.id : s;
      permisos[id] = { ver: true, editar: false };
    });
    return permisos;
  }
  return null;
}

async function listar(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      include: includeUsuario,
      order: [['id', 'ASC']]
    });
    res.json(usuarios.map((u) => serializeUsuario(u)));
  } catch (err) { next(err); }
}

function serializeUsuario(usuario) {
  const json = usuario.toJSON ? usuario.toJSON() : usuario;
  const { password, ...safe } = json;
  safe.permisos = {};
  (safe.secciones || []).forEach((s) => {
    safe.permisos[s.clave] = {
      ver: !!s.usuario_secciones?.puede_ver,
      editar: !!s.usuario_secciones?.puede_editar
    };
  });
  return safe;
}

async function obtener(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, { include: includeUsuario });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json(serializeUsuario(usuario));
  } catch (err) { next(err); }
}

function rolFinal(rol) {
  return rol === 'entrenador' ? 'entrenador' : 'coordinador';
}

function validaRolCategoria(res, rol, id_categoria) {
  const rolNormalizado = rolFinal(rol);
  if (rolNormalizado === 'entrenador' && !id_categoria) {
    return res.status(400).json({
      message: 'El rol "entrenador" requiere seleccionar una categoría.'
    });
  }
  return null;
}

async function crear(req, res, next) {
  try {
    const { usuario, password, nombre, apellidos, rol, id_categoria } = req.body;
    const permisos = normalizePermisos(req.body) || {};

    const faltan = [];
    if (!usuario) faltan.push('usuario');
    if (!password) faltan.push('contraseña');
    if (!nombre) faltan.push('nombre');
    if (!apellidos) faltan.push('apellidos');
    if (faltan.length) {
      return res.status(400).json({
        message: `Faltan los campos obligatorios: ${faltan.join(', ')}.`
      });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
      });
    }

    const rolNormalizado = rolFinal(rol);
    const errorCategoria = validaRolCategoria(res, rolNormalizado, id_categoria);
    if (errorCategoria) return errorCategoria;

    const hash = await hashPassword(password);
    const nuevo = await Usuario.create({
      usuario,
      password: hash,
      nombre,
      apellidos,
      rol: rolNormalizado,
      id_categoria: rolNormalizado === 'entrenador' ? id_categoria : null
    });

    const idsSecciones = Object.keys(permisos).map(Number).filter(Boolean);
    if (idsSecciones.length) {
      const seccionesConPermisos = idsSecciones.map(id => ({
        id,
        usuario_secciones: {
          puede_ver: permisos[id]?.ver ? 1 : 0,
          puede_editar: permisos[id]?.editar ? 1 : 0
        }
      }));
      await nuevo.setSecciones(seccionesConPermisos);
    } else {
      await nuevo.setSecciones([]);
    }

    const completo = await Usuario.findByPk(nuevo.id, { include: includeUsuario });
    res.status(201).json(serializeUsuario(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const usuario = await Usuario.scope('withPassword').findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const { usuario: nuevoUsuario, nombre, apellidos, activo, password, rol, id_categoria } = req.body;
    const permisos = normalizePermisos(req.body);

    if (password) {
      if (!isPasswordValid(password)) {
        return res.status(400).json({
          message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
        });
      }
      usuario.password = await hashPassword(password);
    }

    if (nuevoUsuario !== undefined) usuario.usuario = nuevoUsuario;
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellidos !== undefined) usuario.apellidos = apellidos;
    if (activo !== undefined) usuario.activo = activo;
    if (rol !== undefined) {
      const rolNormalizado = rolFinal(rol);
      const idCategoriaFinal = id_categoria !== undefined
        ? id_categoria
        : (rolNormalizado === 'entrenador' ? usuario.id_categoria : null);
      const errorCategoria = validaRolCategoria(res, rolNormalizado, idCategoriaFinal);
      if (errorCategoria) return errorCategoria;
      usuario.rol = rolNormalizado;
      usuario.id_categoria = rolNormalizado === 'entrenador' ? idCategoriaFinal : null;
    } else if (id_categoria !== undefined) {
      if (usuario.rol === 'entrenador') {
        const errorCategoria = validaRolCategoria(res, usuario.rol, id_categoria);
        if (errorCategoria) return errorCategoria;
        usuario.id_categoria = id_categoria;
      } else {
        usuario.id_categoria = null;
      }
    }

    await usuario.save();

    if (permisos !== null && permisos !== undefined) {
      const idsSecciones = Object.keys(permisos).map(Number).filter(Boolean);
      if (idsSecciones.length) {
        const seccionesConPermisos = idsSecciones.map(id => ({
          id,
          usuario_secciones: {
            puede_ver: permisos[id]?.ver ? 1 : 0,
            puede_editar: permisos[id]?.editar ? 1 : 0
          }
        }));
        await usuario.setSecciones(seccionesConPermisos);
      } else {
        await usuario.setSecciones([]);
      }
    }

    const completo = await Usuario.findByPk(usuario.id, { include: includeUsuario });
    res.json(serializeUsuario(completo));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }
    const eliminado = await Usuario.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
