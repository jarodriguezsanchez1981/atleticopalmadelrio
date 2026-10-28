<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { authService } from '../../services';

const route = useRoute();
const token = ref(String(route.query.token || ''));

const comprobando = ref(true);
const tokenValido = ref(false);
const password = ref('');
const confirmacion = ref('');
const enviando = ref(false);
const hecho = ref(false);
const error = ref('');

onMounted(async () => {
  if (!token.value) {
    comprobando.value = false;
    tokenValido.value = false;
    return;
  }
  try {
    const { valido } = await authService.validarTokenReset(token.value);
    tokenValido.value = !!valido;
  } catch {
    tokenValido.value = false;
  } finally {
    comprobando.value = false;
  }
});

async function onSubmit() {
  error.value = '';
  if (!password.value || !confirmacion.value) {
    error.value = 'Escribe la nueva contraseña dos veces.';
    return;
  }
  if (password.value !== confirmacion.value) {
    error.value = 'Las dos contraseñas no coinciden.';
    return;
  }
  enviando.value = true;
  try {
    await authService.restablecerPassword(token.value, password.value, confirmacion.value);
    hecho.value = true;
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido restablecer la contraseña.';
    // Si el token ha caducado entre la carga y el envío, se refleja en la vista.
    if (err.response?.status === 400 && /válido|caducado/i.test(err.response?.data?.message || '')) {
      tokenValido.value = false;
    }
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
          <h2 class="font-display text-lg">Nueva contraseña</h2>
        </div>

        <p v-if="comprobando" class="text-sm text-ink-secondary">Comprobando el enlace…</p>

        <template v-else-if="hecho">
          <Message severity="success" :closable="false">
            Contraseña restablecida. Ya puedes iniciar sesión con la nueva contraseña (recuerda que seguirás necesitando tu verificación en dos pasos).
          </Message>
          <div class="text-center">
            <router-link to="/login" class="text-sm text-club-green hover:underline">Ir a iniciar sesión</router-link>
          </div>
        </template>

        <template v-else-if="!tokenValido">
          <Message severity="error" :closable="false">
            El enlace no es válido o ha caducado. Solicita uno nuevo.
          </Message>
          <div class="text-center flex flex-col gap-2">
            <router-link to="/recuperar-password" class="text-sm text-club-green hover:underline">Pedir un enlace nuevo</router-link>
            <router-link to="/login" class="text-sm text-ink-tertiary hover:underline">Volver a iniciar sesión</router-link>
          </div>
        </template>

        <template v-else>
          <p class="text-sm text-ink-secondary">
            Elige una contraseña nueva. Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.
          </p>
          <form @submit.prevent="onSubmit" class="space-y-5">
            <div class="flex flex-col gap-2">
              <label for="password" class="text-sm font-medium text-ink-secondary">Nueva contraseña</label>
              <Password id="password" v-model="password" autocomplete="new-password" placeholder="••••••••"
                        toggleMask inputClass="w-full" class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label for="confirmacion" class="text-sm font-medium text-ink-secondary">Repite la contraseña</label>
              <Password id="confirmacion" v-model="confirmacion" autocomplete="new-password" placeholder="••••••••"
                        :feedback="false" toggleMask inputClass="w-full" class="w-full" />
            </div>

            <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

            <Button type="submit" label="Guardar contraseña" icon="pi pi-check" :loading="enviando"
                    class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight" />
          </form>
        </template>
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
