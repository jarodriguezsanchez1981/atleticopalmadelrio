<script setup>
import { computed } from 'vue';
import Chart from 'primevue/chart';

/** Balance de las plantillas de un tipo de fútbol (Dashboard): victorias (línea
 * verde) y derrotas (línea roja) de cada plantilla, por orden de categoría; en
 * la etiqueta y el tooltip, los partidos jugados (y los empates). */
const props = defineProps({
  // [{ id_plantilla, categoria, alias, partidos, victorias, empates, derrotas }]
  plantillas: { type: Array, default: () => [] }
});

// Canvas: los colores van en JS (verde y rojo de Tailwind 600).
const VERDE = '#16a34a';
const ROJO = '#dc2626';

const etiqueta = (p) => p.alias || p.categoria;

const datos = computed(() => ({
  labels: props.plantillas.map((p) => `${etiqueta(p)} (${p.partidos} PJ)`),
  datasets: [
    { label: 'Victorias', data: props.plantillas.map((p) => p.victorias), borderColor: VERDE, backgroundColor: VERDE, tension: 0.3 },
    { label: 'Derrotas', data: props.plantillas.map((p) => p.derrotas), borderColor: ROJO, backgroundColor: ROJO, tension: 0.3 }
  ]
}));

const opciones = {
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } },
    tooltip: {
      callbacks: {
        title: (items) => etiqueta(props.plantillas[items[0].dataIndex]),
        footer: (items) => {
          const p = props.plantillas[items[0].dataIndex];
          return `Partidos: ${p.partidos} · Empates: ${p.empates}`;
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
  <div v-if="!plantillas.length" class="text-sm text-ink-tertiary py-4 text-center">Sin plantillas esta temporada.</div>
  <div v-else class="h-72">
    <Chart type="line" :data="datos" :options="opciones" class="h-full" />
  </div>
</template>
