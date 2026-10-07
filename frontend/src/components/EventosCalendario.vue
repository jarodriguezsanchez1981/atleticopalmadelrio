<script setup>
/**
 * Calendario de solo lectura para entrenamientos y/o partidos + festivos ES.
 */
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { estiloTabla } from '../utils/estiloTabla';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import EventoFormCalendario from './EventoFormCalendario.vue';
import EquipacionPrenda from './EquipacionPrenda.vue';
import CalendarioLista from './CalendarioLista.vue';
import { calendarioService, entrenamientosService, partidosService } from '../services';
import { moverEvento, puedeMoverEvento } from '../utils/moverEvento';
import { eventosFestivosFullCalendar } from '../utils/festivosEspana';
import { tituloCalendario } from '../utils/tituloCalendario';
import { generarPdfPartidos } from '../utils/pdfPartidos';
import { escudoEquipo, cargarEscudos } from '../utils/escudosEquipos';
import { generarPdfEntrenamientos } from '../utils/pdfEntrenamientos';
import { useAuthStore } from '../stores/auth.store';
import { emitirCambio, suscribirseCambio } from '../utils/cambioBus';
import { useMediaQuery } from '../composables/useMediaQuery';

const props = defineProps({
  tipo: {
    type: String,
    default: null,
    validator: (v) => v == null || v === 'entrenamiento' || v === 'partido'
  },
  idCategoria: { type: [Number, String], default: null },
  title: { type: String, default: 'Calendario' },
  subtitle: { type: String, default: '' },
  showFestivos: { type: Boolean, default: true }
});

const calendarRef = ref();
const eventoSeleccionado = ref(null);
const dialogVisible = ref(false);
const formVisible = ref(false);
const formTipo = ref('entrenamiento');
const formRegistroId = ref(null);
const formFechaDefecto = ref(null);
const esMovil = useMediaQuery('(max-width: 639px)');
const eventosLista = ref([]);

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
  return escudoEquipo(e.equipoLocal?.id) || '/escudo.png';
});

const escudoVisitante = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '/escudo.png';
  return escudoEquipo(e.equipoVisitante?.id) || '/escudo.png';
});

