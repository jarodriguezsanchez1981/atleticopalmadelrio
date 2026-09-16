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
  { field: 'ids_tipos_futbol', header: 'Tipos de fútbol', type: 'multiselect', relation: 'tiposFutbol', options: opcionesTipoFutbol.value },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' }
]);

const emptyItem = { nombre: '', apellidos: '', ids_tipos_futbol: [], email: '', telefono: '' };

function nombreTipos(data) {
  if (data.tiposFutbol?.length) return data.tiposFutbol.map(t => t.nombre).join(', ');
  const ids = data.ids_tipos_futbol || [];
  return ids.map(id => opcionesTipoFutbol.value.find(o => o.value === id)?.label || id).join(', ') || '—';
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
    <template #cell-ids_tipos_futbol="{ data }">
      {{ nombreTipos(data) }}
    </template>
    <template #detail-ids_tipos_futbol="{ data }">
      {{ nombreTipos(data) }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>
