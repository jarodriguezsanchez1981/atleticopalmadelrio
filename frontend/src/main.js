import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import 'primeicons/primeicons.css';
import './assets/main.css';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';
import { localeEs } from './utils/localeEs';

const ClubPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0f4f2', 100: '#dbe8e2', 200: '#b8d1c6',
      300: '#8fb5a6', 400: '#5e927c', 500: '#0B3D2E',
      600: '#0a3729', 700: '#083023', 800: '#06281d',
      900: '#031b13', 950: '#020f0a'
    },
    surface: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b'
    }
  }
});

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  theme: { preset: ClubPreset, options: { darkModeSelector: false } },
  locale: localeEs
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.use(router);

const authStore = useAuthStore();
authStore.restoreSession().finally(() => {
  app.mount('#app');
});
