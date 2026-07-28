const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const { signToken } = require('../utils/jwt');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y password son obligatorios.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Credenciales invalidas.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales invalidas.' });
    }

    const categoryIds = await UserModel.getAssignedCategoryIds(user.id);
    const token = signToken({ ...user, categoryIds });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        categoryIds,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el login.' });
  }
}

/** Devuelve el usuario actual a partir del token (para restaurar sesion en el front) */
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