// Los escudos no vienen en los eventos: se piden al abrir el detalle.
watch(eventoSeleccionado, (e) => {
  if (e?.tipo === 'partido') cargarEscudos([e.equipoLocal?.id, e.equipoVisitante?.id]).catch(() => {});
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
const generandoPdf = ref(false);
const pdfDialogVisible = ref(false);
const pdfSemana = ref(new Date());
const pdfTipoFutbol = ref(null);
const confirm = useConfirm();
const toast = useToast();
const auth = useAuthStore();

const PALMA_ID = 73;

/** Listado completo de partidos, solo para coordinadores. Agrupado primero por
 * los partidos en los que PALMA juega como local, luego por orden de categoría. */
const esCoordinador = computed(() => props.tipo === 'partido' && auth.rol === 'coordinador');
const todosPartidos = ref([]);
const cargandoPartidos = ref(false);

async function cargarTodosPartidos() {
  if (!esCoordinador.value) { todosPartidos.value = []; return; }
  cargandoPartidos.value = true;
  try {
    todosPartidos.value = await partidosService.listar();
  } finally {
    cargandoPartidos.value = false;
  }
}

const partidosOrdenados = computed(() => {
  return [...todosPartidos.value].sort((a, b) => {
    const localA = Number(a.id_equipo_local) === PALMA_ID ? 0 : 1;
    const localB = Number(b.id_equipo_local) === PALMA_ID ? 0 : 1;
    if (localA !== localB) return localA - localB;
    const ordenA = a.plantilla?.categoria?.orden ?? 999;
    const ordenB = b.plantilla?.categoria?.orden ?? 999;
    return ordenA - ordenB;
  });
});

function abrirEdicionPartido(partido) {
  formTipo.value = 'partido';
  formRegistroId.value = partido.id;
  formFechaDefecto.value = null;
  formVisible.value = true;
}

const puedeCrear = computed(() => {
  if (props.tipo === 'entrenamiento') return auth.puedeVer('entrenamientos') && auth.puedeEditar('entrenamientos');
  if (props.tipo === 'partido') return auth.puedeVer('partidos') && auth.puedeEditar('partidos');
  return (auth.puedeVer('entrenamientos') && auth.puedeEditar('entrenamientos'))
    || (auth.puedeVer('partidos') && auth.puedeEditar('partidos'));
});

function puedeEditarEvento(seccion) {
  return auth.puedeVer(seccion) && auth.puedeEditar(seccion);
}

function puedeEliminarEvento(seccion) {
  return auth.puedeVer(seccion) && auth.puedeEliminar(seccion);
}

const COLOR_ENTRENAMIENTO = '#0F3D22';
const COLOR_PARTIDO = '#7A1E2B';
const COLOR_FESTIVO = '#D97706';

const colorPrincipal = computed(() =>
  props.tipo === 'partido' ? COLOR_PARTIDO : COLOR_ENTRENAMIENTO
);

function formatearHora(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function etiquetaEvento(e) {
  const hora = formatearHora(e.inicio);
  const categoria = e.categoria?.nombre || '—';
  const lugar = e.lugar || '—';

  if (e.tipo === 'partido') {
    const alias = e.categoria?.alias || e.categoria?.nombre || '—';
    return alias;
  }
  return `${categoria} - ${lugar}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Contenido HTML del evento: hora + icono local/visitante + alias + lugar para partidos;
 *  hora + lugar + alias para entrenamientos. */
function contenidoEvento(arg) {
  const e = arg.event?.extendedProps;
  if (e?.tipo === 'partido') {
    const hora = escapeHtml(formatearHora(e.inicio));
    // "*" = partido con el acta de RFAF ya finalizada.
    const alias = escapeHtml(e.categoria?.alias || e.categoria?.nombre || '—') + (e.acta_finalizada ? ' *' : '');
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
        `<span class="fc-lv-icon" aria-hidden="true"></span>` +
        `<span class="fc-partido-alias">${categoria}</span>` +
        `<span class="fc-partido-lugar">${lugar}</span>` +
        `</div>`
    };
  }
  if (e?.tipo === 'festivo') {
    return {
      html: `<div class="fc-evento-contenido fc-evento-festivo"><i class="pi pi-star-fill" style="font-size:10px"></i><span>${escapeHtml(e.titulo || arg.event?.title || '')}</span></div>`
    };
  }
  return { html: escapeHtml(arg.event?.title) };
}

const GRUPO_LABELS = {
  LIGA: { label: 'LIGA', color: '#0F3D22', icon: 'pi pi-star-fill' },
  AMISTOSO: { label: 'AMISTOSO', color: '#D97706', icon: 'pi pi-handshake' },
  TORNEO: { label: 'TORNEO', color: '#6D28D9', icon: 'pi pi-trophy' },
  ENTRENAMIENTO: { label: 'ENTRENAMIENTO', color: '#2563EB', icon: 'pi pi-calendar' },
  SUSPENDIDO: { label: 'SUSPENDIDO', color: '#DC2626', icon: 'pi pi-ban' }
};

function cabeceraGrupoHtml(e) {
  if (!e.esPrimeroGrupo) return '';
  const meta = GRUPO_LABELS[e.miGrupo];
  if (!meta) return '';
  return `<div class="fc-grupo-cabecera" style="background:${meta.color};color:#fff;font-size:9px;font-weight:700;padding:1px 4px;margin:0 0 5px;border-radius:3px;letter-spacing:0.3px;display:flex;align-items:center;gap:3px;line-height:1.2;width:100%;"><i class="${meta.icon}" style="font-size:9px"></i>${meta.label}</div>`;
}

async function fetchEventos(fetchInfo, successCallback, failureCallback) {
  try {
    const eventos = await calendarioService.eventos({
      desde: fetchInfo.startStr,
      hasta: fetchInfo.endStr,
      id_categoria: props.idCategoria || undefined,
      tipo: props.tipo || undefined
    });

    const conGrupo = eventos.map((e) => {
      const miGrupo = e.tipo === 'partido'
        ? (e.suspendido ? 'SUSPENDIDO' : (e.jornada ? 'LIGA' : 'AMISTOSO'))
        : (e.tipo === 'torneo' ? 'TORNEO' : 'ENTRENAMIENTO');
      // Los partidos (liga o amistoso) se agrupan juntos por hora, con los partidos en los
      // que PALMA juega como local por delante; torneos y entrenamientos van después, como hasta ahora.
      // Los partidos suspendidos forman su propia sección, siempre la última del día.
      const grupoOrden = { LIGA: 1, AMISTOSO: 1, TORNEO: 2, ENTRENAMIENTO: 3, SUSPENDIDO: 4 }[miGrupo];
      const esLocalOrden = e.tipo === 'partido' ? (e.es_local ? 0 : 1) : 0;
      return {
        id: e.id,
        title: etiquetaEvento(e),
        editable: puedeMoverEvento(e, auth),
        start: e.inicio,
        color: e.tipo === 'partido' ? COLOR_PARTIDO : COLOR_ENTRENAMIENTO,
        extendedProps: e,
        miGrupo,
        grupoOrden,
        esLocalOrden
      };
    });

    // Cabecera de grupo (LIGA/AMISTOSO/TORNEO/ENTRENAMIENTO): se marca sobre el primer evento
    // de cada (día, tipo) según el mismo orden con el que FullCalendar los va a pintar
    // (eventOrder: 'grupoOrden,start,esLocalOrden'), para que la cabecera caiga siempre
    // en el evento que realmente se ve primero, incluso con varios partidos a la misma hora.
    const ordenados = [...conGrupo].sort((a, b) => {
      if (a.grupoOrden !== b.grupoOrden) return a.grupoOrden - b.grupoOrden;
      const ta = a.start ? new Date(a.start).getTime() : Infinity;
      const tb = b.start ? new Date(b.start).getTime() : Infinity;
      if (ta !== tb) return ta - tb;
      return a.esLocalOrden - b.esLocalOrden;
    });
    const primerPorGrupo = new Map();
    for (const ev of ordenados) {
      const diaKey = String(ev.start || '').slice(0, 10);
      const key = `${diaKey}__${ev.miGrupo}`;
      if (!primerPorGrupo.has(key)) primerPorGrupo.set(key, ev.id);
    }

    const mapeados = conGrupo.map((ev) => {
      const diaKey = String(ev.start || '').slice(0, 10);
      const key = `${diaKey}__${ev.miGrupo}`;
      const esPrimeroGrupo = primerPorGrupo.get(key) === ev.id;
      ev.extendedProps = { ...ev.extendedProps, esPrimeroGrupo, miGrupo: ev.miGrupo };
      return ev;
    });

    const festivos = props.showFestivos
      ? eventosFestivosFullCalendar(fetchInfo.startStr, fetchInfo.endStr).map((f) => ({
          id: f.id,
          title: f.title,
          start: f.start,
          allDay: true,
          display: 'auto',
          backgroundColor: '#FDE68A',
          borderColor: '#D97706',
          textColor: '#78350F',
          classNames: ['fc-festivo-nacional'],
      editable: false,
          extendedProps: f.extendedProps
        }))
      : [];

    successCallback([...mapeados, ...festivos]);
  } catch (err) {
    failureCallback(err);
  }
}

function idDeEvento(e) {
  if (e.tipo === 'partido') return String(e.id || '').replace('partido-', '');
  return e.base_id;
}

function editarEvento() {
  const e = eventoSeleccionado.value;
  if (!e) return;
  formTipo.value = e.tipo === 'partido' ? 'partido' : 'entrenamiento';
  formRegistroId.value = idDeEvento(e);
  formFechaDefecto.value = null;
  dialogVisible.value = false;
  formVisible.value = true;
}

function eliminarEvento() {
  const e = eventoSeleccionado.value;
  if (!e) return;
  const id = idDeEvento(e);
  const service = e.tipo === 'partido' ? partidosService : entrenamientosService;

  if (e.tipo === 'entrenamiento' && e.recurrente) {
    confirm.require({
      message: 'Este entrenamiento forma parte de una serie semanal para esta plantilla. ¿Quieres eliminar solo esta sesión o todas las sesiones de esta plantilla?',
      header: 'Eliminar entrenamiento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Todas',
      rejectLabel: 'Solo esta',
      acceptClass: 'p-button-danger',
      rejectClass: 'p-button-secondary',
      accept: () => eliminarEntrenamiento(id, 'serie'),
      reject: () => eliminarEntrenamiento(id, 'dia')
    });
    return;
  }

  confirm.require({
    message: e.tipo === 'partido'
      ? '¿Seguro que quieres eliminar este partido? Esta acción no se puede deshacer.'
      : '¿Seguro que quieres eliminar este entrenamiento? Esta acción no se puede deshacer.',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await service.eliminar(id);
        dialogVisible.value = false;
        await refrescar();
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

/** alcance: 'dia' borra solo este registro; 'serie' borra además el resto de
 * semanas de la misma serie recurrente (misma plantilla y misma fecha límite). */
async function eliminarEntrenamiento(id, alcance) {
  try {
    const resultado = await entrenamientosService.eliminar(id, alcance);
    dialogVisible.value = false;
    await refrescar();
    emitirCambio();
    if (alcance === 'serie' && resultado?.eliminados > 1) {
      toast.add({
        severity: 'info',
        summary: 'Serie eliminada',
        detail: `Se han eliminado ${resultado.eliminados} entrenamientos de esta plantilla.`,
        life: 5000
      });
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo eliminar el entrenamiento.',
      life: 5000
    });
  }
}

function onFormSaved() {
  refrescar();
  cargarTodosPartidos();
  emitirCambio();
}

function onEventClick(info) {
  eventoSeleccionado.value = {
    ...info.event.extendedProps,
    titulo: info.event.extendedProps?.titulo || info.event.title,
    inicio: info.event.extendedProps?.inicio || info.event.start
  };
  dialogVisible.value = true;
}

function onEventClickMovil(e) {
  if (e.tipo === 'festivo') return;
  eventoSeleccionado.value = { ...e, titulo: e.titulo || e.equipo?.nombre || '' };
  dialogVisible.value = true;
}

function onDateClickMovil(dateStr) {
  if (!dateStr) return;
  formTipo.value = props.tipo || 'entrenamiento';
  formRegistroId.value = null;
  formFechaDefecto.value = dateStr;
  formVisible.value = true;
}

function onDateClick(info) {
  if (!info?.dateStr) return;
  formTipo.value = props.tipo || 'entrenamiento';
  formRegistroId.value = null;
  formFechaDefecto.value = info.dateStr;
  formVisible.value = true;
}

function obtenerSemanaVisible() {
  const api = calendarRef.value?.getApi();
  if (!api) return null;
  const vista = api.view;
  if (!vista) return null;
  const inicio = new Date(vista.activeStart);
  const fin = new Date(vista.activeEnd);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;
  fin.setDate(fin.getDate() - 1);
  return { inicio, fin };
}

async function abrirPdfSemana() {
  pdfSemana.value = new Date();
  pdfTipoFutbol.value = null;
  pdfDialogVisible.value = true;
}

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
    const desdeISO = new Date(inicio).toISOString();
    const hastaISO = hasta.toISOString();
    const fechaTitulo = `${inicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} al ${fin.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

    if (props.tipo === 'entrenamiento') {
      const entrenamientos = await entrenamientosService.listar({ desde: desdeISO, hasta: hastaISO });
      await generarPdfEntrenamientos(entrenamientos, fechaTitulo, tipoFutbol);
      return;
    }

    const partidos = await partidosService.listar({ desde: desdeISO, hasta: hastaISO });

    const mapeados = partidos
      .filter((p) => tipoFutbol == null || (p.categoria?.id_tipofutbol || p.plantilla?.categoria?.id_tipofutbol || 0) === tipoFutbol)
      .map((p) => ({
        inicio: p.fecha,
        equipoLocal: p.equipoLocal || null,
        equipoVisitante: p.equipoVisitante || null,
        lugar: p.lugar || null,
        categoria: p.plantilla?.categoria || p.categoria || null
      }));
    await generarPdfPartidos(mapeados, fechaTitulo, tipoFutbol);
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

/** Al soltar un partido en otro día: se guarda el nuevo día (misma hora). Si el
 * backend lo rechaza (p.ej. la plantilla ya tiene otro evento ese día), el
 * partido vuelve a su sitio. */
async function onEventDrop(info) {
  try {
    await moverEvento(info.event, info.oldEvent);
    toast.add({ severity: 'success', summary: 'Partido movido', detail: `Movido al ${info.event.start.toLocaleDateString('es-ES')}.`, life: 3000 });
    emitirCambio();
    refrescar();
  } catch (err) {
    info.revert();
    toast.add({
      severity: 'error',
      summary: 'No se pudo mover',
      detail: err.response?.data?.message || err.message || 'No se pudo mover el partido.',
      life: 5000
    });
  }
}

function refrescar() {
  const api = calendarRef.value?.getApi();
  if (api) {
    api.refetchEvents();
  } else if (esMovil.value) {
    fetchEventosMobile();
  }
}

async function fetchEventosMobile() {
  try {
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const hasta = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    const eventos = await calendarioService.eventos({
      desde,
      hasta,
      id_categoria: props.idCategoria || undefined,
      tipo: props.tipo || undefined
    });
    const festivos = eventosFestivosFullCalendar(desde, hasta).map(f => ({
      id: f.id,
      tipo: 'festivo',
      titulo: f.title.replace('🎉 ', ''),
      inicio: f.start,
      lugar: null,
      categoria: null
    }));
    eventosLista.value = eventos.concat(festivos);
  } catch {}
}

watch(
  () => [props.tipo, props.idCategoria],
  () => refrescar()
);

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
  eventClick: onEventClick,
  dateClick: onDateClick,
  // Los partidos se pueden arrastrar a otro día (con permiso de edición en
  // Partidos, ver puedeMoverEvento); la duración no se cambia.
  editable: true,
  eventDurationEditable: false,
  eventDrop: onEventDrop,
  selectable: false,
  dayMaxEvents: false,
  fixedWeekCount: false,
  eventOrder: 'grupoOrden,start,esLocalOrden'
};

function formatearFecha(fecha) {
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

function etiquetaTipo(tipo) {
  if (tipo === 'partido') return 'Partido';
  if (tipo === 'festivo') return 'Festivo nacional';
  return 'Entrenamiento';
}

function severidadTipo(tipo) {
  if (tipo === 'partido') return 'danger';
  if (tipo === 'festivo') return 'warn';
  return 'success';
}

defineExpose({ refrescar });

let unsubCambio = null;
onMounted(() => {
  unsubCambio = suscribirseCambio(() => { refrescar(); cargarTodosPartidos(); });
  if (esMovil.value) fetchEventosMobile();
  cargarTodosPartidos();
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

watch(esMovil, (v) => { if (v && !eventosLista.value.length) fetchEventosMobile(); });
</script>

<template>
  <div class="mt-6">
    <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
      <div>
        <h2 class="font-display text-lg text-club-green flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-6 h-6 object-contain" />
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-sm text-ink-tertiary">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="tipo"
          label="PDF"
          icon="pi pi-print"
          size="small"
          text
          :loading="generandoPdf"
          @click="abrirPdfSemana"
        />
      </div>
    </div>

    <div class="bg-white rounded-xl  p-4 calendario-club" :style="{ '--fc-event-bg-color': colorPrincipal }">
      <FullCalendar v-if="!esMovil" ref="calendarRef" :options="calendarOptions" />
      <CalendarioLista
        v-else
        :eventos="eventosLista"
        :id-categoria="idCategoria"
        @event-click="onEventClickMovil"
        @date-click="onDateClickMovil"
      />
    </div>

    <div v-if="esCoordinador" class="mt-6">
      <h3 class="text-sm font-semibold text-club-green mb-2">Todos los partidos</h3>
      <DataTable v-bind="estiloTabla" class="ar-dt-compacta" :value="partidosOrdenados" :loading="cargandoPartidos" paginator :rows="15" :rowsPerPageOptions="[15, 30, 50]"
                 responsiveLayout="scroll">
        <Column header="Categoría">
          <template #body="{ data }">{{ data.plantilla?.categoria?.alias || data.plantilla?.categoria?.nombre || '—' }}{{ data.acta_finalizada_at ? ' *' : '' }}</template>
        </Column>
        <Column header="Fecha">
          <template #body="{ data }">{{ data.fecha ? new Date(data.fecha).toLocaleDateString('es-ES') : '—' }}</template>
        </Column>
        <Column header="Hora">
          <template #body="{ data }">{{ formatearHora(data.fecha) }}</template>
        </Column>
        <Column header="Local">
          <template #body="{ data }">
            <span :class="{ 'font-semibold text-club-green': Number(data.id_equipo_local) === PALMA_ID }">
              {{ data.equipoLocal?.nombre || '—' }}
            </span>
          </template>
        </Column>
        <Column header="Visitante">
          <template #body="{ data }">
            <span :class="{ 'font-semibold text-club-green': Number(data.id_equipo_visitante) === PALMA_ID }">
              {{ data.equipoVisitante?.nombre || '—' }}
            </span>
          </template>
        </Column>
        <Column header="Lugar">
          <template #body="{ data }">{{ data.lugar?.nombre || '—' }}</template>
        </Column>
        <Column header="Acciones" style="width: 80px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded size="small" class="!text-club-green"
                    v-tooltip.top="'Editar'" @click="abrirEdicionPartido(data)" />
          </template>
        </Column>
        <template #empty>
          <div class="text-center text-ink-tertiary py-6">No hay partidos registrados.</div>
        </template>
      </DataTable>
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
          <span v-if="eventoSeleccionado?.suspendido" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            <i class="pi pi-ban"></i> Suspendido
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
            v-if="puedeEditarEvento(eventoSeleccionado.tipo === 'partido' ? 'partidos' : 'entrenamientos')"
            label="Editar"
            icon="pi pi-pencil"
            text
            severity="secondary"
            @click="editarEvento"
          />
          <Button
            v-if="puedeEliminarEvento(eventoSeleccionado.tipo === 'partido' ? 'partidos' : 'entrenamientos')"
            label="Eliminar"
            icon="pi pi-trash"
            text
            severity="danger"
            @click="eliminarEvento"
          />
        </div>
      </div>
    </Dialog>

    <EventoFormCalendario
      v-model:visible="formVisible"
      :tipo="formTipo"
      :registroId="formRegistroId"
      :fechaDefecto="formFechaDefecto"
      @saved="onFormSaved"
    />

    <Dialog v-model:visible="pdfDialogVisible" modal class="w-full max-w-sm">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Generar PDF {{ tipo === 'entrenamiento' ? 'entrenamientos' : 'partidos' }}</span>
        </div>
      </template>
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Elige la semana</label>
          <DatePicker v-model="pdfSemana" dateFormat="dd/mm/yy" showIcon iconDisplay="input"
                      :manualInput="true" class="w-full" inputClass="w-full" />
        </div>
        <p class="text-xs text-ink-tertiary">
          Se generará el PDF con los {{ tipo === 'entrenamiento' ? 'entrenamientos' : 'partidos' }} de la semana (lunes a domingo) que contiene la fecha elegida:
          <span class="font-medium text-ink-secondary">
            {{ pdfSemana ? `${semanaDe(pdfSemana)?.inicio.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} al ${semanaDe(pdfSemana)?.fin.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : '—' }}
          </span>
        </p>
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
/* Etiqueta de partido / torneo / entrenamiento en columnas de ancho fijo
   (hora | icono local-visitante | categoría | lugar) para que todos los
   eventos del día queden alineados; la cabecera de grupo ocupa la fila.
   Cada columna puede encogerse (minmax(0, …)) si la casilla del día es más
   estrecha, y lo que no quepa se recorta dentro del evento en vez de
   invadir el día de al lado. */
.calendario-club .fc-daygrid-event,
.calendario-club .fc-daygrid-event-harness {
  max-width: 100%;
  overflow: hidden;
}
.calendario-club .fc-evento-contenido {
  display: grid;
  grid-template-columns: minmax(0, 2.2rem) minmax(0, 0.7rem) minmax(0, 2.9rem) minmax(0, 1fr);
  column-gap: 4px;
  align-items: center;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  line-height: 1.25;
  padding: 1px 1px;
}
.calendario-club .fc-evento-contenido > span,
.calendario-club .fc-evento-contenido > i {
  min-width: 0;
  overflow: hidden;
}
.calendario-club .fc-evento-contenido .fc-partido-hora {
  white-space: nowrap;
}
.calendario-club .fc-evento-contenido > .fc-grupo-cabecera {
  grid-column: 1 / -1;
}
.calendario-club .fc-evento-contenido .fc-partido-alias {
  white-space: nowrap;
  text-overflow: ellipsis;
}
.calendario-club .fc-evento-contenido .fc-partido-lugar {
  min-width: 0;
  overflow-wrap: anywhere;
}
.calendario-club .fc-evento-contenido.fc-evento-festivo {
  display: flex;
  gap: 4px;
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
  .calendario-club .fc-amistoso-badge,
  .calendario-club .fc-entrenamiento-badge {
    font-size: 0.6rem;
    padding: 0 3px;
  }
}
</style>
