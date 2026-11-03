import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CircleHelp, RotateCcw, X } from 'lucide-react';
import { classifiedEntry, isReversed, money } from './domain';
import type { Car, Entry, State } from './domain';

export const categories = ['Запчасти', 'Ремонт', 'Диагностика', 'Доставка', 'Подготовка', 'Реклама', 'Прочее'];
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}
export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab') return;
      const elements = [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]') ?? [])];
      const first = elements[0], last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
      <div className="modal-header"><div><div className="eyebrow">АВТОКАПИТАЛ / ДЕМО</div><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={21} /></button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}
export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' | 'green' }) {
  return <div className={`notice ${tone}`}><CircleHelp size={17} /><div>{children}</div></div>;
}
export function ErrorMessage({ error }: { error: string }) { return error ? <div className="form-error" role="alert">{error}</div> : null; }
export function StatLine({ label, value, strong = false, note }: { label: string; value: ReactNode; strong?: boolean; note?: string }) {
  return <div className={`stat-line ${strong ? 'strong' : ''}`}><span>{label}{note && <small>{note}</small>}</span><b>{value}</b></div>;
}
export function CarArt({ car, small = false }: { car: Car; small?: boolean }) {
  return <div className={`car-art ${small ? 'small' : ''}`} style={{ '--car-color': car.color } as React.CSSProperties}>
    <svg viewBox="0 0 320 145" fill="none" aria-hidden="true"><ellipse cx="164" cy="121" rx="125" ry="9" fill="#142a2520" /><path d="M39 91l13-20 45-12 28-31c8-7 18-10 29-10h53c14 0 22 5 31 15l25 31 25 8c10 3 16 12 16 24v15H35V99c0-4 1-6 4-8z" fill="var(--car-color)" /><path d="M104 59l28-29h24v30l-52-1zM164 30h40c10 0 17 4 23 11l15 19h-78V30z" fill="#233e3b" /><path d="M38 93h54m16 0h133m18 0h43" stroke="#ffffff55" strokeWidth="2" /><path d="M156 64v38m89-36 4 33" stroke="#1d3c3733" strokeWidth="2" /><rect x="167" y="70" width="16" height="3" rx="1.5" fill="#24413b77" /><path d="M44 79h27l-9 9H38m238-9h20v10h-16l-4-10z" fill="#f6eed7" /><circle cx="91" cy="108" r="23" fill="#263b36" /><circle cx="91" cy="108" r="13" fill="#d9e0dc" /><circle cx="91" cy="108" r="7" fill="#8b9d95" /><circle cx="252" cy="108" r="23" fill="#263b36" /><circle cx="252" cy="108" r="13" fill="#d9e0dc" /><circle cx="252" cy="108" r="7" fill="#8b9d95" /></svg>
  </div>;
}
export function EntryRow({ state, entry, onClick }: { state: State; entry: Entry; onClick: () => void }) {
  const e = classifiedEntry(state, entry);
  const positive = ['capital_in', 'sale_payment', 'own_deposit', 'personal_deposit', 'expense_reversal'].includes(e.kind);
  const neutral = ['transfer', 'to_personal', 'to_business'].includes(e.kind);
  const reversed = isReversed(state, e.id);
  const unknown = e.kind === 'expense' && e.scope === 'unknown';
  const car = state.cars.find(c => c.id === e.carId);
  const account = state.accounts.find(a => a.id === e.accountId);
  const Icon = e.kind === 'expense_reversal' ? RotateCcw : neutral ? ArrowLeftRight : positive ? ArrowDownLeft : ArrowUpRight;
  return <button className={`entry-row ${reversed ? 'reversed' : ''}`} onClick={onClick}>
    <span className={`entry-icon ${unknown ? 'amber' : positive ? 'green' : ''}`}><Icon size={18} /></span>
    <span className="entry-copy"><b>{e.label}</b><span>{car?.nickname ?? (e.scope === 'business' ? 'Общие расходы' : e.kind === 'personal_spend' ? 'Личная часть кошелька' : account?.name)}{car && account && ` · ${account.name}`}</span></span>
    <span className="entry-end"><b className={positive ? 'positive' : ''}>{neutral ? '' : positive ? '+' : '−'}{money(e.amount)}</b>{unknown ? <span className="mini-label amber">Уточнить</span> : reversed ? <span className="mini-label">Отменена</span> : e.kind === 'expense_reversal' ? <span className="mini-label">Исправление</span> : null}</span>
  </button>;
}
