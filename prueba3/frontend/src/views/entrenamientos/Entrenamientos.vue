<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import { entrenamientosService, categoriasService, lugaresService } from '../../services';

const categorias = ref([]);
const lugares = ref([]);
const calendario = ref();

onMounted(async () => {
  const [cats, lugs] = await Promise.all([
    categoriasService.listar(),
    lugaresService.listar()
  ]);
  categorias.value = cats;
  lugares.value = lugs;
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesLugar = computed(() =>
  lugares.value.map(l => ({ label: l.nombre, value: l.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

function onTablaChanged() {
  calendario.value?.refrescar();
}

const columns = computed(() => [
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoria.value, required: true },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true },
  { field: 'id_lugar', header: 'Lugar', type: 'select', options: opcionesLugar.value, required: true },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_categoria: null, fecha: null, id_lugar: null, incidencias: '' };

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
    </CrudDataTable>

    <EventosCalendario
      ref="calendario"
      tipo="entrenamiento"
      title="Calendario de entrenamientos"
      subtitle="Todos los entrenamientos registrados. Solo lectura."
    />
  </div>
</template>