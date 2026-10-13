<script setup>
import { computed } from 'vue';
import Chart from 'primevue/chart';

/** Gráfica de balance del Dashboard, victorias (línea verde) y derrotas (línea
 * roja):
 * - con `jornadas`: un tipo de fútbol jornada a jornada, con la suma de las
 *   victorias (verde), empates (gris) y derrotas (rojo) de todas las categorías;
 * - con `partidos`: una plantilla partido a partido en una sola línea, que
 *   sube con la victoria, queda en medio con el empate y baja con la derrota
 *   (cada punto y su tramo en verde, gris o rojo). */
const props = defineProps({
  // [{ jornada, partidos, victorias, empates, derrotas }]
  jornadas: { type: Array, default: null },
  // [{ id_partido, fecha, rival, es_local, marcador, resultado, victorias, empates, derrotas }]
  partidos: { type: Array, default: null }
});

// Canvas: los colores van en JS (verde y rojo de Tailwind 600).
const VERDE = '#16a34a';
const ROJO = '#dc2626';
const GRIS = '#9ca3af';

// Partido a partido: altura y color de cada resultado.
const NIVEL = { victoria: 1, empate: 0, derrota: -1 };
const COLOR = { victoria: VERDE, empate: GRIS, derrota: ROJO };
const TEXTO_NIVEL = { 1: 'Victoria', 0: 'Empate', '-1': 'Derrota' };

const porPartido = computed(() => !!props.partidos);
const puntos = computed(() => props.partidos || props.jornadas || []);

const fechaCorta = (f) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};
const LETRA = { victoria: 'G', empate: 'E', derrota: 'P' };

const datosJornadas = () => ({
  labels: puntos.value.map((p) => `J${p.jornada}`),
  datasets: [
    { label: 'Victorias', data: puntos.value.map((p) => p.victorias), borderColor: VERDE, backgroundColor: VERDE, tension: 0.3 },
    { label: 'Empates', data: puntos.value.map((p) => p.empates), borderColor: GRIS, backgroundColor: GRIS, tension: 0.3 },
    { label: 'Derrotas', data: puntos.value.map((p) => p.derrotas), borderColor: ROJO, backgroundColor: ROJO, tension: 0.3 }
  ]
});

const datosPartidos = () => {
  const colores = puntos.value.map((p) => COLOR[p.resultado] || GRIS);
  return {
    labels: puntos.value.map((p) => `${fechaCorta(p.fecha)} ${LETRA[p.resultado] || ''}`),
    datasets: [{
      label: 'Resultado',
      data: puntos.value.map((p) => NIVEL[p.resultado] ?? 0),
      borderColor: GRIS,
      pointBackgroundColor: colores,
      pointBorderColor: colores,
      pointRadius: 6,
      pointHoverRadius: 8,
      // Cada tramo, del color del partido al que llega.
      segment: { borderColor: (ctx) => colores[ctx.p1DataIndex] }
    }]
  };
};

const datos = computed(() => (porPartido.value ? datosPartidos() : datosJornadas()));

const opciones = computed(() => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: !porPartido.value, position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } },
    tooltip: {
      callbacks: {
        title: (items) => {
          const p = puntos.value[items[0].dataIndex];
          return porPartido.value
            ? `${fechaCorta(p.fecha)} · ${p.es_local ? 'vs' : '@'} ${p.rival} · ${p.marcador}`
            : `Jornada ${p.jornada}`;
        },
        label: (item) => (porPartido.value
          ? TEXTO_NIVEL[item.raw]
          : `${item.dataset.label}: ${item.formattedValue}`),
        footer: (items) => {
          const p = puntos.value[items[0].dataIndex];
          return porPartido.value
            ? `Hasta aquí: ${p.victorias} G · ${p.empates} E · ${p.derrotas} P`
            : `Partidos jugados: ${p.partidos}`;
        }
      }
    }
  },
  scales: {
    y: porPartido.value
      ? { min: -1.3, max: 1.3, afterBuildTicks: (eje) => { eje.ticks = [{ value: -1 }, { value: 0 }, { value: 1 }]; },
          ticks: { callback: (v) => TEXTO_NIVEL[v] ?? '' } }
      : { beginAtZero: true, ticks: { precision: 0 } },
    x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 0 } }
  }
}));
</script>

<template>
  <div v-if="!puntos.length" class="text-sm text-ink-tertiary py-4 text-center">
    Sin partidos jugados esta temporada.
  </div>
  <div v-else class="h-72">
    <Chart type="line" :data="datos" :options="opciones" class="h-full" />
  </div>
</template>
