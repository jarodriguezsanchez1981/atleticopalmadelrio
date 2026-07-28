<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { categoriasService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'temporada', header: 'Temporada', type: 'text', required: true }
];

const emptyItem = { nombre: '', temporada: '' };
</script>

<template>
  <CrudDataTable
    title="Categorías"
    :columns="columns"
    :service="categoriasService"
    :emptyItem="emptyItem"
  />
</template>
