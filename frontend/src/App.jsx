import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createTransaction,
  fetchAccounts,
  fetchTransactions,
  updateTransaction,
} from './services/api'

const CATEGORIES = [
  'Fuel',
  'Food',
  'Movie',
  'Loan',
  'Medical',
  'Travel',
  'Groceries',
  'Rent',
  'Salary',
  'Freelance',
]

const DIVISIONS = ['Personal', 'Office']

const ACCOUNTS = [
  { id: 'acc-1', name: 'Cash Wallet', balance: 8200 },
  { id: 'acc-2', name: 'Savings Bank', balance: 48000 },
  { id: 'acc-3', name: 'Credit Card', balance: -6200 },
]

const NOW = new Date()

const seedTransactions = [
  {
    id: 'tx-1',
    type: 'income',
    amount: 45000,
    category: 'Salary',
    division: 'Office',
    description: 'January payout',
    date: new Date(NOW.getFullYear(), NOW.getMonth(), 1, 9, 30).toISOString(),
    accountId: 'acc-2',
  },
  {
    id: 'tx-2',
    type: 'expense',
    amount: 1200,
    category: 'Fuel',
    division: 'Personal',
    description: 'Commute top-up',
    date: new Date(NOW.getFullYear(), NOW.getMonth(), 2, 19, 15).toISOString(),
    accountId: 'acc-1',
  },
  {
    id: 'tx-3',
    type: 'expense',
    amount: 4200,
    category: 'Groceries',
    division: 'Personal',
    description: 'Weekly essentials',
    date: new Date(NOW.getFullYear(), NOW.getMonth(), 4, 18, 45).toISOString(),
    accountId: 'acc-1',
  },
  {
    id: 'tx-4',
    type: 'income',
    amount: 18000,
    category: 'Freelance',
    division: 'Personal',
    description: 'Design project',
    date: new Date(NOW.getFullYear(), NOW.getMonth(), 7, 14, 5).toISOString(),
    accountId: 'acc-2',
  },
  {
    id: 'tx-5',
    type: 'expense',
    amount: 2800,
    category: 'Medical',
    division: 'Personal',
    description: 'Pharmacy',
    date: new Date(NOW.getFullYear(), NOW.getMonth(), 9, 10, 0).toISOString(),
    accountId: 'acc-1',
  },
  {
    id: 'tx-6',
    type: 'transfer',
    amount: 6000,
    category: 'Transfer',
    division: 'Personal',
    description: 'Move to savings',
    date: new Date(NOW.getFullYear(), NOW.getMonth(), 11, 12, 10).toISOString(),
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
  },
]

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDateTime = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const getPeriodRange = (period) => {
  const now = new Date()
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    }
  }
  const start = getWeekStart(now)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const emptyEntry = {
  type: 'income',
  amount: '',
  category: 'Salary',
  division: 'Personal',
  description: '',
  date: new Date().toISOString().slice(0, 16),
  accountId: 'acc-1',
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
}

const defaultFilters = {
  division: 'All',
  category: 'All',
  startDate: '',
  endDate: '',
  period: 'month',
}

