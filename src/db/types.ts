import type { Currency } from '../lib/money.ts';
import type { Discount, TaxMode, TaxScope } from '../lib/calc.ts';
import type { Counters } from '../lib/numbering.ts';
import type { InvoiceStatus } from '../lib/payments.ts';

export type Lang = 'km' | 'en';
export type TemplateId = 'modern' | 'classic' | 'minimal' | 'elegant' | 'bold' | 'fresh';

export interface BusinessProfile {
  id: string; // UUID
  name: string; legalName?: string; logoDataUrl?: string;
  email?: string; phone?: string; address?: string; city?: string; country?: string; website?: string;
  taxId?: string; bankName?: string; bankAccountName?: string; bankAccountNumber?: string;
  defaultCurrency: Currency; defaultLanguage: Lang; paymentInstructions?: string;
  createdAt: string; updatedAt: string;
}

export interface Customer {
  id: string; type: 'individual' | 'company'; name: string; companyName?: string;
  email?: string; phone?: string; address?: string; city?: string; country?: string; taxId?: string; notes?: string;
  createdAt: string; updatedAt: string;
}

export interface DocItem {
  id: string; documentId: string; position: number;
  description: string; quantityMilli: number; unit: string; unitPriceMinor: number;
  discount?: Discount; taxRateBps?: number; taxExempt?: boolean;
}

/** Documents carry full snapshots so later edits/deletes of profiles or customers never alter history. */
interface DocBase {
  id: string; number: string; businessSnapshot: BusinessProfile; customerSnapshot: Customer;
  customerId: string; businessId: string; issueDate: string; currency: Currency;
  discount?: Discount; taxMode: TaxMode; taxScope: TaxScope; documentTaxRateBps?: number; applyTaxAfterDiscount: boolean;
  notes?: string; terms?: string; footer?: string; templateId: TemplateId; createdAt: string; updatedAt: string;
}
export interface Invoice extends DocBase {
  dueDate: string; paymentTerms?: string; status: InvoiceStatus; sourceQuotationId?: string;
}
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export interface Quotation extends DocBase {
  validUntil: string; status: QuotationStatus; convertedInvoiceId?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'aba' | 'acleda' | 'wing' | 'other';
export interface Payment {
  id: string; invoiceId: string; date: string; amountMinor: number; currency: Currency;
  method: PaymentMethod; reference?: string; notes?: string; createdAt: string;
}
export interface Receipt {
  id: string; number: string; paymentId: string; invoiceId: string;
  businessSnapshot: BusinessProfile; customerSnapshot: Customer; createdAt: string;
}
export interface TaxProfile {
  id: string; name: string; rateBps: number; enabled: boolean; mode: TaxMode;
  applyTo: TaxScope; applyAfterDiscount: boolean; isDefault: boolean;
}
export interface AppSettings {
  id: 'app'; language: Lang; defaultCurrency: Currency; dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  defaultTemplate: TemplateId; counters: Counters;
  numbering: Record<'invoice' | 'quotation' | 'receipt', { prefix: string; padding: number; startAt: number }>;
  defaultPaymentTerms?: string; defaultNotes?: string; defaultFooter?: string;
}
