<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { incidenciasService, jugadoresService, entrenadoresService, delegadosService, categoriasService } from '../../services';

const jugadores = ref([]);
const entrenadores = ref([]);
const delegados = ref([]);
const categorias = ref([]);

onMounted(async () => {
  const [jugs, ents, dels, cats] = await Promise.all([
    jugadoresService.listar(),
    entrenadoresService.listar(),
    delegadosService.listar(),
    categoriasService.listar()
  ]);
  jugadores.value = jugs;
  entrenadores.value = ents;
  delegados.value = dels;
  categorias.value = cats;
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({
    label: `${c.nombre} (${c.temporada?.nombre || ''})`,
    value: c.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

function jugadoresDeCategoria(idCategoria) {
  if (!idCategoria) {
    return jugadores.value.map(j => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  return jugadores.value
    .filter(j => (j.ids_categorias || []).includes(idCategoria))
    .map(j => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

const opcionesEntrenador = computed(() =>
  entrenadores.value.map(e => ({ label: `${e.nombre} ${e.apellidos}`, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesDelegado = computed(() =>
  delegados.value.map(d => ({ label: `${d.nombre} ${d.apellidos}`, value: d.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: false },
  { field: 'id_jugador', header: 'Jugador', type: 'select', options: (form) => jugadoresDeCategoria(form?.id_categoria), required: false },
  { field: 'id_entrenador', header: 'Entrenador', type: 'select', options: opcionesEntrenador.value, required: false },
  { field: 'id_delegado', header: 'Delegado', type: 'select', options: opcionesDelegado.value, required: false },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea', required: false },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true }
]);

const emptyItem = { id_categoria: null, id_jugador: null, id_entrenador: null, id_delegado: null, incidencias: '', fecha: null };

function nombreCategoria(id) {
  const c = categorias.value.find(c => c.id === id);
  return c ? `${c.nombre} (${c.temporada?.nombre || ''})` : '—';
}

function nombreJugador(id) {
  const j = jugadores.value.find(j => j.id === id);
  return j ? `${j.nombre} ${j.apellidos}` : '—';
}

function nombreEntrenador(id) {
  const e = entrenadores.value.find(e => e.id === id);
  return e ? `${e.nombre} ${e.apellidos}` : '—';
}

function nombreDelegado(id) {
  const d = delegados.value.find(d => d.id === id);
  return d ? `${d.nombre} ${d.apellidos}` : '—';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <CrudDataTable
    title="Incidencias"
    :columns="columns"
    :service="incidenciasService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_categoria="{ data }">
      {{ data.categoria ? `${data.categoria.nombre} (${data.categoria.temporada?.nombre || ''})` : nombreCategoria(data.id_categoria) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.nombre} ${data.jugador.apellidos}` : nombreJugador(data.id_jugador) }}
    </template>
    <template #cell-id_entrenador="{ data }">
      {{ data.entrenador ? `${data.entrenador.nombre} ${data.entrenador.apellidos}` : nombreEntrenador(data.id_entrenador) }}
    </template>
    <template #cell-id_delegado="{ data }">
      {{ data.delegado ? `${data.delegado.nombre} ${data.delegado.apellidos}` : nombreDelegado(data.id_delegado) }}
    </template>
    <template #cell-fecha="{ data }">
      {{ formatearFecha(data.fecha) }}
    </template>
  </CrudDataTable>
</template>