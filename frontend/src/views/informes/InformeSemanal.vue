<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { informeSemanalService, informeSancionesService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { estiloTabla } from '../../utils/estiloTabla';
import { formatFecha, formatFechaCorta } from '../../utils/formatFecha';
import { emitirCambio } from '../../utils/cambioBus';
import { opcionesFinDeSemana } from '../../utils/informeSemanal';

/** Informes → Semanal y Informes → Sanciones (`tipo`): vista previa del email
 * que sale solo los lunes a las 10:00 (si hubo jornada) con los partidos del
 * fin de semana, destinatarios (elegidos entre los usuarios con email), envío
 * manual e historial de envíos. En local el envío está desactivado (lo decide
 * el backend). */
const props = defineProps({
  tipo: { type: String, default: 'semanal' }
});
const INFORMES = {
  semanal: {
    seccion: 'informe_semanal',
    titulo: 'Informe Semanal',
    servicio: informeSemanalService,
    descripcion: 'Email con los partidos del fin de semana (viernes a domingo) de cada categoría: escudos, resultado, goles y tarjetas por minuto y puesto del PALMA en la clasificación, en Fútbol 7 y Fútbol 11.'
  },
  sanciones: {
    seccion: 'informe_sanciones',
    titulo: 'Informe de Sanciones',
    servicio: informeSancionesService,
    descripcion: 'Email de las categorías de Fútbol 11: las tarjetas del partido del fin de semana (viernes a domingo) por minuto y, debajo, la tabla de sanciones de la temporada de cada plantilla (amarillas, rojas y total por jugador, partidos de liga).'
  }
};
const config = computed(() => INFORMES[props.tipo] || INFORMES.semanal);
const BOTON_PRINCIPAL = '!bg-club-garnet !border-club-garnet hover:!bg-club-garnetLight hover:!border-club-garnetLight';

const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

const vista = ref(null);
const lunes = ref(null);
const opciones = ref([]);
const historial = ref([]);
const cargando = ref(false);
const enviando = ref(false);
const error = ref('');
// Destinatarios: la lista guardada se ve entera; se añaden de uno en uno con el
// selector (solo los usuarios con email que aún no están) y se quitan con su
// botón. Cada cambio se guarda al momento.
const usuarioNuevo = ref(null);
const guardandoDestinatarios = ref(false);
const opcionesUsuarios = computed(() => {
  const yaEstan = new Set((vista.value?.destinatarios || []).map((d) => d.id));
  return (vista.value?.usuarios || []).filter((u) => !yaEstan.has(u.id))
    .map((u) => ({ value: u.id, label: `${u.nombre} <${u.email}>` }));
});

const puedeEditar = computed(() => auth.puedeEditar(config.value.seccion));
const motivoSinEnvio = computed(() => {
  if (!vista.value) return '';
  if (!vista.value.puedeEnviar) return 'En local no se envían emails: solo desde el servidor.';
  if (!vista.value.hayJornada) return 'Ese fin de semana no hubo jornada.';
  if (!puedeEditar.value) return 'No tienes permiso para enviar el informe.';
  if (!vista.value.destinatarios.length) return 'Añade al menos un destinatario.';
  return '';
});

async function cargarVista(valor) {
  cargando.value = true;
  error.value = '';
  try {
    vista.value = await config.value.servicio.vista(valor);
    lunes.value = vista.value.lunes;
    usuarioNuevo.value = null;
    // La primera vez, el selector parte del último lunes que da el backend.
    if (!opciones.value.length) opciones.value = opcionesFinDeSemana(vista.value.lunes);
  } catch (err) {
    vista.value = null;
    error.value = err.response?.data?.message || 'No se pudo cargar el informe.';
  } finally {
    cargando.value = false;
  }
}

async function cargarHistorial() {
  try {
    historial.value = await config.value.servicio.historial();
  } catch {
    historial.value = [];
  }
}

async function guardarDestinatarios(ids, mensaje) {
  guardandoDestinatarios.value = true;
  try {
    const lista = await config.value.servicio.guardarDestinatarios(ids);
    vista.value = { ...vista.value, destinatarios: lista };
    usuarioNuevo.value = null;
    toast.add({ severity: 'success', summary: 'Guardado', detail: mensaje, life: 3000 });
    emitirCambio();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudieron guardar los destinatarios.', life: 5000 });
  } finally {
    guardandoDestinatarios.value = false;
  }
}

function anadirDestinatario() {
  const usuario = vista.value.usuarios.find((u) => u.id === usuarioNuevo.value);
  if (!usuario) return;
  guardarDestinatarios([...vista.value.destinatarios.map((d) => d.id), usuario.id], `${usuario.nombre} añadido a los destinatarios.`);
}

function quitarDestinatario(destinatario) {
  guardarDestinatarios(vista.value.destinatarios.filter((d) => d.id !== destinatario.id).map((d) => d.id),
    `${destinatario.nombre} quitado de los destinatarios.`);
}

function pedirEnvio() {
  confirm.require({
    header: `Enviar ${config.value.titulo.toLowerCase()}`,
    message: `Se enviará el informe del ${opciones.value.find((o) => o.value === lunes.value)?.label.toLowerCase() || 'fin de semana elegido'} a ${vista.value.destinatarios.map((d) => d.nombre).join(', ')}. ¿Enviarlo ahora?`,
    icon: 'pi pi-envelope',
    acceptLabel: 'Enviar',
    rejectLabel: 'Cancelar',
    rejectClass: 'p-button-secondary',
    accept: enviar
  });
}

async function enviar() {
  enviando.value = true;
  try {
    const fila = await config.value.servicio.enviar(lunes.value);
    if (fila.correcto) toast.add({ severity: 'success', summary: 'Enviado', detail: `${config.value.titulo} enviado.`, life: 4000 });
    else toast.add({ severity: 'error', summary: 'No se pudo enviar', detail: fila.error || 'Error al enviar el email.', life: 6000 });
    emitirCambio();
    await cargarHistorial();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo enviar el informe.', life: 6000 });
  } finally {
    enviando.value = false;
  }
}

// Semanal y Sanciones comparten componente: al pasar de uno a otro se recarga.
watch(() => props.tipo, async () => {
  opciones.value = [];
  await Promise.all([cargarVista(), cargarHistorial()]);
});

onMounted(async () => {
  await Promise.all([cargarVista(), cargarHistorial()]);
});
</script>

<template>
<SectionGuard :seccion="config.seccion">
  <div class="flex flex-col gap-4">
    <ConfirmDialog />
    <div>
      <h1 class="font-display text-xl text-club-green">{{ config.titulo }}</h1>
      <p class="text-sm text-ink-tertiary">
        {{ config.descripcion }} Sale solo cada lunes a las 10:00 si ese fin de semana hubo jornada (y no se había
        enviado ya).
      </p>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1">
        <label for="fin-de-semana" class="text-sm font-medium text-ink-secondary">Fin de semana</label>
        <Select inputId="fin-de-semana" v-model="lunes" :options="opciones" optionLabel="label" optionValue="value"
                class="w-72" :disabled="cargando" @change="cargarVista(lunes)" />
      </div>
      <span :title="motivoSinEnvio" class="sm:ml-auto">
        <Button label="Enviar ahora" icon="pi pi-send" :class="BOTON_PRINCIPAL" :loading="enviando"
                :disabled="cargando || !!motivoSinEnvio" @click="pedirEnvio" />
      </span>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-sm text-red-700">{{ error }}</div>

    <template v-if="vista">
      <div class="bg-white rounded-xl border border-line p-4 text-sm flex flex-col gap-2">
        <div><span class="font-medium text-ink-secondary">De:</span> {{ vista.remitente }}</div>
        <div class="flex flex-col gap-1">
          <span class="font-medium text-ink-secondary">Para:</span>
          <ul v-if="vista.destinatarios.length" class="flex flex-col gap-1">
            <li v-for="d in vista.destinatarios" :key="d.id"
                class="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5">
              <span><span class="font-medium">{{ d.nombre }}</span> <span class="text-ink-tertiary">&lt;{{ d.email }}&gt;</span></span>
              <Button v-if="puedeEditar" icon="pi pi-times" severity="secondary" text rounded size="small"
                      :aria-label="`Quitar a ${d.nombre}`" title="Quitar de los destinatarios"
                      :disabled="guardandoDestinatarios" @click="quitarDestinatario(d)" />
            </li>
          </ul>
          <p v-else class="text-ink-tertiary">Todavía no hay destinatarios: añade al menos uno para que se envíe.</p>
          <div v-if="puedeEditar" class="flex flex-wrap items-center gap-2 mt-1">
            <Select inputId="destinatario-nuevo" v-model="usuarioNuevo" :options="opcionesUsuarios" optionLabel="label"
                    optionValue="value" filter placeholder="Elige un usuario con email" class="w-full sm:w-[28rem]"
                    :emptyMessage="'No quedan usuarios con email por añadir'" />
            <Button label="Añadir" icon="pi pi-plus" :class="BOTON_PRINCIPAL" :loading="guardandoDestinatarios"
                    :disabled="!usuarioNuevo" @click="anadirDestinatario" />
          </div>
          <p class="text-xs text-ink-tertiary">
            El envío automático de los lunes va a estos destinatarios. Solo se pueden añadir usuarios activos con email
            (se pone en Administración → Usuarios).
          </p>
        </div>
        <div><span class="font-medium text-ink-secondary">Asunto:</span> {{ vista.asunto }}</div>
        <p v-if="motivoSinEnvio" class="text-xs text-ink-tertiary mt-1">{{ motivoSinEnvio }}</p>
      </div>
      <!-- El HTML lo genera el backend con todos los textos de la BD escapados. -->
      <div class="bg-white rounded-xl border border-line p-4 overflow-x-auto" :class="{ 'opacity-60': cargando }"
           v-html="vista.html" />
    </template>

    <div class="flex flex-col gap-2">
      <h2 class="font-display text-base text-ink-secondary">Historial de envíos</h2>
      <DataTable v-bind="estiloTabla" :value="historial" dataKey="id" class="ar-dt-compacta" paginator :rows="10">
        <template #empty>
          <div class="py-6 text-center text-sm text-ink-tertiary">Todavía no se ha enviado ningún informe.</div>
        </template>
        <Column header="Fecha">
          <template #body="{ data }">{{ formatFecha(data.created_at || data.createdAt) }}</template>
        </Column>
        <Column header="Fin de semana">
          <template #body="{ data }">
            {{ opcionesFinDeSemana(data.lunes, 1)[0]?.label.replace('Fin de semana del ', '') || formatFechaCorta(data.lunes) }}
          </template>
        </Column>
        <Column header="Tipo">
          <template #body="{ data }">{{ data.automatico ? 'Automático' : 'Manual' }}</template>
        </Column>
        <Column header="Usuario">
          <template #body="{ data }">{{ data.usuario?.nombre || '—' }}</template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag v-if="data.correcto" severity="success" value="Correcto" />
            <span v-else class="inline-flex items-center gap-2">
              <Tag severity="danger" value="Error" />
              <span class="text-xs text-ink-tertiary">{{ data.error }}</span>
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</SectionGuard>
</template>
