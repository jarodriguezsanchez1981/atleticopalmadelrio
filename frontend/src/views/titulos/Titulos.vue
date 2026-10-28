<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { titulosService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
<SectionGuard seccion="titulos">
  <CrudDataTable
    title="Títulos"
    seccion="titulos"
    :columns="columns"
    :service="titulosService"
    :emptyItem="emptyItem"
  />
</SectionGuard>
</template>