// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PrimeVue from 'primevue/config';

const auth = {
  login: vi.fn(async () => ({ twofa: 'verificar', nombre: 'Ana' })),
  verificar2fa: vi.fn(async () => { throw { response: { data: { message: 'Código incorrecto.' } } }; }),
  enrolar2faInicio: vi.fn(async () => ({ qr: '', secret: 'X' })),
  primeraSeccion: 'dashboard'
};
vi.mock('../stores/auth.store', () => ({ useAuthStore: () => auth }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import Login from '../views/auth/Login.vue';

describe('Login · código del Authenticator', () => {
  it('tras la contraseña el cursor queda en el campo del código, también si el código falla', async () => {
    const w = mount(Login, { attachTo: document.body, global: { plugins: [PrimeVue], stubs: { 'router-link': true } } });
    await w.find('#usuario').setValue('ana');
    await w.find('form input[type="password"]').setValue('Secreta#1');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(document.activeElement?.id).toBe('codigo');

    document.activeElement.blur();
    await w.find('#codigo').setValue('000000');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(document.activeElement?.id).toBe('codigo');
    w.unmount();
  });
});
