<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Select from 'primevue/select';
import { usuariosService, seccionesService, categoriasService } from '../../services';
import Message from 'primevue/message';
import { suscribirseCambio } from '../../utils/cambioBus';

const secciones = ref([]);
const categorias = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  secciones.value = await seccionesService.listar();
  categorias.value = await categoriasService.listar();
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

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: c.nombre, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRol = [
  { label: 'Coordinador (ve todas las categorías)', value: 'coordinador' },
  { label: 'Entrenador (solo su categoría)', value: 'entrenador' }
];

const opcionesVisibilidad = [
  { label: 'Leer (solo lectura)', value: 'leer' },
  { label: 'Editar (crear, editar y eliminar)', value: 'editar' }
];

const columns = computed(() => [
  { field: 'usuario', header: 'Usuario', type: 'text', required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true },
  { field: 'rol', header: 'Rol', type: 'select', options: opcionesRol, required: true },
  { field: 'id_categoria', header: 'Categoría', type: 'text', enForm: false,
    format: (v) => categorias.value.find(c => c.id === Number(v))?.nombre || '—' },
  { field: 'visibilidad', header: 'Visibilidad', type: 'select', options: opcionesVisibilidad, required: true },
  { field: 'ids_secciones', header: 'Secciones visibles', type: 'multiselect', options: opcionesSeccion.value },
  { field: 'password', header: 'Contraseña', type: 'password', requiredOnCreate: true }
]);

const emptyItem = {
  usuario: '',
  nombre: '',
  apellidos: '',
  rol: 'coordinador',
  id_categoria: null,
  visibilidad: 'leer',
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
<SectionGuard seccion="administracion">
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
      <strong>Rol</strong>: Coordinador = ve todas las categorías, Entrenador = ve solo su categoría.
      <strong>Visibilidad</strong>: Leer = solo lectura, Editar = puede crear, editar y eliminar.
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
          :class="data.rol === 'entrenador' ? 'bg-club-garnet/10 text-club-garnet' : 'bg-club-green/10 text-club-green'"
        >
          {{ data.rol === 'entrenador' ? 'Entrenador' : 'Coordinador' }}
        </span>
      </template>
      <template #cell-visibilidad="{ data }">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          :class="data.visibilidad === 'editar' ? 'bg-club-green/10 text-club-green' : 'bg-gray-100 text-gray-600'"
        >
          {{ data.visibilidad === 'editar' ? 'Editar' : 'Leer' }}
        </span>
      </template>
      <template #cell-ids_secciones="{ data }">
        <span class="text-sm">{{ nombresSecciones(data) }}</span>
      </template>
      <template #cell-password>
        <span class="text-ink-tertiary">••••••••</span>
      </template>
      <template #detail-rol="{ data }">
        {{ data.rol === 'entrenador' ? 'Entrenador (solo su categoría)' : 'Coordinador (ve todas las categorías)' }}
      </template>
      <template #detail-visibilidad="{ data }">
        {{ data.visibilidad === 'editar' ? 'Editar (crear, editar y eliminar)' : 'Leer (solo lectura)' }}
      </template>
      <template #detail-ids_secciones="{ data }">
        {{ nombresSecciones(data) }}
      </template>

      <template #form-extra="{ form }">
        <div v-if="form.rol === 'entrenador'" class="flex flex-col gap-1.5">
          <label for="id_categoria" class="text-sm font-medium text-ink-secondary">
            Categoría <span class="text-club-garnet">*</span>
          </label>
          <Select
            id="id_categoria"
            v-model="form.id_categoria"
            :options="opcionesCategoria"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Selecciona una categoría"
            showClear
          />
        </div>
      </template>
    </CrudDataTable>
  </div>
</SectionGuard>
</template>