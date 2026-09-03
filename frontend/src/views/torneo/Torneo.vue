<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { torneosService, plantillasService, equiposService } from '../../services';
import { tituloCalendario } from '../../utils/tituloCalendario';
import { useAuthStore } from '../../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../../utils/cambioBus';
import CalendarioLista from '../../components/CalendarioLista.vue';
import { useMediaQuery } from '../../composables/useMediaQuery';

const toast = useToast();
const confirm = useConfirm();
const auth = useAuthStore();
const plantillas = ref([]);
const equipos = ref([]);
let unsubCambio = null;

const crudRef = ref();
const calendarRef = ref();
const esMovil = useMediaQuery('(max-width: 639px)');
const eventosLista = ref([]);

async function cargarOpciones() {
  const [pls, eqs] = await Promise.all([
    plantillasService.listar(),
    equiposService.listar()
  ]);
  plantillas.value = pls;
  equipos.value = eqs;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(refrescar);
  if (esMovil.value) fetchTorneosMobile();
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

watch(esMovil, (v) => { if (v && !eventosLista.value.length) fetchTorneosMobile(); });

const opcionesPlantilla = computed(() =>
  plantillas.value.map(p => ({
    label: `${p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}`,
    value: p.id
  })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value.map(e => ({ label: e.nombre, value: e.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_plantilla', header: 'Plantilla', type: 'select', options: opcionesPlantilla.value, required: true },
  { field: 'id_equipo', header: 'Equipo', type: 'select', options: opcionesEquipo.value, required: true },
  { field: 'nombre', header: 'Nombre', type: 'text', required: false, enDetalle: false },
  { field: 'fecha', header: 'Fecha', type: 'date', required: true, format: (v) => formatFecha(v) },
  { field: 'hora', header: 'Hora', type: 'text', required: false }
]);

const emptyItem = { id_plantilla: null, id_equipo: null, nombre: null, fecha: null, hora: null };

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function nombrePlantilla(id) {
  const p = plantillas.value.find(pl => pl.id === id);
  return p ? `${p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}` : '—';
}

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function formatoHora(fecha, hora) {
  const base = new Date(fecha || new Date());
  const h = String(hora || '').slice(0, 5) || '00:00';
  const [hh, mm] = h.split(':').map(Number);
  base.setHours(hh || 0, mm || 0, 0, 0);
  return base;
}

async function fetchTorneos(fetchInfo, successCallback, failureCallback) {
  try {
    const items = await torneosService.listar({
      desde: fetchInfo.startStr,
      hasta: fetchInfo.endStr
    });
    const gruposPorDia = new Map();
    const conGrupo = items.map(t => {
      const diaKey = String(t.fecha || '').slice(0, 10);
      let bucket = gruposPorDia.get(diaKey);
      if (!bucket) {
        bucket = { firstId: null, firstFecha: null };
        gruposPorDia.set(diaKey, bucket);
      }
      const f = t.fecha ? new Date(String(t.fecha).slice(0, 10)).getTime() : Infinity;
      if (bucket.firstFecha == null || f < bucket.firstFecha) {
        bucket.firstFecha = f;
        bucket.firstId = t.id;
      }
      return {
        id: String(t.id),
        title: `${t.nombre || t.equipo?.nombre || nombreEquipo(t.id_equipo)} · Torneo`,
        start: formatoHora(t.fecha, t.hora),
        color: '#6D28D9',
        extendedProps: { ...t, miGrupo: 'TORNEO' },
        miGrupo: 'TORNEO',
        miGrupoOrden: 3
      };
    });
    const eventos = conGrupo.map(ev => {
      const diaKey = String(ev.start || '').slice(0, 10).slice(0, 10);
      const bucket = gruposPorDia.get(diaKey);
      const esPrimeroGrupo = bucket && bucket.firstId === Number(ev.id);
      ev.extendedProps = { ...ev.extendedProps, esPrimeroGrupo };
      return ev;
    });
    successCallback(eventos);
    eventosLista.value = items.map(t => ({
      id: t.id,
      tipo: 'torneo',
      titulo: t.nombre || t.equipo?.nombre || '',
      inicio: formatoHora(t.fecha, t.hora),
      lugar: t.lugar || null,
      categoria: t.plantilla?.categoria || null
    }));
  } catch (err) {
    failureCallback(err);
  }
}

function refrescar() {
  const api = calendarRef.value?.getApi();
  if (api) {
    api.refetchEvents();
  } else if (esMovil.value) {
    fetchTorneosMobile();
  }
}

async function fetchTorneosMobile() {
  try {
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const hasta = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    const items = await torneosService.eventos({ desde, hasta });
    eventosLista.value = items.map(t => ({
      id: t.id,
      tipo: 'torneo',
      titulo: t.nombre || t.equipo?.nombre || '',
      inicio: formatoHora(t.fecha, t.hora),
      lugar: t.lugar || null,
      categoria: t.plantilla?.categoria || null
    }));
  } catch {}
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function contenidoTorneo(arg) {
  const t = arg.event?.extendedProps;
  const d = arg.event?.start;
  const hora = d ? esc(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })) : '';
  const cat = esc(t?.plantilla?.categoria?.alias || t?.plantilla?.categoria?.nombre || 'Torneo');
  const cab = t?.esPrimeroGrupo
    ? `<div class="fc-grupo-cabecera" style="background:#6D28D9;color:#fff;font-size:9px;font-weight:700;padding:1px 4px;margin:0 0 5px;border-radius:3px;letter-spacing:0.3px;display:flex;align-items:center;gap:3px;line-height:1.2;width:100%;"><i class="pi pi-trophy" style="font-size:9px"></i>TORNEO</div>`
    : '';
  return {
    html: `<div class="fc-evento-contenido">` +
      cab +
      (hora ? `<span class="fc-partido-hora">${hora}</span>` : '') +
      `<span class="fc-partido-alias">${cat}</span>` +
      `</div>`
  };
}

// ---------- Diálogo de detalle ----------
const detalleVisible = ref(false);
const detalle = ref(null);

function abrirDetalle(torneo) {
  detalle.value = torneo;
  detalleVisible.value = true;
}

function editarDesdeDetalle() {
  const t = detalle.value;
  if (!t) return;
  detalleVisible.value = false;
  abrirEdicion(t);
}

async function eliminarDesdeDetalle() {
  const t = detalle.value;
  if (!t) return;
  confirm.require({
    message: '¿Eliminar este torneo?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await torneosService.eliminar(t.id);
        toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Torneo eliminado.', life: 3000 });
        detalleVisible.value = false;
        refrescar();
        crudRef.value?.cargar?.();
        emitirCambio();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'No se pudo eliminar.',
          life: 5000
        });
      }
    }
  });
}

