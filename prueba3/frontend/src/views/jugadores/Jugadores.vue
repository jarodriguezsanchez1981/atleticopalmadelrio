<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { jugadoresService, categoriasService, temporadasService } from '../../services';

const categorias = ref([]);
const temporadas = ref([]);

onMounted(async () => {
  const [cats, temps] = await Promise.all([
    categoriasService.listar(),
    temporadasService.listar()
  ]);
  categorias.value = cats;
  temporadas.value = temps;
});

const opcionesTemporada = computed(() =>
  temporadas.value.map(t => ({ label: t.nombre, value: t.id }))
);

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({
    label: `${c.nombre} (${c.temporada?.nombre || ''})`,
    value: c.id
  }))
);

const columns = computed(() => [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', required: true },
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true }
]);

const emptyItem = { nombre: '', apellidos: '', dni: '', id_temporada: null, id_categoria: null };

function nombreCategoria(id) {
  return categorias.value.find(c => c.id === id)?.nombre || '—';
}

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
}
</script>

<template>
  <CrudDataTable
    title="Jugadores"
    :columns="columns"
    :service="jugadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_temporada="{ data }">
      {{ data.temporada?.nombre || nombreTemporada(data.id_temporada) }}
    </template>
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
  </CrudDataTable>
</template>
