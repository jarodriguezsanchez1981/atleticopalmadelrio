<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import { useToast } from 'primevue/usetoast';
import { plantillasService, categoriasService, temporadasService, divisionesService, jugadoresService, entrenadoresService, delegadosService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';
import CamisetaDorsal from '../../components/CamisetaDorsal.vue';


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

const opcionesJugador = computed(() =>
  jugadores.value.map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const columns = computed(() => [
  { field: 'id_temporada', header: 'Temporada', type: 'select', options: opcionesTemporada.value, required: true, enDetalle: false },
  { field: 'id_categoria', header: 'Categoría', type: 'select', options: opcionesCategoriaDisponibles, required: true, enDetalle: false },
  { field: 'id_division', header: 'División', type: 'select', options: opcionesDivision.value, required: false, enDetalle: false },
  { field: 'ids_entrenadores', header: 'Entrenadores', type: 'multiselect', options: opcionesEntrenador.value, required: false, filter: true, filterMinLength: 3, relation: 'entrenadores', enDetalle: false, enForm: false },
  { field: 'ids_delegados', header: 'Delegados', type: 'multiselect', options: opcionesDelegado.value, required: false, filter: true, filterMinLength: 3, relation: 'delegados', enDetalle: false, enForm: false }
]);

const emptyItem = {
  id_temporada: null,
  id_categoria: null,
  id_division: null,
  ids_entrenadores: [],
  ids_delegados: [],
  jugadores: []
};

function nombreTemporada(id) {
  return temporadas.value.find(t => t.id === id)?.nombre || '—';
}

function nombreCategoria(id) {
  return categorias.value.find(c => c.id === id)?.nombre || '—';
}

function nombreDivision(id) {
  return divisiones.value.find(d => d.id === id)?.nombre || '—';
}

function formatearJugador(j) {
  const jp = j.PlantillaJugador || {};
  return {
    id_jugador: j.id,
    dorsal: jp.dorsal,
    talla: jp.talla,
    promocion: jp.promocion || false
  };
}

function prepareEdit(item) {
  const jugadoresSimples = (item.jugadores || []).map(j => formatearJugador(j));
  jugadoresSimples.sort((a, b) => {
    const na = jugadorInfo(a.id_jugador);
    const nb = jugadorInfo(b.id_jugador);
    const nombreA = na ? `${na.apellidos} ${na.nombre}` : '';
    const nombreB = nb ? `${nb.apellidos} ${nb.nombre}` : '';
    return nombreA.localeCompare(nombreB, 'es');
  });
  return { jugadores: jugadoresSimples };
}

const nuevoEntrenador = ref(null);
const nuevoDelegado = ref(null);
const nuevoJugador = ref(null);
const nuevoDorsal = ref(null);
const nuevaTalla = ref(null);
const keySelectJugador = ref(0);
const ordenJugadores = ref({ campo: 'nombre', asc: true });
const ordenJugadoresDetalle = ref({ campo: 'nombre', asc: true });

function entrenadorInfo(id) {
  return entrenadores.value.find(e => e.id === id);
}

function delegadoInfo(id) {
  return delegados.value.find(d => d.id === id);
}

function jugadorInfo(id) {
  return jugadores.value.find(j => j.id === id);
}

function entrenadorTitulo(e) {
  if (e?.titulos?.length) return e.titulos.map(t => t.nombre).join(', ');
  return e?.PlantillaEntrenador?.rol || '—';
}

function addEntrenador(form) {
  if (!nuevoEntrenador.value) return;
  if (!form.ids_entrenadores) form.ids_entrenadores = [];
  if (!form.ids_entrenadores.includes(nuevoEntrenador.value)) {
    form.ids_entrenadores.push(nuevoEntrenador.value);
  }
  nuevoEntrenador.value = null;
}

function removeEntrenador(form, id) {
  form.ids_entrenadores = (form.ids_entrenadores || []).filter(i => i !== id);
}

function addDelegado(form) {
  if (!nuevoDelegado.value) return;
  if (!form.ids_delegados) form.ids_delegados = [];
  if (!form.ids_delegados.includes(nuevoDelegado.value)) {
    form.ids_delegados.push(nuevoDelegado.value);
  }
  nuevoDelegado.value = null;
}

function removeDelegado(form, id) {
  form.ids_delegados = (form.ids_delegados || []).filter(i => i !== id);
}

function addJugador(form) {
  if (!nuevoJugador.value) return;
  if (!form.jugadores) form.jugadores = [];
  if (!form.jugadores.some(j => j.id_jugador === nuevoJugador.value)) {
    form.jugadores.push({
      id_jugador: nuevoJugador.value,
      dorsal: nuevoDorsal.value ?? null,
      talla: nuevaTalla.value || null,
      promocion: false
    });
    if (nuevoDorsal.value != null) comprobarDorsalDuplicado(form, nuevoJugador.value, nuevoDorsal.value);
  }
  nuevoJugador.value = null;
  nuevoDorsal.value = null;
  nuevaTalla.value = null;
  keySelectJugador.value++;
  ordenarJugadores(form);
}

function ordenarJugadores(form) {
  if (!form.jugadores) return;
  const { campo, asc } = ordenJugadores.value;
  form.jugadores.sort((a, b) => {
    let cmp = 0;
    if (campo === 'nombre') {
      const na = jugadorInfo(a.id_jugador);
      const nb = jugadorInfo(b.id_jugador);
      const nombreA = na ? `${na.apellidos} ${na.nombre}` : '';
      const nombreB = nb ? `${nb.apellidos} ${nb.nombre}` : '';
      cmp = nombreA.localeCompare(nombreB, 'es');
    } else if (campo === 'dorsal') {
      cmp = (a.dorsal ?? 999) - (b.dorsal ?? 999);
    }
    return asc ? cmp : -cmp;
  });
}

function toggleOrdenJugadores(campo, form) {
  if (ordenJugadores.value.campo === campo) {
    ordenJugadores.value.asc = !ordenJugadores.value.asc;
  } else {
    ordenJugadores.value.campo = campo;
    ordenJugadores.value.asc = true;
  }
  ordenarJugadores(form);
}

function iconoOrden(campo) {
  if (ordenJugadores.value.campo !== campo) return 'pi pi-sort';
  return ordenJugadores.value.asc ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
}

function toggleOrdenDetalle(campo) {
  if (ordenJugadoresDetalle.value.campo === campo) {
    ordenJugadoresDetalle.value.asc = !ordenJugadoresDetalle.value.asc;
  } else {
    ordenJugadoresDetalle.value.campo = campo;
    ordenJugadoresDetalle.value.asc = true;
  }
}

function iconoOrdenDetalle(campo) {
  if (ordenJugadoresDetalle.value.campo !== campo) return 'pi pi-sort';
  return ordenJugadoresDetalle.value.asc ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
}

function jugadoresOrdenados(data) {
  const arr = [...(data.jugadores || [])];
  const { campo, asc } = ordenJugadoresDetalle.value;
  arr.sort((a, b) => {
    let cmp = 0;
    if (campo === 'nombre') {
      cmp = `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es');
    } else if (campo === 'dorsal') {
      cmp = (a.PlantillaJugador?.dorsal ?? 999) - (b.PlantillaJugador?.dorsal ?? 999);
    }
    return asc ? cmp : -cmp;
  });
  return arr;
}

function removeJugador(form, idJugador) {
  form.jugadores = (form.jugadores || []).filter(j => j.id_jugador !== idJugador);
}

function comprobarDorsalDuplicado(form, idJugadorActual, dorsal) {
  if (dorsal == null || dorsal === '') return;
  const duplicado = (form.jugadores || []).find(j => j.id_jugador !== idJugadorActual && j.dorsal === dorsal);
  if (duplicado) {
    const nombre = jugadorInfo(duplicado.id_jugador);
    const texto = nombre ? `${nombre.apellidos}, ${nombre.nombre} (nº ${dorsal})` : `nº ${dorsal}`;
    toast.add({ severity: 'warn', summary: 'Dorsal duplicado', detail: `El dorsal ${dorsal} ya está asignado a ${texto}.`, life: 5000 });
  }
}

function opcionesEntrenadorDisponibles(form) {
  const usados = new Set(form?.ids_entrenadores || []);
  return opcionesEntrenador.value.filter(o => !usados.has(o.value));
}

function opcionesDelegadoDisponibles(form) {
  const usados = new Set(form?.ids_delegados || []);
  return opcionesDelegado.value.filter(o => !usados.has(o.value));
}

function opcionesJugadorDisponibles(form) {
  const usados = new Set((form?.jugadores || []).map(j => j.id_jugador));
  return opcionesJugador.value.filter(o => !usados.has(o.value));
}

function validarPlantilla(form) {
  const dorsales = (form?.jugadores || []).map(j => j.dorsal).filter(d => d != null);
  const vistos = new Set();
  for (const d of dorsales) {
    if (vistos.has(d)) {
      return `El dorsal ${d} está duplicado en la plantilla.`;
    }
    vistos.add(d);
  }
  return null;
}
</script>

<template>
  <CrudDataTable
    ref="crudRef"
    title="Plantillas"
    :columns="columns"
    :service="plantillasService"
    :emptyItem="emptyItem"
    detailMaxWidth="max-w-4xl"
    formMaxWidth="max-w-4xl"
    :validateForm="validarPlantilla"
    :prepareEdit="prepareEdit"
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
      <span v-if="data.entrenadores?.length" v-html="data.entrenadores.map(e => `${e.apellidos}, ${e.nombre}`).join('<br>')"></span>
      <span v-else>—</span>
    </template>
    <template #cell-ids_delegados="{ data }">
      <span v-if="data.delegados?.length" v-html="data.delegados.map(d => `${d.apellidos}, ${d.nombre}`).join('<br>')"></span>
      <span v-else>—</span>
    </template>

    <template #form-extra="{ form }">
      <div class="space-y-4 pt-2">
        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Entrenadores</h3>
          <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-club-green/5">
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Foto</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Nombre</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Título</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="id in (form.ids_entrenadores || [])" :key="id">
                <td class="text-center border border-line p-2">
                  <img v-if="entrenadorInfo(id)?.foto" :src="entrenadorInfo(id).foto" alt="" class="w-10 h-10 object-cover rounded inline-block" />
                  <span v-else class="text-ink-tertiary">—</span>
                </td>
                <td class="text-center border border-line p-2 text-sm">{{ entrenadorInfo(id)?.apellidos }}, {{ entrenadorInfo(id)?.nombre }}</td>
                <td class="text-center border border-line p-2 text-sm">{{ entrenadorTitulo(entrenadorInfo(id)) }}</td>
                <td class="text-center border border-line p-2">
                  <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7" @click="removeEntrenador(form, id)" />
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select v-model="nuevoEntrenador" :options="opcionesEntrenadorDisponibles(form)" optionLabel="label" optionValue="value"
                    placeholder="Seleccionar entrenador" class="flex-1" filter showClear />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50" @click="addEntrenador(form)" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Delegados</h3>
          <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-club-green/5">
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Foto</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Nombre</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Tipo</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="id in (form.ids_delegados || [])" :key="id">
                <td class="text-center border border-line p-2">
                  <img v-if="delegadoInfo(id)?.foto" :src="delegadoInfo(id).foto" alt="" class="w-10 h-10 object-cover rounded inline-block" />
                  <span v-else class="text-ink-tertiary">—</span>
                </td>
                <td class="text-center border border-line p-2 text-sm">{{ delegadoInfo(id)?.apellidos }}, {{ delegadoInfo(id)?.nombre }}</td>
                <td class="text-center border border-line p-2 text-sm">{{ delegadoInfo(id)?.tipo || '—' }}</td>
                <td class="text-center border border-line p-2">
                  <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7" @click="removeDelegado(form, id)" />
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select v-model="nuevoDelegado" :options="opcionesDelegadoDisponibles(form)" optionLabel="label" optionValue="value"
                    placeholder="Seleccionar delegado" class="flex-1" filter showClear />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50" @click="addDelegado(form)" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores</h3>
          <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-club-green/5">
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Foto</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary cursor-pointer select-none hover:bg-club-green/10"
                    @click="toggleOrdenJugadores('nombre', form)">
                  <span class="inline-flex items-center gap-1">Nombre <i :class="['pi', iconoOrden('nombre'), 'text-[10px]']"></i></span>
                </th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary cursor-pointer select-none hover:bg-club-green/10"
                    @click="toggleOrdenJugadores('dorsal', form)">
                  <span class="inline-flex items-center gap-1">Dorsal <i :class="['pi', iconoOrden('dorsal'), 'text-[10px]']"></i></span>
                </th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Talla</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Promoción</th>
                <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="j in (form.jugadores || [])" :key="j.id_jugador">
                <td class="text-center border border-line p-2">
                  <img v-if="jugadorInfo(j.id_jugador)?.foto" :src="jugadorInfo(j.id_jugador).foto" alt="" class="w-10 h-10 object-cover rounded inline-block" />
                  <span v-else class="text-ink-tertiary">—</span>
                </td>
                <td class="text-center border border-line p-2 text-sm">{{ jugadorInfo(j.id_jugador)?.apellidos }}, {{ jugadorInfo(j.id_jugador)?.nombre }}</td>
                <td class="text-center border border-line p-2">
                  <div class="flex items-center justify-center gap-1">
                    <CamisetaDorsal :numero="j.dorsal" :size="50" />
                    <InputNumber v-model="j.dorsal" :min="0" :max="99" inputClass="!w-12 !text-center" class="!w-12"
                      @blur="comprobarDorsalDuplicado(form, j.id_jugador, j.dorsal)" />
                  </div>
                </td>
                <td class="text-center border border-line p-2">
                  <InputText v-model="j.talla" class="!w-16 !text-center" />
                </td>
                <td class="text-center border border-line p-2">
                  <Checkbox v-model="j.promocion" :binary="true" />
                </td>
                <td class="text-center border border-line p-2">
                  <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7" @click="removeJugador(form, j.id_jugador)" />
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <div class="flex gap-2 mt-2 items-center">
            <Select :key="keySelectJugador" v-model="nuevoJugador" :options="opcionesJugadorDisponibles(form)" optionLabel="label" optionValue="value"
                    placeholder="Seleccionar jugador" class="flex-1" filter showClear />
            <InputNumber v-model="nuevoDorsal" placeholder="Dorsal" :min="0" :max="99" class="w-20" inputClass="!w-20" />
            <InputText v-model="nuevaTalla" placeholder="Talla" class="w-20" />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50" @click="addJugador(form)" />
          </div>
        </div>
      </div>
    </template>

    <template #detail-extra="{ data }">
      <div class="overflow-x-auto">
      <table class="w-full border-collapse mb-6">
        <tr>
          <td class="text-center border border-line p-3 bg-club-green text-white">
            <div class="text-sm font-medium">Temporada</div>
          </td>
          <td class="text-center border border-line p-3 bg-club-green text-white">
            <div class="text-sm font-medium">Categoría</div>
          </td>
          <td class="text-center border border-line p-3 bg-club-green text-white">
            <div class="text-sm font-medium">División</div>
          </td>
        </tr>
        <tr>
          <td class="text-center border border-line p-3">
            <div class="text-sm text-ink-primary font-semibold">{{ data.temporada?.nombre || '—' }}</div>
          </td>
          <td class="text-center border border-line p-3">
            <div class="text-sm text-ink-primary font-semibold">{{ data.categoria?.nombre || '—' }}</div>
          </td>
          <td class="text-center border border-line p-3">
            <div class="text-sm text-ink-primary font-semibold">{{ data.division?.nombre || '—' }}</div>
          </td>
        </tr>
      </table>
      </div>

      <div v-if="data.entrenadores?.length" class="mb-6">
        <h3 class="text-sm font-semibold text-club-green mb-2">Entrenadores</h3>
        <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Foto</th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Nombre</th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Título</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in data.entrenadores" :key="e.id">
              <td class="text-center border border-line p-2">
                <img v-if="e.foto" :src="e.foto" alt="" class="w-10 h-10 object-cover rounded inline-block" />
                <span v-else class="text-ink-tertiary">—</span>
              </td>
              <td class="text-center border border-line p-2 text-sm">{{ e.apellidos }}, {{ e.nombre }}</td>
              <td class="text-center border border-line p-2 text-sm">{{ e.titulos?.map(t => t.nombre).join(', ') || e.PlantillaEntrenador?.rol || '—' }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <div v-if="data.delegados?.length" class="mb-6">
        <h3 class="text-sm font-semibold text-club-green mb-2">Delegados</h3>
        <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Foto</th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Nombre</th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in data.delegados" :key="d.id">
              <td class="text-center border border-line p-2">
                <img v-if="d.foto" :src="d.foto" alt="" class="w-10 h-10 object-cover rounded inline-block" />
                <span v-else class="text-ink-tertiary">—</span>
              </td>
              <td class="text-center border border-line p-2 text-sm">{{ d.apellidos }}, {{ d.nombre }}</td>
              <td class="text-center border border-line p-2 text-sm">{{ d.tipo || '—' }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <div v-if="data.jugadores?.length" class="mb-6">
        <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores</h3>
        <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-club-green/5">
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Foto</th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary cursor-pointer select-none hover:bg-club-green/10"
                  @click="toggleOrdenDetalle('nombre')">
                <span class="inline-flex items-center gap-1">Nombre <i :class="['pi', iconoOrdenDetalle('nombre'), 'text-[10px]']"></i></span>
              </th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary cursor-pointer select-none hover:bg-club-green/10"
                  @click="toggleOrdenDetalle('dorsal')">
                <span class="inline-flex items-center gap-1">Dorsal <i :class="['pi', iconoOrdenDetalle('dorsal'), 'text-[10px]']"></i></span>
              </th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Talla</th>
              <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Promoción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jugadoresOrdenados(data)" :key="j.id">
              <td class="text-center border border-line p-2">
                <img v-if="j.foto" :src="j.foto" alt="" class="w-10 h-10 object-cover rounded inline-block" />
                <span v-else class="text-ink-tertiary">—</span>
              </td>
              <td class="text-center border border-line p-2 text-sm">{{ j.apellidos }}, {{ j.nombre }}</td>
              <td class="text-center border border-line p-2">
                <CamisetaDorsal v-if="j.PlantillaJugador?.dorsal != null" :numero="j.PlantillaJugador.dorsal" :size="50" />
                <span v-else class="text-ink-tertiary">—</span>
              </td>
              <td class="text-center border border-line p-2 text-sm">{{ j.PlantillaJugador?.talla ?? '—' }}</td>
              <td class="text-center border border-line p-2 text-sm">
                <i v-if="j.PlantillaJugador?.promocion" class="pi pi-check-circle text-club-green" />
                <span v-else class="text-ink-tertiary">—</span>
              </td>
            </tr>
          </tbody>
        </table>
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