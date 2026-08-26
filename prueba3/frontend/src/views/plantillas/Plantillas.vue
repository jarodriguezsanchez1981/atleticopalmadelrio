<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast';
import { plantillasService, categoriasService, temporadasService, divisionesService, jugadoresService, entrenadoresService, delegadosService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';


const crudRef = ref(null);
const toast = useToast();
const categorias = ref([]);
const temporadas = ref([]);
const divisiones = ref([]);
const jugadores = ref([]);
const entrenadores = ref([]);
const delegados = ref([]);
const plantillasExistentes = ref([]);
let unsubCambio = null;

const dialogTemporadaVisible = ref(false);
const temporadaSeleccionada = ref(null);
const creandoTemporada = ref(false);

async function cargarOpciones() {
  const [cats, temps, divs, jug, ents, dels, plants] = await Promise.all([
    categoriasService.listar(),
    temporadasService.listar(),
    divisionesService.listar().catch(() => []),
    jugadoresService.listar(),
    entrenadoresService.listar(),
    delegadosService.listar(),
    plantillasService.listar()
  ]);
  categorias.value = cats;
  temporadas.value = temps;
  divisiones.value = divs;
  jugadores.value = jug;
  entrenadores.value = ents;
  delegados.value = dels;
  plantillasExistentes.value = plants;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

/** Refresca la lista de plantillas tras crear/editar/borrar. */
function onPlantillasChanged() {
  plantillasService.listar().then((rows) => { plantillasExistentes.value = rows; });
}

function abrirDialogoTemporada() {
  temporadaSeleccionada.value = null;
  dialogTemporadaVisible.value = true;
}

async function crearPlantillaTemporada() {
  if (!temporadaSeleccionada.value) return;
  creandoTemporada.value = true;
  try {
    const resultado = await plantillasService.crearTemporada({ id_temporada: temporadaSeleccionada.value });
    toast.add({
      severity: 'success',
      summary: 'Plantillas creadas',
      detail: `${resultado.message} (${resultado.omitidas} omitidas por ya estar registradas)`,
      life: 5000
    });
    dialogTemporadaVisible.value = false;
    onPlantillasChanged();
    crudRef.value?.cargar();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudieron crear las plantillas.',
      life: 4000
    });
  } finally {
    creandoTemporada.value = false;
  }
}

