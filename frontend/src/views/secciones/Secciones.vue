<script setup>
import { ref, onMounted, computed } from 'vue';
import OrderList from 'primevue/orderlist';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { seccionesService } from '../../services';
import { emitirCambio } from '../../utils/cambioBus';

const toast = useToast();
const secciones = ref([]);
const ordenGuardado = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const error = ref('');

function clonarOrden(lista) {
  return lista.map((s) => s.id);
}

async function cargar() {
  cargando.value = true;
  try {
    secciones.value = await seccionesService.listar();
    ordenGuardado.value = clonarOrden(secciones.value);
  } catch (e) {
    error.value = 'Error al cargar secciones.';
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);

const huboCambios = computed(() => {
  const actual = clonarOrden(secciones.value);
  return actual.length === ordenGuardado.value.length
    && actual.some((id, i) => id !== ordenGuardado.value[i]);
});

async function guardarOrden() {
  guardando.value = true;
  try {
    const orden = secciones.value.map((s, i) => ({ id: s.id, orden: i + 1 }));
    secciones.value = await seccionesService.reordenar(orden);
    ordenGuardado.value = clonarOrden(secciones.value);
    emitirCambio();
    toast.add({ severity: 'success', summary: 'Orden guardado', detail: 'El orden de las secciones se ha actualizado.', life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el orden.', life: 4000 });
  } finally {
    guardando.value = false;
  }
}

function cancelarCambios() {
  cargar();
}
</script>

<template>
  <SectionGuard seccion="administracion">
    <div class="max-w-2xl">
      <h1 class="font-display text-xl text-club-green mb-1 flex items-center gap-2">
        <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
        Secciones
      </h1>
      <p class="text-sm text-ink-tertiary mb-4">
        Arrastra las secciones o usa los botones para cambiar el orden en el que aparecen en la navegación.
      </p>

      <Message v-if="error" severity="error" :closable="false" class="mb-3">
        {{ error }}
      </Message>

      <div v-if="cargando" class="text-center py-8 text-ink-tertiary">
        <i class="pi pi-spin pi-spinner text-2xl block mb-2"></i>
        Cargando...
      </div>

      <template v-else>
        <div v-if="huboCambios" class="flex items-center justify-end gap-2 mb-3">
          <Button label="Cancelar" text @click="cancelarCambios" :disabled="guardando" />
          <Button label="Guardar orden" icon="pi pi-check" :loading="guardando"
                  class="!bg-club-green !border-club-green hover:!bg-club-greenLight"
                  @click="guardarOrden" />
        </div>

        <OrderList v-model="secciones" dataKey="id" :listStyle="{ maxHeight: 'none' }">
          <template #option="{ option }">
            <div class="flex items-center gap-3 w-full">
              <span class="text-xs text-ink-tertiary font-mono w-6 text-center">{{ option.orden }}</span>
              <i :class="option.icono || 'pi pi-minus'" class="text-club-green text-sm"></i>
              <span class="flex-1 text-sm text-ink-primary font-medium">{{ option.nombre }}</span>
              <span class="text-xs text-ink-tertiary font-mono">{{ option.clave }}</span>
            </div>
          </template>
        </OrderList>

        <div v-if="!secciones.length" class="px-4 py-8 text-center text-ink-tertiary text-sm bg-white border border-line rounded-lg">
          No hay secciones.
        </div>
      </template>
    </div>
  </SectionGuard>
</template>
