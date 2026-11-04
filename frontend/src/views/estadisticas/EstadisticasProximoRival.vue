<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Select from 'primevue/select';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import TablaEstadistica from '../../components/TablaEstadistica.vue';
import PestanasLado from '../../components/PestanasLado.vue';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';
import { nombreJugadorActa } from '../../utils/nombreActa';
import {
  METRICAS_GOLES, METRICAS_GOLES_RIVALES, METRICAS_TIEMPO, METRICAS_SANCIONES, METRICAS_CONVOCATORIAS,
  duracionJuego, etiquetasTramos, leyendaMetricas, esFutbol7
} from '../../utils/estadisticasMetricas';

/** Próximo Rival: el siguiente partido de liga de la plantilla y, del rival,
 * sus goles, minutos y tarjetas (equipo y jugadores) en todos sus partidos de
 * la liga, según las actas de RFAF ya copiadas. Local / Visitante: el rival en
 * casa / fuera. En Estadísticas Senior A es siempre la de Senior A; en
 * Estadísticas (`porCategoria`), la categoría del entrenador o la que elija el
 * coordinador. Fuera de Senior A las actas no dicen bien quién fue titular ni
 * los minutos (como en las demás Estadísticas por categoría): sin Tiempo ni
 * columnas de titular / suplente, y "Conv." en lugar de partidos jugados.
 * Sanciones, solo en Fútbol 11. */
const props = defineProps({
  porCategoria: { type: Boolean, default: false }
});
const SECCION = props.porCategoria ? 'estadisticas_cat_proximo_rival' : 'estadisticas_proximo_rival';
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
// Estadísticas por categoría: plantillas disponibles (las del entrenador, o todas).
const plantillas = ref([]);
const idPlantilla = ref(null);
const opcionesPlantillas = computed(() => plantillas.value
  .map((p) => ({ value: p.id, label: `${p.categoria?.nombre || 'Sin categoría'} / ${p.temporada?.nombre || ''}` })));
const partido = ref(null);
const equipo = ref(null);
const jugadores = ref([]);
const jornadas = ref([]);
const actasPendientes = ref(0);
const cargando = ref(false);
const error = ref('');
let unsubCambio = null;

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    if (props.porCategoria) {
      // Las demás categorías: Senior A tiene su propio apartado.
      plantillas.value = (await estadisticasService.plantillas()).filter((p) => p.categoria?.nombre !== CATEGORIA);
      if (!plantillas.value.some((p) => p.id === idPlantilla.value)) idPlantilla.value = plantillas.value[0]?.id ?? null;
      plantilla.value = plantillas.value.find((p) => p.id === idPlantilla.value) || null;
    } else {
      const [lista, temporadas] = await Promise.all([plantillasService.listar({ basico: 1 }), temporadasService.listar()]);
      plantilla.value = filtrarPlantillasTemporadaActual(lista, temporadas)
        .find((p) => p.categoria?.nombre === CATEGORIA) || null;
    }
    const datos = plantilla.value
      ? await estadisticasService.proximoRival({ id_plantilla: plantilla.value.id })
      : {};
    partido.value = datos.partido || null;
    // Diferencia de goles (GF - GC) en Total, Local y Visitante, como en Rivales.
    equipo.value = datos.equipo ? { ...datos.equipo } : null;
    if (equipo.value) {
      for (const sufijo of ['', '_local', '_visitante']) {
        equipo.value[`diferencia${sufijo}`] = (equipo.value[`goles_favor${sufijo}`] || 0) - (equipo.value[`goles_contra${sufijo}`] || 0);
      }
    }
    jugadores.value = (datos.jugadores || []).map((j) => ({ ...j, id_jugador: j.nombre, jugador: nombreJugadorActa(j.nombre) }));
    jornadas.value = datos.jornadas || [];
    actasPendientes.value = datos.actas_pendientes || 0;
  } catch (err) {
    partido.value = null;
    equipo.value = null;
    jugadores.value = [];
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas del próximo rival.';
  } finally {
    cargando.value = false;
  }
}

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

/** Fecha del partido (guardada en hora de España, leída como UTC). */
function textoFecha(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  const dia = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const hora = d.getUTCHours() || d.getUTCMinutes()
    ? ` a las ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    : '';
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}${hora}`;
}

