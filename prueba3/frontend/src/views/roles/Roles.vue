<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Message from 'primevue/message';
import { rolesService, usuariosService } from '../../services';

const usuarios = ref([]);

onMounted(async () => {
  usuarios.value = await usuariosService.listar();
});

const opcionesUsuario = computed(() =>
  usuarios.value
    .map(u => ({ label: `${u.usuario} — ${u.nombre} ${u.apellidos}`, value: u.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRol = [
  { label: 'read · Solo lectura', value: 'read' },
  { label: 'write · Ver, editar y borrar', value: 'write' }
];

const columns = computed(() => [
  { field: 'id_usuario', header: 'Usuario', type: 'select', options: opcionesUsuario.value, required: true },
  { field: 'nombre', header: 'Rol', type: 'select', options: opcionesRol.value, required: true }
]);

const emptyItem = { id_usuario: null, nombre: null };

function labelRol(r) {
  const map = { read: 'read · Solo lectura', write: 'write · Ver, editar y borrar' };
  return map[r] || r || '—';
}

function nombreUsuario(id) {
  const u = usuarios.value.find(x => x.id === id);
  return u ? `${u.usuario} — ${u.nombre} ${u.apellidos}` : '—';
}
</script>

<template>
  <div>
    <h1 class="font-display text-xl text-club-green mb-1 flex items-center gap-2">
      <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
      Roles
    </h1>
    <p class="text-sm text-slate-500 mb-4">
      Asigna roles a los usuarios. Un usuario puede tener varios roles; el de mayor nivel decide lo que puede hacer.
    </p>

    <Message severity="info" :closable="false" class="mb-4">
      <strong>read</strong> solo puede ver. <strong>write</strong> puede ver, editar y borrar.
      Si un usuario tiene varios roles, gana el de mayor permiso.
    </Message>

    <CrudDataTable
      title="Roles"
      :columns="columns"
      :service="rolesService"
      :emptyItem="emptyItem"
    >
      <template #cell-id_usuario="{ data }">
        {{ data.usuario ? `${data.usuario.usuario} — ${data.usuario.nombre} ${data.usuario.apellidos}` : nombreUsuario(data.id_usuario) }}
      </template>
      <template #cell-nombre="{ data }">
        {{ labelRol(data.nombre) }}
      </template>
    </CrudDataTable>
  </div>
</template>