const opcionesTemporada = computed(() =>
  temporadas.value.map(t => ({ label: t.nombre, value: t.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

/**
 * En el combo no aparecen las categorías ya registradas en plantillas
 * (una categoría solo puede registrarse una vez, en su temporada).
 * Al editar se excluye la propia fila para conservar su categoría.
 */
function opcionesCategoriaDisponibles(form) {
  const editandoId = form?.id ?? null;
  const ocupadas = new Set(
    plantillasExistentes.value
      .filter((p) => p.id !== editandoId)
      .map((p) => p.id_categoria)
  );
  return categorias.value
    .filter((c) => !ocupadas.has(c.id))
    .map(c => ({ label: c.nombre, value: c.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

const opcionesDivision = computed(() =>
  divisiones.value.map(d => ({ label: d.nombre, value: d.id })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesEntrenador = computed(() =>
  entrenadores.value.map(e => ({ label: `${e.apellidos}, ${e.nombre}`, value: e.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const opcionesDelegado = computed(() =>
  delegados.value.map(d => ({ label: `${d.apellidos}, ${d.nombre}`, value: d.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true },
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoriaDisponibles, required: true },
  { field: 'id_division', header: 'División', type: 'select', options: opcionesDivision.value, required: false },
  { field: 'ids_entrenadores', header: 'Entrenadores', type: 'multiselect', options: opcionesEntrenador.value, required: false, filter: true, filterMinLength: 3, relation: 'entrenadores' },
  { field: 'ids_delegados', header: 'Delegados', type: 'multiselect', options: opcionesDelegado.value, required: false, filter: true, filterMinLength: 3, relation: 'delegados' },
  { field: 'jugadores', header: 'Jugadores', type: 'custom', soloTabla: true }
]);

const emptyItem = {
  id_temporada: null,
  id_categoria: null,
  id_division: null,
  ids_entrenadores: [],
  ids_delegados: [],
  jugadores: []
};

function nombrePersona(id, lista) {
  const p = lista.value.find(x => x.value === id);
  return p ? p.label : id || '—';
}

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
}

function nombreCategoria(id) {
  return categorias.value.find(c => c.id === id)?.nombre || '—';
}

function nombreDivision(id) {
  return divisiones.value.find(d => d.id === id)?.nombre || '—';
}

function formatoMiembros(data) {
  const parts = [];
  if (data.entrenadores?.length) parts.push(`👨‍🏫 ${data.entrenadores.map(e => `${e.apellidos}, ${e.nombre}`).join(', ')}`);
  if (data.delegados?.length) parts.push(`📋 ${data.delegados.map(d => `${d.apellidos}, ${d.nombre}`).join(', ')}`);
  if (data.jugadores?.length) parts.push(`⚽ ${data.jugadores.map(j => `${j.apellidos}, ${j.nombre}`).join(', ')}`);
  return parts.join('\n') || '—';
}

function formatearJugador(j) {
  const jp = j.PlantillaJugador || {};
  return {
    id_jugador: j.id,
    dorsal: jp.dorsal,
    talla: jp.talla
  };
}

function prepareJugadoresPayload(data) {
  if (!data.jugadores?.length) return [];
  return data.jugadores.map(j => formatearJugador(j));
}
</script>

<template>
  <CrudDataTable
    ref="crudRef"
    title="Plantillas"
    :columns="columns"
    :service="plantillasService"
    :emptyItem="emptyItem"
    @changed="onPlantillasChanged"
  >
    <template #acciones>
      <Button label="Crear plantilla temporada" icon="pi pi-sparkles" outlined
              class="!text-club-green !border-club-green/50 hover:!bg-club-green/5"
              @click="abrirDialogoTemporada" />
    </template>
    <template #cell-id_temporada="{ data }">
      {{ data.temporada?.nombre || nombreTemporada(data.id_temporada) }}
    </template>
    <template #cell-id_categoria="{ data }">
      {{ data.categoria?.nombre || nombreCategoria(data.id_categoria) }}
    </template>
    <template #cell-id_division="{ data }">
      {{ data.division?.nombre || nombreDivision(data.id_division) }}
    </template>
    <template #cell-ids_entrenadores="{ data }">
      <span v-if="data.entrenadores?.length">
        {{ data.entrenadores.map(e => `${e.apellidos}, ${e.nombre}`).join(', ') }}
      </span>
      <span v-else>—</span>
    </template>
    <template #cell-ids_delegados="{ data }">
      <span v-if="data.delegados?.length">
        {{ data.delegados.map(d => `${d.apellidos}, ${d.nombre}`).join(', ') }}
      </span>
      <span v-else>—</span>
    </template>
        :readonly="false"
      />
  </CrudDataTable>

  <Dialog v-model:visible="dialogTemporadaVisible" modal header="Crear plantilla temporada"
          :style="{ width: '26rem' }" :closable="!creandoTemporada">
    <div class="space-y-3">
      <p class="text-sm text-ink-secondary">
        Se creará un registro de plantilla por cada categoría que aún no
        esté registrada, para la temporada seleccionada.
      </p>
      <label class="block text-sm font-medium">Temporada <span class="text-club-garnet">*</span></label>
      <Select v-model="temporadaSeleccionada" :options="opcionesTemporada" optionLabel="label"
              optionValue="value" placeholder="Selecciona una temporada" class="w-full" showClear />
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <Button label="Cancelar" text @click="dialogTemporadaVisible = false" :disabled="creandoTemporada" />
        <Button label="Crear" icon="pi pi-check" :loading="creandoTemporada"
                :disabled="!temporadaSeleccionada"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                @click="crearPlantillaTemporada" />
      </div>
    </template>
  </Dialog>
</template>