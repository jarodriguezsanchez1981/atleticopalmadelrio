<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { estadisticasService } from '../../services';
import TablaEstadistica from '../../components/TablaEstadistica.vue';
import PartidosJugadorEstadistica from '../../components/PartidosJugadorEstadistica.vue';
import { suscribirseCambio } from '../../utils/cambioBus';
import { METRICAS_CONVOCATORIAS, METRICAS_GOLES, METRICAS_SANCIONES, METRICAS_EQUIPO_TARJETAS } from '../../utils/estadisticasMetricas';

/** Estadísticas de Convocatorias, Goles y Sanciones de la categoría del usuario (a
 * diferencia de views/estadisticas/Estadisticas.vue, que son siempre de Senior
 * A). Un entrenador ve las de su categoría; un coordinador elige la plantilla
 * de la temporada actual con el selector. Las plantillas disponibles y sus
 * jugadores los da `/estadisticas/plantillas` (filtradas por categoría en el
 * backend), así que no hace falta el permiso de la sección Plantillas. */
const props = defineProps({
  tabla: { type: String, required: true },   // 'convocatorias' | 'goles' | 'sanciones'
  seccion: { type: String, required: true }   // clave para SectionGuard
});

// Fuera de Senior A el acta no permite saber si un jugador fue titular o
// suplente (ni quién no jugó), así que se ocultan esas columnas. El reparto de
// goles por parte (1ª/2ª) sí se puede: "Finalizar Acta" guarda el minuto de
// cada gol (requiere que el acta esté finalizada con la versión que lo guarda).
const CAMPOS_OCULTOS = new Set([
  'titular', 'suplente', 'banquillo_no_jugados',
  'goles_titular', 'porcentaje_goles_titular', 'goles_banquillo', 'porcentaje_goles_banquillo',
  'amarillas_titular', 'amarillas_suplente', 'rojas_titular', 'rojas_suplente',
  'media_amarillas_titulares', 'media_amarillas_suplentes', 'media_rojas_titulares', 'media_rojas_suplentes'
]);
const sinTitularSuplente = (metricas) => metricas.filter((m) => !CAMPOS_OCULTOS.has(m.campo));

const TABLAS = {
  convocatorias: {
    titulo: 'Convocatorias',
    descripcion: 'Partidos en los que el jugador aparece en el acta (en estas categorías, aparecer significa haber jugado). Sustitución: veces que lo cambian (sale del campo antes del final; las expulsiones no cuentan), y en qué parte (1ª parte hasta el minuto 45).',
    metricas: sinTitularSuplente(METRICAS_CONVOCATORIAS),
    sortField: 'convocatorias',
    porLado: false
  },
  goles: {
    titulo: 'Goles',
    descripcion: 'Goles de cada jugador por tramos: cada parte se divide en 3 según la duración de juego del tipo de fútbol (Fútbol 7 no juega 90\'); el tiempo añadido se suma al último tramo de su parte. En Local / Visitante, "% de sus goles" es la parte del total de goles del jugador marcados en casa / fuera. "% por partido": partidos jugados en los que marca algún gol. Los goles en propia puerta no cuentan. Pulsa en un jugador para ver en qué partidos marcó (y en qué minuto; (p) = de penalti).',
    metricas: sinTitularSuplente(METRICAS_GOLES),
    sortField: 'goles',
    porLado: true
  },
  sanciones: {
    titulo: 'Sanciones',
    descripcion: 'Tarjetas de cada jugador por parte del partido (1ª parte hasta el minuto 45) y según iba el marcador en ese momento; con empate no cuentan como ganando ni perdiendo. Solo plantillas de Fútbol 11 (Senior A tiene su propio apartado). Pulsa en un jugador para ver en qué partidos vio cada tarjeta (y en qué minuto).',
    metricas: sinTitularSuplente(METRICAS_SANCIONES),
    sortField: 'tarjetas_amarillas',
    porLado: true
  }
};

// Sanciones: solo plantillas de Fútbol 11, sin Senior A (tiene su propio apartado).
const CATEGORIA_SENIOR_A = 'Senior A';
function plantillaDeLaTabla(p) {
  if (props.tabla !== 'sanciones') return true;
  return Number(p.categoria?.id_tipofutbol) !== TIPO_FUTBOL_7 && p.categoria?.nombre !== CATEGORIA_SENIOR_A;
}

const plantillas = ref([]);        // disponibles (temporada actual, categoría del usuario)
const idPlantilla = ref(null);     // plantilla elegida
const filas = ref([]);
// Sanciones: tarjetas del equipo (tabla resumen, como en Senior A).
const equipo = ref(null);
const cargando = ref(false);
const error = ref('');
// Jugadores elegidos en el filtro (ids); vacío = todos.
const jugadoresFiltro = ref([]);
let unsubCambio = null;

const plantillaActual = computed(() => plantillas.value.find((p) => p.id === idPlantilla.value) || null);
const hayVariasPlantillas = computed(() => plantillas.value.length > 1);

