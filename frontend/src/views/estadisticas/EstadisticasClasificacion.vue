<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Chart from 'primevue/chart';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';
import { estiloTabla } from '../../utils/estiloTabla';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';
import { colorPosicion, jornadasDescanso } from '../../utils/colorPosicion';
import { construirHojaSimple, descargarExcel, nombreFicheroExcel } from '../../utils/excelEstadisticas';
import UltimosPartidos from '../../components/UltimosPartidos.vue';

/** Estadísticas → Clasificación: posición del PALMA en la liga jornada a
 * jornada (plantilla Senior A de la temporada actual). El servidor copia cada
 * clasificación de RFAF él solo, el día siguiente al partido a las 10:00. */
const SECCION = 'estadisticas_clasificacion';
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
const datos = ref({ jornadas: [], ultima: null, siguiente: null });
const cargando = ref(false);
const error = ref('');
let unsubCambio = null;

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const [plantillas, temporadas] = await Promise.all([plantillasService.listar({ basico: 1 }), temporadasService.listar()]);
    plantilla.value = filtrarPlantillasTemporadaActual(plantillas, temporadas)
      .find((p) => p.categoria?.nombre === CATEGORIA) || null;
    datos.value = plantilla.value
      ? await estadisticasService.clasificacion({ id_plantilla: plantilla.value.id })
      : { jornadas: [], ultima: null, siguiente: null };
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo cargar la clasificación.';
  } finally {
    cargando.value = false;
  }
}

const formatoDia = (dia) => (dia ? String(dia).slice(0, 10).split('-').reverse().join('/') : '');

const siguiente = computed(() => datos.value.siguiente);
// ---- Gráfica: posición por jornada (1º arriba) ----
// Canvas: el color va en JS (verde de marca, club-green).
const VERDE = '#0B3D2E';
const jornadas = computed(() => datos.value.jornadas.filter((j) => j.palma));
const totalEquipos = computed(() => Math.max(0, ...jornadas.value.map((j) => j.total_equipos)));
const posiciones = computed(() => jornadas.value.map((j) => j.palma.posicion));
// Jornadas en las que descansó: van en amarillo aunque baje de puesto.
const descansos = computed(() => jornadasDescanso(jornadas.value.map((j) => j.palma.jugados)));
// Color de cada jornada: subió (mejor puesto) verde, bajó rojo, igual amarillo.
const coloresPuntos = computed(() => posiciones.value.map((_, i) => colorPosicion(posiciones.value, i, descansos.value)));

const datosGrafica = computed(() => ({
  labels: jornadas.value.map((j) => `J${j.jornada}`),
  datasets: [{
    label: 'Posición',
    data: posiciones.value,
    borderColor: VERDE,
    backgroundColor: VERDE,
    pointBackgroundColor: coloresPuntos.value,
    pointBorderColor: coloresPuntos.value,
    // Cada tramo se pinta según el cambio de posición entre sus dos jornadas.
    segment: { borderColor: (ctx) => colorPosicion(posiciones.value, ctx.p1DataIndex, descansos.value) },
    pointRadius: 5,
    pointHoverRadius: 7,
    tension: 0.2
  }]
}));

// Número de la posición encima de cada punto.
const etiquetas = {
  id: 'posiciones',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    meta.data.forEach((punto, i) => {
      ctx.fillStyle = colorPosicion(posiciones.value, i, descansos.value);
      ctx.fillText(`${jornadas.value[i].palma.posicion}º`, punto.x, punto.y - 8);
    });
    ctx.restore();
  }
};

const opciones = computed(() => ({
  maintainAspectRatio: false,
  layout: { padding: { top: 16 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items) => {
          const j = jornadas.value[items[0].dataIndex];
          return `Jornada ${j.jornada}${j.fecha ? ` (${formatoDia(j.fecha)})` : ''}`;
        },
        label: (item) => `Posición: ${item.raw}º de ${jornadas.value[item.dataIndex].total_equipos}${descansos.value[item.dataIndex] ? ' (descansa)' : ''}`,
        afterLabel: (item) => {
          const p = jornadas.value[item.dataIndex].palma;
          return [`Puntos: ${p.puntos}`, `J ${p.jugados} · G ${p.ganados} · E ${p.empatados} · P ${p.perdidos}`,
            `Goles: ${p.goles_favor} - ${p.goles_contra}`];
        }
      }
    }
  },
  scales: {
    y: {
      reverse: true,
      min: 1,
      max: totalEquipos.value || undefined,
      ticks: { stepSize: 1, precision: 0, callback: (v) => `${v}º` },
      title: { display: true, text: 'Posición' }
    },
    x: { ticks: { autoSkip: false } }
  }
}));

const ultima = computed(() => datos.value.ultima);
// Filas de la tabla con la diferencia de goles ya calculada (para ordenar por ella).
const equiposTabla = computed(() => (ultima.value?.equipos || [])
  .map((e) => ({
    ...e,
    diferencia: e.goles_favor - e.goles_contra,
    // Para el Excel: "G (J7: LOCAL 2 - 1 VISITANTE) · E (…)".
    ultimos_texto: (e.ultimos || []).map((u) => (u.partido ? `${u.resultado} (J${u.jornada}: ${u.partido})` : u.resultado)).join(' · ')
  })));

