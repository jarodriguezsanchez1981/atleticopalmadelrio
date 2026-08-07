<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import { entrenamientosService, categoriasService, lugaresService, jugadoresService } from '../../services';

const categorias = ref([]);
const lugares = ref([]);
const jugadores = ref([]);
const calendario = ref();

onMounted(async () => {
  const [cats, lugs, jugs] = await Promise.all([
    categoriasService.listar(),
    lugaresService.listar(),
    jugadoresService.listar()
  ]);
  categorias.value = cats;
  lugares.value = lugs;
  jugadores.value = jugs;
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesLugar = computed(() =>
  lugares.value.map(l => ({ label: l.nombre, value: l.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRecurrente = [
  { label: 'No (solo este día)', value: 0 },
  { label: 'Sí (todas las semanas)', value: 1 }
];

function jugadoresDeCategoria(form) {
  const idCat = form?.id_categoria;
  const lista = idCat
    ? jugadores.value.filter((j) => (j.ids_categorias || []).includes(idCat))
    : jugadores.value;
  return lista
    .map((j) => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function opcionesJugadores(form) {
  return jugadoresDeCategoria(form);
}

function onTablaChanged() {
  calendario.value?.refrescar();
}

const columns = computed(() => [
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true },
  { field: 'id_lugar', header: 'Lugar', type: 'select', options: opcionesLugar.value, required: true },
  { field: 'recurrente', header: 'Repetir cada semana', type: 'select', options: opcionesRecurrente, required: true },
  { field: 'ids_presentes', header: 'Jugadores presentes', type: 'multiselect', options: opcionesJugadores },
  { field: 'ids_ausentes', header: 'Jugadores ausentes', type: 'multiselect', options: opcionesJugadores },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_categoria: null, fecha: null, id_lugar: null, recurrente: 0, ids_presentes: [], ids_ausentes: [], incidencias: '' };

function nombreCategoria(idCategoria) {
  return categorias.value.find(c => c.id === idCategoria)?.nombre || '—';
}

function nombreLugar(id) {
  return lugares.value.find(l => l.id === id)?.nombre || '—';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <div>
    <CrudDataTable
      title="Entrenamientos"
      :columns="columns"
      :service="entrenamientosService"
      :emptyItem="emptyItem"
      @changed="onTablaChanged"
    >
      <template #cell-id_categoria="{ data }">
        {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
      </template>
      <template #cell-id_lugar="{ data }">
        {{ data.lugar?.nombre || nombreLugar(data.id_lugar) }}
      </template>
      <template #cell-fecha="{ data }">
        {{ formatearFecha(data.fecha) }}
      </template>
      <template #cell-recurrente="{ data }">
        {{ data.recurrente ? 'Sí' : 'No' }}
      </template>
    </CrudDataTable>

    <EventosCalendario
      ref="calendario"
      tipo="entrenamiento"
      title="Calendario de entrenamientos"
      subtitle="Todos los entrenamientos registrados. Solo lectura."
    />
  </div>
</template>