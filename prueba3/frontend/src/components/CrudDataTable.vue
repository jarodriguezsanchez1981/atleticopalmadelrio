<script setup>
/**
 * Tabla + formulario CRUD genérico.
 * columns: [{ field, header, type: 'text'|'textarea'|'date'|'select'|'multiselect'|'password',
 *             options?: [{label,value}], required?: bool }]
 */
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Password from 'primevue/password';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import { mapaFestivosAnio, nombreFestivoNacional } from '../utils/festivosEspana';

const props = defineProps({
  title: { type: String, required: true },
  columns: { type: Array, required: true },
  service: { type: Object, required: true },
  emptyItem: { type: Object, required: true },
  canCreate: { type: Boolean, default: true },
  canEdit: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: true }
});

const emit = defineEmits(['changed']);

const items = ref([]);
const cargando = ref(false);
const filtroGlobal = ref('');
const dialogVisible = ref(false);
const detalleVisible = ref(false);
const editando = ref(false);
const form = reactive({ ...props.emptyItem });
const detalle = ref(null);
const datePickerRefs = {};
const dateDrafts = reactive({});
const timeDrafts = reactive({});

const MAX_FOTO_SIZE = 5 * 1024 * 1024;

const toast = useToast();
const confirm = useConfirm();

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatHora(value) {
  const d = toDateValue(value);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function setDatePickerRef(field, el) {
  if (el) datePickerRefs[field] = el;
  else delete datePickerRefs[field];
}

function parseHora(hhmm) {
  const match = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return null;
  return { h, m };
}

function combinarFechaHora(dateVal, hhmm) {
  const base = toDateValue(dateVal) || new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const parsed = parseHora(hhmm);
  if (parsed) next.setHours(parsed.h, parsed.m, 0, 0);
  return next;
}

function metaDesdeSlot(slotProps) {
  if (!slotProps) return null;
  if (slotProps.date && slotProps.date.day != null) return slotProps.date;
  if (slotProps.day != null) return slotProps;
  return null;
}

function esDiaFestivo(slotProps) {
  const meta = metaDesdeSlot(slotProps);
  if (!meta) return false;
  return Boolean(nombreFestivoNacional(meta.year, meta.month, meta.day));
}

function tituloFestivo(slotProps) {
  const meta = metaDesdeSlot(slotProps);
  if (!meta) return '';
  return nombreFestivoNacional(meta.year, meta.month, meta.day) || '';
}

function diaSlot(slotProps) {
  const meta = metaDesdeSlot(slotProps);
  return meta?.day ?? '';
}

function ymdKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Marca en naranja los festivos nacionales en el panel abierto del DatePicker. */
function pintarFestivos(field) {
  const run = () => {
    const dp = datePickerRefs[field];
    const overlay = dp?.overlay || document.querySelector('.p-datepicker-panel.datepicker-club-panel') || document.querySelector('.p-datepicker-panel');
    if (!overlay) return;

    const year = dp?.currentYear ?? new Date().getFullYear();
    const month = dp?.currentMonth ?? new Date().getMonth();
    const maps = {
      [year]: mapaFestivosAnio(year),
      [year - 1]: mapaFestivosAnio(year - 1),
      [year + 1]: mapaFestivosAnio(year + 1)
    };

    overlay.querySelectorAll('td.p-datepicker-day-cell, td[data-pc-group-section="tablebodycell"]').forEach((td) => {
      const dayEl = td.querySelector('.p-datepicker-day, [data-pc-group-section="tablebodycelllabel"]') || td.querySelector('span');
      if (!dayEl) return;

      dayEl.classList.remove('dp-festivo-es');
      td.classList.remove('dp-festivo-es-cell');
      dayEl.removeAttribute('data-festivo');
      if (dayEl.dataset.festivoTitle) {
        dayEl.removeAttribute('title');
        delete dayEl.dataset.festivoTitle;
      }

      const dayNum = parseInt((dayEl.textContent || '').trim(), 10);
      if (!dayNum) return;

      const other =
        td.classList.contains('p-datepicker-other-month') ||
        td.getAttribute('data-p-other-month') === 'true' ||
        dayEl.getAttribute('data-p-other-month') === 'true';

      let y = year;
      let m = month;
      if (other) {
        if (dayNum >= 20) {
          m = month === 0 ? 11 : month - 1;
          y = month === 0 ? year - 1 : year;
        } else {
          m = month === 11 ? 0 : month + 1;
          y = month === 11 ? year + 1 : year;
        }
      }

      const nombre = maps[y]?.get(ymdKey(y, m, dayNum));
      if (!nombre) return;

      dayEl.classList.add('dp-festivo-es');
      td.classList.add('dp-festivo-es-cell');
      dayEl.setAttribute('title', nombre);
      dayEl.dataset.festivoTitle = nombre;
      dayEl.setAttribute('data-festivo', 'true');
    });
  };

  nextTick(() => {
    run();
    setTimeout(run, 30);
    setTimeout(run, 120);
  });
}

function onDatePickerShow(field) {
  const current = toDateValue(form[field]);
  dateDrafts[field] = current ? new Date(current.getTime()) : null;
  timeDrafts[field] = formatHora(current) || '00:00';
  pintarFestivos(field);
}

function onDatePickerMonthYearChange(field) {
  pintarFestivos(field);
}

function closeDatePicker(field) {
  const dp = datePickerRefs[field];
  if (dp) dp.overlayVisible = false;
}

function onFechaSelect(field, value) {
  const fecha = toDateValue(value) || toDateValue(form[field]);
  if (!fecha) return;
  form[field] = combinarFechaHora(fecha, timeDrafts[field] || '00:00');
  pintarFestivos(field);
}

function onHoraInput(field, value) {
  timeDrafts[field] = value;
  if (!parseHora(value)) return;
  if (form[field]) {
    form[field] = combinarFechaHora(form[field], value);
  }
}

function confirmarFecha(field) {
  if (form[field] || parseHora(timeDrafts[field])) {
    form[field] = combinarFechaHora(form[field] || new Date(), timeDrafts[field] || '00:00');
  }
  closeDatePicker(field);
}

function cancelarFecha(field) {
  const draft = dateDrafts[field];
  form[field] = draft ? new Date(draft.getTime()) : null;
  timeDrafts[field] = formatHora(form[field]);
  closeDatePicker(field);
}

const datePickerPt = {
  panel: { class: 'datepicker-club-panel' }
};

function onFotoInput(field, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast.add({ severity: 'error', summary: 'Formato no válido', detail: 'Selecciona un archivo de imagen.', life: 4000 });
    event.target.value = '';
    return;
  }
  if (file.size > MAX_FOTO_SIZE) {
    toast.add({ severity: 'error', summary: 'Archivo demasiado grande', detail: 'La foto debe pesar 5 MB como máximo.', life: 4000 });
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => { form[field] = e.target.result; };
  reader.readAsDataURL(file);
}

function resolveOptions(col) {
  if (typeof col.options === 'function') {
    return col.options(form) || [];
  }
  return col.options || [];
}

function prepareFormData(item) {
  const data = { ...props.emptyItem, ...item };
  for (const col of props.columns) {
    if (col.type === 'date') {
      data[col.field] = toDateValue(data[col.field]);
    }
    if (col.type === 'multiselect') {
      if (Array.isArray(data[col.field]) && data[col.field].length && typeof data[col.field][0] === 'object') {
        data[col.field] = data[col.field].map((o) => o.id);
      } else if ((!data[col.field] || !data[col.field].length) && col.relation && Array.isArray(data[col.relation])) {
        data[col.field] = data[col.relation].map((o) => o.id);
      } else if ((!data[col.field] || !data[col.field].length) && data.secciones?.length) {
        data[col.field] = data.secciones.map((s) => s.id);
      }
      if (!Array.isArray(data[col.field])) data[col.field] = [];
    }
  }
  return data;
}

function payloadFromForm() {
  const payload = { ...form };
  // Quitar relaciones anidadas del include de Sequelize
  ['categoria', 'categorias', 'lugar', 'temporada', 'entrenador', 'delegado', 'titulo', 'titulos', 'secciones', 'usuario', 'created_at', 'updated_at', 'convocados', 'asistencias'].forEach((k) => {
    delete payload[k];
  });
  for (const col of props.columns) {
    if (col.type === 'date' && payload[col.field] instanceof Date) {
      payload[col.field] = payload[col.field].toISOString();
    }
    if (col.type === 'password' && !payload[col.field]) {
      delete payload[col.field];
    }
  }
  return payload;
}

async function cargar() {
  cargando.value = true;
  try {
    items.value = await props.service.listar();
    emit('changed');
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos.', life: 4000 });
  } finally {
    cargando.value = false;
  }
}

watch(
  () => ({ ...form }),
  () => {
    for (const col of props.columns) {
      if (typeof col.options !== 'function') continue;
      const actual = form[col.field];
      if (actual == null || actual === '') continue;
      const opts = resolveOptions(col);
      if (!opts.some((o) => o.value === actual)) form[col.field] = null;
    }
  },
  { deep: true }
);

function abrirNuevo() {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, prepareFormData(props.emptyItem));
  editando.value = false;
  dialogVisible.value = true;
}

