<script setup>
import { reactive, ref, computed, watch } from 'vue';
import Checkbox from 'primevue/checkbox';
import FirmaDatosForm from './FirmaDatosForm.vue';
import { DATOS_POR_DEFECTO, generarFirmaHtml } from '../utils/firmaEmail';

/** Firma de una cuenta de Correos (misma plantilla que Firma Email, con el
 * email de la cuenta). Rellena `form.firma_datos` y `form.firma_html` del
 * formulario de CrudDataTable; sin firma, los dos van a null. */
const props = defineProps({
  form: { type: Object, required: true }
});

const conFirma = ref(props.form.id ? !!props.form.firma_html : true);
const datos = reactive({ ...DATOS_POR_DEFECTO, ...(props.form.firma_datos || {}) });
delete datos.email;

const html = computed(() => generarFirmaHtml({ ...datos, email: props.form.email || '' }));

watch([conFirma, datos, html], () => {
  /* eslint-disable vue/no-mutating-props -- es el formulario de CrudDataTable */
  props.form.firma_datos = conFirma.value ? { ...datos } : null;
  props.form.firma_html = conFirma.value ? html.value : null;
  /* eslint-enable vue/no-mutating-props */
}, { immediate: true, deep: true });

// Vista previa en un iframe sin scripts, como en Firma Email.
const documentoPrevia = computed(() =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:12px;background:#fff;}</style></head><body>${html.value}</body></html>`
);
</script>

<template>
  <div class="flex flex-col gap-3 border-t border-line pt-3">
    <label class="flex items-center gap-2 text-sm font-semibold text-club-green">
      <Checkbox v-model="conFirma" :binary="true" /> Firma de los correos de esta cuenta
    </label>
    <template v-if="conFirma">
      <p class="text-xs text-ink-tertiary">
        Como en Firma Email: se añade al final de los correos que salen desde esta cuenta, con su email y la web y las
        redes del club.
      </p>
      <FirmaDatosForm :datos="datos" :emailFijo="form.email || ' '" prefijo="firma-cuenta" />
      <iframe :srcdoc="documentoPrevia" sandbox="" title="Vista previa de la firma"
              class="w-full h-56 rounded-lg border border-line bg-white"></iframe>
    </template>
  </div>
</template>
