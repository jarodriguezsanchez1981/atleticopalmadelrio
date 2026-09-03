<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { temporadasService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
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