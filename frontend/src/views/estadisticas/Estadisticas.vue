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

// Estadísticas Sanciones: solo los que tienen alguna tarjeta.
const filasSanciones = computed(() => filas.value.filter((f) => f.tarjetas_amarillas > 0 || f.tarjetas_rojas > 0));
// Estadísticas Goles: solo los que han marcado.
const filasGoles = computed(() => filas.value.filter((f) => f.goles > 0));

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
        según las actas de RFAF (se rellenan al pulsar "Finalizar Acta" en cada partido).
      </p>
    </div>
    <div v-if="!error && (cargando || plantilla)">
      <h2 class="font-display text-lg text-club-green">Estadísticas Tiempo</h2>
      <p class="text-sm text-ink-tertiary">
        Minutos jugados por cada jugador. Los minutos local / visitante dependen de si el PALMA jugaba en casa o fuera,
        y su porcentaje es la parte del total de minutos del jugador.
      </p>
    </div>
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>
    <DataTable v-else v-bind="estiloTabla" class="ar-dt-cabecera-multilinea" :value="filas" :loading="cargando" dataKey="id_jugador"
               sortField="minutos" :sortOrder="-1">
      <Column field="jugador" header="Jugador" sortable />
      <Column field="partidos" header="Partidos" sortable class="text-center" />
      <Column field="minutos_local" header="Minutos&#10;local" sortable class="text-center" />
      <Column field="minutos_visitante" header="Minutos&#10;visitante" sortable class="text-center" />
      <Column field="porcentaje_minutos_local" header="Porcentaje&#10;Minutos local" sortable class="text-center">
        <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_minutos_local) }}</template>
      </Column>
      <Column field="porcentaje_minutos_visitante" header="Porcentaje&#10;Minutos Visitante" sortable class="text-center">
        <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_minutos_visitante) }}</template>
      </Column>
      <Column field="minutos_titular" header="Minutos&#10;Titular" sortable class="text-center" />
      <Column field="minutos_banquillo" header="Minutos&#10;Banquillo" sortable class="text-center" />
      <Column field="minutos" header="Total&#10;Minutos" sortable class="text-center" />
      <template #empty>
        <div class="text-center text-ink-tertiary py-4 text-sm">Todavía no hay datos: finaliza el acta de los partidos.</div>
      </template>
    </DataTable>

    <template v-if="plantilla && !error">
      <div class="mt-2">
        <h2 class="font-display text-lg text-club-green">Estadísticas Sanciones</h2>
        <p class="text-sm text-ink-tertiary">
          Tarjetas de cada jugador por parte del partido (1ª parte hasta el minuto 45) y según iba el marcador en ese
          momento; con empate no cuentan como ganando ni perdiendo.
        </p>
      </div>
      <DataTable v-bind="estiloTabla" class="ar-dt-cabecera-multilinea" :value="filasSanciones" :loading="cargando"
                 dataKey="id_jugador" sortField="tarjetas_amarillas" :sortOrder="-1">
        <Column field="jugador" header="Jugador" sortable />
        <Column field="partidos" header="Total&#10;Partidos" sortable class="text-center" />
        <Column field="tarjetas_amarillas" header="Total Tarjetas&#10;Amarillas" sortable class="text-center" />
        <Column field="tarjetas_rojas" header="Total Tarjetas&#10;Rojas" sortable class="text-center" />
        <Column field="amarillas_primera" header="Amarillas&#10;1ª Parte" sortable class="text-center" />
        <Column field="amarillas_segunda" header="Amarillas&#10;2ª Parte" sortable class="text-center" />
        <Column field="amarillas_ganando" header="Amarillas&#10;mientras ganaba" sortable class="text-center" />
        <Column field="amarillas_perdiendo" header="Amarillas&#10;mientras perdía" sortable class="text-center" />
        <Column field="rojas_primera" header="Rojas&#10;1ª Parte" sortable class="text-center" />
        <Column field="rojas_segunda" header="Rojas&#10;2ª Parte" sortable class="text-center" />
        <Column field="rojas_ganando" header="Rojas&#10;mientras ganaba" sortable class="text-center" />
        <Column field="rojas_perdiendo" header="Rojas&#10;mientras perdía" sortable class="text-center" />
        <template #empty>
          <div class="text-center text-ink-tertiary py-4 text-sm">Todavía no hay datos: finaliza el acta de los partidos.</div>
        </template>
      </DataTable>

      <div class="mt-2">
        <h2 class="font-display text-lg text-club-green">Estadísticas Convocatorias</h2>
        <p class="text-sm text-ink-tertiary">
          Partidos en los que el jugador está en el acta, y cómo: de titular, de suplente entrando a jugar o de suplente
          sin jugar, en total y según el PALMA jugara en casa (local) o fuera (visitante).
        </p>
      </div>
      <DataTable v-bind="estiloTabla" class="ar-dt-cabecera-multilinea" :value="filas" :loading="cargando"
                 dataKey="id_jugador" sortField="convocatorias" :sortOrder="-1">
        <Column field="jugador" header="Jugador" sortable />
        <Column field="convocatorias" header="Convocatorias" sortable class="text-center" />
        <Column field="titular" header="Titular" sortable class="text-center" />
        <Column field="suplente" header="Suplente" sortable class="text-center" />
        <Column field="banquillo_no_jugados" header="Suplente&#10;No jugado" sortable class="text-center" />
        <Column field="titular_local" header="Titular&#10;Local" sortable class="text-center" />
        <Column field="suplente_local" header="Suplente&#10;Local" sortable class="text-center" />
        <Column field="banquillo_no_jugados_local" header="Suplente no&#10;jugado Local" sortable class="text-center" />
        <Column field="titular_visitante" header="Titular&#10;Visitante" sortable class="text-center" />
        <Column field="suplente_visitante" header="Suplente&#10;Visitante" sortable class="text-center" />
        <Column field="banquillo_no_jugados_visitante" header="Suplente no&#10;jugado Visitante" sortable class="text-center" />
        <template #empty>
          <div class="text-center text-ink-tertiary py-4 text-sm">Todavía no hay datos: finaliza el acta de los partidos.</div>
        </template>
      </DataTable>

      <div class="mt-2">
        <h2 class="font-display text-lg text-club-green">Estadísticas Goles</h2>
        <p class="text-sm text-ink-tertiary">
          Goles de cada jugador en casa y fuera, por parte del partido (1ª parte hasta el minuto 45) y según saliera de
          titular o desde el banquillo. El porcentaje local / visitante es la parte del total de goles del jugador. Los goles en
          propia puerta no cuentan.
        </p>
      </div>
      <DataTable v-bind="estiloTabla" class="ar-dt-cabecera-multilinea" :value="filasGoles" :loading="cargando"
                 dataKey="id_jugador" sortField="goles" :sortOrder="-1">
        <Column field="jugador" header="Jugador" sortable />
        <Column field="partidos" header="Total&#10;Partidos" sortable class="text-center" />
        <Column field="goles" header="Total&#10;Goles" sortable class="text-center" />
        <Column field="goles_local" header="Goles&#10;Local" sortable class="text-center" />
        <Column field="goles_visitante" header="Goles&#10;Visitante" sortable class="text-center" />
        <Column field="porcentaje_goles_local" header="Porcentaje&#10;Goles Local" sortable class="text-center">
          <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_goles_local) }}</template>
        </Column>
        <Column field="porcentaje_goles_visitante" header="Porcentaje&#10;Goles Visitante" sortable class="text-center">
          <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_goles_visitante) }}</template>
        </Column>
        <Column field="goles_primera" header="Goles&#10;1ª Parte" sortable class="text-center" />
        <Column field="goles_segunda" header="Goles&#10;2ª Parte" sortable class="text-center" />
        <Column field="goles_titular" header="Goles&#10;Titular" sortable class="text-center" />
        <Column field="goles_banquillo" header="Goles&#10;Banquillo" sortable class="text-center" />
        <Column field="porcentaje_goles_partido" header="% Goles&#10;por partido" sortable class="text-center">
          <template #body="{ data }">{{ formatoPorcentaje(data.porcentaje_goles_partido) }}</template>
        </Column>
        <template #empty>
          <div class="text-center text-ink-tertiary py-4 text-sm">Todavía no hay datos: finaliza el acta de los partidos.</div>
        </template>
      </DataTable>
    </template>
  </div>
</SectionGuard>
</template>
