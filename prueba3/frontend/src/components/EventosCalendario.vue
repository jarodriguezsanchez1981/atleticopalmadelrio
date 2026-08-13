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
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import EventoFormCalendario from './EventoFormCalendario.vue';
import { calendarioService, entrenamientosService, partidosService } from '../services';
import { eventosFestivosFullCalendar } from '../utils/festivosEspana';
import { useAuthStore } from '../stores/auth.store';
import { emitirCambio, suscribirseCambio } from '../utils/cambioBus';

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
const confirm = useConfirm();
const toast = useToast();
const auth = useAuthStore();

const puedeCrear = computed(() => {
  if (props.tipo === 'entrenamiento') return auth.puedeVer('entrenamientos') && auth.puedeEditar();
  if (props.tipo === 'partido') return auth.puedeVer('partidos') && auth.puedeEditar();
  return (auth.puedeVer('entrenamientos') || auth.puedeVer('partidos')) && auth.puedeEditar();
});

function puedeEditarEvento(seccion) {
  return auth.puedeVer(seccion) && auth.puedeEditar();
}

function puedeEliminarEvento(seccion) {
  return auth.puedeVer(seccion) && auth.puedeEliminar();
}

const COLOR_ENTRENAMIENTO = '#0B3D2E';
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
    const rival = e.equipo?.nombre || '—';
    if (e.es_local) return `${categoria} vs ${rival} · ${lugar}`;
    return `${rival} vs ${categoria}`;
  }
  return `${categoria} - ${lugar}`;
}

async function fetchEventos(fetchInfo, successCallback, failureCallback) {
  try {
    const eventos = await calendarioService.eventos({
      desde: fetchInfo.startStr,
      hasta: fetchInfo.endStr,
      id_categoria: props.idCategoria || undefined,
      tipo: props.tipo || undefined
    });

    const mapeados = eventos.map((e) => ({
      id: e.id,
      title: etiquetaEvento(e),
      start: e.inicio,
      color: e.tipo === 'partido' ? COLOR_PARTIDO : COLOR_ENTRENAMIENTO,
      extendedProps: e
    }));

    const festivos = props.showFestivos
      ? eventosFestivosFullCalendar(fetchInfo.startStr, fetchInfo.endStr).map((f) => ({
          ...f,
          display: 'auto',
          color: COLOR_FESTIVO,
          backgroundColor: '#FDE68A',
          borderColor: '#D97706',
          textColor: '#78350F'
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
      message: 'Este entrenamiento es recurrente. ¿Quieres eliminar solo esta sesión o todas las sesiones del entrenamiento?',
      header: 'Eliminar entrenamiento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Todas',
      rejectLabel: 'Solo esta',
      acceptClass: 'p-button-danger',
      rejectClass: 'p-button-secondary',
      accept: () => eliminarEntrenamiento(id),
      reject: () => eliminarSesionEntrenamiento(e, id)
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

async function eliminarEntrenamiento(id) {
  try {
    await entrenamientosService.eliminar(id);
    dialogVisible.value = false;
    await refrescar();
    emitirCambio();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo eliminar el entrenamiento.',
      life: 5000
    });
  }
}

async function eliminarSesionEntrenamiento(e, id) {
  const baseId = e.base_id || id;
  const semanalId = String(e.id || '').replace('entrenamiento-', '');
  const service = entrenamientosService;
  try {
    if (semanalId && semanalId !== baseId) {
      await service.eliminarSemanal(semanalId);
    } else {
      await service.eliminar(baseId);
    }
    dialogVisible.value = false;
    await refrescar();
    emitirCambio();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo eliminar la sesión.',
      life: 5000
    });
  }
}

function onFormSaved() {
  refrescar();
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

function onDateClick(info) {
  if (!info?.dateStr) return;
  formTipo.value = props.tipo || 'entrenamiento';
  formRegistroId.value = null;
  formFechaDefecto.value = info.dateStr;
  formVisible.value = true;
}

function refrescar() {
  calendarRef.value?.getApi()?.refetchEvents();
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
  eventClick: onEventClick,
  dateClick: onDateClick,
  editable: false,
  selectable: false,
  dayMaxEvents: 4,
  fixedWeekCount: false
};

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return d.toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
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
  unsubCambio = suscribirseCambio(() => refrescar());
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});
</script>

