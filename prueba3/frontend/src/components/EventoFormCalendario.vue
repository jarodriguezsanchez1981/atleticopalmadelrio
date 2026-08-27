<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import {
  entrenamientosService, partidosService, plantillasService,
  lugaresService, equiposService, calendarioService
} from '../services';

const props = defineProps({
  visible: { type: Boolean, default: false },
  tipo: { type: String, default: 'entrenamiento', validator: (v) => v === 'entrenamiento' || v === 'partido' },
  registroId: { type: [Number, String], default: null },
  fechaDefecto: { type: [String, Date], default: null }
});

const emit = defineEmits(['update:visible', 'saved']);

const toast = useToast();

const plantillas = ref([]);
const lugares = ref([]);
const equipos = ref([]);
const cargandoCatalogo = ref(false);
const guardando = ref(false);

const form = ref({});
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
    id_plantilla: null,
    fecha: props.fechaDefecto ? new Date(props.fechaDefecto) : null,
    id_lugar: null,
    hasta: null,
    id_equipo: null,
    es_local: props.tipo === 'partido' ? 1 : null,
    incidencias: '',
    resultado: '',
    resultado_incidencias: ''
  };
}

async function cargarCatalogo() {
  cargandoCatalogo.value = true;
  try {
    const promesas = [plantillasService.listar(), lugaresService.listar()];
    if (props.tipo === 'partido') promesas.push(equiposService.listar());
    const [pls, lugs, eqs] = await Promise.all(promesas);
    plantillas.value = pls;
    lugares.value = lugs;
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
      id_plantilla: item.id_plantilla ?? item.plantilla?.id ?? null,
      fecha: item.fecha ? new Date(item.fecha) : null,
      id_lugar: item.id_lugar ?? item.lugar?.id ?? null,
      hasta: item.hasta ? new Date(item.hasta) : null,
      id_equipo: props.tipo === 'partido' ? item.id_equipo ?? item.equipo?.id ?? null : null,
      es_local: props.tipo === 'partido' ? (item.es_local ? 1 : 0) : null,
      incidencias: item.incidencias || '',
      resultado: item.resultado_valor || '',
      resultado_incidencias: item.resultado_incidencias || ''
    };
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
    if (props.tipo === 'entrenamiento' && !props.registroId && nueva && anterior) {
      form.value.id_lugar = null;
    }
    cargarPartidosDelDia();
    cargarEntrenamientosDelDia();
  }
);

watch(
  () => form.value.id_plantilla,
  () => {
    if (form.value.id_lugar != null) {
      const sigue = opcionesLugar.value.some((o) => o.value === form.value.id_lugar);
      if (!sigue) form.value.id_lugar = null;
    }
  }
);

