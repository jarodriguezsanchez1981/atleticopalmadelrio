<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { usuariosService, seccionesService } from '../../services';
import Message from 'primevue/message';

const secciones = ref([]);

onMounted(async () => {
  secciones.value = await seccionesService.listar();
});

const opcionesSeccion = computed(() =>
  secciones.value.map(s => ({ label: s.nombre, value: s.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'usuario', header: 'Usuario', type: 'text', required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'ids_secciones', header: 'Secciones visibles', type: 'multiselect', options: opcionesSeccion.value },
  { field: 'password', header: 'Contraseña', type: 'password' }
]);

const emptyItem = {
  usuario: '',
  nombre: '',
  apellidos: '',
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
    <p class="text-sm text-slate-500 mb-4">
      Gestión de usuarios de la intranet. Al crear o editar, indica las secciones que podrá ver.
    </p>

    <Message severity="info" :closable="false" class="mb-4">
      La contraseña debe tener mínimo 8 caracteres y combinar mayúsculas, minúsculas, números y símbolos.
      Al editar un usuario, deja el campo contraseña vacío si no quieres cambiarla.
      Un usuario nuevo puede quedar sin secciones visibles; se las asignas después desde esta pantalla.
    </Message>

    <CrudDataTable
      title="Usuarios"
      :columns="columns"
      :service="usuariosService"
      :emptyItem="emptyItem"
    >
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
