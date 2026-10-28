<script setup>
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';

/** Campos de la firma de correo (plantilla de utils/firmaEmail.js). Lo usan
 * Firma Email y la firma de cada cuenta de Correos. `datos` es un objeto
 * reactivo que se edita en su sitio; con `emailFijo` el email no se escribe:
 * es el de la cuenta. */
defineProps({
  datos: { type: Object, required: true },
  emailFijo: { type: String, default: '' },
  prefijo: { type: String, default: 'firma' }
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-nombre`">Nombre y apellidos</label>
        <InputText :id="`${prefijo}-nombre`" v-model="datos.nombre" placeholder="Nombre Apellidos" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-cargo`">Cargo</label>
        <InputText :id="`${prefijo}-cargo`" v-model="datos.cargo" placeholder="Coordinador de fútbol base" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-telefono`">Teléfono</label>
        <InputText :id="`${prefijo}-telefono`" v-model="datos.telefono" placeholder="600 000 000" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-email`">Email</label>
        <InputText v-if="emailFijo" :id="`${prefijo}-email`" :modelValue="emailFijo" disabled />
        <InputText v-else :id="`${prefijo}-email`" v-model="datos.email" placeholder="nombre@atleticopalmadelrio.com" />
      </div>
      <div class="flex flex-col gap-1 sm:col-span-2">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-direccion`">Dirección</label>
        <InputText :id="`${prefijo}-direccion`" v-model="datos.direccion" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-color1`">Color principal</label>
        <div class="flex items-center gap-2">
          <input :id="`${prefijo}-color1`" v-model="datos.colorPrincipal" type="color" class="h-9 w-12 rounded border border-line" />
          <InputText v-model="datos.colorPrincipal" class="flex-1" />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-color2`">Color del cargo</label>
        <div class="flex items-center gap-2">
          <input :id="`${prefijo}-color2`" v-model="datos.colorSecundario" type="color" class="h-9 w-12 rounded border border-line" />
          <InputText v-model="datos.colorSecundario" class="flex-1" />
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-4">
      <label class="flex items-center gap-2 text-sm text-ink-secondary">
        <Checkbox v-model="datos.mostrarEscudo" :binary="true" /> Mostrar escudo
      </label>
      <label class="flex items-center gap-2 text-sm text-ink-secondary">
        <Checkbox v-model="datos.mostrarAviso" :binary="true" /> Aviso legal
      </label>
      <label class="flex items-center gap-2 text-sm text-ink-secondary">
        <Checkbox v-model="datos.noResponder" :binary="true" /> Aviso «no responda a este correo»
      </label>
    </div>
    <div v-if="datos.mostrarAviso" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-ink-secondary" :for="`${prefijo}-aviso`">Texto del aviso legal</label>
      <Textarea :id="`${prefijo}-aviso`" v-model="datos.aviso" rows="4" autoResize />
    </div>
  </div>
</template>
