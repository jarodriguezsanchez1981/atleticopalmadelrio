<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { temporadasService, plantillasService, partidosService, convocatoriasService } from '../services';
import { escudoEquipo, cargarEscudos } from '../utils/escudosEquipos';

const PALMA_ID = 73;

const props = defineProps({
  visible: { type: Boolean, default: false },
  registroId: { type: [Number, String], default: null },
  soloLectura: { type: Boolean, default: false }
});
const emit = defineEmits(['update:visible', 'saved']);

const toast = useToast();

const temporadas = ref([]);
const plantillas = ref([]);
const partidosConConvocatoria = ref(new Set());
const partidosPlantilla = ref([]);
const cargandoCatalogo = ref(false);
const cargandoPartidos = ref(false);
const guardando = ref(false);

const form = ref({ id_temporada: null, id_plantilla: null, id_partido: null });
const jugadoresConvocados = ref([]); // array de id_jugador
const nuevoJugador = ref(null);
const keySelectJugador = ref(0);
const partidoSeleccionado = ref(null);

const jugadoresNoConvocados = ref([]); // array de { id_jugador, observaciones }
const nuevoNoConvocado = ref(null);
const observacionesNuevoNoConvocado = ref('');
const keySelectNoConvocado = ref(0);

// Promoción (solo al crear): jugadores de otra plantilla de la misma temporada
// con categoría de orden igual o inferior; se guardan en la tabla promociones.
const plantillaPromocion = ref(null);
const nuevoPromocionado = ref(null);
const keySelectPromocionado = ref(0);
const jugadoresPromocion = ref([]); // array de { id_plantilla, id_jugador }

const modoEdicion = computed(() => !!props.registroId);

function resetForm() {
  form.value = { id_temporada: null, id_plantilla: null, id_partido: null };
  jugadoresConvocados.value = [];
  jugadoresNoConvocados.value = [];
  partidosPlantilla.value = [];
  partidoSeleccionado.value = null;
  nuevoJugador.value = null;
  nuevoNoConvocado.value = null;
  observacionesNuevoNoConvocado.value = '';
  resetPromocion();
}

function resetPromocion() {
  plantillaPromocion.value = null;
  nuevoPromocionado.value = null;
  jugadoresPromocion.value = [];
}

async function cargarCatalogo() {
  cargandoCatalogo.value = true;
  try {
    const [temps, pls, convs] = await Promise.all([
      temporadasService.listar(), plantillasService.listar(), convocatoriasService.listar()
    ]);
    temporadas.value = temps;
    plantillas.value = pls;
    partidosConConvocatoria.value = new Set(
      convs.filter((c) => c.id !== Number(props.registroId)).map((c) => c.id_partido)
    );
  } finally {
    cargandoCatalogo.value = false;
  }
}

async function cargarPartidosDePlantilla(idPlantilla) {
  if (!idPlantilla) { partidosPlantilla.value = []; return; }
  cargandoPartidos.value = true;
  try {
    const todos = await partidosService.listar({ id_plantilla: idPlantilla });
    // Solo partidos de liga (con jornada), y que no tengan ya una convocatoria
    // (salvo que sea la propia convocatoria que se está editando).
    partidosPlantilla.value = todos
      .filter((p) => p.jornada != null && !partidosConConvocatoria.value.has(p.id))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } finally {
    cargandoPartidos.value = false;
  }
  // Los escudos no vienen en el listado de partidos; si no se pueden cargar
  // (p.ej. sin permiso de calendario) se pinta un escudo genérico.
  const idsEquipos = partidosPlantilla.value.flatMap((p) => [p.id_equipo_local, p.id_equipo_visitante]);
  cargarEscudos(idsEquipos).catch(() => {});
}

/** Partidos que se muestran: al crear, los disponibles de hoy en adelante; al
 * editar o ver, solo el de la convocatoria (no se puede cambiar). */
const partidosVisibles = computed(() =>
  (modoEdicion.value || props.soloLectura)
    ? partidosPlantilla.value.filter((p) => p.id === form.value.id_partido)
    : partidosPlantilla.value.filter((p) => !esPasado(p))
);

/** Con hora asignada, el partido ha pasado en cuanto llega esa hora; sin hora
 * (guardado a las 00:00 UTC, ver horaPartido) se sigue mostrando todo el día. */
function esPasado(partido) {
  const d = new Date(partido.fecha);
  const sinHora = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
  return sinHora ? d < new Date(new Date().toDateString()) : d < new Date();
}

