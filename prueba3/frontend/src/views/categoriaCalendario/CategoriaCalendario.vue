<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { categoriaCalendarioService, categoriasService, equiposService } from '../../services';

const categorias = ref([]);
const equipos = ref([]);

onMounted(async () => {
  const [cats, eqs] = await Promise.all([
    categoriasService.listar(),
    equiposService.listar()
  ]);
  categorias.value = cats;
  equipos.value = eqs;
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: c.nombre, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'id_equipo_local', header: 'Equipo Local', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'id_equipo_visitante', header: 'Equipo Visitante', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'jornada', header: 'Jornada', type: 'number', required: true },
  { field: 'fecha', header: 'Fecha', type: 'date', required: true },
  { field: 'hora', header: 'Hora', type: 'text', required: false }
]);

const emptyItem = { id_categoria: null, id_temporada: null, id_equipo_local: null, id_equipo_visitante: null, jornada: null, fecha: null, hora: null };

function nombreCategoria(id) {
  return categorias.value.find(c => c.id === id)?.nombre || '—';
}

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function formatDate(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>

<template>
  <CrudDataTable
    title="Jornadas"
    :columns="columns"
    :service="categoriaCalendarioService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
    <template #cell-id_equipo_local="{ data }">
      {{ data.equipoLocal?.nombre || nombreEquipo(data.id_equipo_local) }}
    </template>
    <template #cell-id_equipo_visitante="{ data }">
      {{ data.equipoVisitante?.nombre || nombreEquipo(data.id_equipo_visitante) }}
    </template>
    <template #cell-fecha="{ data }">
      {{ formatDate(data.fecha) }}
    </template>
    <template #detail-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
    <template #detail-id_equipo_local="{ data }">
      {{ data.equipoLocal?.nombre || nombreEquipo(data.id_equipo_local) }}
    </template>
    <template #detail-id_equipo_visitante="{ data }">
      {{ data.equipoVisitante?.nombre || nombreEquipo(data.id_equipo_visitante) }}
    </template>
    <template #detail-fecha="{ data }">
      {{ formatDate(data.fecha) }}
    </template>
  </CrudDataTable>
</template>
