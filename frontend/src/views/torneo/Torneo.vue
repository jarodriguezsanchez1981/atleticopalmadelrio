<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import esLocale from '@fullcalendar/core/locales/es';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import CrudDataTable from '../../components/CrudDataTable.vue';
import { torneosService, plantillasService, equiposService } from '../../services';
import { tituloCalendario } from '../../utils/tituloCalendario';
import { useAuthStore } from '../../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../../utils/cambioBus';

const toast = useToast();
const auth = useAuthStore();
const plantillas = ref([]);
const equipos = ref([]);
let unsubCambio = null;

const crudRef = ref();
const calendarRef = ref();

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
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

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
  { field: 'fecha', header: 'Fecha', type: 'date', required: true, format: (v) => formatFecha(v) },
  { field: 'hora', header: 'Hora', type: 'text', required: false }
]);

const emptyItem = { id_plantilla: null, id_equipo: null, fecha: null, hora: null };

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
    const eventos = items.map(t => ({
      id: String(t.id),
      title: `${t.equipo?.nombre || nombreEquipo(t.id_equipo)} · Torneo`,
      start: formatoHora(t.fecha, t.hora),
      color: '#6D28D9',
      extendedProps: t
    }));
    successCallback(eventos);
  } catch (err) {
    failureCallback(err);
  }
}

function refrescar() {
  calendarRef.value?.getApi()?.refetchEvents();
}

// ---------- Diálogo de alta / edición ----------
const dialogVisible = ref(false);
const guardando = ref(false);
const editandoId = ref(null);
const form = reactive({ id_plantilla: null, id_equipo: null, fecha: null, hora: null });

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
  form.fecha = fechaStr ? new Date(`${fechaStr}T12:00:00`) : null;
  form.hora = null;
  dialogVisible.value = true;
}

async function abrirEdicion(torneo) {
  editandoId.value = torneo.id;
  form.id_plantilla = torneo.id_plantilla;
  form.id_equipo = torneo.id_equipo;
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
  if (ext.id != null) abrirEdicion(ext);
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
  plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin],
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
  eventClick: onEventClick,
  dateClick: onDateClick,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  dayMaxEvents: 4,
  fixedWeekCount: false,
  editable: false,
  selectable: false
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-xl text-club-green flex items-center gap-2 mb-3">
        <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
        Calendario de torneos
      </h1>
      <div class="bg-white rounded-xl p-4">
        <FullCalendar ref="calendarRef" :options="calendarOptions" />
        <p v-if="auth.puedeVer('torneo') && auth.puedeEditar()" class="text-xs text-ink-tertiary mt-2">
          Pincha en un día para añadir un torneo. Pincha en un evento para editarlo o eliminarlo desde la tabla.
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
  </div>
</template>
