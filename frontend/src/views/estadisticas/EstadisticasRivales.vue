<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import TablaEstadistica from '../../components/TablaEstadistica.vue';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';
import { METRICAS_GOLES, METRICAS_SANCIONES } from '../../utils/estadisticasMetricas';
import { construirHojaEstadistica, descargarExcel, nombreFicheroExcel } from '../../utils/excelEstadisticas';

/** Estadísticas Senior A → Rivales: goles y tarjetas de cada equipo contrario
 * de la plantilla Senior A de la temporada actual, con las mismas columnas que
 * las tablas Goles y Sanciones de los jugadores (una fila por rival). Los datos
 * del rival los guarda "Finalizar Acta". */
const SECCION = 'estadisticas_rivales';
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
const equipos = ref([]);
const partidosSinRival = ref(0);
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
    const datos = plantilla.value
      ? await estadisticasService.rivales({ id_plantilla: plantilla.value.id })
      : { equipos: [], partidos_sin_rival: 0 };
    equipos.value = datos.equipos || [];
    partidosSinRival.value = datos.partidos_sin_rival || 0;
  } catch (err) {
    equipos.value = [];
    partidosSinRival.value = 0;
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas de los rivales.';
  } finally {
    cargando.value = false;
  }
}

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

const COLUMNA_EQUIPO = { campo: 'equipo', titulo: 'Equipo' };
const LADOS_TABLA = [
  { clave: 'total', titulo: 'Total', sufijo: '' },
  { clave: 'local', titulo: 'Local', sufijo: '_local' },
  { clave: 'visitante', titulo: 'Visitante', sufijo: '_visitante' }
];
// Una tabla de goles y otra de tarjetas, cada una en Total / Local / Visitante.
// Salen todos los rivales del calendario de liga en todas las tablas, también
// los que aún no se han jugado (a 0).
const BLOQUES = [
  {
    clave: 'goles',
    titulo: 'Goles',
    descripcion: 'Goles de cada rival por tramos de 15 minutos dentro de cada parte (el tiempo añadido se suma al último tramo de su parte) y según los marcara un titular o un suplente. En Local / Visitante, "% de sus goles" es la parte de los goles del rival marcados con el PALMA en casa / fuera. "% por partido": partidos en los que marca algún gol. Las propias puertas del PALMA no cuentan.',
    metricas: METRICAS_GOLES,
    sortField: 'goles'
  },
  {
    clave: 'sanciones',
    titulo: 'Sanciones',
    descripcion: 'Tarjetas de los jugadores de cada rival por parte del partido (1ª parte hasta el minuto 45), según los marcara un titular o un suplente (las del suplente cuentan aunque no llegara a entrar) y según iba el marcador para el rival en ese momento (con empate no cuentan como ganando ni perdiendo).',
    metricas: METRICAS_SANCIONES,
    sortField: 'tarjetas_amarillas'
  }
];

// Exportar a Excel: cada tabla en su hoja.
const toast = useToast();
const exportando = ref(false);
async function exportarExcel() {
  exportando.value = true;
  try {
    const hojas = [];
    for (const b of BLOQUES) {
      for (const lado of LADOS_TABLA) {
        const nombre = `${b.titulo} ${lado.titulo}`;
        hojas.push({
          nombre,
          titulo: `Estadísticas Rivales · ${titulo.value} · ${nombre}`,
          ...construirHojaEstadistica({ metricas: b.metricas, filas: equipos.value, soloGrupo: lado.clave,
            sortField: b.sortField, columnaNombre: COLUMNA_EQUIPO })
        });
      }
    }
    await descargarExcel(nombreFicheroExcel('Estadísticas Rivales', titulo.value), hojas);
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
        <h1 class="font-display text-xl text-club-green">Estadísticas Rivales</h1>
        <p class="text-sm text-ink-tertiary">
          Goles y tarjetas de cada equipo contrario en los partidos de liga de <strong>{{ titulo }}</strong>, según las
          actas de RFAF (se rellenan al pulsar "Finalizar Acta" en cada partido). Local / Visitante: con el PALMA en
          casa / fuera. Salen todos los rivales del calendario de liga; los que aún no se han jugado, a 0. Se puede
          mover una columna arrastrando su título.
        </p>
      </div>
      <Button v-if="plantilla && !error" label="Exportar a Excel" icon="pi pi-file-excel" severity="secondary" outlined
              :loading="exportando" :disabled="cargando || !equipos.length" @click="exportarExcel" />
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">
      {{ error }} Recarga la página; si sigue pasando, revisa tus permisos de Estadísticas.
    </div>
    <div v-else-if="!cargando && !plantilla" class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
      No hay plantilla {{ CATEGORIA }} en la temporada actual.
    </div>

    <template v-if="plantilla && !error">
      <div v-if="partidosSinRival" class="rounded-xl border border-amber-200 bg-amber-50 py-3 px-4 text-sm text-amber-800">
        <i class="pi pi-info-circle mr-1" />
        {{ partidosSinRival === 1 ? 'Hay 1 partido finalizado' : `Hay ${partidosSinRival} partidos finalizados` }} antes de
        guardar los datos del rival: no tiene{{ partidosSinRival === 1 ? '' : 'n' }} sus tarjetas ni si quien marcó era
        titular o suplente. Vuelve a pulsar "Finalizar Acta" en {{ partidosSinRival === 1 ? 'ese partido' : 'esos partidos' }}
        para completarlos.
      </div>

      <div v-for="b in BLOQUES" :key="b.clave" class="flex flex-col gap-2">
        <h2 class="font-display text-lg text-club-green">{{ b.titulo }}</h2>
        <p class="text-sm text-ink-tertiary">{{ b.descripcion }}</p>
        <div v-for="lado in LADOS_TABLA" :key="`${b.clave}-${lado.clave}`" class="flex flex-col gap-2">
          <h3 class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
          <TablaEstadistica :filas="equipos" :metricas="b.metricas" :soloGrupo="lado.clave"
                            :sortField="b.sortField" :cargando="cargando" :columnaNombre="COLUMNA_EQUIPO" dataKey="id_equipo"
                            textoVacio="Todavía no hay partidos finalizados." />
        </div>
      </div>
    </template>
  </div>
</SectionGuard>
</template>
