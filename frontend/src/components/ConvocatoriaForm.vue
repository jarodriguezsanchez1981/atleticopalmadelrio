<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { temporadasService, plantillasService, partidosService, convocatoriasService } from '../services';

const props = defineProps({
  visible: { type: Boolean, default: false },
  registroId: { type: [Number, String], default: null },
  soloLectura: { type: Boolean, default: false }
});
const emit = defineEmits(['update:visible', 'saved']);

const toast = useToast();

const temporadas = ref([]);
const plantillas = ref([]);
const partidosConConvocatoria = ref(new Set());
const partidosPlantilla = ref([]);
const cargandoCatalogo = ref(false);
const cargandoPartidos = ref(false);
const guardando = ref(false);

const form = ref({ id_temporada: null, id_plantilla: null, id_partido: null });
const jugadoresConvocados = ref([]); // array de id_jugador
const nuevoJugador = ref(null);
const keySelectJugador = ref(0);
const partidoSeleccionado = ref(null);

const jugadoresNoConvocados = ref([]); // array de { id_jugador, observaciones }
const nuevoNoConvocado = ref(null);
const observacionesNuevoNoConvocado = ref('');
const keySelectNoConvocado = ref(0);

const modoEdicion = computed(() => !!props.registroId);

function resetForm() {
  form.value = { id_temporada: null, id_plantilla: null, id_partido: null };
  jugadoresConvocados.value = [];
  jugadoresNoConvocados.value = [];
  partidosPlantilla.value = [];
  partidoSeleccionado.value = null;
  nuevoJugador.value = null;
  nuevoNoConvocado.value = null;
  observacionesNuevoNoConvocado.value = '';
}

async function cargarCatalogo() {
  cargandoCatalogo.value = true;
  try {
    const [temps, pls, convs] = await Promise.all([
      temporadasService.listar(), plantillasService.listar(), convocatoriasService.listar()
    ]);
    temporadas.value = temps;
    plantillas.value = pls;
    partidosConConvocatoria.value = new Set(
      convs.filter((c) => c.id !== Number(props.registroId)).map((c) => c.id_partido)
    );
  } finally {
    cargandoCatalogo.value = false;
  }
}

async function cargarPartidosDePlantilla(idPlantilla) {
  if (!idPlantilla) { partidosPlantilla.value = []; return; }
  cargandoPartidos.value = true;
  try {
    const todos = await partidosService.listar({ id_plantilla: idPlantilla });
    // Solo partidos de liga (con jornada), y que no tengan ya una convocatoria
    // (salvo que sea la propia convocatoria que se está editando).
    partidosPlantilla.value = todos.filter((p) => p.jornada != null && !partidosConConvocatoria.value.has(p.id));
  } finally {
    cargandoPartidos.value = false;
  }
}

async function cargarRegistro() {
  if (!props.registroId) return;
  const item = await convocatoriasService.obtener(props.registroId);
  form.value = {
    id_temporada: item.id_temporada ?? item.temporada?.id ?? null,
    id_plantilla: item.id_plantilla ?? item.plantilla?.id ?? null,
    id_partido: item.id_partido ?? item.partido?.id ?? null
  };
  jugadoresConvocados.value = (item.jugadores || []).map((j) => j.id_jugador);
  jugadoresNoConvocados.value = (item.noConvocados || []).map((n) => ({
    id_jugador: n.id_jugador,
    observaciones: n.observaciones || ''
  }));
  await cargarPartidosDePlantilla(form.value.id_plantilla);
  partidoSeleccionado.value = partidosPlantilla.value.find((p) => p.id === form.value.id_partido) || null;
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

const opcionesTemporada = computed(() =>
  temporadas.value
    .map((t) => ({ label: t.nombre, value: t.id }))
    .sort((a, b) => b.label.localeCompare(a.label, 'es'))
);

const opcionesPlantilla = computed(() => {
  if (!form.value.id_temporada) return [];
  return plantillas.value
    .filter((p) => Number(p.id_temporada) === Number(form.value.id_temporada))
    .map((p) => ({ label: p.categoria?.nombre || p.categoria?.alias || `Plantilla ${p.id}`, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const plantillaSeleccionada = computed(() =>
  plantillas.value.find((p) => p.id === form.value.id_plantilla)
);

const jugadoresPlantilla = computed(() =>
  (plantillaSeleccionada.value?.jugadores || [])
    .map((j) => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos }))
    .sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'))
);

// El desplegable de cada lista excluye solo a quien ya está EN ESA lista: un
// jugador que está en la otra lista debe poder elegirse igualmente, lo que lo
// mueve de una lista a la otra (ver addJugador/addNoConvocado).
const opcionesJugadorDisponible = computed(() => {
  const usados = new Set(jugadoresConvocados.value);
  return jugadoresPlantilla.value
    .filter((j) => !usados.has(j.id))
    .map((j) => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }));
});

const opcionesJugadorDisponibleNoConv = computed(() => {
  const usados = new Set(jugadoresNoConvocados.value.map((n) => n.id_jugador));
  return jugadoresPlantilla.value
    .filter((j) => !usados.has(j.id))
    .map((j) => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id }));
});

