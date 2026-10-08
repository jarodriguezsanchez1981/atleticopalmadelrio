<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import { estiloTabla } from '../../utils/estiloTabla';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';

/** Estadísticas de los jugadores en los partidos de la plantilla Senior A de
 * la temporada actual (las rellena "Finalizar Acta" en Partidos). */
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
const filas = ref([]);
const cargando = ref(false);
const error = ref('');
let unsubCambio = null;

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const [plantillas, temporadas] = await Promise.all([plantillasService.listar(), temporadasService.listar()]);
    plantilla.value = filtrarPlantillasTemporadaActual(plantillas, temporadas)
      .find((p) => p.categoria?.nombre === CATEGORIA) || null;
    filas.value = plantilla.value
      ? (await estadisticasService.listar({ id_plantilla: plantilla.value.id }))
        .map((f) => ({ ...f, jugador: `${f.nombre} ${f.apellidos}` }))
      : [];
  } catch (err) {
    filas.value = [];
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas.';
  } finally {
    cargando.value = false;
  }
}

/** 33.3 -> "33,3 %"; sin datos para calcularlo, "—". */
function formatoPorcentaje(valor) {
  return valor == null ? '—' : `${Number(valor).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

onMounted(async () => {
  await cargar();
  unsubCambio = suscribirseCambio(cargar);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});
</script>

<template>
<SectionGuard seccion="estadisticas">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">Estadísticas</h1>
      <p class="text-sm text-ink-tertiary">
        Partidos, minutos, goles y tarjetas de cada jugador en los partidos de <strong>{{ titulo }}</strong>,
        según las actas de RFAF (se rellenan al pulsar "Finalizar Acta" en cada partido). Titular / Suplente: partidos
        que ha empezado de titular / en los que ha entrado desde el banquillo; Banquillo no jugados: partidos de
        suplente sin entrar. % Goles por Partido: goles entre partidos jugados; % Goles desde Banquillo: parte de sus
        goles marcados entrando desde el banquillo. Los minutos local / visitante dependen de
        si el PALMA jugaba en casa o fuera.
      </p>
    </div>
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>
    <DataTable v-else v-bind="estiloTabla" :value="filas" :loading="cargando" dataKey="id_jugador"
               sortField="minutos" :sortOrder="-1">
      <Column field="jugador" header="Jugador" sortable />
      <Column field="partidos" header="Partidos" sortable class="text-center" />
      <Column field="titular" header="Titular" sortable class="text-center" />
      <Column field="suplente" header="Suplente" sortable class="text-center" />
      <Column field="banquillo_no_jugados" header="Banquillo no jugados" sortable class="text-center" />
      <Column field="minutos_local" header="Minutos local" sortable class="text-center" />
      <Column field="minutos_visitante" header="Minutos visitante" sortable class="text-center" />
      <Column field="minutos_titular" header="Minutos Titular" sortable class="text-center" />
      <Column field="minutos_banquillo" header="Minutos Banquillo" sortable class="text-center" />
      <Column field="minutos" header="Minutos" sortable class="text-center" />
      <Column field="goles" header="Goles" sortable class="text-center" />
      <Column field="goles_banquillo" header="Goles Banquillo" sortable class="text-center" />
      <Column field="tarjetas_amarillas" header="Tarjetas amarillas" sortable class="text-center">
        <template #body="{ data }">
          <span v-if="data.tarjetas_amarillas" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
            <span class="tarjeta tarjeta-amarilla" aria-hidden="true"></span>{{ data.tarjetas_amarillas }}
          </span>
          <span v-else class="text-ink-tertiary">0</span>
        </template>
      </Column>
      <Column field="tarjetas_rojas" header="Tarjeta roja" sortable class="text-center">
        <template #body="{ data }">
          <span v-if="data.tarjetas_rojas" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            <span class="tarjeta tarjeta-roja" aria-hidden="true"></span>{{ data.tarjetas_rojas }}
          </span>
          <span v-else class="text-ink-tertiary">0</span>
        </template>
      </Column>
      <Column field="porcentaje_goles_partido" header="% Goles por Partido" sortable class="text-center">
        <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_goles_partido) }}</template>
      </Column>
      <Column field="porcentaje_goles_banquillo" header="% Goles desde Banquillo" sortable class="text-center">
        <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_goles_banquillo) }}</template>
      </Column>
      <template #empty>
        <div class="text-center text-ink-tertiary py-4 text-sm">Todavía no hay datos: finaliza el acta de los partidos.</div>
      </template>
    </DataTable>
  </div>
</SectionGuard>
</template>
