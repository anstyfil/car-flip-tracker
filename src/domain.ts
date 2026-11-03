export const DEMO_DAY = '2026-11-03';
export const STORAGE_KEY = 'autocapital.demo.v1';
export type Scope = 'car' | 'business' | 'unknown';
export type EntryKind = 'expense' | 'expense_reversal' | 'capital_in' | 'capital_out' | 'sale_payment' | 'purchase_payment' | 'transfer' | 'owner_withdrawal' | 'own_deposit' | 'personal_spend' | 'personal_deposit' | 'to_personal' | 'to_business' | 'reward_payment' | 'owner_repayment';
export type ExpenseFunding = 'business' | 'personal';
export type PersonalUse = 'reimburse' | 'invest';
export type Account = { id: string; name: string; hint: string; kind: 'cash' | 'bank'; opening: number; personalOpening: number };
export type Person = { id: string; name: string; initials: string; role: 'investor' | 'helper'; capitalOpening: number; color: string };
export type Sale = { price: number; date: string; buyer: string };
export type Car = { id: string; name: string; nickname: string; year: number; plate: string; color: string; date: string; purchase: number; purchasePaidOpening: number; importedCosts: number; asking: number; stage: 'Подготовка' | 'В продаже'; investorId?: string; sale?: Sale };
export type Entry = { id: string; kind: EntryKind; amount: number; accountId: string; date: string; label: string; category?: string; scope?: Scope; carId?: string; personId?: string; targetAccountId?: string; originalId?: string; funding?: ExpenseFunding; personalUse?: PersonalUse };
export type Classification = { entryId: string; scope: Scope; carId?: string; category: string; at: string };
export type Draft = { id: string; text: string; amount: string; carId: string; accountId: string; category: string; scope: Scope; date: string; funding?: ExpenseFunding; personalUse?: PersonalUse };
export type Reconciliation = { id: string; accountId: string; actual: number; personal: number; expected: number; expectedPersonal: number; at: string; basis?: 'business' };
export type Allocation = { id: string; carId: string; profit: number; ownerRate: number; helperMode: 'fixed' | 'percent'; helperValue: number; helperSplit: number; investorId: string; helperIds: [string, string]; investor: number; ownerGross: number; helpers: [number, number]; ownerNet: number; at: string };
export type State = { version: 1; accounts: Account[]; people: Person[]; cars: Car[]; entries: Entry[]; classifications: Classification[]; allocations: Allocation[]; reconciliations: Reconciliation[]; drafts: Draft[] };

