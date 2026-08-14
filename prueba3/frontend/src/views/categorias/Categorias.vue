<script setup>
import { ref, onMounted, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { categoriasService, entrenadoresService, temporadasService, delegadosService, divisionesService, tiposFutbolService } from '../../services';

const entrenadores = ref([]);
const temporadas = ref([]);
const delegados = ref([]);
const divisiones = ref([]);
const tiposFutbol = ref([]);

onMounted(async () => {
  const [ents, temps, dels, divs, tfs] = await Promise.all([
    entrenadoresService.listar(),
    temporadasService.listar(),
    delegadosService.listar(),
    divisionesService.listar(),
    tiposFutbolService.listar()
  ]);
  entrenadores.value = ents;
  temporadas.value = temps;
  delegados.value = dels;
  divisiones.value = divs;
  tiposFutbol.value = tfs;
});

const opcionesTipoFutbol = computed(() =>
  tiposFutbol.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesTemporada = computed(() =>
  temporadas.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesDivision = computed(() =>
  divisiones.value.map(d => ({ label: d.nombre, value: d.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEntrenador = computed(() =>
  entrenadores.value.map(e => ({
    label: `${e.nombre} ${e.apellidos}`,
    value: e.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesDelegado = computed(() =>
  delegados.value.map(d => ({
    label: `${d.nombre} ${d.apellidos}`,
    value: d.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'alias', header: 'Alias', type: 'text', required: false },
  { field: 'id_tipofutbol', header: 'Tipo de fútbol', type: 'select', options: opcionesTipoFutbol.value, required: true },
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'id_division', header: 'División', type: 'select', options: opcionesDivision.value, required: false },
  { field: 'ids_entrenadores', header: 'Entrenadores', type: 'multiselect', relation: 'entrenadores', options: opcionesEntrenador.value, required: false },
  { field: 'id_delegado', header: 'Delegado', type: 'select', options: opcionesDelegado.value, required: false }
]);

const emptyItem = { nombre: '', alias: '', id_tipofutbol: null, id_temporada: null, id_division: null, ids_entrenadores: [], id_delegado: null };

function nombreTipoFutbol(id) {
  return tiposFutbol.value.find(t => t.id === id)?.nombre || '—';
}

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
}

function nombreDivision(id) {
  return divisiones.value.find(d => d.id === id)?.nombre || '—';
}

function nombresEntrenadores(data) {
  if (data.entrenadores?.length) return data.entrenadores.map(e => `${e.nombre} ${e.apellidos}`).join(', ');
  const ids = data.ids_entrenadores || [];
  return ids.map(id => opcionesEntrenador.value.find(o => o.value === id)?.label || id).join(', ') || '—';
}

function nombreDelegado(id) {
  const d = delegados.value.find(x => x.id === id);
  return d ? `${d.nombre} ${d.apellidos}` : '—';
}
</script>

<template>
  <CrudDataTable
    title="Categorías"
    :columns="columns"
    :service="categoriasService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_temporada="{ data }">
      {{ data.temporada?.nombre || nombreTemporada(data.id_temporada) }}
    </template>
    <template #cell-id_tipofutbol="{ data }">
      {{ data.tipofutbol?.nombre || nombreTipoFutbol(data.id_tipofutbol) }}
    </template>
    <template #cell-id_division="{ data }">
      {{ data.division?.nombre || nombreDivision(data.id_division) }}
    </template>
    <template #cell-ids_entrenadores="{ data }">
      {{ nombresEntrenadores(data) }}
    </template>
    <template #detail-ids_entrenadores="{ data }">
      {{ nombresEntrenadores(data) }}
    </template>
    <template #cell-id_delegado="{ data }">
      {{ data.delegado ? `${data.delegado.nombre} ${data.delegado.apellidos}` : nombreDelegado(data.id_delegado) }}
    </template>
  </CrudDataTable>
</template>
