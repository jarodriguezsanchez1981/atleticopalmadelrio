<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { posicionesService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'alias', header: 'Alias', type: 'text', required: false }
];

const emptyItem = { nombre: '', alias: '' };
</script>

<template>
<SectionGuard seccion="posicion">
  <CrudDataTable
    title="Posición"
    seccion="posicion"
    :columns="columns"
    :service="posicionesService"
    :emptyItem="emptyItem"
  />
</SectionGuard>
</template>