<script setup>
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { equiposService } from '../../services';

const toast = useToast();

const columns = [
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  { field: 'escudo', header: 'Escudo', type: 'image' },
  { field: 'direccion', header: 'Dirección', type: 'text' }
];

const emptyItem = { nombre: '', escudo: null, direccion: '' };

function mapsQuery(direccion) {
  return encodeURIComponent(direccion || '');
}

function mapsUrl(direccion) {
  return `https://www.google.com/maps/search/?api=1&query=${mapsQuery(direccion)}`;
}

function mapsEmbedUrl(direccion) {
  return `https://maps.google.com/maps?q=${mapsQuery(direccion)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

async function copiarDireccion(direccion) {
  if (!direccion) return;
  try {
    await navigator.clipboard.writeText(direccion);
    toast.add({ severity: 'success', summary: 'Copiado', detail: 'Dirección copiada al portapapeles.', life: 2500 });
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo copiar la dirección.', life: 3000 });
  }
}
</script>

<template>
  <CrudDataTable
    title="Equipos"
    :columns="columns"
    :service="equiposService"
    :emptyItem="emptyItem"
  >
    <template #cell-direccion="{ data }">
      <a
        v-if="data.direccion"
        :href="mapsUrl(data.direccion)"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-club-green hover:underline"
      >
        <i class="pi pi-map-marker"></i>
        {{ data.direccion }}
      </a>
      <span v-else>—</span>
    </template>

    <template #detail-direccion="{ data }">
      <div v-if="data.direccion" class="flex items-center justify-between gap-3">
        <span class="break-words">{{ data.direccion }}</span>
        <Button
          type="button"
          icon="pi pi-copy"
          label="Copiar"
          text
          severity="secondary"
          @click="copiarDireccion(data.direccion)"
        />
      </div>
      <span v-else>—</span>
    </template>

    <template #detail-extra="{ data }">
      <div v-if="data.direccion" class="mt-3 space-y-2">
        <div class="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          <i class="pi pi-map-marker mr-1"></i>
          Ubicación
        </div>
        <iframe
          :src="mapsEmbedUrl(data.direccion)"
          class="w-full rounded-lg border border-slate-200"
          style="height: 260px"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
        <a
          :href="mapsUrl(data.direccion)"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-club-green hover:underline text-sm"
        >
          <i class="pi pi-external-link"></i>
          Abrir en Google Maps
        </a>
      </div>
    </template>
  </CrudDataTable>
</template>