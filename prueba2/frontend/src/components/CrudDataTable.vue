<script setup>
/**
 * Tabla + formulario CRUD genérico, reutilizado por Categorías, Jugadores,
 * Entrenamientos, Partidos y Usuarios (Administración) para no repetir el
 * mismo boilerplate de PrimeVue en cada pantalla.
 *
 * `columns`: [{ field, header, type: 'text'|'textarea'|'date'|'select',
 *               options?: [{label, value}], required?: bool, filterable?: bool }]
 */
import { ref, reactive, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Password from 'primevue/password';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';

const props = defineProps({
  title: { type: String, required: true },
  columns: { type: Array, required: true },
  service: { type: Object, required: true }, // { listar, crear, actualizar, eliminar }
  emptyItem: { type: Object, required: true },
  canCreate: { type: Boolean, default: true },
  canEdit: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: true }
});

const items = ref([]);
const cargando = ref(false);
const filtroGlobal = ref('');
const dialogVisible = ref(false);
const editando = ref(false);
const form = reactive({ ...props.emptyItem });

const toast = useToast();
const confirm = useConfirm();

async function cargar() {
  cargando.value = true;
  try {
    items.value = await props.service.listar();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos.', life: 4000 });
  } finally {
    cargando.value = false;
  }
}

function abrirNuevo() {
  Object.assign(form, props.emptyItem);
  editando.value = false;
  dialogVisible.value = true;
}

function abrirEdicion(item) {
  Object.assign(form, item);
  editando.value = true;
  dialogVisible.value = true;
}

async function guardar() {
  try {
    if (editando.value) {
      await props.service.actualizar(form.id, form);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.', life: 3000 });
    } else {
      await props.service.crear(form);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Registro creado correctamente.', life: 3000 });
    }
    dialogVisible.value = false;
    await cargar();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo guardar el registro.',
      life: 5000
    });
  }
}

function confirmarEliminar(item) {
  confirm.require({
    message: '¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await props.service.eliminar(item.id);
        toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado.', life: 3000 });
        await cargar();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'No se pudo eliminar el registro.',
          life: 5000
        });
      }
    }
  });
}

defineExpose({ cargar });
onMounted(cargar);
</script>

<template>
  <div>
    <ConfirmDialog />

    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h1 class="font-display text-xl text-club-green">{{ title }}</h1>

      <div class="flex items-center gap-2">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroGlobal" placeholder="Buscar..." />
        </IconField>
        <Button v-if="canCreate" label="Nuevo" icon="pi pi-plus" @click="abrirNuevo"
                class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
      </div>
    </div>

    <DataTable
      :value="items"
      :loading="cargando"
      :globalFilterFields="columns.map(c => c.field)"
      :filters="{ global: { value: filtroGlobal, matchMode: 'contains' } }"
      paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]"
      stripedRows responsiveLayout="scroll"
      class="rounded-xl overflow-hidden shadow-sm"
    >
      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" sortable>
        <template #body="{ data }">
          <slot :name="`cell-${col.field}`" :data="data">{{ data[col.field] }}</slot>
        </template>
      </Column>

      <Column v-if="canEdit || canDelete" header="Acciones" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button v-if="canEdit" icon="pi pi-pencil" text rounded severity="secondary" @click="abrirEdicion(data)" />
            <Button v-if="canDelete" icon="pi pi-trash" text rounded severity="danger" @click="confirmarEliminar(data)" />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center text-slate-400 py-6">No hay registros todavía.</div>
      </template>
    </DataTable>

    <!-- Diálogo de alta / edición -->
    <Dialog v-model:visible="dialogVisible" modal :header="editando ? `Editar ${title}` : `Nuevo registro · ${title}`" class="w-full max-w-lg">
      <form @submit.prevent="guardar" class="space-y-4 pt-2">
        <div v-for="col in columns" :key="col.field" class="flex flex-col gap-1.5">
          <label :for="col.field" class="text-sm font-medium text-slate-600">
            {{ col.header }} <span v-if="col.required" class="text-club-garnet">*</span>
          </label>

          <InputText v-if="col.type === 'text'" :id="col.field" v-model="form[col.field]" class="w-full" />

          <Password v-else-if="col.type === 'password'" :id="col.field" v-model="form[col.field]"
                    :feedback="false" toggleMask inputClass="w-full" class="w-full"
                    :placeholder="editando ? 'Dejar en blanco para no cambiarla' : ''" />

          <Textarea v-else-if="col.type === 'textarea'" :id="col.field" v-model="form[col.field]" rows="3" class="w-full" />

          <DatePicker v-else-if="col.type === 'date'" :id="col.field" v-model="form[col.field]"
                      showTime hourFormat="24" dateFormat="dd/mm/yy" class="w-full" />

          <Select v-else-if="col.type === 'select'" :id="col.field" v-model="form[col.field]"
                  :options="col.options" optionLabel="label" optionValue="value" class="w-full"
                  placeholder="Selecciona una opción" />
        </div>

        <div class="flex justify-end gap-2 pt-3">
          <Button type="button" label="Cancelar" text @click="dialogVisible = false" />
          <Button type="submit" label="Guardar" icon="pi pi-check"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
