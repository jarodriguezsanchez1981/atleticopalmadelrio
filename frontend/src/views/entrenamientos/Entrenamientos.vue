<script setup>
import { ref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import EventosCalendario from '../../components/EventosCalendario.vue';
import VideosEntrenamiento from '../../components/VideosEntrenamiento.vue';

const calendario = ref();
const pestana = ref('calendario');
</script>

<template>
<SectionGuard seccion="entrenamientos">
  <div>
    <Tabs v-model:value="pestana" class="mb-4">
      <TabList>
        <Tab value="calendario">Calendario</Tab>
        <Tab value="videos">Videos</Tab>
      </TabList>
    </Tabs>
    <EventosCalendario
      v-show="pestana === 'calendario'"
      ref="calendario"
      tipo="entrenamiento"
      title="Calendario de entrenamientos"
      subtitle="Pincha en un día para añadir un entrenamiento. Pincha en un evento para editar o eliminar."
    />
    <VideosEntrenamiento v-if="pestana === 'videos'" />
  </div>
</SectionGuard>
</template>
