// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

const editar = { valor: true };
vi.mock('../stores/auth.store', () => ({ useAuthStore: () => ({ puedeEditar: () => editar.valor }) }));
vi.mock('../services', () => ({
  videosService: { listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn(), subirFichero: vi.fn() }
}));

import { videosService } from '../services';
import VideosEntrenamiento from '../components/VideosEntrenamiento.vue';

const VIDEOS = [
  { id: 1, titulo: 'Juegos de posición simple', fichero_url: '/api/videos/1/fichero?v=ab', fichero_nombre: 'jps.mp4', fichero_tamano: 1325512, origen_url: 'https://app.alonbalon.com/es/tasks/x' },
  { id: 2, titulo: 'Rondo 4x2', descripcion: 'Presión tras pérdida' }
];

function montar() {
  return mount(VideosEntrenamiento, { global: { plugins: [PrimeVue, ConfirmationService, ToastService] } });
}

describe('Entrenamientos · Videos', () => {
  beforeEach(() => {
    editar.valor = true;
    videosService.listar.mockResolvedValue(VIDEOS);
  });

  it('lista los vídeos con su tamaño, descarga y enlace de origen', async () => {
    const w = montar();
    await flushPromises();
    const tarjetas = w.findAll('article');
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0].text()).toContain('jps.mp4 · 1,3 MB');
    expect(tarjetas[0].find('a[download]').attributes('href')).toBe('/api/videos/1/fichero?v=ab&descargar=1');
    expect(tarjetas[0].find('a[target=_blank]').attributes('rel')).toContain('noopener');
    expect(tarjetas[1].text()).toContain('Sin fichero');
  });

  it('el reproductor solo se carga al pulsar reproducir', async () => {
    const w = montar();
    await flushPromises();
    expect(w.find('video').exists()).toBe(false);
    await w.find('button[aria-label="Reproducir Juegos de posición simple"]').trigger('click');
    expect(w.find('video').attributes('src')).toBe('/api/videos/1/fichero?v=ab');
  });

  it('filtra por título o descripción', async () => {
    const w = montar();
    await flushPromises();
    await w.find('input').setValue('presión');
    expect(w.findAll('article')).toHaveLength(1);
  });

  it('sin permiso de edición no hay botones de nuevo, editar ni eliminar', async () => {
    editar.valor = false;
    const w = montar();
    await flushPromises();
    expect(w.text()).not.toContain('Nuevo vídeo');
    expect(w.find('button[aria-label="Eliminar"]').exists()).toBe(false);
  });
});
