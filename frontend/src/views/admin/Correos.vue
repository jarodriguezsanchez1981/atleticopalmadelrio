<script setup>
import { computed } from 'vue';
import CrudDataTable from '../../components/CrudDataTable.vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FirmaCuentaCorreo from '../../components/FirmaCuentaCorreo.vue';
import { cuentasCorreoService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

const opcionesSecure = [
  { label: 'No — STARTTLS (normalmente puerto 587)', value: false },
  { label: 'Sí — SSL/TLS directo (normalmente puerto 465)', value: true }
];
const opcionesActiva = [
  { label: 'No', value: false },
  { label: 'Sí (la usa la web para enviar)', value: true }
];

const columns = computed(() => [
  { field: 'etiqueta', header: 'Etiqueta', type: 'text', required: true },
  { field: 'email', header: 'Email', type: 'text', required: true },
  { field: 'smtp_host', header: 'Servidor SMTP', type: 'text', required: true },
  { field: 'smtp_port', header: 'Puerto', type: 'number', required: true },
  { field: 'smtp_secure', header: 'SSL/TLS', type: 'select', options: opcionesSecure,
    format: (v) => (v ? 'SSL/TLS' : 'STARTTLS') },
  { field: 'smtp_user', header: 'Usuario SMTP', type: 'text', required: true },
  { field: 'smtp_password', header: 'Contraseña', type: 'password', requiredOnCreate: true },
  { field: 'tiene_password', header: 'Contraseña', type: 'text', soloTabla: true,
    format: (v) => (v ? 'Configurada' : '—') },
  { field: 'activa', header: 'Activa', type: 'select', options: opcionesActiva,
    format: (v) => (v ? 'Sí' : 'No') }
]);

const emptyItem = {
  etiqueta: '',
  email: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_password: '',
  activa: false,
  firma_datos: null,
  firma_html: null
};

// Vista previa de la firma en un iframe sin scripts (sandbox).
const documentoFirma = (html) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:12px;background:#fff;}</style></head><body>${html}</body></html>`;

function enviarPrueba(data) {
  confirm.require({
    message: `Se enviará un correo de prueba a "${data.email}" usando la configuración de esta cuenta. ¿Continuar?`,
    header: 'Enviar correo de prueba',
    icon: 'pi pi-envelope',
    acceptLabel: 'Enviar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        const r = await cuentasCorreoService.probar(data.id);
        toast.add({ severity: 'success', summary: 'Prueba enviada', detail: r.message, life: 5000 });
      } catch (err) {
        toast.add({ severity: 'error', summary: 'No se pudo enviar', detail: err.response?.data?.message || 'Error al enviar.', life: 7000 });
      }
    }
  });
}
</script>

<template>
  <div v-if="auth.esAdmin">
    <div class="flex items-center gap-2 mb-1">
      <h1 class="font-display text-xl text-club-green flex items-center gap-2">
        <i class="pi pi-envelope" /> Correos
      </h1>
    </div>
    <p class="text-sm text-ink-tertiary mb-4">
      Cuentas de correo internas de la web (p. ej. <code>no-reply</code>). La cuenta marcada como <strong>Activa</strong>
      es la que usa la intranet para enviar correos (recuperación de contraseña, etc.). Solo puede haber una activa.
    </p>

    <Message severity="info" :closable="false" class="mb-4">
      La contraseña SMTP se guarda cifrada y nunca se muestra. Al editar, deja la contraseña vacía para conservar la actual.
      Usa <strong>Enviar correo de prueba</strong> (en el detalle de cada cuenta) para comprobar que las credenciales funcionan.
      La <strong>firma</strong> de cada cuenta (como en Firma Email) se añade al final de los correos que salen de ella.
    </Message>

    <CrudDataTable
      title="Cuentas de correo"
      seccion="administracion"
      :columns="columns"
      :service="cuentasCorreoService"
      :emptyItem="emptyItem"
      formMaxWidth="max-w-2xl"
    >
      <template #cell-activa="{ data }">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="data.activa ? 'bg-club-green/10 text-club-green' : 'bg-gray-100 text-ink-tertiary'">
          <i :class="data.activa ? 'pi pi-check-circle' : 'pi pi-circle'" class="text-[0.7rem]" />
          {{ data.activa ? 'Activa' : 'Inactiva' }}
        </span>
      </template>
      <template #cell-smtp_password>
        <span class="text-ink-tertiary">••••••••</span>
      </template>
      <template #form-extra="{ form }">
        <FirmaCuentaCorreo :form="form" />
      </template>
      <template #detail-extra="{ data }">
        <div v-if="data.firma_html" class="flex flex-col gap-1 border-t border-line pt-3 mt-1">
          <div class="text-xs font-medium text-ink-secondary">Firma</div>
          <iframe :srcdoc="documentoFirma(data.firma_html)"
                  sandbox="" title="Firma de la cuenta" class="w-full h-56 rounded-lg border border-line bg-white"></iframe>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-line pt-3 mt-1">
          <div class="text-sm text-ink-secondary">
            Comprueba que esta cuenta puede enviar correo.
          </div>
          <Button label="Enviar correo de prueba" icon="pi pi-send" severity="secondary" outlined size="small"
                  @click="enviarPrueba(data)" />
        </div>
      </template>
    </CrudDataTable>
  </div>

  <div v-else class="text-center py-16 text-ink-tertiary">
    <i class="pi pi-lock text-4xl block mb-3"></i>
    <p class="text-lg font-medium">Solo el administrador principal puede ver esta sección.</p>
  </div>
</template>
