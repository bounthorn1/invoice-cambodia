export const en = {
  appName: 'Invoice Cambodia',
  'nav.dashboard': 'Dashboard', 'nav.invoices': 'Invoices', 'nav.quotations': 'Quotations',
  'nav.receipts': 'Receipts', 'nav.customers': 'Customers', 'nav.business': 'Business',
  'nav.templates': 'Templates', 'nav.settings': 'Settings',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit',
  'common.search': 'Search', 'common.confirm': 'Confirm', 'common.language': 'Language',
  'common.menu': 'Menu', 'common.notFound': 'Page not found', 'common.backHome': 'Back to dashboard',
  'common.comingSoon': 'This module is built in a later stage of the project.',
  'doc.invoice': 'Invoice', 'doc.quotation': 'Quotation', 'doc.receipt': 'Receipt',
  'doc.subtotal': 'Subtotal', 'doc.discount': 'Discount', 'doc.tax': 'Tax', 'doc.total': 'Total',
  'doc.amountPaid': 'Amount paid', 'doc.balanceDue': 'Balance due',
  'status.draft': 'Draft', 'status.unpaid': 'Unpaid', 'status.partially_paid': 'Partially paid',
  'status.paid': 'Paid', 'status.overdue': 'Overdue', 'status.cancelled': 'Cancelled',
  'validation.required': 'This field is required', 'validation.overpayment': 'Payment exceeds the balance due',
  'validation.positive': 'Value must be greater than zero',
  'storage.notice': 'Your data is stored only in this browser on this device. Export a backup regularly.',
} as const;
export type TranslationKey = keyof typeof en;
