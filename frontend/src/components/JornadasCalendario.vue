<script setup>
/**
 * Vista visual tipo calendario de las jornadas de liga.
 * Carga lazy: solo los datos de la jornada visible.
 * Solo lectura: la edición de partidos se hace en la sección Partidos.
 */
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import * as XLSX from '@e965/xlsx';
import EquipacionPrenda from './EquipacionPrenda.vue';
import {
  categoriaCalendarioService, plantillasService, equiposService, temporadasService
} from '../services';
import { useMediaQuery } from '../composables/useMediaQuery';
import { suscribirseCambio, emitirCambio } from '../utils/cambioBus';
import { filtrarPlantillasTemporadaActual, obtenerTemporadaActual } from '../utils/temporadaActual';

const esMovil = useMediaQuery('(max-width: 639px)');
const toast = useToast();

const plantillas = ref([]);
const temporadas = ref([]);
const equipos = ref([]);
const numerosJornada = ref([]);
const jornadaActual = ref([]);
const numPagina = ref(0);
const cargando = ref(false);
const cargandoJornada = ref(false);
const filtroPlantilla = ref(null);
let unsubCambio = null;

/** Al filtrar por categoría se listan todas sus jornadas de golpe, paginadas de 10 en 10. */
const BLOQUE_JORNADAS = 10;
const jornadasFiltradasLista = ref([]);
const cargandoListaFiltrada = ref(false);
const paginaBloque = ref(0);

async function cargarCatalogo() {
  const [pls, temps, eqs] = await Promise.all([
    plantillasService.listar(),
    temporadasService.listar(),
    equiposService.listar()
  ]);
  plantillas.value = pls;
  temporadas.value = temps;
  equipos.value = eqs;
}

async function cargarInit() {
  cargando.value = true;
  try {
    await cargarCatalogo();
    await cargarNumeros();
  } finally {
    cargando.value = false;
  }
}

async function cargarNumeros() {
  const params = {};
  if (filtroPlantilla.value) params.id_plantilla = filtroPlantilla.value;
  numerosJornada.value = await categoriaCalendarioService.listarNumeros(params);
  if (numPagina.value >= numerosJornada.value.length) numPagina.value = 0;
  if (filtroPlantilla.value) {
    await cargarListaFiltrada();
  } else {
    await cargarJornada();
  }
}

async function cargarListaFiltrada() {
  if (!filtroPlantilla.value) { jornadasFiltradasLista.value = []; return; }
  cargandoListaFiltrada.value = true;
  try {
    const items = await categoriaCalendarioService.listar({ id_plantilla: filtroPlantilla.value });
    jornadasFiltradasLista.value = items.slice().sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));
    paginaBloque.value = 0;
  } finally {
    cargandoListaFiltrada.value = false;
  }
}

async function cargarJornada() {
  const num = numerosJornada.value[numPagina.value];
  if (num == null) { jornadaActual.value = []; return; }
  cargandoJornada.value = true;
  try {
    const params = { jornada: num };
    if (filtroPlantilla.value) params.id_plantilla = filtroPlantilla.value;
    const items = await categoriaCalendarioService.listar(params);
    jornadaActual.value = items.sort((a, b) => {
      const ordenA = a.plantilla?.categoria?.orden ?? 999;
      const ordenB = b.plantilla?.categoria?.orden ?? 999;
      if (ordenA !== ordenB) return ordenA - ordenB;
      const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
      const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
      return fa - fb;
    });
  } finally {
    cargandoJornada.value = false;
  }
}

