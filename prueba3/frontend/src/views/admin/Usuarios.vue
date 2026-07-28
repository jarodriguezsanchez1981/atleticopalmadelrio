<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { usuariosService, rolesService, seccionesService } from '../../services';
import Message from 'primevue/message';

const roles = ref([]);
const secciones = ref([]);

onMounted(async () => {
  const [r, s] = await Promise.all([
    rolesService.listar(),
    seccionesService.listar()
  ]);
  roles.value = r;
  secciones.value = s;
});

const opcionesRol = computed(() =>
  roles.value.map(r => ({ label: r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1), value: r.id }))
);

const opcionesSeccion = computed(() =>
  secciones.value.map(s => ({ label: s.nombre, value: s.id }))
);

const columns = computed(() => [
  { field: 'usuario', header: 'Usuario', type: 'text', required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'id_rol', header: 'Rol', type: 'select', options: opcionesRol.value, required: true },
  { field: 'ids_secciones', header: 'Secciones visibles', type: 'multiselect', options: opcionesSeccion.value, required: true },
  { field: 'password', header: 'Contraseña', type: 'password' }
]);

const emptyItem = {
  usuario: '',
  nombre: '',
  apellidos: '',
  id_rol: null,
  ids_secciones: [],
  password: ''
};

function nombreRol(idRol) {
  return roles.value.find(r => r.id === idRol)?.nombre || '—';
}

function nombresSecciones(data) {
  if (data.secciones?.length) return data.secciones.map(s => s.nombre).join(', ');
  const ids = data.ids_secciones || [];
  return ids.map(id => secciones.value.find(s => s.id === id)?.nombre || id).join(', ') || '—';
}
</script>

<template>
  <div>
    <h1 class="font-display text-xl text-club-green mb-1 flex items-center gap-2">
      <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
      Administración
    </h1>
    <p class="text-sm text-slate-500 mb-4">
      Gestión de usuarios de la intranet. Al crear o editar, indica el rol y las secciones que podrá ver.
    </p>

    <Message severity="info" :closable="false" class="mb-4">
      La contraseña debe tener mínimo 8 caracteres y combinar mayúsculas, minúsculas, números y símbolos.
      Al editar un usuario, deja el campo contraseña vacío si no quieres cambiarla.
      Selecciona al menos una sección visible.
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
      <template #cell-ids_secciones="{ data }">
        <span class="text-sm">{{ nombresSecciones(data) }}</span>
      </template>
      <template #cell-password>
        <span class="text-slate-400">••••••••</span>
      </template>
      <template #detail-ids_secciones="{ data }">
        {{ nombresSecciones(data) }}
      </template>
    </CrudDataTable>
  </div>
</template>