function seleccionarPartido(partido) {
  if (modoEdicion.value || props.soloLectura) return;
  partidoSeleccionado.value = partido;
}

function escudoDe(idEquipo) {
  if (Number(idEquipo) === PALMA_ID) return escudoEquipo(idEquipo) || '/escudo.png';
  return escudoEquipo(idEquipo);
}

const formatoDia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
function diaPartido(fecha) {
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? '—' : formatoDia.format(d).replace(/\./g, '');
}
function horaPartido(fecha) {
  const d = new Date(fecha);
  // Sin hora asignada el partido se guarda a las 00:00 UTC (que en España se
  // vería como 01:00/02:00): se muestra como pendiente en vez de esa hora falsa.
  if (Number.isNaN(d.getTime()) || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0)) return 'Hora por confirmar';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function cargarRegistro() {
  if (!props.registroId) return;
  const item = await convocatoriasService.obtener(props.registroId);
  form.value = {
    id_temporada: item.id_temporada ?? item.temporada?.id ?? null,
    id_plantilla: item.id_plantilla ?? item.plantilla?.id ?? null,
    id_partido: item.id_partido ?? item.partido?.id ?? null
  };
  jugadoresConvocados.value = (item.jugadores || []).map((j) => j.id_jugador);
  jugadoresNoConvocados.value = (item.noConvocados || []).map((n) => ({
    id_jugador: n.id_jugador,
    observaciones: n.observaciones || ''
  }));
  jugadoresPromocion.value = (item.promocionados || []).map((p) => ({
    id_plantilla: p.id_plantilla,
    id_jugador: p.id_jugador,
    nombre: p.jugador ? `${p.jugador.nombre} ${p.jugador.apellidos}` : null
  }));
  await cargarPartidosDePlantilla(form.value.id_plantilla);
  partidoSeleccionado.value = partidosPlantilla.value.find((p) => p.id === form.value.id_partido) || null;
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    resetForm();
    await cargarCatalogo();
    await cargarRegistro();
  }
);

const opcionesTemporada = computed(() =>
  temporadas.value
    .map((t) => ({ label: t.nombre, value: t.id }))
    .sort((a, b) => b.label.localeCompare(a.label, 'es'))
);

const opcionesPlantilla = computed(() => {
  if (!form.value.id_temporada) return [];
  return plantillas.value
    .filter((p) => Number(p.id_temporada) === Number(form.value.id_temporada))
    .map((p) => ({ label: p.categoria?.nombre || p.categoria?.alias || `Plantilla ${p.id}`, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const plantillaSeleccionada = computed(() =>
  plantillas.value.find((p) => p.id === form.value.id_plantilla)
);

const jugadoresPlantilla = computed(() =>
  (plantillaSeleccionada.value?.jugadores || [])
    .map((j) => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos }))
    .sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'))
);

// El desplegable de "convocados" excluye solo a quien ya está convocado: a un
// jugador que está en "no convocados" se le puede elegir igual, lo que lo
// convoca directamente (ver addJugador). El de "no convocados", en cambio,
// excluye a cualquiera de las dos listas: para marcar como no convocado a
// alguien ya convocado hay que quitarlo antes de "Jugadores convocados".
const opcionesJugadorDisponible = computed(() => {
  const usados = new Set(jugadoresConvocados.value);
  return jugadoresPlantilla.value
    .filter((j) => !usados.has(j.id))
    .map((j) => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }));
});

const opcionesJugadorDisponibleNoConv = computed(() => {
  const usados = new Set([
    ...jugadoresConvocados.value,
    ...jugadoresNoConvocados.value.map((n) => n.id_jugador)
  ]);
  return jugadoresPlantilla.value
    .filter((j) => !usados.has(j.id))
    .map((j) => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }));
});

function etiquetaPlantilla(p) {
  return p?.categoria?.nombre || p?.categoria?.alias || `Plantilla ${p?.id}`;
}

const opcionesPlantillaPromocion = computed(() => {
  const destino = plantillaSeleccionada.value;
  if (!destino) return [];
  const ordenDestino = Number(destino.categoria?.orden);
  return plantillas.value
    .filter((p) => p.id !== destino.id
      && Number(p.id_temporada) === Number(destino.id_temporada)
      && Number(p.categoria?.orden) <= ordenDestino)
    .sort((a, b) => Number(b.categoria?.orden) - Number(a.categoria?.orden))
    .map((p) => ({ label: etiquetaPlantilla(p), value: p.id }));
});

