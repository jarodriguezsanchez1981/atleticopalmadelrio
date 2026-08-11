<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import {
  entrenamientosService, partidosService, categoriasService,
  lugaresService, equiposService, jugadoresService
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
    incidencias: ''
  };
  asistencias.value = {};
}

function jugadoresDeCategoria(idCat) {
  if (!idCat) return [];
  return jugadores.value.filter((j) => (j.ids_categorias || []).includes(idCat))
    .sort((a, b) => `${a.apellidos}, ${a.nombre}`.localeCompare(`${b.apellidos}, ${b.nombre}`, 'es'));
}

function iniciarAsistencias(idCat) {
  asistencias.value = {};
  jugadoresDeCategoria(idCat).forEach((j) => { asistencias.value[j.id] = true; });
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
      incidencias: item.incidencias || ''
    };
    if (props.tipo === 'entrenamiento') {
      asistencias.value = {};
      (item.ids_presentes || []).forEach((id) => { asistencias.value[id] = true; });
      (item.ids_ausentes || []).forEach((id) => { asistencias.value[id] = false; });
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
  }
);

watch(
  () => form.value.id_categoria,
  (idCat) => {
    if (!props.registroId && idCat != null) iniciarAsistencias(idCat);
  }
);

const opcionesCategoria = computed(() =>
  categorias.value
    .map((c) => ({ label: `${c.nombre} (${c.temporada?.nombre || ''})`, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesLugar = computed(() =>
  lugares.value.map((l) => ({ label: l.nombre, value: l.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEquipo = computed(() =>
  equipos.value
    .map((e) => ({ label: e.nombre, value: e.id, escudo: e.escudo || null }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesRecurrente = [
  { label: 'No (solo este día)', value: 0 },
  { label: 'Sí (todas las semanas)', value: 1 }
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

function cerrar() {
  emit('update:visible', false);
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
  if (props.tipo === 'partido' && form.value.es_local && !form.value.id_lugar) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El lugar es obligatorio en partidos como local.', life: 4000 });
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
      const presentes = [];
      const ausentes = [];
      for (const [id, asist] of Object.entries(asistencias.value)) {
        if (asist) presentes.push(Number(id));
        else ausentes.push(Number(id));
      }
      if (presentes.length || ausentes.length) {
        payload.ids_presentes = presentes;
        payload.ids_ausentes = ausentes;
      }
    } else {
      const esLocal = !!form.value.es_local;
      payload.es_local = esLocal ? 1 : 0;
      payload.id_lugar = esLocal ? form.value.id_lugar : null;
      payload.id_equipo = form.value.id_equipo;
      payload.incidencias = form.value.incidencias;
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
        <label class="text-sm font-medium text-slate-600">Categoría <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_categoria" :options="opcionesCategoria" optionLabel="label" optionValue="value"
                filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona una opción"
                showClear :loading="cargandoCatalogo" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-slate-600">Fecha y hora <span class="text-club-garnet">*</span></label>
        <DatePicker v-model="form.fecha" showTime hourFormat="24" dateFormat="dd/mm/yy" :showSeconds="false"
                    :stepMinute="1" showIcon iconDisplay="input" :manualInput="true" class="w-full"
                    inputClass="w-full" placeholder="dd/mm/aa hh:mm" />
      </div>

      <template v-if="tipo === 'entrenamiento'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Lugar <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un lugar"
                  showClear :loading="cargandoCatalogo" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Repetir cada semana</label>
          <Select v-model="form.recurrente" :options="opcionesRecurrente" optionLabel="label" optionValue="value"
                  class="w-full" />
        </div>
        <div v-if="form.recurrente" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Fecha límite (si repetir)</label>
          <DatePicker v-model="form.hasta" showTime hourFormat="24" dateFormat="dd/mm/yy" :showSeconds="false"
                      :stepMinute="1" showIcon iconDisplay="input" :manualInput="true" class="w-full"
                      inputClass="w-full" placeholder="dd/mm/aa hh:mm" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Jugadores de la categoría y asistencia</label>
          <div v-if="jugadoresDeCategoria(form.id_categoria).length" class="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
            <div
              v-for="j in jugadoresDeCategoria(form.id_categoria)"
              :key="j.id"
              class="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50"
            >
              <span class="text-sm text-slate-700">{{ j.apellidos }}, {{ j.nombre }}</span>
              <Checkbox v-model="asistencias[j.id]" binary />
            </div>
          </div>
          <p v-else class="text-xs text-slate-400">Sin jugadores en la categoría seleccionada.</p>
        </div>
      </template>

      <template v-if="tipo === 'partido'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Equipo <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_equipo" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                  filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un equipo"
                  showClear :loading="cargandoCatalogo">
            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <img v-if="option.escudo" :src="option.escudo" alt="" class="w-6 h-6 object-contain" />
                <span v-else class="w-6 h-6 flex items-center justify-center">
                  <i class="pi pi-trophy text-sm text-slate-300"></i>
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
                  <i class="pi pi-trophy text-sm text-slate-300"></i>
                </span>
                <span>{{ opcionesEquipo.find(o => o.value === value)?.label }}</span>
              </div>
            </template>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Local / Visitante</label>
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
          <label class="text-sm font-medium text-slate-600">Lugar <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un lugar"
                  showClear :loading="cargandoCatalogo" />
        </div>
        <div v-if="registroId" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Jugadores convocados</label>
          <MultiSelect v-model="form.ids_jugadores" :options="opcionesJugadores" optionLabel="label" optionValue="value"
                       display="chip" filter placeholder="Selecciona jugadores" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-600">Incidencias</label>
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