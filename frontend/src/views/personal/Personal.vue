<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { personalService, tiposPersonalService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const tipos = ref([]);
let unsubCambio = null;

async function cargarTipos() {
  tipos.value = await tiposPersonalService.listar().catch(() => []);
}

onMounted(async () => {
  await cargarTipos();
  unsubCambio = suscribirseCambio(cargarTipos);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesTipo = computed(() => tipos.value.map((t) => ({ label: t.nombre, value: t.id })));

const columns = computed(() => [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'email', header: 'Email', type: 'text', validate: (v) => (v && !EMAIL.test(String(v).trim()) ? 'El email no es válido.' : null) },
  { field: 'telefono', header: 'Teléfono', type: 'text' },
  { field: 'id_tipo_personal', header: 'Tipo Personal', type: 'select', options: opcionesTipo.value }
]);

const emptyItem = { foto: null, nombre: '', apellidos: '', email: '', telefono: '', id_tipo_personal: null };
</script>

<template>
<SectionGuard seccion="personal">
  <CrudDataTable
    title="Personal"
    seccion="personal"
    :columns="columns"
    :service="personalService"
    :emptyItem="emptyItem"
    sortField="apellidos"
  >
    <template #cell-id_tipo_personal="{ data }">
      {{ data.tipoPersonal?.nombre || '—' }}
    </template>
    <template #detail-id_tipo_personal="{ data }">
      {{ data.tipoPersonal?.nombre || '—' }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>