const esSeniorA = computed(() => plantilla.value?.categoria?.nombre === CATEGORIA);
// Fuera de Senior A: sin titular / suplente ni % por partido jugado, y Conv.
// (está en el acta) en lugar de Partidos (con minutos).
const CAMPOS_SOLO_SENIOR = new Set([
  'titular', 'goles_titular', 'porcentaje_goles_titular', 'goles_banquillo', 'porcentaje_goles_banquillo',
  'porcentaje_goles_partido', 'amarillas_titular', 'amarillas_suplente', 'rojas_titular', 'rojas_suplente'
]);
const CONVOCATORIAS = { campo: 'convocatorias', titulo: 'Conv.', descripcion: 'Convocatorias (en el acta)' };
// Los tramos de goles, según la duración de la categoría (Fútbol 7: 60').
function metricasDe(metricas, deJugadores) {
  if (!metricas) return metricas;
  const tramos = etiquetasTramos(duracionJuego(plantilla.value?.categoria?.id_tipofutbol));
  const conTramos = metricas.map((m) => (tramos[m.campo] ? { ...m, titulo: tramos[m.campo] } : m));
  if (esSeniorA.value) return conTramos;
  return conTramos.filter((m) => !CAMPOS_SOLO_SENIOR.has(m.campo))
    .map((m) => (deJugadores && m.campo === 'partidos' ? CONVOCATORIAS : m));
}

const COLUMNA_EQUIPO = { campo: 'equipo', titulo: 'Equipo' };
const METRICAS_TIEMPO_RIVAL = [
  ...METRICAS_CONVOCATORIAS.filter((m) => m.campo === 'convocatorias' || m.campo === 'titular'),
  ...METRICAS_TIEMPO
];
// Cada pestaña: tabla del equipo (si la hay) y la de sus jugadores, solo con
// quien tiene algo en ese lado (goles, minutos en el acta o tarjetas).
const BLOQUES = [
  {
    clave: 'goles',
    titulo: 'Goles',
    descripcion: 'Goles del rival en sus partidos de liga por tramos de 15 minutos dentro de cada parte (el añadido va al último tramo de su parte) y según los marcara un titular o un suplente. GF / GC salen del resultado (con las propias puertas) y Dif. es GF - GC; los goles en propia puerta no cuentan para los jugadores. "% por partido": partidos jugados en los que marca.',
    metricasEquipo: METRICAS_GOLES_RIVALES,
    metricas: METRICAS_GOLES,
    sortField: 'goles',
    tiene: (j, s) => j[`goles${s}`] > 0,
    vacio: 'Ningún jugador del rival ha marcado.'
  },
  {
    clave: 'tiempo',
    titulo: 'Tiempo',
    descripcion: 'Convocatorias (en el acta), titularidades y minutos de cada jugador del rival. "% Min. jugados": sobre 90 por partido jugado; "% Min. Jugados Total Partidos": sobre los 90 de cada partido del rival con acta, los haya jugado o no.',
    metricasEquipo: null,
    metricas: METRICAS_TIEMPO_RIVAL,
    sortField: 'minutos',
    tiene: (j, s) => j[`convocatorias${s}`] > 0,
    vacio: 'Todavía no hay actas del rival.'
  },
  {
    clave: 'sanciones',
    titulo: 'Sanciones',
    descripcion: 'Tarjetas del rival por parte del partido (1ª parte hasta el minuto 45), según las viera un titular o un suplente y según iba el marcador para ellos (con empate no cuentan como ganando ni perdiendo).',
    metricasEquipo: METRICAS_SANCIONES,
    metricas: METRICAS_SANCIONES,
    sortField: 'tarjetas_amarillas',
    tiene: (j, s) => j[`tarjetas_amarillas${s}`] > 0 || j[`tarjetas_rojas${s}`] > 0,
    vacio: 'Ningún jugador del rival ha visto tarjeta.'
  }
];
const bloques = computed(() => BLOQUES
  .filter((b) => (esSeniorA.value || b.clave !== 'tiempo')
    && !(b.clave === 'sanciones' && esFutbol7(plantilla.value?.categoria?.id_tipofutbol)))
  .map((b) => ({ ...b, metricasEquipo: metricasDe(b.metricasEquipo, false), metricas: metricasDe(b.metricas, true) })));
const pestana = ref(BLOQUES[0].clave);

async function cambiarPlantilla() {
  pestana.value = BLOQUES[0].clave;
  await cargar();
}

onMounted(async () => {
  await cargar();
  unsubCambio = suscribirseCambio(cargar);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});
</script>

