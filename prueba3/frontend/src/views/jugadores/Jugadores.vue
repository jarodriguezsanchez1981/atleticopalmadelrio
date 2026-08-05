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
  temporadas.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({
    label: `${c.nombre} (${c.temporada?.nombre || ''})`,
    value: c.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'dni', header: 'DNI', type: 'text', required: true },
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'ids_categorias', header: 'Categorías', type: 'multiselect', relation: 'categorias', options: opcionesCategoria.value, required: false }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', dni: '', id_temporada: null, ids_categorias: [] };

function nombresCategorias(data) {
  if (data.categorias?.length) return data.categorias.map(c => `${c.nombre} (${c.temporada?.nombre || ''})`).join(', ');
  const ids = data.ids_categorias || [];
  return ids.map(id => opcionesCategoria.value.find(o => o.value === id)?.label || id).join(', ') || '—';
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
    <template #cell-ids_categorias="{ data }">
      {{ nombresCategorias(data) }}
    </template>
    <template #detail-ids_categorias="{ data }">
      {{ nombresCategorias(data) }}
    </template>
  </CrudDataTable>
</template>
