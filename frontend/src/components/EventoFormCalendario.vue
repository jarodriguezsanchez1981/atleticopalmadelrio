<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
  entrenamientosService, partidosService, plantillasService,
  lugaresService, equiposService, calendarioService, temporadasService,
  jugadoresService, equiposJugadoresService
} from '../services';
import { filtrarPlantillasTemporadaActual } from '../utils/temporadaActual';

const PALMA_ID = 73;

const props = defineProps({
  visible: { type: Boolean, default: false },
  tipo: { type: String, default: 'entrenamiento', validator: (v) => v === 'entrenamiento' || v === 'partido' },
  registroId: { type: [Number, String], default: null },
  fechaDefecto: { type: [String, Date], default: null }
});

const emit = defineEmits(['update:visible', 'saved']);

const toast = useToast();
const confirm = useConfirm();

const NOMBRE_PALMA = 'PALMA DEL RIO ATLETICO C.F.';

const plantillas = ref([]);
const temporadas = ref([]);
const lugares = ref([]);
const equipos = ref([]);
const jugadores = ref([]);
const equiposJugadores = ref([]);
const cargandoCatalogo = ref(false);
const guardando = ref(false);
const importandoActa = ref(false);

const form = ref({});
const partidosDelDia = ref([]);
const entrenamientosDelDia = ref([]);
/** Si el entrenamiento cargado pertenece a una serie semanal recurrente
 * (tal y como estaba antes de tocarlo), para preguntar al guardar si el
 * cambio se aplica solo a este día o a toda la serie de esta plantilla. */
const esSerieRecurrente = ref(false);
/** Si ya se ha indicado explícitamente una hora para el partido (no basta con
 * el valor por defecto al elegir solo el día, que se muestra a medianoche). */
const horaPartidoTocada = ref(false);

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
  } else {
    const dia = claveDia(form.value?.fecha);
    const todos = await partidosService.listar();
    partidosDelDia.value = todos.filter((p) =>
      dia && diaDePartido(p) === dia && String(p.id) !== String(props.registroId || '')
    );
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
    id_equipo_local: null,
    id_equipo_visitante: null,
    incidencias: '',
    jornada: null,
    resultado: '',
    codigo_acta: '',
    codigo_primaria: '',
    jugadores_local: [],
    jugadores_visitante: []
  };
  horaPartidoTocada.value = false;
  esSerieRecurrente.value = false;
}

