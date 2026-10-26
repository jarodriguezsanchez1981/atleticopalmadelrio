<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { crearDocInvitacionTorneo, generarPdfInvitacionTorneo } from '../../utils/pdfInvitacionTorneo';

/** Notificaciones → Invitación Torneo: formulario para generar la carta de
 * invitación oficial del club a un torneo en PDF. Se pueden cambiar el nombre
 * del torneo, la fecha, la hora, el lugar y las categorías (una o varias); el
 * borrador se recuerda en este navegador. */
const SECCION = 'invitacion_torneo';
const CLAVE_BORRADOR = 'apr_invitacion_torneo';
const toast = useToast();

// Combos: franja horaria (desde/hasta), lugares y categorías del club.
const OPCIONES_HORA = [];
for (let h = 8; h <= 22; h++) {
  for (const m of ['00', '30']) OPCIONES_HORA.push(`${String(h).padStart(2, '0')}:${m}`);
}
const OPCIONES_LUGAR = ['Estadio Anexo', 'Estadio Municipal Sergio León'];
const OPCIONES_CATEGORIA = ['Bebé', 'Prebenjamín', 'Benjamín', 'Alevín'];

const DATOS_POR_DEFECTO = {
  nombreTorneo: 'Torneo de Fútbol de Bebés',
  fecha: null,
  horaDesde: '10:00',
  horaHasta: '14:00',
  lugar: 'Estadio Municipal Sergio León',
  categorias: ['Bebé']
};

function leerBorrador() {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null');
    if (b && b.fecha) b.fecha = new Date(b.fecha);
    // Borradores antiguos guardaban una sola categoría en `categoria`.
    if (b && !Array.isArray(b.categorias)) {
      b.categorias = b.categoria ? [b.categoria] : [];
    }
    if (b) delete b.categoria;
    return b;
  } catch {
    return null;
  }
}

const datos = reactive({ ...DATOS_POR_DEFECTO, categorias: [...DATOS_POR_DEFECTO.categorias], ...(leerBorrador() || {}) });

// La franja horaria se compone "10:00 a 14:00 h" para la carta.
const valores = computed(() => ({
  nombreTorneo: datos.nombreTorneo,
  fecha: datos.fecha,
  hora: datos.horaDesde && datos.horaHasta
    ? `${datos.horaDesde} a ${datos.horaHasta} h`
    : (datos.horaDesde || datos.horaHasta || ''),
  lugar: datos.lugar,
  // En el orden de la lista, no en el que se marcaron.
  categorias: OPCIONES_CATEGORIA.filter((c) => datos.categorias.includes(c))
}));

const previaUrl = ref('');
const generando = ref(false);
let urlAnterior = '';

async function refrescarPrevia() {
  try {
    const { doc } = await crearDocInvitacionTorneo(valores.value);
    const url = doc.output('bloburl');
    if (urlAnterior) URL.revokeObjectURL(urlAnterior);
    urlAnterior = url;
    previaUrl.value = url;
  } catch {
    /* la vista previa es opcional: si falla, el botón de descarga sigue valiendo */
  }
}

async function descargar() {
  generando.value = true;
  try {
    await generarPdfInvitacionTorneo(valores.value);
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF.', life: 4000 });
  } finally {
    generando.value = false;
  }
}

function restablecer() {
  Object.assign(datos, DATOS_POR_DEFECTO, { categorias: [...DATOS_POR_DEFECTO.categorias] });
}

// Guardar el borrador y regenerar la vista previa en cuanto cambie un dato.
let temporizador = null;
watch(datos, () => {
  try {
    localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ ...datos }));
  } catch { /* sin almacenamiento: el formulario funciona igual */ }
  clearTimeout(temporizador);
  temporizador = setTimeout(refrescarPrevia, 300);
}, { deep: true });

onMounted(refrescarPrevia);
onBeforeUnmount(() => {
  clearTimeout(temporizador);
  if (urlAnterior) URL.revokeObjectURL(urlAnterior);
});
</script>

<template>
<SectionGuard :seccion="SECCION">
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="font-display text-xl text-club-green">Invitación Torneo</h1>
      <p class="text-sm text-ink-tertiary">
        Genera la carta de invitación oficial del club a un torneo en PDF. Cambia los
        datos y descárgala cuando esté lista.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Formulario -->
      <div class="rounded-xl border border-line bg-white p-5 flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="it-nombre" class="text-sm font-medium text-ink-secondary">Nombre del torneo</label>
          <InputText id="it-nombre" v-model="datos.nombreTorneo" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="it-fecha" class="text-sm font-medium text-ink-secondary">Fecha</label>
          <DatePicker inputId="it-fecha" v-model="datos.fecha" dateFormat="dd/mm/yy" showIcon iconDisplay="input" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Hora / horario</label>
          <div class="flex items-center gap-2">
            <Select inputId="it-hora-desde" v-model="datos.horaDesde" :options="OPCIONES_HORA" placeholder="Desde" class="w-full" />
            <span class="text-sm text-ink-tertiary">a</span>
            <Select inputId="it-hora-hasta" v-model="datos.horaHasta" :options="OPCIONES_HORA" placeholder="Hasta" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="it-lugar" class="text-sm font-medium text-ink-secondary">Lugar</label>
          <Select inputId="it-lugar" v-model="datos.lugar" :options="OPCIONES_LUGAR" placeholder="Elige un lugar" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="it-categoria" class="text-sm font-medium text-ink-secondary">Categorías</label>
          <MultiSelect inputId="it-categoria" v-model="datos.categorias" :options="OPCIONES_CATEGORIA" display="chip"
                       :showToggleAll="false" placeholder="Elige una o varias categorías" class="w-full" />
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <Button label="Descargar PDF" icon="pi pi-download" :loading="generando" @click="descargar"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
          <Button label="Restablecer" icon="pi pi-refresh" severity="secondary" outlined @click="restablecer" />
        </div>
      </div>

      <!-- Vista previa -->
      <div class="rounded-xl border border-line bg-white p-2 min-h-[28rem] flex flex-col">
        <iframe v-if="previaUrl" :src="previaUrl" title="Vista previa de la carta" class="w-full flex-1 min-h-[26rem] rounded-lg" />
        <div v-else class="flex-1 flex items-center justify-center text-sm text-ink-tertiary">Generando vista previa…</div>
      </div>
    </div>
  </div>
</SectionGuard>
</template>
