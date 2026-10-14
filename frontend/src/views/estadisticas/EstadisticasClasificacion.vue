<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Chart from 'primevue/chart';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useToast } from 'primevue/usetoast';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../../utils/cambioBus';
import { estiloTabla } from '../../utils/estiloTabla';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';

/** Estadísticas → Clasificación: posición del PALMA en la liga jornada a
 * jornada (plantilla Senior A de la temporada actual). Cada clasificación se
 * copia de RFAF una vez, con el botón, a partir del día siguiente al partido
 * de esa jornada. */
const SECCION = 'estadisticas_clasificacion';
const CATEGORIA = CATEGORIA_CON_MINUTOS;
const auth = useAuthStore();
const toast = useToast();

const plantilla = ref(null);
const datos = ref({ jornadas: [], ultima: null, siguiente: null });
const cargando = ref(false);
const guardando = ref(false);
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
const puedeGuardar = computed(() => auth.puedeEditar(SECCION) && siguiente.value?.disponible);

async function guardarJornada() {
  if (!plantilla.value || guardando.value) return;
  guardando.value = true;
  try {
    const r = await estadisticasService.guardarClasificacion(plantilla.value.id);
    toast.add({
      severity: 'success',
      summary: `Jornada ${r.jornada} guardada`,
      detail: `El PALMA va ${r.posicion}º de ${r.total_equipos} con ${r.puntos} puntos.`,
      life: 5000
    });
    // Recarga esta vista (está suscrita) y las demás que lo estén.
    emitirCambio();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo guardar', detail: err.response?.data?.message || 'Inténtalo de nuevo.', life: 7000 });
  } finally {
    guardando.value = false;
  }
}

// ---- Gráfica: posición por jornada (1º arriba) ----
// Canvas: el color va en JS (verde de marca, club-green).
const VERDE = '#0B3D2E';
const jornadas = computed(() => datos.value.jornadas.filter((j) => j.palma));
const totalEquipos = computed(() => Math.max(0, ...jornadas.value.map((j) => j.total_equipos)));

const datosGrafica = computed(() => ({
  labels: jornadas.value.map((j) => `J${j.jornada}`),
  datasets: [{
    label: 'Posición',
    data: jornadas.value.map((j) => j.palma.posicion),
    borderColor: VERDE,
    backgroundColor: VERDE,
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
    ctx.fillStyle = VERDE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    meta.data.forEach((punto, i) => ctx.fillText(`${jornadas.value[i].palma.posicion}º`, punto.x, punto.y - 8));
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
        label: (item) => `Posición: ${item.raw}º de ${jornadas.value[item.dataIndex].total_equipos}`,
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
          según la clasificación de RFAF. Cada jornada se guarda una vez con el botón, a partir del día siguiente a su partido.
        </p>
      </div>
      <div v-if="plantilla && siguiente && auth.puedeEditar(SECCION)" class="flex flex-col items-end gap-1">
        <Button :label="`Guardar clasificación jornada ${siguiente.jornada}`" icon="pi pi-download"
                :disabled="!puedeGuardar" :loading="guardando" @click="guardarJornada" />
        <small v-if="!siguiente.disponible && siguiente.desde" class="text-xs text-ink-tertiary">
          Disponible a partir del {{ formatoDia(siguiente.desde) }}
        </small>
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
        <DataTable v-bind="estiloTabla" :value="ultima.equipos" dataKey="equipo"
                   :rowClass="(e) => (e.es_palma ? '!bg-club-green/10 font-semibold' : '')">
          <Column field="posicion" header="Pos." style="width: 4rem" />
          <Column field="equipo" header="Equipo" style="min-width: 14rem" />
          <Column field="puntos" header="Pts" />
          <Column field="jugados" header="J" />
          <Column field="ganados" header="G" />
          <Column field="empatados" header="E" />
          <Column field="perdidos" header="P" />
          <Column field="goles_favor" header="GF" />
          <Column field="goles_contra" header="GC" />
          <Column header="Dif.">
            <template #body="{ data }">{{ data.goles_favor - data.goles_contra }}</template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</SectionGuard>
</template>
