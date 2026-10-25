<script setup>
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { authService } from '../../services';

const identificador = ref('');
const enviando = ref(false);
const enviado = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  if (!identificador.value.trim()) {
    error.value = 'Escribe tu usuario o tu email.';
    return;
  }
  enviando.value = true;
  try {
    await authService.recuperarPassword(identificador.value.trim());
    // Respuesta genérica siempre: no se revela si la cuenta existe.
    enviado.value = true;
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido procesar la solicitud.';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 login-fondo">
    <div class="w-full max-w-sm">
      <div class="flex flex-col items-center text-center mb-8">
        <img src="/escudo.png" alt="Escudo Atlético Palma del Río" class="h-36 w-auto object-contain select-none" />
        <h1 class="mt-5 font-display text-2xl text-ink-primary tracking-tight">Atlético Palma del Río</h1>
        <p class="text-sm text-ink-tertiary mt-1.5">Intranet de gestión del club</p>
      </div>

      <div class="bg-white rounded-2xl shadow-[0_1px_2px_rgb(16_24_40_/_0.04),0_8px_24px_rgb(16_24_40_/_0.06)] border border-line p-8 space-y-5">
        <div class="flex items-center gap-2 text-ink-primary">
          <i class="pi pi-key text-club-green" />
          <h2 class="font-display text-lg">Recuperar contraseña</h2>
        </div>

        <template v-if="!enviado">
          <p class="text-sm text-ink-secondary">
            Escribe tu usuario o tu email y, si hay una cuenta con correo asociado, te enviaremos un enlace para elegir una contraseña nueva.
          </p>
          <form @submit.prevent="onSubmit" class="space-y-5">
            <div class="flex flex-col gap-2">
              <label for="identificador" class="text-sm font-medium text-ink-secondary">Usuario o email</label>
              <IconField>
                <InputIcon class="pi pi-user" />
                <InputText id="identificador" v-model="identificador" autocomplete="username" placeholder="usuario o correo" class="w-full" />
              </IconField>
            </div>

            <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

            <Button type="submit" label="Enviar enlace" icon="pi pi-send" :loading="enviando"
                    class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight" />
          </form>
        </template>

        <template v-else>
          <Message severity="success" :closable="false">
            Si los datos corresponden a una cuenta con email, te hemos enviado un enlace para restablecer la contraseña. Revisa tu correo (y la carpeta de spam).
          </Message>
          <p class="text-xs text-ink-tertiary">El enlace caduca en 1 hora. Si no llega, vuelve a intentarlo o contacta con un administrador.</p>
        </template>

        <div class="text-center pt-1">
          <router-link to="/login" class="text-sm text-club-green hover:underline">Volver a iniciar sesión</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-fondo {
  background-color: #EEF3F0;
  background-image:
    radial-gradient(42rem 42rem at 12% -8%, rgba(11, 61, 46, 0.14), transparent 60%),
    radial-gradient(46rem 46rem at 112% 114%, rgba(11, 61, 46, 0.12), transparent 58%),
    linear-gradient(180deg, #F3F7F4 0%, #E9F0EB 100%);
  background-attachment: fixed;
}
</style>
