<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { estiloTabla } from '../../utils/estiloTabla';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { sancionesService, partidosService, jugadoresService, plantillasService, temporadasService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';

const TIPO_FUTBOL_11 = 2;
const PALMA_ID = 73;

const partidos = ref([]);
const jugadores = ref([]);
const plantillas = ref([]);
const temporadas = ref([]);
const sanciones = ref([]);
// Filas desplegadas (partidos con tarjeta) de cada tabla, por plantilla.
const desplegadas = ref({});

async function cargarOpciones() {
  const [pts, jugs, pls, temps, sancs] = await Promise.all([
    partidosService.listar(),
    jugadoresService.listar({ basico: 1 }),
    plantillasService.listar({ basico: 1 }),
    temporadasService.listar(),
    sancionesService.listar()
  ]);
  partidos.value = pts;
  jugadores.value = jugs;
  plantillas.value = pls;
  temporadas.value = temps;
  sanciones.value = sancs;
}

/** Una tabla por plantilla de Fútbol 11 de la temporada actual, con las
 * tarjetas de los partidos de esa plantilla sumadas por jugador. */
const acumuladosFutbol11 = computed(() => {
  const plantillasF11 = filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value)
    .filter((p) => p.categoria?.id_tipofutbol === TIPO_FUTBOL_11)
    .sort((a, b) => Number(a.categoria?.orden ?? 999) - Number(b.categoria?.orden ?? 999)
      || (a.categoria?.nombre || '').localeCompare(b.categoria?.nombre || '', 'es'));
  const plantillaDePartido = new Map(partidos.value.map((p) => [p.id, p.id_plantilla]));

  return plantillasF11.map((plantilla) => {
    const porJugador = new Map();
    for (const s of sanciones.value) {
      const idPlantilla = s.partido?.id_plantilla ?? plantillaDePartido.get(s.id_partido);
      if (idPlantilla !== plantilla.id) continue;
      const fila = porJugador.get(s.id_jugador) || {
        id_jugador: s.id_jugador,
        jugador: s.jugador ? `${s.jugador.nombre} ${s.jugador.apellidos}` : nombreJugador(s.id_jugador),
        amarillas: 0,
        rojas: 0,
        partidos: 0,
        detalle: []
      };
      fila.amarillas += Number(s.amarilla) || 0;
      fila.rojas += Number(s.roja) || 0;
      fila.partidos += 1;
      const partido = s.partido || partidos.value.find((p) => p.id === s.id_partido) || {};
      const esLocal = Number(partido.id_equipo_local) === PALMA_ID;
      fila.detalle.push({
        id: s.id,
        fecha: partido.fecha || null,
        jornada: partido.jornada ?? null,
        rival: (esLocal ? partido.equipoVisitante?.nombre : partido.equipoLocal?.nombre) || '—',
        es_local: esLocal,
        resultado: partido.resultado || null,
        amarilla: Number(s.amarilla) || 0,
        roja: Number(s.roja) || 0,
        minutos_amarilla: s.minutos_amarilla || [],
        minutos_roja: s.minutos_roja || []
      });
      porJugador.set(s.id_jugador, fila);
    }
    for (const f of porJugador.values()) f.detalle.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
    const filas = [...porJugador.values()].sort((a, b) =>
      b.amarillas - a.amarillas || b.rojas - a.rojas || a.jugador.localeCompare(b.jugador, 'es'));
    return {
      id: plantilla.id,
      titulo: `${plantilla.categoria?.nombre || 'Plantilla'} · ${plantilla.temporada?.nombre || ''}`,
      filas,
      totalAmarillas: filas.reduce((n, f) => n + f.amarillas, 0),
      totalRojas: filas.reduce((n, f) => n + f.rojas, 0)
    };
  });
});

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
  jugadores.value.map(j => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }))
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

/** [12, 70] -> "12', 70'"; sin minutos, "—". */
function formatoMinutos(minutos) {
  return minutos?.length ? minutos.map((m) => `${m}'`).join(', ') : '—';
}