const opcionesJugadorPromocion = computed(() => {
  const origen = plantillas.value.find((p) => p.id === plantillaPromocion.value);
  const usados = new Set(jugadoresPromocion.value.map((x) => x.id_jugador));
  return (origen?.jugadores || [])
    .filter((j) => !usados.has(j.id))
    .sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'))
    .map((j) => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }));
});

function nombreJugadorPromocion(item) {
  if (item.nombre) return item.nombre;
  const origen = plantillas.value.find((p) => p.id === item.id_plantilla);
  const j = (origen?.jugadores || []).find((x) => x.id === item.id_jugador);
  return j ? `${j.nombre} ${j.apellidos}` : `Jugador ${item.id_jugador}`;
}

function plantillaPromocionLabel(idPlantilla) {
  return etiquetaPlantilla(plantillas.value.find((p) => p.id === idPlantilla));
}

const jugadoresPromocionOrdenados = computed(() =>
  [...jugadoresPromocion.value].sort((a, b) => nombreJugadorPromocion(a).localeCompare(nombreJugadorPromocion(b), 'es'))
);

function nombreJugador(id) {
  const j = jugadoresPlantilla.value.find((x) => x.id === id);
  return j ? `${j.nombre} ${j.apellidos}` : `Jugador ${id}`;
}

// Listas ordenadas alfabéticamente (por apellidos) para mostrar en editar/ver.
const jugadoresConvocadosOrdenados = computed(() =>
  [...jugadoresConvocados.value].sort((a, b) => nombreJugador(a).localeCompare(nombreJugador(b), 'es'))
);
const jugadoresNoConvocadosOrdenados = computed(() =>
  [...jugadoresNoConvocados.value].sort((a, b) => nombreJugador(a.id_jugador).localeCompare(nombreJugador(b.id_jugador), 'es'))
);

async function onTemporadaChange() {
  form.value.id_plantilla = null;
  form.value.id_partido = null;
  partidoSeleccionado.value = null;
  partidosPlantilla.value = [];
  jugadoresConvocados.value = [];
  resetPromocion();
}

async function onPlantillaChange() {
  form.value.id_partido = null;
  partidoSeleccionado.value = null;
  jugadoresConvocados.value = [];
  resetPromocion();
  await cargarPartidosDePlantilla(form.value.id_plantilla);
}

watch(partidoSeleccionado, (p) => {
  form.value.id_partido = p?.id ?? null;
});

function addJugador() {
  if (!nuevoJugador.value) {
    toast.add({ severity: 'warn', summary: 'Selecciona un jugador', detail: 'Elige un jugador de la lista antes de pulsar Añadir.', life: 4000 });
    return;
  }
  if (!jugadoresConvocados.value.includes(nuevoJugador.value)) {
    jugadoresConvocados.value.push(nuevoJugador.value);
    toast.add({ severity: 'success', summary: 'Añadido', detail: `${nombreJugador(nuevoJugador.value)} añadido a convocados.`, life: 2500 });
  }
  // Un jugador convocado no puede seguir figurando como no convocado.
  jugadoresNoConvocados.value = jugadoresNoConvocados.value.filter((n) => n.id_jugador !== nuevoJugador.value);
  nuevoJugador.value = null;
  keySelectJugador.value += 1;
}

function removeJugador(id) {
  jugadoresConvocados.value = jugadoresConvocados.value.filter((x) => x !== id);
}

function plantillaCompleta() {
  jugadoresConvocados.value = jugadoresPlantilla.value.map((j) => j.id);
  jugadoresNoConvocados.value = [];
}

function addNoConvocado() {
  if (!nuevoNoConvocado.value) {
    toast.add({ severity: 'warn', summary: 'Selecciona un jugador', detail: 'Elige un jugador de la lista antes de pulsar Añadir.', life: 4000 });
    return;
  }
  const idAgregado = nuevoNoConvocado.value;
  if (!jugadoresNoConvocados.value.some((n) => n.id_jugador === idAgregado)) {
    jugadoresNoConvocados.value.push({
      id_jugador: idAgregado,
      observaciones: observacionesNuevoNoConvocado.value.trim()
    });
    toast.add({ severity: 'success', summary: 'Añadido', detail: `${nombreJugador(idAgregado)} añadido a no convocados.`, life: 2500 });
  }
  nuevoNoConvocado.value = null;
  observacionesNuevoNoConvocado.value = '';
  keySelectNoConvocado.value += 1;
}

