<script setup>
import { computed } from 'vue';
import { hexColor } from '../utils/coloresEquipacion';

const props = defineProps({
  tipo: { type: String, default: 'camiseta' },
  color: { type: String, default: null },
  size: { type: Number, default: 28 }
});

const fill = computed(() => hexColor(props.color));
const stroke = '#374151';
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" class="inline-block align-middle shrink-0" aria-hidden="true">
    <path
      v-if="tipo === 'camiseta'"
      d="M15 6 L9 9 L8 17 L14 15 L14 41 L34 41 L34 15 L40 17 L39 9 L33 6 L24 12 Z"
      :fill="fill"
      :stroke="stroke"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
    <g v-else-if="tipo === 'calzonas'">
      <path
        d="M9 11 L39 11 L39 22 L33 40 L27 38 L24 25 L21 38 L15 40 L9 22 Z"
        :fill="fill"
        :stroke="stroke"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <rect x="9" y="9" width="30" height="4" rx="1.5" :fill="fill" :stroke="stroke" stroke-width="1.2" />
    </g>
    <g v-else>
      <rect x="10" y="11" width="9" height="24" rx="3" :fill="fill" :stroke="stroke" stroke-width="1.4" />
      <rect x="29" y="11" width="9" height="24" rx="3" :fill="fill" :stroke="stroke" stroke-width="1.4" />
      <rect x="10" y="32" width="9" height="5" rx="1.5" :fill="stroke" />
      <rect x="29" y="32" width="9" height="5" rx="1.5" :fill="stroke" />
    </g>
  </svg>
</template>