function nombreJugador(id) {
  const j = jugadoresPlantilla.value.find((x) => x.id === id);
  return j ? `${j.nombre} ${j.apellidos}` : `Jugador ${id}`;
}

// Listas ordenadas alfabéticamente (por apellidos) para mostrar en editar/ver.
const jugadoresConvocadosOrdenados = computed(() =>
  [...jugadoresConvocados.value].sort((a, b) => nombreJugador(a).localeCompare(nombreJugador(b), 'es'))
);
const jugadoresNoConvocadosOrdenados = computed(() =>
  [...jugadoresNoConvocados.value].sort((a, b) => nombreJugador(a.id_jugador).localeCompare(nombreJugador(b.id_jugador), 'es'))
);

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

async function onTemporadaChange() {
  form.value.id_plantilla = null;
  form.value.id_partido = null;
  partidoSeleccionado.value = null;
  partidosPlantilla.value = [];
  jugadoresConvocados.value = [];
}

async function onPlantillaChange() {
  form.value.id_partido = null;
  partidoSeleccionado.value = null;
  jugadoresConvocados.value = [];
  await cargarPartidosDePlantilla(form.value.id_plantilla);
}

watch(partidoSeleccionado, (p) => {
  form.value.id_partido = p?.id ?? null;
});

function addJugador() {
  if (!nuevoJugador.value) return;
  if (!jugadoresConvocados.value.includes(nuevoJugador.value)) {
    jugadoresConvocados.value.push(nuevoJugador.value);
  }
  // Un jugador convocado no puede seguir figurando como no convocado.
  jugadoresNoConvocados.value = jugadoresNoConvocados.value.filter((n) => n.id_jugador !== nuevoJugador.value);
  nuevoJugador.value = null;
  keySelectJugador.value += 1;
}

function removeJugador(id) {
  jugadoresConvocados.value = jugadoresConvocados.value.filter((x) => x !== id);
}

function plantillaCompleta() {
  jugadoresConvocados.value = jugadoresPlantilla.value.map((j) => j.id);
  jugadoresNoConvocados.value = [];
}

function addNoConvocado() {
  if (!nuevoNoConvocado.value) return;
  if (!jugadoresNoConvocados.value.some((n) => n.id_jugador === nuevoNoConvocado.value)) {
    jugadoresNoConvocados.value.push({
      id_jugador: nuevoNoConvocado.value,
      observaciones: observacionesNuevoNoConvocado.value.trim()
    });
  }
  // Un jugador no convocado no puede seguir figurando como convocado.
  jugadoresConvocados.value = jugadoresConvocados.value.filter((id) => id !== nuevoNoConvocado.value);
  nuevoNoConvocado.value = null;
  observacionesNuevoNoConvocado.value = '';
  keySelectNoConvocado.value += 1;
}

function removeNoConvocado(id) {
  jugadoresNoConvocados.value = jugadoresNoConvocados.value.filter((n) => n.id_jugador !== id);
}

function cerrar() {
  emit('update:visible', false);
}

