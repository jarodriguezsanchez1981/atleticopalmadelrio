<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { jugadoresService, categoriasService } from '../../services';

const categorias = ref([]);

onMounted(async () => {
  categorias.value = await categoriasService.listar();
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada})`, value: c.id }))
);

const columns = computed(() => [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', required: true },
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true }
]);

const emptyItem = { nombre: '', apellidos: '', dni: '', id_categoria: null };

function nombreCategoria(idCategoria) {
  return categorias.value.find(c => c.id === idCategoria)?.nombre || '—';
}
</script>

<template>
  <CrudDataTable
    title="Jugadores"
    :columns="columns"
    :service="jugadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
  </CrudDataTable>
</template>
