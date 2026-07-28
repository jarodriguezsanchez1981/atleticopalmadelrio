<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { usuariosService, rolesService } from '../../services';
import Message from 'primevue/message';

const roles = ref([]);

onMounted(async () => {
  roles.value = await rolesService.listar();
});

const opcionesRol = computed(() =>
  roles.value.map(r => ({ label: r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1), value: r.id }))
);

const columns = computed(() => [
  { field: 'usuario', header: 'Usuario', type: 'text', required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'id_rol', header: 'Rol', type: 'select', options: opcionesRol.value, required: true },
  // La contraseña se define/edita aparte: campo vacío = "no cambiar" en edición
  { field: 'password', header: 'Contraseña', type: 'password' }
]);

const emptyItem = { usuario: '', nombre: '', apellidos: '', id_rol: null, password: '' };

function nombreRol(idRol) {
  return roles.value.find(r => r.id === idRol)?.nombre || '—';
}
</script>

<template>
  <div>
    <h1 class="font-display text-xl text-club-green mb-1">Administración</h1>
    <p class="text-sm text-slate-500 mb-4">Gestión de usuarios y roles de la intranet. Solo visible para el rol administrador.</p>

    <Message severity="info" :closable="false" class="mb-4">
      La contraseña debe tener mínimo 8 caracteres y combinar mayúsculas, minúsculas, números y símbolos.
      Al editar un usuario, deja el campo contraseña vacío si no quieres cambiarla.
    </Message>

    <CrudDataTable
      title="Usuarios"
      :columns="columns"
      :service="usuariosService"
      :emptyItem="emptyItem"
    >
      <template #cell-id_rol="{ data }">
        <span class="capitalize">{{ data.rol?.nombre || nombreRol(data.id_rol) }}</span>
      </template>
      <template #cell-password="{ data }">
        <span class="text-slate-400">••••••••</span>
      </template>
    </CrudDataTable>
  </div>
</template>
