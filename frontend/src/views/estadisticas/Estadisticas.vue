<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useToast } from 'primevue/usetoast';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import TablaEstadistica from '../../components/TablaEstadistica.vue';
import PartidosJugadorEstadistica from '../../components/PartidosJugadorEstadistica.vue';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';
import {
  METRICAS_EQUIPO_GOLES, METRICAS_EQUIPO_TARJETAS, METRICAS_CONVOCATORIAS, METRICAS_TIEMPO, METRICAS_GOLES, METRICAS_GOLES_CONTRA, METRICAS_SANCIONES
} from '../../utils/estadisticasMetricas';
import { construirHojaEstadistica, descargarExcel, nombreFicheroExcel } from '../../utils/excelEstadisticas';

/** Estadísticas en los partidos de la plantilla Senior A de la temporada
 * actual (las rellena "Finalizar Acta" en Partidos). Cada tabla es una sección
 * propia del menú (grupo Estadísticas, con su permiso): la ruta dice cuál
 * (`tabla`: equipo, convocatorias, tiempo, goles, sanciones). */
const props = defineProps({
  tabla: { type: String, required: true }
});
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
const filas = ref([]);
// Estadísticas Equipo: una sola fila, la del equipo.
const equipo = ref(null);
// Estadísticas Goles: goles del equipo contrario por periodo (tabla aparte).
const golesContra = ref(null);
const cargando = ref(false);
const error = ref('');
// Jugadores elegidos en el filtro (ids); vacío = todos.
const jugadoresFiltro = ref([]);
let unsubCambio = null;

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const [plantillas, temporadas] = await Promise.all([plantillasService.listar(), temporadasService.listar()]);
    plantilla.value = filtrarPlantillasTemporadaActual(plantillas, temporadas)
      .find((p) => p.categoria?.nombre === CATEGORIA) || null;
    filas.value = [];
    equipo.value = null;
    golesContra.value = null;
    if (plantilla.value) {
      filas.value = (await estadisticasService.listar({ id_plantilla: plantilla.value.id }))
        .map((f) => ({ ...f, jugador: `${f.nombre} ${f.apellidos}` }));
      // En Goles, además, los goles del equipo (parte de Estadísticas Equipo) y
      // los que nos marca el equipo contrario por periodo. En Sanciones, las
      // tarjetas del equipo (parte de Estadísticas Equipo).
      if (props.tabla === 'goles') {
        [equipo.value, golesContra.value] = await Promise.all([
          estadisticasService.equipo({ id_plantilla: plantilla.value.id }),
          estadisticasService.golesContra({ id_plantilla: plantilla.value.id })
        ]);
      } else if (props.tabla === 'sanciones') {
        equipo.value = await estadisticasService.equipo({ id_plantilla: plantilla.value.id });
      }
    }
  } catch (err) {
    filas.value = [];
    equipo.value = null;
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas.';
  } finally {
    cargando.value = false;
  }
}

