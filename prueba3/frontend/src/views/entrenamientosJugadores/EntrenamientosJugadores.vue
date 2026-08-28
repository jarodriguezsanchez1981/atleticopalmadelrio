<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { entrenamientosJugadoresService, entrenamientosService, jugadoresService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';
import { formatFecha } from '../../utils/formatFecha';

const entrenamientos = ref([]);
const jugadores = ref([]);

async function cargarOpciones() {
  const [ets, jugs] = await Promise.all([
    entrenamientosService.listar(),
    jugadoresService.listar()
  ]);
  entrenamientos.value = ets;
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

const opcionesEntrenamiento = computed(() =>
  entrenamientos.value.map(e => {
    const d = new Date(e.fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return {
      label: `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss} · ${e.categoria?.nombre || ''}`,
      value: e.id
    };
  }).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesJugador = computed(() =>
  jugadores.value.map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesAsistencia = [
  { label: 'Presente', value: true },
  { label: 'Ausente', value: false }
];

const columns = computed(() => [
  { field: 'id_entrenamiento', header: 'Entrenamiento', type: 'select', options: opcionesEntrenamiento.value, required: true },
  { field: 'id_jugador', header: 'Jugador', type: 'select', options: opcionesJugador.value, required: true },
  { field: 'asistencia', header: 'Asistencia', type: 'select', options: opcionesAsistencia, required: true },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea' }
]);

const emptyItem = { id_entrenamiento: null, id_jugador: null, asistencia: true, incidencias: '' };

function nombreEntrenamiento(id) {
  const e = entrenamientos.value.find(x => x.id === id);
  if (!e) return '—';
  const d = new Date(e.fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss} · ${e.categoria?.nombre || ''}`;
}

function nombreJugador(id) {
  const j = jugadores.value.find(x => x.id === id);
  return j ? `${j.apellidos}, ${j.nombre}` : '—';
}
</script>

<template>
  <CrudDataTable
    title="Entrenamientos Jugadores"
    :columns="columns"
    :service="entrenamientosJugadoresService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_entrenamiento="{ data }">
      {{ data.entrenamiento ? nombreEntrenamiento(data.entrenamiento.id) : nombreEntrenamiento(data.id_entrenamiento) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.apellidos}, ${data.jugador.nombre}` : nombreJugador(data.id_jugador) }}
    </template>
    <template #cell-asistencia="{ data }">
      <span :class="data.asistencia ? 'text-club-green' : 'text-red-500'">
        {{ data.asistencia ? 'Presente' : 'Ausente' }}
      </span>
    </template>
    <template #detail-id_entrenamiento="{ data }">
      {{ data.entrenamiento?.categoria?.nombre ? `${formatFecha(data.entrenamiento.fecha)} · ${data.entrenamiento.categoria.nombre}` : nombreEntrenamiento(data.id_entrenamiento) }}
    </template>
  </CrudDataTable>
</template>