function removeNoConvocado(id) {
  jugadoresNoConvocados.value = jugadoresNoConvocados.value.filter((n) => n.id_jugador !== id);
}

function onPlantillaPromocionChange() {
  nuevoPromocionado.value = null;
  keySelectPromocionado.value += 1;
}

function addPromocionado() {
  if (!nuevoPromocionado.value) {
    toast.add({ severity: 'warn', summary: 'Selecciona un jugador', detail: 'Elige un jugador de la lista antes de pulsar Añadir.', life: 4000 });
    return;
  }
  const item = { id_plantilla: plantillaPromocion.value, id_jugador: nuevoPromocionado.value };
  if (!jugadoresPromocion.value.some((x) => x.id_jugador === item.id_jugador)) {
    jugadoresPromocion.value.push(item);
    toast.add({ severity: 'success', summary: 'Añadido', detail: `${nombreJugadorPromocion(item)} añadido a promoción.`, life: 2500 });
  }
  nuevoPromocionado.value = null;
  keySelectPromocionado.value += 1;
}

function removePromocionado(idJugador) {
  jugadoresPromocion.value = jugadoresPromocion.value.filter((x) => x.id_jugador !== idJugador);
}

function cerrar() {
  emit('update:visible', false);
}

async function guardar() {
  if (!form.value.id_temporada || !form.value.id_plantilla || !form.value.id_partido) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Temporada, plantilla y partido son obligatorios.', life: 4000 });
    return;
  }
  if (!jugadoresConvocados.value.length) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Añade al menos un jugador a la convocatoria.', life: 4000 });
    return;
  }
  // Si hay un jugador elegido en alguno de los dos selectores pero no se ha
  // pulsado su "Añadir", avisar en vez de guardar sin él sin decir nada.
  if (nuevoJugador.value || nuevoNoConvocado.value || nuevoPromocionado.value) {
    toast.add({
      severity: 'warn',
      summary: 'Jugador sin añadir',
      detail: 'Has seleccionado un jugador pero no has pulsado "Añadir". Añádelo o quítalo del selector antes de guardar.',
      life: 5000
    });
    return;
  }
  const noConvocadosPayload = jugadoresNoConvocados.value.map((n) => ({
    id_jugador: n.id_jugador,
    observaciones: n.observaciones || null
  }));
  guardando.value = true;
  try {
    if (modoEdicion.value) {
      await convocatoriasService.actualizar(props.registroId, {
        jugadores: jugadoresConvocados.value,
        no_convocados: noConvocadosPayload
      });
      toast.add({ severity: 'success', summary: 'Actualizada', detail: 'Convocatoria actualizada correctamente.', life: 3000 });
    } else {
      await convocatoriasService.crear({
        id_temporada: form.value.id_temporada,
        id_plantilla: form.value.id_plantilla,
        id_partido: form.value.id_partido,
        jugadores: jugadoresConvocados.value,
        no_convocados: noConvocadosPayload,
        promociones: jugadoresPromocion.value.map((x) => ({ id_plantilla: x.id_plantilla, id_jugador: x.id_jugador }))
      });
      toast.add({ severity: 'success', summary: 'Creada', detail: 'Convocatoria creada correctamente.', life: 3000 });
    }
    cerrar();
    emit('saved');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo guardar la convocatoria.',
      life: 5000
    });
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
<Dialog :visible="visible" modal class="w-full max-w-3xl" @update:visible="cerrar">
  <template #header>
    <div class="flex items-center gap-2">
      <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
      <span class="font-display text-club-green text-lg">
        {{ soloLectura ? 'Ver' : modoEdicion ? 'Editar' : 'Nueva' }} convocatoria
      </span>
    </div>
  </template>

  <form @submit.prevent="guardar" class="flex flex-col gap-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Temporada <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_temporada" :options="opcionesTemporada" optionLabel="label" optionValue="value"
                class="w-full" placeholder="Selecciona una temporada" :disabled="modoEdicion || soloLectura"
                :loading="cargandoCatalogo" @change="onTemporadaChange" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Plantilla <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_plantilla" :options="opcionesPlantilla" optionLabel="label" optionValue="value"
                class="w-full" placeholder="Selecciona una plantilla"
                :disabled="modoEdicion || soloLectura || !form.id_temporada" @change="onPlantillaChange" />
      </div>
    </div>

    <div v-if="form.id_plantilla">
      <div class="flex items-baseline justify-between gap-2 mb-2">
        <h3 class="text-sm font-semibold text-club-green">Partido</h3>
        <span v-if="!modoEdicion && !soloLectura && partidosVisibles.length" class="text-xs text-ink-tertiary">
          {{ partidosVisibles.length }} {{ partidosVisibles.length === 1 ? 'partido disponible' : 'partidos disponibles' }}
        </span>
      </div>

      <div v-if="cargandoPartidos" class="flex items-center justify-center gap-2 py-6 text-sm text-ink-tertiary">
        <i class="pi pi-spin pi-spinner"></i> Cargando partidos…
      </div>
      <div v-else-if="!partidosVisibles.length"
           class="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-ink-tertiary">
        Esta plantilla no tiene partidos de liga pendientes sin convocatoria.
      </div>
      <div v-else class="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 -mr-1">
        <button
          v-for="p in partidosVisibles" :key="p.id" type="button"
          class="partido-opcion group w-full text-left rounded-xl border px-3 py-2.5 transition-colors"
          :class="[
            partidoSeleccionado?.id === p.id
              ? 'border-club-green bg-club-green/5 ring-1 ring-club-green'
              : 'border-line bg-white hover:border-club-green/40 hover:bg-fill-hover',
            (modoEdicion || soloLectura) ? 'cursor-default' : 'cursor-pointer'
          ]"
          @click="seleccionarPartido(p)"
        >
          <div class="flex items-center gap-3">
            <!-- Jornada y fecha -->
            <div class="flex flex-col items-center justify-center w-16 shrink-0 rounded-lg bg-club-green/5 py-1.5">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-club-green/70">Jornada</span>
              <span class="font-display text-lg leading-none font-extrabold text-club-green">{{ p.jornada }}</span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-tertiary">
                <span class="font-semibold capitalize text-ink-secondary">{{ diaPartido(p.fecha) }}</span>
                <span>·</span>
                <span>{{ horaPartido(p.fecha) }}</span>
                <template v-if="p.lugar?.nombre">
                  <span class="hidden sm:inline">·</span>
                  <span class="hidden sm:inline truncate max-w-[14rem]"><i class="pi pi-map-marker text-[0.65rem]"></i> {{ p.lugar.nombre }}</span>
                </template>
                <span v-if="p.suspendido" class="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-bold text-red-700">SUSPENDIDO</span>
              </div>

              <div class="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <img v-if="escudoDe(p.id_equipo_local)" :src="escudoDe(p.id_equipo_local)" alt="" class="w-6 h-6 object-contain shrink-0" />
                  <i v-else class="pi pi-shield text-ink-tertiary shrink-0"></i>
                  <span class="truncate text-sm" :class="p.id_equipo_local === PALMA_ID ? 'font-bold text-club-green' : 'text-ink-primary'">
                    {{ p.equipoLocal?.nombre || '—' }}
                  </span>
                </div>
                <span class="text-[0.7rem] font-semibold text-ink-tertiary">vs</span>
                <div class="flex items-center justify-end gap-2 min-w-0">
                  <span class="truncate text-sm text-right" :class="p.id_equipo_visitante === PALMA_ID ? 'font-bold text-club-green' : 'text-ink-primary'">
                    {{ p.equipoVisitante?.nombre || '—' }}
                  </span>
                  <img v-if="escudoDe(p.id_equipo_visitante)" :src="escudoDe(p.id_equipo_visitante)" alt="" class="w-6 h-6 object-contain shrink-0" />
                  <i v-else class="pi pi-shield text-ink-tertiary shrink-0"></i>
                </div>
              </div>
            </div>

            <i class="pi shrink-0 text-lg"
               :class="partidoSeleccionado?.id === p.id ? 'pi-check-circle text-club-green' : 'pi-circle text-line-strong group-hover:text-club-green/40'"></i>
          </div>
        </button>
      </div>
      <p v-if="!form.id_partido && !cargandoPartidos && partidosVisibles.length" class="text-xs text-ink-tertiary mt-1.5">
        Pincha en un partido para seleccionarlo.
      </p>
    </div>

    <div v-if="form.id_partido">
      <div class="flex items-center justify-between gap-2 mb-2">
        <h3 class="text-sm font-semibold text-club-green">Jugadores convocados</h3>
        <Button v-if="!soloLectura" type="button" label="Plantilla Completa" icon="pi pi-users" text size="small"
                class="!text-club-green" @click="plantillaCompleta" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
              <th v-if="!soloLectura" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="id in jugadoresConvocadosOrdenados" :key="id">
              <td class="border border-line p-2 text-sm">{{ nombreJugador(id) }}</td>
              <td v-if="!soloLectura" class="text-center border border-line p-2">
                <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                        @click="removeJugador(id)" />
              </td>
            </tr>
            <tr v-if="!jugadoresConvocadosOrdenados.length">
              <td :colspan="soloLectura ? 1 : 2" class="text-center text-ink-tertiary p-3 text-sm">Todavía no hay jugadores convocados.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!soloLectura" class="flex gap-2 mt-2">
        <Select :key="keySelectJugador" v-model="nuevoJugador" :options="opcionesJugadorDisponible"
                optionLabel="label" optionValue="value" placeholder="Seleccionar jugador"
                class="flex-1" filter showClear />
        <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                @click="addJugador" />
      </div>
    </div>

    <div v-if="form.id_partido">
      <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores no convocados</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Observaciones</th>
              <th v-if="!soloLectura" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in jugadoresNoConvocadosOrdenados" :key="n.id_jugador">
              <td class="border border-line p-2 text-sm">{{ nombreJugador(n.id_jugador) }}</td>
              <td class="border border-line p-2 text-sm text-ink-secondary">{{ n.observaciones || '—' }}</td>
              <td v-if="!soloLectura" class="text-center border border-line p-2">
                <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                        @click="removeNoConvocado(n.id_jugador)" />
              </td>
            </tr>
            <tr v-if="!jugadoresNoConvocadosOrdenados.length">
              <td :colspan="soloLectura ? 2 : 3" class="text-center text-ink-tertiary p-3 text-sm">No hay jugadores marcados como no convocados.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!soloLectura" class="flex flex-col sm:flex-row gap-2 mt-2">
        <Select :key="keySelectNoConvocado" v-model="nuevoNoConvocado" :options="opcionesJugadorDisponibleNoConv"
                optionLabel="label" optionValue="value" placeholder="Seleccionar jugador"
                class="flex-1" filter showClear />
        <InputText v-model="observacionesNuevoNoConvocado" placeholder="Observaciones (motivo)" class="flex-1" />
        <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                @click="addNoConvocado" />
      </div>
    </div>

    <!-- Al crear se añaden; al editar o ver solo se muestran (no se modifican). -->
    <div v-if="form.id_partido">
      <h3 class="text-sm font-semibold text-club-green mb-2">Promoción</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Plantilla</th>
              <th v-if="!modoEdicion && !soloLectura" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in jugadoresPromocionOrdenados" :key="x.id_jugador">
              <td class="border border-line p-2 text-sm">{{ nombreJugadorPromocion(x) }}</td>
              <td class="border border-line p-2 text-sm text-ink-secondary">{{ plantillaPromocionLabel(x.id_plantilla) }}</td>
              <td v-if="!modoEdicion && !soloLectura" class="text-center border border-line p-2">
                <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                        @click="removePromocionado(x.id_jugador)" />
              </td>
            </tr>
            <tr v-if="!jugadoresPromocionOrdenados.length">
              <td :colspan="(modoEdicion || soloLectura) ? 2 : 3" class="text-center text-ink-tertiary p-3 text-sm">No hay jugadores de promoción.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!modoEdicion && !soloLectura" class="flex flex-col sm:flex-row gap-2 mt-2">
        <Select v-model="plantillaPromocion" :options="opcionesPlantillaPromocion" optionLabel="label" optionValue="value"
                placeholder="Seleccionar plantilla" class="flex-1" emptyMessage="No hay plantillas de categoría igual o inferior"
                @change="onPlantillaPromocionChange" />
        <Select :key="keySelectPromocionado" v-model="nuevoPromocionado" :options="opcionesJugadorPromocion"
                optionLabel="label" optionValue="value" placeholder="Seleccionar jugador"
                class="flex-1" filter showClear :disabled="!plantillaPromocion" />
        <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                :disabled="!plantillaPromocion" @click="addPromocionado" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-3 border-t border-line">
      <Button v-if="soloLectura" type="button" label="Cerrar" @click="cerrar"
              class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      <template v-else>
        <Button type="button" label="Cancelar" text @click="cerrar" />
        <Button type="submit" label="Guardar" icon="pi pi-check" :loading="guardando"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      </template>
    </div>
  </form>
</Dialog>
</template>
