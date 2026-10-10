<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import MultiSelect from 'primevue/multiselect';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import TablaEstadistica from '../../components/TablaEstadistica.vue';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';

/** Estadísticas en los partidos de la plantilla Senior A de la temporada
 * actual (las rellena "Finalizar Acta" en Partidos). Cada tabla es una sección
 * propia del menú (grupo Estadísticas, con su permiso): la ruta dice cuál
 * (`tabla`: equipo, convocatorias, tiempo, goles, sanciones). */
const props = defineProps({
  tabla: { type: String, required: true }
});
const CATEGORIA = CATEGORIA_CON_MINUTOS;

// Columnas de cada tabla; cada una sale en Total, Local y Visitante (ver TablaEstadistica).
const METRICAS_EQUIPO = [
  { campo: 'partidos', titulo: 'PAR', descripcion: 'Partidos jugados' },
  { campo: 'victorias', titulo: 'G', descripcion: 'Ganados' },
  { campo: 'empates', titulo: 'E', descripcion: 'Empatados' },
  { campo: 'derrotas', titulo: 'P', descripcion: 'Perdidos' },
  { campo: 'goles_favor', titulo: 'GF', descripcion: 'Goles a favor', subgrupo: 'Goles' },
  { campo: 'goles_contra', titulo: 'GC', descripcion: 'Goles en contra', subgrupo: 'Goles' },
  { campo: 'goles_penalti_favor', titulo: 'GP', descripcion: 'Goles de penalti', subgrupo: 'Goles' },
  { campo: 'goles_penalti_contra', titulo: 'GEP', descripcion: 'Goles en contra de penalti', subgrupo: 'Goles' },
  { campo: 'media_goles_favor', titulo: 'Media GF\npor partido', descripcion: 'Media de goles a favor por partido', decimal: true, subgrupo: 'Goles' },
  { campo: 'media_goles_contra', titulo: 'Media GC\npor partido', descripcion: 'Media de goles en contra por partido', decimal: true, subgrupo: 'Goles' },
  { campo: 'media_goles_titulares', titulo: 'Media Goles\nTitulares', descripcion: 'Media de goles por partido marcados por titulares', decimal: true, subgrupo: 'Goles' },
  { campo: 'media_goles_suplentes', titulo: 'Media Goles\nSuplentes', descripcion: 'Media de goles por partido marcados por suplentes que entraron', decimal: true, subgrupo: 'Goles' },
  { campo: 'tarjetas_amarillas', titulo: 'TA', descripcion: 'Tarjetas amarillas', subgrupo: 'Sanciones' },
  { campo: 'tarjetas_rojas', titulo: 'TR', descripcion: 'Tarjetas rojas', subgrupo: 'Sanciones' },
  { campo: 'media_amarillas', titulo: 'Media TA\npor partido', descripcion: 'Media de tarjetas amarillas por partido', decimal: true, subgrupo: 'Sanciones' },
  { campo: 'media_rojas', titulo: 'Media TR\npor partido', descripcion: 'Media de tarjetas rojas por partido', decimal: true, subgrupo: 'Sanciones' },
  { campo: 'media_amarillas_titulares', titulo: 'Media TA\nTitulares', descripcion: 'Media de tarjetas amarillas por partido de los titulares', decimal: true, subgrupo: 'Sanciones' },
  { campo: 'media_amarillas_suplentes', titulo: 'Media TA\nSuplentes', descripcion: 'Media de tarjetas amarillas por partido de los suplentes', decimal: true, subgrupo: 'Sanciones' },
  { campo: 'media_rojas_titulares', titulo: 'Media TR\nTitulares', descripcion: 'Media de tarjetas rojas por partido de los titulares', decimal: true, subgrupo: 'Sanciones' },
  { campo: 'media_rojas_suplentes', titulo: 'Media TR\nSuplentes', descripcion: 'Media de tarjetas rojas por partido de los suplentes', decimal: true, subgrupo: 'Sanciones' }
];
const METRICAS_CONVOCATORIAS = [
  { campo: 'convocatorias', titulo: 'Conv.', descripcion: 'Convocatorias' },
  { campo: 'titular', titulo: 'Tit.', descripcion: 'Titular' },
  { campo: 'suplente', titulo: 'Supl.', descripcion: 'Suplente' },
  { campo: 'banquillo_no_jugados', titulo: 'Sin jugar' },
  { campo: 'sustituciones', titulo: 'Sust.', descripcion: 'Sustitución' }
];
const METRICAS_TIEMPO = [
  { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'minutos', titulo: 'Min.', descripcion: 'Minutos' },
  { campo: 'porcentaje_minutos', titulo: '% Min.\njugados', descripcion: '% Minutos jugados', porcentaje: true },
  { campo: 'minutos_titular', titulo: 'Min.\nTit.', descripcion: 'Minutos Titular' },
  { campo: 'minutos_banquillo', titulo: 'Min.\nSupl.', descripcion: 'Minutos Suplente' }
];
const METRICAS_GOLES = [
  { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'goles', titulo: 'Goles' },
  { campo: 'porcentaje_goles', titulo: '% de sus\ngoles', porcentaje: true, soloLados: true },
  { campo: 'goles_primera', titulo: '1ª Parte' },
  { campo: 'goles_segunda', titulo: '2ª Parte' },
  { campo: 'goles_titular', titulo: 'Goles', subgrupo: 'Tit.', descripcionSubgrupo: 'Titular' },
  { campo: 'porcentaje_goles_titular', titulo: '% Goles', porcentaje: true, subgrupo: 'Tit.', descripcionSubgrupo: 'Titular' },
  { campo: 'goles_banquillo', titulo: 'Goles', subgrupo: 'Supl.', descripcionSubgrupo: 'Suplente' },
  { campo: 'porcentaje_goles_banquillo', titulo: '% Goles', porcentaje: true, subgrupo: 'Supl.', descripcionSubgrupo: 'Suplente' },
  { campo: 'porcentaje_goles_partido', titulo: '% por\npartido', porcentaje: true }
];
const METRICAS_SANCIONES = [
  { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'tarjetas_amarillas', titulo: 'Total', subgrupo: 'Amarillas' },
  { campo: 'amarillas_primera', titulo: '1ª Parte', subgrupo: 'Amarillas' },
  { campo: 'amarillas_segunda', titulo: '2ª Parte', subgrupo: 'Amarillas' },
  { campo: 'amarillas_ganando', titulo: 'Ganando', subgrupo: 'Amarillas' },
  { campo: 'amarillas_perdiendo', titulo: 'Perdiendo', subgrupo: 'Amarillas' },
  { campo: 'tarjetas_rojas', titulo: 'Total', subgrupo: 'Rojas' },
  { campo: 'rojas_primera', titulo: '1ª Parte', subgrupo: 'Rojas' },
  { campo: 'rojas_segunda', titulo: '2ª Parte', subgrupo: 'Rojas' },
  { campo: 'rojas_ganando', titulo: 'Ganando', subgrupo: 'Rojas' },
  { campo: 'rojas_perdiendo', titulo: 'Perdiendo', subgrupo: 'Rojas' }
];

