<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useAuthStore } from '../../stores/auth.store';
import FooterSponsors from '../../components/FooterSponsors.vue';

const usuario = ref('');
const password = ref('');
const error = ref('');
const enviando = ref(false);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  error.value = '';
  if (!usuario.value || !password.value) {
    error.value = 'Introduce tu usuario y tu contraseña.';
    return;
  }
  enviando.value = true;
  try {
    await auth.login(usuario.value, password.value);
    const redirect = route.query.redirect;
    if (redirect && typeof redirect === 'string') {
      router.replace(redirect);
    } else {
      router.replace({ name: auth.primeraSeccion });
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'No se ha podido iniciar sesión.';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="h-screen w-full flex flex-col bg-club-cream overflow-hidden">
    <div class="flex-1 flex items-center justify-center px-4 overflow-y-auto">
      <div class="w-full max-w-sm">
        <!-- Escudo del club, centrado -->
        <div class="flex flex-col items-center mb-8">
          <img
            src="/escudo.png"
            alt="Escudo Atlético Palma del Río"
            class="w-32 h-auto object-contain select-none"
            width="128"
            height="144"
          />
          <h1 class="mt-5 font-display text-xl text-ink-primary tracking-wide text-center">
            Atlético Palma del Río
          </h1>
          <p class="text-ink-tertiary text-sm mt-1">Intranet de gestión del club</p>
        </div>

        <!-- Formulario de acceso -->
        <form @submit.prevent="onSubmit" class="bg-white rounded-lg border border-line p-8 space-y-5">
          <div class="flex flex-col gap-2">
            <label for="usuario" class="text-sm font-medium text-ink-secondary">Usuario</label>
            <InputText id="usuario" v-model="usuario" autocomplete="username" placeholder="tu.usuario" class="w-full" />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-medium text-ink-secondary">Contraseña</label>
            <Password
              id="password"
              v-model="password"
              autocomplete="current-password"
              placeholder="••••••••"
              :feedback="false"
              toggleMask
              inputClass="w-full"
              class="w-full"
            />
          </div>

          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

          <Button
            type="submit"
            label="Enviar"
            icon="pi pi-sign-in"
            :loading="enviando"
            class="w-full !bg-club-green !border-club-green hover:!bg-club-greenLight"
          />
        </form>

        <p class="text-center text-xs text-ink-tertiary mt-6">
          © {{ new Date().getFullYear() }} Atlético Palma del Río
        </p>
      </div>
    </div>

    <FooterSponsors :with-border="false" />
  </div>
</template>