function abrirEdicion(item) {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, prepareFormData(item));
  editando.value = true;
  dialogVisible.value = true;
}

async function abrirDetalle(item) {
  detalle.value = item;
  detalleVisible.value = true;
  if (typeof props.service.obtener === 'function') {
    try {
      detalle.value = await props.service.obtener(item.id);
    } catch {
      /* mantiene el item de la fila */
    }
  }
}

function valorDetalle(col, data) {
  if (!data) return '—';

  if (col.field === 'id_categoria' && data.categoria) {
    const t = data.categoria.temporada?.nombre;
    return t ? `${data.categoria.nombre} (${t})` : data.categoria.nombre;
  }
  if (col.field === 'id_lugar' && data.lugar) return data.lugar.nombre;
  if (col.field === 'id_temporada' && data.temporada) return data.temporada.nombre;
  if (col.field === 'id_entrenador' && data.entrenador) {
    return `${data.entrenador.nombre} ${data.entrenador.apellidos || ''}`.trim();
  }

  const raw = data[col.field];
  if (raw == null || raw === '') return '—';
  if (col.type === 'date') {
    const d = toDateValue(raw);
    if (!d) return '—';
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  if (col.type === 'select' && col.options?.length) {
    const opt = col.options.find((o) => o.value === raw);
    if (opt) return opt.label;
  }
  if (col.type === 'multiselect') {
    const ids = Array.isArray(raw) ? raw : [];
    if (!ids.length && data.secciones?.length) {
      return data.secciones.map((s) => s.nombre).join(', ');
    }
    if (col.options?.length) {
      return ids
        .map((id) => col.options.find((o) => o.value === id)?.label || id)
        .join(', ') || '—';
    }
    return ids.join(', ') || '—';
  }
  if (col.type === 'password') return '••••••••';
  return raw;
}

async function guardar() {
  try {
    const payload = payloadFromForm();
    if (editando.value) {
      await props.service.actualizar(form.id, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.', life: 3000 });
    } else {
      await props.service.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Registro creado correctamente.', life: 3000 });
    }
    dialogVisible.value = false;
    await cargar();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo guardar el registro.',
      life: 5000
    });
  }
}

