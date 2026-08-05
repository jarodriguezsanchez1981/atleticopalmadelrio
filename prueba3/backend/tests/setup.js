import { Module } from 'node:module';
import path from 'node:path';
import { models, passwordUtils, jwtUtils } from './helpers/models.js';

const root = process.cwd();

const intercepts = {
  [path.resolve(root, 'src', 'models', 'index.js')]: models,
  [path.resolve(root, 'src', 'utils', 'password.utils.js')]: passwordUtils,
  [path.resolve(root, 'src', 'utils', 'jwt.utils.js')]: jwtUtils
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  try {
    const resolved = Module._resolveFilename(request, parent);
    if (intercepts[resolved]) return intercepts[resolved];
  } catch {
    // se ignora: se deja pasar al loader original
  }
  return originalLoad.apply(this, arguments);
};