// Duración de juego por tipo de fútbol (Fútbol 7 no juega 90'); igual que en el
// backend. Los 6 tramos de Goles se reparten en 3 por parte sobre esa duración.
const TIPO_FUTBOL_7 = 1;
const duracionJuego = (idTipo) => (Number(idTipo) === TIPO_FUTBOL_7 ? 60 : 90);
const CAMPOS_TRAMO = ['goles_1t1', 'goles_1t2', 'goles_1t3', 'goles_2t1', 'goles_2t2', 'goles_2t3'];
function etiquetasTramos(dur) {
  const sexto = dur / 6;
  const m = {};
  CAMPOS_TRAMO.forEach((c, i) => {
    m[c] = `${i === 0 ? 0 : Math.round(i * sexto) + 1}-${Math.round((i + 1) * sexto)}`;
  });
  return m;
}
// La tabla de Goles reetiqueta los tramos según la duración de la categoría elegida.
const config = computed(() => {
  const base = TABLAS[props.tabla];
  if (props.tabla !== 'goles') return base;
  const et = etiquetasTramos(duracionJuego(plantillaActual.value?.categoria?.id_tipofutbol));
  return { ...base, metricas: base.metricas.map((m) => (et[m.campo] ? { ...m, titulo: et[m.campo] } : m)) };
});
const opcionesPlantillas = computed(() => plantillas.value
  .map((p) => ({ value: p.id, label: `${p.categoria?.nombre || 'Sin categoría'} / ${p.temporada?.nombre || ''}` })));

async function cargarPlantillas() {
  plantillas.value = (await estadisticasService.plantillas()).filter(plantillaDeLaTabla);
  // Mantiene la elegida si sigue disponible; si no, la primera.
  if (!plantillas.value.some((p) => p.id === idPlantilla.value)) {
    idPlantilla.value = plantillas.value[0]?.id ?? null;
  }
}

async function cargarFilas() {
  filas.value = [];
  equipo.value = null;
  if (!idPlantilla.value) return;
  const [jugadores, datosEquipo] = await Promise.all([
    estadisticasService.listar({ id_plantilla: idPlantilla.value }),
    props.tabla === 'sanciones' ? estadisticasService.equipo({ id_plantilla: idPlantilla.value }) : null
  ]);
  filas.value = jugadores.map((f) => ({ ...f, jugador: `${f.nombre} ${f.apellidos}` }));
  equipo.value = datosEquipo;
}

// Sanciones: tabla resumen del equipo (una fila, la de la categoría), sin las
// medias de titulares / suplentes (el acta no lo dice fuera de Senior A).
const METRICAS_EQUIPO_RESUMEN = sinTitularSuplente(METRICAS_EQUIPO_TARJETAS);
const filasEquipo = computed(() => (equipo.value?.partidos
  ? [{ ...equipo.value, equipo: plantillaActual.value?.categoria?.nombre || '' }]
  : []));

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    await cargarPlantillas();
    await cargarFilas();
  } catch (err) {
    filas.value = [];
    equipo.value = null;
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas.';
  } finally {
    cargando.value = false;
  }
}

// Al cambiar de plantilla en el selector se recargan los datos y se limpia el filtro.
async function cambiarPlantilla() {
  jugadoresFiltro.value = [];
  cargando.value = true;
  error.value = '';
  try {
    await cargarFilas();
  } catch (err) {
    filas.value = [];
    equipo.value = null;
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas.';
  } finally {
    cargando.value = false;
  }
}