function confirmarEliminar(item) {
  confirm.require({
    message: '¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await props.service.eliminar(item.id);
        toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado.', life: 3000 });
        await cargar();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'No se pudo eliminar el registro.',
          life: 5000
        });
      }
    }
  });
}

defineExpose({ cargar });
onMounted(cargar);
</script>

<template>
  <div>
    <ConfirmDialog />

    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h1 class="font-display text-xl text-club-green flex items-center gap-2">
        <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
        {{ title }}
      </h1>

      <div class="flex items-center gap-2">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroGlobal" placeholder="Buscar..." />
        </IconField>
        <Button v-if="canCreate" label="Nuevo" icon="pi pi-plus" @click="abrirNuevo"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      </div>
    </div>

    <DataTable
      :value="items"
      :loading="cargando"
      :globalFilterFields="columns.map(c => c.field)"
      :filters="{ global: { value: filtroGlobal, matchMode: 'contains' } }"
      paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]"
      stripedRows responsiveLayout="scroll"
      class="rounded-xl overflow-hidden shadow-sm"
    >
      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" sortable>
        <template #body="{ data }">
          <slot :name="`cell-${col.field}`" :data="data">
            <img v-if="col.type === 'image' && data[col.field]" :src="data[col.field]" alt="Foto" class="ar-foto-mini" />
            <span v-else-if="col.type === 'image'">—</span>
            <template v-else>{{ data[col.field] }}</template>
          </slot>
        </template>
      </Column>

      <Column header="Acciones" style="width: 150px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-search" text rounded severity="info" v-tooltip.top="'Ver detalle'"
                    @click="abrirDetalle(data)" />
            <Button v-if="canEdit" icon="pi pi-pencil" text rounded severity="secondary" v-tooltip.top="'Editar'"
                    @click="abrirEdicion(data)" />
            <Button v-if="canDelete" icon="pi pi-trash" text rounded severity="danger" v-tooltip.top="'Eliminar'"
                    @click="confirmarEliminar(data)" />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center text-slate-400 py-6">No hay registros todavía.</div>
      </template>
    </DataTable>

    <!-- Alta / edición -->
    <Dialog
      v-model:visible="dialogVisible"
      modal
      class="w-full max-w-lg"
      :pt="{ header: { class: 'items-center' } }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">
            {{ editando ? `Editar ${title}` : `Nuevo · ${title}` }}
          </span>
        </div>
      </template>

      <form @submit.prevent="guardar" class="space-y-4 pt-1">
        <div v-for="col in columns" :key="col.field" class="flex flex-col gap-1.5">
          <label :for="col.field" class="text-sm font-medium text-slate-600">
            {{ col.header }} <span v-if="col.required" class="text-club-garnet">*</span>
          </label>

          <InputText v-if="col.type === 'text' && !col.readonly" :id="col.field" v-model="form[col.field]" class="w-full" />

          <div v-else-if="col.type === 'text' && col.readonly" class="text-sm text-slate-800 py-2">
            {{ form[col.field] && typeof form[col.field] === 'object'
               ? `${form[col.field].nombre || ''} ${form[col.field].apellidos || ''}`.trim() || form[col.field].usuario || '—'
               : (form[col.field] || '—') }}
          </div>

          <Password v-else-if="col.type === 'password'" :id="col.field" v-model="form[col.field]"
                    :feedback="false" toggleMask inputClass="w-full" class="w-full"
                    :placeholder="editando ? 'Dejar en blanco para no cambiarla' : ''" />

          <Textarea v-else-if="col.type === 'textarea'" :id="col.field" v-model="form[col.field]" rows="3" class="w-full" />

          <DatePicker
            v-else-if="col.type === 'date'"
            :id="col.field"
            :ref="(el) => setDatePickerRef(col.field, el)"
            v-model="form[col.field]"
            showTime
            hourFormat="24"
            dateFormat="dd/mm/yy"
            :showSeconds="false"
            :stepMinute="1"
            :hideOnDateTimeSelect="false"
            showIcon
            iconDisplay="input"
            :manualInput="true"
            class="w-full"
            inputClass="w-full"
            placeholder="dd/mm/aa hh:mm"
            :pt="datePickerPt"
            @show="onDatePickerShow(col.field)"
            @month-change="onDatePickerMonthYearChange(col.field)"
            @year-change="onDatePickerMonthYearChange(col.field)"
            @date-select="(val) => onFechaSelect(col.field, val)"
            @update:modelValue="(val) => onFechaSelect(col.field, val)"
          >
            <template #date="slotProps">
              <span
                class="dp-day-label"
                :class="{ 'dp-festivo-es': esDiaFestivo(slotProps) }"
                :title="tituloFestivo(slotProps)"
              >{{ diaSlot(slotProps) }}</span>
            </template>
            <template #footer>
              <div class="dp-panel-footer">
                <div class="dp-hora-row">
                  <label class="text-sm font-medium text-slate-600" :for="`${col.field}-hora`">Hora</label>
                  <InputText
                    :id="`${col.field}-hora`"
                    class="w-28"
                    :modelValue="timeDrafts[col.field] ?? formatHora(form[col.field]) ?? '00:00'"
                    placeholder="HH:mm"
                    maxlength="5"
                    inputmode="numeric"
                    @update:modelValue="(v) => onHoraInput(col.field, v)"
                  />
                </div>
                <div class="dp-actions-row">
                  <Button type="button" label="Cancelar" text severity="secondary" @click="cancelarFecha(col.field)" />
                  <Button
                    type="button"
                    label="OK"
                    icon="pi pi-check"
                    class="!bg-club-green !border-club-green"
                    @click="confirmarFecha(col.field)"
                  />
                </div>
              </div>
            </template>
          </DatePicker>

          <div v-else-if="col.type === 'image'" class="flex flex-wrap items-center gap-3">
            <img v-if="form[col.field]" :src="form[col.field]" alt="Foto" class="ar-foto-mini border border-slate-200" />
            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
              <i class="pi pi-upload"></i>
              {{ form[col.field] ? 'Cambiar foto' : 'Subir foto' }}
              <input type="file" accept="image/*" class="hidden" @change="onFotoInput(col.field, $event)" />
            </label>
            <Button v-if="form[col.field]" type="button" label="Quitar" icon="pi pi-times" text severity="danger"
                    @click="form[col.field] = null" />
          </div>

          <Select v-else-if="col.type === 'select'" :id="col.field" v-model="form[col.field]"
                  :options="resolveOptions(col)" optionLabel="label" optionValue="value" class="w-full"
                  placeholder="Selecciona una opción" showClear />

