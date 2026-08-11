<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { resultadosService, partidosService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const partidos = ref([]);

async function cargarOpciones() {
  partidos.value = await partidosService.listar();
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

let unsubCambio = null;

const opcionesPartido = computed(() =>
  partidos.value.map(p => ({
    label: `${nombrePartidoLabel(p)} (${new Date(p.fecha).toLocaleDateString('es-ES')})`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

function nombrePartidoLabel(p) {
  if (!p) return '—';
  const cat = p.categoria?.nombre || '';
  const eq = p.equipo?.nombre || 'Sin equipo';
  return p.es_local ? `${cat} vs ${eq}` : `${eq} vs ${cat}`;
}

const columns = computed(() => [
  { field: 'id_partido', header: 'Partido', type: 'select', options: opcionesPartido.value, required: true },
  { field: 'resultado', header: 'Resultado', type: 'text', required: true },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_partido: null, resultado: '', incidencias: '' };

function nombrePartido(id) {
  const p = partidos.value.find(p => p.id === id);
  if (!p) return '—';
  return `${nombrePartidoLabel(p)} (${new Date(p.fecha).toLocaleDateString('es-ES')})`;
}
</script>

<template>
  <CrudDataTable
    title="Resultados"
    :columns="columns"
    :service="resultadosService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_partido="{ data }">
      {{ data.partido ? nombrePartidoLabel(data.partido) : nombrePartido(data.id_partido) }}
    </template>
    <template #detail-id_partido="{ data }">
      {{ data.partido ? `${nombrePartidoLabel(data.partido)} · ${new Date(data.partido.fecha).toLocaleString('es-ES')}` : nombrePartido(data.id_partido) }}
    </template>
  </CrudDataTable>
</template>