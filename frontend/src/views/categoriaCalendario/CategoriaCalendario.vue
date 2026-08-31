<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { categoriaCalendarioService, plantillasService, equiposService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const plantillas = ref([]);
const equipos = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  const [plants, eqs] = await Promise.all([
    plantillasService.listar(),
    equiposService.listar()
  ]);
  plantillas.value = plants;
  equipos.value = eqs;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const opcionesPlantilla = computed(() =>
  plantillas.value.map(p => ({
    label: `${p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_plantilla', header: 'Plantilla', type: 'select', options: opcionesPlantilla.value, required: true },
  { field: 'id_equipo_local', header: 'Equipo Local', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'id_equipo_visitante', header: 'Equipo Visitante', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'jornada', header: 'Jornada', type: 'number', required: true },
  { field: 'fecha', header: 'Fecha', type: 'date', required: true },
  { field: 'hora', header: 'Hora', type: 'text', required: false }
]);

const emptyItem = { id_plantilla: null, id_equipo_local: null, id_equipo_visitante: null, jornada: null, fecha: null, hora: null };

function nombrePlantilla(id) {
  const p = plantillas.value.find(pl => pl.id === id);
  return p ? `${p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}` : '—';
}

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function formatDate(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
</script>

<template>
  <CrudDataTable
    title="Jornadas"
    :columns="columns"
    :service="categoriaCalendarioService"
    :emptyItem="emptyItem"
    :canExport="true"
  >
    <template #cell-id_plantilla="{ data }">
      {{ data.plantilla ? (data.plantilla.categoria?.nombre + ' / ' + data.plantilla.temporada?.nombre) : nombrePlantilla(data.id_plantilla) }}
    </template>
    <template #cell-id_equipo_local="{ data }">
      {{ data.equipoLocal?.nombre || nombreEquipo(data.id_equipo_local) }}
    </template>
    <template #cell-id_equipo_visitante="{ data }">
      {{ data.equipoVisitante?.nombre || nombreEquipo(data.id_equipo_visitante) }}
    </template>
    <template #cell-fecha="{ data }">
      {{ formatDate(data.fecha) }}
    </template>
    <template #detail-id_plantilla="{ data }">
      {{ data.plantilla ? (data.plantilla.categoria?.nombre + ' / ' + data.plantilla.temporada?.nombre) : nombrePlantilla(data.id_plantilla) }}
    </template>
    <template #detail-id_equipo_local="{ data }">
      {{ data.equipoLocal?.nombre || nombreEquipo(data.id_equipo_local) }}
    </template>
    <template #detail-id_equipo_visitante="{ data }">
      {{ data.equipoVisitante?.nombre || nombreEquipo(data.id_equipo_visitante) }}
    </template>
    <template #detail-fecha="{ data }">
      {{ formatDate(data.fecha) }}
    </template>
  </CrudDataTable>
</template>
