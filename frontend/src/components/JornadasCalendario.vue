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
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressBar from 'primevue/progressbar';
import Message from 'primevue/message';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import * as XLSX from '@e965/xlsx';
import EquipacionPrenda from './EquipacionPrenda.vue';
import {
  categoriaCalendarioService, plantillasService, equiposService, temporadasService
} from '../services';
import { useMediaQuery } from '../composables/useMediaQuery';
import { useAuthStore } from '../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../utils/cambioBus';
import { filtrarPlantillasTemporadaActual } from '../utils/temporadaActual';

const esMovil = useMediaQuery('(max-width: 639px)');
const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

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
    await cargarTodasJornadas();
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

/** Listado completo de jornadas (todas las plantillas/categorías), solo para coordinadores. */
const todasJornadas = ref([]);
const cargandoTodas = ref(false);
const esCoordinador = computed(() => auth.rol === 'coordinador');

async function cargarTodasJornadas() {
  if (!esCoordinador.value) { todasJornadas.value = []; return; }
  cargandoTodas.value = true;
  try {
    const params = {};
    if (filtroPlantilla.value) params.id_plantilla = filtroPlantilla.value;
    todasJornadas.value = await categoriaCalendarioService.listar(params);
  } finally {
    cargandoTodas.value = false;
  }
}

const filtroTodasJornadas = ref('');
const filtroCategoriaTabla = ref(null);
const seleccionadasJornadas = ref([]);

