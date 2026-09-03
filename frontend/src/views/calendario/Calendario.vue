<script setup>
/**
 * Calendario solo lectura: entrenamientos, partidos y festivos nacionales ES.
 */
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import EventoFormCalendario from '../../components/EventoFormCalendario.vue';
import TorneoFormCalendario from '../../components/TorneoFormCalendario.vue';
import EquipacionPrenda from '../../components/EquipacionPrenda.vue';
import { calendarioService, categoriasService, entrenamientosService, partidosService, torneosService } from '../../services';
import { eventosFestivosFullCalendar } from '../../utils/festivosEspana';
import { tituloCalendario } from '../../utils/tituloCalendario';
import { generarPdfCalendario } from '../../utils/pdfCalendario';
import { useAuthStore } from '../../stores/auth.store';
import { emitirCambio, suscribirseCambio } from '../../utils/cambioBus';

const categorias = ref([]);
const filtroCategoria = ref(null);
const calendarRef = ref();
const eventoSeleccionado = ref(null);
const dialogVisible = ref(false);
const elegirTipoVisible = ref(false);
const formVisible = ref(false);
const formTipo = ref('entrenamiento');
const formRegistroId = ref(null);
const formFechaDefecto = ref(null);
const torneoFormVisible = ref(false);
const torneoFormRegistroId = ref(null);
const confirm = useConfirm();
const toast = useToast();
const auth = useAuthStore();

const generandoPdf = ref(false);
const pdfDialogVisible = ref(false);
const pdfSemana = ref(new Date());
const pdfTipoFutbol = ref(null);
const pdfTipos = ref(['liga', 'partido', 'amistoso', 'torneo', 'entrenamiento']);

const OPCIONES_TIPO_EVENTO = [
  { label: 'Liga', value: 'liga' },
  { label: 'Partido', value: 'partido' },
  { label: 'Amistoso', value: 'amistoso' },
  { label: 'Torneo', value: 'torneo' },
  { label: 'Entrenamiento', value: 'entrenamiento' }
];

const OPCIONES_TIPO_FUTBOL = [
  { label: 'Todos (Futbol 7 y Futbol 11)', value: null },
  { label: 'Futbol 7', value: 1 },
  { label: 'Futbol 11', value: 2 }
];

function semanaDe(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dia);
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  return { inicio: lunes, fin: domingo };
}

function abrirPdfSemana() {
  pdfSemana.value = new Date();
  pdfTipoFutbol.value = null;
  pdfTipos.value = ['liga', 'partido', 'amistoso', 'torneo', 'entrenamiento'];
  pdfDialogVisible.value = true;
}

async function generarPdfSemana() {
  const semana = semanaDe(pdfSemana.value);
  if (!semana) return;
  await genarPdfRango(semana.inicio, semana.fin, pdfTipoFutbol.value);
  pdfDialogVisible.value = false;
}