const plantilla = ref(null);
const filas = ref([]);
// Estadísticas Equipo: una sola fila, la del equipo.
const equipo = ref(null);
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
    if (plantilla.value && props.tabla === 'equipo') {
      equipo.value = await estadisticasService.equipo({ id_plantilla: plantilla.value.id });
    } else if (plantilla.value) {
      filas.value = (await estadisticasService.listar({ id_plantilla: plantilla.value.id }))
        .map((f) => ({ ...f, jugador: `${f.nombre} ${f.apellidos}` }));
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

// Cada tabla: título, explicación, métricas, filas y columna por la que se ordena.
const TABLAS = {
  equipo: {
    seccion: 'estadisticas_equipo',
    titulo: 'Estadísticas Equipo',
    descripcion: 'Resultados del equipo en los partidos con resultado (no cuentan los suspendidos). GP / GEP: goles de penalti a favor / en contra. Las medias son goles o tarjetas por partido jugado (p.ej. 6 goles en 4 partidos = 1,50). Media Goles Titulares / Suplentes: goles por partido marcados por jugadores que salieron de titulares / que entraron desde el banquillo (los de propia puerta del rival no son de nadie). Media TA / TR Titulares y Suplentes: tarjetas por partido de los titulares / de los suplentes (también las que ve un suplente en el banquillo sin llegar a jugar). Las tarjetas son las de los jugadores del PALMA.',
    metricas: METRICAS_EQUIPO,
    porLado: true
  },
  convocatorias: {
    seccion: 'estadisticas_convocatorias',
    titulo: 'Estadísticas Convocatorias',
    descripcion: 'Partidos en los que el jugador está en el acta, y cómo: de titular, de suplente entrando a jugar o de suplente sin jugar. Sustitución: veces que lo cambian (sale del campo antes del final; las expulsiones no cuentan).',
    metricas: METRICAS_CONVOCATORIAS,
    sortField: 'convocatorias'
  },
  tiempo: {
    seccion: 'estadisticas_tiempo',
    titulo: 'Estadísticas Tiempo',
    descripcion: 'Minutos jugados por cada jugador. "% Minutos jugados": minutos jugados sobre los posibles (90 por partido) en los partidos que ha jugado; si juega 3 partidos enteros, 100 %.',
    metricas: METRICAS_TIEMPO,
    sortField: 'minutos'
  },
  goles: {
    seccion: 'estadisticas_goles',
    titulo: 'Estadísticas Goles',
    descripcion: 'Goles de cada jugador por parte del partido (1ª parte hasta el minuto 45) y según jugara de titular o de suplente (en Tit. / Supl., "% Goles" es la parte de sus goles marcados de titular / de suplente). En Local / Visitante, "% de sus goles" es la parte del total de goles del jugador marcados en casa / fuera. Los goles en propia puerta no cuentan.',
    metricas: METRICAS_GOLES,
    sortField: 'goles',
    porLado: true
  },
  sanciones: {
    seccion: 'estadisticas_sanciones',
    titulo: 'Estadísticas Sanciones',
    descripcion: 'Tarjetas de cada jugador por parte del partido (1ª parte hasta el minuto 45) y según iba el marcador en ese momento; con empate no cuentan como ganando ni perdiendo.',
    metricas: METRICAS_SANCIONES,
    sortField: 'tarjetas_amarillas',
    porLado: true
  }
};
const config = computed(() => TABLAS[props.tabla]);
const filasTabla = computed(() => ({
  equipo: filasEquipo.value,
  convocatorias: filasFiltradas.value,
  tiempo: filasFiltradas.value,
  goles: filasGoles.value,
  sanciones: filasSanciones.value
})[props.tabla]);
// Equipo, Goles y Sanciones: una tabla para Total, otra para Local y otra para
// Visitante; en Goles y Sanciones, cada una solo con quien tiene goles /
// tarjetas en ella.
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

const textoVacioTabla = computed(() => (props.tabla === 'equipo' ? 'Todavía no hay partidos con resultado.' : textoVacio.value));

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

// Al pasar de una sección de Estadísticas a otra se reutiliza el componente.
watch(() => props.tabla, () => { cargar(); });

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
      <p v-if="tabla === 'equipo' && equipo?.sin_penaltis" class="text-xs text-amber-700 mt-1">
        {{ equipo.sin_penaltis }} {{ equipo.sin_penaltis === 1 ? 'partido no tiene' : 'partidos no tienen' }} los
        penaltis en contra: vuelve a pulsar "Finalizar Acta" en {{ equipo.sin_penaltis === 1 ? 'él' : 'ellos' }}.
      </p>
    </div>
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>

    <template v-if="plantilla && !error">
      <div v-if="tabla !== 'equipo'" class="flex flex-wrap items-center gap-2">
        <label for="filtro-jugadores" class="text-sm font-medium text-ink-secondary">Jugadores</label>
        <MultiSelect inputId="filtro-jugadores" v-model="jugadoresFiltro" :options="opcionesJugadores" optionLabel="label"
                     optionValue="value" filter display="chip" :maxSelectedLabels="4" showClear
                     :placeholder="`Todos los jugadores de ${titulo}`" class="w-full sm:w-[28rem]" />
      </div>

      <template v-if="config.porLado">
        <div v-for="lado in LADOS_TABLA" :key="`${tabla}-${lado.clave}`" class="flex flex-col gap-2">
          <h2 class="font-display text-lg text-club-green">{{ lado.titulo }}</h2>
          <TablaEstadistica :filas="filasDelLado(lado.sufijo)" :metricas="config.metricas" :soloGrupo="lado.clave"
                            :sortField="config.sortField" :cargando="cargando" :textoVacio="textoVacioTabla"
                            v-bind="tabla === 'equipo' ? { columnaNombre: { campo: 'equipo', titulo: 'Equipo' }, dataKey: 'id_plantilla' } : {}" />
        </div>
      </template>
      <TablaEstadistica v-else :key="tabla" :filas="filasTabla" :metricas="config.metricas" :sortField="config.sortField"
                        :cargando="cargando" :textoVacio="textoVacioTabla" />
    </template>
  </div>
</SectionGuard>
</template>
