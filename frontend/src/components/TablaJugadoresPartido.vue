<script setup>
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

/** Tabla editable de los jugadores de un equipo en un partido (tarjetas,
 * goles y minutos). Con datos del acta, junto al nombre se ve el cambio:
 * flecha a la derecha = sale (en ese minuto), a la izquierda = entra. */
defineProps({
  jugadores: { type: Array, required: true },
  nombre: { type: Function, required: true },
  clave: { type: Function, required: true },
  vacio: { type: String, default: 'Sin jugadores.' },
  // Columna Minutos (solo en los partidos con minutos, ver utils/minutos.js).
  conMinutos: { type: Boolean, default: false }
});
const emit = defineEmits(['quitar']);
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-club-green/5">
          <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Jugador</th>
          <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Amarilla</th>
          <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">T. Roja</th>
          <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Goles</th>
          <th v-if="conMinutos" class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary">Minutos</th>
          <th class="text-center border border-line p-2 text-xs font-medium text-ink-tertiary w-12"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="j in jugadores" :key="clave(j)">
          <td class="text-center border border-line p-2 text-sm">
            <span class="inline-flex items-center gap-1.5">
              {{ nombre(j) }}
              <span v-if="j.minuto_entrada != null" class="inline-flex items-center gap-0.5 text-xs font-semibold text-green-700"
                    :title="`Entra en el minuto ${j.minuto_entrada}`">
                <i class="pi pi-arrow-left text-[0.7rem]"></i>{{ j.minuto_entrada }}'
              </span>
              <span v-if="j.minuto_salida != null" class="inline-flex items-center gap-0.5 text-xs font-semibold text-red-700"
                    :title="`Sale en el minuto ${j.minuto_salida}`">
                <i class="pi pi-arrow-right text-[0.7rem]"></i>{{ j.minuto_salida }}'
              </span>
            </span>
          </td>
          <td class="text-center border border-line p-2">
            <InputNumber v-model="j.tarjeta_amarilla" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
          </td>
          <td class="text-center border border-line p-2">
            <InputNumber v-model="j.tarjeta_roja" :min="0" :max="5" class="!w-20" inputClass="!w-20 !text-center" />
          </td>
          <td class="text-center border border-line p-2">
            <InputNumber v-model="j.goles" :min="0" :max="99" class="!w-20" inputClass="!w-20 !text-center" />
          </td>
          <td v-if="conMinutos" class="text-center border border-line p-2">
            <InputNumber v-model="j.minutos" :min="0" :max="120" class="!w-20" inputClass="!w-20 !text-center" />
          </td>
          <td class="text-center border border-line p-2">
            <Button icon="pi pi-times" text rounded severity="danger" class="!w-7 !h-7" @click="emit('quitar', clave(j))" />
          </td>
        </tr>
        <tr v-if="!jugadores.length">
          <td :colspan="conMinutos ? 6 : 5" class="text-center border border-line p-2 text-sm text-ink-tertiary">{{ vacio }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
