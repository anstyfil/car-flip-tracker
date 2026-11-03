import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell, CarFront, Check, ChevronRight, CircleHelp, Clock3, Coins, History, LayoutDashboard, MessageCircle, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Users, Wallet, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { accountBalance, businessCash, buyerDue, capitalDue, carCost, classifiedEntry, createSeed, DEMO_DAY, isReversed, money, rewardDue, STORAGE_KEY, unresolvedEntries } from './domain';
import type { State } from './domain';
import { AppContext } from './app-context';
import type { Dialog, View } from './app-context';
import { CarArt, EntryRow, Notice } from './ui';
import Dialogs from './dialogs';

const nav: { id: View; label: string; icon: LucideIcon }[] = [{ id: 'overview', label: 'Обзор', icon: LayoutDashboard }, { id: 'cars', label: 'Автомобили', icon: CarFront }, { id: 'people', label: 'Участники', icon: Users }, { id: 'cash', label: 'Деньги', icon: Wallet }, { id: 'history', label: 'История', icon: History }];
function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as State;
    if (parsed.version !== 1 || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.entries) || !Array.isArray(parsed.classifications) || !Array.isArray(parsed.cars) || !Array.isArray(parsed.people) || !Array.isArray(parsed.allocations) || !Array.isArray(parsed.reconciliations) || !Array.isArray(parsed.drafts)) return createSeed();
    return parsed;
  } catch { return createSeed(); }
}

