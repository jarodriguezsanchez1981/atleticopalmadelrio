<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import InputMask from 'primevue/inputmask';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { estiloTabla } from '../../utils/estiloTabla';
import { torneosGeneradosService, categoriasService, equiposService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../../utils/cambioBus';
import { generarCategoria, CAMPOS, nombreCampo, esHoraValida } from '../../utils/generarTorneo';
import { descargarPdfTorneo } from '../../utils/pdfGenerarTorneo';

// Sección "Generar Torneo" (apartado Club): torneos de Fútbol 7 del club. Cada
// categoría es un torneo independiente; los partidos se calculan con
// utils/generarTorneo.js (no se guardan) y se descargan en PDF.

const FUTBOL_7 = 1;
const DURACION_POR_DEFECTO = 20;
const FORMATOS = [
  { label: 'Todos contra todos', value: 'liga' },
  { label: 'Por grupos', value: 'grupos' }
];
const GRUPOS = ['A', 'B'];
const NOMBRE_FASE = { grupos: 'Fase de grupos', semifinales: 'Semifinales', finales: 'Finales' };
const BOTON_PRINCIPAL = '!bg-club-garnet !border-club-garnet hover:!bg-club-garnetLight hover:!border-club-garnetLight';

const toast = useToast();
const confirm = useConfirm();
const auth = useAuthStore();
const puedeEditar = () => auth.puedeVer('generar_torneo') && auth.puedeEditar('generar_torneo');

const torneos = ref([]);
const cargando = ref(false);
const categorias = ref([]);
const equipos = ref([]);
const descargando = ref(null);

const dialogoVisible = ref(false);
const guardando = ref(false);
const pestana = ref(null);
const form = reactive({ id: null, nombre: '', fecha: null, observaciones: '', categorias: [] });
const idsCategorias = ref([]);

const categoriasF7 = computed(() =>
  categorias.value
    .filter((c) => Number(c.id_tipofutbol) === FUTBOL_7)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

// ---- Conversión de fechas entre el formulario (Date) y la API ('AAAA-MM-DD'); las horas van como texto 'HH:MM' ----
const dos = (n) => String(n).padStart(2, '0');
const aTextoFecha = (d) => (d instanceof Date ? `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` : '');
const hhmm = (texto) => (texto ? String(texto).slice(0, 5) : '');
function aDateFecha(texto) {
  if (!texto) return null;
  const [a, m, d] = String(texto).slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}
const formatearFecha = (texto) => {
  const d = aDateFecha(texto);
  return d ? `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
};

function nuevaCategoria(cat) {
  return {
    id_categoria: cat.id,
    nombreCategoria: cat.nombre,
    hora_inicio: '09:00',
    hora_fin: '',
    duracion_min: Number(cat.tiempopartido) || DURACION_POR_DEFECTO,
    descanso_min: 0,
    campos: [],
    formato: 'grupos',
    semifinales: false,
    final_oro: false,
    final_plata: false,
    equipos: [],
    equipoNuevo: null
  };
}

// Al cambiar la selección de categorías, añade o quita sus paneles.
watch(idsCategorias, (ids) => {
  const actuales = form.categorias.filter((c) => ids.includes(c.id_categoria));
  for (const id of ids) {
    if (!actuales.some((c) => c.id_categoria === id)) {
      const cat = categoriasF7.value.find((c) => c.id === id);
      if (cat) actuales.push(nuevaCategoria(cat));
    }
  }
  form.categorias = ids.map((id) => actuales.find((c) => c.id_categoria === id)).filter(Boolean);
  if (!form.categorias.some((c) => c.id_categoria === pestana.value)) pestana.value = form.categorias[0]?.id_categoria ?? null;
});

/** Categoría tal y como la espera la API (y generarCategoria). */
function aPayloadCategoria(cat) {
  const liga = cat.formato === 'liga';
  return {
    id_categoria: cat.id_categoria,
    hora_inicio: cat.hora_inicio,
    hora_fin: cat.hora_fin || null,
    duracion_min: cat.duracion_min,
    descanso_min: cat.descanso_min || 0,
    campos: [...cat.campos],
    formato: cat.formato,
    semifinales: !liga && cat.semifinales,
    final_oro: cat.final_oro,
    final_plata: cat.final_plata,
    equipos: cat.equipos.map((e) => ({ id_equipo: e.id_equipo, nombre: e.nombre.trim(), grupo: liga ? null : e.grupo }))
  };
}

function anadirEquipo(cat) {
  const equipo = equipos.value.find((e) => e.id === cat.equipoNuevo);
  if (!equipo) return;
  // Si el equipo ya está (p. ej. un segundo equipo del PALMA), se numera el nombre.
  let nombre = equipo.nombre;
  let n = 2;
  const usados = new Set(cat.equipos.map((e) => e.nombre.trim().toLowerCase()));
  while (usados.has(nombre.toLowerCase())) nombre = `${equipo.nombre} ${n++}`;
  const enA = cat.equipos.filter((e) => e.grupo === 'A').length;
  const enB = cat.equipos.filter((e) => e.grupo === 'B').length;
  cat.equipos.push({ id_equipo: equipo.id, nombre, grupo: enA <= enB ? 'A' : 'B' });
  cat.equipoNuevo = null;
}

function quitarEquipo(cat, i) {
  cat.equipos.splice(i, 1);
}

// ---- Vista previa ----
function vistaPrevia(cat) {
  if (cat.equipos.length < 2 || !cat.campos.length || !(cat.duracion_min > 0)) return null;
  if (!esHoraValida(cat.hora_inicio) || (cat.hora_fin && !esHoraValida(cat.hora_fin))) return null;
  return generarCategoria(aPayloadCategoria(cat));
}

function camposOrdenados(cat) {
  return CAMPOS.map((c) => c.clave).filter((c) => cat.campos.includes(c));
}

function textoPartido(p) {
  const cruce = `${p.local} – ${p.visitante}`;
  if (p.etiqueta) return `${p.etiqueta}: ${cruce}`;
  return p.grupo ? `${cruce} (${p.grupo})` : cruce;
}

function nombreFase(cat, fase) {
  return cat.formato === 'liga' && fase === 'grupos' ? 'Todos contra todos' : NOMBRE_FASE[fase];
}

// ---- Carga ----
async function cargar() {
  cargando.value = true;
  try {
    torneos.value = await torneosGeneradosService.listar();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudieron cargar los torneos.', life: 5000 });
  } finally {
    cargando.value = false;
  }
}

async function cargarCatalogos() {
  try {
    const [cats, eqs] = await Promise.all([categoriasService.listar(), equiposService.listar({ basico: 1 })]);
    categorias.value = cats;
    equipos.value = [...eqs].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las categorías o los equipos.', life: 5000 });
  }
}

function nuevoTorneo() {
  Object.assign(form, { id: null, nombre: '', fecha: null, observaciones: '', categorias: [] });
  idsCategorias.value = [];
  pestana.value = null;
  dialogoVisible.value = true;
}

async function editarTorneo(item) {
  try {
    const t = await torneosGeneradosService.obtener(item.id);
    const cats = (t.categorias || []).map((c) => ({
      id_categoria: c.id_categoria,
      nombreCategoria: c.categoria?.nombre || '',
      hora_inicio: hhmm(c.hora_inicio),
      hora_fin: hhmm(c.hora_fin),
      duracion_min: c.duracion_min,
      descanso_min: c.descanso_min,
      campos: [...(c.campos || [])],
      formato: c.formato,
      semifinales: !!c.semifinales,
      final_oro: !!c.final_oro,
      final_plata: !!c.final_plata,
      equipos: (c.equipos || []).map((e) => ({ id_equipo: e.id_equipo, nombre: e.nombre, grupo: e.grupo || 'A' })),
      equipoNuevo: null
    }));
    Object.assign(form, { id: t.id, nombre: t.nombre, fecha: aDateFecha(t.fecha), observaciones: t.observaciones || '', categorias: cats });
    idsCategorias.value = cats.map((c) => c.id_categoria);
    pestana.value = cats[0]?.id_categoria ?? null;
    dialogoVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo abrir el torneo.', life: 5000 });
  }
}

async function guardar() {
  guardando.value = true;
  const payload = {
    nombre: form.nombre,
    fecha: aTextoFecha(form.fecha),
    observaciones: form.observaciones,
    categorias: form.categorias.map(aPayloadCategoria)
  };
  try {
    if (form.id) await torneosGeneradosService.actualizar(form.id, payload);
    else await torneosGeneradosService.crear(payload);
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Torneo guardado.', life: 3000 });
    dialogoVisible.value = false;
    await cargar();
    emitirCambio();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo guardar', detail: err.response?.data?.message || 'Revisa los datos del torneo.', life: 6000 });
  } finally {
    guardando.value = false;
  }
}

async function descargarPdf(item) {
  descargando.value = item.id;
  try {
    const t = await torneosGeneradosService.obtener(item.id);
    await descargarPdfTorneo(t);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo generar el PDF.', life: 5000 });
  } finally {
    descargando.value = null;
  }
}

function confirmarEliminar(item) {
  confirm.require({
    message: `¿Seguro que quieres eliminar el torneo «${item.nombre}»? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await torneosGeneradosService.eliminar(item.id);
        toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Torneo eliminado.', life: 3000 });
        await cargar();
        emitirCambio();
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo eliminar el torneo.', life: 5000 });
      }
    }
  });
}

