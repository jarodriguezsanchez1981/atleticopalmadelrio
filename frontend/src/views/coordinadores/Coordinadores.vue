<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { coordinadoresService, tiposFutbolService } from '../../services';
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
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'id_tipofutbol', header: 'Tipo de fútbol', type: 'select', options: opcionesTipoFutbol.value },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' }
]);

const emptyItem = { nombre: '', apellidos: '', id_tipofutbol: null, email: '', telefono: '' };

function nombreTipoFutbol(id) {
  return tiposFutbol.value.find(t => t.id === id)?.nombre || '—';
}
</script>

<template>
<SectionGuard seccion="coordinadores">
  <CrudDataTable
    title="Coordinadores"
    seccion="coordinadores"
    :columns="columns"
    :service="coordinadoresService"
    :emptyItem="emptyItem"
    :canExport="true"
  >
    <template #cell-id_tipofutbol="{ data }">
      {{ data.tipofutbol?.nombre || nombreTipoFutbol(data.id_tipofutbol) }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>
