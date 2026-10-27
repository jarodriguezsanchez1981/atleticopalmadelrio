<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useToast } from 'primevue/usetoast';
import { estadisticasService, plantillasService, temporadasService } from '../../services';
import TablaEstadistica from '../../components/TablaEstadistica.vue';
import { suscribirseCambio } from '../../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../../utils/temporadaActual';
import { CATEGORIA_CON_MINUTOS } from '../../utils/minutos';
import { METRICAS_GOLES_RIVALES, METRICAS_SANCIONES } from '../../utils/estadisticasMetricas';
import { construirHojaEstadistica, construirHojaSimple, descargarExcel, nombreFicheroExcel } from '../../utils/excelEstadisticas';

/** Estadísticas Senior A → Rivales: goles, tarjetas y jugadores de cada equipo
 * contrario en toda la liga de Senior A de la temporada actual (las actas de
 * todos los partidos, no solo los del PALMA), con las mismas columnas que las
 * tablas Goles y Sanciones de los jugadores (una fila por rival). Las actas se
 * copian solas de RFAF cada día (y la del PALMA, con "Finalizar Acta"). */
const SECCION = 'estadisticas_rivales';
const CATEGORIA = CATEGORIA_CON_MINUTOS;

const plantilla = ref(null);
const equipos = ref([]);
const jornadas = ref([]);
const actasPendientes = ref(0);
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
      : {};
    // Diferencia de goles (GF - GC) en Total, Local y Visitante.
    equipos.value = (datos.equipos || []).map((e) => {
      const fila = { ...e };
      for (const sufijo of ['', '_local', '_visitante']) {
        fila[`diferencia${sufijo}`] = (e[`goles_favor${sufijo}`] || 0) - (e[`goles_contra${sufijo}`] || 0);
      }
      return fila;
    });
    jornadas.value = datos.jornadas || [];
    actasPendientes.value = datos.actas_pendientes || 0;
  } catch (err) {
    equipos.value = [];
    jornadas.value = [];
    actasPendientes.value = 0;
    error.value = err.response?.data?.message || 'No se pudieron cargar las estadísticas de los rivales.';
  } finally {
    cargando.value = false;
  }
}

const titulo = computed(() => plantilla.value
  ? `${plantilla.value.categoria?.nombre} / ${plantilla.value.temporada?.nombre || ''}`
  : CATEGORIA);

/** "GARCIA LOPEZ, JUAN" (como viene en el acta) -> "Juan Garcia Lopez". */
function nombreJugador(nombre) {
  const [apellidos, nombrePila] = String(nombre || '').split(',').map((t) => t.trim());
  const capitalizar = (t) => t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return capitalizar(nombrePila ? `${nombrePila} ${apellidos}` : apellidos || '');
}

const COLUMNA_EQUIPO = { campo: 'equipo', titulo: 'Equipo' };
const LADOS_TABLA = [
  { clave: 'total', titulo: 'Total', sufijo: '' },
  { clave: 'local', titulo: 'Local', sufijo: '_local' },
  { clave: 'visitante', titulo: 'Visitante', sufijo: '_visitante' }
];
// Una tabla de goles y otra de tarjetas, cada una en Total / Local / Visitante.
// Salen todos los rivales de la liga en todas las tablas, también los que aún
// no tienen actas (a 0).
const BLOQUES = [
  {
    clave: 'goles',
    titulo: 'Goles',
    descripcion: 'Goles de cada rival en todos sus partidos de liga por tramos de 15 minutos dentro de cada parte (el tiempo añadido se suma al último tramo de su parte) y según los marcara un titular o un suplente. En Local / Visitante, "% de sus goles" es la parte de sus goles marcados en casa / fuera. "% por partido": partidos en los que marca algún gol. GF / GC salen del resultado (con los goles en propia puerta) y Dif. es GF - GC; los tramos y Tit. / Supl. no cuentan los de propia puerta.',
    metricas: METRICAS_GOLES_RIVALES,
    sortField: 'goles'
  },
  {
    clave: 'sanciones',
    titulo: 'Sanciones',
    descripcion: 'Tarjetas de los jugadores de cada rival en todos sus partidos de liga por parte del partido (1ª parte hasta el minuto 45), según las viera un titular o un suplente (las del suplente cuentan aunque no llegara a entrar) y según iba el marcador para ese equipo en ese momento (con empate no cuentan como ganando ni perdiendo).',
    metricas: METRICAS_SANCIONES,
    sortField: 'tarjetas_amarillas'
  }
];
const conJugadores = (fila) => (fila.jugadores || []).length > 0;
// Goles y Sanciones, cada uno en su pestaña.
const pestana = ref(BLOQUES[0].clave);

