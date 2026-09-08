<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { coordinadoresService } from '../../services';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'email', header: 'Email', type: 'text' },
  { field: 'telefono', header: 'Teléfono', type: 'text' }
];

const emptyItem = { nombre: '', apellidos: '', email: '', telefono: '' };
</script>

<template>
<SectionGuard seccion="coordinadores">
  <CrudDataTable
    title="Coordinadores"
    seccion="coordinadores"
    :columns="columns"
    :service="coordinadoresService"
    :emptyItem="emptyItem"
    :canExport="true"
  />
</SectionGuard>
</template>