// Exportar a Excel: la tabla de la clasificación y, en otra hoja, la evolución
// jornada a jornada (los datos de la gráfica).
const toast = useToast();
const exportando = ref(false);
const COLUMNAS_CLASIFICACION = [
  { campo: 'posicion', titulo: 'Pos.' }, { campo: 'equipo', titulo: 'Equipo' }, { campo: 'puntos', titulo: 'Pts' },
  { campo: 'jugados', titulo: 'J' }, { campo: 'ganados', titulo: 'G' }, { campo: 'empatados', titulo: 'E' },
  { campo: 'perdidos', titulo: 'P' }, { campo: 'goles_favor', titulo: 'GF' }, { campo: 'goles_contra', titulo: 'GC' },
  { campo: 'diferencia', titulo: 'Dif.' }, { campo: 'ultimos_texto', titulo: 'Últimos partidos' }
];
const COLUMNAS_EVOLUCION = [
  { campo: 'jornada', titulo: 'Jornada' }, { campo: 'fecha', titulo: 'Fecha' }, { campo: 'posicion', titulo: 'Posición' },
  { campo: 'total_equipos', titulo: 'Equipos' }, ...COLUMNAS_CLASIFICACION.slice(2, -1)
];
async function exportarExcel() {
  exportando.value = true;
  try {
    const nombre = `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`;
    const hojas = [];
    if (ultima.value) {
      hojas.push({ nombre: 'Clasificación', titulo: `Clasificación tras la jornada ${ultima.value.jornada} · ${nombre}`,
        ...construirHojaSimple({ columnas: COLUMNAS_CLASIFICACION, filas: equiposTabla.value }) });
    }
    const evolucion = jornadas.value.map((j) => ({ ...j.palma, jornada: j.jornada, fecha: formatoDia(j.fecha),
      total_equipos: j.total_equipos, diferencia: j.palma.goles_favor - j.palma.goles_contra }));
    hojas.push({ nombre: 'Evolución', titulo: `Posición del PALMA jornada a jornada · ${nombre}`,
      ...construirHojaSimple({ columnas: COLUMNAS_EVOLUCION, filas: evolucion }) });
    await descargarExcel(nombreFicheroExcel('Estadísticas Clasificación', nombre), hojas);
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el Excel.', life: 4000 });
  } finally {
    exportando.value = false;
  }
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
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-xl text-club-green">Estadísticas Clasificación</h1>
        <p class="text-sm text-ink-tertiary">
          Posición del PALMA en la liga jornada a jornada
          <template v-if="plantilla">(<strong>{{ plantilla.categoria?.nombre }} / {{ plantilla.temporada?.nombre }}</strong>)</template>,
          según la clasificación de RFAF. Cada jornada se guarda automáticamente el día siguiente a su partido a las 10:00.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button v-if="plantilla" label="Exportar a Excel" icon="pi pi-file-excel"
                :loading="exportando" :disabled="cargando || !jornadas.length" @click="exportarExcel" />
        <div v-if="plantilla && siguiente" class="rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-tertiary">
          <i class="pi pi-clock mr-1" />
          <template v-if="siguiente.disponible">Jornada {{ siguiente.jornada }} pendiente: se guardará en la próxima actualización (10:00).</template>
          <template v-else-if="siguiente.desde">Jornada {{ siguiente.jornada }}: se guardará el {{ formatoDia(siguiente.desde) }} a las 10:00.</template>
        </div>
      </div>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">{{ error }}</div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>

    <template v-else-if="plantilla">
      <div class="rounded-xl border border-line bg-white p-4">
        <div v-if="!jornadas.length" class="text-sm text-ink-tertiary py-6 text-center">
          {{ cargando ? 'Cargando…' : 'Todavía no hay ninguna jornada guardada.' }}
        </div>
        <div v-else class="h-80">
          <Chart type="line" :data="datosGrafica" :options="opciones" :plugins="[etiquetas]" class="h-full" />
        </div>
      </div>

      <div v-if="ultima" class="flex flex-col gap-2">
        <h2 class="font-display text-lg text-club-green">
          Clasificación tras la jornada {{ ultima.jornada }}<template v-if="ultima.fecha"> ({{ formatoDia(ultima.fecha) }})</template>
        </h2>
        <DataTable v-bind="estiloTabla" :value="equiposTabla" dataKey="equipo" removableSort
                   :rowClass="(e) => (e.es_palma ? '!bg-club-green/10 font-semibold' : '')">
          <Column field="posicion" header="Pos." style="width: 4rem" sortable />
          <Column field="equipo" header="Equipo" style="min-width: 14rem" sortable />
          <Column field="puntos" header="Pts" sortable />
          <Column field="jugados" header="J" sortable />
          <Column field="ganados" header="G" sortable />
          <Column field="empatados" header="E" sortable />
          <Column field="perdidos" header="P" sortable />
          <Column field="goles_favor" header="GF" sortable />
          <Column field="goles_contra" header="GC" sortable />
          <Column field="diferencia" header="Dif." sortable />
          <Column header="Últimos partidos" style="min-width: 9rem">
            <template #body="{ data }"><UltimosPartidos :ultimos="data.ultimos || []" /></template>
          </Column>
        </DataTable>
        <p class="text-xs text-ink-tertiary">
          Últimos partidos: los 5 últimos resultados de cada equipo (el más reciente a la derecha): G ganado, E empate y
          P perdido. Salen de comparar cada jornada guardada con la anterior; las jornadas en las que descansa no cuentan. Pasa el ratón por un cuadrado para ver el partido y su marcador.
        </p>
      </div>
    </template>
  </div>
</SectionGuard>
</template>
