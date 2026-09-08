<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { temporadasService } from '../../services';

const opcionesActual = [
  { label: 'Sí', value: true },
  { label: 'No', value: false }
];

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  {
    field: 'actual', header: 'Actual', type: 'select', options: opcionesActual, required: true,
    format: (v) => (v ? 'Sí' : 'No')
  }
];

const emptyItem = { nombre: '', actual: false };
</script>

<template>
<SectionGuard seccion="temporadas">
  <CrudDataTable
    title="Temporadas"
    seccion="temporadas"
    :columns="columns"
    :service="temporadasService"
    :emptyItem="emptyItem"
  />
</SectionGuard>
</template>