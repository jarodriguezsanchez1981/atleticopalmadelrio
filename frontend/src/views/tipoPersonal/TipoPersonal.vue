<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { tiposPersonalService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
<SectionGuard seccion="tipo_personal">
  <CrudDataTable
    title="Tipo Personal"
    seccion="tipo_personal"
    :columns="columns"
    :service="tiposPersonalService"
    :emptyItem="emptyItem"
    sortField="nombre"
  />
</SectionGuard>
</template>
