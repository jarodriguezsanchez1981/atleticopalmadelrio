<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { partidosJugadoresService, partidosService, jugadoresService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const partidos = ref([]);
const jugadores = ref([]);

async function cargarOpciones() {
  const [pts, jugs] = await Promise.all([
    partidosService.listar(),
    jugadoresService.listar()
  ]);
  partidos.value = pts;
  jugadores.value = jugs;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

let unsubCambio = null;

const opcionesPartido = computed(() =>
  partidos.value
    .map(p => ({
      label: `${new Date(p.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} vs ${p.equipo?.nombre || ''}`,
      value: p.id
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesJugador = computed(() =>
  jugadores.value.map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_partido', header: 'Partido', type: 'select', options: opcionesPartido.value, required: true },
  { field: 'id_jugador', header: 'Jugador', type: 'select', options: opcionesJugador.value, required: true },
  { field: 'minutos', header: 'Minutos', type: 'number' },
  { field: 'goles', header: 'Goles', type: 'number' },
  { field: 'tarjeta_amarilla', header: 'Tarjeta amarilla', type: 'number' },
  { field: 'tarjeta_roja', header: 'Tarjeta roja', type: 'number' },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = {
  id_partido: null, id_jugador: null,
  minutos: 0, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0,
  incidencias: ''
};

function nombrePartido(id) {
  const p = partidos.value.find(x => x.id === id);
  if (!p) return '—';
  return `${new Date(p.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} vs ${p.equipo?.nombre || ''}`;
}

function nombreJugador(id) {
  const j = jugadores.value.find(x => x.id === id);
  return j ? `${j.apellidos}, ${j.nombre}` : '—';
}
</script>

<template>
  <CrudDataTable
    title="Convocatorias"
    :columns="columns"
    :service="partidosJugadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_partido="{ data }">
      {{ data.partido ? nombrePartido(data.partido.id) : nombrePartido(data.id_partido) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.apellidos}, ${data.jugador.nombre}` : nombreJugador(data.id_jugador) }}
    </template>
    <template #detail-id_partido="{ data }">
      {{ data.partido?.equipo?.nombre ? `${new Date(data.partido.fecha).toLocaleString('es-ES')} vs ${data.partido.equipo.nombre}` : nombrePartido(data.id_partido) }}
    </template>
  </CrudDataTable>
</template>