export const money = (value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: value % 100 ? 2 : 0 }).format(value / 100);
export function amountFromInput(value: string): number {
  const normalized = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Укажите сумму в рублях, например 4 500 или 4500,50.');
  const [rubles, kopecks = ''] = normalized.split('.');
  const result = Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 1_000_000_000_000) throw new Error('Сумма слишком велика для этого прототипа.');
  return result;
}
export function percentFromInput(value: string): number {
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(value.trim())) throw new Error('Укажите процент от 0 до 100, не больше двух знаков после запятой.');
  const parsed = Number(value.replace(',', '.'));
  if (parsed < 0 || parsed > 100) throw new Error('Процент должен быть от 0 до 100.');
  return parsed;
}
function percentOf(amount: number, percent: number): number {
  const bps = Math.round(percent * 100);
  return Number((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
}
function validMoney(amount: number, allowZero = false) {
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1) || amount > 1_000_000_000_000) throw new Error('Укажите корректную сумму.');
}
export function classifiedEntry(state: State, entry: Entry): Entry {
  const classification = state.classifications.filter(item => item.entryId === entry.id).at(-1);
  return classification ? { ...entry, scope: classification.scope, carId: classification.carId, category: classification.category } : entry;
}
export const isReversed = (state: State, id: string) => state.entries.some(e => e.kind === 'expense_reversal' && e.originalId === id);
export function accountBalance(state: State, id: string) {
  const account = state.accounts.find(a => a.id === id);
  if (!account) throw new Error('Счёт не найден.');
  let total = account.opening;
  let personal = account.personalOpening;
  for (const e of state.entries) {
    if (e.kind === 'transfer' && e.targetAccountId === id) total += e.amount;
    if (e.accountId !== id) continue;
    // Personal payment is outside the tracked business money, even on the same card.
    if (e.kind === 'expense' && e.funding === 'personal') continue;
    if (e.kind === 'expense_reversal' && state.entries.find(original => original.id === e.originalId)?.funding === 'personal') continue;
    if (e.kind === 'to_personal') { personal += e.amount; continue; }
    if (e.kind === 'to_business') { personal -= e.amount; continue; }
    if (['capital_in', 'sale_payment', 'own_deposit', 'personal_deposit', 'expense_reversal'].includes(e.kind)) total += e.amount;
    else total -= e.amount;
    if (e.kind === 'personal_spend') personal -= e.amount;
    if (e.kind === 'personal_deposit') personal += e.amount;
  }
  return { total, personal, business: total - personal };
}
export const businessCash = (state: State) => state.accounts.reduce((sum, a) => sum + accountBalance(state, a.id).business, 0);
export function carCost(state: State, carId: string) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) throw new Error('Автомобиль не найден.');
  return car.purchase + car.importedCosts + state.entries.reduce((sum, raw) => {
    const e = classifiedEntry(state, raw);
    return e.kind === 'expense' && e.scope === 'car' && e.carId === carId && !isReversed(state, e.id) ? sum + e.amount : sum;
  }, 0);
}
export const carProfit = (state: State, carId: string) => { const car = state.cars.find(c => c.id === carId)!; return car.sale ? car.sale.price - carCost(state, carId) : null; };
export const buyerPaid = (state: State, carId: string) => state.entries.filter(e => e.kind === 'sale_payment' && e.carId === carId).reduce((sum, e) => sum + e.amount, 0);
export const buyerDue = (state: State, carId: string) => { const car = state.cars.find(c => c.id === carId)!; return car.sale ? car.sale.price - buyerPaid(state, carId) : 0; };
export const sellerPaid = (state: State, carId: string) => (state.cars.find(c => c.id === carId)?.purchasePaidOpening ?? 0) + state.entries.filter(e => e.kind === 'purchase_payment' && e.carId === carId).reduce((sum, e) => sum + e.amount, 0);
export const sellerDue = (state: State, carId: string) => (state.cars.find(c => c.id === carId)?.purchase ?? 0) - sellerPaid(state, carId);
export function capitalDue(state: State, personId: string) {
  return (state.people.find(p => p.id === personId)?.capitalOpening ?? 0) + state.entries.reduce((sum, e) => e.personId === personId ? sum + (e.kind === 'capital_in' ? e.amount : e.kind === 'capital_out' ? -e.amount : 0) : sum, 0);
}
export function rewardDue(state: State, personId: string) {
  const accrued = state.allocations.reduce((sum, a) => sum + (a.investorId === personId ? a.investor : 0) + a.helperIds.reduce((subtotal, id, index) => subtotal + (id === personId ? a.helpers[index] : 0), 0), 0);
  return accrued - state.entries.filter(e => e.kind === 'reward_payment' && e.personId === personId).reduce((sum, e) => sum + e.amount, 0);
}
export function personalExpenseDue(state: State, expenseId: string): number {
  const expense = state.entries.find(e => e.id === expenseId);
  if (expense?.kind !== 'expense' || expense.funding !== 'personal' || isReversed(state, expenseId)) return 0;
  return expense.amount - state.entries.filter(e => e.kind === 'owner_repayment' && e.originalId === expenseId).reduce((sum, e) => sum + e.amount, 0);
}
export function personalExpenseTotals(state: State) {
  return state.entries.reduce((sum, entry) => {
    if (entry.kind === 'expense' && entry.funding === 'personal' && !isReversed(state, entry.id)) {
      const due = personalExpenseDue(state, entry.id);
      if (entry.personalUse === 'reimburse') sum.reimburse += due;
      if (entry.personalUse === 'invest') sum.invest += due;
    }
    return sum;
  }, { reimburse: 0, invest: 0 });
}
export function appendEntry(state: State, entry: Entry): State {
  if (state.entries.some(e => e.id === entry.id)) return state;
  validMoney(entry.amount);
  const account = state.accounts.find(a => a.id === entry.accountId);
  if (!account) throw new Error('Выберите счёт.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error('Укажите дату.');
  if (entry.kind === 'expense') {
    if (entry.funding !== undefined && !['business', 'personal'].includes(entry.funding)) throw new Error('Выберите, чьи деньги использовали.');
    if (entry.funding === 'personal' && !['reimburse', 'invest'].includes(entry.personalUse ?? '')) throw new Error('Выберите «Вернуть мне» или «Оставить в деле».');
    if (entry.funding !== 'personal' && entry.personalUse !== undefined) throw new Error('Этот выбор доступен только при оплате своими деньгами.');
  }
  if (entry.kind === 'owner_repayment') {
    const expense = state.entries.find(e => e.id === entry.originalId);
    if (expense?.kind !== 'expense' || expense.funding !== 'personal' || isReversed(state, expense.id)) throw new Error('Выберите действующий расход, оплаченный своими деньгами.');
    if (entry.amount > personalExpenseDue(state, expense.id)) throw new Error('Сумма больше остатка ваших денег по этому расходу.');
  }
  if (entry.kind === 'transfer') {
    if (entry.accountId === entry.targetAccountId || !state.accounts.some(a => a.id === entry.targetAccountId)) throw new Error('Выберите другой счёт для перевода.');
    if (accountBalance(state, entry.accountId).business < entry.amount) throw new Error('Для этого перевода недостаточно учтённых рабочих денег. Сначала проверьте остаток.');
  }
  if (entry.scope === 'car' && !state.cars.some(c => c.id === entry.carId)) throw new Error('Выберите автомобиль.');
  if (['capital_in', 'capital_out', 'reward_payment'].includes(entry.kind) && !state.people.some(p => p.id === entry.personId)) throw new Error('Выберите участника.');
  if (['capital_in', 'capital_out'].includes(entry.kind) && state.people.find(p => p.id === entry.personId)?.role !== 'investor') throw new Error('У этого участника нет соглашения о капитале.');
  if (entry.kind === 'capital_out' && entry.amount > capitalDue(state, entry.personId!)) throw new Error('Сумма превышает основной долг. Переплаты в этом прототипе не поддерживаются.');
  if (entry.kind === 'reward_payment' && entry.amount > rewardDue(state, entry.personId!)) throw new Error('Сумма превышает начисленное вознаграждение.');
  if (entry.kind === 'sale_payment') {
    const car = state.cars.find(c => c.id === entry.carId);
    if (!car?.sale || entry.amount > buyerDue(state, car.id)) throw new Error('Поступление превышает остаток оплаты покупателя.');
  }
  if (entry.kind === 'purchase_payment' && (!state.cars.some(c => c.id === entry.carId) || entry.amount > sellerDue(state, entry.carId!))) throw new Error('Оплата превышает долг продавцу.');
  if (entry.kind === 'personal_spend' && entry.amount > accountBalance(state, entry.accountId).personal) throw new Error('Сумма превышает учтённую личную часть. Для рабочих денег выберите «Забрал на личное».');
  if (entry.kind === 'to_business' && entry.amount > accountBalance(state, entry.accountId).personal) throw new Error('Сумма превышает личную часть кошелька.');
  if (entry.kind === 'to_personal' && entry.amount > accountBalance(state, entry.accountId).business) throw new Error('Для этого перераспределения недостаточно рабочих денег.');
  if (entry.kind === 'expense_reversal') {
    const original = state.entries.find(e => e.id === entry.originalId);
    if (!original || original.kind !== 'expense' || isReversed(state, original.id) || original.amount !== entry.amount || original.accountId !== entry.accountId) throw new Error('Эту запись уже исправили или её нельзя отменить.');
    if (state.entries.some(e => e.kind === 'owner_repayment' && e.originalId === original.id)) throw new Error('По этому расходу уже возвращали свои деньги. Его исправление требует связанной корректировки; она пока не реализована.');
  }
  return { ...state, entries: [...state.entries, entry] };
}
export function classifyExpense(state: State, entryId: string, scope: Scope, carId: string | undefined, category: string): State {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry || entry.kind !== 'expense' || isReversed(state, entry.id)) throw new Error('Запись нельзя уточнить.');
  if (scope === 'car' && !state.cars.some(c => c.id === carId)) throw new Error('Выберите автомобиль.');
  return { ...state, classifications: [...state.classifications, { entryId, scope, carId: scope === 'car' ? carId : undefined, category, at: new Date().toISOString() }] };
}
export function registerSale(state: State, carId: string, price: number, paid: number, accountId: string, buyer: string, date: string, entryId: string): State {
  const car = state.cars.find(c => c.id === carId);
  if (!car || car.sale) throw new Error('Автомобиль уже продан.');
  validMoney(price); validMoney(paid, true);
  if (paid > price) throw new Error('Оплата не может превышать цену продажи.');
  if (paid < price && !buyer.trim()) throw new Error('Для задолженности укажите имя покупателя.');
  const next = { ...state, cars: state.cars.map(c => c.id === carId ? { ...c, sale: { price, date, buyer: buyer.trim() } } : c) };
  return paid ? appendEntry(next, { id: entryId, kind: 'sale_payment', amount: paid, accountId, carId, date, label: `Оплата за ${car.nickname}` }) : next;
}
export function calculateAllocation(profit: number, ownerRate: number, helperMode: 'fixed' | 'percent', helperValue: number, helperSplit: number) {
  validMoney(profit);
  for (const rate of [ownerRate, helperSplit, ...(helperMode === 'percent' ? [helperValue] : [])]) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 100 || Math.abs(rate * 100 - Math.round(rate * 100)) > 0.000001) throw new Error('Процент должен быть от 0 до 100, максимум два знака после запятой.');
  }
  const ownerGross = percentOf(profit, ownerRate);
  const helperTotal = helperMode === 'percent' ? percentOf(ownerGross, helperValue) : helperValue;
  validMoney(helperTotal, true);
  if (helperTotal > ownerGross) throw new Error('Выплаты помощникам превышают вашу долю.');
  const helperOne = percentOf(helperTotal, helperSplit);
  return { investor: profit - ownerGross, ownerGross, helpers: [helperOne, helperTotal - helperOne] as [number, number], ownerNet: ownerGross - helperTotal };
}
export function confirmAllocation(state: State, allocation: Allocation): State {
  if (state.allocations.some(a => a.carId === allocation.carId)) throw new Error('Для этой машины расчёт уже подтверждён. Его пересмотр будет отдельной функцией.');
  if (!state.people.some(p => p.id === allocation.investorId && p.role === 'investor')) throw new Error('Выберите инвестора.');
  if (allocation.helperIds[0] === allocation.helperIds[1] || allocation.helperIds.some(id => !state.people.some(p => p.id === id && p.role === 'helper'))) throw new Error('Выберите двух разных помощников.');
  if (carProfit(state, allocation.carId) !== allocation.profit) throw new Error('Результат сделки изменился. Обновите расчёт.');
  const totals = calculateAllocation(allocation.profit, allocation.ownerRate, allocation.helperMode, allocation.helperValue, allocation.helperSplit);
  return { ...state, allocations: [...state.allocations, { ...allocation, ...totals }] };
}
export const unresolvedEntries = (state: State) => state.entries.map(e => classifiedEntry(state, e)).filter(e => e.kind === 'expense' && e.scope === 'unknown' && !isReversed(state, e.id));

