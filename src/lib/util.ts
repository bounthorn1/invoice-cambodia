import type { AppSettings } from '../db/types.ts';
export const today = (): string => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
let currentFmt: AppSettings['dateFormat'] = 'DD/MM/YYYY';
export const setDateFormat = (f: AppSettings['dateFormat']): void => { currentFmt = f; };
export function fmtDate(iso: string | undefined, f: AppSettings['dateFormat'] = currentFmt): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return f === 'YYYY-MM-DD' ? iso : `${d}/${m}/${y}`;
}
export const validDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
/** Validate and downscale an uploaded logo to a PNG/JPEG data URL (max 400px). */
export async function processLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('image');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, 400 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } catch { throw new Error('image'); } finally { URL.revokeObjectURL(url); }
}
export async function downloadPdf(el: HTMLElement, name: string): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const url = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
  const img = new Image(); img.src = url; await img.decode();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, h = (img.height * W) / img.width;
  for (let y = 0, p = 0; y < h - 0.5; y += H, p++) { if (p > 0) pdf.addPage(); pdf.addImage(url, 'PNG', 0, -y, W, h); }
  pdf.save(name);
}
