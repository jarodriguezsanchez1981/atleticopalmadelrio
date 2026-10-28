<script setup>
import { ref, watch, onMounted } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { cuentasCorreoService } from '../services';

/** Campo «Activa» de una cuenta de Correos: solo aparece cuando la
 * configuración SMTP del formulario pasa la prueba interna (conexión e inicio
 * de sesión, sin enviar correo). Al editar una cuenta se prueba al abrir, con
 * la contraseña guardada. Si se cambia la configuración, hay que volver a
 * probar y la cuenta deja de estar activa. Rellena `form.activa`. */
const props = defineProps({
  form: { type: Object, required: true }
});

const opcionesActiva = [
  { label: 'No', value: false },
  { label: 'Sí (la usa la web para enviar)', value: true }
];

// 'sin-probar' | 'probando' | 'ok' | 'error'
const estado = ref('sin-probar');
const mensaje = ref('');

const camposSmtp = () => [
  props.form.smtp_host, props.form.smtp_port, props.form.smtp_secure, props.form.smtp_user, props.form.smtp_password
];

async function probar() {
  estado.value = 'probando';
  mensaje.value = '';
  try {
    const r = await cuentasCorreoService.verificar({
      id: props.form.id,
      smtp_host: props.form.smtp_host,
      smtp_port: props.form.smtp_port,
      smtp_secure: props.form.smtp_secure,
      smtp_user: props.form.smtp_user,
      smtp_password: props.form.smtp_password
    });
    estado.value = 'ok';
    mensaje.value = r.message;
  } catch (err) {
    estado.value = 'error';
    mensaje.value = err.response?.data?.message || 'No se pudo comprobar la configuración.';
    props.form.activa = false; // eslint-disable-line vue/no-mutating-props -- formulario de CrudDataTable
  }
}

watch(camposSmtp, () => {
  if (estado.value === 'probando') return;
  estado.value = 'sin-probar';
  mensaje.value = '';
  props.form.activa = false; // eslint-disable-line vue/no-mutating-props -- formulario de CrudDataTable
});

// Al editar una cuenta con contraseña guardada, se prueba al abrir.
onMounted(() => {
  if (props.form.id && props.form.tiene_password) probar();
});
</script>

<template>
  <div class="flex flex-col gap-2 border-t border-line pt-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-sm font-semibold text-club-green">Comprobar configuración</div>
      <Button label="Comprobar" icon="pi pi-check-circle" severity="secondary" outlined size="small"
              :loading="estado === 'probando'" @click="probar" />
    </div>
    <p v-if="estado === 'sin-probar'" class="text-xs text-ink-tertiary">
      Para poder marcar la cuenta como <strong>Activa</strong>, comprueba antes que la configuración SMTP funciona
      (se conecta e inicia sesión en el servidor, sin enviar ningún correo).
    </p>
    <p v-else-if="estado === 'probando'" class="text-xs text-ink-tertiary">Comprobando la configuración…</p>
    <p v-else-if="estado === 'error'" class="text-xs text-club-garnet">
      <i class="pi pi-times-circle text-[0.7rem]" /> {{ mensaje }}
    </p>
    <template v-else>
      <p class="text-xs text-club-green"><i class="pi pi-check-circle text-[0.7rem]" /> {{ mensaje }}</p>
      <div class="flex flex-col gap-1.5">
        <label for="activa" class="text-sm font-medium text-ink-secondary">Activa</label>
        <!-- eslint-disable-next-line vue/no-mutating-props -- formulario de CrudDataTable -->
        <Select id="activa" v-model="form.activa" :options="opcionesActiva" optionLabel="label" optionValue="value"
                class="w-full" />
      </div>
    </template>
  </div>
</template>
