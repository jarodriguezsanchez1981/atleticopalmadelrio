<script setup>
import { ref, computed } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';

/** Tabla de jugadores no convocados por un motivo (Lesionados, Sancionados)
 * en el formulario de la convocatoria: jugador y observaciones, con selector
 * para añadir. `modelValue`: [{ id_jugador, observaciones }]. */
const props = defineProps({
  modelValue: { type: Array, required: true },
  titulo: { type: String, required: true },
  // Para los avisos: "lesionados", "sancionados".
  nombreLista: { type: String, required: true },
  opciones: { type: Array, default: () => [] },
  nombreJugador: { type: Function, required: true },
  soloLectura: { type: Boolean, default: false },
  placeholderObservaciones: { type: String, default: 'Observaciones' },
  textoVacio: { type: String, default: 'No hay jugadores.' }
});
const emit = defineEmits(['update:modelValue']);
const toast = useToast();

const nuevo = ref(null);
const observaciones = ref('');
const keySelect = ref(0);

const ordenados = computed(() =>
  [...props.modelValue].sort((a, b) => props.nombreJugador(a.id_jugador).localeCompare(props.nombreJugador(b.id_jugador), 'es'))
);

function agregar() {
  if (!nuevo.value) {
    toast.add({ severity: 'warn', summary: 'Selecciona un jugador', detail: 'Elige un jugador de la lista antes de pulsar Añadir.', life: 4000 });
    return;
  }
  const id = nuevo.value;
  if (!props.modelValue.some((n) => n.id_jugador === id)) {
    emit('update:modelValue', [...props.modelValue, { id_jugador: id, observaciones: observaciones.value.trim() }]);
    toast.add({ severity: 'success', summary: 'Añadido', detail: `${props.nombreJugador(id)} añadido a ${props.nombreLista}.`, life: 2500 });
  }
  nuevo.value = null;
  observaciones.value = '';
  keySelect.value += 1;
}

function quitar(id) {
  emit('update:modelValue', props.modelValue.filter((n) => n.id_jugador !== id));
}

// Para el aviso de "jugador seleccionado sin añadir" al guardar.
defineExpose({ pendiente: () => !!nuevo.value });
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-club-green mb-2">{{ titulo }}</h3>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-club-green/5">
            <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-10">Nº</th>
            <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
            <th class="text-left border border-line p-2 text-xs font-medium text-ink-tertiary">Observaciones</th>
            <th v-if="!soloLectura" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(n, i) in ordenados" :key="n.id_jugador">
            <td class="text-center border border-line p-2 text-sm text-ink-tertiary tabular-nums">{{ i + 1 }}</td>
            <td class="border border-line p-2 text-sm">{{ nombreJugador(n.id_jugador) }}</td>
            <td class="border border-line p-2 text-sm text-ink-secondary">{{ n.observaciones || '—' }}</td>
            <td v-if="!soloLectura" class="text-center border border-line p-2">
              <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7" @click="quitar(n.id_jugador)" />
            </td>
          </tr>
          <tr v-if="!ordenados.length">
            <td :colspan="soloLectura ? 3 : 4" class="text-center text-ink-tertiary p-3 text-sm">{{ textoVacio }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!soloLectura" class="flex flex-col sm:flex-row gap-2 mt-2">
      <Select :key="keySelect" v-model="nuevo" :options="opciones" optionLabel="label" optionValue="value"
              placeholder="Seleccionar jugador" class="flex-1" filter showClear />
      <InputText v-model="observaciones" :placeholder="placeholderObservaciones" class="flex-1" />
      <Button type="button" label="Añadir" icon="pi pi-plus" outlined class="!text-club-green !border-club-green/50"
              @click="agregar" />
    </div>
  </div>
</template>
