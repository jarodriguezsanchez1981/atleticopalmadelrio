import api from './api';

export default {
  listByCategory: (categoryId) => api.get(`/players/category/${categoryId}`).then((r) => r.data),
  getOne: (id) => api.get(`/players/${id}`).then((r) => r.data),
  create: (payload) => api.post('/players', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/players/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/players/${id}`).then((r) => r.data),
};
