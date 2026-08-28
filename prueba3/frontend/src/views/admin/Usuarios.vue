<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { usuariosService, seccionesService } from '../../services';
import Message from 'primevue/message';
import { suscribirseCambio } from '../../utils/cambioBus';

const secciones = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  secciones.value = await seccionesService.listar();
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesSeccion = computed(() =>
  secciones.value.map(s => ({ label: s.nombre, value: s.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRol = [
  { label: 'Leer (solo lectura)', value: 'leer' },
  { label: 'Editar (crear, editar y eliminar)', value: 'editar' }
];

const columns = computed(() => [
  { field: 'usuario', header: 'Usuario', type: 'text', required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'rol', header: 'Rol', type: 'select', options: opcionesRol, required: true },
  { field: 'ids_secciones', header: 'Secciones visibles', type: 'multiselect', options: opcionesSeccion.value },
  { field: 'password', header: 'Contraseña', type: 'password', requiredOnCreate: true }
]);

const emptyItem = {
  usuario: '',
  nombre: '',
  apellidos: '',
  rol: 'leer',
  ids_secciones: [],
  password: ''
};

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
    <p class="text-sm text-ink-tertiary mb-4">
      Gestión de usuarios de la intranet. Al crear o editar, indica las secciones que podrá ver y su rol.
    </p>

    <Message severity="info" :closable="false" class="mb-4">
      La contraseña debe tener mínimo 8 caracteres y combinar mayúsculas, minúsculas, números y símbolos.
      Al editar un usuario, deja el campo contraseña vacío si no quieres cambiarla.
      <strong>Leer</strong> = solo puede ver. <strong>Editar</strong> = puede crear, editar y eliminar registros.
    </Message>

    <CrudDataTable
      title="Usuarios"
      :columns="columns"
      :service="usuariosService"
      :emptyItem="emptyItem"
    >
      <template #cell-rol="{ data }">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          :class="data.rol === 'editar' ? 'bg-club-green/10 text-club-green' : 'bg-gray-100 text-gray-600'"
        >
          {{ data.rol === 'editar' ? 'Editar' : 'Leer' }}
        </span>
      </template>
      <template #cell-ids_secciones="{ data }">
        <span class="text-sm">{{ nombresSecciones(data) }}</span>
      </template>
      <template #cell-password>
        <span class="text-ink-tertiary">••••••••</span>
      </template>
      <template #detail-rol="{ data }">
        {{ data.rol === 'editar' ? 'Editar (crear, editar y eliminar)' : 'Leer (solo lectura)' }}
      </template>
      <template #detail-ids_secciones="{ data }">
        {{ nombresSecciones(data) }}
      </template>
    </CrudDataTable>
  </div>
</template>
