<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import {
  entrenamientosService, partidosService, categoriasService,
  lugaresService, equiposService, jugadoresService, calendarioService
} from '../services';

const props = defineProps({
  visible: { type: Boolean, default: false },
  tipo: { type: String, default: 'entrenamiento', validator: (v) => v === 'entrenamiento' || v === 'partido' },
  registroId: { type: [Number, String], default: null },
  fechaDefecto: { type: [String, Date], default: null }
});

const emit = defineEmits(['update:visible', 'saved']);

const toast = useToast();

const categorias = ref([]);
const lugares = ref([]);
const equipos = ref([]);
const jugadores = ref([]);
const cargandoCatalogo = ref(false);
const guardando = ref(false);

const form = ref({});
const asistencias = ref({});
const incidenciasJugador = ref({});
const asistenciaTipo = ref('total');
const partidosDelDia = ref([]);
const partidosRecientes = ref([]);
const entrenamientosDelDia = ref([]);

function claveDia(fecha) {
  if (!fecha) return null;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diaDePartido(p) {
  return p.fecha ? claveDia(p.fecha) : null;
}

async function cargarPartidosDelDia() {
  if (props.tipo !== 'partido') {
    partidosDelDia.value = [];
    partidosRecientes.value = [];
  } else {
    const dia = claveDia(form.value?.fecha);
    const fechaRef = form.value?.fecha instanceof Date ? form.value.fecha : new Date(form.value?.fecha);
    const limite = fechaRef && !Number.isNaN(fechaRef.getTime()) ? new Date(fechaRef.getTime() - 72 * 60 * 60 * 1000) : null;
    const todos = await partidosService.listar();
    partidosDelDia.value = todos.filter((p) =>
      dia && diaDePartido(p) === dia && String(p.id) !== String(props.registroId || '')
    );
    partidosRecientes.value = todos.filter((p) => {
      const f = p.fecha ? new Date(p.fecha) : null;
      return f && limite && f >= limite && f <= fechaRef && String(p.id) !== String(props.registroId || '');
    });
  }
}

async function cargarEntrenamientosDelDia() {
  if (props.tipo !== 'entrenamiento') {
    entrenamientosDelDia.value = [];
  } else {
    const dia = claveDia(form.value?.fecha);
    entrenamientosDelDia.value = (await entrenamientosService.listar()).filter((e) =>
      dia && diaDePartido(e) === dia && String(e.id) !== String(props.registroId || '')
    );
  }
}

function resetForm() {
  form.value = {
    id_categoria: null,
    fecha: props.fechaDefecto ? new Date(props.fechaDefecto) : null,
    id_lugar: null,
    recurrente: 0,
    hasta: null,
    id_equipo: null,
    es_local: props.tipo === 'partido' ? 1 : null,
    ids_jugadores: [],
    incidencias: '',
    resultado: '',
    resultado_incidencias: ''
  };
  asistencias.value = {};
  incidenciasJugador.value = {};
  asistenciaTipo.value = 'total';
}

function jugadoresDeCategoria(idCat) {
  if (!idCat) return [];
  return jugadores.value.filter((j) => (j.ids_categorias || []).includes(idCat))
    .sort((a, b) => `${a.apellidos}, ${a.nombre}`.localeCompare(`${b.apellidos}, ${b.nombre}`, 'es'));
}

function iniciarAsistencias(idCat) {
  asistencias.value = {};
  incidenciasJugador.value = {};
  jugadoresDeCategoria(idCat).forEach((j) => {
    asistencias.value[j.id] = true;
    incidenciasJugador.value[j.id] = '';
  });
}

async function cargarCatalogo() {
  cargandoCatalogo.value = true;
  try {
    const promesas = [categoriasService.listar(), lugaresService.listar(), jugadoresService.listar()];
    if (props.tipo === 'partido') promesas.push(equiposService.listar());
    const [cats, lugs, jugs, eqs] = await Promise.all(promesas);
    categorias.value = cats;
    lugares.value = lugs;
    jugadores.value = jugs;
    if (eqs) equipos.value = eqs;
  } finally {
    cargandoCatalogo.value = false;
  }
}

async function cargarRegistro() {
  if (!props.registroId) return;
  guardando.value = true;
  try {
    const item = props.tipo === 'entrenamiento'
      ? await entrenamientosService.obtener(props.registroId)
      : await partidosService.obtener(props.registroId);
    form.value = {
      id_categoria: item.id_categoria ?? item.categoria?.id ?? null,
      fecha: item.fecha ? new Date(item.fecha) : null,
      id_lugar: item.id_lugar ?? item.lugar?.id ?? null,
      recurrente: item.recurrente ? 1 : 0,
      hasta: item.hasta ? new Date(item.hasta) : null,
      id_equipo: props.tipo === 'partido' ? item.id_equipo ?? item.equipo?.id ?? null : null,
      es_local: props.tipo === 'partido' ? (item.es_local ? 1 : 0) : null,
      ids_jugadores: item.ids_jugadores || [],
      incidencias: item.incidencias || '',
      resultado: item.resultado_valor || '',
      resultado_incidencias: item.resultado_incidencias || ''
    };
    if (props.tipo === 'entrenamiento') {
      asistencias.value = {};
      incidenciasJugador.value = {};
      (item.ids_presentes || []).forEach((id) => { asistencias.value[id] = true; });
      (item.ids_ausentes || []).forEach((id) => { asistencias.value[id] = false; });
      (item.asistencias || []).forEach((a) => { incidenciasJugador.value[a.id_jugador] = a.incidencias || ''; });
      asistenciaTipo.value = (item.asistencias || []).length ? 'parcial' : 'total';
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el registro.', life: 4000 });
    cerrar();
  } finally {
    guardando.value = false;
  }
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    resetForm();
    await cargarCatalogo();
    await cargarRegistro();
    await cargarPartidosDelDia();
    await cargarEntrenamientosDelDia();
  }
);

watch(
  () => form.value?.fecha,
  (nueva, anterior) => {
    // Al crear un entrenamiento, si cambia la fecha se reinicia el lugar elegido
    if (props.tipo === 'entrenamiento' && !props.registroId && nueva && anterior) {
      form.value.id_lugar = null;
    }
    cargarPartidosDelDia();
    cargarEntrenamientosDelDia();
  }
);

watch(
  () => form.value.id_categoria,
  (idCat) => {
    if (!props.registroId && idCat != null) iniciarAsistencias(idCat);
    // Si el lugar seleccionado ya no corresponde al tipo de fútbol de la categoría, se limpia
    if (form.value.id_lugar != null) {
      const sigue = opcionesLugar.value.some((o) => o.value === form.value.id_lugar);
      if (!sigue) form.value.id_lugar = null;
    }
  }
);

const opcionesCategoria = computed(() => {
  if (props.tipo === 'entrenamiento') {
    const ocupadas = new Set(
      entrenamientosDelDia.value.map((e) => e.id_categoria ?? e.categoria?.id ?? null).filter(Boolean)
    );
    return categorias.value
      .filter((c) => !ocupadas.has(c.id))
      .map((c) => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  if (props.tipo !== 'partido') {
    return categorias.value
      .map((c) => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  const recientes = new Set(
    partidosRecientes.value.map((p) => p.id_categoria ?? p.categoria?.id ?? null).filter(Boolean)
  );
  return categorias.value
    .filter((c) => !recientes.has(c.id))
    .map((c) => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const opcionesLugar = computed(() => {
  const idCat = form.value.id_categoria;
  const cat = categorias.value.find((c) => c.id === idCat);
  const filtradas = idCat && cat
    ? lugares.value.filter((l) => (l.ids_tipos_futbol || []).includes(cat.id_tipofutbol))
    : lugares.value;

  const ocupados = props.tipo === 'entrenamiento' ? lugaresOcupadosEntrenamiento.value : new Set();
  return filtradas
    .filter((l) => !ocupados.has(l.id))
    .map((l) => ({ label: l.nombre, value: l.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const lugaresOcupadosEntrenamiento = computed(() => {
  const set = new Set();
  if (props.tipo !== 'entrenamiento' || !form.value.fecha) return set;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return set;
  const fin = inicio.getTime() + duracionEntrenamiento(form.value.id_categoria) * 60000;
  entrenamientosDelDia.value.forEach((e) => {
    const eInicio = new Date(e.fecha);
    if (Number.isNaN(eInicio.getTime())) return;
    const eFin = eInicio.getTime() + ((e.categoria?.tiempoentrenamiento) || 60) * 60000;
    if (inicio.getTime() < eFin && eInicio.getTime() < fin && e.id_lugar != null) {
      set.add(e.id_lugar);
    }
  });
  return set;
});

const opcionesEquipo = computed(() =>
  equipos.value
    .map((e) => ({ label: e.nombre, value: e.id, escudo: e.escudo || null }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRecurrente = [
  { label: 'No (solo este día)', value: 0 },
  { label: 'Sí (todas las semanas)', value: 1 }
];

const opcionesAsistencia = [
  { label: 'Total', value: 'total' },
  { label: 'Parcial', value: 'parcial' }
];

const opcionesLocalVisitante = [
  { label: 'Local', value: 1, icon: 'pi pi-home' },
  { label: 'Visitante', value: 0, icon: 'pi pi-arrow-right-arrow-left' }
];

const opcionesJugadores = computed(() => {
  const idCat = form.value.id_categoria;
  const lista = idCat
    ? jugadores.value.filter((j) => (j.ids_categorias || []).includes(idCat))
    : jugadores.value;
  return lista
    .map((j) => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

function duracionCategoria(idCat) {
  const cat = categorias.value.find((c) => c.id === idCat);
  return (cat && cat.tiempopartido) || 90;
}

function partidoEnConflicto() {
  if (props.tipo !== 'partido' || !form.value.es_local || form.value.id_lugar == null || !form.value.fecha) return null;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = inicio.getTime() + duracionCategoria(form.value.id_categoria) * 60000;
  return partidosDelDia.value.find((p) => {
    if (p.id_lugar != null && String(p.id_lugar) !== String(form.value.id_lugar)) return false;
    if (p.lugar?.id != null && String(p.lugar.id) !== String(form.value.id_lugar)) return false;
    const pInicio = new Date(p.fecha).getTime();
    if (Number.isNaN(pInicio)) return false;
    const pFin = pInicio + ((p.categoria?.tiempopartido) || 90) * 60000;
    return inicio.getTime() < pFin && pInicio < fin;
  }) || null;
}

function textoConflicto() {
  const p = partidoEnConflicto();
  if (!p) return null;
  const cat = p.categoria?.nombre || nombreCategoria(p.id_categoria);
  return `Ese lugar ya está ocupado a esa hora por otro partido (${cat}, ${formatHora(p.fecha)}).`;
}

function nombreCategoria(idCat) {
  return categorias.value.find((c) => c.id === idCat)?.nombre || '?';
}

function categoriaJugoRecientemente() {
  if (props.tipo !== 'partido' || form.value.id_categoria == null || !form.value.fecha) return null;
  const fecha = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(fecha.getTime())) return null;
  return partidosRecientes.value.find((p) => {
    const pCat = p.id_categoria ?? p.categoria?.id ?? null;
    return pCat != null && String(pCat) === String(form.value.id_categoria);
  }) || null;
}

function entrenamientoEnConflicto() {
  if (props.tipo !== 'entrenamiento' || form.value.id_categoria == null || !form.value.fecha) return null;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = inicio.getTime() + duracionEntrenamiento(form.value.id_categoria) * 60000;
  return entrenamientosDelDia.value.find((e) => {
    const eCat = e.id_categoria ?? e.categoria?.id ?? null;
    if (eCat == null || String(eCat) !== String(form.value.id_categoria)) return false;
    const eInicio = new Date(e.fecha);
    if (Number.isNaN(eInicio.getTime())) return false;
    const eFin = eInicio.getTime() + ((e.categoria?.tiempoentrenamiento) || 60) * 60000;
    return inicio.getTime() < eFin && eInicio.getTime() < fin;
  }) || null;
}

function duracionEntrenamiento(idCat) {
  const cat = categorias.value.find((c) => c.id === idCat);
  return (cat && cat.tiempoentrenamiento) || 60;
}

function cerrar() {
  emit('update:visible', false);
}

function formatHora(value) {
  if (!value) return '00:00';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '00:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  const base = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (Number.isNaN(base.getTime())) base.setTime(Date.now());
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const parsed = parseHora(hhmm);
  if (parsed) next.setHours(parsed.h, parsed.m, 0, 0);
  return next;
}

function onHoraInput(campo, value) {
  if (!parseHora(value)) return;
  if (form.value[campo]) {
    form.value[campo] = combinarFechaHora(form.value[campo], value);
  }
}

function onFechaChange(campo, value) {
  if (!value) {
    form.value[campo] = null;
    return;
  }
  form.value[campo] = combinarFechaHora(value, formatHora(form.value[campo]));
}

function validar() {
  if (!form.value.id_categoria || !form.value.fecha) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Categoría y fecha son obligatorias.', life: 4000 });
    return false;
  }
  if (props.tipo === 'entrenamiento' && !form.value.id_lugar) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El lugar es obligatorio.', life: 4000 });
    return false;
  }
  if (props.tipo === 'partido' && !form.value.id_equipo) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El equipo es obligatorio.', life: 4000 });
    return false;
  }
  const conflicto = props.tipo === 'partido' ? partidoEnConflicto() : null;
  if (conflicto) {
    toast.add({
      severity: 'error',
      summary: 'Lugar ocupado',
      detail: `Ese lugar ya está ocupado a esa hora por otro partido (${conflicto.categoria?.nombre || nombreCategoria(conflicto.id_categoria)}, ${formatHora(conflicto.fecha)}).`,
      life: 5000
    });
    return false;
  }
  const conflictoEntrenamiento = props.tipo === 'entrenamiento' ? entrenamientoEnConflicto() : null;
  if (conflictoEntrenamiento) {
    toast.add({
      severity: 'error',
      summary: 'Entrenamiento duplicado',
      detail: `Esta categoría ya tiene un entrenamiento a esa hora (${formatHora(conflictoEntrenamiento.fecha)}).`,
      life: 5000
    });
    return false;
  }
  const reciente = props.tipo === 'partido' ? categoriaJugoRecientemente() : null;
  if (reciente) {
    toast.add({
      severity: 'error',
      summary: 'Categoría ocupada',
      detail: 'Esta categoría jugó hace menos de 72 horas.',
      life: 5000
    });
    return false;
  }
  return true;
}

async function guardar() {
  if (!validar()) return;
  guardando.value = true;
  try {
    const payload = {
      id_categoria: form.value.id_categoria,
      fecha: form.value.fecha.toISOString()
    };
    if (props.tipo === 'entrenamiento') {
      payload.id_lugar = form.value.id_lugar;
      payload.recurrente = form.value.recurrente ? 1 : 0;
      payload.hasta = form.value.hasta ? form.value.hasta.toISOString() : null;
      if (asistenciaTipo.value === 'total') {
        payload.asistencia = 'total';
      } else {
        payload.asistencia = 'parcial';
        const detalle = jugadoresDeCategoria(form.value.id_categoria).map((j) => ({
          id_jugador: j.id,
          asistencia: asistencias.value[j.id] !== false,
          incidencias: incidenciasJugador.value[j.id] || null
        }));
        if (detalle.length) payload.asistencias = detalle;
      }
    } else {
      const esLocal = !!form.value.es_local;
      payload.es_local = esLocal ? 1 : 0;
      payload.id_lugar = esLocal ? form.value.id_lugar : null;
      payload.id_equipo = form.value.id_equipo;
      payload.incidencias = form.value.incidencias;
      payload.resultado = form.value.resultado;
      payload.resultado_incidencias = form.value.resultado_incidencias || null;
      if (form.value.ids_jugadores && form.value.ids_jugadores.length) {
        payload.ids_jugadores = form.value.ids_jugadores;
      }
    }
    const service = props.tipo === 'entrenamiento' ? entrenamientosService : partidosService;
    if (props.registroId) {
      await service.actualizar(props.registroId, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.', life: 3000 });
    } else {
      await service.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Registro creado correctamente.', life: 3000 });
    }
    cerrar();
    emit('saved');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo guardar el registro.',
      life: 5000
    });
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Dialog :visible="visible" modal class="w-full max-w-lg" @update:visible="cerrar">
    <template #header>
      <div class="flex items-center gap-2">
        <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
        <span class="font-display text-club-green text-lg">
          {{ registroId ? 'Editar' : 'Nuevo' }} · {{ tipo === 'entrenamiento' ? 'Entrenamiento' : 'Partido' }}
        </span>
      </div>
    </template>

    <form @submit.prevent="guardar" class="space-y-4 pt-1">
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Categoría <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_categoria" :options="opcionesCategoria" optionLabel="label" optionValue="value"
                filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona una opción"
                showClear :loading="cargandoCatalogo" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Fecha y hora <span class="text-club-garnet">*</span></label>
        <div class="flex gap-2">
          <DatePicker
            :model-value="form.fecha"
            @update:modelValue="(v) => onFechaChange('fecha', v)"
            dateFormat="dd/mm/yy" showIcon iconDisplay="input" :manualInput="true"
            class="flex-1" inputClass="w-full" placeholder="dd/mm/aa"
          />
          <InputText
            :model-value="formatHora(form.fecha)"
            placeholder="HH:mm"
            maxlength="5"
            inputmode="numeric"
            class="w-24"
            @update:modelValue="(v) => onHoraInput('fecha', v)"
          />
        </div>
        <p v-if="tipo === 'entrenamiento' && entrenamientoEnConflicto()" class="flex items-center gap-1.5 text-xs text-club-garnet">
          <i class="pi pi-exclamation-circle"></i>
          Esta categoría ya tiene un entrenamiento a esa hora.
        </p>
      </div>

      <template v-if="tipo === 'entrenamiento'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Lugar <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un lugar"
                  showClear :loading="cargandoCatalogo" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Repetir cada semana</label>
          <Select v-model="form.recurrente" :options="opcionesRecurrente" optionLabel="label" optionValue="value"
                  class="w-full" />
        </div>
        <div v-if="form.recurrente" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Fecha límite (si repetir)</label>
          <div class="flex gap-2">
            <DatePicker
              :model-value="form.hasta"
              @update:modelValue="(v) => onFechaChange('hasta', v)"
              dateFormat="dd/mm/yy" showIcon iconDisplay="input" :manualInput="true"
              class="flex-1" inputClass="w-full" placeholder="dd/mm/aa"
            />
            <InputText
              :model-value="formatHora(form.hasta)"
              placeholder="HH:mm"
              maxlength="5"
              inputmode="numeric"
              class="w-24"
              @update:modelValue="(v) => onHoraInput('hasta', v)"
            />
          </div>
        </div>
        <div v-if="registroId" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Asistencia</label>
          <Select v-model="asistenciaTipo" :options="opcionesAsistencia" optionLabel="label" optionValue="value"
                  class="w-full" />
        </div>
        <template v-if="asistenciaTipo === 'parcial'">
          <div v-if="jugadoresDeCategoria(form.id_categoria).length" class="border border-line rounded-lg p-2 space-y-2">
            <div
              v-for="j in jugadoresDeCategoria(form.id_categoria)"
              :key="j.id"
              class="border-b border-line last:border-0 pb-2 space-y-1"
            >
              <div class="flex items-center justify-between px-1">
                <span class="text-sm text-ink-secondary">{{ j.apellidos }}, {{ j.nombre }}</span>
                <div class="flex items-center gap-2">
                  <Checkbox
                    :model-value="asistencias[j.id] !== false"
                    :binary="true"
                    @update:model-value="(v) => { asistencias[j.id] = !!v; if (v) incidenciasJugador[j.id] = ''; }"
                  />
                  <span class="text-xs text-ink-tertiary">Asistió</span>
                </div>
              </div>
              <div class="flex items-center gap-2 px-1">
                <i class="pi pi-exclamation-circle text-ink-tertiary"></i>
                <InputText
                  v-model="incidenciasJugador[j.id]"
                  :disabled="asistencias[j.id] !== false"
                  placeholder="Causa de la ausencia"
                  class="w-full !py-1.5 !text-sm"
                />
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-ink-tertiary">Sin jugadores en la categoría seleccionada.</p>
        </template>
      </template>

      <template v-if="tipo === 'partido'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Equipo <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_equipo" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                  filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un equipo"
                  showClear :loading="cargandoCatalogo">
            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <img v-if="option.escudo" :src="option.escudo" alt="" class="w-6 h-6 object-contain" />
                <span v-else class="w-6 h-6 flex items-center justify-center">
                  <i class="pi pi-trophy text-sm text-ink-tertiary"></i>
                </span>
                <span>{{ option.label }}</span>
              </div>
            </template>
            <template #value="{ value }">
              <div v-if="value != null" class="flex items-center gap-2">
                <img
                  v-if="opcionesEquipo.find(o => o.value === value)?.escudo"
                  :src="opcionesEquipo.find(o => o.value === value).escudo"
                  alt="" class="w-6 h-6 object-contain"
                />
                <span v-else class="w-6 h-6 flex items-center justify-center">
                  <i class="pi pi-trophy text-sm text-ink-tertiary"></i>
                </span>
                <span>{{ opcionesEquipo.find(o => o.value === value)?.label }}</span>
              </div>
            </template>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Local / Visitante</label>
          <SelectButton v-model="form.es_local" :options="opcionesLocalVisitante" optionLabel="label" optionValue="value"
                        class="w-full" allowEmpty>
            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <i :class="option.icon"></i>
                <span>{{ option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>
        <div v-if="form.es_local" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Lugar</label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un lugar"
                  showClear :loading="cargandoCatalogo" />
          <p v-if="textoConflicto()" class="flex items-center gap-1.5 text-xs text-club-garnet">
            <i class="pi pi-exclamation-circle"></i> {{ textoConflicto() }}
          </p>
        </div>
        <div v-if="registroId" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Resultado</label>
          <div class="flex items-center gap-2">
            <InputText v-model="form.resultado" placeholder="Marcador, p. ej. 2-1" class="flex-1" maxlength="30" />
            <i class="pi pi-flag text-ink-tertiary"></i>
          </div>
          <p class="text-xs text-ink-tertiary">El resultado quedará guardado en la sección Resultados.</p>
        </div>
        <div v-if="registroId" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Jugadores convocados</label>
          <MultiSelect v-model="form.ids_jugadores" :options="opcionesJugadores" optionLabel="label" optionValue="value"
                       display="chip" filter placeholder="Selecciona jugadores" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Incidencias</label>
          <Textarea v-model="form.incidencias" rows="3" class="w-full" />
        </div>
      </template>

      <div class="flex justify-end gap-2 pt-3">
        <Button type="button" label="Cancelar" text @click="cerrar" />
        <Button type="submit" label="Guardar" icon="pi pi-check" :loading="guardando"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      </div>
    </form>
  </Dialog>
</template>