async function cargarCatalogo() {
  cargandoCatalogo.value = true;
  try {
    const promesas = [plantillasService.listar(), temporadasService.listar(), lugaresService.listar()];
    if (props.tipo === 'partido') {
      promesas.push(equiposService.listar(), jugadoresService.listar(), equiposJugadoresService.listar().catch(() => []));
    }
    const [pls, temps, lugs, eqs, jugs, eqjugs] = await Promise.all(promesas);
    plantillas.value = pls;
    temporadas.value = temps;
    lugares.value = lugs;
    if (eqs) equipos.value = eqs;
    if (jugs) jugadores.value = jugs;
    if (eqjugs) equiposJugadores.value = eqjugs;
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
    const jugadoresLocal = [];
    const jugadoresVisitante = [];
    (item.partidoJugadores || []).forEach((pj) => {
      const entrada = {
        id_jugador: pj.id_jugador ?? null,
        id_equipo_jugador: pj.id_equipo_jugador ?? null,
        tarjeta_amarilla: pj.tarjeta_amarilla || 0,
        tarjeta_roja: pj.tarjeta_roja || 0,
        goles: pj.goles || 0
      };
      if (pj.es_local) jugadoresLocal.push(entrada);
      else jugadoresVisitante.push(entrada);
    });
    form.value = {
      id_plantilla: item.id_plantilla ?? item.plantilla?.id ?? null,
      fecha: item.fecha ? new Date(item.fecha) : null,
      id_lugar: item.id_lugar ?? item.lugar?.id ?? null,
      hasta: item.hasta ? new Date(item.hasta) : null,
      id_equipo_local: item.id_equipo_local ?? item.equipoLocal?.id ?? null,
      id_equipo_visitante: item.id_equipo_visitante ?? item.equipoVisitante?.id ?? null,
      incidencias: item.incidencias || '',
      jornada: item.jornada ?? null,
      resultado: item.resultado || '',
      codigo_acta: item.codigo_acta || '',
      codigo_primaria: item.codigo_primaria || '',
      jugadores_local: jugadoresLocal,
      jugadores_visitante: jugadoresVisitante
    };
    if (props.tipo === 'partido') horaPartidoTocada.value = true;
    esSerieRecurrente.value = props.tipo === 'entrenamiento' && !!item.recurrente && !!item.hasta;
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
    if (props.tipo === 'partido' && !props.registroId && !horaEstablecida.value) {
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

const plantillasTemporadaActual = computed(() => filtrarPlantillasTemporadaActual(plantillas.value, temporadas.value));

const opcionesPlantilla = computed(() => {
  if (props.tipo === 'entrenamiento') {
    const ocupadas = new Set(
      entrenamientosDelDia.value.map((e) => e.id_plantilla ?? e.plantilla?.id ?? null).filter(Boolean)
    );
    return plantillasTemporadaActual.value
      .filter((p) => !ocupadas.has(p.id))
      .map((p) => ({ label: `${p.categoria?.nombre || 'Plantilla'} · ${p.temporada?.nombre || ''}`, value: p.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  if (props.tipo !== 'partido') {
    return plantillasTemporadaActual.value
      .map((p) => ({ label: `${p.categoria?.nombre || 'Plantilla'} · ${p.temporada?.nombre || ''}`, value: p.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  const ocupadasHoy = new Set(
    partidosDelDia.value.map((p) => p.id_plantilla ?? p.plantilla?.id ?? null).filter(Boolean)
  );
  return plantillasTemporadaActual.value
    .filter((p) => !ocupadasHoy.has(p.id))
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

  const ocupados = props.tipo === 'entrenamiento' ? lugaresOcupadosEntrenamiento.value : lugaresOcupadosPartido.value;
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

/** Hora del partido establecida (no basta con haber elegido solo el día). */
const horaEstablecida = computed(() => {
  if (props.tipo !== 'partido') return true;
  return !!form.value.fecha && horaPartidoTocada.value;
});

/** Lugares con otro partido que se solaparía en el tiempo según categoria.tiempopartido. */
const lugaresOcupadosPartido = computed(() => {
  const set = new Set();
  if (props.tipo !== 'partido' || !horaEstablecida.value || !form.value.fecha) return set;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return set;
  const fin = inicio.getTime() + duracionPlantilla(form.value.id_plantilla) * 60000;
  partidosDelDia.value.forEach((p) => {
    const pLugar = p.id_lugar ?? p.lugar?.id ?? null;
    if (pLugar == null) return;
    const pInicio = new Date(p.fecha).getTime();
    if (Number.isNaN(pInicio)) return;
    const pFin = pInicio + ((p.plantilla?.categoria?.tiempopartido) || 90) * 60000;
    if (inicio.getTime() < pFin && pInicio < fin) set.add(pLugar);
  });
  return set;
});

const opcionesEquipo = computed(() =>
  equipos.value
    .map((e) => ({ label: e.nombre, value: e.id, escudo: e.escudo || null }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
);

const equipoLocalSeleccionado = computed(() =>
  equipos.value.find((e) => e.id === form.value.id_equipo_local)
);

const esEquipoLocalPalma = computed(() =>
  equipoLocalSeleccionado.value?.nombre === NOMBRE_PALMA
);

const esEquipoVisitantePalma = computed(() =>
  Number(form.value.id_equipo_visitante) === PALMA_ID
);

const plantillaSeleccionada = computed(() =>
  plantillas.value.find((p) => p.id === form.value.id_plantilla)
);

/** Los jugadores del equipo rival (no PALMA) solo se pueden ver/convocar en la
 * plantilla Senior A de la temporada 2026/2027; en el resto solo se gestionan
 * los del PALMA DEL RIO ATLETICO C.F. */
const permiteJugadoresRival = computed(() =>
  plantillaSeleccionada.value?.categoria?.nombre === 'Senior A' &&
  plantillaSeleccionada.value?.temporada?.nombre === '2026/2027'
);

const mostrarJugadoresLocal = computed(() => esEquipoLocalPalma.value || permiteJugadoresRival.value);
const mostrarJugadoresVisitante = computed(() => esEquipoVisitantePalma.value || permiteJugadoresRival.value);

const ubicacionEquipoLocal = computed(() => {
  const eq = equipoLocalSeleccionado.value;
  if (!eq) return '';
  return [eq.direccion, eq.localidad, eq.provincia].filter(Boolean).join(', ');
});

function duracionPlantilla(idPl) {
  const pl = plantillas.value.find((p) => p.id === idPl);
  return (pl?.categoria?.tiempopartido) || 90;
}

function partidoEnConflicto() {
  if (props.tipo !== 'partido' || !esEquipoLocalPalma.value || form.value.id_lugar == null || !form.value.fecha) return null;
  const inicio = form.value.fecha instanceof Date ? form.value.fecha : new Date(form.value.fecha);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = inicio.getTime() + duracionPlantilla(form.value.id_plantilla) * 60000;
  return partidosDelDia.value.find((p) => {
    const pLugar = p.id_lugar ?? p.lugar?.id ?? null;
    if (pLugar == null) return false;
    if (String(pLugar) !== String(form.value.id_lugar)) return false;
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
  return `En esa fecha y hora hay otro partido planificado (${cat}, ${formatHora(p.fecha)}).`;
}

function nombrePlantilla(idPl) {
  return plantillas.value.find((p) => p.id === idPl)?.categoria?.nombre || '?';
}

// ---------- Jugadores convocados (solo tipo 'partido') ----------
const nuevoJugadorLocal = ref(null);
const nuevoJugadorVisitante = ref(null);
const keySelectJugadorLocal = ref(0);
const keySelectJugadorVisitante = ref(0);

function jugadorInfo(id) {
  return jugadores.value.find((j) => j.id === id);
}

/** Jugadores de una plantilla (para el lado PALMA). */
function plantillaJugadores() {
  const p = plantillas.value.find((pl) => pl.id === form.value.id_plantilla);
  return (p?.jugadores || []).map((j) => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos }));
}

/** Opciones de jugadores de un lado según su equipo: PALMA -> plantilla, resto -> equipos_jugadores. */
function jugadoresEquipoDe(lado) {
  const idEquipo = lado === 'local' ? form.value.id_equipo_local : form.value.id_equipo_visitante;
  if (Number(idEquipo) === PALMA_ID) {
    return plantillaJugadores()
      .map((j) => ({ label: `${j.nombre} ${j.apellidos}`, value: j.id, tipo: 'jugador' }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
  return equiposJugadores.value
    .filter((ej) => Number(ej.id_equipo) === Number(idEquipo))
    .map((ej) => ({ label: `${ej.nombre} ${ej.apellidos}`, value: ej.id, tipo: 'equipo_jugador' }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function valorJugadorConvocado(j) {
  return j?.id_jugador ?? j?.id_equipo_jugador ?? null;
}

const opcionesJugadorLocalDisponibles = computed(() => {
  const usados = new Set((form.value.jugadores_local || []).map(valorJugadorConvocado));
  return jugadoresEquipoDe('local').filter((o) => !usados.has(o.value));
});

const opcionesJugadorVisitanteDisponibles = computed(() => {
  const usados = new Set((form.value.jugadores_visitante || []).map(valorJugadorConvocado));
  return jugadoresEquipoDe('visitante').filter((o) => !usados.has(o.value));
});

function addJugadorConvocado(lado) {
  const nuevo = lado === 'local' ? nuevoJugadorLocal.value : nuevoJugadorVisitante.value;
  if (!nuevo) return;
  const opt = jugadoresEquipoDe(lado).find((o) => o.value === nuevo);
  if (!opt) return;
  const campo = lado === 'local' ? 'jugadores_local' : 'jugadores_visitante';
  if (!form.value[campo]) form.value[campo] = [];
  if (!form.value[campo].some((j) => valorJugadorConvocado(j) === opt.value)) {
    const entrada = { tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0 };
    if (opt.tipo === 'jugador') entrada.id_jugador = opt.value;
    else entrada.id_equipo_jugador = opt.value;
    form.value[campo].push(entrada);
  }
  if (lado === 'local') {
    nuevoJugadorLocal.value = null;
    keySelectJugadorLocal.value++;
  } else {
    nuevoJugadorVisitante.value = null;
    keySelectJugadorVisitante.value++;
  }
}

function removeJugadorConvocado(lado, valor) {
  const campo = lado === 'local' ? 'jugadores_local' : 'jugadores_visitante';
  form.value[campo] = (form.value[campo] || []).filter((j) => valorJugadorConvocado(j) !== valor);
}

/** Nombre legible de un jugador añadido en el formulario. */
function nombreJugadorConvocado(entry) {
  if (entry?.id_jugador) {
    const dePlantilla = plantillaJugadores().find((j) => j.id === entry.id_jugador);
    if (dePlantilla) return `${dePlantilla.nombre} ${dePlantilla.apellidos}`;
    const j = jugadorInfo(entry.id_jugador);
    return j ? `${j.nombre} ${j.apellidos}` : '—';
  }
  if (entry?.id_equipo_jugador) {
    const ej = equiposJugadores.value.find((e) => e.id === entry.id_equipo_jugador);
    return ej ? `${ej.nombre} ${ej.apellidos}` : '—';
  }
  return '—';
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
  if (campo === 'fecha' && props.tipo === 'partido') horaPartidoTocada.value = true;
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
  if (props.tipo === 'partido' && (!form.value.id_equipo_local || !form.value.id_equipo_visitante)) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El equipo local y el equipo visitante son obligatorios.', life: 4000 });
    return false;
  }
  if (props.tipo === 'partido' && form.value.id_equipo_local === form.value.id_equipo_visitante) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El equipo local y el visitante no pueden ser el mismo.', life: 4000 });
    return false;
  }
  if (props.tipo === 'partido' && esEquipoLocalPalma.value && !form.value.id_lugar) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'El lugar es obligatorio cuando el equipo local es PALMA DEL RIO ATLETICO C.F.', life: 4000 });
    return false;
  }
  const conflicto = props.tipo === 'partido' ? partidoEnConflicto() : null;
  if (conflicto) {
    toast.add({
      severity: 'error',
      summary: 'Partido planificado',
      detail: `En esa fecha y hora hay otro partido planificado (${conflicto.plantilla?.categoria?.nombre || nombrePlantilla(conflicto.id_plantilla)}, ${formatHora(conflicto.fecha)}).`,
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
  return true;
}

function guardar() {
  if (!validar()) return;
  // Si es un entrenamiento existente que pertenece a una serie semanal,
  // preguntar si el cambio se aplica solo a este día o a todos los
  // entrenamientos de esta plantilla antes de guardar nada.
  if (props.tipo === 'entrenamiento' && props.registroId && esSerieRecurrente.value) {
    confirm.require({
      message: 'Este entrenamiento forma parte de una serie semanal para esta plantilla. ¿Aplicar el cambio solo a este día o a todos los entrenamientos de esta plantilla?',
      header: 'Entrenamiento recurrente',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Todos los eventos de esta plantilla',
      rejectLabel: 'Solo este día',
      accept: () => guardarConAlcance('serie'),
      reject: () => guardarConAlcance('dia')
    });
    return;
  }
  guardarConAlcance('dia');
}

async function guardarConAlcance(alcance) {
  guardando.value = true;
  try {
    const payload = {
      id_plantilla: form.value.id_plantilla,
      fecha: form.value.fecha.toISOString()
    };
    if (props.tipo === 'entrenamiento') {
      payload.id_lugar = form.value.id_lugar;
      payload.hasta = form.value.hasta ? form.value.hasta.toISOString() : null;
      payload.recurrente = !!form.value.hasta;
      payload.alcance = alcance;
    } else {
      payload.id_equipo_local = form.value.id_equipo_local;
      payload.id_equipo_visitante = form.value.id_equipo_visitante;
      payload.id_lugar = esEquipoLocalPalma.value ? form.value.id_lugar : null;
      payload.incidencias = form.value.incidencias;
      payload.jornada = form.value.jornada || null;
      payload.resultado = form.value.resultado || null;
      payload.codigo_acta = form.value.codigo_acta || null;
      payload.codigo_primaria = form.value.codigo_primaria || null;
      payload.jugadores_local = mostrarJugadoresLocal.value ? (form.value.jugadores_local || []) : [];
      payload.jugadores_visitante = mostrarJugadoresVisitante.value ? (form.value.jugadores_visitante || []) : [];
    }
    const service = props.tipo === 'entrenamiento' ? entrenamientosService : partidosService;
    let resultado;
    if (props.registroId) {
      resultado = await service.actualizar(props.registroId, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.', life: 3000 });
    } else {
      resultado = await service.crear(payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Registro creado correctamente.', life: 3000 });
    }
    if (props.tipo === 'entrenamiento' && resultado?.generados > 1) {
      let detalle = `Se han generado ${resultado.generados} entrenamientos semanales.`;
      if (resultado.omitidos?.length) {
        detalle += ` ${resultado.omitidos.length} semana(s) omitida(s) por tener ya otro evento.`;
      }
      toast.add({ severity: 'info', summary: 'Entrenamientos recurrentes', detail: detalle, life: 6000 });
    }
    if (props.tipo === 'entrenamiento' && resultado?.propagados > 0) {
      toast.add({
        severity: 'info',
        summary: 'Serie actualizada',
        detail: `El lugar se ha actualizado también en ${resultado.propagados} sesión(es) más de esta serie.`,
        life: 6000
      });
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

/** Pide al backend que lea el acta oficial de RFAF y actualice los goles y
 * tarjetas de los jugadores del PALMA convocados a este partido en
 * partido_jugadores. Solo tiene sentido sobre un partido ya existente.
 * Si se pasa `html`, el backend lo usa directamente en vez de intentar
 * descargarlo (RFAF exige sesión iniciada para ver el acta, así que la
 * descarga automática normalmente falla; el archivo HTML guardado a mano
 * desde un navegador con sesión es la vía que sí funciona). */
async function importarActa(html) {
  if (!props.registroId) return;
  if (!html && (!form.value.codigo_acta || !form.value.codigo_primaria)) {
    toast.add({
      severity: 'warn',
      summary: 'Faltan códigos',
      detail: 'Indica el código de acta y el código de primaria antes de importar.',
      life: 4000
    });
    return;
  }
  importandoActa.value = true;
  try {
    const resultado = await partidosService.importarActa(props.registroId, {
      codigo_acta: form.value.codigo_acta || undefined,
      codigo_primaria: form.value.codigo_primaria || undefined,
      html: html || undefined
    });
    const nActualizados = resultado.actualizados?.length || 0;
    const nNoEncontrados = resultado.noEncontrados?.length || 0;
    toast.add({
      severity: nActualizados ? 'success' : 'warn',
      summary: 'Acta importada',
      detail: nNoEncontrados
        ? `${nActualizados} jugador(es) actualizados. Sin encontrar en la plantilla: ${resultado.noEncontrados.join(', ')}.`
        : `${nActualizados} jugador(es) actualizados con sus goles y tarjetas.`,
      life: 8000
    });
    await cargarRegistro();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo importar el acta.',
      life: 6000
    });
  } finally {
    importandoActa.value = false;
  }
}

const inputHtmlActa = ref();
function abrirSelectorHtmlActa() {
  inputHtmlActa.value?.click();
}
function onHtmlActaSeleccionado(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => importarActa(e.target.result);
  reader.onerror = () => {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo leer el archivo.', life: 4000 });
  };
  reader.readAsText(file, 'utf-8');
}
</script>

<template>
  <Dialog :visible="visible" modal :class="tipo === 'partido' ? 'w-full max-w-4xl' : 'w-full max-w-lg'" @update:visible="cerrar">
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
                class="w-full" placeholder="Busca una plantilla"
                showClear filter :loading="cargandoCatalogo" />
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
          <label class="text-sm font-medium text-ink-secondary">Equipo local <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_equipo_local" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Busca un equipo local"
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
          <label class="text-sm font-medium text-ink-secondary">Equipo visitante <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_equipo_visitante" :options="opcionesEquipo" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Busca un equipo visitante"
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

        <div v-if="esEquipoLocalPalma" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Lugar <span class="text-club-garnet">*</span></label>
          <Select v-model="form.id_lugar" :options="opcionesLugar" optionLabel="label" optionValue="value"
                  class="w-full" placeholder="Selecciona un lugar"
                  showClear :loading="cargandoCatalogo" :disabled="!horaEstablecida" />
          <p v-if="!horaEstablecida" class="text-xs text-ink-tertiary">
            Indica la hora del partido para poder elegir el lugar.
          </p>
          <p v-else-if="textoConflicto()" class="flex items-center gap-1.5 text-xs text-club-garnet">
            <i class="pi pi-exclamation-circle"></i> {{ textoConflicto() }}
          </p>
        </div>
        <div v-else-if="equipoLocalSeleccionado" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Ubicación</label>
          <div class="text-sm text-ink-secondary bg-club-cream/50 rounded-md px-3 py-2 border border-line">
            <template v-if="ubicacionEquipoLocal">{{ ubicacionEquipoLocal }}</template>
            <span v-else class="text-ink-tertiary">Sin ubicación registrada</span>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Jornada</label>
          <InputNumber v-model="form.jornada" :min="1" :minFractionDigits="0" :maxFractionDigits="0"
                       placeholder="Vacío = amistoso" class="w-full" inputClass="w-full" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Resultado</label>
          <InputText v-model="form.resultado" placeholder="2-1" class="w-full" />
        </div>

        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <label class="text-sm font-medium text-ink-secondary">Acta RFAF</label>
          <div class="flex flex-col sm:flex-row gap-2">
            <InputText v-model="form.codigo_acta" placeholder="Código de acta (CodActa)" class="w-full sm:flex-1" />
            <InputText v-model="form.codigo_primaria" placeholder="Código de primaria" class="w-full sm:flex-1" />
          </div>
          <div v-if="registroId" class="flex flex-col sm:flex-row gap-2">
            <Button type="button" label="Importar acta RFAF" icon="pi pi-cloud-download"
                    outlined :loading="importandoActa" class="!text-club-green !border-club-green/50 whitespace-nowrap"
                    @click="importarActa()" />
            <Button type="button" label="Importar desde archivo HTML" icon="pi pi-upload"
                    outlined :loading="importandoActa" class="!text-club-green !border-club-green/50 whitespace-nowrap"
                    @click="abrirSelectorHtmlActa" />
            <input ref="inputHtmlActa" type="file" accept=".html,.htm" class="hidden" @change="onHtmlActaSeleccionado" />
          </div>
          <p class="text-xs text-ink-tertiary">
            Trae de RFAF los goles y tarjetas de los jugadores del PALMA convocados a este partido.
            RFAF suele exigir sesión iniciada para ver el acta: si "Importar acta RFAF" falla, guarda la
            página del acta desde tu navegador (con tu sesión de RFAF abierta) como HTML e impórtala con
            el segundo botón.
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Incidencias</label>
          <Textarea v-model="form.incidencias" rows="3" class="w-full" />
        </div>

        <div v-if="mostrarJugadoresLocal">
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
                <tr v-for="j in (form.jugadores_local || [])" :key="valorJugadorConvocado(j)">
                  <td class="text-center border border-line p-2 text-sm">{{ nombreJugadorConvocado(j) }}</td>
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
                            @click="removeJugadorConvocado('local', valorJugadorConvocado(j))" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select :key="keySelectJugadorLocal" v-model="nuevoJugadorLocal" :options="opcionesJugadorLocalDisponibles"
                    optionLabel="label" optionValue="value" placeholder="Seleccionar jugador local"
                    class="flex-1" filter showClear />
            <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                    @click="addJugadorConvocado('local')" />
          </div>
        </div>

        <div v-if="mostrarJugadoresVisitante">
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
                <tr v-for="j in (form.jugadores_visitante || [])" :key="valorJugadorConvocado(j)">
                  <td class="text-center border border-line p-2 text-sm">{{ nombreJugadorConvocado(j) }}</td>
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
                            @click="removeJugadorConvocado('visitante', valorJugadorConvocado(j))" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-2">
            <Select :key="keySelectJugadorVisitante" v-model="nuevoJugadorVisitante" :options="opcionesJugadorVisitanteDisponibles"
                    optionLabel="label" optionValue="value" placeholder="Seleccionar jugador visitante"
                    class="flex-1" filter showClear />
            <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
                    @click="addJugadorConvocado('visitante')" />
          </div>
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
