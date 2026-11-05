<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ProgressBar from 'primevue/progressbar';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { videosService } from '../services';
import { useAuthStore } from '../stores/auth.store';
import { emitirCambio } from '../utils/cambioBus';

// Entrenamientos → Videos: biblioteca de vídeos de ejercicios (p. ej. la
// animación de una tarea de alonbalon), con su enlace de origen.
const auth = useAuthStore();
const confirm = useConfirm();
const toast = useToast();
const puedeEditar = computed(() => auth.puedeEditar('entrenamientos'));

const videos = ref([]);
const cargando = ref(false);
const busqueda = ref('');
const reproduciendo = ref(null);

const visibles = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return videos.value;
  return videos.value.filter((v) => `${v.titulo} ${v.descripcion || ''}`.toLowerCase().includes(q));
});

async function cargar() {
  cargando.value = true;
  try {
    videos.value = await videosService.listar();
  } catch {
    toast.add({ severity: 'error', summary: 'Videos', detail: 'No se pudieron cargar los vídeos.', life: 4000 });
  } finally {
    cargando.value = false;
  }
}
onMounted(cargar);

// ---- Formulario (nuevo / editar) ----
const dialogo = ref(false);
const form = ref({});
const fichero = ref(null);
const progreso = ref(null);
const guardando = ref(false);

function abrir(video = null) {
  form.value = video
    ? { id: video.id, titulo: video.titulo, descripcion: video.descripcion || '', origen_url: video.origen_url || '' }
    : { titulo: '', descripcion: '', origen_url: '' };
  fichero.value = null;
  progreso.value = null;
  dialogo.value = true;
}

function elegirFichero(e) {
  fichero.value = e.target.files?.[0] || null;
  if (fichero.value && !form.value.titulo) form.value.titulo = fichero.value.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
}

const tamano = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : '');

async function guardar() {
  if (!form.value.titulo?.trim()) {
    toast.add({ severity: 'warn', summary: 'Videos', detail: 'Pon un título.', life: 3000 });
    return;
  }
  if (!form.value.id && !fichero.value) {
    toast.add({ severity: 'warn', summary: 'Videos', detail: 'Elige el fichero de vídeo.', life: 3000 });
    return;
  }
  guardando.value = true;
  try {
    const { id, ...datos } = form.value;
    const video = id ? await videosService.actualizar(id, datos) : await videosService.crear(datos);
    if (fichero.value) {
      progreso.value = 0;
      await videosService.subirFichero(video.id, fichero.value, (p) => { progreso.value = p; });
    }
    dialogo.value = false;
    toast.add({ severity: 'success', summary: 'Videos', detail: 'Vídeo guardado.', life: 3000 });
    emitirCambio();
    await cargar();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Videos', detail: err?.response?.data?.message || 'No se pudo guardar el vídeo.', life: 5000 });
    await cargar();
  } finally {
    guardando.value = false;
  }
}

function eliminar(video) {
  confirm.require({
    group: 'videos',
    message: `¿Eliminar el vídeo «${video.titulo}»?`,
    header: 'Eliminar vídeo',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    rejectClass: 'p-button-secondary',
    accept: async () => {
      try {
        await videosService.eliminar(video.id);
        emitirCambio();
        await cargar();
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Videos', detail: err?.response?.data?.message || 'No se pudo eliminar.', life: 5000 });
      }
    }
  });
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <InputText v-model="busqueda" placeholder="Buscar vídeo…" class="w-full sm:w-72" />
      <Button v-if="puedeEditar" label="Nuevo vídeo" icon="pi pi-plus" class="sm:ml-auto" @click="abrir()" />
    </div>

    <p v-if="cargando" class="text-ink-tertiary">Cargando datos...</p>
    <p v-else-if="!visibles.length" class="text-ink-tertiary">No hay vídeos.</p>

    <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="v in visibles" :key="v.id" class="rounded border border-line bg-white overflow-hidden flex flex-col">
        <div class="bg-black aspect-video">
          <video v-if="v.fichero_url && reproduciendo === v.id" :src="v.fichero_url" class="w-full h-full" controls autoplay playsinline />
          <button v-else-if="v.fichero_url" type="button" class="w-full h-full flex items-center justify-center text-white"
            :aria-label="`Reproducir ${v.titulo}`" @click="reproduciendo = v.id">
            <i class="pi pi-play-circle text-5xl" />
          </button>
          <div v-else class="w-full h-full flex items-center justify-center text-ink-tertiary text-sm">Sin fichero</div>
        </div>
        <div class="p-3 flex flex-col gap-1 flex-1">
          <h3 class="font-semibold">{{ v.titulo }}</h3>
          <p v-if="v.descripcion" class="text-sm text-ink-secondary whitespace-pre-line">{{ v.descripcion }}</p>
          <p class="text-xs text-ink-tertiary">{{ [v.fichero_nombre, tamano(v.fichero_tamano)].filter(Boolean).join(' · ') }}</p>
          <div class="flex flex-wrap gap-1 mt-auto pt-2">
            <a v-if="v.fichero_url" :href="`${v.fichero_url}&descargar=1`" class="p-button p-button-text p-button-sm" download>
              <i class="pi pi-download mr-1" />Descargar
            </a>
            <a v-if="v.origen_url" :href="v.origen_url" target="_blank" rel="noopener noreferrer" class="p-button p-button-text p-button-sm">
              <i class="pi pi-external-link mr-1" />Origen
            </a>
            <template v-if="puedeEditar">
              <Button icon="pi pi-pencil" text size="small" aria-label="Editar" class="ml-auto" @click="abrir(v)" />
              <Button icon="pi pi-trash" text size="small" severity="danger" aria-label="Eliminar" @click="eliminar(v)" />
            </template>
          </div>
        </div>
      </article>
    </div>

    <ConfirmDialog group="videos" />

    <Dialog v-model:visible="dialogo" modal :header="form.id ? 'Editar vídeo' : 'Nuevo vídeo'" class="w-full max-w-lg" :closable="!guardando">
      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Título *</span>
          <InputText v-model="form.titulo" maxlength="150" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Descripción</span>
          <Textarea v-model="form.descripcion" rows="3" autoResize />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Enlace de origen</span>
          <InputText v-model="form.origen_url" placeholder="https://app.alonbalon.com/es/tasks/…" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{{ form.id ? 'Sustituir fichero (opcional)' : 'Fichero de vídeo *' }}</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime" @change="elegirFichero" />
          <span class="text-xs text-ink-tertiary">MP4, WebM o MOV, hasta 200 MB.</span>
        </label>
        <ProgressBar v-if="progreso !== null" :value="progreso" />
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text :disabled="guardando" @click="dialogo = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="guardando" @click="guardar" />
      </template>
    </Dialog>
  </div>
</template>
