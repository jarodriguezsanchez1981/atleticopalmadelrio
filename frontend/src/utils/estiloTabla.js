/** Aspecto común de todas las tablas (DataTable de PrimeVue): se aplica con
 * <DataTable v-bind="estiloTabla" ...>. Los estilos de .ar-datatable están en
 * assets/main.css. */
export const estiloTabla = {
  class: 'ar-datatable bg-white rounded-xl overflow-x-auto border border-line',
  rowHover: true,
  stripedRows: true,
  pt: {
    header: { class: 'ar-dt-header !bg-white' },
    rowgroupfooter: { class: '!bg-club-cream' },
    footer: { class: '!bg-club-cream' },
    paginator: { class: 'ar-dt-paginator !bg-white' }
  }
};
