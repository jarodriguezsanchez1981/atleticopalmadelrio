<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { patrocinadoresService } from '../services';
import { suscribirseCambio } from '../utils/cambioBus';

const props = defineProps({
  withBorder: { type: Boolean, default: true }
});

const patrocinadores = ref([]);

const principal = computed(() =>
  patrocinadores.value
    .filter((p) => p.tipo === 'principal')
    .sort((a, b) => Number(a.orden) - Number(b.orden))
);
const oficiales = computed(() =>
  patrocinadores.value
    .filter((p) => p.tipo === 'oficial')
    .sort((a, b) => Number(a.orden) - Number(b.orden))
);
const colaboradores = computed(() =>
  patrocinadores.value
    .filter((p) => p.tipo === 'colaborador')
    .sort((a, b) => Number(a.orden) - Number(b.orden))
);

async function cargarPatrocinadores() {
  try {
    patrocinadores.value = await patrocinadoresService.listar();
  } catch {
    patrocinadores.value = [];
  }
}

onMounted(() => {
  cargarPatrocinadores();
  const desuscribir = suscribirseCambio(cargarPatrocinadores);
  onUnmounted(desuscribir);
});
</script>

<template>
  <footer v-if="patrocinadores.length" class="bg-club-cream px-6 py-4 shrink-0" :class="{ 'border-t border-line': withBorder }">
    <table class="w-full border-collapse">
      <tr>
        <td class="align-bottom pb-2 text-center" style="font-size:16px; font-weight:700; color: rgb(0 0 0 / 90%);">Patrocinador Principal</td>
        <td class="align-bottom pb-2 text-center" style="font-size:16px; font-weight:700; color: rgb(0 0 0 / 90%);">Patrocinador Oficial</td>
      </tr>
      <tr>
        <td class="align-middle pb-4">
          <div class="flex flex-wrap items-center justify-center gap-4">
            <img
              v-for="p in principal"
              :key="p.id"
              :src="p.imagen"
              :alt="p.nombre"
              class="h-[100px] w-auto object-contain max-w-[140px]"
            />
          </div>
        </td>
        <td class="align-middle pb-4">
          <div class="flex flex-wrap items-center justify-center gap-4">
            <img
              v-for="p in oficiales"
              :key="p.id"
              :src="p.imagen"
              :alt="p.nombre"
              class="h-[80px] w-auto object-contain max-w-[100px]"
            />
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" class="pb-2 text-center" style="font-size:16px; font-weight:700; color: rgb(0 0 0 / 90%);">Colaboradores</td>
      </tr>
      <tr>
        <td colspan="2">
          <div class="flex flex-wrap items-center justify-center gap-3">
            <img
              v-for="p in colaboradores"
              :key="p.id"
              :src="p.imagen"
              :alt="p.nombre"
              class="h-[60px] w-auto object-contain max-w-[80px]"
            />
          </div>
        </td>
      </tr>
    </table>
  </footer>
</template>
