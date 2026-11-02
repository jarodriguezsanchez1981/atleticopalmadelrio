<script setup>
import { ref, computed, onMounted } from 'vue';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { informeSemanalService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { estiloTabla } from '../../utils/estiloTabla';
import { formatFecha, formatFechaCorta } from '../../utils/formatFecha';
import { emitirCambio } from '../../utils/cambioBus';
import { opcionesFinDeSemana } from '../../utils/informeSemanal';

/** Informes → Semanal: vista previa del email que sale solo los lunes a las
 * 10:00 (si hubo jornada) con los partidos del fin de semana, destinatarios
 * (elegidos entre los usuarios con email), envío manual e historial de envíos.
 * En local el envío está desactivado (lo decide el backend). */
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
// Destinatarios: ids elegidos en el selector y los guardados (para saber si hay cambios).
const idsDestinatarios = ref([]);
const idsGuardados = ref([]);
const guardandoDestinatarios = ref(false);
const hayCambiosDestinatarios = computed(() =>
  [...idsDestinatarios.value].sort().join(',') !== [...idsGuardados.value].sort().join(','));
const opcionesUsuarios = computed(() => (vista.value?.usuarios || [])
  .map((u) => ({ value: u.id, label: `${u.nombre} <${u.email}>` })));

const puedeEditar = computed(() => auth.puedeEditar('informe_semanal'));
const motivoSinEnvio = computed(() => {
  if (!vista.value) return '';
  if (!vista.value.puedeEnviar) return 'En local no se envían emails: solo desde el servidor.';
  if (!vista.value.hayJornada) return 'Ese fin de semana no hubo jornada.';
  if (!puedeEditar.value) return 'No tienes permiso para enviar el informe.';
  if (!vista.value.destinatarios.length) return 'Elige al menos un destinatario y guárdalo.';
  if (hayCambiosDestinatarios.value) return 'Guarda los destinatarios antes de enviar.';
  return '';
});

async function cargarVista(valor) {
  cargando.value = true;
  error.value = '';
  try {
    vista.value = await informeSemanalService.vista(valor);
    lunes.value = vista.value.lunes;
    idsGuardados.value = vista.value.destinatarios.map((d) => d.id);
    idsDestinatarios.value = [...idsGuardados.value];
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
    historial.value = await informeSemanalService.historial();
  } catch {
    historial.value = [];
  }
}

async function guardarDestinatarios() {
  guardandoDestinatarios.value = true;
  try {
    const lista = await informeSemanalService.guardarDestinatarios(idsDestinatarios.value);
    vista.value = { ...vista.value, destinatarios: lista };
    idsGuardados.value = lista.map((d) => d.id);
    idsDestinatarios.value = [...idsGuardados.value];
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Destinatarios del informe semanal guardados.', life: 3000 });
    emitirCambio();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudieron guardar los destinatarios.', life: 5000 });
  } finally {
    guardandoDestinatarios.value = false;
  }
}

function pedirEnvio() {
  confirm.require({
    header: 'Enviar informe semanal',
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
    const fila = await informeSemanalService.enviar(lunes.value);
    if (fila.correcto) toast.add({ severity: 'success', summary: 'Enviado', detail: 'Informe semanal enviado.', life: 4000 });
    else toast.add({ severity: 'error', summary: 'No se pudo enviar', detail: fila.error || 'Error al enviar el email.', life: 6000 });
    emitirCambio();
    await cargarHistorial();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'No se pudo enviar el informe.', life: 6000 });
  } finally {
    enviando.value = false;
  }
}

onMounted(async () => {
  await Promise.all([cargarVista(), cargarHistorial()]);
});
</script>

<template>
<SectionGuard seccion="informe_semanal">
  <div class="flex flex-col gap-4">
    <ConfirmDialog />
    <div>
      <h1 class="font-display text-xl text-club-green">Informe Semanal</h1>
      <p class="text-sm text-ink-tertiary">
        Email con los partidos del fin de semana (viernes a domingo) de cada categoría: resultado, puesto del PALMA en
        la clasificación y sanciones, en Fútbol 7 y Fútbol 11. Sale solo cada lunes a las 10:00 si ese fin de semana
        hubo jornada (y no se había enviado ya).
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
          <label for="destinatarios" class="font-medium text-ink-secondary">Para (usuarios con email):</label>
          <div class="flex flex-wrap items-center gap-2">
            <MultiSelect inputId="destinatarios" v-model="idsDestinatarios" :options="opcionesUsuarios" optionLabel="label"
                         optionValue="value" filter display="chip" placeholder="Elige los destinatarios"
                         :disabled="!puedeEditar" class="w-full sm:w-[34rem]" />
            <Button v-if="puedeEditar" label="Guardar destinatarios" icon="pi pi-save" :class="BOTON_PRINCIPAL"
                    :loading="guardandoDestinatarios" :disabled="!hayCambiosDestinatarios" @click="guardarDestinatarios" />
          </div>
          <p class="text-xs text-ink-tertiary">
            El envío automático de los lunes va a los destinatarios guardados. Solo salen los usuarios activos con email
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
