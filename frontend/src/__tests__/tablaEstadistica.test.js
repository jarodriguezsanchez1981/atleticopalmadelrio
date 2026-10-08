// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import PrimeVue from 'primevue/config';
import TablaEstadistica from '../components/TablaEstadistica.vue';

const METRICAS = [
  { campo: 'goles', titulo: 'Goles' },
  { campo: 'porcentaje_goles', titulo: '% de sus goles', porcentaje: true, soloLados: true },
  { campo: 'partidos', titulo: 'Partidos' }
];
const FILAS = [{
  id_jugador: 7, jugador: 'Ana López',
  goles: 3, goles_local: 2, goles_visitante: 1,
  porcentaje_goles_local: 66.7, porcentaje_goles_visitante: 33.3,
  partidos: 2, partidos_local: 1, partidos_visitante: 1
}];

function montar() {
  return mount(TablaEstadistica, {
    props: { filas: FILAS, metricas: METRICAS, sortField: 'goles' },
    global: { plugins: [PrimeVue] }
  });
}
const textos = (els) => els.map((e) => e.text().replace(/\s+/g, ' ').trim());

describe('TablaEstadistica', () => {
  it('agrupa las columnas en Total, Local y Visitante', async () => {
    const w = montar();
    await nextTick();
    const filasCabecera = w.findAll('thead tr');
    expect(filasCabecera).toHaveLength(2);
    expect(textos(filasCabecera[0].findAll('th'))).toEqual(['Jugador', 'Total', 'Local', 'Visitante']);
    expect(filasCabecera[0].findAll('th').map((th) => th.attributes('colspan'))).toEqual([undefined, '2', '3', '3']);
    // El porcentaje "de sus goles" solo en Local y Visitante.
    expect(textos(filasCabecera[1].findAll('th'))).toEqual([
      'Goles', 'Partidos', 'Goles', '% de sus goles', 'Partidos', 'Goles', '% de sus goles', 'Partidos'
    ]);
    expect(textos(w.findAll('tbody tr')[0].findAll('td'))).toEqual(['Ana López', '3', '2', '2', '66,7 %', '1', '1', '33,3 %', '1']);
  });

  it('al arrastrar un grupo o una columna sobre otro los cambia de sitio', async () => {
    const w = montar();
    await nextTick();
    const soltar = async (origen, destino) => {
      const dt = { effectAllowed: '' };
      await origen.trigger('dragstart', { dataTransfer: dt });
      await destino.trigger('drop', { dataTransfer: dt });
      await nextTick();
    };
    let cab = w.findAll('thead tr');
    await soltar(cab[0].findAll('th')[3], cab[0].findAll('th')[1]); // Visitante delante de Total
    cab = w.findAll('thead tr');
    expect(textos(cab[0].findAll('th'))).toEqual(['Jugador', 'Visitante', 'Total', 'Local']);

    await soltar(cab[1].findAll('th')[2], cab[1].findAll('th')[0]); // Partidos delante de Goles
    cab = w.findAll('thead tr');
    expect(textos(cab[1].findAll('th'))).toEqual([
      'Partidos', 'Goles', '% de sus goles', 'Partidos', 'Goles', 'Partidos', 'Goles', '% de sus goles'
    ]);
    expect(textos(w.findAll('tbody tr')[0].findAll('td'))).toEqual(['Ana López', '1', '1', '33,3 %', '2', '3', '1', '2', '66,7 %']);
  });
});