function App() {
  const [transactions, setTransactions] = useState(() => {
    const stored = localStorage.getItem('moneyManager:transactions')
    if (!stored) return seedTransactions
    try {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedTransactions
    } catch {
      return seedTransactions
    }
  })
  const [accounts, setAccounts] = useState(ACCOUNTS)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('income')
  const [entry, setEntry] = useState(emptyEntry)
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [backendStatus, setBackendStatus] = useState({
    available: false,
    message: 'Using local data',
  })

  useEffect(() => {
    if (accounts.length === 0) return
    setEntry((prev) => {
      const fallback = accounts[0].id
      const secondary = accounts[1]?.id || fallback
      const next = {
        ...prev,
        accountId: accounts.some((acc) => acc.id === prev.accountId) ? prev.accountId : fallback,
        fromAccountId: accounts.some((acc) => acc.id === prev.fromAccountId)
          ? prev.fromAccountId
          : fallback,
        toAccountId: accounts.some((acc) => acc.id === prev.toAccountId)
          ? prev.toAccountId
          : secondary,
      }

      if (
        next.accountId === prev.accountId &&
        next.fromAccountId === prev.fromAccountId &&
        next.toAccountId === prev.toAccountId
      ) {
        return prev
      }
      return next
    })
  }, [accounts])

  useEffect(() => {
    localStorage.setItem('moneyManager:transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [apiAccounts, apiTransactions] = await Promise.all([
          fetchAccounts(),
          fetchTransactions(),
        ])
        if (Array.isArray(apiAccounts) && apiAccounts.length > 0) {
          setAccounts(apiAccounts)
        }
        if (Array.isArray(apiTransactions) && apiTransactions.length > 0) {
          setTransactions(apiTransactions)
        }
        setBackendStatus({ available: true, message: 'Connected to API' })
      } catch (error) {
        console.warn('Backend unreachable, using local data', error)
        setBackendStatus({ available: false, message: 'Offline mode (local data)' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.division !== 'All' && tx.division !== filters.division) return false
      if (filters.category !== 'All' && tx.category !== filters.category) return false
      if (filters.startDate) {
        const start = new Date(filters.startDate)
        if (new Date(tx.date) < start) return false
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        if (new Date(tx.date) > end) return false
      }
      return true
    })
  }, [transactions, filters])

  const periodTotals = useMemo(() => {
    const { start, end } = getPeriodRange(filters.period)
    return transactions.reduce(
      (acc, tx) => {
        const txDate = new Date(tx.date)
        if (txDate < start || txDate > end) return acc
        if (tx.type === 'income') acc.income += tx.amount
        if (tx.type === 'expense') acc.expense += tx.amount
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [transactions, filters.period])

  const categorySummary = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.type === 'transfer') return acc
      const key = `${tx.type}-${tx.category}`
      acc[key] = (acc[key] || 0) + tx.amount
      return acc
    }, {})
  }, [filteredTransactions])

  const accountBalances = useMemo(() => {
    const balances = Object.fromEntries(accounts.map((acc) => [acc.id, acc.balance ?? 0]))

    const addAmount = (accountId, delta) => {
      if (!accountId) return
      balances[accountId] = (balances[accountId] ?? 0) + delta
    }

    transactions.forEach((tx) => {
      if (tx.type === 'income') addAmount(tx.accountId, tx.amount)
      if (tx.type === 'expense') addAmount(tx.accountId, -tx.amount)
      if (tx.type === 'transfer') {
        addAmount(tx.fromAccountId, -tx.amount)
        addAmount(tx.toAccountId, tx.amount)
      }
    })
    return balances
  }, [accounts, transactions])

  const openModal = (tab) => {
    setActiveTab(tab)
    setEntry({ ...emptyEntry, type: tab })
    setEditingId(null)
    setShowModal(true)
  }

  const handleEntryChange = (field, value) => {
    setEntry((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const payload = {
      ...entry,
      type: activeTab,
      amount: Number(entry.amount),
      date: new Date(entry.date).toISOString(),
    }

    if (!payload.amount || payload.amount <= 0) return

    const applyLocal = (next) => {
      setTransactions(next)
      setShowModal(false)
      setEditingId(null)
    }

    try {
      if (backendStatus.available) {
        if (editingId) {
          const updated = await updateTransaction(editingId, payload)
          const merged = { ...payload, ...(updated || {}), id: editingId }
          applyLocal(transactions.map((tx) => (tx.id === editingId ? merged : tx)))
          return
        }
        const created = await createTransaction(payload)
        const newTx = created?.id ? created : { ...payload, id: `tx-${Date.now()}` }
        applyLocal([newTx, ...transactions])
        return
      }
    } catch (error) {
      console.warn('Backend save failed, falling back to local', error)
    }

    if (editingId) {
      applyLocal(transactions.map((tx) => (tx.id === editingId ? { ...tx, ...payload } : tx)))
    } else {
      applyLocal([{ ...payload, id: `tx-${Date.now()}` }, ...transactions])
    }
  }

  const handleEdit = (tx) => {
    setActiveTab(tx.type)
    setEntry({
      ...tx,
      amount: tx.amount,
      date: new Date(tx.date).toISOString().slice(0, 16),
    })
    setEditingId(tx.id)
    setShowModal(true)
  }

  const canEdit = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    return diff <= 12 * 60 * 60 * 1000
  }

  const handleTransfer = async () => {
    if (entry.fromAccountId === entry.toAccountId) return
    const payload = {
      id: `tx-${Date.now()}`,
      type: 'transfer',
      amount: Number(entry.amount),
      category: 'Transfer',
      division: entry.division,
      description: entry.description || 'Account transfer',
      date: new Date(entry.date).toISOString(),
      fromAccountId: entry.fromAccountId,
      toAccountId: entry.toAccountId,
    }
    if (!payload.amount || payload.amount <= 0) return
    try {
      if (backendStatus.available) {
        const created = await createTransaction({ ...payload, id: undefined })
        const newTx = created?.id ? created : payload
        setTransactions((prev) => [newTx, ...prev])
        setShowModal(false)
        return
      }
    } catch (error) {
      console.warn('Backend transfer failed, falling back to local', error)
    }
    setTransactions((prev) => [payload, ...prev])
    setShowModal(false)
  }

  const handleResetDemo = () => {
    if (!window.confirm('Reset to demo transactions? This will remove your changes.')) return
    localStorage.removeItem('moneyManager:transactions')
    setTransactions(seedTransactions)
    setAccounts(ACCOUNTS)
    setFilters(defaultFilters)
    setActiveTab('income')
    setEntry(emptyEntry)
    setEditingId(null)
    setShowModal(false)
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 shadow-lg">
              Money Manager
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              Personal finance dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Track income, expenses, transfers, and category insights in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-emerald-400"
              onClick={() => openModal('income')}
            >
              + Add Transaction
            </button>
            <button
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
              onClick={() => openModal('transfer')}
            >
              Transfer Funds
            </button>
            <button
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              onClick={handleResetDemo}
            >
              Reset Demo
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${
                backendStatus.available
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-amber-500/20 text-amber-200'
              }`}
            >
              {backendStatus.available ? 'API connected' : 'Offline mode'}
            </span>
            {loading && <span className="text-slate-500">Loading…</span>}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Dashboard overview</h2>
                  <p className="text-sm text-slate-400">View totals by week, month, or year.</p>
                </div>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  value={filters.period}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, period: event.target.value }))
                  }
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Income
                  </p>
                  <p className="mt-3 text-2xl font-bold text-white">
                    {formatCurrency(periodTotals.income)}
                  </p>
                  <div className="mt-4 h-2 w-full rounded-full bg-emerald-500/20">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (periodTotals.income /
                            Math.max(periodTotals.income + periodTotals.expense, 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
                    Expense
                  </p>
                  <p className="mt-3 text-2xl font-bold text-white">
                    {formatCurrency(periodTotals.expense)}
                  </p>
                  <div className="mt-4 h-2 w-full rounded-full bg-rose-500/20">
                    <div
                      className="h-2 rounded-full bg-rose-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (periodTotals.expense /
                            Math.max(periodTotals.income + periodTotals.expense, 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">History</h2>
                  <p className="text-sm text-slate-400">Filter by division, category, or date range.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={filters.division}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, division: event.target.value }))
                    }
                  >
                    <option value="All">All divisions</option>
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={filters.category}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, category: event.target.value }))
                    }
                  >
                    <option value="All">All categories</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
                <input
                  type="date"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </div>
              <div className="mt-6 space-y-4">
                {filteredTransactions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-center text-sm text-slate-400">
                    No transactions match the current filters.
                  </div>
                )}
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                          tx.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : tx.type === 'expense'
                              ? 'bg-rose-500/20 text-rose-200'
                              : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? 'IN' : tx.type === 'expense' ? 'EX' : 'TR'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {tx.description || tx.category}
                        </p>
                        <p className="text-xs text-slate-400">{formatDateTime(tx.date)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                            {tx.category}
                          </span>
                          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                            {tx.division}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          tx.type === 'income'
                            ? 'text-emerald-300'
                            : tx.type === 'expense'
                              ? 'text-rose-300'
                              : 'text-slate-200'
                        }`}
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </span>
                      <button
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-100 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!canEdit(tx.date) || tx.type === 'transfer'}
                        onClick={() => handleEdit(tx)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Editing is available for up to 12 hours after a transaction is created.
              </p>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white">Category summary</h3>
              <p className="text-sm text-slate-400">Totals from the filtered list.</p>
              <div className="mt-4 space-y-3">
                {Object.keys(categorySummary).length === 0 && (
                  <p className="text-sm text-slate-400">No category data yet.</p>
                )}
                {Object.entries(categorySummary).map(([key, value]) => {
                  const [type, category] = key.split('-')
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{category}</p>
                        <p className="text-xs text-slate-400">{type}</p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          type === 'income' ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {formatCurrency(value)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white">Accounts</h3>
              <p className="text-sm text-slate-400">
                Live balances including transfers and transactions.
              </p>
              <div className="mt-4 space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{account.name}</p>
                      <p className="text-xs text-slate-500">Account balance</p>
                    </div>
                    <p className="text-sm font-bold text-slate-100">
                      {formatCurrency(accountBalances[account.id] || 0)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-400">
                Use the transfer action to move money between accounts.
              </div>
            </div>
          </aside>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Edit transaction' : 'Add transaction'}
              </h2>
              <button
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-100 hover:border-rose-400"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['income', 'expense', 'transfer'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab
                      ? 'bg-emerald-500 text-slate-900'
                      : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-emerald-400'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab !== 'transfer' ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Amount
                  </label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.amount}
                    onChange={(event) => handleEntryChange('amount', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date & time
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.date}
                    onChange={(event) => handleEntryChange('date', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Category
                  </label>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.category}
                    onChange={(event) => handleEntryChange('category', event.target.value)}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Division
                  </label>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.division}
                    onChange={(event) => handleEntryChange('division', event.target.value)}
                  >
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Account
                  </label>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.accountId}
                    onChange={(event) => handleEntryChange('accountId', event.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Description
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.description}
                    onChange={(event) => handleEntryChange('description', event.target.value)}
                    placeholder="Add a note for the transaction"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Amount
                  </label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.amount}
                    onChange={(event) => handleEntryChange('amount', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date & time
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.date}
                    onChange={(event) => handleEntryChange('date', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    From account
                  </label>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.fromAccountId}
                    onChange={(event) => handleEntryChange('fromAccountId', event.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    To account
                  </label>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.toAccountId}
                    onChange={(event) => handleEntryChange('toAccountId', event.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Division
                  </label>
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.division}
                    onChange={(event) => handleEntryChange('division', event.target.value)}
                  >
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Note
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    value={entry.description}
                    onChange={(event) => handleEntryChange('description', event.target.value)}
                    placeholder="Add a note for the transfer"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              {activeTab === 'transfer' ? (
                <button
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-emerald-400"
                  onClick={handleTransfer}
                >
                  Save Transfer
                </button>
              ) : (
                <button
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-emerald-400"
                  onClick={handleSave}
                >
                  {editingId ? 'Update Transaction' : 'Save Transaction'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
