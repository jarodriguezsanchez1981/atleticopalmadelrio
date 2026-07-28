<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import { entrenamientosService, categoriasService, lugaresService } from '../../services';
import Select from 'primevue/select';
import Button from 'primevue/button';

const categorias = ref([]);
const lugares = ref([]);
const tabla = ref();
const calendario = ref();

const filtroCategoria = ref(null);
const filtroLugar = ref(null);

onMounted(async () => {
  const [cats, lugs] = await Promise.all([
    categoriasService.listar(),
    lugaresService.listar()
  ]);
  categorias.value = cats;
  lugares.value = lugs;
});

const opcionesCategoria = computed(() =>
  categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id }))
);

const opcionesLugar = computed(() =>
  lugares.value.map(l => ({ label: l.nombre, value: l.id }))
);

const servicioFiltrado = {
  ...entrenamientosService,
  listar: () => entrenamientosService.listar({
    id_categoria: filtroCategoria.value || undefined,
    id_lugar: filtroLugar.value || undefined
  })
};

function aplicarFiltros() {
  tabla.value?.cargar();
  calendario.value?.refrescar();
}

function limpiarFiltros() {
  filtroCategoria.value = null;
  filtroLugar.value = null;
  aplicarFiltros();
}

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
    <div class="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-slate-500">Categoría</label>
        <Select v-model="filtroCategoria" :options="opcionesCategoria" optionLabel="label" optionValue="value"
                showClear placeholder="Todas" class="w-56" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-slate-500">Lugar</label>
        <Select v-model="filtroLugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                showClear placeholder="Todos" class="w-56" />
      </div>
      <Button label="Filtrar" icon="pi pi-filter" @click="aplicarFiltros"
              class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      <Button label="Limpiar" icon="pi pi-times" text @click="limpiarFiltros" />
    </div>

    <CrudDataTable
      ref="tabla"
      title="Entrenamientos"
      :columns="columns"
      :service="servicioFiltrado"
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
      :id-categoria="filtroCategoria"
      title="Calendario de entrenamientos"
      subtitle="Todos los entrenamientos registrados. Solo lectura."
    />
  </div>
</template>
