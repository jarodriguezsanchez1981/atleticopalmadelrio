<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { titulosService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
  <CrudDataTable
    title="Títulos"
    :columns="columns"
    :service="titulosService"
    :emptyItem="emptyItem"
  />
</template>