<MultiSelect
            v-else-if="col.type === 'multiselect'"
            :id="col.field"
            v-model="form[col.field]"
            :options="resolveOptions(col)"
            optionLabel="label"
            optionValue="value"
            display="chip"
            filter
            placeholder="Selecciona jugadores"
            class="w-full"
          />
        </div>

        <div class="flex justify-end gap-2 pt-3">
          <Button type="button" label="Cancelar" text @click="dialogVisible = false" />
          <Button type="submit" label="Guardar" icon="pi pi-check"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </div>
      </form>
    </Dialog>

    <!-- Detalle (lupa) -->
    <Dialog v-model:visible="detalleVisible" modal class="w-full max-w-lg">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Detalle · {{ title }}</span>
        </div>
      </template>

      <div v-if="detalle" class="space-y-3 pt-1">
        <div
          v-for="col in columns"
          :key="`d-${col.field}`"
          class="flex gap-3 border-b border-slate-100 pb-2 last:border-0"
        >
          <div class="w-40 shrink-0 text-sm font-medium text-slate-500">
            {{ col.header }}
          </div>
          <div class="text-sm text-slate-800 flex-1 min-w-0 break-words">
            <slot :name="`detail-${col.field}`" :data="detalle">
              <img v-if="col.type === 'image' && detalle[col.field]" :src="detalle[col.field]" alt="Foto" class="ar-foto-detalle rounded-lg" />
              <template v-else>{{ valorDetalle(col, detalle) }}</template>
            </slot>
          </div>
        </div>

        <slot name="detail-extra" :data="detalle" />

        <div class="flex justify-end gap-2 pt-3">
          <Button v-if="canEdit" label="Editar" icon="pi pi-pencil" text
                  @click="detalleVisible = false; abrirEdicion(detalle)" />
          <Button label="Cerrar" @click="detalleVisible = false"
                  class="!bg-club-green !border-club-green" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style>