async function guardar() {
  if (!form.value.id_temporada || !form.value.id_plantilla || !form.value.id_partido) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Temporada, plantilla y partido son obligatorios.', life: 4000 });
    return;
  }
  if (!jugadoresConvocados.value.length) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Añade al menos un jugador a la convocatoria.', life: 4000 });
    return;
  }
  const noConvocadosPayload = jugadoresNoConvocados.value.map((n) => ({
    id_jugador: n.id_jugador,
    observaciones: n.observaciones || null
  }));
  guardando.value = true;
  try {
    if (modoEdicion.value) {
      await convocatoriasService.actualizar(props.registroId, {
        jugadores: jugadoresConvocados.value,
        no_convocados: noConvocadosPayload
      });
      toast.add({ severity: 'success', summary: 'Actualizada', detail: 'Convocatoria actualizada correctamente.', life: 3000 });
    } else {
      await convocatoriasService.crear({
        id_temporada: form.value.id_temporada,
        id_plantilla: form.value.id_plantilla,
        id_partido: form.value.id_partido,
        jugadores: jugadoresConvocados.value,
        no_convocados: noConvocadosPayload
      });
      toast.add({ severity: 'success', summary: 'Creada', detail: 'Convocatoria creada correctamente.', life: 3000 });
    }
    cerrar();
    emit('saved');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo guardar la convocatoria.',
      life: 5000
    });
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
<Dialog :visible="visible" modal class="w-full max-w-3xl" @update:visible="cerrar">
  <template #header>
    <div class="flex items-center gap-2">
      <img src="/escudo.png" alt="" class="w-8 h-8 object-contain" />
      <span class="font-display text-club-green text-lg">
        {{ soloLectura ? 'Ver' : modoEdicion ? 'Editar' : 'Nueva' }} convocatoria
      </span>
    </div>
  </template>

  <form @submit.prevent="guardar" class="flex flex-col gap-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Temporada <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_temporada" :options="opcionesTemporada" optionLabel="label" optionValue="value"
                class="w-full" placeholder="Selecciona una temporada" :disabled="modoEdicion || soloLectura"
                :loading="cargandoCatalogo" @change="onTemporadaChange" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-secondary">Plantilla <span class="text-club-garnet">*</span></label>
        <Select v-model="form.id_plantilla" :options="opcionesPlantilla" optionLabel="label" optionValue="value"
                class="w-full" placeholder="Selecciona una plantilla"
                :disabled="modoEdicion || soloLectura || !form.id_temporada" @change="onPlantillaChange" />
      </div>
    </div>

    <div v-if="form.id_plantilla">
      <h3 class="text-sm font-semibold text-club-green mb-2">Partido</h3>
      <DataTable
        :value="partidosPlantilla" :loading="cargandoPartidos" paginator :rows="5"
        v-model:selection="partidoSeleccionado" selectionMode="single" dataKey="id"
        class="ar-datatable" :class="{ 'pointer-events-none opacity-60': modoEdicion || soloLectura }"
      >
        <Column field="fecha" header="Fecha">
          <template #body="{ data }">{{ formatearFecha(data.fecha) }}</template>
        </Column>
        <Column header="Equipo local">
          <template #body="{ data }">{{ data.equipoLocal?.nombre || '—' }}</template>
        </Column>
        <Column header="Equipo visitante">
          <template #body="{ data }">{{ data.equipoVisitante?.nombre || '—' }}</template>
        </Column>
        <template #empty>
          <div class="text-center text-ink-tertiary py-4 text-sm">
            Esta plantilla no tiene partidos sin convocatoria.
          </div>
        </template>
      </DataTable>
      <p v-if="!form.id_partido" class="text-xs text-ink-tertiary mt-1">Pincha en un partido de la lista para seleccionarlo.</p>
    </div>

    <div v-if="form.id_partido">
      <div class="flex items-center justify-between gap-2 mb-2">
        <h3 class="text-sm font-semibold text-club-green">Jugadores convocados</h3>
        <Button v-if="!soloLectura" type="button" label="Plantilla Completa" icon="pi pi-users" text size="small"
                class="!text-club-green" @click="plantillaCompleta" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
              <th v-if="!soloLectura" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="id in jugadoresConvocadosOrdenados" :key="id">
              <td class="border border-line p-2 text-sm">{{ nombreJugador(id) }}</td>
              <td v-if="!soloLectura" class="text-center border border-line p-2">
                <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                        @click="removeJugador(id)" />
              </td>
            </tr>
            <tr v-if="!jugadoresConvocadosOrdenados.length">
              <td :colspan="soloLectura ? 1 : 2" class="text-center text-ink-tertiary p-3 text-sm">Todavía no hay jugadores convocados.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!soloLectura" class="flex gap-2 mt-2">
        <Select :key="keySelectJugador" v-model="nuevoJugador" :options="opcionesJugadorDisponible"
                optionLabel="label" optionValue="value" placeholder="Seleccionar jugador"
                class="flex-1" filter showClear />
        <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                @click="addJugador" />
      </div>
    </div>

    <div v-if="form.id_partido">
      <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores no convocados</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
              <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Observaciones</th>
              <th v-if="!soloLectura" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in jugadoresNoConvocadosOrdenados" :key="n.id_jugador">
              <td class="border border-line p-2 text-sm">{{ nombreJugador(n.id_jugador) }}</td>
              <td class="border border-line p-2 text-sm text-ink-secondary">{{ n.observaciones || '—' }}</td>
              <td v-if="!soloLectura" class="text-center border border-line p-2">
                <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                        @click="removeNoConvocado(n.id_jugador)" />
              </td>
            </tr>
            <tr v-if="!jugadoresNoConvocadosOrdenados.length">
              <td :colspan="soloLectura ? 2 : 3" class="text-center text-ink-tertiary p-3 text-sm">No hay jugadores marcados como no convocados.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!soloLectura" class="flex flex-col sm:flex-row gap-2 mt-2">
        <Select :key="keySelectNoConvocado" v-model="nuevoNoConvocado" :options="opcionesJugadorDisponibleNoConv"
                optionLabel="label" optionValue="value" placeholder="Seleccionar jugador"
                class="flex-1" filter showClear />
        <InputText v-model="observacionesNuevoNoConvocado" placeholder="Observaciones (motivo)" class="flex-1" />
        <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                @click="addNoConvocado" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-3 border-t border-line">
      <Button v-if="soloLectura" type="button" label="Cerrar" @click="cerrar"
              class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      <template v-else>
        <Button type="button" label="Cancelar" text @click="cerrar" />
        <Button type="submit" label="Guardar" icon="pi pi-check" :loading="guardando"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      </template>
    </div>
  </form>
</Dialog>
</template>
