<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { categoriasService, entrenadoresService, temporadasService } from '../../services';

const entrenadores = ref([]);
const temporadas = ref([]);

onMounted(async () => {
  const [ents, temps] = await Promise.all([
    entrenadoresService.listar(),
    temporadasService.listar()
  ]);
  entrenadores.value = ents;
  temporadas.value = temps;
});

const opcionesTemporada = computed(() =>
  temporadas.value.map(t => ({ label: t.nombre, value: t.id }))
);

const opcionesEntrenador = computed(() =>
  entrenadores.value.map(e => ({
    label: `${e.nombre} ${e.apellidos}`,
    value: e.id
  }))
);

const columns = computed(() => [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'id_entrenador', header: 'Entrenador', type: 'select', options: opcionesEntrenador.value, required: false }
]);

const emptyItem = { nombre: '', id_temporada: null, id_entrenador: null };

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
}

function nombreEntrenador(id) {
  const e = entrenadores.value.find(x => x.id === id);
  return e ? `${e.nombre} ${e.apellidos}` : '—';
}
</script>

<template>
  <CrudDataTable
    title="Categorías"
    :columns="columns"
    :service="categoriasService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_temporada="{ data }">
      {{ data.temporada?.nombre || nombreTemporada(data.id_temporada) }}
    </template>
    <template #cell-id_entrenador="{ data }">
      {{ data.entrenador ? `${data.entrenador.nombre} ${data.entrenador.apellidos}` : nombreEntrenador(data.id_entrenador) }}
    </template>
  </CrudDataTable>
</template>
