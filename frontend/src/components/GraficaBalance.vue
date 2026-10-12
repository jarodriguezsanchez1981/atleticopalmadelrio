<script setup>
import { computed } from 'vue';
import Chart from 'primevue/chart';

/** Gráfica de balance del Dashboard, victorias (línea verde) y derrotas (línea
 * roja):
 * - con `plantillas`: cada plantilla de un tipo de fútbol, por orden de
 *   categoría; en la etiqueta y el tooltip, los partidos jugados (y empates);
 * - con `partidos`: una plantilla partido a partido, con las victorias y
 *   derrotas acumuladas hasta cada uno. */
const props = defineProps({
  // [{ id_plantilla, categoria, alias, partidos, victorias, empates, derrotas }]
  plantillas: { type: Array, default: null },
  // [{ id_partido, fecha, rival, es_local, marcador, resultado, victorias, empates, derrotas }]
  partidos: { type: Array, default: null }
});

// Canvas: los colores van en JS (verde y rojo de Tailwind 600).
const VERDE = '#16a34a';
const ROJO = '#dc2626';

const porPartido = computed(() => !!props.partidos);
const puntos = computed(() => props.partidos || props.plantillas || []);

const etiqueta = (p) => p.alias || p.categoria;
const fechaCorta = (f) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};
const LETRA = { victoria: 'G', empate: 'E', derrota: 'P' };

const datos = computed(() => ({
  labels: puntos.value.map((p) => (porPartido.value
    ? `${fechaCorta(p.fecha)} ${LETRA[p.resultado] || ''}`
    : `${etiqueta(p)} (${p.partidos} PJ)`)),
  datasets: [
    { label: porPartido.value ? 'Victorias (acumuladas)' : 'Victorias', data: puntos.value.map((p) => p.victorias), borderColor: VERDE, backgroundColor: VERDE, tension: 0.3 },
    { label: porPartido.value ? 'Derrotas (acumuladas)' : 'Derrotas', data: puntos.value.map((p) => p.derrotas), borderColor: ROJO, backgroundColor: ROJO, tension: 0.3 }
  ]
}));

const opciones = {
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } },
    tooltip: {
      callbacks: {
        title: (items) => {
          const p = puntos.value[items[0].dataIndex];
          return porPartido.value
            ? `${fechaCorta(p.fecha)} · ${p.es_local ? 'vs' : '@'} ${p.rival} · ${p.marcador}`
            : etiqueta(p);
        },
        footer: (items) => {
          const p = puntos.value[items[0].dataIndex];
          return porPartido.value
            ? `Partidos: ${items[0].dataIndex + 1} · Empates: ${p.empates}`
            : `Partidos: ${p.partidos} · Empates: ${p.empates}`;
        }
      }
    }
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
    x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 0 } }
  }
};
</script>

<template>
  <div v-if="!puntos.length" class="text-sm text-ink-tertiary py-4 text-center">
    {{ porPartido ? 'Sin partidos jugados esta temporada.' : 'Sin plantillas esta temporada.' }}
  </div>
  <div v-else class="h-72">
    <Chart type="line" :data="datos" :options="opciones" class="h-full" />
  </div>
</template>
