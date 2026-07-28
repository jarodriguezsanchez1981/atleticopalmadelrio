<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import { rolesService } from '../../services';
import Message from 'primevue/message';

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true }
];

const emptyItem = { nombre: '' };
</script>

<template>
  <div>
    <Message severity="warn" :closable="false" class="mb-4">
      Los roles definen el perfil del usuario (p. ej. administrador, coordinador, entrenador).
      Las secciones que cada usuario puede ver se configuran en Administración → Usuarios.
    </Message>

    <CrudDataTable
      title="Roles"
      :columns="columns"
      :service="rolesService"
      :emptyItem="emptyItem"
    />
  </div>
</template>
