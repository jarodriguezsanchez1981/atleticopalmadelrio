<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { equiposService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
  <CrudDataTable
    title="Equipos"
    :columns="columns"
    :service="equiposService"
    :emptyItem="emptyItem"
  />
</template>
