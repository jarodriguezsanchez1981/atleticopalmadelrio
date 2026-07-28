<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { partidosService, categoriasService } from '../../services';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';

const categorias = ref([]);
const tabla = ref();

const filtroTemporada = ref(null);
const filtroCategoria = ref(null);
const filtroRival = ref('');

onMounted(async () => {
  categorias.value = await categoriasService.listar();
});

const opcionesTemporada = computed(() => {
  const unicas = [...new Set(categorias.value.map(c => c.temporada))];
  return unicas.map(t => ({ label: t, value: t }));
});

const opcionesCategoria = computed(() =>
  categorias.value
    .filter(c => !filtroTemporada.value || c.temporada === filtroTemporada.value)
    .map(c => ({ label: `${c.nombre} (${c.temporada})`, value: c.id }))
);

// Servicio "envuelto": listar() aplica los filtros activos.
// El componente genérico solo necesita listar/crear/actualizar/eliminar.
const servicioFiltrado = {
  ...partidosService,
  listar: () => partidosService.listar({
    temporada: filtroTemporada.value || undefined,
    id_categoria: filtroCategoria.value || undefined,
    equipo_rival: filtroRival.value || undefined
  })
};

function aplicarFiltros() {
  tabla.value?.cargar();
}

function limpiarFiltros() {
  filtroTemporada.value = null;
  filtroCategoria.value = null;
  filtroRival.value = '';
  aplicarFiltros();
}

const columns = computed(() => [
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: categorias.value.map(c => ({ label: `${c.nombre} (${c.temporada})`, value: c.id })), required: true },
  { field: 'fecha', header: 'Fecha y hora', type: 'date', required: true },
  { field: 'lugar', header: 'Lugar', type: 'text', required: true },
  { field: 'equipo_rival', header: 'Equipo rival', type: 'text', required: true },
  { field: 'resultado', header: 'Resultado', type: 'text' },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_categoria: null, fecha: null, lugar: '', equipo_rival: '', resultado: '', incidencias: '' };

function nombreCategoria(idCategoria) {
  return categorias.value.find(c => c.id === idCategoria)?.nombre || '—';
}
function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <div>
    <!-- Barra de filtros: Temporada / Categoría / Equipo Rival -->
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
    >
      <template #cell-id_categoria="{ data }">
        {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
      </template>
      <template #cell-fecha="{ data }">
        {{ formatearFecha(data.fecha) }}
      </template>
    </CrudDataTable>
  </div>
</template>
