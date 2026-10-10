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

describe('TablaEstadistica con subgrupos', () => {
  const METRICAS_SUB = [
    { campo: 'partidos', titulo: 'Partidos' },
    { campo: 'tarjetas_amarillas', titulo: 'Total', subgrupo: 'Amarillas' },
    { campo: 'amarillas_primera', titulo: '1ª Parte', subgrupo: 'Amarillas' },
    { campo: 'tarjetas_rojas', titulo: 'Total', subgrupo: 'Rojas' }
  ];
  const fila = { id_jugador: 7, jugador: 'Ana López' };
  for (const s of ['', '_local', '_visitante']) Object.assign(fila, { [`partidos${s}`]: 1, [`tarjetas_amarillas${s}`]: 2, [`amarillas_primera${s}`]: 1, [`tarjetas_rojas${s}`]: 0 });

  it('añade una fila de cabecera con Amarillas y Rojas dentro de cada grupo', async () => {
    const w = mount(TablaEstadistica, { props: { filas: [fila], metricas: METRICAS_SUB }, global: { plugins: [PrimeVue] } });
    await nextTick();
    const cab = w.findAll('thead tr');
    expect(cab).toHaveLength(3);
    expect(textos(cab[0].findAll('th'))).toEqual(['Jugador', 'Total', 'Local', 'Visitante']);
    expect(cab[0].findAll('th')[0].attributes('rowspan')).toBe('3');
    expect(textos(cab[1].findAll('th'))).toEqual(['Partidos', 'Amarillas', 'Rojas', 'Partidos', 'Amarillas', 'Rojas', 'Partidos', 'Amarillas', 'Rojas']);
    expect(cab[1].findAll('th').map((th) => th.attributes('colspan') || th.attributes('rowspan')).slice(0, 3)).toEqual(['2', '2', '1']);
    expect(textos(cab[2].findAll('th'))).toEqual(['Total', '1ª Parte', 'Total', 'Total', '1ª Parte', 'Total', 'Total', '1ª Parte', 'Total']);
    expect(w.findAll('tbody tr')[0].findAll('td')).toHaveLength(13);

    // Arrastrar Rojas sobre Amarillas: pasan delante en los tres grupos.
    const dt = { effectAllowed: '' };
    await cab[1].findAll('th')[2].trigger('dragstart', { dataTransfer: dt });
    await cab[1].findAll('th')[1].trigger('drop', { dataTransfer: dt });
    await nextTick();
    expect(textos(w.findAll('thead tr')[1].findAll('th')).slice(0, 3)).toEqual(['Partidos', 'Rojas', 'Amarillas']);
  });

  it('la primera columna puede ser otra (p.ej. el equipo)', async () => {
    const w = mount(TablaEstadistica, {
      props: {
        filas: [{ id_plantilla: 5, equipo: 'Senior A', partidos: 3, partidos_local: 1, partidos_visitante: 2, media: 1.67, media_local: 2, media_visitante: null }],
        metricas: [
          { campo: 'partidos', titulo: 'PAR', descripcion: 'Partidos jugados' },
          { campo: 'media', titulo: 'Media', decimal: true }
        ],
        columnaNombre: { campo: 'equipo', titulo: 'Equipo' },
        dataKey: 'id_plantilla'
      },
      global: { plugins: [PrimeVue] }
    });
    await nextTick();
    expect(textos(w.findAll('thead tr')[0].findAll('th'))[0]).toBe('Equipo');
    expect(textos(w.findAll('tbody tr')[0].findAll('td'))).toEqual(['Senior A', '3', '1,67', '1', '2,00', '2', '—']);
  });
});