// Filtro de las tablas de jugadores: los jugadores de la plantilla elegidos.
const opcionesJugadores = computed(() => (plantilla.value?.jugadores || [])
  .map((j) => ({ value: j.id, label: `${j.nombre} ${j.apellidos}` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es')));
const textoVacio = computed(() => (jugadoresFiltro.value.length
  ? 'Ninguno de los jugadores elegidos tiene datos en esta tabla.'
  : 'Todavía no hay datos: finaliza el acta de los partidos.'));
const filasFiltradas = computed(() => {
  if (!jugadoresFiltro.value.length) return filas.value;
  const elegidos = new Set(jugadoresFiltro.value);
  return filas.value.filter((f) => elegidos.has(f.id_jugador));
});

// Estadísticas Sanciones: solo los que tienen alguna tarjeta.
const filasSanciones = computed(() => filasFiltradas.value.filter((f) => f.tarjetas_amarillas > 0 || f.tarjetas_rojas > 0));
// Estadísticas Goles: solo los que han marcado.
const filasGoles = computed(() => filasFiltradas.value.filter((f) => f.goles > 0));

const filasEquipo = computed(() => (equipo.value?.partidos
  ? [{ ...equipo.value, equipo: plantilla.value?.categoria?.nombre || CATEGORIA }]
  : []));

// Estadísticas Goles: una fila "Equipo Contrario" con los goles en contra.
const METRICAS_CONTRA = METRICAS_GOLES_CONTRA;
const filasContra = computed(() => (golesContra.value ? [golesContra.value] : []));

// Estadísticas Goles / Sanciones: tabla resumen del equipo (parte de
// Estadísticas Equipo) en primer lugar: en Goles los goles, en Sanciones las
// tarjetas (sin lo que no toque).
const conResumenEquipo = computed(() => props.tabla === 'goles' || props.tabla === 'sanciones');
const metricasEquipoResumen = computed(() => (props.tabla === 'sanciones' ? METRICAS_EQUIPO_TARJETAS : METRICAS_EQUIPO_GOLES));
const descripcionEquipoResumen = computed(() => (props.tabla === 'sanciones'
  ? 'Tarjetas del equipo por partido (las mismas de Estadísticas Equipo). TA / TR: amarillas y rojas de los jugadores del PALMA. Las medias son por partido jugado, por titulares y por suplentes.'
  : 'Goles del equipo por partido (los mismos de Estadísticas Equipo). GF / GC: goles a favor y en contra; GP / GEP: de penalti a favor y en contra. Las medias son por partido jugado.'));

// Cada tabla: título, explicación, métricas, filas y columna por la que se ordena.
const TABLAS = {
  convocatorias: {
    seccion: 'estadisticas_convocatorias',
    titulo: 'Estadísticas Convocatorias',
    descripcion: 'Partidos en los que el jugador está en el acta, y cómo: de titular, de suplente entrando a jugar o de suplente sin jugar. Sustitución: veces que lo cambian (sale del campo antes del final; las expulsiones no cuentan), y en qué parte (1ª parte hasta el minuto 45).',
    metricas: METRICAS_CONVOCATORIAS,
    sortField: 'convocatorias'
  },
  tiempo: {
    seccion: 'estadisticas_tiempo',
    titulo: 'Estadísticas Tiempo',
    descripcion: 'Minutos jugados por cada jugador. "% Minutos jugados": minutos jugados sobre los posibles (90 por partido) en los partidos que ha jugado; si juega 3 partidos enteros, 100 %. "% Min. Jugados Total Partidos": minutos jugados sobre los de todos los partidos del equipo (90 por partido), los haya jugado o no; si el equipo lleva 6 partidos y él ha jugado 3 enteros, 50 %.',
    metricas: METRICAS_TIEMPO,
    sortField: 'minutos'
  },
  goles: {
    seccion: 'estadisticas_goles',
    titulo: 'Estadísticas Goles',
    descripcion: 'Goles de cada jugador por tramos de 15 minutos dentro de cada parte (1ª parte: 0-15, 16-30, 31-45; 2ª parte: 46-60, 61-75, 76-90; el tiempo añadido se suma al último tramo de su parte) y según jugara de titular o de suplente (en Tit. / Supl., "% Goles" es la parte de sus goles marcados de titular / de suplente). En Local / Visitante, "% de sus goles" es la parte del total de goles del jugador marcados en casa / fuera. "% por partido": partidos jugados en los que marca algún gol (si marca en 2 de 4 partidos, 50 %; marcar varios en un partido cuenta como uno). Los goles en propia puerta no cuentan. Pulsa en un jugador para ver en qué partidos marcó (y en qué minuto; (p) = de penalti).',
    metricas: METRICAS_GOLES,
    sortField: 'goles',
    porLado: true
  },
  sanciones: {
    seccion: 'estadisticas_sanciones',
    titulo: 'Estadísticas Sanciones',
    descripcion: 'Tarjetas de cada jugador por parte del partido (1ª parte hasta el minuto 45) y según iba el marcador en ese momento; con empate no cuentan como ganando ni perdiendo. Tit. / Supl.: tarjetas siendo titular o suplente (las del suplente cuentan aunque no llegara a entrar). Pulsa en un jugador para ver en qué partidos vio cada tarjeta (y en qué minuto).',
    metricas: METRICAS_SANCIONES,
    sortField: 'tarjetas_amarillas',
    porLado: true
  }
};
const config = computed(() => TABLAS[props.tabla]);
const filasTabla = computed(() => ({
  convocatorias: filasFiltradas.value,
  tiempo: filasFiltradas.value,
  goles: filasGoles.value,
  sanciones: filasSanciones.value
})[props.tabla]);
// Goles y Sanciones: una tabla para Total, otra para Local y otra para
// Visitante, cada una solo con quien tiene goles / tarjetas en ella.
const LADOS_TABLA = [
  { clave: 'total', titulo: 'Total', sufijo: '' },
  { clave: 'local', titulo: 'Local', sufijo: '_local' },
  { clave: 'visitante', titulo: 'Visitante', sufijo: '_visitante' }
];
function filasDelLado(sufijo) {
  if (props.tabla === 'goles') return filasFiltradas.value.filter((f) => f[`goles${sufijo}`] > 0);
  if (props.tabla === 'sanciones') {
    return filasFiltradas.value.filter((f) => f[`tarjetas_amarillas${sufijo}`] > 0 || f[`tarjetas_rojas${sufijo}`] > 0);
  }
  return filasTabla.value;
}

const textoVacioTabla = computed(() => textoVacio.value);

// Estadísticas Goles / Sanciones: desplegable por jugador con los partidos en
// que marcó / vio tarjeta (en Local / Visitante, solo los de ese lado).
function partidosDelJugador(fila, clave) {
  const lista = props.tabla === 'goles' ? fila.partidos_goles : fila.partidos_tarjetas;
  return (lista || []).filter((p) => clave === 'total' || p.es_local === (clave === 'local'));
}
function expandibleLado(clave) {
  return conResumenEquipo.value ? (fila) => partidosDelJugador(fila, clave).length > 0 : null;
}

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

// Exportar a Excel: cada tabla de la pantalla en su hoja (con el filtro de
// jugadores aplicado), en el mismo orden.
const toast = useToast();
const exportando = ref(false);
function hojasExcel() {
  const hojas = [];
  const columnaEquipo = { campo: 'equipo', titulo: 'Equipo' };
  const agregar = (nombre, opciones) => hojas.push({
    nombre, titulo: `${config.value.titulo} · ${titulo.value} · ${nombre}`, ...construirHojaEstadistica(opciones)
  });
  if (conResumenEquipo.value) {
    for (const lado of LADOS_TABLA) {
      agregar(`Equipo ${lado.titulo}`, { metricas: metricasEquipoResumen.value, filas: filasEquipo.value,
        soloGrupo: lado.clave, columnaNombre: columnaEquipo });
    }
  }
  if (config.value.porLado) {
    for (const lado of LADOS_TABLA) {
      agregar(`Jugadores ${lado.titulo}`, { metricas: config.value.metricas, filas: filasDelLado(lado.sufijo),
        soloGrupo: lado.clave, sortField: config.value.sortField });
    }
  } else {
    agregar(config.value.titulo.replace(/^Estadísticas\s+/, ''), { metricas: config.value.metricas,
      filas: filasTabla.value, sortField: config.value.sortField });
  }
  if (props.tabla === 'goles') {
    for (const lado of LADOS_TABLA) {
      agregar(`Equipo Contrario ${lado.titulo}`, { metricas: METRICAS_CONTRA, filas: filasContra.value,
        soloGrupo: lado.clave, columnaNombre: columnaEquipo });
    }
  }
  return hojas;
}
async function exportarExcel() {
  exportando.value = true;
  try {
    await descargarExcel(nombreFicheroExcel(config.value.titulo, titulo.value), hojasExcel());
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el Excel.', life: 4000 });
  } finally {
    exportando.value = false;
  }
}

// Estadísticas Goles / Sanciones: cada bloque (Equipo, Jugadores y, en Goles,
// Equipo Contrario) en su pestaña.
const pestana = ref('equipo');
const PESTANAS = computed(() => [
  { valor: 'equipo', titulo: 'Equipo' },
  { valor: 'jugadores', titulo: 'Jugadores' },
  ...(props.tabla === 'goles' ? [{ valor: 'contrario', titulo: 'Equipo Contrario' }] : [])
]);
// El filtro de jugadores solo afecta a las tablas de jugadores.
const verFiltroJugadores = computed(() => !conResumenEquipo.value || pestana.value === 'jugadores');

// Al pasar de una sección de Estadísticas a otra se reutiliza el componente.
watch(() => props.tabla, () => { pestana.value = 'equipo'; cargar(); });

onMounted(async () => {
  await cargar();
  unsubCambio = suscribirseCambio(cargar);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});
</script>

<template>
<SectionGuard :seccion="config.seccion">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">{{ config.titulo }}</h1>
      <p class="text-sm text-ink-tertiary">
        Partidos de <strong>{{ titulo }}</strong>, según las actas de RFAF (se rellenan al pulsar "Finalizar Acta" en
        cada partido). Los datos salen en Total, como Local (el PALMA en casa) y como Visitante (fuera); se puede mover
        una columna arrastrando su título.
      </p>
      <p class="text-sm text-ink-tertiary mt-1">{{ config.descripcion }}</p>
    </div>
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>

    <template v-if="plantilla && !error">
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="verFiltroJugadores">
          <label for="filtro-jugadores" class="text-sm font-medium text-ink-secondary">Jugadores</label>
          <MultiSelect inputId="filtro-jugadores" v-model="jugadoresFiltro" :options="opcionesJugadores" optionLabel="label"
                       optionValue="value" filter display="chip" :maxSelectedLabels="4" showClear
                       :placeholder="`Todos los jugadores de ${titulo}`" class="w-full sm:w-[28rem]" />
        </template>
        <Button label="Exportar a Excel" icon="pi pi-file-excel" severity="secondary" outlined class="sm:ml-auto"
                :loading="exportando" :disabled="cargando" @click="exportarExcel" />
      </div>

      <!-- Estadísticas Goles / Sanciones: Equipo, Jugadores y (Goles) Equipo Contrario, en pestañas. -->
      <Tabs v-if="conResumenEquipo" v-model:value="pestana">
        <TabList>
          <Tab v-for="p in PESTANAS" :key="p.valor" :value="p.valor">{{ p.titulo }}</Tab>
        </TabList>
        <TabPanels class="!px-0">
          <TabPanel value="equipo">
            <div class="flex flex-col gap-2">
              <p class="text-sm text-ink-tertiary">{{ descripcionEquipoResumen }}</p>
              <div v-for="lado in LADOS_TABLA" :key="`eqresumen-${lado.clave}`" class="flex flex-col gap-2">
                <h3 class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
                <TablaEstadistica :filas="filasEquipo" :metricas="metricasEquipoResumen" :soloGrupo="lado.clave"
                                  :cargando="cargando" textoVacio="Todavía no hay partidos con resultado."
                                  :columnaNombre="{ campo: 'equipo', titulo: 'Equipo' }" dataKey="id_plantilla" />
              </div>
            </div>
          </TabPanel>
          <TabPanel value="jugadores">
            <div class="flex flex-col gap-2">
              <div v-for="lado in LADOS_TABLA" :key="`${tabla}-${lado.clave}`" class="flex flex-col gap-2">
                <h3 class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
                <TablaEstadistica :filas="filasDelLado(lado.sufijo)" :metricas="config.metricas" :soloGrupo="lado.clave"
                                  :sortField="config.sortField" :cargando="cargando" :textoVacio="textoVacioTabla"
                                  :expandible="expandibleLado(lado.clave)">
                  <template #detalle="{ data }">
                    <PartidosJugadorEstadistica :partidos="partidosDelJugador(data, lado.clave)" :tipo="tabla" />
                  </template>
                </TablaEstadistica>
              </div>
            </div>
          </TabPanel>
          <!-- Estadísticas Goles: goles que nos marca el equipo contrario, por periodo. -->
          <TabPanel v-if="tabla === 'goles'" value="contrario">
            <div class="flex flex-col gap-2">
              <p class="text-sm text-ink-tertiary">
                Goles que nos marca el rival y en qué periodo (mismos tramos de 15 minutos). El reparto por tramo sale de
                las actas finalizadas; si un partido no se ha vuelto a finalizar desde que se guardan los goles del rival,
                suma al total pero no a los tramos.
              </p>
              <div v-for="lado in LADOS_TABLA" :key="`contra-${lado.clave}`" class="flex flex-col gap-2">
                <h3 class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
                <TablaEstadistica :filas="filasContra" :metricas="METRICAS_CONTRA" :soloGrupo="lado.clave"
                                  :cargando="cargando" textoVacio="Todavía no hay goles en contra."
                                  :columnaNombre="{ campo: 'equipo', titulo: 'Equipo' }" dataKey="id_plantilla" />
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <TablaEstadistica v-else :key="tabla" :filas="filasTabla" :metricas="config.metricas" :sortField="config.sortField"
                        :cargando="cargando" :textoVacio="textoVacioTabla" />
    </template>
  </div>
</SectionGuard>
</template>