export default function App() {
  const [state, setState] = useState<State>(load);
  const [view, setView] = useState<View>('overview');
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState('');
  const close = useCallback(() => setDialog(null), []);
  const open = useCallback((next: Dialog) => setDialog(next), []);
  const navigate = (next: View, nextFilter = 'all') => { setView(next); setFilter(nextFilter); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const commit = (transform: (state: State) => State, message: string) => {
    try {
      const next = transform(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next); setToast(message); return true;
    } catch (error) { setToast(error instanceof Error ? error.message : 'Не удалось сохранить демо-данные в браузере.'); return false; }
  };
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 6500); return () => clearTimeout(t); } }, [toast]);
  const unknown = unresolvedEntries(state);
  return <AppContext.Provider value={{ state, commit, open, close, navigate }}>
    <div className="app-layout">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('overview')} aria-label="АвтоКапитал — главная"><span className="brand-mark"><CarFront size={25} strokeWidth={1.8} /></span><span>авто<span className="brand-light">капитал</span><small>ЛИЧНЫЙ УЧЁТ БИЗНЕСА</small></span></button>
        <div className="workspace"><span className="workspace-avatar">М</span><div><b>Мои автомобили</b><span>Рабочее пространство</span></div><span className="workspace-dot" /></div>
        <div className="nav-caption">ВАШ БИЗНЕС</div>
        <nav className="desktop-nav">{nav.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={19} /><span>{item.label}</span>{item.id === 'history' && unknown.length > 0 && <i>{unknown.length}</i>}</button>)}</nav>
        <div className="sidebar-bottom"><button className="sidebar-link" onClick={() => open({ type: 'help' })}><CircleHelp size={18} />О прототипе<ArrowUpRight size={15} /></button><button className="sidebar-link subtle" onClick={() => open({ type: 'reset' })}><RotateCcw size={17} />Начать демо заново</button><div className="profile"><span className="profile-avatar">В</span><div><b>Владелец</b><span>Демонстрационный доступ</span></div><span className="online-dot" /></div></div>
      </aside>
      <div className="main-area">
        <header className="topbar"><div className="topbar-breadcrumb"><span className="mobile-logo"><CarFront size={21} /></span>Мои автомобили<span className="breadcrumb-slash">/</span><b>{nav.find(n => n.id === view)?.label}</b></div><div className="topbar-right"><button className="demo-pill" onClick={() => open({ type: 'help' })}><span />Демо-режим</button><button className="icon-button notification" aria-label="Задачи, требующие внимания" onClick={() => navigate('history', 'unknown')}><Bell size={19} />{unknown.length > 0 && <i />}</button><span className="top-avatar">В</span></div></header>
        <main className="content">
          {view === 'overview' && <Overview state={state} open={open} navigate={navigate} />}
          {view === 'cars' && <Cars state={state} open={open} />}
          {view === 'people' && <People state={state} open={open} />}
          {view === 'history' && <HistoryView state={state} open={open} filter={filter} setFilter={setFilter} />}
          {view === 'cash' && <Cash state={state} open={open} />}
          <footer className="page-footer"><span><span className="online-dot" />Локальный прототип · учебные данные</span><button onClick={() => open({ type: 'help' })}>Как это работает<ArrowUpRight size={13} /></button></footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Основная навигация">{nav.filter(n => n.id !== 'history').map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={21} /><span>{item.label}</span></button>)}</nav>
      {toast && <div className="toast" role="status"><Check size={18} /><span>{toast}</span><button aria-label="Скрыть сообщение" onClick={() => setToast('')}>×</button></div>}
      {dialog && <Dialogs key={JSON.stringify(dialog)} dialog={dialog} />}
    </div>
  </AppContext.Provider>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Overview({ state, open, navigate }: { state: State; open: (d: Dialog) => void; navigate: (v: View, f?: string) => void }) {
  const activeCars = state.cars.filter(c => !c.sale);
  const inventory = activeCars.reduce((s, c) => s + carCost(state, c.id), 0);
  const capital = state.people.reduce((s, p) => s + capitalDue(state, p.id), 0);
  const receivable = state.cars.reduce((s, c) => s + buyerDue(state, c.id), 0);
  const unknown = unresolvedEntries(state);
  const unallocated = state.cars.find(c => c.sale && !state.allocations.some(a => a.carId === c.id));
  const today = state.entries.filter(e => e.date === DEMO_DAY).slice().reverse();
  const todayExpenses = today.filter(e => e.kind === 'expense' && !isReversed(state, e.id)).reduce((s, e) => s + e.amount, 0);
  return <>
    <PageTitle eyebrow="ВТОРНИК, 3 НОЯБРЯ · УЧЕБНЫЙ ДЕНЬ" title="Обзор" description="Остатки, операции и расчёты." action={<button className="button primary" onClick={() => open({ type: 'expense' })}><Plus size={19} />Записать операцию</button>} />
    <section className="balance-card"><div className="balance-main"><div className="balance-label"><Wallet size={18} />РАБОЧИЕ ДЕНЬГИ ПО УЧЁТУ</div><div className="hero-amount">{money(businessCash(state))}</div><div className="balance-caption">Личная часть кошелька сюда не входит</div><button className="hero-verify" onClick={() => navigate('cash')}><span className="hero-status-dot" />{state.reconciliations.length ? 'Открыть результаты сверки' : 'Остатки ещё не сверены'}<ArrowRight size={15} /></button></div><div className="balance-accounts">{state.accounts.map(a => <button key={a.id} onClick={() => open({ type: 'reconcile', id: a.id })}><span className="account-mark">{a.kind === 'cash' ? <Coins size={17} /> : <Wallet size={17} />}</span><span>{a.name}</span><b>{money(accountBalance(state, a.id).business)}</b><ChevronRight size={15} /></button>)}<div className="balance-footnote"><ShieldCheck size={13} />Это учётный остаток, а не лимит на покупки</div></div></section>
    <section className="metric-grid">{[{ label: 'В автомобилях', value: inventory, icon: CarFront, note: `${activeCars.length} автомобиля в работе`, click: () => navigate('cars') }, { label: 'Осталось вернуть', value: capital, icon: Users, note: 'Доля прибыли — отдельно', click: () => navigate('people') }, { label: 'Должны покупатели', value: receivable, icon: ArrowDownLeft, note: 'Эти деньги ещё не получены', click: () => navigate('cars') }].map(m => <button className="metric-card" key={m.label} onClick={m.click}><span className="metric-label">{m.label}<m.icon size={18} /></span><strong>{money(m.value)}</strong><span className="metric-note">{m.note}<ArrowUpRight size={14} /></span></button>)}</section>
    <div className="dashboard-columns"><div className="dashboard-main">
      <section className="section-block"><div className="section-heading"><h2>Быстрая запись</h2></div><div className="quick-grid">{[{ label: 'Расход', sub: 'На машину или бизнес', icon: ArrowUpRight, click: () => open({ type: 'expense' }) }, { label: 'Купить машину', sub: 'Добавить новую сделку', icon: CarFront, click: () => open({ type: 'purchase' }) }, { label: 'Получить капитал', sub: 'Записать поступление', icon: Users, click: () => open({ type: 'money', kind: 'capital_in' }) }, { label: 'Перевести', sub: 'Между своими счетами', icon: ArrowLeftRight, click: () => open({ type: 'money', kind: 'transfer' }) }].map(a => <button key={a.label} className="quick-card" onClick={a.click}><span className="quick-icon"><a.icon size={21} /></span><b>{a.label}</b><span>{a.sub}</span></button>)}</div></section>
      <section className="panel today-panel"><div className="section-heading"><h2>Сегодня<span className="count">{today.length}</span></h2><button className="text-button" onClick={() => navigate('history')}>Вся история<ArrowRight size={15} /></button></div><div className="entry-list">{today.slice(0, 5).map(e => <EntryRow key={e.id} state={state} entry={e} onClick={() => open({ type: 'entry', id: e.id })} />)}{!today.length && <div className="empty">За учебный день пока нет операций.</div>}</div><div className="today-total"><span>Расходы и неразобранные выплаты</span><b>{money(todayExpenses)}</b></div></section>
      <section className="section-block"><div className="section-heading"><h2>Автомобили в работе</h2><button className="text-button" onClick={() => navigate('cars')}>Все автомобили<ArrowRight size={15} /></button></div><div className="compact-cars">{activeCars.slice(0, 2).map(car => <button className="compact-car" key={car.id} onClick={() => open({ type: 'car', id: car.id })}><CarArt car={car} small /><div><span className={`badge ${car.stage === 'В продаже' ? 'green' : 'sand'}`}>{car.stage}</span><b>{car.name}</b><span>{car.year} · {car.nickname}</span><div className="compact-car-cost">Вложено<strong>{money(carCost(state, car.id))}</strong></div></div></button>)}</div></section>
    </div><aside className="dashboard-rail"><section className="attention-panel"><div className="rail-title"><span className="attention-dot" /><h2>Требует внимания</h2></div>{unknown.length > 0 && <button className="attention-item" onClick={() => navigate('history', 'unknown')}><span className="attention-symbol"><CircleHelp size={19} /></span><div><b>{unknown.length} {unknown.length === 1 ? 'выплата без назначения' : 'выплаты без назначения'}</b><p>{money(unknown.reduce((s, e) => s + e.amount, 0))} уже учтены в деньгах</p><span>Разобрать<ArrowRight size={14} /></span></div></button>}{unallocated && <button className="attention-item" onClick={() => open({ type: 'allocation', id: unallocated.id })}><span className="attention-symbol"><Users size={18} /></span><div><b>Распределить результат</b><p>{unallocated.name} · продажа записана</p><span>Открыть расчёт<ArrowRight size={14} /></span></div></button>}{!unknown.length && !unallocated && <div className="all-done"><Check size={26} /><b>Записи разобраны</b><p>Осталось сверить деньги с фактом.</p></div>}{state.drafts.length > 0 && <button className="attention-item" onClick={() => open({ type: 'drafts' })}><span className="attention-symbol"><Clock3 size={18} /></span><div><b>Черновики: {state.drafts.length}</b><p>Ещё не влияют на деньги</p><span>Продолжить<ArrowRight size={14} /></span></div></button>}</section>
      <section className="bot-card"><span className="bot-icon"><MessageCircle size={24} /></span><span className="eyebrow">ВВОД ТЕКСТОМ</span><h2>Записать расход</h2><div className="example-bubble">Поло 4500 колодки<span>✓✓</span></div><p>Бот подготовит запись.<br />Вы проверите и подтвердите.</p><button className="button light" onClick={() => open({ type: 'bot' })}>Попробовать ввод<ArrowRight size={16} /></button><small>Имитация чата внутри прототипа</small></section>
    </aside></div>
  </>;
}

