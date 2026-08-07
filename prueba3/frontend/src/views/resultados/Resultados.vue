<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { resultadosService, partidosService } from '../../services';

const partidos = ref([]);

onMounted(async () => {
  partidos.value = await partidosService.listar();
});

const opcionesPartido = computed(() =>
  partidos.value.map(p => ({
    label: `${p.equipo?.nombre || 'Sin equipo'} · ${p.categoria?.nombre || ''} (${new Date(p.fecha).toLocaleDateString('es-ES')})`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_partido', header: 'Partido', type: 'select', options: opcionesPartido.value, required: true },
  { field: 'resultado', header: 'Resultado', type: 'text', required: true },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_partido: null, resultado: '', incidencias: '' };

function nombrePartido(id) {
  const p = partidos.value.find(p => p.id === id);
  if (!p) return '—';
  return `${p.equipo?.nombre || 'Sin equipo'} · ${p.categoria?.nombre || ''} (${new Date(p.fecha).toLocaleDateString('es-ES')})`;
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
      {{ data.partido?.equipo?.nombre ? `${data.partido.equipo.nombre} · ${data.partido.categoria?.nombre || ''}` : nombrePartido(data.id_partido) }}
    </template>
    <template #detail-id_partido="{ data }">
      {{ data.partido ? `${data.partido.equipo?.nombre || 'Sin equipo'} · ${data.partido.categoria?.nombre || ''} · ${new Date(data.partido.fecha).toLocaleString('es-ES')}` : nombrePartido(data.id_partido) }}
    </template>
  </CrudDataTable>
</template>