<template>
<SectionGuard :seccion="SECCION">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">Estadísticas Próximo Rival</h1>
      <p class="text-sm text-ink-tertiary">
        El siguiente partido de liga de <strong>{{ titulo }}</strong> y lo que lleva el rival en toda la liga (no solo
        contra el PALMA), según las actas de RFAF. Local / Visitante: el rival en casa / fuera. Se puede mover una
        columna arrastrando su título.
      </p>
    </div>

    <!-- Mientras se piden los datos al servidor. -->
    <div v-if="cargando" role="status" class="flex items-center gap-2 rounded-xl border border-line bg-white py-3 px-4 text-sm text-ink-secondary">
      <i class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando datos...
    </div>
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      {{ porCategoria ? 'No hay ninguna plantilla disponible en la temporada actual.' : `No hay plantilla ${CATEGORIA} en la temporada actual.` }}
    </div>
    <!-- Estadísticas por categoría: selector (coordinadores/admin ven varias; un entrenador, solo la suya). -->
    <div v-if="porCategoria && plantillas.length > 1 && !error" class="flex items-center gap-2">
      <label for="filtro-plantilla" class="text-sm font-medium text-ink-secondary">Categoría</label>
      <Select inputId="filtro-plantilla" v-model="idPlantilla" :options="opcionesPlantillas" optionLabel="label"
              optionValue="value" :disabled="cargando" @change="cambiarPlantilla" class="w-full sm:w-72" />
    </div>
    <div v-else-if="!cargando && !partido" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay próximo partido de liga de {{ titulo }}.
    </div>

    <template v-if="plantilla && partido && !error">
      <!-- Cabecera del partido: jornada, fecha y los dos equipos con su escudo. -->
      <div class="rounded-xl border border-line bg-white p-4 flex flex-col gap-3">
        <div class="text-sm text-ink-secondary">
          <strong>Jornada {{ partido.jornada }}</strong> · {{ textoFecha(partido.fecha) }}
          · {{ partido.es_local ? 'en casa' : 'fuera' }}
          <span v-if="partido.suspendido" class="ml-1 text-red-700 font-semibold">(suspendido)</span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          <div v-for="(e, i) in [partido.equipoLocal, partido.equipoVisitante]" :key="i" class="flex items-center gap-2"
               :class="{ 'flex-row-reverse sm:flex-row': i === 1 }">
            <img v-if="e?.escudo" :src="e.escudo" alt="" class="w-12 h-12 object-contain" />
            <span class="font-semibold" :class="e?.nombre === partido.rival ? 'text-club-green text-lg' : 'text-ink-secondary'">
              {{ e?.nombre || '—' }}
            </span>
            <span v-if="i === 0" class="hidden sm:inline text-ink-tertiary ml-6">vs</span>
          </div>
        </div>
      </div>

      <div v-if="!cargando" class="rounded-xl border border-line bg-white py-3 px-4 text-sm text-ink-tertiary">
        <i class="pi pi-info-circle mr-1" />
        <template v-if="!equipo">Todavía no hay actas de {{ partido.rival }} en la liga.</template>
        <template v-else-if="jornadas.length">Con actas de las jornadas {{ jornadas[0] }} a {{ jornadas[jornadas.length - 1] }}.</template>
        <template v-if="actasPendientes"> Quedan {{ actasPendientes }} actas de la liga por copiar de RFAF.</template>
      </div>

      <Tabs v-if="equipo" v-model:value="pestana">
        <TabList>
          <Tab v-for="b in bloques" :key="b.clave" :value="b.clave">{{ b.titulo }}</Tab>
        </TabList>
        <TabPanels class="!px-0">
          <TabPanel v-for="b in bloques" :key="b.clave" :value="b.clave">
            <div class="flex flex-col gap-2">
              <p class="text-sm text-ink-tertiary">{{ b.descripcion }}</p>
              <PestanasLado v-slot="{ lado }">
                <div class="flex flex-col gap-4">
                  <div v-if="b.metricasEquipo" class="flex flex-col gap-2">
                    <h3 class="font-display text-base text-ink-secondary">Equipo</h3>
                    <TablaEstadistica :filas="[equipo]" :metricas="b.metricasEquipo" :soloGrupo="lado.clave"
                                      :cargando="cargando" :columnaNombre="COLUMNA_EQUIPO" dataKey="id_equipo" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <h3 class="font-display text-base text-ink-secondary">Jugadores</h3>
                    <TablaEstadistica :filas="jugadores.filter((j) => b.tiene(j, lado.sufijo))" :metricas="b.metricas" columnaDorsal
                                      :soloGrupo="lado.clave" :sortField="b.sortField" :cargando="cargando"
                                      :textoVacio="b.vacio" :leyendaOmitir="leyendaMetricas(b.metricasEquipo)" />
                  </div>
                </div>
              </PestanasLado>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</SectionGuard>
</template>