function Cars({ state, open }: { state: State; open: (d: Dialog) => void }) {
  const [tab, setTab] = useState('active'); const [query, setQuery] = useState('');
  const cars = state.cars.filter(c => (tab === 'all' || (tab === 'active' ? !c.sale : !!c.sale)) && `${c.name} ${c.nickname} ${c.plate}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle eyebrow="СДЕЛКИ И СЕБЕСТОИМОСТЬ" title="Автомобили" description="От покупки до последнего расчёта." action={<button className="button primary" onClick={() => open({ type: 'purchase' })}><Plus size={18} />Добавить автомобиль</button>} /><div className="view-toolbar"><div className="tabs">{[['active', 'В работе'], ['sold', 'Проданные'], ['all', 'Все']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div><label className="search-box"><Search size={17} /><input aria-label="Поиск автомобиля" placeholder="Модель, имя или номер" value={query} onChange={e => setQuery(e.target.value)} /></label></div><div className="car-grid">{cars.map(car => <button className="car-card" key={car.id} onClick={() => open({ type: 'car', id: car.id })}><div className="car-card-visual"><span className={`badge ${car.sale ? 'blue' : car.stage === 'В продаже' ? 'green' : 'sand'}`}>{car.sale ? 'Продан' : car.stage}</span><span className="car-year">{car.year}</span><CarArt car={car} /></div><div className="car-card-info"><h2>{car.name}<ArrowUpRight size={18} /></h2><p>{car.nickname} · {car.plate}</p><div className="car-card-stats"><div><span>Себестоимость</span><b>{money(carCost(state, car.id))}</b></div><div><span>{car.sale ? 'Продажа' : 'Цена в объявлении'}</span><b>{money(car.sale?.price ?? car.asking)}</b></div></div>{car.sale ? <div className="car-card-bottom"><span>{buyerDue(state, car.id) > 0 ? 'Осталось получить' : 'Покупатель рассчитался'}</span><b>{money(buyerDue(state, car.id))}</b></div> : <div className="car-card-bottom"><span>Прогноз до других затрат</span><b>{money(car.asking - carCost(state, car.id))}</b></div>}</div></button>)}</div>{!cars.length && <div className="empty panel">Автомобилей по этому запросу нет.</div>}</>;
}
function People({ state, open }: { state: State; open: (d: Dialog) => void }) {
  const [tab, setTab] = useState('all');
  return <><PageTitle eyebrow="КАПИТАЛ И ВОЗНАГРАЖДЕНИЯ" title="Люди и расчёты" description="Кто вложил деньги, кому и за что начислено." action={<button className="button primary" onClick={() => open({ type: 'person-add' })}><Plus size={18} />Добавить участника</button>} /><div className="summary-strip"><div><span>Осталось вернуть</span><b>{money(state.people.reduce((s, p) => s + capitalDue(state, p.id), 0))}</b></div><div><span>Отдать с прибыли</span><b>{money(state.people.reduce((s, p) => s + rewardDue(state, p.id), 0))}</b></div><span className="strip-note"><ShieldCheck size={19} />Начисление и выплата учитываются отдельно</span></div><div className="tabs margin-bottom">{[['all', 'Все участники'], ['investor', 'Дают капитал'], ['helper', 'Помогают с продажей']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div><div className="people-grid">{state.people.filter(p => tab === 'all' || p.role === tab).map(person => <button key={person.id} className="person-card" onClick={() => open({ type: 'person', id: person.id })}><div className="person-head"><span className={`person-avatar ${person.color}`}>{person.initials}</span><div><h2>{person.name}</h2><span>{person.role === 'investor' ? 'Предоставляет капитал' : 'Помогает с продажей'}</span></div><ChevronRight size={18} /></div>{person.role === 'investor' && <div className="person-stat"><span>Осталось вернуть</span><b>{money(capitalDue(state, person.id))}</b></div>}<div className="person-stat"><span>Отдать с прибыли</span><b>{money(rewardDue(state, person.id))}</b></div></button>)}</div><Notice>Это участники финансовых расчётов. Добавление человека сюда не даёт ему доступ к приложению.</Notice></>;
}
function HistoryView({ state, open, filter, setFilter }: { state: State; open: (d: Dialog) => void; filter: string; setFilter: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const entries = state.entries.map(e => classifiedEntry(state, e)).filter(e => (filter === 'all' || (filter === 'unknown' ? e.kind === 'expense' && e.scope === 'unknown' && !isReversed(state, e.id) : e.kind === 'expense')) && `${e.label} ${e.amount / 100} ${state.cars.find(c => c.id === e.carId)?.nickname ?? ''}`.toLowerCase().includes(query.toLowerCase())).slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
  const days = [...new Set(entries.map(e => e.date))];
  return <><PageTitle eyebrow="ЕДИНАЯ ЛЕНТА ОПЕРАЦИЙ" title="История" description="Записи, уточнения и исправления сохраняют свой след." action={<button className="button primary" onClick={() => open({ type: 'expense' })}><Plus size={18} />Записать</button>} /><div className="view-toolbar"><div className="tabs">{[['all', 'Все'], ['expense', 'Расходы'], ['unknown', `Уточнить · ${unresolvedEntries(state).length}`]].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div><label className="search-box"><Search size={17} /><input aria-label="Поиск операции" placeholder="Сумма, машина или комментарий" value={query} onChange={e => setQuery(e.target.value)} /></label></div>{state.drafts.length > 0 && <button className="draft-banner" onClick={() => open({ type: 'drafts' })}><Clock3 size={20} /><div><b>Черновики: {state.drafts.length}</b><span>Продолжить записи, которые ещё не учтены в деньгах</span></div><ArrowRight size={18} /></button>}{days.map(day => <section className="panel history-day" key={day}><div className="section-heading"><h2>{day === DEMO_DAY ? 'Сегодня, 3 ноября' : new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h2><span>{entries.filter(e => e.date === day).length} записей</span></div>{entries.filter(e => e.date === day).map(e => <EntryRow key={e.id} state={state} entry={e} onClick={() => open({ type: 'entry', id: e.id })} />)}</section>)}{!entries.length && <div className="empty panel"><Check size={30} /><h2>Здесь пока пусто</h2><p>{filter === 'unknown' ? 'Все подтверждённые выплаты разобраны.' : 'Попробуйте другой поиск или запишите операцию.'}</p></div>}</>;
}
function Cash({ state, open }: { state: State; open: (d: Dialog) => void }) {
  return <><PageTitle eyebrow="МЕСТА ХРАНЕНИЯ И СВЕРКА" title="Деньги" description="Отдельно — где лежат деньги. Отдельно — какая часть рабочая." action={<button className="button primary" onClick={() => open({ type: 'money', kind: 'transfer' })}><ArrowLeftRight size={18} />Перевести</button>} /><div className="summary-strip"><div><span>Рабочие деньги</span><b>{money(businessCash(state))}</b></div><div><span>Личная часть в этих кошельках</span><b>{money(state.accounts.reduce((s, a) => s + accountBalance(state, a.id).personal, 0))}</b></div><span className="strip-note">Учётный остаток требует сверки с фактом</span></div><div className="cash-grid">{state.accounts.map(account => {
    const balance = accountBalance(state, account.id); const last = state.reconciliations.filter(r => r.accountId === account.id).at(-1);
    return <section key={account.id} className="cash-card"><div className="cash-card-top"><span className="cash-icon">{account.kind === 'cash' ? <Coins size={23} /> : <Wallet size={23} />}</span><span className={`badge ${last && last.actual === balance.total && last.personal === balance.personal ? 'green' : 'sand'}`}>{last && last.actual === balance.total && last.personal === balance.personal ? 'Сверено по записи' : 'Нужна сверка'}</span></div><h2>{account.name}</h2><p>{account.hint}</p><div className="cash-physical"><span>Всего физически, по учёту</span><b>{money(balance.total)}</b></div><div className="cash-breakdown"><span>Личная часть<b>{money(balance.personal)}</b></span><span className="working">Рабочая часть<b>{money(balance.business)}</b></span></div><button className="button secondary full" onClick={() => open({ type: 'reconcile', id: account.id })}>Сверить остаток<ArrowRight size={16} /></button><button className="text-button full-center" onClick={() => open({ type: 'money', kind: 'owner_withdrawal', accountId: account.id })}>Личные и рабочие деньги<ArrowUpRight size={14} /></button>{last && <small className="last-check">Последняя сверка сохранена. Изменения после неё проверьте отдельно.</small>}</section>;
  })}</div><Notice tone="amber">Если личные и рабочие купюры лежат вместе, сверяем весь кошелёк и личную часть отдельно. Перекладывание между этими частями не означает, что деньги физически ушли.</Notice></>;
}
