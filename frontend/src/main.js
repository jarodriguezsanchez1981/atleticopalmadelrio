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
  primitive: {
    borderRadius: { none: '0', xs: '3px', sm: '6px', md: '8px', lg: '10px', xl: '14px' }
  },
  semantic: {
    primary: {
      50: '#F1F3F2', 100: '#DDE4E0', 200: '#BCC9C1',
      300: '#8CA295', 400: '#527360', 500: '#0F3D22',
      600: '#0D361E', 700: '#0B2C18', 800: '#082213',
      900: '#06170D', 950: '#040F08'
    },
    surface: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e7e7e9',
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
