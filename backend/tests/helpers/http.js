/**
 * Crea un `req` y un `res` mockeados con los métodos que usan los
 * controladores (json, status, send). Permite capturar la respuesta.
 */
export function mockReqRes(overrides = {}) {
  const res = {
    _status: 200,
    _json: null,
    _sent: false,
    status(code) {
      this._status = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      this._sent = true;
      return this;
    },
    send(payload) {
      this._sent = true;
      this._payload = payload;
      return this;
    }
  };
  const req = {
    body: {},
    query: {},
    params: {},
    user: { id: 1, usuario: 'admin', secciones: ['administracion'] },
    ...overrides
  };
  const next = () => {};

  const llamadas = { status: 0, json: 0, next: 0, send: 0 };
  const wrappedRes = new Proxy(res, {
    get(target, prop) {
      if (prop === 'status') return (...a) => { llamadas.status++; return target.status(...a); };
      if (prop === 'json') return (...a) => { llamadas.json++; return target.json(...a); };
      if (prop === 'send') return (...a) => { llamadas.send++; return target.send(...a); };
      return Reflect.get(target, prop, target);
    }
  });

  return { req, res: wrappedRes, next, llamadas };
}