/* Foto */
.ar-foto-mini {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  border-radius: 0.5rem;
}

.ar-foto-detalle {
  max-width: 12rem;
  max-height: 12rem;
  object-fit: cover;
}

/* Panel teleportado al body */
.p-datepicker-panel.datepicker-club-panel .p-datepicker-time-picker {
  display: none !important;
}

.p-datepicker-panel .dp-day-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 2rem;
  min-height: 2rem;
  border-radius: 9999px;
  line-height: 1;
}

/* Festivos nacionales ES (naranja) */
.p-datepicker-panel .dp-festivo-es,
.p-datepicker-panel span.dp-festivo-es,
.p-datepicker-panel .p-datepicker-day.dp-festivo-es,
.p-datepicker-panel .p-datepicker-day .dp-festivo-es,
.p-datepicker-panel .dp-day-label.dp-festivo-es {
  background-color: #f97316 !important;
  background: #f97316 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border-radius: 9999px !important;
}

.p-datepicker-panel td.dp-festivo-es-cell .p-datepicker-day:not(.p-datepicker-day-selected) {
  background-color: #f97316 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
}

.p-datepicker-panel .p-datepicker-day-selected.dp-festivo-es,
.p-datepicker-panel .p-datepicker-day-selected .dp-festivo-es {
  box-shadow: inset 0 0 0 2px #9a3412;
}

.p-datepicker-panel .dp-panel-footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid #e2e8f0;
}

.p-datepicker-panel .dp-hora-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.p-datepicker-panel .dp-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
</style>
