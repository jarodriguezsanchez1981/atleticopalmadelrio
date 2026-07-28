<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { entrenamientosService, categoriasService } from '../../services';

const categorias = ref([]);

onMounted(async () => {
  categorias.value = await categoriasService.listar();
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada})`, value: c.id }))
);

const columns = computed(() => [
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true },
  { field: 'lugar', header: 'Lugar', type: 'text', required: true },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_categoria: null, fecha: null, lugar: '', incidencias: '' };

function nombreCategoria(idCategoria) {
  return categorias.value.find(c => c.id === idCategoria)?.nombre || '—';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <CrudDataTable
    title="Entrenamientos"
    :columns="columns"
    :service="entrenamientosService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
    <template #cell-fecha="{ data }">
      {{ formatearFecha(data.fecha) }}
    </template>
  </CrudDataTable>
</template>
