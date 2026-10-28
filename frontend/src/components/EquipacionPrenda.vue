<script setup>
import { computed } from 'vue';
import { hexColor, esRayas as esValorRayas, descomponerRayas } from '../utils/coloresEquipacion';

const props = defineProps({
  tipo: { type: String, default: 'camiseta' },
  color: { type: String, default: null },
  size: { type: Number, default: 28 }
});

const stroke = '#374151';

const esRayas = computed(() => esValorRayas(props.color));
const fillPrincipal = computed(() => hexColor(esRayas.value ? descomponerRayas(props.color)[0] : props.color));
const fillSecundario = computed(() => hexColor(descomponerRayas(props.color)[1]));
const clipId = `equipacion-rayas-${Math.random().toString(36).slice(2)}`;

const CAMISETA_PATH = 'M15 6 L9 9 L8 17 L14 15 L14 41 L34 41 L34 15 L40 17 L39 9 L33 6 L24 12 Z';
const CALZONAS_PATH = 'M9 11 L39 11 L39 22 L33 40 L27 38 L24 25 L21 38 L15 40 L9 22 Z';
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" class="inline-block align-middle shrink-0" aria-hidden="true">
    <defs v-if="esRayas">
      <clipPath :id="clipId">
        <rect x="24" y="0" width="24" height="48" />
      </clipPath>
    </defs>

    <template v-if="tipo === 'camiseta'">
      <path :d="CAMISETA_PATH" :fill="fillPrincipal" :stroke="stroke" stroke-width="1.6" stroke-linejoin="round" />
      <path
        v-if="esRayas"
        :d="CAMISETA_PATH"
        :fill="fillSecundario"
        :stroke="stroke"
        stroke-width="1.6"
        stroke-linejoin="round"
        :clip-path="`url(#${clipId})`"
      />
    </template>

    <g v-else-if="tipo === 'calzonas'">
      <path :d="CALZONAS_PATH" :fill="fillPrincipal" :stroke="stroke" stroke-width="1.6" stroke-linejoin="round" />
      <rect x="9" y="9" width="30" height="4" rx="1.5" :fill="fillPrincipal" :stroke="stroke" stroke-width="1.2" />
      <g v-if="esRayas" :clip-path="`url(#${clipId})`">
        <path :d="CALZONAS_PATH" :fill="fillSecundario" :stroke="stroke" stroke-width="1.6" stroke-linejoin="round" />
        <rect x="9" y="9" width="30" height="4" rx="1.5" :fill="fillSecundario" :stroke="stroke" stroke-width="1.2" />
      </g>
    </g>

    <g v-else>
      <rect x="10" y="11" width="9" height="24" rx="3" :fill="fillPrincipal" :stroke="stroke" stroke-width="1.4" />
      <rect x="29" y="11" width="9" height="24" rx="3" :fill="fillPrincipal" :stroke="stroke" stroke-width="1.4" />
      <rect x="10" y="32" width="9" height="5" rx="1.5" :fill="stroke" />
      <rect x="29" y="32" width="9" height="5" rx="1.5" :fill="stroke" />
      <g v-if="esRayas" :clip-path="`url(#${clipId})`">
        <rect x="10" y="11" width="9" height="24" rx="3" :fill="fillSecundario" :stroke="stroke" stroke-width="1.4" />
        <rect x="29" y="11" width="9" height="24" rx="3" :fill="fillSecundario" :stroke="stroke" stroke-width="1.4" />
      </g>
    </g>
  </svg>
</template>
