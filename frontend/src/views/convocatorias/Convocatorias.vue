<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { convocatoriasService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { suscribirseCambio, emitirCambio } from '../../utils/cambioBus';
import ConvocatoriaForm from '../../components/ConvocatoriaForm.vue';

const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

const convocatorias = ref([]);
const cargando = ref(false);
const formVisible = ref(false);
const formRegistroId = ref(null);
let unsubCambio = null;

const puedeEditar = () => auth.puedeVer('convocatorias') && auth.puedeEditar('convocatorias');

async function cargar() {
  cargando.value = true;
  try {
    convocatorias.value = await convocatoriasService.listar();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las convocatorias.', life: 4000 });
  } finally {
    cargando.value = false;
  }
}

onMounted(async () => {
  await cargar();
  unsubCambio = suscribirseCambio(cargar);
});
onBeforeUnmount(() => {
  if (unsubCambio) unsubCambio();
});

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function nuevaConvocatoria() {
  formRegistroId.value = null;
  formVisible.value = true;
}

function editarConvocatoria(item) {
  formRegistroId.value = item.id;
  formVisible.value = true;
}

function onFormSaved() {
  cargar();
  emitirCambio();
}

function confirmarEliminar(item) {
  confirm.require({
    message: '¿Seguro que quieres eliminar esta convocatoria? Esta acción no se puede deshacer.',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await convocatoriasService.eliminar(item.id);
        toast.add({ severity: 'success', summary: 'Eliminada', detail: 'Convocatoria eliminada.', life: 3000 });
        await cargar();
        emitirCambio();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'No se pudo eliminar la convocatoria.',
          life: 5000
        });
      }
    }
  });
}
</script>

<template>
<SectionGuard seccion="convocatorias">
  <div class="flex flex-col gap-4">
    <ConfirmDialog />
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="font-display text-xl text-club-green">Convocatorias</h1>
      <Button v-if="puedeEditar()" label="Nueva convocatoria" icon="pi pi-plus"
              class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
              @click="nuevaConvocatoria" />
    </div>

    <DataTable :value="convocatorias" :loading="cargando" paginator :rows="15" :rowsPerPageOptions="[15, 30, 50]"
               responsiveLayout="scroll" class="ar-datatable">
      <Column header="Temporada">
        <template #body="{ data }">{{ data.temporada?.nombre || '—' }}</template>
      </Column>
      <Column header="Categoría">
        <template #body="{ data }">{{ data.plantilla?.categoria?.alias || data.plantilla?.categoria?.nombre || '—' }}</template>
      </Column>
      <Column header="Partido">
        <template #body="{ data }">
          <div class="flex flex-col">
            <span>{{ formatearFecha(data.partido?.fecha) }}</span>
            <span class="text-xs text-ink-tertiary">
              {{ data.partido?.equipoLocal?.nombre || '—' }} vs {{ data.partido?.equipoVisitante?.nombre || '—' }}
            </span>
          </div>
        </template>
      </Column>
      <Column header="Jugadores">
        <template #body="{ data }">{{ (data.jugadores || []).length }}</template>
      </Column>
      <Column header="Acciones" style="width: 100px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text rounded size="small" class="!text-club-green"
                    v-tooltip.top="'Editar'" :disabled="!puedeEditar()" @click="editarConvocatoria(data)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                    v-tooltip.top="'Eliminar'" :disabled="!puedeEditar()" @click="confirmarEliminar(data)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center text-ink-tertiary py-6">No hay convocatorias registradas.</div>
      </template>
    </DataTable>

    <ConvocatoriaForm
      v-model:visible="formVisible"
      :registroId="formRegistroId"
      @saved="onFormSaved"
    />
  </div>
</SectionGuard>
</template>