let quitarSuscripcion = null;
onMounted(() => {
  cargar();
  cargarCatalogos();
  quitarSuscripcion = suscribirseCambio(cargar);
});
onBeforeUnmount(() => { if (quitarSuscripcion) quitarSuscripcion(); });
</script>

<template>
<SectionGuard seccion="generar_torneo">
  <div class="flex flex-col gap-4">
    <ConfirmDialog />
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="font-display text-xl text-club-green">Generar Torneo</h1>
      <Button v-if="puedeEditar()" label="Nuevo torneo" icon="pi pi-plus" :class="BOTON_PRINCIPAL" @click="nuevoTorneo" />
    </div>

    <DataTable v-bind="estiloTabla" class="ar-dt-compacta" :value="torneos" :loading="cargando" paginator :rows="15"
               responsiveLayout="scroll">
      <Column field="nombre" header="Nombre" />
      <Column header="Fecha">
        <template #body="{ data }">{{ formatearFecha(data.fecha) }}</template>
      </Column>
      <Column header="Categorías">
        <template #body="{ data }">{{ (data.categorias || []).map((c) => c.categoria?.nombre).filter(Boolean).join(', ') || '—' }}</template>
      </Column>
      <Column header="Acciones" style="width: 150px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-file-pdf" text rounded size="small" class="!text-club-green"
                    v-tooltip.top="'Descargar PDF'" aria-label="Descargar PDF" :loading="descargando === data.id"
                    @click="descargarPdf(data)" />
            <Button icon="pi pi-pencil" text rounded size="small" class="!text-club-green"
                    v-tooltip.top="'Editar'" aria-label="Editar" :disabled="!puedeEditar()" @click="editarTorneo(data)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                    v-tooltip.top="'Eliminar'" aria-label="Eliminar" :disabled="!puedeEditar()" @click="confirmarEliminar(data)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center text-ink-tertiary py-6">No hay torneos generados.</div>
      </template>
    </DataTable>

    <Dialog v-model:visible="dialogoVisible" modal :header="form.id ? 'Editar torneo' : 'Nuevo torneo'"
            class="w-[96vw] max-w-5xl" :breakpoints="{ '767px': '100vw' }">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-medium text-ink-secondary">Nombre del torneo</label>
            <InputText v-model="form.nombre" placeholder="Torneo de Navidad 2026" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-ink-secondary">Fecha</label>
            <DatePicker v-model="form.fecha" dateFormat="dd/mm/yy" showIcon />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-3">
            <label class="text-sm font-medium text-ink-secondary">Categorías (Fútbol 7)</label>
            <MultiSelect v-model="idsCategorias" :options="categoriasF7" optionLabel="nombre" optionValue="id"
                         placeholder="Elige una o varias categorías" display="chip" class="w-full" />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-3">
            <label class="text-sm font-medium text-ink-secondary">Observaciones</label>
            <Textarea v-model="form.observaciones" rows="2" autoResize />
          </div>
        </div>

        <Tabs v-if="form.categorias.length" v-model:value="pestana" scrollable>
          <TabList>
            <Tab v-for="cat in form.categorias" :key="cat.id_categoria" :value="cat.id_categoria">{{ cat.nombreCategoria }}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel v-for="cat in form.categorias" :key="cat.id_categoria" :value="cat.id_categoria">
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-ink-secondary">Hora de comienzo</label>
                    <InputMask v-model="cat.hora_inicio" mask="99:99" placeholder="HH:MM" :invalid="!esHoraValida(cat.hora_inicio)" />
                    <small v-if="!esHoraValida(cat.hora_inicio)" class="text-red-600">Escribe la hora como HH:MM</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-ink-secondary">Hora de final</label>
                    <InputMask v-model="cat.hora_fin" mask="99:99" placeholder="HH:MM" :invalid="!!cat.hora_fin && !esHoraValida(cat.hora_fin)" />
                    <small v-if="cat.hora_fin && !esHoraValida(cat.hora_fin)" class="text-red-600">Escribe la hora como HH:MM</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-ink-secondary">Duración (min)</label>
                    <InputNumber v-model="cat.duracion_min" :min="1" :max="120" showButtons />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-ink-secondary">Descanso (min)</label>
                    <InputNumber v-model="cat.descanso_min" :min="0" :max="60" showButtons />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-ink-secondary">Campos</label>
                    <MultiSelect v-model="cat.campos" :options="CAMPOS" optionLabel="nombre" optionValue="clave"
                                 placeholder="Elige los campos" display="chip" class="w-full" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-ink-secondary">Formato</label>
                    <SelectButton v-model="cat.formato" :options="FORMATOS" optionLabel="label" optionValue="value" :allowEmpty="false" />
                  </div>
                </div>

                <div class="flex flex-wrap gap-5">
                  <label v-if="cat.formato === 'grupos'" class="flex items-center gap-2 text-sm">
                    <Checkbox v-model="cat.semifinales" binary /> Semifinales
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <Checkbox v-model="cat.final_oro" binary /> Final de Oro
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <Checkbox v-model="cat.final_plata" binary /> Final de Plata
                  </label>
                </div>
                <p v-if="cat.semifinales || cat.final_oro || cat.final_plata" class="text-xs text-ink-tertiary -mt-2">
                  Antes de las semifinales y antes de las finales hay 10 minutos de descanso.
                </p>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-ink-secondary">Equipos</label>
                  <div class="flex gap-2">
                    <Select v-model="cat.equipoNuevo" :options="equipos" optionLabel="nombre" optionValue="id" filter
                            placeholder="Busca un equipo" class="flex-1 min-w-0" />
                    <Button label="Añadir" icon="pi pi-plus" :class="BOTON_PRINCIPAL" :disabled="!cat.equipoNuevo"
                            @click="anadirEquipo(cat)" />
                  </div>
                  <p v-if="!cat.equipos.length" class="text-sm text-ink-tertiary">Todavía no hay equipos.</p>
                  <div v-for="(e, i) in cat.equipos" :key="i" class="flex items-center gap-2">
                    <InputText v-model="e.nombre" class="flex-1 min-w-0" aria-label="Nombre en el torneo" />
                    <SelectButton v-if="cat.formato === 'grupos'" v-model="e.grupo" :options="GRUPOS" :allowEmpty="false"
                                  aria-label="Grupo" />
                    <Button icon="pi pi-times" text rounded severity="danger" aria-label="Quitar equipo" @click="quitarEquipo(cat, i)" />
                  </div>
                  <p v-if="cat.formato === 'grupos' && cat.equipos.length" class="text-xs text-ink-tertiary">
                    Grupo A: {{ cat.equipos.filter((e) => e.grupo === 'A').length }} equipos ·
                    Grupo B: {{ cat.equipos.filter((e) => e.grupo === 'B').length }} equipos
                  </p>
                </div>

                <div v-if="vistaPrevia(cat)" class="flex flex-col gap-2">
                  <h3 class="font-display text-base text-club-green">Vista previa del horario</h3>
                  <Message v-if="vistaPrevia(cat).excedeHoraFin" severity="warn" :closable="false">
                    Los partidos acaban a las {{ vistaPrevia(cat).horaFinReal }}, después de la hora de final.
                  </Message>
                  <div class="overflow-x-auto rounded-lg border border-line">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="bg-club-green text-white">
                          <th class="text-left px-3 py-2 w-16">Hora</th>
                          <th v-for="c in camposOrdenados(cat)" :key="c" class="text-left px-3 py-2">{{ nombreCampo(c) }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <template v-for="(t, n) in vistaPrevia(cat).turnos" :key="n">
                          <tr v-if="n === 0 || vistaPrevia(cat).turnos[n - 1].fase !== t.fase">
                            <td :colspan="camposOrdenados(cat).length + 1" class="bg-club-greenPale text-club-green font-semibold px-3 py-1">
                              {{ nombreFase(cat, t.fase) }}
                            </td>
                          </tr>
                          <tr v-if="!t.partidos.length" class="border-t border-line">
                            <td class="px-3 py-1.5 font-semibold">{{ t.hora }}</td>
                            <td :colspan="camposOrdenados(cat).length" class="px-3 py-1.5 text-ink-tertiary italic">
                              Descanso (nadie puede jugar dos turnos seguidos)
                            </td>
                          </tr>
                          <tr v-else class="border-t border-line odd:bg-white even:bg-club-rowAlt">
                            <td class="px-3 py-1.5 font-semibold">{{ t.hora }}</td>
                            <td v-for="c in camposOrdenados(cat)" :key="c" class="px-3 py-1.5 whitespace-nowrap"
                                :class="{ 'text-club-gold font-semibold': t.partidos.find((p) => p.campo === c)?.etiqueta === 'ORO',
                                          'text-club-silver font-semibold': t.partidos.find((p) => p.campo === c)?.etiqueta === 'PLATA' }">
                              {{ t.partidos.find((p) => p.campo === c) ? textoPartido(t.partidos.find((p) => p.campo === c)) : '' }}
                            </td>
                          </tr>
                        </template>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="dialogoVisible = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="guardando" :class="BOTON_PRINCIPAL" @click="guardar" />
      </template>
    </Dialog>
  </div>
</SectionGuard>
</template>
