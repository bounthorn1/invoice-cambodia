export type DocKind = 'invoice' | 'quotation' | 'receipt';

export interface NumberingConfig { prefix: string; padding: number; startAt: number }
/** counters[kind] = last sequence ever issued. It only increases, so deleted numbers are never reused. */
export type Counters = Partial<Record<DocKind, number>>;

export const DEFAULT_NUMBERING: Record<DocKind, NumberingConfig> = {
  invoice: { prefix: 'INV', padding: 6, startAt: 1 },
  quotation: { prefix: 'QUO', padding: 6, startAt: 1 },
  receipt: { prefix: 'REC', padding: 6, startAt: 1 },
};

export function formatDocNumber(cfg: NumberingConfig, seq: number): string {
  return `${cfg.prefix}-${String(seq).padStart(cfg.padding, '0')}`;
}

/** Pure allocation: returns the new number and the updated counters. Caller persists atomically. */
export function allocateNumber(
  kind: DocKind, cfg: NumberingConfig, counters: Counters,
): { number: string; seq: number; counters: Counters } {
  const last = counters[kind] ?? cfg.startAt - 1;
  const seq = Math.max(last + 1, cfg.startAt);
  return { number: formatDocNumber(cfg, seq), seq, counters: { ...counters, [kind]: seq } };
}
