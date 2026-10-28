<script setup>
import { ref } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import { equiposService } from '../../services';
import { OPCIONES_COLOR, OPCIONES_COLOR_RAYAS, RAYAS, esRayas, descomponerRayas, etiquetaPrenda } from '../../utils/coloresEquipacion';
import EquipacionPrenda from '../../components/EquipacionPrenda.vue';

const toast = useToast();
const dtRef = ref();
const errorEliminar = ref(null);

const PRENDAS_CON_RAYAS = ['camiseta', 'calzonas', 'medias'];
const ETIQUETA_PRENDA = { camiseta: 'la camiseta', calzonas: 'las calzonas', medias: 'las medias' };

/** Al editar un equipo con alguna prenda a rayas, separa el valor guardado en los 2 combos de color de esa prenda. */
function prepararEdicionEquipo(item) {
  const cambios = {};
  PRENDAS_CON_RAYAS.forEach((campo) => {
    if (esRayas(item[campo])) {
      const [c1, c2] = descomponerRayas(item[campo]);
      cambios[campo] = RAYAS;
      cambios[`${campo}Color1`] = c1;
      cambios[`${campo}Color2`] = c2;
    } else {
      cambios[`${campo}Color1`] = null;
      cambios[`${campo}Color2`] = null;
    }
  });
  return cambios;
}

function validarEquipo(form) {
  for (const campo of PRENDAS_CON_RAYAS) {
    if (form[campo] === RAYAS && (!form[`${campo}Color1`] || !form[`${campo}Color2`])) {
      return `Selecciona los 2 colores de ${ETIQUETA_PRENDA[campo]} a rayas.`;
    }
  }
  return null;
}

function onDeleteError(data) {
  errorEliminar.value = data;
}

const columns = [
  { field: 'escudo', header: 'Escudo', type: 'image' },
  { field: 'nombre', header: 'Nombre', type: 'text', required: true },
  {
    field: 'equipacion',
    header: 'Equipación',
    soloTabla: true,
    format: (v, d) => [etiquetaPrenda(d.camiseta), etiquetaPrenda(d.calzonas), etiquetaPrenda(d.medias)].filter(Boolean).join(' / ')
  },
  { field: 'camiseta', header: 'Camiseta', type: 'select', options: OPCIONES_COLOR_RAYAS, enTabla: false },
  { field: 'calzonas', header: 'Calzonas', type: 'select', options: OPCIONES_COLOR_RAYAS, enTabla: false },
  { field: 'medias', header: 'Medias', type: 'select', options: OPCIONES_COLOR_RAYAS, enTabla: false },
  { field: 'direccion', header: 'Dirección', type: 'text' },
  { field: 'codigopostal', header: 'Código postal', type: 'text' },
  { field: 'localidad', header: 'Localidad', type: 'text' },
  { field: 'provincia', header: 'Provincia', type: 'text' }
];

const emptyItem = {
  nombre: '', escudo: null,
  camiseta: null, camisetaColor1: null, camisetaColor2: null,
  calzonas: null, calzonasColor1: null, calzonasColor2: null,
  medias: null, mediasColor1: null, mediasColor2: null,
  direccion: '', codigopostal: '', localidad: '', provincia: ''
};

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
  if (!parte) return;
  try {
    await navigator.clipboard.writeText(parte);
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
    seccion="equipos"
    :columns="columns"
    :service="equiposService"
    :emptyItem="emptyItem"
    :prepareEdit="prepararEdicionEquipo"
    :validateForm="validarEquipo"
    @data-loaded="descargarEscudosExternos"
    @delete-error="onDeleteError"
  >
    <template #cell-equipacion="{ data }">
      <div v-if="data.camiseta || data.calzonas || data.medias" class="flex items-center gap-2">
        <EquipacionPrenda tipo="camiseta" :color="data.camiseta" :size="26" />
        <EquipacionPrenda tipo="calzonas" :color="data.calzonas" :size="26" />
        <EquipacionPrenda tipo="medias" :color="data.medias" :size="26" />
      </div>
    </template>

    <template #form-after-camiseta="{ form }">
      <div v-if="form.camiseta === RAYAS" class="flex gap-3">
        <div class="flex-1 flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Color 1</label>
          <Select v-model="form.camisetaColor1" :options="OPCIONES_COLOR" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un color" class="w-full" showClear />
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Color 2</label>
          <Select v-model="form.camisetaColor2" :options="OPCIONES_COLOR" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un color" class="w-full" showClear />
        </div>
      </div>
    </template>

    <template #form-after-calzonas="{ form }">
      <div v-if="form.calzonas === RAYAS" class="flex gap-3">
        <div class="flex-1 flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Color 1</label>
          <Select v-model="form.calzonasColor1" :options="OPCIONES_COLOR" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un color" class="w-full" showClear />
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Color 2</label>
          <Select v-model="form.calzonasColor2" :options="OPCIONES_COLOR" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un color" class="w-full" showClear />
        </div>
      </div>
    </template>

    <template #form-after-medias="{ form }">
      <div v-if="form.medias === RAYAS" class="flex gap-3">
        <div class="flex-1 flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Color 1</label>
          <Select v-model="form.mediasColor1" :options="OPCIONES_COLOR" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un color" class="w-full" showClear />
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <label class="text-sm font-medium text-ink-secondary">Color 2</label>
          <Select v-model="form.mediasColor2" :options="OPCIONES_COLOR" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un color" class="w-full" showClear />
        </div>
      </div>
    </template>

    <template #detail-camiseta="{ data }">
      <div v-if="data.camiseta" class="flex items-center gap-3">
        <EquipacionPrenda tipo="camiseta" :color="data.camiseta" :size="40" />
        <span>{{ etiquetaPrenda(data.camiseta) }}</span>
      </div>
      <span v-else>—</span>
    </template>
    <template #detail-calzonas="{ data }">
      <div v-if="data.calzonas" class="flex items-center gap-3">
        <EquipacionPrenda tipo="calzonas" :color="data.calzonas" :size="40" />
        <span>{{ etiquetaPrenda(data.calzonas) }}</span>
      </div>
      <span v-else>—</span>
    </template>
    <template #detail-medias="{ data }">
      <div v-if="data.medias" class="flex items-center gap-3">
        <EquipacionPrenda tipo="medias" :color="data.medias" :size="40" />
        <span>{{ etiquetaPrenda(data.medias) }}</span>
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

  <Message v-if="errorEliminar" severity="error" :closable="true" @close="errorEliminar = null" class="mt-3">
    <div class="space-y-2">
      <p class="font-medium">{{ errorEliminar.message || 'No se pudo eliminar el equipo.' }}</p>
      <div v-for="(bloq, i) in errorEliminar.bloqueantes" :key="i" class="text-sm">
        <p class="text-ink-tertiary">
          Registros en <strong>{{ bloq.tabla }}</strong> ({{ bloq.campo }}) que impiden el borrado:
        </p>
        <ul class="list-disc list-inside mt-1">
          <li v-for="(linea, j) in bloq.detalle" :key="j">{{ linea }}</li>
        </ul>
      </div>
    </div>
  </Message>
</SectionGuard>
</template>