function formatoFecha(fecha) {
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nombrePartido(id) {
  const p = partidos.value.find(x => x.id === id);
  if (!p) return '—';
  return etiquetaPartido(p);
}

function nombreJugador(id) {
  const j = jugadores.value.find(x => x.id === id);
  return j ? `${j.nombre} ${j.apellidos}` : '—';
}
</script>

<template>
<SectionGuard seccion="sanciones">
  <div class="flex flex-col gap-6">
  <CrudDataTable
    title="Sanciones"
    seccion="sanciones"
    :columns="columns"
    :service="sancionesService"
    :emptyItem="emptyItem"
    sortField="amarilla"
    :sortOrder="-1"
    ocultarTabla
  >
    <template #cell-id_partido="{ data }">
      {{ data.partido ? nombrePartido(data.partido.id) : nombrePartido(data.id_partido) }}
    </template>
    <template #cell-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.nombre} ${data.jugador.apellidos}` : nombreJugador(data.id_jugador) }}
    </template>
    <template #cell-amarilla="{ data }">
      <span v-if="data.amarilla" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
        <span class="tarjeta tarjeta-amarilla" aria-hidden="true"></span>{{ data.amarilla }}
      </span>
      <span v-else class="text-ink-tertiary">0</span>
    </template>
    <template #cell-roja="{ data }">
      <span v-if="data.roja" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
        <span class="tarjeta tarjeta-roja" aria-hidden="true"></span>{{ data.roja }}
      </span>
      <span v-else class="text-ink-tertiary">0</span>
    </template>
    <template #detail-id_partido="{ data }">
      {{ data.partido ? etiquetaPartido(data.partido) : nombrePartido(data.id_partido) }}
    </template>
    <template #detail-id_jugador="{ data }">
      {{ data.jugador ? `${data.jugador.nombre} ${data.jugador.apellidos}` : nombreJugador(data.id_jugador) }}
    </template>
  </CrudDataTable>

  <section v-if="acumuladosFutbol11.length" class="flex flex-col gap-4">
    <div>
      <h2 class="font-display text-lg font-bold text-club-green">Tarjetas acumuladas · Fútbol 11</h2>
      <p class="text-sm text-ink-tertiary">Suma de tarjetas por jugador en los partidos de cada plantilla de la temporada actual.</p>
    </div>
    <!-- Como en Promociones: una tabla debajo de otra, por orden de categoría,
         todas con el mismo ancho de columnas (table-layout fijo). -->
    <div class="flex flex-col gap-4">
      <div v-for="t in acumuladosFutbol11" :key="t.id">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-semibold text-ink-primary">{{ t.titulo }}</h3>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-semibold">
              <span class="tarjeta tarjeta-amarilla" aria-hidden="true"></span>{{ t.totalAmarillas }}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
              <span class="tarjeta tarjeta-roja" aria-hidden="true"></span>{{ t.totalRojas }}
            </span>
          </div>
        </div>
        <DataTable v-bind="estiloTabla" :value="t.filas" dataKey="id_jugador" sortField="amarillas" :sortOrder="-1"
                   v-model:expandedRows="desplegadas[t.id]"
                   :tableStyle="{ tableLayout: 'fixed', minWidth: '640px' }">
          <Column expander style="width: 3rem" />
          <Column field="jugador" header="Jugador" sortable style="width: 46%" />
          <Column field="partidos" header="Partidos" sortable style="width: 18%" class="text-center" />
          <Column field="amarillas" header="Amarillas" sortable style="width: 18%">
            <template #body="{ data }">
              <span v-if="data.amarillas" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                <span class="tarjeta tarjeta-amarilla" aria-hidden="true"></span>{{ data.amarillas }}
              </span>
              <span v-else class="text-ink-tertiary">0</span>
            </template>
          </Column>
          <Column field="rojas" header="Rojas" sortable style="width: 18%">
            <template #body="{ data }">
              <span v-if="data.rojas" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                <span class="tarjeta tarjeta-roja" aria-hidden="true"></span>{{ data.rojas }}
              </span>
              <span v-else class="text-ink-tertiary">0</span>
            </template>
          </Column>
          <!-- Partidos en los que vio tarjeta, por fecha. -->
          <template #expansion="{ data }">
            <div class="overflow-x-auto py-1">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-xs text-ink-tertiary text-left">
                    <th class="font-medium p-2">Fecha</th>
                    <th class="font-medium p-2 text-center">Jornada</th>
                    <th class="font-medium p-2">Rival</th>
                    <th class="font-medium p-2 text-center">Resultado</th>
                    <th class="font-medium p-2 text-center">Amarilla</th>
                    <th class="font-medium p-2 text-center">Minuto amarilla</th>
                    <th class="font-medium p-2 text-center">Roja</th>
                    <th class="font-medium p-2 text-center">Minuto roja</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in data.detalle" :key="p.id" class="border-t border-line">
                    <td class="p-2 whitespace-nowrap tabular-nums">{{ formatoFecha(p.fecha) }}</td>
                    <td class="p-2 text-center tabular-nums">{{ p.jornada ?? '—' }}</td>
                    <td class="p-2">{{ p.es_local ? 'vs' : '@' }} {{ p.rival }}</td>
                    <td class="p-2 text-center tabular-nums whitespace-nowrap">{{ p.resultado || '—' }}</td>
                    <td class="p-2 text-center">
                      <span v-if="p.amarilla" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                        <span class="tarjeta tarjeta-amarilla" aria-hidden="true"></span>{{ p.amarilla }}
                      </span>
                      <span v-else class="text-ink-tertiary">0</span>
                    </td>
                    <td class="p-2 text-center tabular-nums whitespace-nowrap">{{ p.amarilla ? formatoMinutos(p.minutos_amarilla) : '' }}</td>
                    <td class="p-2 text-center">
                      <span v-if="p.roja" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                        <span class="tarjeta tarjeta-roja" aria-hidden="true"></span>{{ p.roja }}
                      </span>
                      <span v-else class="text-ink-tertiary">0</span>
                    </td>
                    <td class="p-2 text-center tabular-nums whitespace-nowrap">{{ p.roja ? formatoMinutos(p.minutos_roja) : '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template #empty>
            <div class="text-center text-ink-tertiary py-3 text-sm">Sin tarjetas en esta plantilla.</div>
          </template>
        </DataTable>
      </div>
    </div>
  </section>
  </div>
</SectionGuard>
</template>
