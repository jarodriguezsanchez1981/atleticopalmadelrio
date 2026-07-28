import api from './api';

export default {
  listByRange: (from, to, categoryIds) =>
    api.get('/trainings', { params: { from, to, categoryIds: categoryIds?.join(',') } }).then((r) => r.data),
  getAttendance: (trainingId) => api.get(`/trainings/${trainingId}/attendance`).then((r) => r.data),
  setAttendance: (trainingId, payload) =>
    api.patch(`/trainings/${trainingId}/attendance`, payload).then((r) => r.data),
  create: (payload) => api.post('/trainings', payload).then((r) => r.data),
  remove: (id) => api.delete(`/trainings/${id}`).then((r) => r.data),
};