export function createSeed(): State {
  return {
    version: 1,
    accounts: [
      { id: 'pocket', name: 'Наличные с собой', hint: 'Учитываем только деньги на машины', kind: 'cash', opening: 25300000, personalOpening: 2500000 },
      { id: 'home', name: 'Наличные дома', hint: 'Деньги на машины, которые хранятся дома', kind: 'cash', opening: 12000000, personalOpening: 0 },
      { id: 'bank', name: 'Карта', hint: 'Учитываем деньги на машины, а не весь баланс карты', kind: 'bank', opening: 5280000, personalOpening: 0 }
    ],
    people: [
      { id: 'alex', name: 'Александр', initials: 'АЛ', role: 'investor', capitalOpening: 90000000, color: 'sage' },
      { id: 'dima', name: 'Дмитрий', initials: 'ДМ', role: 'investor', capitalOpening: 35000000, color: 'sand' },
      { id: 'ilya', name: 'Илья', initials: 'ИЛ', role: 'helper', capitalOpening: 0, color: 'blue' },
      { id: 'max', name: 'Максим', initials: 'МК', role: 'helper', capitalOpening: 0, color: 'rose' }
    ],
    cars: [
      { id: 'polo', name: 'Volkswagen Polo', nickname: 'Поло серый', year: 2016, plate: 'К714ЕМ', color: '#8b9995', date: '2026-10-22', purchase: 52000000, purchasePaidOpening: 52000000, importedCosts: 1850000, asking: 65000000, stage: 'В продаже', investorId: 'alex' },
      { id: 'solaris', name: 'Hyundai Solaris', nickname: 'Солярис белый', year: 2017, plate: 'А385ТК', color: '#dedfd5', date: '2026-10-26', purchase: 46000000, purchasePaidOpening: 46000000, importedCosts: 1420000, asking: 59000000, stage: 'Подготовка', investorId: 'dima' },
      { id: 'rio', name: 'Kia Rio', nickname: 'Рио синий', year: 2015, plate: 'М208РА', color: '#7296ae', date: '2026-10-12', purchase: 48000000, purchasePaidOpening: 48000000, importedCosts: 2000000, asking: 70000000, stage: 'В продаже', investorId: 'alex', sale: { price: 70000000, date: '2026-11-01', buyer: 'Покупатель Рио' } }
    ],
    entries: [
      { id: 'rio-payment', kind: 'sale_payment', amount: 30000000, accountId: 'home', carId: 'rio', date: '2026-11-01', label: 'Частичная оплата за Рио' },
      { id: 'return-after-rio', kind: 'capital_out', amount: 30000000, accountId: 'home', personId: 'alex', date: '2026-11-02', label: 'Частичный возврат капитала Александру' },
      { id: 'today-polo', kind: 'expense', amount: 450000, accountId: 'pocket', carId: 'polo', scope: 'car', category: 'Диагностика', date: DEMO_DAY, label: 'Диагностика перед продажей' },
      { id: 'today-solaris', kind: 'expense', amount: 780000, accountId: 'bank', carId: 'solaris', scope: 'car', category: 'Запчасти', date: DEMO_DAY, label: 'Тормозные диски' },
      { id: 'today-unknown', kind: 'expense', amount: 850000, accountId: 'pocket', scope: 'unknown', category: 'Уточнить позже', date: DEMO_DAY, label: 'Потратил 8 500 — уточнить назначение' }
    ],
    classifications: [], allocations: [], reconciliations: [], drafts: []
  };
}
