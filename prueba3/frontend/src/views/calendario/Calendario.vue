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
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import EventoFormCalendario from '../../components/EventoFormCalendario.vue';
import { calendarioService, categoriasService, entrenamientosService, partidosService } from '../../services';
import { eventosFestivosFullCalendar } from '../../utils/festivosEspana';
import { tituloCalendario } from '../../utils/tituloCalendario';
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
const confirm = useConfirm();
const toast = useToast();
const auth = useAuthStore();

const opcionesCategoria = computed(() => [
  { label: 'Todas las categorías', value: null },
  ...categorias.value.map(c => ({ label: c.nombre, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
]);

const golesLocal = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e || e.tipo !== 'partido' || !e.resultado) return '—';
  const partes = e.resultado.split('-');
  if (partes.length !== 2) return '—';
  return partes[0].trim();
});

const golesVisitante = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e || e.tipo !== 'partido' || !e.resultado) return '—';
  const partes = e.resultado.split('-');
  if (partes.length !== 2) return '—';
  return partes[1].trim();
});

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

const lugarPartido = computed(() => {
  const e = eventoSeleccionado.value;
  if (!e) return '—';
  if (!e.es_local) return e.equipoLocal?.localidad || '—';
  return e.lugar || '—';
});

const COLOR_ENTRENAMIENTO = '#0B3D2E';
const COLOR_PARTIDO = '#7A1E2B';
const COLOR_FESTIVO = '#D97706';

async function fetchEventos(fetchInfo, successCallback, failureCallback) {
  try {
    const eventos = await calendarioService.eventos({
      desde: fetchInfo.startStr,
      hasta: fetchInfo.endStr,
      id_categoria: filtroCategoria.value || undefined
    });

    const mapeados = eventos.map(e => ({
      id: e.id,
      title: e.titulo,
      start: e.inicio,
      color: e.tipo === 'partido' ? COLOR_PARTIDO : COLOR_ENTRENAMIENTO,
      extendedProps: e
    }));

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
  formTipo.value = tipo;
  formRegistroId.value = null;
  formVisible.value = true;
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
  const service = e.tipo === 'partido' ? partidosService : entrenamientosService;
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
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    const badge = e.jornada
      ? '<span class="fc-liga-badge">Liga</span>'
      : '<span class="fc-amistoso-badge">Amistoso</span>';
    return {
      html: `<div class="fc-evento-contenido">` +
        `<span class="fc-partido-hora">${hora}</span>` +
        icono +
        `<span class="fc-partido-alias">${alias}</span>` +
        badge +
        `</div>`
    };
  }
  if (e?.tipo === 'entrenamiento') {
    const hora = escapeHtml(formatearHora(e.inicio));
    const lugar = escapeHtml(e.lugar || '—');
    const categoria = escapeHtml(e.categoria?.alias || e.categoria?.nombre || '—');
    return {
      html: `<div class="fc-evento-contenido">` +
        `<span class="fc-partido-hora">${hora}</span>` +
        `<span class="fc-partido-lugar">${lugar}</span>` +
        `<span class="fc-partido-alias">${categoria}</span>` +
        `</div>`
    };
  }
  return { html: escapeHtml(arg.event?.title) };
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
  eventClick: onEventClick,
  dateClick: onDateClick,
  editable: false,
  selectable: false,
  dayMaxEvents: 4,
  fixedWeekCount: false
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
        <div class="flex items-center gap-2 text-xs text-ink-tertiary">
          <span class="w-3 h-3 rounded-full inline-block" style="background:#0B3D2E"></span> Entrenamiento
          <span class="w-3 h-3 rounded-full inline-block ml-2" style="background:#7A1E2B"></span> Partido
          <span class="w-3 h-3 rounded-full inline-block ml-2" style="background:#D97706"></span> Festivo
        </div>
        <Select
          v-model="filtroCategoria"
          :options="opcionesCategoria"
          optionLabel="label"
          optionValue="value"
          class="w-full sm:w-64"
          @change="refrescar"
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

        <div
          v-if="eventoSeleccionado.tipo === 'partido'"
          class="flex flex-col gap-2 py-3"
        >
          <div class="grid grid-cols-[44px_1fr_36px] sm:grid-cols-[80px_1fr_60px] items-center gap-2 sm:gap-3">
            <div class="flex justify-center">
              <img :src="escudoLocal" alt="Escudo" class="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
            </div>
            <span class="text-xs sm:text-sm font-medium text-ink-secondary text-left truncate">{{ nombreLocal }}</span>
            <span class="text-center text-base sm:text-lg font-bold text-club-green">{{ golesLocal }}</span>
          </div>

          <div class="grid grid-cols-[44px_1fr_36px] sm:grid-cols-[80px_1fr_60px] items-center gap-2 sm:gap-3">
            <div class="flex justify-center">
              <img :src="escudoVisitante" alt="Escudo" class="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
            </div>
            <span class="text-xs sm:text-sm font-medium text-ink-secondary text-left truncate">{{ nombreVisitante }}</span>
            <span class="text-center text-base sm:text-lg font-bold text-club-green">{{ golesVisitante }}</span>
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
            v-if="auth.puedeVer(eventoSeleccionado.tipo === 'partido' ? 'partidos' : 'entrenamientos') && auth.puedeEditar()"
            label="Editar"
            icon="pi pi-pencil"
            text
            severity="secondary"
            @click="editarEvento"
          />
          <Button
            v-if="auth.puedeVer(eventoSeleccionado.tipo === 'partido' ? 'partidos' : 'entrenamientos') && auth.puedeEliminar()"
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
      </div>
    </Dialog>

    <EventoFormCalendario
      v-model:visible="formVisible"
      :tipo="formTipo"
      :registroId="formRegistroId"
      :fechaDefecto="formFechaDefecto"
      @saved="onFormSaved"
    />

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
.calendario-club .fc-amistoso-badge {
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
