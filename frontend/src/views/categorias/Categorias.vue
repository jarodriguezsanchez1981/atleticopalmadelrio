<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { categoriasService, tiposFutbolService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const tiposFutbol = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  tiposFutbol.value = await tiposFutbolService.listar();
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesTipoFutbol = computed(() =>
  tiposFutbol.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'alias', header: 'Alias', type: 'text', required: false },
  { field: 'id_tipofutbol', header: 'Tipo de fútbol', type: 'select', options: opcionesTipoFutbol.value, required: true },
  { field: 'tiempopartido', header: 'Tiempo partido (min)', type: 'number', required: false },
  { field: 'tiempoentrenamiento', header: 'Tiempo entrenam. (min)', type: 'number', required: false },
  { field: 'orden', header: 'Orden', type: 'number', required: false }
]);

const emptyItem = { nombre: '', alias: '', id_tipofutbol: null, tiempopartido: null, tiempoentrenamiento: null, orden: null };

function nombreTipoFutbol(id) {
  return tiposFutbol.value.find(t => t.id === id)?.nombre || '—';
}
</script>

<template>
  <CrudDataTable
    title="Categorías"
    :columns="columns"
    :service="categoriasService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_tipofutbol="{ data }">
      {{ data.tipofutbol?.nombre || nombreTipoFutbol(data.id_tipofutbol) }}
    </template>
  </CrudDataTable>
</template>
