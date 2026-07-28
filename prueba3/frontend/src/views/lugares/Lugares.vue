<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { lugaresService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
  <CrudDataTable
    title="Lugares"
    :columns="columns"
    :service="lugaresService"
    :emptyItem="emptyItem"
  />
</template>