const opcionesJugadores = computed(() => (plantillaActual.value?.jugadores || [])
  .map((j) => ({ value: j.id, label: `${j.nombre} ${j.apellidos}` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es')));
const filasFiltradas = computed(() => {
  if (!jugadoresFiltro.value.length) return filas.value;
  const elegidos = new Set(jugadoresFiltro.value);
  return filas.value.filter((f) => elegidos.has(f.id_jugador));
});

// Goles: solo quien ha marcado (en total y en cada lado).
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
  return filasFiltradas.value;
}
// Goles / Sanciones: desplegable por jugador con los partidos en que marcó /
// vio tarjeta (en Local / Visitante, solo los de ese lado).
function partidosDelJugador(fila, clave) {
  const lista = props.tabla === 'goles' ? fila.partidos_goles : fila.partidos_tarjetas;
  return (lista || []).filter((p) => clave === 'total' || p.es_local === (clave === 'local'));
}
function expandibleLado(clave) {
  return props.tabla === 'goles' || props.tabla === 'sanciones'
    ? (fila) => partidosDelJugador(fila, clave).length > 0
    : null;
}
const filasTabla = computed(() => (props.tabla === 'goles'
  ? filasFiltradas.value.filter((f) => f.goles > 0)
  : filasFiltradas.value));

const titulo = computed(() => (plantillaActual.value
  ? `${plantillaActual.value.categoria?.nombre || ''} / ${plantillaActual.value.temporada?.nombre || ''}`
  : ''));
const textoVacio = computed(() => (jugadoresFiltro.value.length
  ? 'Ninguno de los jugadores elegidos tiene datos en esta tabla.'
  : 'Todavía no hay datos: finaliza el acta de los partidos.'));

// Al pasar de una tabla a otra (misma vista) se reutiliza el componente; los
// datos son los mismos, pero Sanciones solo ofrece plantillas de Fútbol 11, así
// que al entrar o salir de ella se recargan las plantillas disponibles.
watch(() => props.tabla, (nueva, anterior) => {
  jugadoresFiltro.value = [];
  if (nueva === 'sanciones' || anterior === 'sanciones') cargar();
});

onMounted(async () => {
  await cargar();
  unsubCambio = suscribirseCambio(cargar);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});
</script>

<template>
<SectionGuard :seccion="seccion">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">{{ config.titulo }}</h1>
      <p class="text-sm text-ink-tertiary">
        Estadísticas de <strong>{{ titulo || 'tu categoría' }}</strong>, según las actas de RFAF (se rellenan al pulsar
        "Finalizar Acta" en cada partido). Los datos salen en Total, como Local (en casa) y como Visitante (fuera); se
        puede mover una columna arrastrando su título.
      </p>
      <p class="text-sm text-ink-tertiary mt-1">{{ config.descripcion }}</p>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantillas.length" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      {{ tabla === 'sanciones'
        ? 'No hay ninguna plantilla de Fútbol 11 (salvo Senior A) disponible en la temporada actual.'
        : 'No hay ninguna plantilla disponible en la temporada actual.' }}
    </div>

    <template v-if="plantillas.length && !error">
      <div class="flex flex-wrap items-center gap-4">
        <!-- Selector de plantilla (coordinadores/admin ven varias; un entrenador, solo la suya). -->
        <div v-if="hayVariasPlantillas" class="flex items-center gap-2">
          <label for="filtro-plantilla" class="text-sm font-medium text-ink-secondary">Categoría</label>
          <Select inputId="filtro-plantilla" v-model="idPlantilla" :options="opcionesPlantillas" optionLabel="label"
                  optionValue="value" @change="cambiarPlantilla" class="w-full sm:w-72" />
        </div>
        <div v-else class="text-sm text-ink-secondary">Categoría: <strong>{{ titulo }}</strong></div>

        <div v-if="plantillaActual" class="flex flex-wrap items-center gap-2">
          <label for="filtro-jugadores" class="text-sm font-medium text-ink-secondary">Jugadores</label>
          <MultiSelect inputId="filtro-jugadores" v-model="jugadoresFiltro" :options="opcionesJugadores" optionLabel="label"
                       optionValue="value" filter display="chip" :maxSelectedLabels="4" showClear
                       :placeholder="`Todos los jugadores de ${titulo}`" class="w-full sm:w-[28rem]" />
        </div>
      </div>

      <!-- Sanciones: primero el resumen del equipo (como en Senior A). -->
      <div v-if="tabla === 'sanciones'" class="flex flex-col gap-2">
        <h2 class="font-display text-lg text-club-green">Equipo</h2>
        <p class="text-sm text-ink-tertiary">
          Tarjetas del equipo por partido. TA / TR: amarillas y rojas de los jugadores del PALMA. Las medias son por
          partido jugado.
        </p>
        <div v-for="lado in LADOS_TABLA" :key="`eqresumen-${lado.clave}`" class="flex flex-col gap-2">
          <h3 class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
          <TablaEstadistica :filas="filasEquipo" :metricas="METRICAS_EQUIPO_RESUMEN" :soloGrupo="lado.clave"
                            :cargando="cargando" textoVacio="Todavía no hay partidos con resultado."
                            :columnaNombre="{ campo: 'equipo', titulo: 'Equipo' }" dataKey="id_plantilla" />
        </div>
      </div>

      <h2 v-if="tabla === 'sanciones'" class="mt-4 font-display text-lg text-club-green">Jugadores</h2>
      <template v-if="config.porLado">
        <div v-for="lado in LADOS_TABLA" :key="`${tabla}-${lado.clave}`" class="flex flex-col gap-2">
          <h3 v-if="tabla === 'sanciones'" class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
          <h2 v-else class="font-display text-lg text-club-green">{{ lado.titulo }}</h2>
          <TablaEstadistica :filas="filasDelLado(lado.sufijo)" :metricas="config.metricas" :soloGrupo="lado.clave"
                            :sortField="config.sortField" :cargando="cargando" :textoVacio="textoVacio"
                            :expandible="expandibleLado(lado.clave)">
            <template #detalle="{ data }">
              <PartidosJugadorEstadistica :partidos="partidosDelJugador(data, lado.clave)" :tipo="tabla" :conTitular="false" />
            </template>
          </TablaEstadistica>
        </div>
      </template>
      <TablaEstadistica v-else :key="tabla" :filas="filasTabla" :metricas="config.metricas" :sortField="config.sortField"
                        :cargando="cargando" :textoVacio="textoVacio" />
    </template>
  </div>
</SectionGuard>
</template>
