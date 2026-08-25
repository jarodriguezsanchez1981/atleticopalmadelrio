<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
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

const opcionesJugador = computed(() =>
  jugadores.value.map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
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
  { field: 'id_entrenador', header: 'Entrenador', type: 'select', options: opcionesEntrenador.value, required: false },
  { field: 'id_delegado', header: 'Delegado', type: 'select', options: opcionesDelegado.value, required: false },
  { field: 'id_jugador', header: 'Jugador', type: 'select', options: opcionesJugador.value, required: false }
]);

const emptyItem = {
  id_temporada: null,
  id_categoria: null,
  id_division: null,
  id_entrenador: null,
  id_delegado: null,
  id_jugador: null
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

function tipoMiembro(data) {
  if (data.jugador) return 'Jugador';
  if (data.entrenador) return 'Entrenador';
  if (data.delegado) return 'Delegado';
  return '—';
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
    <template #cell-id_entrenador="{ data }">
      <span v-if="data.entrenador">{{ data.entrenador.apellidos }}, {{ data.entrenador.nombre }}</span>
      <span v-else>—</span>
    </template>
    <template #cell-id_delegado="{ data }">
      <span v-if="data.delegado">{{ data.delegado.apellidos }}, {{ data.delegado.nombre }}</span>
      <span v-else>—</span>
    </template>
    <template #cell-id_jugador="{ data }">
      <span v-if="data.jugador">{{ data.jugador.apellidos }}, {{ data.jugador.nombre }}</span>
      <span v-else>—</span>
    </template>

    <template #detail-extra="{ data }">
      <div class="border-t border-line pt-3 space-y-2 text-sm">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <span class="text-ink-tertiary block">Rol en la plantilla</span>
            <span class="font-medium">{{ tipoMiembro(data) }}</span>
          </div>
          <div>
            <span class="text-ink-tertiary block">Miembro</span>
            <span class="font-medium">
              <template v-if="data.jugador">{{ data.jugador.nombre }} {{ data.jugador.apellidos }}</template>
              <template v-else-if="data.entrenador">{{ data.entrenador.nombre }} {{ data.entrenador.apellidos }}</template>
              <template v-else-if="data.delegado">{{ data.delegado.nombre }} {{ data.delegado.apellidos }}</template>
              <template v-else>—</template>
            </span>
          </div>
        </div>
      </div>
    </template>
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
