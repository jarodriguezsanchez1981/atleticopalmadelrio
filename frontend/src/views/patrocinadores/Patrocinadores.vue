<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { patrocinadoresService } from '../../services';

const ordenesUsados = ref([]);

async function refrescarOrdenesUsados() {
  try {
    const lista = await patrocinadoresService.listar();
    ordenesUsados.value = lista.map((p) => Number(p.orden));
  } catch {
    ordenesUsados.value = [];
  }
}

const opcionesOrden = computed(() =>
  Array.from({ length: 50 }, (_, i) => i + 1).map((n) => ({ label: String(n), value: n }))
);

const opcionesTipo = computed(() => [
  { label: 'Principal', value: 'principal' },
  { label: 'Oficial', value: 'oficial' }
]);

const columns = computed(() => [
  { field: 'id', header: 'ID', type: 'text', readonly: true, enForm: false },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'tipo', header: 'Tipo', type: 'select', required: true, options: opcionesTipo.value },
  { field: 'imagen', header: 'Imagen', type: 'image' },
  {
    field: 'orden',
    header: 'Orden',
    type: 'select',
    required: true,
    options: (form) =>
      opcionesOrden.value.filter((o) => !ordenesUsados.value.includes(o.value) || o.value === form.orden)
  }
]);

const emptyItem = { nombre: '', tipo: 'oficial', imagen: null, orden: null };

onMounted(refrescarOrdenesUsados);
</script>

<template>
  <CrudDataTable
    title="Patrocinadores"
    :columns="columns"
    :service="patrocinadoresService"
    :emptyItem="emptyItem"
    @changed="refrescarOrdenesUsados"
  >
    <template #cell-imagen="{ data }">
      <img v-if="data.imagen" :src="data.imagen" :alt="data.nombre || 'Patrocinador'"
           class="h-10 w-auto max-w-[140px] object-contain" />
      <span v-else>—</span>
    </template>
  </CrudDataTable>
</template>