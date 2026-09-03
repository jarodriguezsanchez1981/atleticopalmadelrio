<script setup>
import { ref } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { equiposService } from '../../services';
import { OPCIONES_COLOR } from '../../utils/coloresEquipacion';
import EquipacionPrenda from '../../components/EquipacionPrenda.vue';

const toast = useToast();
const dtRef = ref();

const columns = [
  { field: 'escudo', header: 'Escudo', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  {
    field: 'equipacion',
    header: 'Equipación',
    soloTabla: true,
    format: (v, d) => [d.camiseta, d.calzonas, d.medias].filter(Boolean).join(' / ')
  },
  { field: 'camiseta', header: 'Camiseta', type: 'select', options: OPCIONES_COLOR, enTabla: false },
  { field: 'calzonas', header: 'Calzonas', type: 'select', options: OPCIONES_COLOR, enTabla: false },
  { field: 'medias', header: 'Medias', type: 'select', options: OPCIONES_COLOR, enTabla: false },
  { field: 'direccion', header: 'Dirección', type: 'text' },
  { field: 'codigopostal', header: 'Código postal', type: 'text' },
  { field: 'localidad', header: 'Localidad', type: 'text' },
  { field: 'provincia', header: 'Provincia', type: 'text' }
];

const emptyItem = { nombre: '', escudo: null, camiseta: null, calzonas: null, medias: null, direccion: '', codigopostal: '', localidad: '', provincia: '' };

async function descargarEscudosExternos(data) {
  const tieneExternos = (data || []).some(e => e.escudo && /^https?:\/\//i.test(e.escudo));
  if (!tieneExternos) return;
  try {
    const resultado = await equiposService.descargarEscudos();
    if (resultado.descargados > 0) {
      toast.add({ severity: 'success', summary: 'Escudos', detail: `${resultado.descargados} escudos descargados y guardados.`, life: 4000 });
      dtRef.value?.cargar?.();
    }
  } catch {
    /* silently ignore */
  }
}

function direccionCompleta(data) {
  return [data.direccion, data.codigopostal, data.localidad, data.provincia].filter(Boolean).join(', ');
}

function mapsQuery(parte) {
  return encodeURIComponent(parte || '');
}

function mapsUrl(parte) {
  return `https://www.google.com/maps/search/?api=1&query=${mapsQuery(parte)}`;
}

function mapsEmbedUrl(parte) {
  return `https://maps.google.com/maps?q=${mapsQuery(parte)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

async function copiarDireccion(parte) {
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
<SectionGuard seccion="equipos">
  <CrudDataTable
    ref="dtRef"
    title="Equipos"
    :columns="columns"
    :service="equiposService"
    :emptyItem="emptyItem"
    @data-loaded="descargarEscudosExternos"
  >
    <template #cell-equipacion="{ data }">
      <div v-if="data.camiseta || data.calzonas || data.medias" class="flex items-center gap-2">
        <EquipacionPrenda tipo="camiseta" :color="data.camiseta" :size="26" />
        <EquipacionPrenda tipo="calzonas" :color="data.calzonas" :size="26" />
        <EquipacionPrenda tipo="medias" :color="data.medias" :size="26" />
      </div>
    </template>

    <template #detail-camiseta="{ data }">
      <div v-if="data.camiseta" class="flex items-center gap-3">
        <EquipacionPrenda tipo="camiseta" :color="data.camiseta" :size="40" />
        <span>{{ data.camiseta }}</span>
      </div>
      <span v-else>—</span>
    </template>
    <template #detail-calzonas="{ data }">
      <div v-if="data.calzonas" class="flex items-center gap-3">
        <EquipacionPrenda tipo="calzonas" :color="data.calzonas" :size="40" />
        <span>{{ data.calzonas }}</span>
      </div>
      <span v-else>—</span>
    </template>
    <template #detail-medias="{ data }">
      <div v-if="data.medias" class="flex items-center gap-3">
        <EquipacionPrenda tipo="medias" :color="data.medias" :size="40" />
        <span>{{ data.medias }}</span>
      </div>
      <span v-else>—</span>
    </template>

    <template #cell-direccion="{ data }">
      <a
        v-if="data.direccion"
        :href="mapsUrl(direccionCompleta(data))"
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
        <span class="break-words">{{ direccionCompleta(data) }}</span>
        <Button
          type="button"
          icon="pi pi-copy"
          label="Copiar"
          text
          severity="secondary"
          @click="copiarDireccion(direccionCompleta(data))"
        />
      </div>
      <span v-else>—</span>
    </template>

    <template #detail-extra="{ data }">
      <div v-if="data.direccion || data.localidad" class="mt-3 space-y-2">
        <div class="text-sm font-medium text-ink-secondary">
          <i class="pi pi-map-marker mr-1"></i>
          Ubicación
        </div>
        <iframe
          :src="mapsEmbedUrl(direccionCompleta(data))"
          class="w-full rounded-lg border border-line"
          style="height: 260px"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
        <a
          :href="mapsUrl(direccionCompleta(data))"
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
</SectionGuard>
</template>