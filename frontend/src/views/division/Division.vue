<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { divisionesService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
  <CrudDataTable
    title="División"
    :columns="columns"
    :service="divisionesService"
    :emptyItem="emptyItem"
  />
</template>