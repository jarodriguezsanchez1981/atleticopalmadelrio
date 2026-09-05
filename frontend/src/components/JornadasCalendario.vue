<script setup>
/**
 * Vista visual tipo calendario de las jornadas de liga.
 * Carga lazy: solo los datos de la jornada visible.
 * Incluye alta/edición de partidos (sustituye al datatable que había antes).
 */
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import DatePicker from 'primevue/datepicker';
import Textarea from 'primevue/textarea';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressBar from 'primevue/progressbar';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import * as XLSX from '@e965/xlsx';
import {
  categoriaCalendarioService, plantillasService, equiposService,
  jugadoresService, equiposJugadoresService
} from '../services';
import { useMediaQuery } from '../composables/useMediaQuery';
import { useAuthStore } from '../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../utils/cambioBus';

const PALMA_ID = 73;

const esMovil = useMediaQuery('(max-width: 639px)');
const auth = useAuthStore();
const toast = useToast();

const plantillas = ref([]);
const equipos = ref([]);
const jugadores = ref([]);
const equiposJugadores = ref([]);
const numerosJornada = ref([]);
const jornadaActual = ref([]);
const numPagina = ref(0);
const cargando = ref(false);
const cargandoJornada = ref(false);
const filtroPlantilla = ref(null);
let unsubCambio = null;

