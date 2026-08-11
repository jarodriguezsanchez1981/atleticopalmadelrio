<script setup>
import { ref } from 'vue';
import EventosCalendario from '../../components/EventosCalendario.vue';

const calendario = ref();
</script>

<template>
  <div>
    <EventosCalendario
      ref="calendario"
      tipo="entrenamiento"
      title="Calendario de entrenamientos"
      subtitle="Pincha en un día para añadir un entrenamiento. Pincha en un evento para editar o eliminar."
    />
  </div>
</template>