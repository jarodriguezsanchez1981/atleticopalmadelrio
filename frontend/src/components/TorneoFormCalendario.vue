<script setup>
import { ref, reactive, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { torneosService, plantillasService, equiposService } from '../services';
import { suscribirseCambio } from '../utils/cambioBus';

const props = defineProps({
  visible: { type: Boolean, default: false },
  registroId: { type: [Number, String], default: null },
  fechaDefecto: { type: [String, Date], default: null }
});

const emit = defineEmits(['update:visible', 'saved']);

const toast = useToast();
const plantillas = ref([]);
const equipos = ref([]);
const guardando = ref(false);
const form = reactive({ id_plantilla: null, id_equipo: null, nombre: null, fecha: null, hora: null });
let unsubCambio = null;

async function cargarCatalogo() {
  const [pls, eqs] = await Promise.all([
    plantillasService.listar(),
    equiposService.listar()
  ]);
  plantillas.value = pls;
  equipos.value = eqs;
}

onMounted(async () => {
  await cargarCatalogo();
  unsubCambio = suscribirseCambio(cargarCatalogo);
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

function toFechaSQL(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

async function cargarRegistro() {
  if (!props.registroId) return;
  try {
    const item = await torneosService.obtener(props.registroId);
    form.id_plantilla = item.id_plantilla;
    form.id_equipo = item.id_equipo;
    form.nombre = item.nombre || null;
    form.fecha = item.fecha ? new Date(`${String(item.fecha).slice(0, 10)}T12:00:00`) : null;
    form.hora = String(item.hora || '').slice(0, 5) || null;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el torneo.', life: 4000 });
  }
}

watch(() => props.visible, async (v) => {
  if (!v) return;
  form.id_plantilla = null;
  form.id_equipo = null;
  form.nombre = null;
  form.fecha = props.fechaDefecto ? new Date(props.fechaDefecto) : null;
  form.hora = null;
  await cargarRegistro();
});

function cerrar() {
  emit('update:visible', false);
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
    if (props.registroId) {
      await torneosService.actualizar(props.registroId, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Torneo actualizado correctamente.', life: 3000 });
    } else {
      await torneosService.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Torneo creado correctamente.', life: 3000 });
    }
    cerrar();
    emit('saved');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo guardar.', life: 5000 });
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
        <span class="font-display text-club-green text-lg">{{ registroId ? 'Editar' : 'Nuevo' }} · Torneo</span>
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
          <DatePicker v-model="form.fecha" dateFormat="dd/mm/yy" showIcon iconDisplay="input"
                      :manualInput="true" class="flex-1" inputClass="w-full" placeholder="dd/mm/aa" />
          <InputText v-model="form.hora" placeholder="HH:mm" maxlength="5" inputmode="numeric" class="w-24" />
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-3">
        <Button type="button" label="Cancelar" text @click="cerrar" />
        <Button type="submit" label="Guardar" icon="pi pi-check" :loading="guardando"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      </div>
    </form>
  </Dialog>
</template>