const opcionesPlantilla = computed(() => {
  if (props.tipo === 'entrenamiento') {
    const ocupadas = new Set(
      entrenamientosDelDia.value.map((e) => e.id_plantilla ?? e.plantilla?.id ?? null).filter(Boolean)
    );
    return plantillas.value
      .filter((p) => !ocupadas.has(p.id))
      .map((p) => ({ label: `${p.categoria?.nombre || 'Plantilla'} · ${p.temporada?.nombre || ''}`, value: p.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  if (props.tipo !== 'partido') {
    return plantillas.value
      .map((p) => ({ label: `${p.categoria?.nombre || 'Plantilla'} · ${p.temporada?.nombre || ''}`, value: p.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  const recientes = new Set(
    partidosRecientes.value.map((p) => p.id_plantilla ?? p.plantilla?.id ?? null).filter(Boolean)
  );
  return plantillas.value
    .filter((p) => !recientes.has(p.id))
    .map((p) => ({ label: `${p.categoria?.nombre || 'Plantilla'} · ${p.temporada?.nombre || ''}`, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const opcionesLugar = computed(() => {
  const idPl = form.value.id_plantilla;
  const pl = plantillas.value.find((p) => p.id === idPl);
  const idCat = pl?.id_categoria;
  const cat = pl?.categoria;
  const filtradas = idCat && cat && cat.id_tipofutbol
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
  const fin = inicio.getTime() + duracionEntrenamiento(form.value.id_plantilla) * 60000;
  entrenamientosDelDia.value.forEach((e) => {
    const eInicio = new Date(e.fecha);
    if (Number.isNaN(eInicio.getTime())) return;
    const eFin = eInicio.getTime() + ((e.plantilla?.categoria?.tiempoentrenamiento) || 60) * 60000;
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

const opcionesLocalVisitante = [
  { label: 'Local', value: 1, icon: 'pi pi-home' },
  { label: 'Visitante', value: 0, icon: 'pi pi-arrow-right-arrow-left' }
];

function duracionPlantilla(idPl) {
  const pl = plantillas.value.find((p) => p.id === idPl);
  return (pl?.categoria?.tiempopartido) || 90;
}

function partidoEnConflicto() {
  if (props.tipo !== 'partido' || !form.value.es_local || form.value.id_lugar == null || !form.value.fecha) return null;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = inicio.getTime() + duracionPlantilla(form.value.id_plantilla) * 60000;
  return partidosDelDia.value.find((p) => {
    if (p.id_lugar != null && String(p.id_lugar) !== String(form.value.id_lugar)) return false;
    if (p.lugar?.id != null && String(p.lugar.id) !== String(form.value.id_lugar)) return false;
    const pInicio = new Date(p.fecha).getTime();
    if (Number.isNaN(pInicio)) return false;
    const pFin = pInicio + ((p.plantilla?.categoria?.tiempopartido) || 90) * 60000;
    return inicio.getTime() < pFin && pInicio < fin;
  }) || null;
}

function textoConflicto() {
  const p = partidoEnConflicto();
  if (!p) return null;
  const cat = p.plantilla?.categoria?.nombre || nombrePlantilla(p.id_plantilla);
  return `Ese lugar ya está ocupado a esa hora por otro partido (${cat}, ${formatHora(p.fecha)}).`;
}

function nombrePlantilla(idPl) {
  return plantillas.value.find((p) => p.id === idPl)?.categoria?.nombre || '?';
}

function plantillaJugoRecientemente() {
  if (props.tipo !== 'partido' || form.value.id_plantilla == null || !form.value.fecha) return null;
  const fecha = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(fecha.getTime())) return null;
  return partidosRecientes.value.find((p) => {
    const pPl = p.id_plantilla ?? p.plantilla?.id ?? null;
    return pPl != null && String(pPl) === String(form.value.id_plantilla);
  }) || null;
}

function entrenamientoEnConflicto() {
  if (props.tipo !== 'entrenamiento' || form.value.id_plantilla == null || !form.value.fecha) return null;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = inicio.getTime() + duracionEntrenamiento(form.value.id_plantilla) * 60000;
  return entrenamientosDelDia.value.find((e) => {
    const ePl = e.id_plantilla ?? e.plantilla?.id ?? null;
    if (ePl == null || String(ePl) !== String(form.value.id_plantilla)) return false;
    const eInicio = new Date(e.fecha);
    if (Number.isNaN(eInicio.getTime())) return false;
    const eFin = eInicio.getTime() + ((e.plantilla?.categoria?.tiempoentrenamiento) || 60) * 60000;
    return inicio.getTime() < eFin && eInicio.getTime() < fin;
  }) || null;
}

function duracionEntrenamiento(idPl) {
  const pl = plantillas.value.find((p) => p.id === idPl);
  return (pl?.categoria?.tiempoentrenamiento) || 60;
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
  if (!form.value.id_plantilla || !form.value.fecha) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Plantilla y fecha son obligatorias.', life: 4000 });
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
      detail: `Ese lugar ya está ocupado a esa hora por otro partido (${conflicto.plantilla?.categoria?.nombre || nombrePlantilla(conflicto.id_plantilla)}, ${formatHora(conflicto.fecha)}).`,
      life: 5000
    });
    return false;
  }
  const conflictoEntrenamiento = props.tipo === 'entrenamiento' ? entrenamientoEnConflicto() : null;
  if (conflictoEntrenamiento) {
    toast.add({
      severity: 'error',
      summary: 'Entrenamiento duplicado',
      detail: `Esta plantilla ya tiene un entrenamiento a esa hora (${formatHora(conflictoEntrenamiento.fecha)}).`,
      life: 5000
    });
    return false;
  }
  const reciente = props.tipo === 'partido' ? plantillaJugoRecientemente() : null;
  if (reciente) {
    toast.add({
      severity: 'error',
      summary: 'Plantilla ocupada',
      detail: 'Esta plantilla jugó hace menos de 72 horas.',
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
      id_plantilla: form.value.id_plantilla,
      fecha: form.value.fecha.toISOString()
    };
    if (props.tipo === 'entrenamiento') {
      payload.id_lugar = form.value.id_lugar;
      payload.hasta = form.value.hasta ? form.value.hasta.toISOString() : null;
    } else {
      const esLocal = !!form.value.es_local;
      payload.es_local = esLocal ? 1 : 0;
      payload.id_lugar = esLocal ? form.value.id_lugar : null;
      payload.id_equipo = form.value.id_equipo;
      payload.incidencias = form.value.incidencias;
      payload.resultado = form.value.resultado;
      payload.resultado_incidencias = form.value.resultado_incidencias || null;
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
        <label class="text-sm font-medium text-ink-secondary">Plantilla <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_plantilla" :options="opcionesPlantilla" optionLabel="label" optionValue="value"
                class="w-full" placeholder="Selecciona una plantilla"
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
          Esta plantilla ya tiene un entrenamiento a esa hora.
        </p>
      </div>

      <template v-if="tipo === 'entrenamiento'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Lugar <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Selecciona un lugar"
                  showClear :loading="cargandoCatalogo" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Fecha límite (repetir)</label>
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
      </template>

      <template v-if="tipo === 'partido'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Equipo <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_equipo" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Selecciona un equipo"
                  showClear filter :loading="cargandoCatalogo">
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
            <template #value="{ value }">
              <div v-if="value != null" class="flex items-center gap-2">
                <i :class="opcionesLocalVisitante.find(o => o.value === value)?.icon"></i>
                <span>{{ opcionesLocalVisitante.find(o => o.value === value)?.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>
        <div v-if="form.es_local" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Lugar</label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Selecciona un lugar"
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
