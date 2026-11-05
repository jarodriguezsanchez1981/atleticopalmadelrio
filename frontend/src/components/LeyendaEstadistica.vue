<script setup>
/** Leyenda de Estadísticas (una línea por columna): bajo una TablaEstadistica,
 * o al final de una sección con varias tablas (entradas de `leyendaSeccion`,
 * sin repetir). `conLados`: explica también Total / Local / Visitante. */
defineProps({
  entradas: { type: Array, default: () => [] },
  conLados: { type: Boolean, default: false }
});
</script>

<template>
  <dl v-if="conLados || entradas.length" class="ar-leyenda text-xs text-ink-tertiary">
    <div v-if="conLados">
      <dt class="inline font-semibold text-ink-secondary">Total / Local / Visitante:</dt> <dd class="inline">todos los partidos / en casa / fuera</dd>
    </div>
    <div v-for="e in entradas" :key="e.clave">
      <dt class="inline font-semibold text-ink-secondary">{{ e.titulo }}:</dt> <dd class="inline">{{ e.texto }}</dd>
    </div>
  </dl>
</template>
