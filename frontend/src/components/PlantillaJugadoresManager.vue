<script setup>
import { ref, computed, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';
import { jugadoresService } from '../services';

const props = defineProps({
  value: { type: Array, default: () => [] },
  jugadores: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const toast = useToast();
const dialogVisible = ref(false);
const editando = ref(false);
const jugadorActual = ref({ id_jugador: null, dorsal: null, talla: null });

const jugadoresDisponibles = computed(() => {
  const seleccionados = props.value.map(j => j.id_jugador);
  return props.jugadores.filter(j => !seleccionados.includes(j.id));
});

const columns = [
  { field: 'nombreCompleto', header: 'Jugador', sortable: true },
  { field: 'dorsal', header: 'Dorsal', sortable: true },
  { field: 'talla', header: 'Talla', sortable: true }
];

function formatearJugador(j) {
  const jp = j.PlantillaJugador || {};
  return {
    id: j.id,
    id_jugador: j.id_jugador || j.id,
    nombre: j.nombre,
    apellidos: j.apellidos,
    nombreCompleto: `${j.apellidos}, ${j.nombre}`,
    dorsal: jp.dorsal,
    talla: jp.talla
  };
}

function abrirNuevo() {
  editando.value = false;
  jugadorActual.value = { id_jugador: null, dorsal: null, talla: null };
  dialogVisible.value = true;
}

function editarJugador(j) {
  editando.value = true;
  jugadorActual.value = {
    id_jugador: j.id_jugador,
    dorsal: j.dorsal || null,
    talla: j.talla || ''
  };
  dialogVisible.value = true;
}

function eliminarJugador(j) {
  const nuevo = props.value.filter(p => p.id_jugador !== j.id_jugador);
  emit('update:modelValue', nuevo);
}

async function guardarJugador() {
  if (!jugadorActual.value.id_jugador) {
    toast.add({ severity: 'warn', summary: 'Jugador requerido', detail: 'Selecciona un jugador', life: 3000 });
    return;
  }
  
  if (editando.value) {
    const nuevo = props.value.map(j => {
      if (j.id_jugador === jugadorActual.value.id_jugador) {
        return { ...j, dorsal: jugadorActual.value.dorsal, talla: jugadorActual.value.talla };
      }
      return j;
    });
    emit('update:modelValue', nuevo);
  } else {
    const existe = props.value.some(j => j.id_jugador === jugadorActual.value.id_jugador);
    if (existe) {
      toast.add({ severity: 'warn', summary: 'Duplicado', detail: 'Este jugador ya está en la plantilla', life: 3000 });
      return;
    }
    const nuevo = [...props.value, {
      id_jugador: jugadorActual.value.id_jugador,
      dorsal: jugadorActual.value.dorsal,
      talla: jugadorActual.value.talla
    }];
    emit('update:modelValue', nuevo);
  }
  dialogVisible.value = false;
}

function getNombreCompleto(jugador) {
  const j = props.jugadores.find(x => x.id === jugador.id_jugador);
  if (!j) return '';
  return `${j.apellidos}, ${j.nombre}`;
}
</script>

<template>
  <div class="plantilla-jugadores-manager">
    <div class="space-y-3" v-if="!readonly">
      <div class="flex justify-between items-center">
        <span class="font-medium text-ink-secondary">Jugadores ({{ value.length }})</span>
        <Button label="Añadir jugador" icon="pi pi-plus" class="p-button-sm" @click="abrirNuevo" />
      </div>

      <DataTable v-if="value.length" :value="value" :paginator="true" :rows="5" :rowsPerPageOptions="[5, 10, 20]" 
                 responsiveLayout="scroll" class="ar-datatable">
        <Column field="nombreCompleto" header="Jugador">
          <template #body="slotProps">
            {{ getNombreCompleto(slotProps.data) }}
          </template>
        </Column>
        <Column field="dorsal" header="Dorsal" style="width: 80px" />
        <Column field="talla" header="Talla" style="width: 80px" />
        <Column header="Acciones" style="width: 100px">
          <template #body="slotProps">
            <div class="flex gap-1 justify-center">
              <Button icon="pi pi-pencil" class="p-button-rounded p-button-text p-button-sm" 
                      @click="editarJugador(slotProps.data)" />
              <Button icon="pi pi-trash" class="p-button-rounded p-button-text p-button-sm p-button-danger" 
                      @click="eliminarJugador(slotProps.data)" />
            </div>
          </template>
        </Column>
      </DataTable>

      <p v-else class="text-ink-tertiary text-center py-4">
        No hay jugadores asignados. <Button label="Añadir jugador" text class="p-button-sm" @click="abrirNuevo" />
      </p>

      <Dialog v-model:visible="dialogVisible" :modal="true" :header="editando ? 'Editar jugador' : 'Añadir jugador'" 
              :style="{ width: '28rem' }">
        <div class="space-y-3 pt-2">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-ink-secondary">Jugador <span class="text-club-garnet">*</span></label>
            <Select v-model="jugadorActual.id_jugador" :options="jugadoresDisponibles" optionLabel="apellidos" optionValue="id"
                    filter filterPlaceholder="Busca por nombre..." class="w-full" placeholder="Selecciona un jugador"
                    :disabled="editando" showClear />
          </div>
          <div class="flex gap-3">
            <div class="flex flex-col gap-1.5 flex-1">
              <label class="text-sm font-medium text-ink-secondary">Dorsal</label>
              <InputNumber v-model="jugadorActual.dorsal" :min="1" :max="99" placeholder="Dorsal" class="w-full" />
            </div>
            <div class="flex flex-col gap-1.5 flex-1">
              <label class="text-sm font-medium text-ink-secondary">Talla</label>
              <input v-model="jugadorActual.talla" type="text" placeholder="Ej: M, L, XL, 42" class="p-inputtext w-full" maxlength="10" />
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <Button label="Cancelar" text @click="dialogVisible = false" />
            <Button label="Guardar" icon="pi pi-check" @click="guardarJugador" class="!bg-club-green !border-club-green hover:!bg-club-greenLight" />
          </div>
        </template>
      </Dialog>
    </div>
  </div>
</template>