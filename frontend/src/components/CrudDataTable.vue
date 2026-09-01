<script setup>
/**
 * Tabla + formulario CRUD genérico.
 * columns: [{ field, header, type: 'text'|'textarea'|'date'|'select'|'multiselect'|'password',
 *             options?: [{label,value}], required?: bool }]
 */
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Password from 'primevue/password';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import { mapaFestivosAnio, nombreFestivoNacional } from '../utils/festivosEspana';
import { emitirCambio } from '../utils/cambioBus';
import { useAuthStore } from '../stores/auth.store';
import * as XLSX from '@e965/xlsx';

const auth = useAuthStore();

const props = defineProps({
  title: { type: String, required: true },
  columns: { type: Array, required: true },
  service: { type: Object, required: true },
  emptyItem: { type: Object, required: true },
  canCreate: { type: Boolean, default: true },
  canEdit: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: true },
  listParams: { type: Object, default: () => ({}) },
  detailMaxWidth: { type: String, default: 'max-w-lg' },
  formMaxWidth: { type: String, default: 'max-w-lg' },
  prepareEdit: { type: Function, default: null },
  canExport: { type: Boolean, default: false },
  validateForm: { type: Function, default: null }
});

const emit = defineEmits(['changed', 'data-loaded']);

const permisoCrear = computed(() => props.canCreate && auth.puedeCrear());
const permisoEditar = computed(() => props.canEdit && auth.puedeEditar());
const permisoEliminar = computed(() => props.canDelete && auth.puedeEliminar());

const items = ref([]);
const seleccionados = ref([]);
const cargando = ref(false);
const filtroGlobal = ref('');
const dialogVisible = ref(false);
const detalleVisible = ref(false);
const editando = ref(false);
const form = reactive({ ...props.emptyItem });
const detalle = ref(null);
const datePickerRefs = {};
const timeDrafts = reactive({});

const importDialogVisible = ref(false);
const importando = ref(false);
const importProgress = ref(0);
const importInputRef = ref(null);
const importPreview = ref([]);
const importErrores = ref([]);

const columnas = ref([]);
const storageKey = `ar_col_order_${props.title}`;

function restaurarOrden() {
  let orden = [...props.columns];
  try {
    const guardado = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(guardado) && guardado.length) {
      const porCampo = new Map(props.columns.map((c) => [c.field, c]));
      const filtrado = guardado.map((f) => porCampo.get(f)).filter(Boolean);
      if (filtrado.length === props.columns.length && guardado.length === props.columns.length) {
        orden = filtrado;
      }
    }
  } catch { /* ignora errores de localStorage */ }
  columnas.value = orden.filter((c) => c.enTabla !== false);
}

function guardarOrden() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(columnas.value.map((c) => c.field)));
  } catch { /* ignora errores de localStorage */ }
}

function onColumnReorder({ dragIndex, dropIndex }) {
  const offset = permisoEliminar.value ? 1 : 0;
  const full = [...columnas.value];
  if (dragIndex == null || dropIndex == null) return;
  const di = dragIndex - offset;
  const ti = dropIndex - offset;
  if (di < 0 || di >= full.length) return;
  const [movido] = full.splice(di, 1);
  full.splice(ti, 0, movido);
  columnas.value = full;
  guardarOrden();
}

const MAX_FOTO_SIZE = 1 * 1024 * 1024;

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
  timeDrafts[field] = formatHora(current) || '00:00';
  pintarFestivos(field);
}

function onDatePickerMonthYearChange(field) {
  pintarFestivos(field);
}

