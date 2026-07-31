<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import EventosCalendario from '../../components/EventosCalendario.vue';
import { partidosService, categoriasService, temporadasService, lugaresService } from '../../services';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';

const categorias = ref([]);
const temporadas = ref([]);
const lugares = ref([]);
const tabla = ref();
const calendario = ref();

const filtroTemporada = ref(null);
const filtroCategoria = ref(null);
const filtroLugar = ref(null);
const filtroRival = ref('');

onMounted(async () => {
  const [cats, temps, lugs] = await Promise.all([
    categoriasService.listar(),
    temporadasService.listar(),
    lugaresService.listar()
  ]);
  categorias.value = cats;
  temporadas.value = temps;
  lugares.value = lugs;
});

const opcionesTemporada = computed(() =>
  temporadas.value.map(t => ({ label: t.nombre, value: t.id }))
);

const opcionesCategoria = computed(() =>
  categorias.value
    .filter(c => !filtroTemporada.value || c.id_temporada === filtroTemporada.value)
    .map(c => ({
      label: `${c.nombre} (${c.temporada?.nombre || ''})`,
      value: c.id
    }))
);

const opcionesLugar = computed(() =>
  lugares.value.map(l => ({ label: l.nombre, value: l.id }))
);

const servicioFiltrado = {
  ...partidosService,
  listar: () => partidosService.listar({
    id_temporada: filtroTemporada.value || undefined,
    id_categoria: filtroCategoria.value || undefined,
    id_lugar: filtroLugar.value || undefined,
    equipo_rival: filtroRival.value || undefined
  })
};

function aplicarFiltros() {
  tabla.value?.cargar();
  calendario.value?.refrescar();
}

function limpiarFiltros() {
  filtroTemporada.value = null;
  filtroCategoria.value = null;
  filtroLugar.value = null;
  filtroRival.value = '';
  aplicarFiltros();
}

function onTablaChanged() {
  calendario.value?.refrescar();
}

const columns = computed(() => [
  {
    field: 'id_categoria',
    header: 'Categoría',
    type: 'select',
    options: categorias.value.map(c => ({
      label: `${c.nombre} (${c.temporada?.nombre || ''})`,
      value: c.id
    })),
    required: true
  },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true },
  { field: 'id_lugar', header: 'Lugar', type: 'select', options: opcionesLugar.value, required: true },
  { field: 'equipo_rival', header: 'Equipo rival', type: 'text', required: true },
  {
    field: 'ubicacion',
    header: 'Ubicación',
    type: 'select',
    options: [
      { label: 'Local', value: 'local' },
      { label: 'Visitante', value: 'visitante' }
    ],
    required: true
  },
  { field: 'resultado', header: 'Resultado', type: 'text' },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_categoria: null, fecha: null, id_lugar: null, equipo_rival: '', ubicacion: 'local', resultado: '', incidencias: '' };

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
        <label class="text-xs font-medium text-slate-500">Temporada</label>
        <Select v-model="filtroTemporada" :options="opcionesTemporada" optionLabel="label" optionValue="value"
                showClear placeholder="Todas" class="w-44" />
      </div>
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
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-slate-500">Equipo rival</label>
        <InputText v-model="filtroRival" placeholder="Buscar rival..." class="w-56" />
      </div>
      <Button label="Filtrar" icon="pi pi-filter" @click="aplicarFiltros"
              class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      <Button label="Limpiar" icon="pi pi-times" text @click="limpiarFiltros" />
    </div>

    <CrudDataTable
      ref="tabla"
      title="Partidos"
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
      <template #cell-ubicacion="{ data }">
        {{ data.ubicacion === 'visitante' ? 'Visitante' : 'Local' }}
      </template>
      <template #cell-fecha="{ data }">
        {{ formatearFecha(data.fecha) }}
      </template>
    </CrudDataTable>

    <EventosCalendario
      ref="calendario"
      tipo="partido"
      :id-categoria="filtroCategoria"
      title="Calendario de partidos"
      subtitle="Todos los partidos registrados. Solo lectura."
    />
  </div>
</template>
