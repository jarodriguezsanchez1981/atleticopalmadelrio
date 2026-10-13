<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { personalService } from '../../services';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const columns = [
  { field: 'foto', header: 'Foto', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'email', header: 'Email', type: 'text', validate: (v) => (v && !EMAIL.test(String(v).trim()) ? 'El email no es válido.' : null) },
  { field: 'telefono', header: 'Teléfono', type: 'text' },
  { field: 'seccion', header: 'Sección', type: 'text' }
];

const emptyItem = { foto: null, nombre: '', apellidos: '', email: '', telefono: '', seccion: '' };
</script>

<template>
<SectionGuard seccion="personal">
  <CrudDataTable
    title="Personal"
    seccion="personal"
    :columns="columns"
    :service="personalService"
    :emptyItem="emptyItem"
    sortField="apellidos"
  />
</SectionGuard>
</template>