function onFechaSelect(field, value) {
  if (!value) {
    form[field] = null;
    return;
  }
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
    toast.add({ severity: 'error', summary: 'Archivo demasiado grande', detail: 'La foto debe pesar 1 MB como máximo.', life: 4000 });
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



/** Si una columna con options dinámicas deja de ofrecer el valor actual, se limpia. */
watch(form, () => {
  for (const col of props.columns) {
    if (typeof col.options === 'function' && form[col.field] != null) {
      const opts = resolveOptions(col);
      if (opts.length && !opts.some((o) => o.value === form[col.field])) {
        form[col.field] = null;
      }
    }
  }
});

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
  ['categoria', 'categorias', 'lugar', 'temporada', 'entrenador', 'entrenadores', 'delegado', 'delegados', 'titulo', 'titulos', 'secciones', 'posiciones', 'created_at', 'updated_at', 'asistencias', 'semanales', 'tiposFutbol'].forEach((k) => {
    delete payload[k];
  });
  // `usuario` solo se elimina cuando es la relación anidada (objeto);
  // en la tabla de usuarios es el nombre de login (string real y editable).
  if (payload.usuario && typeof payload.usuario === 'object') {
    delete payload.usuario;
  }
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
    const data = await props.service.listar(props.listParams);
    items.value = data.map(item => ({ ...item }));
    emit('changed');
    emit('data-loaded', items.value);
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

function limpiarDraftsFecha() {
  for (const col of props.columns) {
    if (col.type === 'date') delete timeDrafts[col.field];
  }
}

function abrirNuevo() {
  limpiarDraftsFecha();
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, prepareFormData(props.emptyItem));
  editando.value = false;
  dialogVisible.value = true;
}

/* ---------- Importación Excel ---------- */

function abrirImport() {
  importPreview.value = [];
  importErrores.value = [];
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
    const res = await props.service.importar(importPreview.value);
    importProgress.value = 100;
    toast.add({
      severity: 'success',
      summary: 'Importación completada',
      detail: `${res.insertados} filas importadas${res.errores.length ? `, ${res.errores.length} errores` : ''}.`,
      life: 5000
    });
    importDialogVisible.value = false;
    await cargar();
    emit('changed');
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

function abrirEdicion(item) {
  limpiarDraftsFecha();
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, prepareFormData(item));
  if (typeof props.prepareEdit === 'function') {
    const extra = props.prepareEdit(item) || {};
    Object.assign(form, extra);
  }
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

  if (typeof col.format === 'function') {
    const v = col.format(data[col.field], data);
    return v == null || v === '' ? '—' : v;
  }

  if (col.field === 'id_categoria' && data.categoria) {
    return data.categoria.nombre;
  }
  if (col.field === 'id_lugar' && data.lugar) return data.lugar.nombre;
  if (col.field === 'id_entrenador' && data.entrenador) {
    return `${data.entrenador.nombre} ${data.entrenador.apellidos || ''}`.trim();
  }

  const raw = data[col.field];
  if (raw == null || raw === '') return '—';
  if (col.type === 'date') {
    const d = toDateValue(raw);
    if (!d) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }
  const opts = resolveOptions(col);
  if (col.type === 'select' && opts?.length) {
    const opt = opts.find((o) => o.value === raw);
    if (opt) return opt.label;
  }
  if (col.type === 'multiselect') {
    const ids = Array.isArray(raw) ? raw : [];
    if (!ids.length && data.secciones?.length) {
      return data.secciones.map((s) => s.nombre).join(', ');
    }
    if (opts?.length) {
      return ids
        .map((id) => opts.find((o) => o.value === id)?.label || id)
        .join(', ') || '—';
    }
    return ids.join(', ') || '—';
  }
  if (col.type === 'password') return '••••••••';
  return raw;
}

