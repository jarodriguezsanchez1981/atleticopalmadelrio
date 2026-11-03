<script setup>
import { ref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';

/** Pestañas Total / Local / Visitante de Estadísticas: solo se ve la tabla del
 * lado elegido, que se pinta con el slot por defecto `{ lado }` (clave, titulo,
 * sufijo). Se vuelve a montar al cambiar de lado (TablaEstadistica toma
 * `soloGrupo` solo al crearse). */
const LADOS = [
  { clave: 'total', titulo: 'Total', sufijo: '' },
  { clave: 'local', titulo: 'Local', sufijo: '_local' },
  { clave: 'visitante', titulo: 'Visitante', sufijo: '_visitante' }
];
const activo = ref('total');
</script>

<template>
  <div class="flex flex-col gap-2">
    <Tabs v-model:value="activo">
      <TabList>
        <Tab v-for="l in LADOS" :key="l.clave" :value="l.clave">{{ l.titulo }}</Tab>
      </TabList>
    </Tabs>
    <div :key="activo">
      <slot :lado="LADOS.find((l) => l.clave === activo)" />
    </div>
  </div>
</template>