// ---------- Diálogo de alta / edición ----------
const dialogVisible = ref(false);
const guardando = ref(false);
const editandoId = ref(null);
const form = reactive({ id_plantilla: null, id_equipo: null, nombre: null, fecha: null, hora: null });

function toFechaSQL(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function onFechaSelect(value) {
  form.fecha = value || null;
}

function abrirNuevo(fechaStr) {
  editandoId.value = null;
  form.id_plantilla = null;
  form.id_equipo = null;
  form.nombre = null;
  form.fecha = fechaStr ? new Date(`${fechaStr}T12:00:00`) : null;
  form.hora = null;
  dialogVisible.value = true;
}

async function abrirEdicion(torneo) {
  editandoId.value = torneo.id;
  form.id_plantilla = torneo.id_plantilla;
  form.id_equipo = torneo.id_equipo;
  form.nombre = torneo.nombre || null;
  form.fecha = torneo.fecha ? new Date(`${String(torneo.fecha).slice(0, 10)}T12:00:00`) : null;
  form.hora = String(torneo.hora || '').slice(0, 5) || null;
  dialogVisible.value = true;
}

function onDateClick(info) {
  if (!(auth.puedeVer('torneo') && auth.puedeEditar())) return;
  abrirNuevo(info.dateStr);
}

function onEventClick(info) {
  const ext = info.event.extendedProps || {};
  if (ext.id != null) abrirDetalle(ext);
}

function onEventClickMovil(e) {
  if (e.tipo === 'festivo') return;
  if (e.id != null) abrirDetalle(e);
}

function onDateClickMovil(dateStr) {
  if (!(auth.puedeVer('torneo') && auth.puedeEditar())) return;
  abrirNuevo(dateStr);
}

async function guardar() {
  if (!form.id_plantilla || !form.id_equipo || !form.fecha) {
    toast.add({ severity: 'warn', summary: 'Faltan campos', detail: 'Plantilla, equipo y fecha son obligatorios.', life: 4000 });
    return;
  }
  guardando.value = true;
  try {
    const hora = form.hora && /^\d{1,2}:\d{2}$/.test(String(form.hora)) ? `${String(form.hora)}:00` : null;
    const payload = {
      id_plantilla: form.id_plantilla,
      id_equipo: form.id_equipo,
      nombre: form.nombre || null,
      fecha: toFechaSQL(form.fecha),
      hora
    };
    if (editandoId.value) {
      await torneosService.actualizar(editandoId.value, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Torneo actualizado correctamente.', life: 3000 });
    } else {
      await torneosService.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Torneo creado correctamente.', life: 3000 });
    }
    dialogVisible.value = false;
    refrescar();
    crudRef.value?.cargar?.();
    emitirCambio();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo guardar.', life: 5000 });
  } finally {
    guardando.value = false;
  }
}

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
  buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', year: 'Año' },
  events: fetchTorneos,
  eventContent: contenidoTorneo,
  eventClick: onEventClick,
  dateClick: onDateClick,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  dayMaxEvents: false,
  fixedWeekCount: false,
  eventOrder: 'miGrupoOrden,start',
  editable: false,
  selectable: false
};
</script>

<template>
<SectionGuard seccion="torneo">
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-xl text-club-green flex items-center gap-2 mb-3">
        <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
        Calendario de torneos
      </h1>
      <div class="bg-white rounded-xl p-4">
        <FullCalendar v-if="!esMovil" ref="calendarRef" :options="calendarOptions" />
        <CalendarioLista
          v-else
          :eventos="eventosLista"
          @event-click="onEventClickMovil"
          @date-click="onDateClickMovil"
        />
        <p v-if="auth.puedeVer('torneo') && auth.puedeEditar()" class="text-xs text-ink-tertiary mt-2">
          Pincha en un día para añadir un torneo. Pincha en un evento para ver sus detalles, editarlo o eliminarlo.
        </p>
      </div>
    </div>

    <CrudDataTable
      ref="crudRef"
      title="Torneos"
      :columns="columns"
      :service="torneosService"
      :emptyItem="emptyItem"
      :canExport="true"
      @changed="refrescar"
    >
      <template #cell-id_plantilla="{ data }">
        {{ data.plantilla ? (data.plantilla.categoria?.nombre + ' / ' + data.plantilla.temporada?.nombre) : nombrePlantilla(data.id_plantilla) }}
      </template>
      <template #cell-id_equipo="{ data }">
        {{ data.equipo?.nombre || nombreEquipo(data.id_equipo) }}
      </template>
      <template #cell-fecha="{ data }">
        {{ formatFecha(data.fecha) }}
      </template>
      <template #detail-id_plantilla="{ data }">
        {{ data.plantilla ? (data.plantilla.categoria?.nombre + ' / ' + data.plantilla.temporada?.nombre) : nombrePlantilla(data.id_plantilla) }}
      </template>
      <template #detail-id_equipo="{ data }">
        {{ data.equipo?.nombre || nombreEquipo(data.id_equipo) }}
      </template>
      <template #detail-fecha="{ data }">
        {{ formatFecha(data.fecha) }}
      </template>
    </CrudDataTable>

    <Dialog v-model:visible="dialogVisible" modal class="w-full max-w-lg">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">{{ editandoId ? 'Editar' : 'Nuevo' }} · Torneo</span>
        </div>
      </template>
      <form @submit.prevent="guardar" class="space-y-4 pt-1">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Plantilla <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_plantilla" :options="opcionesPlantilla" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Busca una plantilla" showClear filter />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Equipo <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_equipo" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Busca un equipo" showClear filter />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Nombre</label>
          <InputText v-model="form.nombre" placeholder="Nombre del torneo" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Fecha y hora <span class="text-club-garnet">*</span></label>
          <div class="flex gap-2">
            <DatePicker v-model="form.fecha" @update:modelValue="onFechaSelect" dateFormat="dd/mm/yy" showIcon
                        iconDisplay="input" :manualInput="true" class="flex-1" inputClass="w-full" placeholder="dd/mm/aa" />
            <InputText v-model="form.hora" placeholder="HH:mm" maxlength="5" inputmode="numeric" class="w-24" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-3">
          <Button type="button" label="Cancelar" text @click="dialogVisible = false" />
          <Button type="submit" label="Guardar" icon="pi pi-check" :loading="guardando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="detalleVisible" modal class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Detalle · Torneo</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            <i class="pi pi-trophy"></i> Torneo
          </span>
        </div>
      </template>
      <div v-if="detalle" class="space-y-3 pt-1">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pb-2 border-b border-line">
          <div>
            <p class="text-xs text-ink-tertiary font-medium">Fecha</p>
            <p class="text-sm text-ink-secondary">{{ formatFecha(detalle.fecha) }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-tertiary font-medium">Hora</p>
            <p class="text-sm text-ink-secondary">{{ detalle.hora ? String(detalle.hora).slice(0, 5) : '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-tertiary font-medium">Localidad</p>
            <p class="text-sm text-ink-secondary">{{ detalle.equipo?.localidad || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-tertiary font-medium">Categoría</p>
            <p class="text-sm text-ink-secondary">{{ detalle.plantilla?.categoria?.alias || detalle.plantilla?.categoria?.nombre || '—' }}</p>
          </div>
        </div>
        <div class="py-2 text-center">
          <p class="text-xs text-ink-tertiary font-medium">Nombre</p>
          <p class="text-base font-semibold text-ink-primary">{{ detalle.nombre || '—' }}</p>
        </div>
        <div class="flex justify-end gap-2 pt-3">
          <Button label="Cerrar" text severity="secondary" @click="detalleVisible = false" />
          <Button v-if="auth.puedeVer('torneo') && auth.puedeEditar()" label="Eliminar" icon="pi pi-trash"
                  severity="danger" outlined @click="eliminarDesdeDetalle" />
          <Button v-if="auth.puedeVer('torneo') && auth.puedeEditar()" label="Editar" icon="pi pi-pencil"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                  @click="editarDesdeDetalle" />
        </div>
      </div>
    </Dialog>

    <ConfirmDialog />
  </div>
</SectionGuard>
</template>