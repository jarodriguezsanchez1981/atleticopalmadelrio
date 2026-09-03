<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { sancionesService, partidosService, jugadoresService } from '../../services';
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
      label: etiquetaPartido(p),
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
  { field: 'amarilla', header: 'Tarjetas amarillas', type: 'number', min: 0, max: 5 },
  { field: 'roja', header: 'Tarjetas rojas', type: 'number', min: 0, max: 3 }
]);

const emptyItem = {
  id_partido: null, id_jugador: null,
  amarilla: 0, roja: 0
};

function etiquetaPartido(p) {
  let fecha = '—';
  if (p.fecha) {
    const d = new Date(p.fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    fecha = `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }
  const local = p.equipoLocal?.nombre || '';
  const visitante = p.equipoVisitante?.nombre || '';
  return `${fecha} · ${local} vs ${visitante}`;
}

function nombrePartido(id) {
  const p = partidos.value.find(x => x.id === id);
  if (!p) return '—';
  return etiquetaPartido(p);
}

function nombreJugador(id) {
  const j = jugadores.value.find(x => x.id === id);
  return j ? `${j.apellidos}, ${j.nombre}` : '—';
}
</script>

<template>
<SectionGuard seccion="sanciones">
  <CrudDataTable
    title="Sanciones"
    seccion="sanciones"
    :columns="columns"
    :service="sancionesService"
    :emptyItem="emptyItem"
  >
    <template #cell-id_partido="{ data }">
      {{ data.partido ? nombrePartido(data.partido.id) : nombrePartido(data.id_partido) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.apellidos}, ${data.jugador.nombre}` : nombreJugador(data.id_jugador) }}
    </template>
    <template #cell-amarilla="{ data }">
      <span v-if="data.amarilla" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
        <i class="pi pi-circle-fill text-[8px]"></i>{{ data.amarilla }}
      </span>
      <span v-else class="text-ink-tertiary">0</span>
    </template>
    <template #cell-roja="{ data }">
      <span v-if="data.roja" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
        <i class="pi pi-circle-fill text-[8px]"></i>{{ data.roja }}
      </span>
      <span v-else class="text-ink-tertiary">0</span>
    </template>
    <template #detail-id_partido="{ data }">
      {{ data.partido ? etiquetaPartido(data.partido) : nombrePartido(data.id_partido) }}
    </template>
    <template #detail-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.apellidos}, ${data.jugador.nombre}` : nombreJugador(data.id_jugador) }}
    </template>
  </CrudDataTable>
</SectionGuard>
</template>