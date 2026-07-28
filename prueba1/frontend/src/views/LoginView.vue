<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useAuthStore } from '../stores/auth.store';
import clubShield from '../assets/escudo-club.png';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function handleSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push({ name: 'dashboard' });
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo iniciar sesion.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-club-primary">
    <form @submit.prevent="handleSubmit" class="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm space-y-4">
      <img :src="clubShield" alt="Escudo Atletico Palma del Rio" class="w-24 h-24 mx-auto object-contain" />
      <h1 class="text-2xl font-bold text-club-primary text-center">Intranet Atletico Palma del Rio</h1>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <div class="space-y-1">
        <label class="text-sm font-medium">Email</label>
        <InputText v-model="email" type="email" class="w-full" required />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">Contrasena</label>
        <Password v-model="password" :feedback="false" toggleMask class="w-full" inputClass="w-full" required />
      </div>

      <Button type="submit" label="Entrar" class="w-full" :loading="loading" />
    </form>
  </div>
</template>