async function genarPdfRango(inicio, fin, tipoFutbol = null) {
  generandoPdf.value = true;
  try {
    const hasta = new Date(fin);
    hasta.setHours(23, 59, 59, 999);
    const eventos = await calendarioService.eventos({
      desde: new Date(inicio).toISOString(),
      hasta: hasta.toISOString()
    });
    const fechaTitulo = `${inicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} al ${fin.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    if (!eventos.length) {
      toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay eventos en esta semana.', life: 3000 });
      return;
    }
    const sel = pdfTipos.value;
    const filtrados = eventos.filter((e) => {
      if (e.tipo === 'entrenamiento') return sel.includes('entrenamiento');
      if (e.tipo === 'torneo') return sel.includes('torneo');
      if (e.tipo === 'partido') {
        if (e.jornada) return sel.includes('partido') || sel.includes('liga');
        return sel.includes('partido') || sel.includes('amistoso');
      }
      return true;
    });
    if (!filtrados.length) {
      toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay eventos de los tipos elegidos.', life: 3000 });
      return;
    }
    await generarPdfCalendario(filtrados, fechaTitulo, tipoFutbol);
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo generar el PDF.',
      life: 5000
    });
  } finally {
    generandoPdf.value = false;
  }
}

const opcionesCategoria = computed(() => [
  { label: 'Todas las categorías', value: null },
  ...categorias.value.map(c => ({ label: c.nombre, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
]);

const nombreLocal = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '';
  return e.equipoLocal?.nombre || '';
});

const nombreVisitante = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '';
  return e.equipoVisitante?.nombre || '';
});

const escudoLocal = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '/escudo.png';
  return e.equipoLocal?.escudo || '/escudo.png';
});

const escudoVisitante = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '/escudo.png';
  return e.equipoVisitante?.escudo || '/escudo.png';
});

const camisetaLocal = computed(() => eventoSeleccionado.value?.equipoLocal?.camiseta || null);
const camisetaVisitante = computed(() => eventoSeleccionado.value?.equipoVisitante?.camiseta || null);
const calzonasLocal = computed(() => eventoSeleccionado.value?.equipoLocal?.calzonas || null);
const calzonasVisitante = computed(() => eventoSeleccionado.value?.equipoVisitante?.calzonas || null);
const mediasLocal = computed(() => eventoSeleccionado.value?.equipoLocal?.medias || null);
const mediasVisitante = computed(() => eventoSeleccionado.value?.equipoVisitante?.medias || null);

const lugarPartido = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '—';
  if (!e.es_local) return e.equipoLocal?.localidad || '—';
  return e.lugar || '—';
});

const COLOR_ENTRENAMIENTO = '#0B3D2E';
const COLOR_PARTIDO = '#7A1E2B';
const COLOR_TORNEO = '#6D28D9';
const COLOR_FESTIVO = '#D97706';

async function fetchEventos(fetchInfo, successCallback, failureCallback) {
  try {
    const eventos = await calendarioService.eventos({
      desde: fetchInfo.startStr,
      hasta: fetchInfo.endStr,
      id_categoria: filtroCategoria.value || undefined
    });

    const gruposPorDia = new Map();
    const conGrupo = eventos.map(e => {
      const miGrupo = e.tipo === 'partido'
        ? (e.jornada ? 'LIGA' : 'AMISTOSO')
        : (e.tipo === 'torneo' ? 'TORNEO' : 'ENTRENAMIENTO');
      const miGrupoOrden = { LIGA: 1, AMISTOSO: 2, TORNEO: 3, ENTRENAMIENTO: 4 }[miGrupo];
      const diaKey = String(e.inicio || '').slice(0, 10);
      const key = `${diaKey}__${miGrupo}`;
      let bucket = gruposPorDia.get(key);
      if (!bucket) {
        bucket = { firstId: null, firstInicio: null };
        gruposPorDia.set(key, bucket);
      }
      const inicio = e.inicio ? new Date(e.inicio).getTime() : Infinity;
      if (bucket.firstInicio == null || inicio < bucket.firstInicio) {
        bucket.firstInicio = inicio;
        bucket.firstId = e.id;
      }
      return {
        id: e.id,
        title: e.titulo,
        start: e.inicio,
        color: e.tipo === 'partido' ? COLOR_PARTIDO : (e.tipo === 'torneo' ? COLOR_TORNEO : COLOR_ENTRENAMIENTO),
        extendedProps: e,
        miGrupo,
        miGrupoOrden
      };
    });

    const mapeados = conGrupo.map(ev => {
      const diaKey = String(ev.start || '').slice(0, 10);
      const key = `${diaKey}__${ev.miGrupo}`;
      const bucket = gruposPorDia.get(key);
      const esPrimeroGrupo = bucket && bucket.firstId === ev.id;
      ev.extendedProps = { ...ev.extendedProps, esPrimeroGrupo, miGrupo: ev.miGrupo };
      return ev;
    });

    const festivos = eventosFestivosFullCalendar(fetchInfo.startStr, fetchInfo.endStr).map(f => ({
      ...f,
      display: 'auto',
      color: COLOR_FESTIVO,
      backgroundColor: '#FDE68A',
      borderColor: '#D97706',
      textColor: '#78350F'
    }));

    successCallback([...mapeados, ...festivos]);
  } catch (err) {
    failureCallback(err);
  }
}

function seccionDeEvento(tipo) {
  if (tipo === 'partido') return 'partidos';
  if (tipo === 'torneo') return 'torneo';
  return 'entrenamientos';
}

function onEventClick(info) {
  eventoSeleccionado.value = {
    ...info.event.extendedProps,
    titulo: info.event.extendedProps?.titulo || info.event.title,
    inicio: info.event.extendedProps?.inicio || info.event.start
  };
  dialogVisible.value = true;
}

function onDateClick(info) {
  elegirTipoVisible.value = true;
  formFechaDefecto.value = info?.dateStr || info?.startStr;
}

function idDeEvento(e) {
  if (e.tipo === 'partido') return String(e.id || '').replace('partido-', '');
  return e.base_id;
}

function nuevoDeTipo(tipo) {
  elegirTipoVisible.value = false;
  if (tipo === 'torneo') {
    torneoFormRegistroId.value = null;
    torneoFormVisible.value = true;
    return;
  }
  formTipo.value = tipo;
  formRegistroId.value = null;
  formVisible.value = true;
}

function editarEvento() {
  const e = eventoSeleccionado.value;
  if (!e) return;
  if (e.tipo === 'torneo') {
    torneoFormRegistroId.value = idDeEvento(e);
    dialogVisible.value = false;
    torneoFormVisible.value = true;
    return;
  }
  formTipo.value = e.tipo === 'partido' ? 'partido' : 'entrenamiento';
  formRegistroId.value = idDeEvento(e);
  formFechaDefecto.value = null;
  dialogVisible.value = false;
  formVisible.value = true;
}

function eliminarEvento() {
  const e = eventoSeleccionado.value;
  if (!e) return;
  const service = e.tipo === 'partido' ? partidosService : (e.tipo === 'torneo' ? torneosService : entrenamientosService);
  confirm.require({
    message: '¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await service.eliminar(idDeEvento(e));
        dialogVisible.value = false;
        refrescar();
        emitirCambio();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'No se pudo eliminar el evento.',
          life: 5000
        });
      }
    }
  });
}

function refrescar() {
  calendarRef.value?.getApi().refetchEvents();
}

function onFormSaved() {
  refrescar();
  emitirCambio();
}

function formatearHora(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatearFechaCorta(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Contenido HTML del evento: hora + icono local/visitante + alias + badge para partidos;
 *  hora + lugar + alias para entrenamientos. */
function contenidoEvento(arg) {
  const e = arg.event?.extendedProps;
  if (e?.tipo === 'partido') {
    const hora = escapeHtml(formatearHora(e.inicio));
    const alias = escapeHtml(e.categoria?.alias || e.categoria?.nombre || '—');
    const icono = e.es_local
      ? '<i class="pi pi-home fc-lv-icon fc-lv-local"></i>'
      : '<i class="pi pi-arrow-right-arrow-left fc-lv-icon fc-lv-visitante"></i>';

    const lugar = e.es_local
      ? (typeof e.lugar === 'string' ? e.lugar : (e.lugar?.nombre || ''))
      : (e.equipoLocal?.localidad || '');
    const lugarHtml = lugar ? `<span class="fc-partido-lugar">${escapeHtml(lugar)}</span>` : '';
    const cab = cabeceraGrupoHtml(e);
    return {
      html: `<div class="fc-evento-contenido">` +
        cab +
        `<span class="fc-partido-hora">${hora}</span>` +
        icono +
        `<span class="fc-partido-alias">${alias}</span>` +
        lugarHtml +
        `</div>`
    };
  }
  if (e?.tipo === 'torneo') {
    const hora = escapeHtml(formatearHora(e.inicio));
    const alias = escapeHtml(e.categoria?.alias || e.categoria?.nombre || 'Torneo');
    const esLocal = e.equipo?.nombre === 'PALMA DEL RIO ATLETICO C.F.';
    const icono = esLocal
      ? '<i class="pi pi-home fc-lv-icon fc-lv-local"></i>'
      : '<i class="pi pi-arrow-right-arrow-left fc-lv-icon fc-lv-visitante"></i>';
    const lugar = esLocal
      ? (typeof e.lugar === 'string' ? e.lugar : (e.lugar?.nombre || ''))
      : (e.equipo?.localidad || '');
    const lugarHtml = lugar ? `<span class="fc-partido-lugar">${escapeHtml(lugar)}</span>` : '';
    const cab = cabeceraGrupoHtml(e);
    return {
      html: `<div class="fc-evento-contenido">` +
        cab +
        `<span class="fc-partido-hora">${hora}</span>` +
        icono +
        `<span class="fc-partido-alias">${alias}</span>` +
        lugarHtml +
        `</div>`
    };
  }
  if (e?.tipo === 'entrenamiento') {
    const hora = escapeHtml(formatearHora(e.inicio));
    const lugar = escapeHtml(e.lugar || '—');
    const categoria = escapeHtml(e.categoria?.alias || e.categoria?.nombre || '—');
    const cab = cabeceraGrupoHtml(e);
    return {
      html: `<div class="fc-evento-contenido">` +
        cab +
        `<span class="fc-partido-hora">${hora}</span>` +
        `<span class="fc-partido-lugar">${lugar}</span>` +
        `<span class="fc-partido-alias">${categoria}</span>` +
        `</div>`
    };
  }
  return { html: escapeHtml(arg.event?.title) };
}

function cabeceraGrupoHtml(e) {
  if (!e.esPrimeroGrupo) return '';
  const meta = GRUPO_LABELS[e.miGrupo];
  if (!meta) return '';
  return `<div class="fc-grupo-cabecera" style="background:${meta.color};color:#fff;font-size:9px;font-weight:700;padding:1px 4px;margin:0 0 5px;border-radius:3px;letter-spacing:0.3px;display:flex;align-items:center;gap:3px;line-height:1.2;width:100%;"><i class="${meta.icon}" style="font-size:9px"></i>${meta.label}</div>`;
}

const GRUPO_LABELS = {
  LIGA: { label: 'LIGA', color: '#0B3D2E', icon: 'pi pi-star-fill' },
  AMISTOSO: { label: 'AMISTOSO', color: '#D97706', icon: 'pi pi-handshake' },
  TORNEO: { label: 'TORNEO', color: '#6D28D9', icon: 'pi pi-trophy' },
  ENTRENAMIENTO: { label: 'ENTRENAMIENTO', color: '#2563EB', icon: 'pi pi-calendar' }
};

const cabecerasInsertadas = new WeakSet();

function agruparEventosDidMount(info) {
  const grupo = info.event.extendedProps?.tipo === 'partido'
    ? (info.event.extendedProps?.jornada ? 'LIGA' : 'AMISTOSO')
    : (info.event.extendedProps?.tipo === 'torneo' ? 'TORNEO' : 'ENTRENAMIENTO');
  const el = info.el;
  el.classList.add(`fc-grupo-${grupo.toLowerCase()}`);
}

let unsubCambio = null;
onMounted(() => {
  unsubCambio = suscribirseCambio(() => refrescar());
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: esLocale,
  height: 'auto',
  firstDay: 1,
  titleFormat: tituloCalendario,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,multiMonthYear'
  },
  buttonText: {
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    year: 'Año'
  },
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  events: fetchEventos,
  eventContent: contenidoEvento,
  eventDidMount: agruparEventosDidMount,
  eventClick: onEventClick,
  dateClick: onDateClick,
  editable: false,
  selectable: false,
  dayMaxEvents: false,
  fixedWeekCount: false,
  eventOrder: 'miGrupoOrden,start'
};

onMounted(async () => {
  categorias.value = await categoriasService.listar();
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div>
        <h1 class="font-display text-xl text-club-green flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
          Calendario
        </h1>
        <p class="text-sm text-ink-tertiary">
          Pincha en un día para añadir un evento. Pincha en un evento para editar o eliminar.
        </p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <Select
          v-model="filtroCategoria"
          :options="opcionesCategoria"
          optionLabel="label"
          optionValue="value"
          class="w-full sm:w-64"
          @change="refrescar"
        />
        <Button
          label="PDF"
          icon="pi pi-print"
          size="small"
          text
          :loading="generandoPdf"
          @click="abrirPdfSemana"
        />
      </div>
    </div>

    <div class="bg-white rounded-xl  p-4 calendario-club">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <Dialog v-model:visible="dialogVisible" modal class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">{{ eventoSeleccionado?.categoria?.nombre || 'Detalle del evento' }}</span>
          <span v-if="eventoSeleccionado?.tipo === 'partido'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="eventoSeleccionado?.jornada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
            <i :class="eventoSeleccionado?.jornada ? 'pi pi-star-fill' : 'pi pi-handshake'"></i>
            {{ eventoSeleccionado?.jornada ? 'Liga' : 'Amistoso' }}
          </span>
          <span v-else-if="eventoSeleccionado?.tipo === 'torneo'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            <i class="pi pi-trophy"></i> Torneo
          </span>
          <span v-else-if="eventoSeleccionado?.tipo === 'entrenamiento'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            <i class="pi pi-calendar"></i> Entrenamiento
          </span>
        </div>
      </template>

      <div v-if="eventoSeleccionado" class="space-y-3">
        <template v-if="eventoSeleccionado.tipo === 'partido'">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pb-2 border-b border-line">
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Fecha</p>
              <p class="text-sm text-ink-secondary">{{ formatearFechaCorta(eventoSeleccionado.inicio) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Hora</p>
              <p class="text-sm text-ink-secondary">{{ formatearHora(eventoSeleccionado.inicio) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Lugar</p>
              <p class="text-sm text-ink-secondary">{{ lugarPartido }}</p>
            </div>
            <div>
              <p v-if="eventoSeleccionado.jornada" class="text-xs text-ink-tertiary font-medium">Jornada</p>
              <p v-if="eventoSeleccionado.jornada" class="text-sm text-ink-secondary">{{ eventoSeleccionado.jornada }}</p>
              <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <i class="pi pi-handshake"></i> Amistoso
              </span>
            </div>
          </div>
        </template>

        <template v-if="eventoSeleccionado.tipo === 'entrenamiento'">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center pb-2 border-b border-line">
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Fecha</p>
              <p class="text-sm text-ink-secondary">{{ formatearFechaCorta(eventoSeleccionado.inicio) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Hora</p>
              <p class="text-sm text-ink-secondary">{{ formatearHora(eventoSeleccionado.inicio) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Lugar</p>
              <p class="text-sm text-ink-secondary">{{ eventoSeleccionado.lugar || '—' }}</p>
            </div>
          </div>
          <div v-if="eventoSeleccionado.recurrente" class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <i class="pi pi-sync"></i> Recurrente
            </span>
          </div>
        </template>

        <template v-if="eventoSeleccionado.tipo === 'torneo'">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pb-2 border-b border-line">
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Fecha</p>
              <p class="text-sm text-ink-secondary">{{ formatearFechaCorta(eventoSeleccionado.inicio) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Hora</p>
              <p class="text-sm text-ink-secondary">{{ formatearHora(eventoSeleccionado.inicio) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Localidad</p>
              <p class="text-sm text-ink-secondary">{{ eventoSeleccionado.equipo?.localidad || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-tertiary font-medium">Categoría</p>
              <p class="text-sm text-ink-secondary">{{ eventoSeleccionado.categoria?.nombre || '—' }}</p>
            </div>
          </div>
          <div class="py-2 text-center">
            <p class="text-xs text-ink-tertiary font-medium">Nombre</p>
            <p class="text-base font-semibold text-ink-primary">{{ eventoSeleccionado.nombre || '—' }}</p>
          </div>
        </template>

        <div v-if="eventoSeleccionado.tipo === 'partido'" class="grid grid-cols-2 gap-4 py-3">
          <div class="flex flex-col items-center gap-2">
            <img :src="escudoLocal" alt="Escudo" class="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
            <div class="flex items-center gap-2">
              <EquipacionPrenda tipo="camiseta" :color="camisetaLocal" :size="28" />
              <EquipacionPrenda tipo="calzonas" :color="calzonasLocal" :size="28" />
              <EquipacionPrenda tipo="medias" :color="mediasLocal" :size="28" />
            </div>
            <span class="text-sm font-medium text-ink-secondary text-center">{{ nombreLocal }}</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <img :src="escudoVisitante" alt="Escudo" class="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
            <div class="flex items-center gap-2">
              <EquipacionPrenda tipo="camiseta" :color="camisetaVisitante" :size="28" />
              <EquipacionPrenda tipo="calzonas" :color="calzonasVisitante" :size="28" />
              <EquipacionPrenda tipo="medias" :color="mediasVisitante" :size="28" />
            </div>
            <span class="text-sm font-medium text-ink-secondary text-center">{{ nombreVisitante }}</span>
          </div>
        </div>

        <div class="text-sm text-ink-secondary space-y-1.5">
          <p v-if="eventoSeleccionado.incidencias">
            <i class="pi pi-exclamation-circle mr-2"></i>{{ eventoSeleccionado.incidencias }}
          </p>
        </div>

        <div
          v-if="eventoSeleccionado.tipo !== 'festivo'"
          class="flex justify-end gap-2 pt-2 border-t border-line"
        >
          <Button
            v-if="auth.puedeVer(seccionDeEvento(eventoSeleccionado.tipo)) && auth.puedeEditar()"
            label="Editar"
            icon="pi pi-pencil"
            text
            severity="secondary"
            @click="editarEvento"
          />
          <Button
            v-if="auth.puedeVer(seccionDeEvento(eventoSeleccionado.tipo)) && auth.puedeEliminar()"
            label="Eliminar"
            icon="pi pi-trash"
            text
            severity="danger"
            @click="eliminarEvento"
          />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="elegirTipoVisible" modal class="w-full max-w-xs">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Nuevo evento</span>
        </div>
      </template>
      <p class="text-sm text-ink-tertiary mb-3">¿Qué tipo de evento quieres registrar?</p>
      <div class="flex flex-col gap-2">
        <Button v-if="auth.puedeVer('entrenamientos')" label="Entrenamiento" icon="pi pi-clock" text
                class="!justify-start" @click="nuevoDeTipo('entrenamiento')" />
        <Button v-if="auth.puedeVer('partidos')" label="Partido" icon="pi pi-flag" text
                class="!justify-start" @click="nuevoDeTipo('partido')" />
        <Button v-if="auth.puedeVer('torneo')" label="Torneo" icon="pi pi-trophy" text
                class="!justify-start" @click="nuevoDeTipo('torneo')" />
      </div>
    </Dialog>

    <EventoFormCalendario
      v-model:visible="formVisible"
      :tipo="formTipo"
      :registroId="formRegistroId"
      :fechaDefecto="formFechaDefecto"
      @saved="onFormSaved"
    />

    <TorneoFormCalendario
      v-model:visible="torneoFormVisible"
      :registroId="torneoFormRegistroId"
      :fechaDefecto="formFechaDefecto"
      @saved="onFormSaved"
    />

    <Dialog v-model:visible="pdfDialogVisible" modal class="w-full max-w-sm">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Generar PDF calendario</span>
        </div>
      </template>
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Elige la semana</label>
          <DatePicker v-model="pdfSemana" dateFormat="dd/mm/yy" showIcon iconDisplay="input"
                      :manualInput="true" class="w-full" inputClass="w-full" />
        </div>
        <p class="text-xs text-ink-tertiary">
          Se generará el PDF con los entrenamientos y partidos de la semana (lunes a domingo) que contiene la fecha elegida:
          <span class="font-medium text-ink-secondary">
            {{ pdfSemana ? `${semanaDe(pdfSemana)?.inicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} al ${semanaDe(pdfSemana)?.fin.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : '—' }}
          </span>
        </p>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Tipos de evento</label>
          <MultiSelect v-model="pdfTipos" :options="OPCIONES_TIPO_EVENTO" optionLabel="label" optionValue="value"
                       display="chip" placeholder="Elige los tipos" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Tipo de fútbol</label>
          <Select v-model="pdfTipoFutbol" :options="OPCIONES_TIPO_FUTBOL" optionLabel="label" optionValue="value"
                  placeholder="Elige el tipo de fútbol" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" label="Cancelar" text severity="secondary" @click="pdfDialogVisible = false" />
          <Button type="button" label="Generar PDF" icon="pi pi-print" :loading="generandoPdf"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" @click="generarPdfSemana" />
        </div>
      </div>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<style>
.calendario-club .fc-festivo-nacional,
.calendario-club .fc-event[style*="215, 119, 6"],
.calendario-club .fc-daygrid-event {
  border-radius: 4px;
}
.calendario-club .fc-toolbar-title {
  font-size: 1.15rem;
  font-weight: 600;
}
.calendario-club .fc-partido-hora {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}
.calendario-club .fc-lv-icon {
  font-size: 0.65rem;
  vertical-align: middle;
}
.calendario-club .fc-lv-local {
  color: rgb(16 185 129);
}
.calendario-club .fc-lv-visitante {
  color: rgb(79 70 229);
}
.calendario-club .fc-partido-alias {
  font-weight: 500;
}
.calendario-club .fc-liga-badge,
.calendario-club .fc-amistoso-badge,
.calendario-club .fc-torneo-badge,
.calendario-club .fc-entrenamiento-badge {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}
.calendario-club .fc-liga-badge {
  background: rgb(16 185 129 / 15%);
  color: rgb(6 95 70);
}
.calendario-club .fc-torneo-badge {
  background: rgb(109 40 217 / 15%);
  color: rgb(88 28 135);
}
.calendario-club .fc-amistoso-badge {
  background: rgb(217 119 6 / 15%);
  color: rgb(146 64 14);
}
.calendario-club .fc-entrenamiento-badge {
  background: rgb(59 130 246 / 15%);
  color: rgb(30 64 175);
}
.calendario-club .fc-partido-lugar {
  font-weight: 400;
  opacity: 0.7;
}
.calendario-club .fc-col-header-cell-cushion,
.calendario-club .fc-daygrid-day-number {
  text-transform: capitalize;
}
.calendario-club .fc-evento-contenido {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  line-height: 1.2;
}
@media (max-width: 639px) {
  .calendario-club .fc-toolbar {
    flex-wrap: wrap;
    gap: 4px;
  }
  .calendario-club .fc-toolbar-chunk {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .calendario-club .fc-toolbar-title {
    font-size: 0.95rem !important;
    order: -1;
    width: 100%;
    text-align: center;
    padding: 4px 0;
  }
  .calendario-club .fc-button {
    padding: 4px 8px !important;
    font-size: 0.7rem !important;
  }
  .calendario-club .fc-daygrid-day {
    min-width: 0;
  }
  .calendario-club .fc-col-header-cell {
    padding: 4px 0;
    font-size: 0.7rem;
  }
  .calendario-club .fc-event {
    padding: 1px 2px;
  }
  .calendario-club .fc-partido-hora {
    font-size: 0.6rem;
  }
  .calendario-club .fc-partido-alias {
    font-size: 0.6rem;
  }
  .calendario-club .fc-liga-badge,
  .calendario-club .fc-amistoso-badge {
    font-size: 0.5rem;
    padding: 0 3px;
  }
}
</style>