async function cargarCatalogo() {
  const [pls, eqs, jugs, eqjugs] = await Promise.all([
    plantillasService.listar(),
    equiposService.listar(),
    jugadoresService.listar(),
    equiposJugadoresService.listar().catch(() => [])
  ]);
  plantillas.value = pls;
  equipos.value = eqs;
  jugadores.value = jugs;
  equiposJugadores.value = eqjugs;
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

onMounted(async () => {
  await cargarInit();
  unsubCambio = suscribirseCambio(() => { cargarCatalogo(); cargarNumeros(); });
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

watch(filtroPlantilla, () => cargarNumeros());

const opcionesPlantilla = computed(() =>
  plantillas.value.map(p => ({
    label: `${p.categoria?.alias || p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
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

/** Visible solo si el usuario puede editar la sección y (es coordinador o tiene asignada esa categoría). */
function puedeEditarPartido(partido) {
  if (!auth.puedeEditar('categoria_calendario')) return false;
  if (auth.rol === 'coordinador') return true;
  const idCat = partido?.plantilla?.categoria?.id;
  return idCat != null && Number(idCat) === Number(auth.idCategoria);
}

const puedeCrear = computed(() => auth.puedeEditar('categoria_calendario'));

// ---------- Importación Excel ----------
const importDialogVisible = ref(false);
const importInputRef = ref(null);
const importPreview = ref([]);
const importando = ref(false);
const importProgress = ref(0);
const importResultado = ref(null);

function abrirImport() {
  importPreview.value = [];
  importResultado.value = null;
  importProgress.value = 0;
  importDialogVisible.value = true;
}

function onImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  importando.value = true;
  importProgress.value = 10;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      importPreview.value = rows;
      importProgress.value = 100;
    } catch {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo leer el archivo Excel.', life: 4000 });
      importPreview.value = [];
    } finally {
      importando.value = false;
    }
  };
  reader.readAsArrayBuffer(file);
}

async function confirmarImport() {
  if (!importPreview.value.length) return;
  importando.value = true;
  importProgress.value = 30;
  try {
    const res = await categoriaCalendarioService.importar(importPreview.value);
    importProgress.value = 100;
    importResultado.value = res;
    if (res.insertados) {
      await cargarCatalogo();
      await cargarNumeros();
      emitirCambio();
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error de importación',
      detail: err.response?.data?.message || 'No se pudo completar la importación.',
      life: 5000
    });
  } finally {
    importando.value = false;
  }
}

// ---------- Alta / edición ----------
const dialogVisible = ref(false);
const guardando = ref(false);
const editandoId = ref(null);
const form = reactive({
  id_plantilla: null, id_equipo_local: null, id_equipo_visitante: null,
  jornada: null, fecha: null, hora: null, incidencias: '', observaciones: '',
  jugadores_local: [], jugadores_visitante: []
});

function toFechaSQL(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function resetForm() {
  form.id_plantilla = filtroPlantilla.value || null;
  form.id_equipo_local = null;
  form.id_equipo_visitante = null;
  form.jornada = numActual.value || null;
  form.fecha = null;
  form.hora = null;
  form.incidencias = '';
  form.observaciones = '';
  form.jugadores_local = [];
  form.jugadores_visitante = [];
}

function abrirNuevaJornada() {
  editandoId.value = null;
  resetForm();
  dialogVisible.value = true;
}

async function abrirEdicion(item) {
  editandoId.value = item.id;
  form.id_plantilla = item.id_plantilla;
  form.id_equipo_local = item.id_equipo_local;
  form.id_equipo_visitante = item.id_equipo_visitante;
  form.jornada = item.jornada;
  form.fecha = item.fecha ? new Date(`${String(item.fecha).slice(0, 10)}T12:00:00`) : null;
  form.hora = String(item.hora || '').slice(0, 5) || null;
  form.incidencias = item.incidencias || '';
  form.observaciones = item.observaciones || '';
  const local = [];
  const visitante = [];
  (item.jornadaJugadores || []).forEach(jj => {
    const entrada = {
      id_jugador: jj.id_jugador ?? null,
      id_equipo_jugador: jj.id_equipo_jugador ?? null,
      tarjeta_amarilla: jj.tarjeta_amarilla || 0,
      tarjeta_roja: jj.tarjeta_roja || 0,
      goles: jj.goles || 0
    };
    if (jj.es_local) local.push(entrada);
    else visitante.push(entrada);
  });
  form.jugadores_local = local;
  form.jugadores_visitante = visitante;
  dialogVisible.value = true;
}

function cerrarDialog() {
  dialogVisible.value = false;
}

async function guardar() {
  if (!form.id_plantilla || !form.id_equipo_local || !form.id_equipo_visitante || !form.jornada || !form.fecha) {
    toast.add({ severity: 'warn', summary: 'Faltan campos', detail: 'Plantilla, equipos, jornada y fecha son obligatorios.', life: 4000 });
    return;
  }
  guardando.value = true;
  try {
    const payload = {
      id_plantilla: form.id_plantilla,
      id_equipo_local: form.id_equipo_local,
      id_equipo_visitante: form.id_equipo_visitante,
      jornada: form.jornada,
      fecha: toFechaSQL(form.fecha),
      hora: form.hora || null,
      incidencias: form.incidencias || null,
      observaciones: form.observaciones || null,
      jugadores_local: form.jugadores_local,
      jugadores_visitante: form.jugadores_visitante
    };
    if (editandoId.value) {
      await categoriaCalendarioService.actualizar(editandoId.value, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Partido actualizado correctamente.', life: 3000 });
    } else {
      await categoriaCalendarioService.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Partido creado correctamente.', life: 3000 });
    }
    dialogVisible.value = false;
    await cargarNumeros();
    emitirCambio();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo guardar.', life: 5000 });
  } finally {
    guardando.value = false;
  }
}

// ---------- Gestión de jugadores en el formulario ----------
const nuevoJugadorLocal = ref(null);
const nuevoJugadorVisitante = ref(null);
const keySelectLocal = ref(0);
const keySelectVisitante = ref(0);

function jugadorInfo(id) {
  return jugadores.value.find(j => j.id === id);
}

/** Jugadores de una plantilla (para el lado PALMA). */
function plantillaJugadores() {
  const p = plantillas.value.find(pl => pl.id === form.id_plantilla);
  return (p?.jugadores || []).map(j => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos }));
}

/** Opciones de jugadores de un lado según su equipo: PALMA -> plantilla, resto -> equipos_jugadores. */
function jugadoresEquipoDe(lado) {
  const idEquipo = lado === 'local' ? form.id_equipo_local : form.id_equipo_visitante;
  if (Number(idEquipo) === PALMA_ID) {
    return plantillaJugadores()
      .map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id, tipo: 'jugador' }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  return equiposJugadores.value
    .filter(ej => Number(ej.id_equipo) === Number(idEquipo))
    .map(ej => ({ label: `${ej.apellidos}, ${ej.nombre}`, value: ej.id, tipo: 'equipo_jugador' }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function valorJugador(j) {
  return j?.id_jugador ?? j?.id_equipo_jugador ?? null;
}

const opcionesJugadorLocalDisponibles = computed(() => {
  const usados = new Set((form.jugadores_local || []).map(valorJugador));
  return jugadoresEquipoDe('local').filter(o => !usados.has(o.value));
});

const opcionesJugadorVisitanteDisponibles = computed(() => {
  const usados = new Set((form.jugadores_visitante || []).map(valorJugador));
  return jugadoresEquipoDe('visitante').filter(o => !usados.has(o.value));
});

function addJugador(lado) {
  const nuevo = lado === 'local' ? nuevoJugadorLocal.value : nuevoJugadorVisitante.value;
  if (!nuevo) return;
  const opt = jugadoresEquipoDe(lado).find(o => o.value === nuevo);
  if (!opt) return;
  const campo = lado === 'local' ? 'jugadores_local' : 'jugadores_visitante';
  if (!form[campo]) form[campo] = [];
  if (!form[campo].some(j => valorJugador(j) === opt.value)) {
    const entrada = { tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0 };
    if (opt.tipo === 'jugador') entrada.id_jugador = opt.value;
    else entrada.id_equipo_jugador = opt.value;
    form[campo].push(entrada);
  }
  if (lado === 'local') {
    nuevoJugadorLocal.value = null;
    keySelectLocal.value++;
  } else {
    nuevoJugadorVisitante.value = null;
    keySelectVisitante.value++;
  }
}

function removeJugador(lado, valor) {
  const campo = lado === 'local' ? 'jugadores_local' : 'jugadores_visitante';
  form[campo] = (form[campo] || []).filter(j => valorJugador(j) !== valor);
}

/** Nombre legible de un jugador añadido en el formulario. */
function nombreJugadorEnForm(entry) {
  if (entry?.id_jugador) {
    const dePlantilla = plantillaJugadores().find(j => j.id === entry.id_jugador);
    if (dePlantilla) return `${dePlantilla.apellidos}, ${dePlantilla.nombre}`;
    const j = jugadorInfo(entry.id_jugador);
    return j ? `${j.apellidos}, ${j.nombre}` : '—';
  }
  if (entry?.id_equipo_jugador) {
    const ej = equiposJugadores.value.find(e => e.id === entry.id_equipo_jugador);
    return ej ? `${ej.apellidos}, ${ej.nombre}` : '—';
  }
  return '—';
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
        <Button v-if="puedeCrear" label="Importar" icon="pi pi-file-import" size="small" outlined
                class="!text-club-green !border-club-green/50 hover:!bg-club-green/5"
                @click="abrirImport" />
        <Button v-if="puedeCrear" label="Nueva jornada" icon="pi pi-plus" size="small"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                @click="abrirNuevaJornada" />
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
            <Button v-if="puedeEditarPartido(partido)" icon="pi pi-pencil" text rounded size="small"
                    class="!w-7 !h-7 !text-club-green partido-editar" v-tooltip.top="'Editar'"
                    @click="abrirEdicion(partido)" />
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

    <Dialog v-model:visible="dialogVisible" modal class="w-full max-w-4xl">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">{{ editandoId ? 'Editar' : 'Nueva' }} · Jornada</span>
        </div>
      </template>
      <form @submit.prevent="guardar" class="space-y-4 pt-1">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Plantilla <span class="text-club-garnet">*</span></label>
            <Select v-model="form.id_plantilla" :options="opcionesPlantilla" optionLabel="label" optionValue="value"
                    class="w-full" placeholder="Busca una plantilla" showClear filter />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Jornada <span class="text-club-garnet">*</span></label>
            <InputNumber v-model="form.jornada" :min="1" :minFractionDigits="0" :maxFractionDigits="0"
                         class="w-full" inputClass="w-full" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Equipo local <span class="text-club-garnet">*</span></label>
            <Select v-model="form.id_equipo_local" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                    class="w-full" placeholder="Busca un equipo" showClear filter />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Equipo visitante <span class="text-club-garnet">*</span></label>
            <Select v-model="form.id_equipo_visitante" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                    class="w-full" placeholder="Busca un equipo" showClear filter />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Fecha <span class="text-club-garnet">*</span></label>
            <DatePicker v-model="form.fecha" dateFormat="dd/mm/yy" showIcon iconDisplay="input"
                        :manualInput="true" class="w-full" inputClass="w-full" placeholder="dd/mm/aa" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Hora</label>
            <InputText v-model="form.hora" placeholder="HH:mm" maxlength="5" inputmode="numeric" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Incidencias</label>
          <Textarea v-model="form.incidencias" rows="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Observaciones</label>
          <Textarea v-model="form.observaciones" rows="2" class="w-full" />
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores Equipo Local</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in (form.jugadores_local || [])" :key="valorJugador(j)">
                  <td class="text-center border border-line p-2 text-sm">{{ nombreJugadorEnForm(j) }}</td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_amarilla" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_roja" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.goles" :min="0" :max="99" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                            @click="removeJugador('local', valorJugador(j))" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select :key="keySelectLocal" v-model="nuevoJugadorLocal" :options="opcionesJugadorLocalDisponibles"
                    optionLabel="label" optionValue="value" placeholder="Seleccionar jugador local"
                    class="flex-1" filter showClear />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                    @click="addJugador('local')" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores Equipo Visitante</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in (form.jugadores_visitante || [])" :key="valorJugador(j)">
                  <td class="text-center border border-line p-2 text-sm">{{ nombreJugadorEnForm(j) }}</td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_amarilla" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_roja" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.goles" :min="0" :max="99" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                            @click="removeJugador('visitante', valorJugador(j))" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select :key="keySelectVisitante" v-model="nuevoJugadorVisitante" :options="opcionesJugadorVisitanteDisponibles"
                    optionLabel="label" optionValue="value" placeholder="Seleccionar jugador visitante"
                    class="flex-1" filter showClear />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                    @click="addJugador('visitante')" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3">
          <Button type="button" label="Cancelar" text @click="cerrarDialog" />
          <Button type="submit" label="Guardar" icon="pi pi-check" :loading="guardando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </div>
      </form>
    </Dialog>

    <!-- Diálogo de importación Excel -->
    <Dialog v-model:visible="importDialogVisible" modal header="Importar jornadas desde Excel"
            :style="{ width: '42rem' }" :closable="!importando">
      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-ink-secondary">
            El archivo debe ser un <strong>.xlsx</strong> con estas columnas:
          </p>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">plantilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">jornada</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">fecha</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">equipolocal</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">equipovisitante</th>
                </tr>
              </thead>
            </table>
          </div>
          <p class="text-xs text-ink-tertiary italic font-bold">
            * Si un equipo local o visitante no existe todavía en Equipos, se creará automáticamente.
          </p>
        </div>

        <input ref="importInputRef" type="file" accept=".xlsx,.xls"
               class="hidden"
               @change="onImportFile" />

        <div v-if="!importPreview.length && !importResultado" class="flex justify-center">
          <Button label="Seleccionar archivo" icon="pi pi-upload"
                  :loading="importando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                  @click="importInputRef?.click()" />
        </div>

        <div v-else-if="!importResultado" class="space-y-3">
          <div class="text-sm font-medium text-ink-primary">
            {{ importPreview.length }} filas detectadas
          </div>
          <DataTable :value="importPreview.slice(0, 10)" class="ar-datatable text-sm" scrollable scrollHeight="200px">
            <Column v-for="key of Object.keys(importPreview[0] || {})" :key="key"
                    :field="key" :header="key" />
          </DataTable>
          <p v-if="importPreview.length > 10" class="text-xs text-ink-tertiary">
            Mostrando las 10 primeras filas de {{ importPreview.length }}.
          </p>
        </div>

        <div v-else class="space-y-3">
          <Message :severity="importResultado.insertados ? 'success' : 'warn'" :closable="false">
            {{ importResultado.insertados }} jornada(s) importada(s)
            <template v-if="importResultado.errores?.length">, {{ importResultado.errores.length }} con errores</template>.
          </Message>
          <div v-if="importResultado.avisos?.length" class="space-y-1">
            <p class="text-sm font-medium text-ink-primary">Equipos añadidos automáticamente:</p>
            <ul class="text-sm text-ink-secondary list-disc list-inside">
              <li v-for="(aviso, i) in importResultado.avisos" :key="i">{{ aviso }}</li>
            </ul>
          </div>
          <div v-if="importResultado.errores?.length" class="space-y-1">
            <p class="text-sm font-medium text-ink-primary">Errores:</p>
            <ul class="text-sm text-club-garnet list-disc list-inside">
              <li v-for="err in importResultado.errores" :key="err.fila">Fila {{ err.fila }}: {{ err.mensaje }}</li>
            </ul>
          </div>
        </div>

        <ProgressBar v-if="importando" :value="importProgress" />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <Button :label="importResultado ? 'Cerrar' : 'Cancelar'" text @click="importDialogVisible = false" :disabled="importando" />
          <Button v-if="importPreview.length && !importResultado" label="Importar" icon="pi pi-check"
                  :loading="importando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                  @click="confirmarImport" />
        </div>
      </template>
    </Dialog>
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  padding-right: 34px;
  border: 1px solid #F1F5F9;
  border-radius: 6px;
  background: #FAFAF8;
}
.partido-editar {
  position: absolute;
  top: 4px;
  right: 4px;
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
