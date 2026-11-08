import Dexie, { type EntityTable } from 'dexie';
import type {
  AppSettings, BusinessProfile, Customer, DocItem, Invoice, Payment, Quotation, Receipt, TaxProfile,
} from './types.ts';

export class InvoiceDB extends Dexie {
  businessProfiles!: EntityTable<BusinessProfile, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  invoices!: EntityTable<Invoice, 'id'>;
  invoiceItems!: EntityTable<DocItem, 'id'>;
  quotations!: EntityTable<Quotation, 'id'>;
  quotationItems!: EntityTable<DocItem, 'id'>;
  payments!: EntityTable<Payment, 'id'>;
  receipts!: EntityTable<Receipt, 'id'>;
  taxProfiles!: EntityTable<TaxProfile, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor(name = 'invoice-cambodia') {
    super(name);
    // Schema v1. For future changes add this.version(2).stores({...}).upgrade(tx => ...) and never edit v1.
    this.version(1).stores({
      businessProfiles: 'id, name, updatedAt',
      customers: 'id, name, type, updatedAt',
      invoices: 'id, &number, customerId, status, issueDate, dueDate, currency',
      invoiceItems: 'id, documentId',
      quotations: 'id, &number, customerId, status, issueDate, currency',
      quotationItems: 'id, documentId',
      payments: 'id, invoiceId, date',
      receipts: 'id, &number, paymentId, invoiceId',
      taxProfiles: 'id, isDefault',
      settings: 'id',
    });
  }
}

export const db = new InvoiceDB();
export const newId = (): string => crypto.randomUUID();
