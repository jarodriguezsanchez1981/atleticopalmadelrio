<script setup>
/**
 * Vista visual tipo calendario de las jornadas de liga.
 * Carga lazy: solo los datos de la jornada visible.
 */
import { ref, onMounted, computed, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { categoriaCalendarioService, plantillasService, equiposService } from '../services';
import { useMediaQuery } from '../composables/useMediaQuery';

const esMovil = useMediaQuery('(max-width: 639px)');

const plantillas = ref([]);
const equipos = ref([]);
const numerosJornada = ref([]);
const jornadaActual = ref([]);
const numPagina = ref(0);
const cargando = ref(false);
const cargandoJornada = ref(false);
const filtroPlantilla = ref(null);

async function cargarInit() {
  cargando.value = true;
  try {
    const [pls, eqs] = await Promise.all([
      plantillasService.listar(),
      equiposService.listar()
    ]);
    plantillas.value = pls;
    equipos.value = eqs;
    await cargarNumeros();
  } finally {
    cargando.value = false;
  }
}

async function cargarNumeros() {
  const params = {};
  if (filtroPlantilla.value) params.id_plantilla = filtroPlantilla.value;
  numerosJornada.value = await categoriaCalendarioService.listarNumeros(params);
  numPagina.value = 0;
  await cargarJornada();
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

onMounted(cargarInit);

watch(filtroPlantilla, () => cargarNumeros());

const opcionesPlantilla = computed(() =>
  plantillas.value.map(p => ({
    label: `${p.categoria?.alias || p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const numActual = computed(() => numerosJornada.value[numPagina.value] || null);
const totalPaginas = computed(() => numerosJornada.value.length);

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
</script>

<template>
  <div class="bg-white rounded-xl border border-line p-4 mb-4">
    <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
      <h2 class="font-display text-lg text-club-green flex items-center gap-2">
        <i class="pi pi-calendar"></i>
        Jornadas de Liga
      </h2>
      <div class="flex items-center gap-2">
        <Select
          v-model="filtroPlantilla"
          :options="opcionesPlantilla"
          optionLabel="label"
          optionValue="value"
          placeholder="Todas las categorías"
          class="w-full sm:w-52"
          showClear
        />
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
      <div v-if="cargandoJornada" class="text-center py-8 text-ink-tertiary">
        <i class="pi pi-spin pi-spinner text-xl block mb-2"></i>
        Cargando jornada {{ numActual }}...
      </div>

      <div v-else class="jornada-bloque">
        <div class="jornada-header">
          <span class="jornada-num">J {{ numActual }}</span>
          <span class="text-xs text-white/80">{{ jornadaActual.length }} partido{{ jornadaActual.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="jornada-partidos">
          <div v-for="partido in jornadaActual" :key="partido.id" class="partido-card">
            <div class="partido-fecha" v-if="partido.fecha">
              <div class="text-xs font-semibold text-club-green">{{ formatoFecha(partido.fecha) }}</div>
              <div v-if="partido.hora" class="text-[0.65rem] text-ink-tertiary">{{ formatoHora(partido.hora) }}</div>
            </div>
            <div class="partido-equipos">
              <div class="equipo">
                <img v-if="escudoEquipo(partido.id_equipo_local)" :src="escudoEquipo(partido.id_equipo_local)"
                     alt="" class="equipo-escudo" />
                <span class="equipo-nombre">{{ nombreEquipo(partido.id_equipo_local) }}</span>
              </div>
              <div class="partido-vs">vs</div>
              <div class="equipo">
                <img v-if="escudoEquipo(partido.id_equipo_visitante)" :src="escudoEquipo(partido.id_equipo_visitante)"
                     alt="" class="equipo-escudo" />
                <span class="equipo-nombre">{{ nombreEquipo(partido.id_equipo_visitante) }}</span>
              </div>
            </div>
            <div v-if="categoriaNombre(partido)" class="partido-categoria">
              {{ categoriaNombre(partido) }}
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 mt-3">
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
  background: #0B3D2E;
  color: #fff;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.jornada-num {
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}
.jornada-partidos {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.partido-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #F1F5F9;
  border-radius: 6px;
  background: #FAFAF8;
}
.partido-fecha {
  min-width: 60px;
  text-align: center;
  flex-shrink: 0;
}
.partido-equipos {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.equipo {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.equipo:last-child {
  flex-direction: row-reverse;
  text-align: right;
}
.equipo-escudo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
}
.equipo-nombre {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.partido-vs {
  font-size: 0.65rem;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  flex-shrink: 0;
}
.partido-categoria {
  font-size: 0.6rem;
  font-weight: 600;
  color: #7C3AED;
  background: #EDE9FE;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 639px) {
  .partido-card {
    flex-wrap: wrap;
  }
  .partido-fecha {
    min-width: auto;
    width: 100%;
    text-align: left;
    display: flex;
    gap: 6px;
    align-items: center;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 4px;
    margin-bottom: 2px;
  }
  .equipo-nombre {
    font-size: 0.7rem;
  }
}
</style>
