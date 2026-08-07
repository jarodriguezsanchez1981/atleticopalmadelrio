<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import { partidosService, categoriasService, lugaresService, equiposService, jugadoresService } from '../../services';

const categorias = ref([]);
const lugares = ref([]);
const equipos = ref([]);
const jugadores = ref([]);
const calendario = ref();

onMounted(async () => {
  const [cats, lugs, eqs, jugs] = await Promise.all([
    categoriasService.listar(),
    lugaresService.listar(),
    equiposService.listar(),
    jugadoresService.listar()
  ]);
  categorias.value = cats;
  lugares.value = lugs;
  equipos.value = eqs;
  jugadores.value = jugs;
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({
    label: `${c.nombre} (${c.temporada?.nombre || ''})`,
    value: c.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesLugar = computed(() =>
  lugares.value.map(l => ({ label: l.nombre, value: l.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

function opcionesJugadores(form) {
  const idCat = form?.id_categoria;
  const lista = idCat
    ? jugadores.value.filter((j) => (j.ids_categorias || []).includes(idCat))
    : jugadores.value;
  return lista
    .map((j) => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function onTablaChanged() {
  calendario.value?.refrescar();
}

const columns = computed(() => [
  {
    field: 'id_categoria',
    header: 'Categoría',
    type: 'select',
    options: opcionesCategoria.value,
    required: true
  },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true },
  { field: 'id_lugar', header: 'Lugar', type: 'select', options: opcionesLugar.value, required: true },
  { field: 'id_equipo', header: 'Equipo', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'ids_jugadores', header: 'Jugadores convocados', type: 'multiselect', options: opcionesJugadores },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_categoria: null, fecha: null, id_lugar: null, id_equipo: null, ids_jugadores: [], incidencias: '' };

function nombreCategoria(idCategoria) {
  return categorias.value.find(c => c.id === idCategoria)?.nombre || '—';
}

function nombreLugar(id) {
  return lugares.value.find(l => l.id === id)?.nombre || '—';
}

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <div>
    <CrudDataTable
      title="Partidos"
      :columns="columns"
      :service="partidosService"
      :emptyItem="emptyItem"
      @changed="onTablaChanged"
    >
      <template #cell-id_categoria="{ data }">
        {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
      </template>
      <template #cell-id_lugar="{ data }">
        {{ data.lugar?.nombre || nombreLugar(data.id_lugar) }}
      </template>
      <template #cell-id_equipo="{ data }">
        {{ data.equipo?.nombre || nombreEquipo(data.id_equipo) }}
      </template>
      <template #cell-fecha="{ data }">
        {{ formatearFecha(data.fecha) }}
      </template>
    </CrudDataTable>

    <EventosCalendario
      ref="calendario"
      tipo="partido"
      title="Calendario de partidos"
      subtitle="Todos los partidos registrados. Solo lectura."
    />
  </div>
</template>