async function guardar() {
  try {
    const faltan = props.columns
      .filter((c) => !c.soloTabla && (c.required || (c.requiredOnCreate && !editando.value)))
      .filter((c) => {
        const v = form[c.field];
        return v == null || v === '' || (Array.isArray(v) && v.length === 0);
      })
      .map((c) => c.header);
    if (faltan.length) {
      toast.add({ severity: 'warn', summary: 'Faltan campos obligatorios', detail: faltan.join(', '), life: 5000 });
      return;
    }
    for (const col of props.columns) {
      if (typeof col.validate === 'function') {
        const err = col.validate(form[col.field]);
        if (err) {
          toast.add({ severity: 'error', summary: col.header, detail: err, life: 4000 });
          return;
        }
      }
    }
    const payload = payloadFromForm();
    if (typeof props.validateForm === 'function') {
      const err = props.validateForm(form);
      if (err) {
        toast.add({ severity: 'error', summary: 'Error de validación', detail: err, life: 5000 });
        return;
      }
    }
    if (editando.value) {
      await props.service.actualizar(form.id, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.', life: 3000 });
    } else {
      await props.service.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Registro creado correctamente.', life: 3000 });
    }
    dialogVisible.value = false;
    await cargar();
    emitirCambio();
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
        emitirCambio();
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

function eliminarSeleccionados() {
  if (!seleccionados.value.length) return;
  confirm.require({
    message: `¿Seguro que quieres eliminar ${seleccionados.value.length} registro(s)? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      const total = seleccionados.value.length;
      let ok = 0;
      let errorMsg = '';
      for (const item of [...seleccionados.value]) {
        try {
          await props.service.eliminar(item.id);
          ok += 1;
        } catch (err) {
          errorMsg = err.response?.data?.message || '';
        }
      }
      seleccionados.value = [];
      if (ok === total) {
        toast.add({ severity: 'success', summary: 'Eliminados', detail: `${total} registro(s) eliminados.`, life: 3000 });
      } else if (ok > 0) {
        toast.add({ severity: 'warn', summary: 'Eliminación parcial', detail: `${ok} de ${total} eliminados. ${errorMsg}`.trim(), life: 5000 });
      } else {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg || 'No se pudieron eliminar los registros seleccionados.',
          life: 5000
        });
      }
      await cargar();
      if (ok > 0) emitirCambio();
    }
  });
}

function exportarExcel() {
  const headers = columnas.value.map(c => c.header);
  const rows = items.value.map(item => {
    return columnas.value.map(col => {
      if (col.field === 'id') return item.id;
      if (typeof col.format === 'function') return col.format(item[col.field], item) ?? '';
      if (col.type === 'select' && col.options) {
        const opts = typeof col.options === 'function' ? col.options(form) : col.options;
        const opt = opts?.find(o => o.value === item[col.field]);
        return opt ? opt.label : item[col.field] ?? '';
      }
      if (col.type === 'date' && item[col.field]) {
        const d = toDateValue(item[col.field]);
        if (!d) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
      }
      return item[col.field] ?? '';
    });
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, props.title);
  XLSX.writeFile(wb, `${props.title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
}

defineExpose({ cargar });
onMounted(() => {
  restaurarOrden();
  cargar();
});

watch(
  () => ({ ...props.listParams }),
  () => cargar()
);
</script>

<template>
  <div>
    <ConfirmDialog />

    <div class="mb-4">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <h1 class="font-display text-xl text-club-green flex items-center gap-2">
            <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
            {{ title }}
          </h1>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-club-green/10 text-club-green text-xs font-semibold">
            <i class="pi pi-database text-[11px]"></i>
            {{ items.length }} {{ items.length === 1 ? 'registro' : 'registros' }}
          </span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <Button
            v-if="permisoEliminar && seleccionados.length"
            :label="`Eliminar seleccionados (${seleccionados.length})`"
            icon="pi pi-trash"
            severity="danger"
            outlined
            class="!text-club-garnet !border-club-garnet/50 hover:!bg-club-garnet/5"
            @click="eliminarSeleccionados"
          />
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText v-model="filtroGlobal" placeholder="Buscar..." class="!py-2" />
          </IconField>
          <slot name="acciones" />
          <Button v-if="canExport" label="Exportar" icon="pi pi-file-export" outlined
                  class="!text-club-green !border-club-green/50 hover:!bg-club-green/5"
                  @click="exportarExcel" />
          <Button v-if="permisoCrear" label="Importar" icon="pi pi-file-import" outlined
                  class="!text-club-green !border-club-green/50 hover:!bg-club-green/5"
                  @click="abrirImport" />
          <Button v-if="permisoCrear" label="Nuevo" icon="pi pi-plus" @click="abrirNuevo"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight !" />
        </div>
      </div>
      <div class="mt-3 h-px bg-fill-hover"></div>
    </div>

    <DataTable
      :value="items"
      v-model:selection="seleccionados"
      :dataKey="'id'"
      :loading="cargando"
      :globalFilterFields="columns.map(c => c.field)"
      :filters="{ global: { value: filtroGlobal, matchMode: 'contains' } }"
      reorderableColumns
      scrollable="scroll"
      @column-reorder="onColumnReorder"
      paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]"
      rowHover stripedRows
      class="ar-datatable bg-white rounded-xl overflow-x-auto border border-line"
      :pt="{
        header: { class: 'ar-dt-header !bg-white' },
        rowgroupfooter: { class: '!bg-club-cream' },
        footer: { class: '!bg-club-cream' },
        paginator: { class: 'ar-dt-paginator !bg-white' }
      }"
    >
      <Column v-if="permisoEliminar" selectionMode="multiple" headerStyle="width: 3rem" frozen :reorderableColumn="false" />
      <Column v-for="col in columnas" :key="col.field" :field="col.field" :header="col.header" sortable>
        <template #body="{ data }">
          <slot :name="`cell-${col.field}`" :data="data">
            <img v-if="col.type === 'image' && data[col.field]" :src="data[col.field]" alt="Foto" class="ar-foto-mini" />
            <span v-else-if="col.type === 'image'">—</span>
            <template v-else-if="typeof col.format === 'function'">{{ col.format(data[col.field], data) }}</template>
            <template v-else>{{ data[col.field] }}</template>
          </slot>
        </template>
      </Column>

      <Column frozen style="width: 150px" :pt="{ bodyCell: { class: 'ar-dt-acciones' } }">
        <template #header>
          <div class="text-right">Acciones</div>
        </template>
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-eye" text rounded severity="secondary" v-tooltip.top="'Ver detalle'"
                    class="ar-dt-btn" @click="abrirDetalle(data)" />
            <Button v-if="permisoEditar" icon="pi pi-pencil" text rounded severity="secondary" v-tooltip.top="'Editar'"
                    class="ar-dt-btn" @click="abrirEdicion(data)" />
            <Button v-if="permisoEliminar" icon="pi pi-trash" text rounded severity="danger" v-tooltip.top="'Eliminar'"
                    class="ar-dt-btn" @click="confirmarEliminar(data)" />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center text-ink-tertiary py-8">
          <i class="pi pi-inbox text-2xl block mb-2"></i>
          No hay registros todavía.
        </div>
      </template>
    </DataTable>

    <!-- Alta / edición -->
    <Dialog
      v-model:visible="dialogVisible"
      modal
      :class="['w-full', formMaxWidth]"
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
        <div v-for="col in columns.filter(c => !c.soloTabla && c.enForm !== false)" :key="col.field" class="flex flex-col gap-1.5">
          <label :for="col.field" class="text-sm font-medium text-ink-secondary">
            {{ col.header }} <span v-if="col.required" class="text-club-garnet">*</span>
          </label>

          <InputText v-if="col.type === 'text' && !col.readonly" :id="col.field" v-model="form[col.field]" class="w-full" />

          <Password
            v-else-if="col.type === 'password'"
            :id="col.field"
            v-model="form[col.field]"
            :feedback="false"
            toggleMask
            inputClass="w-full"
            class="w-full"
          />

          <InputNumber
            v-else-if="col.type === 'number'"
            :id="col.field"
            v-model="form[col.field]"
            inputClass="w-full"
            :min="col.min ?? 0"
            :max="col.max"
            :minFractionDigits="0"
            :maxFractionDigits="0"
            class="w-full"
          />

          <div v-else-if="col.type === 'image'" class="flex flex-wrap items-center gap-3">
            <img v-if="form[col.field]" :src="form[col.field]" alt="Foto" class="ar-foto-mini border border-line" />
            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line-strong text-sm text-ink-secondary cursor-pointer hover:bg-fill-surface">
              <i class="pi pi-upload"></i>
              {{ form[col.field] ? 'Cambiar foto' : 'Subir foto' }}
              <input type="file" accept="image/*" class="hidden" @change="onFotoInput(col.field, $event)" />
            </label>
            <Button v-if="form[col.field]" type="button" label="Quitar" icon="pi pi-times" text severity="danger"
                    @click="form[col.field] = null" />
          </div>

          <Select v-else-if="col.type === 'select'" :id="col.field" v-model="form[col.field]"
                  :options="resolveOptions(col)"
                  optionLabel="label" optionValue="value" class="w-full"
                  placeholder="Selecciona una opción" showClear />

          <DatePicker v-else-if="col.type === 'date'" :id="col.field" v-model="form[col.field]"
                      dateFormat="dd/mm/yy" class="w-full"
                      :showTime="false" :pt="datePickerPt"
                      @show="onDatePickerShow(col.field)"
                      @month-change="onDatePickerMonthYearChange(col.field)"
                      :ref="(el) => setDatePickerRef(col.field, el)" />

<MultiSelect
            v-else-if="col.type === 'multiselect'"
            :id="col.field"
            v-model="form[col.field]"
            :options="resolveOptions(col)"
            optionLabel="label"
            optionValue="value"
            display="chip"
            :filter="col.filter === true"
            :filterMinLength="col.filterMinLength || 0"
            placeholder="Selecciona jugadores"
            class="w-full"
          />
        </div>

        <slot name="form-extra" :form="form" />

        <div class="flex justify-end gap-2 pt-3">
          <Button type="button" label="Cancelar" text @click="dialogVisible = false" />
          <Button type="submit" label="Guardar" icon="pi pi-check"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </div>
      </form>
    </Dialog>

    <!-- Detalle (lupa) -->
    <Dialog v-model:visible="detalleVisible" modal :class="['w-full', detailMaxWidth]">
      <template #header>
        <div class="flex items-center gap-2">
          <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
          <span class="font-display text-club-green text-lg">Detalle · {{ title }}</span>
        </div>
      </template>

      <div v-if="detalle" class="space-y-3 pt-1">
        <div
          v-for="col in columns.filter(c => !c.soloTabla && c.enDetalle !== false)"
          :key="`d-${col.field}`"
          class="flex gap-3 border-b border-line pb-2 last:border-0"
        >
          <div class="w-40 shrink-0 text-sm font-medium text-ink-tertiary">
            {{ col.header }}
          </div>
          <div class="text-sm text-ink-primary flex-1 min-w-0 break-words">
            <slot :name="`detail-${col.field}`" :data="detalle">
              <img v-if="col.type === 'image' && detalle[col.field]" :src="detalle[col.field]" alt="Foto" class="ar-foto-detalle rounded-lg" />
              <template v-else>{{ valorDetalle(col, detalle) }}</template>
            </slot>
          </div>
        </div>

        <slot name="detail-extra" :data="detalle" />

        <div class="flex justify-end gap-2 pt-3">
          <Button v-if="permisoEditar" label="Editar" icon="pi pi-pencil" text
                  @click="detalleVisible = false; abrirEdicion(detalle)" />
          <Button label="Cerrar" @click="detalleVisible = false"
                  class="!bg-club-green !border-club-green" />
        </div>
      </div>
    </Dialog>

    <!-- Diálogo de importación Excel -->
    <Dialog v-model:visible="importDialogVisible" modal header="Importar desde Excel"
            :style="{ width: '42rem' }" :closable="!importando">
      <div class="space-y-4">
        <p class="text-sm text-ink-secondary">
          Selecciona un archivo <strong>.xlsx</strong> cuyas columnas
          coincidan con los campos de la tabla (sin la columna <code>id</code>).
          Las filas se insertarán una a una; las que falten validación se
          reportarán como error pero no detienen el resto.
        </p>

        <input ref="importInputRef" type="file" accept=".xlsx,.xls"
               class="hidden"
               @change="onImportFile" />

        <div v-if="!importPreview.length" class="flex justify-center">
          <Button label="Seleccionar archivo" icon="pi pi-upload"
                  :loading="importando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                  @click="importInputRef?.click()" />
        </div>

        <div v-else class="space-y-3">
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

        <ProgressBar v-if="importando" :value="importProgress" />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <Button label="Cancelar" text @click="importDialogVisible = false" :disabled="importando" />
          <Button v-if="importPreview.length" label="Importar" icon="pi pi-check"
                  :loading="importando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                  @click="confirmarImport" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style>
/* ===== DataTable escandinavo ===== */
.ar-datatable .p-datatable-header {
  border-bottom: 1px solid rgb(0 0 0 / 10%);
  padding: 0.75rem 1rem;
}
.ar-datatable .p-datatable-thead > tr > th,
.ar-datatable .p-datatable-thead > tr > td {
  background: rgb(0 0 0 / 3%) !important;
  border-color: rgb(0 0 0 / 10%) !important;
  color: rgb(0 0 0 / 64%) !important;
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
}
.ar-datatable .p-datatable-tbody > tr {
  transition: background-color 0.12s ease;
}
.ar-datatable .p-datatable-tbody > tr > td {
  border-color: rgb(0 0 0 / 6%) !important;
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
  color: rgb(0 0 0 / 90%);
  font-size: 0.86rem;
}
.ar-datatable .p-datatable-tbody > tr:hover {
  background: rgb(0 0 0 / 3%) !important;
}
.ar-datatable .p-datatable-tbody > tr.ar-dt-row-selected,
.ar-datatable .p-datatable-tbody > tr.p-highlight {
  background: rgb(0 0 0 / 5%) !important;
}
.ar-datatable .p-paginator {
  border-top: 1px solid rgb(0 0 0 / 10%);
  padding: 0.6rem 1rem;
  justify-content: flex-end;
  gap: 0.15rem;
}
.ar-datatable .p-paginator .p-paginator-current {
  margin-right: auto;
  color: rgb(0 0 0 / 44%);
  font-size: 0.8rem;
}
.ar-datatable .p-paginator .p-paginator-page,
.ar-datatable .p-paginator .p-paginator-first,
.ar-datatable .p-paginator .p-paginator-prev,
.ar-datatable .p-paginator .p-paginator-next,
.ar-datatable .p-paginator .p-paginator-last {
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  color: rgb(0 0 0 / 64%);
  font-size: 0.85rem;
}
.ar-datatable .p-paginator .p-paginator-page.p-highlight {
  background: #0B3D2E !important;
  color: #fff !important;
}
.ar-datatable .p-datatable-footer {
  border-top: 1px solid rgb(0 0 0 / 10%);
}
.ar-dt-acciones {
  text-align: right;
}
.ar-dt-btn {
  color: rgb(0 0 0 / 44%) !important;
}
.ar-dt-btn:hover {
  background: rgb(0 0 0 / 5%) !important;
  color: rgb(0 0 0 / 90%) !important;
}
.ar-dt-btn.p-button-danger:hover {
  background: #fef2f2 !important;
  color: #b91c1c !important;
}

/* Foto */
.ar-foto-mini {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  border-radius: 0.375rem;
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
</style>
