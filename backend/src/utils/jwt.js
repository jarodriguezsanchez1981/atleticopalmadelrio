const jwt = require('jsonwebtoken');
require('dotenv').config();

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,          // 'admin' | 'coordinador' | 'entrenador'
      name: user.name,
      categoryIds: user.categoryIds || [],
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
