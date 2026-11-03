import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountFromInput, calculateAllocation, createSeed, appendEntry, accountBalance, businessCash, carCost, buyerDue, carProfit, classifyExpense, confirmAllocation } from './domain.ts';
import type { Allocation, Entry } from './domain.ts';

test('доли двух уровней не удваивают результат и не теряют копейки', () => {
  for (const profit of [1, 101, 1234567, 20000000]) {
    const result = calculateAllocation(profit, 20, 'percent', 50, 50);
    assert.equal(result.investor + result.ownerNet + result.helpers[0] + result.helpers[1], profit);
    assert.equal(result.ownerGross, result.ownerNet + result.helpers[0] + result.helpers[1]);
  }
  const result = calculateAllocation(20000000, 20, 'fixed', 2000000, 50);
  assert.equal(result.ownerNet, 2000000);
  assert.deepEqual(result.helpers, [1000000, 1000000]);
});
test('неподходящая сумма и распределение сверх доли отклоняются', () => {
  assert.equal(amountFromInput('4 500,50'), 450050);
  assert.throws(() => amountFromInput('4.555'));
  assert.throws(() => calculateAllocation(-100, 20, 'fixed', 0, 50));
  assert.throws(() => calculateAllocation(10000, 20, 'fixed', 3000, 50));
  assert.throws(() => calculateAllocation(10000, -20, 'fixed', 0, 50));
});
test('смешанная касса отделяет личные деньги от рабочих', () => {
  const state = createSeed();
  assert.deepEqual(accountBalance(state, 'pocket'), { total: 24000000, personal: 2500000, business: 21500000 });
  assert.equal(businessCash(state), 38000000);
});
test('уточнение выплаты меняет себестоимость, но не списывает деньги второй раз', () => {
  const state = createSeed();
  const next = classifyExpense(state, 'today-unknown', 'car', 'polo', 'Ремонт');
  assert.equal(businessCash(next), businessCash(state));
  assert.equal(carCost(next, 'polo'), carCost(state, 'polo') + 850000);
  assert.equal(next.entries.length, state.entries.length);
});
test('доплата покупателя погашает долг, прибыль повторно не возникает', () => {
  const state = createSeed();
  const next = appendEntry(state, { id: 'remaining-rio', kind: 'sale_payment', amount: 40000000, accountId: 'home', carId: 'rio', date: '2026-11-03', label: 'Доплата' });
  assert.equal(buyerDue(next, 'rio'), 0);
  assert.equal(carProfit(next, 'rio'), carProfit(state, 'rio'));
  assert.equal(businessCash(next), businessCash(state) + 40000000);
});
test('повтор одной команды не создаёт второй расход', () => {
  const state = createSeed();
  const entry: Entry = { id: 'once', kind: 'expense', amount: 100000, accountId: 'home', carId: 'polo', scope: 'car', date: '2026-11-03', label: 'Мойка' };
  const once = appendEntry(state, entry);
  assert.deepEqual(appendEntry(once, entry), once);
});
test('начисление не изменяет наличность, повторное распределение запрещено', () => {
  const state = createSeed();
  const params = { id: 'allocation', carId: 'rio', profit: 20000000, ownerRate: 20, helperMode: 'fixed' as const, helperValue: 2000000, helperSplit: 50, investorId: 'alex', helperIds: ['ilya', 'max'] as [string, string], at: '2026-11-03' };
  const allocation: Allocation = { ...params, ...calculateAllocation(params.profit, 20, 'fixed', 2000000, 50) };
  const next = confirmAllocation(state, allocation);
  assert.equal(businessCash(next), businessCash(state));
  assert.throws(() => confirmAllocation(next, allocation));
  assert.throws(() => appendEntry(next, { id: 'overpay', kind: 'reward_payment', amount: 2000000, accountId: 'home', personId: 'ilya', date: '2026-11-03', label: 'Переплата' }));
});
test('перевод сохраняет общий рабочий остаток', () => {
  const state = createSeed();
  const next = appendEntry(state, { id: 'transfer', kind: 'transfer', amount: 1000000, accountId: 'home', targetAccountId: 'bank', date: '2026-11-03', label: 'Переложил деньги' });
  assert.equal(businessCash(next), businessCash(state));
});
test('перераспределение внутри кошелька не означает физического расхода', () => {
  const state = createSeed();
  const before = accountBalance(state, 'pocket');
  const next = appendEntry(state, { id: 'personal-part', kind: 'to_personal', amount: 100000, accountId: 'pocket', date: '2026-11-03', label: 'Отложил себе в том же кошельке' });
  assert.deepEqual(accountBalance(next, 'pocket'), { total: before.total, personal: before.personal + 100000, business: before.business - 100000 });
  const spent = appendEntry(next, { id: 'personal-purchase', kind: 'personal_spend', amount: 100000, accountId: 'pocket', date: '2026-11-03', label: 'Личная покупка' });
  assert.equal(accountBalance(spent, 'pocket').business, accountBalance(next, 'pocket').business);
  assert.equal(accountBalance(spent, 'pocket').total, before.total - 100000);
});
test('отмена записи восстанавливает деньги и стоимость; повторная отмена отклоняется', () => {
  const state = createSeed();
  const reversal: Entry = { id: 'undo', kind: 'expense_reversal', amount: 450000, accountId: 'pocket', originalId: 'today-polo', date: '2026-11-03', label: 'Исправление записи' };
  const next = appendEntry(state, reversal);
  assert.equal(businessCash(next), businessCash(state) + 450000);
  assert.equal(carCost(next, 'polo'), carCost(state, 'polo') - 450000);
  assert.throws(() => appendEntry(next, { ...reversal, id: 'undo-again' }));
});
