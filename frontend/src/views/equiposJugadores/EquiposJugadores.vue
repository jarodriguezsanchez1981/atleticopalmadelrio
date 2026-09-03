<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { equiposJugadoresService, equiposService, categoriasService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const equipos = ref([]);
const categorias = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  const [eqs, cats] = await Promise.all([
    equiposService.listar(),
    categoriasService.listar()
  ]);
  equipos.value = eqs;
  categorias.value = cats;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: c.nombre, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_equipo', header: 'Equipo', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'apellidos', header: 'Apellidos', type: 'text', required: true }
]);

const emptyItem = { id_equipo: null, id_categoria: null, nombre: '', apellidos: '' };

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function nombreCategoria(id) {
  return categorias.value.find(c => c.id === id)?.nombre || '—';
}
</script>

<template>
<SectionGuard seccion="equipos_jugadores">
  <CrudDataTable
    title="Jugadores de Equipos"
    :columns="columns"
    :service="equiposJugadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_equipo="{ data }">
      {{ data.equipo?.nombre || nombreEquipo(data.id_equipo) }}
    </template>
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
    <template #detail-id_equipo="{ data }">
      {{ data.equipo?.nombre || nombreEquipo(data.id_equipo) }}
    </template>
    <template #detail-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>