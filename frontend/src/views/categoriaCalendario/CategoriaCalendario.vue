<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import JornadasCalendario from '../../components/JornadasCalendario.vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import { categoriaCalendarioService, plantillasService, equiposService, jugadoresService, equiposJugadoresService } from '../../services';
import { suscribirseCambio } from '../../utils/cambioBus';

const PALMA_ID = 73;

const plantillas = ref([]);
const equipos = ref([]);
const jugadores = ref([]);
const equiposJugadores = ref([]);
let unsubCambio = null;

async function cargarOpciones() {
  const [plants, eqs, jugs, eqjugs] = await Promise.all([
    plantillasService.listar(),
    equiposService.listar(),
    jugadoresService.listar(),
    equiposJugadoresService.listar().catch(() => [])
  ]);
  plantillas.value = plants;
  equipos.value = eqs;
  jugadores.value = jugs;
  equiposJugadores.value = eqjugs;
}

onMounted(async () => {
  await cargarOpciones();
  unsubCambio = suscribirseCambio(cargarOpciones);
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

function jugadorInfo(id) {
  return jugadores.value.find(j => j.id === id);
}

const columns = computed(() => [
  { field: 'id_plantilla', header: 'Plantilla', type: 'select', options: opcionesPlantilla.value, required: true, enDetalle: false },
  { field: 'id_equipo_local', header: 'Equipo Local', type: 'select', options: opcionesEquipo.value, required: true, enDetalle: false },
  { field: 'id_equipo_visitante', header: 'Equipo Visitante', type: 'select', options: opcionesEquipo.value, required: true, enDetalle: false },
  { field: 'jornada', header: 'Jornada', type: 'number', required: true, enDetalle: false },
  { field: 'fecha', header: 'Fecha', type: 'date', required: true, enDetalle: false },
  { field: 'hora', header: 'Hora', type: 'text', required: false, enDetalle: false },
  { field: 'incidencias', header: 'Incidencias', type: 'textarea', required: false, enDetalle: false, enTabla: false },
  { field: 'observaciones', header: 'Observaciones', type: 'textarea', required: false, enDetalle: false, enTabla: false }
]);

const emptyItem = {
  id_plantilla: null, id_equipo_local: null, id_equipo_visitante: null,
  jornada: null, fecha: null, hora: null, incidencias: '', observaciones: '',
  jugadores_local: [], jugadores_visitante: []
};

function prepareEdit(item) {
  const local = [];
  const visitante = [];
  (item.jornadaJugadores || []).forEach(jj => {
    const entrada = {
      id_jugador: jj.id_jugador ?? null,
      id_equipo_jugador: jj.id_equipo_jugador ?? null,
      tarjeta_amarilla: jj.tarjeta_amarilla || 0,
      tarjeta_roja: jj.tarjeta_roja || 0,
      goles: jj.goles || 0
    };
    if (jj.es_local) local.push(entrada);
    else visitante.push(entrada);
  });
  return { jugadores_local: local, jugadores_visitante: visitante };
}

function nombrePlantilla(id) {
  const p = plantillas.value.find(pl => pl.id === id);
  return p ? `${p.categoria?.nombre || '—'} / ${p.temporada?.nombre || '—'}` : '—';
}

function nombreEquipo(id) {
  return equipos.value.find(e => e.id === id)?.nombre || '—';
}

function formatDate(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fechaYHora(data) {
  const fecha = formatDate(data?.fecha);
  if (!data?.hora) return fecha;
  const hh = String(data.hora).slice(0, 5);
  return `${fecha} · ${hh}`;
}

function jugadoresEquipo(data, esLocal) {
  return (data?.jornadaJugadores || [])
    .filter(jj => Boolean(jj.es_local) === Boolean(esLocal))
    .sort((a, b) => nombreJugadorDetalle(a).localeCompare(nombreJugadorDetalle(b), 'es'));
}

function golesEquipo(data, esLocal) {
  return jugadoresEquipo(data, esLocal).reduce((acc, jj) => acc + (jj.goles || 0), 0);
}

function nombreJugadorDetalle(jj) {
  if (jj?.jugador) return `${jj.jugador.apellidos}, ${jj.jugador.nombre}`;
  if (jj?.equipoJugador) return `${jj.equipoJugador.apellidos}, ${jj.equipoJugador.nombre}`;
  return '—';
}

const nuevoJugadorLocal = ref(null);
const nuevoJugadorVisitante = ref(null);
const keySelectLocal = ref(0);
const keySelectVisitante = ref(0);

/** Jugadores de una plantilla (para el lado PALMA). */
function plantillaJugadores(form) {
  const p = plantillas.value.find(pl => pl.id === form?.id_plantilla);
  return (p?.jugadores || []).map(j => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos }));
}

/** Opciones de jugadores de un lado según su equipo: PALMA -> plantilla, resto -> equipos_jugadores. */
function jugadoresEquipoDe(form, lado) {
  const idEquipo = lado === 'local' ? form?.id_equipo_local : form?.id_equipo_visitante;
  if (Number(idEquipo) === PALMA_ID) {
    return plantillaJugadores(form)
      .map(j => ({ label: `${j.apellidos}, ${j.nombre}`, value: j.id, tipo: 'jugador' }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  return equiposJugadores.value
    .filter(ej => Number(ej.id_equipo) === Number(idEquipo))
    .map(ej => ({ label: `${ej.apellidos}, ${ej.nombre}`, value: ej.id, tipo: 'equipo_jugador' }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function valorJugador(j) {
  return j?.id_jugador ?? j?.id_equipo_jugador ?? null;
}

function opcionesJugadorLocalDisponibles(form) {
  const usados = new Set((form?.jugadores_local || []).map(valorJugador));
  return jugadoresEquipoDe(form, 'local').filter(o => !usados.has(o.value));
}

function opcionesJugadorVisitanteDisponibles(form) {
  const usados = new Set((form?.jugadores_visitante || []).map(valorJugador));
  return jugadoresEquipoDe(form, 'visitante').filter(o => !usados.has(o.value));
}

function addJugador(form, lado) {
  const nuevo = lado === 'local' ? nuevoJugadorLocal.value : nuevoJugadorVisitante.value;
  if (!nuevo) return;
  const opt = jugadoresEquipoDe(form, lado).find(o => o.value === nuevo);
  if (!opt) return;
  const campo = lado === 'local' ? 'jugadores_local' : 'jugadores_visitante';
  if (!form[campo]) form[campo] = [];
  if (!form[campo].some(j => valorJugador(j) === opt.value)) {
    const entrada = { tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0 };
    if (opt.tipo === 'jugador') entrada.id_jugador = opt.value;
    else entrada.id_equipo_jugador = opt.value;
    form[campo].push(entrada);
  }
  if (lado === 'local') {
    nuevoJugadorLocal.value = null;
    keySelectLocal.value++;
  } else {
    nuevoJugadorVisitante.value = null;
    keySelectVisitante.value++;
  }
}

function addJugadorLocal(form) {
  addJugador(form, 'local');
}

function addJugadorVisitante(form) {
  addJugador(form, 'visitante');
}

function removeJugador(form, lado, valor) {
  const campo = lado === 'local' ? 'jugadores_local' : 'jugadores_visitante';
  form[campo] = (form[campo] || []).filter(j => valorJugador(j) !== valor);
}

/** Nombre legible de un jugador añadido en el formulario. */
function nombreJugadorEnForm(form, entry) {
  if (entry?.id_jugador) {
    const dePlantilla = plantillaJugadores(form).find(j => j.id === entry.id_jugador);
    if (dePlantilla) return `${dePlantilla.apellidos}, ${dePlantilla.nombre}`;
    const j = jugadorInfo(entry.id_jugador);
    return j ? `${j.apellidos}, ${j.nombre}` : '—';
  }
  if (entry?.id_equipo_jugador) {
    const ej = equiposJugadores.value.find(e => e.id === entry.id_equipo_jugador);
    return ej ? `${ej.apellidos}, ${ej.nombre}` : '—';
  }
  return '—';
}
</script>

<template>
  <div>
    <JornadasCalendario />

    <CrudDataTable
    title="Jornadas"
    :columns="columns"
    :service="categoriaCalendarioService"
    :emptyItem="emptyItem"
    :prepareEdit="prepareEdit"
    formMaxWidth="max-w-4xl"
    detailMaxWidth="max-w-4xl"
    :canExport="true"
  >
    <template #cell-id_plantilla="{ data }">
      {{ data.plantilla ? (data.plantilla.categoria?.nombre + ' / ' + data.plantilla.temporada?.nombre) : nombrePlantilla(data.id_plantilla) }}
    </template>
    <template #cell-id_equipo_local="{ data }">
      {{ data.equipoLocal?.nombre || nombreEquipo(data.id_equipo_local) }}
    </template>
    <template #cell-id_equipo_visitante="{ data }">
      {{ data.equipoVisitante?.nombre || nombreEquipo(data.id_equipo_visitante) }}
    </template>
    <template #cell-fecha="{ data }">
      {{ formatDate(data.fecha) }}
    </template>
    <template #detail-id_plantilla="{ data }">
      {{ data.plantilla ? (data.plantilla.categoria?.nombre + ' / ' + data.plantilla.temporada?.nombre) : nombrePlantilla(data.id_plantilla) }}
    </template>
    <template #detail-id_equipo_local="{ data }">
      {{ data.equipoLocal?.nombre || nombreEquipo(data.id_equipo_local) }}
    </template>
    <template #detail-id_equipo_visitante="{ data }">
      {{ data.equipoVisitante?.nombre || nombreEquipo(data.id_equipo_visitante) }}
    </template>
    <template #detail-fecha="{ data }">
      {{ formatDate(data.fecha) }}
    </template>

    <template #detail-extra="{ data }">
      <div class="space-y-4">
        <div class="overflow-x-auto space-y-4">
          <table class="w-full table-fixed border-collapse">
            <tr class="bg-club-green text-white">
              <th class="border border-line p-2 text-sm font-medium">Temporada</th>
              <th class="border border-line p-2 text-sm font-medium">Categoría</th>
              <th class="border border-line p-2 text-sm font-medium">Fecha y Hora</th>
              <th class="border border-line p-2 text-sm font-medium">Jornada</th>
            </tr>
            <tr>
              <td class="border border-line p-2 text-center text-sm">{{ data.plantilla?.temporada?.nombre || '—' }}</td>
              <td class="border border-line p-2 text-center text-sm">{{ data.plantilla?.categoria?.nombre || '—' }}</td>
              <td class="border border-line p-2 text-center text-sm">{{ fechaYHora(data) }}</td>
              <td class="border border-line p-2 text-center text-sm">{{ data.jornada }}</td>
            </tr>
          </table>

          <table class="w-full table-fixed border-collapse">
            <tr class="bg-club-green text-white">
              <th class="border border-line p-2 text-sm font-medium">Equipo Local</th>
              <th class="border border-line p-2 text-sm font-medium">Equipo Visitante</th>
            </tr>
            <tr>
              <td class="border border-line p-2 text-center text-sm font-semibold">{{ data.equipoLocal?.nombre || '—' }}</td>
              <td class="border border-line p-2 text-center text-sm font-semibold">{{ data.equipoVisitante?.nombre || '—' }}</td>
            </tr>
            <tr>
              <td class="border border-line p-2 text-center">
                <img :src="data.equipoLocal?.escudo || '/escudo.png'" alt="Escudo" class="w-14 h-14 object-contain inline-block" />
              </td>
              <td class="border border-line p-2 text-center">
                <img :src="data.equipoVisitante?.escudo || '/escudo.png'" alt="Escudo" class="w-14 h-14 object-contain inline-block" />
              </td>
            </tr>
            <tr>
              <td class="border border-line p-2 text-center text-lg font-bold text-club-green">{{ golesEquipo(data, true) }}</td>
              <td class="border border-line p-2 text-center text-lg font-bold text-club-green">{{ golesEquipo(data, false) }}</td>
            </tr>
          </table>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores Equipo Local</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="jj in jugadoresEquipo(data, true)" :key="jj.id_jugador || jj.id_equipo_jugador">
                  <td class="border border-line p-2 text-sm">{{ nombreJugadorDetalle(jj) }}</td>
                  <td class="text-center border border-line p-2 text-sm">{{ jj.tarjeta_amarilla }}</td>
                  <td class="text-center border border-line p-2 text-sm">{{ jj.tarjeta_roja }}</td>
                  <td class="text-center border border-line p-2 text-sm">{{ jj.goles }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!jugadoresEquipo(data, true).length" class="text-sm text-ink-tertiary mt-1">Sin jugadores registrados.</p>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores Equipo Visitante</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="jj in jugadoresEquipo(data, false)" :key="jj.id_jugador || jj.id_equipo_jugador">
                  <td class="border border-line p-2 text-sm">{{ nombreJugadorDetalle(jj) }}</td>
                  <td class="text-center border border-line p-2 text-sm">{{ jj.tarjeta_amarilla }}</td>
                  <td class="text-center border border-line p-2 text-sm">{{ jj.tarjeta_roja }}</td>
                  <td class="text-center border border-line p-2 text-sm">{{ jj.goles }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!jugadoresEquipo(data, false).length" class="text-sm text-ink-tertiary mt-1">Sin jugadores registrados.</p>
        </div>
      </div>
    </template>

    <template #form-extra="{ form }">
      <div class="space-y-4 pt-2">
        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores Equipo Local</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in (form.jugadores_local || [])" :key="valorJugador(j)">
                  <td class="text-center border border-line p-2 text-sm">{{ nombreJugadorEnForm(form, j) }}</td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_amarilla" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_roja" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.goles" :min="0" :max="99" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                            @click="removeJugador(form, 'local', valorJugador(j))" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select :key="keySelectLocal" v-model="nuevoJugadorLocal" :options="opcionesJugadorLocalDisponibles(form)"
                    optionLabel="label" optionValue="value" placeholder="Seleccionar jugador local"
                    class="flex-1" filter showClear />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                    @click="addJugadorLocal(form)" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-club-green mb-2">Jugadores Equipo Visitante</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-club-green/5">
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
                  <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in (form.jugadores_visitante || [])" :key="valorJugador(j)">
                  <td class="text-center border border-line p-2 text-sm">{{ nombreJugadorEnForm(form, j) }}</td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_amarilla" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.tarjeta_roja" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <InputNumber v-model="j.goles" :min="0" :max="99" class="!w-20" inputClass="!w-20 !text-center" />
                  </td>
                  <td class="text-center border border-line p-2">
                    <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7"
                            @click="removeJugador(form, 'visitante', valorJugador(j))" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select :key="keySelectVisitante" v-model="nuevoJugadorVisitante" :options="opcionesJugadorVisitanteDisponibles(form)"
                    optionLabel="label" optionValue="value" placeholder="Seleccionar jugador visitante"
                    class="flex-1" filter showClear />
            <Button label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                    @click="addJugadorVisitante(form)" />
          </div>
        </div>
      </div>
    </template>
  </CrudDataTable>
  </div>
</template>
