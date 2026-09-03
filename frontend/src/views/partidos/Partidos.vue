<script setup>
import { ref } from 'vue';
import EventosCalendario from '../../components/EventosCalendario.vue';

const calendario = ref();
</script>

<template>
<SectionGuard seccion="partidos">
  <div>
    <EventosCalendario
      ref="calendario"
      tipo="partido"
      title="Calendario de partidos"
      subtitle="Pincha en un día para añadir un partido. Pincha en un evento para editar o eliminar."
    />
  </div>
</SectionGuard>
</template>