onMounted(async () => {
  await cargarInit();
  unsubCambio = suscribirseCambio(() => { cargarCatalogo(); cargarNumeros(); });
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

watch(filtroPlantilla, () => { cargarNumeros(); });

const opcionesPlantilla = computed(() =>
  filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value).map(p => ({
    label: `${p.categoria?.alias || p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const numActual = computed(() => numerosJornada.value[numPagina.value] || null);
const totalPaginas = computed(() => numerosJornada.value.length);
const temporadaActualNombre = computed(() => obtenerTemporadaActual(temporadas.value)?.nombre || '—');

/** Bloque de hasta 10 jornadas visible cuando se filtra por categoría. */
const totalBloques = computed(() => Math.max(1, Math.ceil(jornadasFiltradasLista.value.length / BLOQUE_JORNADAS)));
const bloqueVisible = computed(() =>
  jornadasFiltradasLista.value.slice(paginaBloque.value * BLOQUE_JORNADAS, (paginaBloque.value + 1) * BLOQUE_JORNADAS)
);
const categoriaFiltradaLabel = computed(() =>
  jornadasFiltradasLista.value[0] ? categoriaNombre(jornadasFiltradasLista.value[0]) : ''
);
const partidosVisibles = computed(() => filtroPlantilla.value ? bloqueVisible.value : jornadaActual.value);

function irBloque(idx) {
  if (idx >= 0 && idx < totalBloques.value && idx !== paginaBloque.value) {
    paginaBloque.value = idx;
  }
}
function bloqueAnterior() { irBloque(paginaBloque.value - 1); }
function bloqueSiguiente() { irBloque(paginaBloque.value + 1); }

/** Plantillas de la temporada actual sin partido creado en la jornada que se está viendo. */
const plantillasSinJornada = computed(() => {
  if (numActual.value == null || filtroPlantilla.value) return [];
  const base = filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value)
    .filter(p => !filtroPlantilla.value || p.id === filtroPlantilla.value);
  const idsConPartido = new Set(jornadaActual.value.map(j => j.id_plantilla));
  return base
    .filter(p => !idsConPartido.has(p.id))
    .map(p => p.categoria?.alias || p.categoria?.nombre || '—')
    .sort((a, b) => a.localeCompare(b, 'es'));
});

function irPagina(idx) {
  if (idx >= 0 && idx < totalPaginas.value && idx !== numPagina.value) {
    numPagina.value = idx;
    cargarJornada();
  }
}
function paginaAnterior() { irPagina(numPagina.value - 1); }
function paginaSiguiente() { irPagina(numPagina.value + 1); }

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function escudoEquipo(id) {
  return equipos.value.find(e => e.id === id)?.escudo || null;
}

function camisetaEquipo(id) {
  return equipos.value.find(e => e.id === id)?.camiseta || null;
}

function formatoFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
}

function formatoHora(hora) {
  if (!hora) return '';
  return String(hora).slice(0, 5);
}

function categoriaNombre(j) {
  return j.plantilla?.categoria?.alias || j.plantilla?.categoria?.nombre || '';
}

/** Mismo color de camiseta en ambos equipos: el visitante debe traer 2ª equipación. */
function colisionCamiseta(partido) {
  const local = camisetaEquipo(partido.id_equipo_local);
  const visitante = camisetaEquipo(partido.id_equipo_visitante);
  return !!local && !!visitante && local === visitante;
}

/** partidos.resultado se guarda como "golesLocal-golesVisitante" (p.ej. "2-1"). */
function golesResultado(resultado) {
  const m = String(resultado ?? '').trim().match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function golesLocalNum(partido) {
  return golesResultado(partido.resultado)?.[0] ?? null;
}

function golesVisitanteNum(partido) {
  return golesResultado(partido.resultado)?.[1] ?? null;
}

/** Azul si ese lado ganó, rojo si perdió, negro si empate. */
function claseResultado(partido, esLocal) {
  const goles = golesResultado(partido.resultado);
  if (!goles) return '';
  const [gl, gv] = goles;
  if (gl === gv) return 'gol-empate';
  const localGana = gl > gv;
  return (esLocal ? localGana : !localGana) ? 'gol-ganador' : 'gol-perdedor';
}

// ---------- Exportar a Excel ----------
const exportando = ref(false);

function formatoFechaExport(fecha) {
  if (!fecha) return '';
  const [y, m, d] = String(fecha).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

async function exportarExcel() {
  exportando.value = true;
  try {
    const params = {};
    if (filtroPlantilla.value) params.id_plantilla = filtroPlantilla.value;
    const items = await categoriaCalendarioService.listar(params);
    const filas = items
      .slice()
      .sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0) || String(a.fecha).localeCompare(String(b.fecha)))
      .map((j) => ({
        Jornada: j.jornada,
        Fecha: formatoFechaExport(j.fecha),
        'Equipo Local': nombreEquipo(j.id_equipo_local),
        'Equipo Visitante': nombreEquipo(j.id_equipo_visitante),
        Resultado: j.resultado || ''
      }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jornadas');
    XLSX.writeFile(wb, 'jornadas.xlsx');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el Excel.', life: 4000 });
  } finally {
    exportando.value = false;
  }
}

</script>

<template>
  <div class="bg-white rounded-xl border border-line p-4 mb-4">
    <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
      <h2 class="font-display text-lg text-club-green flex items-center gap-2">
        <i class="pi pi-calendar"></i>
        Jornadas de Liga
      </h2>
      <div class="flex items-center gap-2 flex-wrap">
        <Select
          v-model="filtroPlantilla"
          :options="opcionesPlantilla"
          optionLabel="label"
          optionValue="value"
          placeholder="Todas las categorías"
          class="w-full sm:w-52"
          showClear
        />
        <Button label="Exportar" icon="pi pi-file-export" size="small" outlined
                :loading="exportando"
                class="!text-club-green !border-club-green/50 hover:!bg-club-green/5"
                @click="exportarExcel" />
      </div>
    </div>

    <div v-if="cargando" class="text-center py-8 text-ink-tertiary">
      <i class="pi pi-spin pi-spinner text-xl block mb-2"></i>
      Cargando...
    </div>

    <div v-else-if="!numerosJornada.length" class="text-center py-8 text-ink-tertiary">
      <i class="pi pi-inbox text-2xl block mb-2"></i>
      No hay jornadas registradas.
    </div>

    <div v-else>
      <div v-if="filtroPlantilla ? cargandoListaFiltrada : cargandoJornada" class="text-center py-8 text-ink-tertiary">
        <i class="pi pi-spin pi-spinner text-xl block mb-2"></i>
        Cargando{{ filtroPlantilla ? '' : ` jornada ${numActual}` }}...
      </div>

      <Message v-if="plantillasSinJornada.length" severity="warn" :closable="false" class="mb-3">
        Sin partido en la jornada {{ numActual }}: {{ plantillasSinJornada.join(', ') }}
      </Message>

      <div class="jornada-bloque">
        <div class="jornada-header">
          <div class="jornada-header-lado jornada-header-izq">
            <span v-if="filtroPlantilla" class="jornada-num">{{ categoriaFiltradaLabel }}</span>
          </div>
          <div class="jornada-header-centro">
            <i class="pi pi-calendar"></i>
            <span>Jornada {{ numActual }} | {{ temporadaActualNombre }}</span>
          </div>
          <div class="jornada-header-lado jornada-header-der"></div>
        </div>

        <div v-if="!esMovil" class="jornada-partidos">
          <table class="jornada-tabla">
            <tbody>
              <tr v-for="partido in partidosVisibles" :key="partido.id">
                <td class="col-fecha">
                  <template v-if="partido.fecha">
                    <div class="text-[0.8rem] font-semibold text-club-green">{{ formatoFecha(partido.fecha) }}</div>
                    <div v-if="partido.hora" class="text-[0.8rem] text-ink-tertiary">{{ formatoHora(partido.hora) }}</div>
                  </template>
                </td>
                <td class="col-escudo">
                  <img v-if="escudoEquipo(partido.id_equipo_local)" :src="escudoEquipo(partido.id_equipo_local)"
                       alt="" class="equipo-escudo" />
                </td>
                <td class="col-equipacion">
                  <EquipacionPrenda tipo="camiseta" :color="camisetaEquipo(partido.id_equipo_local)" :size="35" />
                </td>
                <td class="col-nombre">{{ nombreEquipo(partido.id_equipo_local) }}</td>
                <td class="col-goles">
                  <span v-if="golesLocalNum(partido) !== null" class="gol-numero" :class="claseResultado(partido, true)">
                    {{ golesLocalNum(partido) }}
                  </span>
                </td>
                <td class="col-goles">
                  <span v-if="golesVisitanteNum(partido) !== null" class="gol-numero" :class="claseResultado(partido, false)">
                    {{ golesVisitanteNum(partido) }}
                  </span>
                </td>
                <td class="col-nombre">{{ nombreEquipo(partido.id_equipo_visitante) }}</td>
                <td class="col-equipacion">
                  <EquipacionPrenda tipo="camiseta" :color="camisetaEquipo(partido.id_equipo_visitante)" :size="35" />
                </td>
                <td class="col-escudo">
                  <img v-if="escudoEquipo(partido.id_equipo_visitante)" :src="escudoEquipo(partido.id_equipo_visitante)"
                       alt="" class="equipo-escudo" />
                </td>
                <td class="col-categoria">
                  <span v-if="categoriaNombre(partido)" class="partido-categoria">{{ categoriaNombre(partido) }}</span>
                  <i v-if="colisionCamiseta(partido)" class="pi pi-exclamation-triangle aviso-camiseta"
                     v-tooltip.top="'El equipo visitante tiene que traer 2ª Equipación'"></i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="jornada-partidos-movil">
          <div v-for="partido in partidosVisibles" :key="partido.id"
               class="bg-white rounded-xl border border-line p-3 relative partido-card-movil">
            <div class="flex">
              <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                <div class="flex items-center gap-2">
                  <img v-if="escudoEquipo(partido.id_equipo_local)" :src="escudoEquipo(partido.id_equipo_local)"
                       alt="" class="equipo-escudo" />
                  <span class="equipo-nombre">{{ nombreEquipo(partido.id_equipo_local) }}</span>
                </div>
                <div class="flex items-center justify-center gap-2">
                  <span v-if="golesLocalNum(partido) !== null" class="gol-numero" :class="claseResultado(partido, true)">
                    {{ golesLocalNum(partido) }}
                  </span>
                  <div v-if="filtroPlantilla" class="flex flex-col items-center">
                    <span class="partido-jornada-label">Jornada {{ partido.jornada }}</span>
                  </div>
                  <span v-if="golesVisitanteNum(partido) !== null" class="gol-numero" :class="claseResultado(partido, false)">
                    {{ golesVisitanteNum(partido) }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <img v-if="escudoEquipo(partido.id_equipo_visitante)" :src="escudoEquipo(partido.id_equipo_visitante)"
                       alt="" class="equipo-escudo" />
                  <span class="equipo-nombre">{{ nombreEquipo(partido.id_equipo_visitante) }}</span>
                </div>
              </div>
              <div class="border-l border-line flex flex-col items-center justify-center px-3 min-w-[64px] flex-shrink-0">
                <div v-if="partido.fecha" class="text-[0.8rem] font-semibold text-club-green text-center">{{ formatoFecha(partido.fecha) }}</div>
                <div v-if="partido.hora" class="text-[0.8rem] text-ink-tertiary">{{ formatoHora(partido.hora) }}</div>
              </div>
            </div>
            <div class="flex items-center justify-center gap-1 mt-2">
              <span v-if="categoriaNombre(partido)" class="partido-categoria">{{ categoriaNombre(partido) }}</span>
              <i v-if="colisionCamiseta(partido)" class="pi pi-exclamation-triangle aviso-camiseta"
                 v-tooltip.top="'El equipo visitante tiene que traer 2ª Equipación'"></i>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filtroPlantilla" class="flex items-center justify-center gap-2 mt-3">
        <Button icon="pi pi-angle-double-left" text rounded size="small"
                :disabled="paginaBloque <= 0" @click="irBloque(0)" />
        <Button icon="pi pi-chevron-left" text rounded size="small"
                :disabled="paginaBloque <= 0" @click="bloqueAnterior" />
        <span class="text-sm font-semibold text-club-green">
          Jornadas {{ paginaBloque * BLOQUE_JORNADAS + 1 }}-{{ Math.min((paginaBloque + 1) * BLOQUE_JORNADAS, jornadasFiltradasLista.length) }}
          <span class="text-xs font-normal text-ink-tertiary ml-1">
            ({{ paginaBloque + 1 }} / {{ totalBloques }})
          </span>
        </span>
        <Button icon="pi pi-chevron-right" text rounded size="small"
                :disabled="paginaBloque >= totalBloques - 1" @click="bloqueSiguiente" />
        <Button icon="pi pi-angle-double-right" text rounded size="small"
                :disabled="paginaBloque >= totalBloques - 1" @click="irBloque(totalBloques - 1)" />
      </div>
      <div v-else class="flex items-center justify-center gap-2 mt-3">
        <Button icon="pi pi-angle-double-left" text rounded size="small"
                :disabled="numPagina <= 0" @click="irPagina(0)" />
        <Button icon="pi pi-chevron-left" text rounded size="small"
                :disabled="numPagina <= 0" @click="paginaAnterior" />
        <span class="text-sm font-semibold text-club-green">
          Jornada {{ numActual }}
          <span class="text-xs font-normal text-ink-tertiary ml-1">
            ({{ numPagina + 1 }} / {{ totalPaginas }})
          </span>
        </span>
        <Button icon="pi pi-chevron-right" text rounded size="small"
                :disabled="numPagina >= totalPaginas - 1" @click="paginaSiguiente" />
        <Button icon="pi pi-angle-double-right" text rounded size="small"
                :disabled="numPagina >= totalPaginas - 1" @click="irPagina(totalPaginas - 1)" />
      </div>
    </div>

  </div>
</template>

<style scoped>
.jornada-bloque {
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  overflow: hidden;
}
.jornada-header {
  background: #0F3D22;
  color: #fff;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.jornada-header-lado {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}
.jornada-header-izq {
  justify-content: flex-start;
}
.jornada-header-der {
  justify-content: flex-end;
}
.jornada-header-centro {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 639px) {
  .jornada-header-centro {
    order: 3;
    flex-basis: 100%;
    margin-top: 4px;
  }
}
.jornada-num {
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}
.jornada-partidos {
  padding: 8px;
  overflow-x: auto;
}
.jornada-tabla {
  width: 100%;
  border-collapse: collapse;
}
.jornada-tabla tr {
  border-bottom: 1px solid #F1F5F9;
}
.jornada-tabla tr:last-child {
  border-bottom: none;
}
.jornada-tabla td {
  text-align: center;
  vertical-align: middle;
  padding: 6px 0;
}
.col-fecha {
  width: 10%;
  white-space: nowrap;
  padding: 0 10px;
}
.col-nombre {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1E293B;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-escudo {
  width: 3%;
}
.equipo-escudo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.col-equipacion {
  width: 6%;
}
.col-categoria {
  width: 10%;
}
.partido-jornada-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #0F3D22;
  white-space: nowrap;
}
.gol-numero {
  font-weight: 800;
}
.gol-ganador {
  color: #2563EB;
}
.gol-perdedor {
  color: #DC2626;
}
.gol-empate {
  color: #0F172A;
}
.partido-categoria {
  font-size: 0.8rem;
  font-weight: 600;
  color: #7C3AED;
  background: #EDE9FE;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.aviso-camiseta {
  color: #D97706;
  font-size: 0.9rem;
  margin-left: 6px;
  cursor: help;
}
.jornada-partidos-movil {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.equipo-nombre {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>
