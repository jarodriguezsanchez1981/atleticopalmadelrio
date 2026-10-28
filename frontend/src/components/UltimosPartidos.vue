<script setup>
/** Últimos resultados de un equipo en la clasificación (del más antiguo al
 * último): G ganado en verde, E empate en gris y P perdido en rojo.
 * `ultimos`: [{ jornada, resultado: 'G' | 'E' | 'P' }]. */
defineProps({
  ultimos: { type: Array, default: () => [] }
});

const CLASE_RESULTADO = { G: 'bg-green-600', E: 'bg-gray-400', P: 'bg-red-600' };
const NOMBRE_RESULTADO = { G: 'Ganado', E: 'Empate', P: 'Perdido' };
</script>

<template>
  <div class="flex items-center gap-1">
    <span v-for="(u, i) in ultimos" :key="i"
          class="inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
          :class="CLASE_RESULTADO[u.resultado]"
          v-tooltip.top="`Jornada ${u.jornada}: ${NOMBRE_RESULTADO[u.resultado]}`">{{ u.resultado }}</span>
    <span v-if="!ultimos.length" class="text-ink-tertiary">—</span>
  </div>
</template>