const COLUMNAS_JUGADORES = [
  { campo: 'equipo', titulo: 'Equipo' }, { campo: 'jugador', titulo: 'Jugador' }, { campo: 'convocatorias', titulo: 'Conv.' },
  { campo: 'partidos', titulo: 'Partidos' }, { campo: 'titular', titulo: 'Tit.' }, { campo: 'minutos', titulo: 'Min.' },
  { campo: 'goles', titulo: 'Goles' }, { campo: 'tarjetas_amarillas', titulo: 'TA' }, { campo: 'tarjetas_rojas', titulo: 'TR' }
];

// Exportar a Excel: cada tabla en su hoja, y una más con todos los jugadores.
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
    const jugadores = equipos.value.flatMap((e) => (e.jugadores || [])
      .map((j) => ({ ...j, equipo: e.equipo, jugador: nombreJugador(j.nombre) })));
    hojas.push({
      nombre: 'Jugadores',
      titulo: `Estadísticas Rivales · ${titulo.value} · Jugadores`,
      ...construirHojaSimple({ columnas: COLUMNAS_JUGADORES, filas: jugadores })
    });
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
          Goles, tarjetas y jugadores de cada equipo contrario en todos sus partidos de la liga de
          <strong>{{ titulo }}</strong> (no solo contra el PALMA), según las actas de RFAF. Local / Visitante: el equipo en
          casa / fuera. Salen todos los rivales de la liga. Pulsa en un equipo para ver sus jugadores. Se puede mover una
          columna arrastrando su título.
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
      <div v-if="!cargando" class="rounded-xl border border-line bg-white py-3 px-4 text-sm text-ink-tertiary">
        <i class="pi pi-info-circle mr-1" />
        <template v-if="jornadas.length">Con actas de las jornadas {{ jornadas[0] }} a {{ jornadas[jornadas.length - 1] }}.</template>
        <template v-else>Todavía no hay actas de la liga.</template>
        <template v-if="actasPendientes"> Quedan {{ actasPendientes }} actas por copiar de RFAF.</template>
        Las actas se copian solas de RFAF cada día desde las 10:00 (mientras falten, cada 30 minutos), poco a poco y con
        pausas; la del PALMA, al pulsar "Finalizar Acta".
      </div>

      <Tabs v-model:value="pestana">
        <TabList>
          <Tab v-for="b in BLOQUES" :key="b.clave" :value="b.clave">{{ b.titulo }}</Tab>
        </TabList>
        <TabPanels class="!px-0">
          <TabPanel v-for="b in BLOQUES" :key="b.clave" :value="b.clave">
            <div class="flex flex-col gap-2">
              <p class="text-sm text-ink-tertiary">{{ b.descripcion }}</p>
              <div v-for="lado in LADOS_TABLA" :key="`${b.clave}-${lado.clave}`" class="flex flex-col gap-2">
                <h3 class="font-display text-base text-ink-secondary">{{ lado.titulo }}</h3>
                <TablaEstadistica :filas="equipos" :metricas="b.metricas" :soloGrupo="lado.clave"
                                  :sortField="b.sortField" :cargando="cargando" :columnaNombre="COLUMNA_EQUIPO" dataKey="id_equipo"
                                  textoVacio="Todavía no hay actas de la liga." :expandible="lado.clave === 'total' ? conJugadores : null">
                  <template #detalle="{ data }">
                    <div class="overflow-x-auto py-1">
                      <table class="text-sm border-collapse">
                        <thead>
                          <tr class="text-xs text-ink-tertiary">
                            <th class="text-left font-medium px-2 py-1">Jugador</th>
                            <th class="text-center font-medium px-2 py-1" title="Convocatorias (en el acta)">Conv.</th>
                            <th class="text-center font-medium px-2 py-1" title="Partidos jugados (con minutos)">Partidos</th>
                            <th class="text-center font-medium px-2 py-1" title="Titular">Tit.</th>
                            <th class="text-center font-medium px-2 py-1" title="Minutos">Min.</th>
                            <th class="text-center font-medium px-2 py-1">Goles</th>
                            <th class="text-center font-medium px-2 py-1" title="Tarjetas amarillas">TA</th>
                            <th class="text-center font-medium px-2 py-1" title="Tarjetas rojas">TR</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="j in data.jugadores" :key="j.nombre" class="border-t border-line">
                            <td class="px-2 py-1 whitespace-nowrap">{{ nombreJugador(j.nombre) }}</td>
                            <td class="px-2 py-1 text-center">{{ j.convocatorias }}</td>
                            <td class="px-2 py-1 text-center">{{ j.partidos }}</td>
                            <td class="px-2 py-1 text-center">{{ j.titular }}</td>
                            <td class="px-2 py-1 text-center">{{ j.minutos }}</td>
                            <td class="px-2 py-1 text-center">{{ j.goles || '—' }}</td>
                            <td class="px-2 py-1 text-center">{{ j.tarjetas_amarillas || '—' }}</td>
                            <td class="px-2 py-1 text-center">{{ j.tarjetas_rojas || '—' }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>
                </TablaEstadistica>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</SectionGuard>
</template>
