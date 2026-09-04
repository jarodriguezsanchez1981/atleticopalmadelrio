<script setup>
import { ref, onMounted } from 'vue';
import { seccionesService } from '../../services';

const secciones = ref([]);
const cargando = ref(false);
const error = ref('');

async function cargar() {
  cargando.value = true;
  try {
    secciones.value = await seccionesService.listar();
  } catch (e) {
    error.value = 'Error al cargar secciones.';
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <SectionGuard seccion="administracion">
    <div class="max-w-2xl">
      <h1 class="font-display text-xl text-club-green mb-1 flex items-center gap-2">
        <img src="/escudo.png" alt="" class="w-7 h-7 object-contain" />
        Secciones
      </h1>
      <p class="text-sm text-ink-tertiary mb-4">
        Listado de secciones disponibles en la navegación.
      </p>

      <Message v-if="error" severity="error" :closable="false" class="mb-3">
        {{ error }}
      </Message>

      <div v-if="cargando" class="text-center py-8 text-ink-tertiary">
        <i class="pi pi-spin pi-spinner text-2xl block mb-2"></i>
        Cargando...
      </div>

      <div v-else class="bg-white border border-line rounded-lg overflow-hidden">
        <div
          v-for="sec in secciones"
          :key="sec.id"
          class="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-gray-50 transition-colors"
        >
          <span class="text-xs text-ink-tertiary font-mono w-6 text-center">{{ sec.orden }}</span>
          <i :class="sec.icono || 'pi pi-minus'" class="text-club-green text-sm"></i>
          <span class="flex-1 text-sm text-ink-primary font-medium">{{ sec.nombre }}</span>
          <span class="text-xs text-ink-tertiary font-mono">{{ sec.clave }}</span>
        </div>
        <div v-if="!secciones.length" class="px-4 py-8 text-center text-ink-tertiary text-sm">
          No hay secciones.
        </div>
      </div>
    </div>
  </SectionGuard>
</template>
