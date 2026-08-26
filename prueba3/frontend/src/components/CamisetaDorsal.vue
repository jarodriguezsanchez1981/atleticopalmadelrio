<template>
  <div class="camiseta-dorsal" :style="{ width: size + 'px', height: size + 'px' }">
    <img src="/camiseta/IMG_0430-removebg-preview.png" alt="Camiseta" class="camiseta-img" />
    <span v-if="numero != null" class="camiseta-numero" :style="{ color: '#062b7f', fontSize: numeroFontSize + 'px' }">{{ numero }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  numero: { type: [Number, String], default: null },
  size: { type: Number, default: 48 }
});

const numeroFontSize = computed(() => Math.round(props.size * 0.38));
</script>

<style scoped>
.camiseta-dorsal {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.camiseta-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.camiseta-numero {
  position: absolute;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
}
</style>
