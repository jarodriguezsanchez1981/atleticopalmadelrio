<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { divisionesService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
<SectionGuard seccion="division">
  <CrudDataTable
    title="División"
    seccion="division"
    :columns="columns"
    :service="divisionesService"
    :emptyItem="emptyItem"
  />
</SectionGuard>
</template>