const opcionesCategoriaTabla = computed(() => {
  const vistas = new Map();
  for (const j of todasJornadas.value) {
    const cat = j.plantilla?.categoria;
    if (cat && !vistas.has(cat.id)) vistas.set(cat.id, cat.alias || cat.nombre);
  }
  return Array.from(vistas, ([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const filasTablaJornadas = computed(() => (filtroCategoriaTabla.value ? 10 : 15));

const todasJornadasFiltradas = computed(() => {
  const texto = filtroTodasJornadas.value.trim().toLowerCase();
  return todasJornadas.value.filter((j) => {
    if (filtroCategoriaTabla.value && j.plantilla?.categoria?.id !== filtroCategoriaTabla.value) return false;
    if (!texto) return true;
    const campos = [
      categoriaNombre(j),
      String(j.jornada ?? ''),
      formatoFecha(j.fecha),
      nombreEquipo(j.id_equipo_local),
      nombreEquipo(j.id_equipo_visitante)
    ];
    return campos.some((c) => String(c).toLowerCase().includes(texto));
  });
});

function eliminarSeleccionadasJornadas() {
  if (!seleccionadasJornadas.value.length) return;
  confirm.require({
    message: `¿Seguro que quieres eliminar ${seleccionadasJornadas.value.length} jornada(s)? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      const total = seleccionadasJornadas.value.length;
      let ok = 0;
      let errorMsg = '';
      for (const item of [...seleccionadasJornadas.value]) {
        try {
          await categoriaCalendarioService.eliminar(item.id);
          ok += 1;
        } catch (err) {
          errorMsg = err.response?.data?.message || '';
        }
      }
      seleccionadasJornadas.value = [];
      if (ok === total) {
        toast.add({ severity: 'success', summary: 'Eliminadas', detail: `${total} jornada(s) eliminadas.`, life: 3000 });
      } else if (ok > 0) {
        toast.add({ severity: 'warn', summary: 'Eliminación parcial', detail: `${ok} de ${total} eliminadas. ${errorMsg}`.trim(), life: 5000 });
      } else {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg || 'No se pudieron eliminar las jornadas seleccionadas.',
          life: 5000
        });
      }
      await cargarNumeros();
      await cargarTodasJornadas();
      if (ok > 0) emitirCambio();
    }
  });
}

function confirmarEliminarJornada(item) {
  confirm.require({
    message: '¿Seguro que quieres eliminar esta jornada? Esta acción no se puede deshacer.',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await categoriaCalendarioService.eliminar(item.id);
        toast.add({ severity: 'success', summary: 'Eliminada', detail: 'Jornada eliminada.', life: 3000 });
        await cargarNumeros();
        await cargarTodasJornadas();
        emitirCambio();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'No se pudo eliminar la jornada.',
          life: 5000
        });
      }
    }
  });
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
  unsubCambio = suscribirseCambio(() => { cargarCatalogo(); cargarNumeros(); cargarTodasJornadas(); });
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

watch(filtroPlantilla, () => { cargarNumeros(); cargarTodasJornadas(); });

const opcionesPlantilla = computed(() =>
  filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value).map(p => ({
    label: `${p.categoria?.alias || p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const numActual = computed(() => numerosJornada.value[numPagina.value] || null);
const totalPaginas = computed(() => numerosJornada.value.length);

/** Bloque de hasta 10 jornadas visible cuando se filtra por categoría. */
const totalBloques = computed(() => Math.max(1, Math.ceil(jornadasFiltradasLista.value.length / BLOQUE_JORNADAS)));
const bloqueVisible = computed(() =>
  jornadasFiltradasLista.value.slice(paginaBloque.value * BLOQUE_JORNADAS, (paginaBloque.value + 1) * BLOQUE_JORNADAS)
);
const categoriaFiltradaLabel = computed(() =>
  jornadasFiltradasLista.value[0] ? categoriaNombre(jornadasFiltradasLista.value[0]) : ''
);
const partidosVisibles = computed(() => filtroPlantilla.value ? bloqueVisible.value : jornadaActual.value);
const siguienteJornadaSugerida = computed(() => {
  if (!filtroPlantilla.value) return numActual.value || null;
  const maxJ = jornadasFiltradasLista.value.reduce((m, j) => Math.max(m, j.jornada || 0), 0);
  return maxJ + 1;
});

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

function calzonasEquipo(id) {
  return equipos.value.find(e => e.id === id)?.calzonas || null;
}

function mediasEquipo(id) {
  return equipos.value.find(e => e.id === id)?.medias || null;
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

/** Solo para mostrar en la vista previa: si la celda de fecha llega como
 * nº de serie de Excel (días desde 1899-12-30), la formatea a DD/MM/YYYY.
 * El backend hace la misma conversión sobre el valor real al importar. */
function previewFecha(valor) {
  if (valor === '' || valor == null) return valor;
  if (!/^\d+$/.test(String(valor).trim())) return valor;
  const utcDays = Math.floor(Number(valor) - 25569);
  const d = new Date(utcDays * 86400 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
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
  jornada: null, fecha: null, hora: null
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
  form.jornada = siguienteJornadaSugerida.value || null;
  form.fecha = null;
  form.hora = null;
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
      hora: form.hora || null
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
      <div v-if="filtroPlantilla ? cargandoListaFiltrada : cargandoJornada" class="text-center py-8 text-ink-tertiary">
        <i class="pi pi-spin pi-spinner text-xl block mb-2"></i>
        Cargando{{ filtroPlantilla ? '' : ` jornada ${numActual}` }}...
      </div>

      <Message v-if="plantillasSinJornada.length" severity="warn" :closable="false" class="mb-3">
        Sin partido en la jornada {{ numActual }}: {{ plantillasSinJornada.join(', ') }}
      </Message>

      <div class="jornada-bloque">
        <div class="jornada-header">
          <span v-if="filtroPlantilla" class="jornada-num">{{ categoriaFiltradaLabel }}</span>
          <span v-else class="jornada-num">J {{ numActual }}</span>
          <span class="text-xs text-white/80">
            {{ filtroPlantilla ? jornadasFiltradasLista.length : jornadaActual.length }}
            {{ filtroPlantilla ? 'jornada' : 'partido' }}{{ (filtroPlantilla ? jornadasFiltradasLista.length : jornadaActual.length) !== 1 ? 's' : '' }}
          </span>
        </div>

        <div class="jornada-partidos">
          <div v-for="partido in partidosVisibles" :key="partido.id" class="partido-card">
            <div class="partido-fecha" v-if="partido.fecha">
              <div class="text-xs font-semibold text-club-green">{{ formatoFecha(partido.fecha) }}</div>
              <div v-if="partido.hora" class="text-[0.65rem] text-ink-tertiary">{{ formatoHora(partido.hora) }}</div>
            </div>
            <div class="partido-equipos">
              <div class="equipo">
                <img v-if="escudoEquipo(partido.id_equipo_local)" :src="escudoEquipo(partido.id_equipo_local)"
                     alt="" class="equipo-escudo" />
                <span class="equipo-nombre">{{ nombreEquipo(partido.id_equipo_local) }}</span>
                <div class="equipo-kit">
                  <EquipacionPrenda tipo="camiseta" :color="camisetaEquipo(partido.id_equipo_local)" :size="16" />
                  <EquipacionPrenda tipo="calzonas" :color="calzonasEquipo(partido.id_equipo_local)" :size="16" />
                  <EquipacionPrenda tipo="medias" :color="mediasEquipo(partido.id_equipo_local)" :size="16" />
                </div>
              </div>
              <div class="partido-vs-wrap">
                <div v-if="filtroPlantilla" class="partido-jornada-label">Jornada {{ partido.jornada }}</div>
                <div class="partido-vs">vs</div>
              </div>
              <div class="equipo">
                <img v-if="escudoEquipo(partido.id_equipo_visitante)" :src="escudoEquipo(partido.id_equipo_visitante)"
                     alt="" class="equipo-escudo" />
                <span class="equipo-nombre">{{ nombreEquipo(partido.id_equipo_visitante) }}</span>
                <div class="equipo-kit">
                  <EquipacionPrenda tipo="camiseta" :color="camisetaEquipo(partido.id_equipo_visitante)" :size="16" />
                  <EquipacionPrenda tipo="calzonas" :color="calzonasEquipo(partido.id_equipo_visitante)" :size="16" />
                  <EquipacionPrenda tipo="medias" :color="mediasEquipo(partido.id_equipo_visitante)" :size="16" />
                </div>
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

    <div v-if="esCoordinador" class="mt-6">
      <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 class="text-sm font-semibold text-club-green">Todas las jornadas</h3>
        <div class="flex items-center gap-2 flex-wrap">
          <Button v-if="seleccionadasJornadas.length" :label="`Eliminar seleccionadas (${seleccionadasJornadas.length})`"
                  icon="pi pi-trash" severity="danger" outlined size="small"
                  class="!text-club-garnet !border-club-garnet/50 hover:!bg-club-garnet/5"
                  @click="eliminarSeleccionadasJornadas" />
          <Select v-model="filtroCategoriaTabla" :options="opcionesCategoriaTabla" optionLabel="label" optionValue="value"
                  placeholder="Filtrar por categoría" showClear class="w-full sm:w-52" />
          <InputText v-model="filtroTodasJornadas" placeholder="Buscar..." class="!py-2 w-full sm:w-64" />
        </div>
      </div>
      <DataTable :value="todasJornadasFiltradas" v-model:selection="seleccionadasJornadas" dataKey="id"
                 :loading="cargandoTodas" paginator :rows="filasTablaJornadas" :rowsPerPageOptions="[10, 15, 30, 50]"
                 sortField="fecha" :sortOrder="1" responsiveLayout="scroll" class="ar-datatable">
        <Column selectionMode="multiple" headerStyle="width: 3rem" />
        <Column field="plantilla.categoria.nombre" header="Categoría" sortable>
          <template #body="{ data }">{{ categoriaNombre(data) }}</template>
        </Column>
        <Column field="jornada" header="Jornada" sortable style="width: 90px" />
        <Column field="fecha" header="Fecha" sortable>
          <template #body="{ data }">{{ formatoFecha(data.fecha) }}</template>
        </Column>
        <Column field="hora" header="Hora" style="width: 80px">
          <template #body="{ data }">{{ formatoHora(data.hora) }}</template>
        </Column>
        <Column header="Equipo Local">
          <template #body="{ data }">{{ nombreEquipo(data.id_equipo_local) }}</template>
        </Column>
        <Column header="Equipo Visitante">
          <template #body="{ data }">{{ nombreEquipo(data.id_equipo_visitante) }}</template>
        </Column>
        <Column header="Acciones" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button v-if="puedeEditarPartido(data)" icon="pi pi-pencil" text rounded size="small"
                      class="!text-club-green" v-tooltip.top="'Editar'" @click="abrirEdicion(data)" />
              <Button v-if="puedeEditarPartido(data)" icon="pi pi-trash" text rounded size="small" severity="danger"
                      v-tooltip.top="'Eliminar'" @click="confirmarEliminarJornada(data)" />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center text-ink-tertiary py-6">No hay jornadas registradas.</div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" modal class="w-full max-w-2xl">
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
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Plantilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Jornada</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Fecha</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Equipo Local</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Equipo Visitante</th>
                </tr>
              </thead>
            </table>
          </div>
          <p class="text-xs text-ink-tertiary italic">
            Los nombres de columna no distinguen mayúsculas, espacios ni guiones (p. ej. "Equipo Local", "equipo_local" y "EquipoLocal" son equivalentes).
          </p>
          <p class="text-xs text-ink-tertiary italic font-bold">
            * En Equipo Local / Equipo Visitante se pone el <strong>nombre</strong> del equipo, no un ID. Si un equipo no existe todavía en Equipos, se creará automáticamente.
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
                    :field="key" :header="key">
              <template v-if="key.trim().toLowerCase() === 'fecha'" #body="{ data }">
                {{ previewFecha(data[key]) }}
              </template>
            </Column>
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

    <ConfirmDialog />
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
.equipo-kit {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.partido-vs-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.partido-jornada-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: #0F3D22;
  white-space: nowrap;
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
