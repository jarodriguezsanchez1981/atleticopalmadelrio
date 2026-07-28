import api from './api';

export default {
  listByRange: (from, to, categoryIds) =>
    api.get('/matches', { params: { from, to, categoryIds: categoryIds?.join(',') } }).then((r) => r.data),
  getSquad: (matchId) => api.get(`/matches/${matchId}/squad`).then((r) => r.data),
  updatePlayerEntry: (matchId, playerId, payload) =>
    api.patch(`/matches/${matchId}/squad/${playerId}`, payload).then((r) => r.data),
  create: (payload) => api.post('/matches', payload).then((r) => r.data),
  setResult: (matchId, payload) => api.patch(`/matches/${matchId}/result`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/matches/${id}`).then((r) => r.data),
  playerStats: (playerId) => api.get(`/matches/stats/player/${playerId}`).then((r) => r.data),
  categoryStats: (categoryId) => api.get(`/matches/stats/category/${categoryId}`).then((r) => r.data),
};
