<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { materialesService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
<SectionGuard seccion="material">
  <CrudDataTable
    title="Material"
    seccion="material"
    :columns="columns"
    :service="materialesService"
    :emptyItem="emptyItem"
  />
</SectionGuard>
</template>