<template>
  <div class="mt-6">
    <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
      <div>
        <h2 class="font-display text-lg text-club-green flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-6 h-6 object-contain" />
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-sm text-slate-500">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <template v-if="!tipo || tipo === 'entrenamiento'">
          <span class="w-3 h-3 rounded-full inline-block" :style="{ background: COLOR_ENTRENAMIENTO }"></span>
          Entrenamiento
        </template>
        <template v-if="!tipo || tipo === 'partido'">
          <span
            class="w-3 h-3 rounded-full inline-block"
            :class="{ 'ml-2': !tipo }"
            :style="{ background: COLOR_PARTIDO }"
          ></span>
          Partido
        </template>
        <template v-if="showFestivos">
          <span class="w-3 h-3 rounded-full inline-block ml-2" :style="{ background: COLOR_FESTIVO }"></span>
          Festivo
        </template>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4 calendario-club" :style="{ '--fc-event-bg-color': colorPrincipal }">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <Dialog v-model:visible="dialogVisible" modal class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Detalle del evento</span>
        </div>
      </template>

      <div v-if="eventoSeleccionado" class="space-y-3">
        <div
          v-if="eventoSeleccionado.tipo === 'partido' && eventoSeleccionado.equipo"
          class="flex items-center justify-center gap-4 py-3"
        >
          <div class="flex flex-col items-center gap-1.5">
            <img :src="eventoSeleccionado.es_local ? '/escudo.png' : (eventoSeleccionado.equipo.escudo || '/escudo.png')"
                 alt="Escudo"
                 class="w-20 h-20 object-contain" />
            <span class="text-xs font-medium text-slate-600 text-center">
              {{ eventoSeleccionado.es_local ? 'Atlético Palma' : eventoSeleccionado.equipo.nombre }}
            </span>
          </div>

          <span class="text-lg font-display text-slate-400">VS</span>

          <div class="flex flex-col items-center gap-1.5">
            <img :src="eventoSeleccionado.es_local ? (eventoSeleccionado.equipo.escudo || '/escudo.png') : '/escudo.png'"
                 alt="Escudo"
                 class="w-20 h-20 object-contain" />
            <span class="text-xs font-medium text-slate-600 text-center">
              {{ eventoSeleccionado.es_local ? eventoSeleccionado.equipo.nombre : 'Atlético Palma' }}
            </span>
          </div>
        </div>

        <Tag
          :severity="severidadTipo(eventoSeleccionado.tipo)"
          :value="etiquetaTipo(eventoSeleccionado.tipo)"
        />
        <h3 class="font-display text-lg text-club-green">{{ eventoSeleccionado.titulo }}</h3>
        <div class="text-sm text-slate-600 space-y-1.5">
          <p><i class="pi pi-calendar mr-2"></i>{{ formatearFecha(eventoSeleccionado.inicio) }}</p>
          <p v-if="eventoSeleccionado.lugar">
            <i class="pi pi-map-marker mr-2"></i>{{ eventoSeleccionado.lugar }}
          </p>
          <p v-if="eventoSeleccionado.categoria">
            <i class="pi pi-sitemap mr-2"></i>
            {{ eventoSeleccionado.categoria.nombre }}
            ({{ eventoSeleccionado.categoria.temporada?.nombre || '' }})
          </p>
          <p v-if="eventoSeleccionado.equipo">
            <i class="pi pi-flag mr-2"></i>Rival: {{ eventoSeleccionado.equipo.nombre }}
          </p>
          <p v-if="eventoSeleccionado.incidencias">
            <i class="pi pi-exclamation-circle mr-2"></i>{{ eventoSeleccionado.incidencias }}
          </p>
        </div>

        <div
          v-if="eventoSeleccionado.tipo !== 'festivo'"
          class="flex justify-end gap-2 pt-2 border-t border-slate-100"
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
  text-transform: capitalize;
}
.calendario-club .fc-col-header-cell-cushion,
.calendario-club .fc-daygrid-day-number {
  text-transform: capitalize;
}
</style>
