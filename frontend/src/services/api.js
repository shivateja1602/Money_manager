const API_BASE = import.meta.env.VITE_API_URL || 'https://money-manager-a6jx.onrender.com/api'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

const safeFetch = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: jsonHeaders,
    ...options,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }
  return response.json()
}

export const fetchAccounts = () => safeFetch('/accounts')
export const fetchTransactions = () => safeFetch('/transactions')
export const createTransaction = (payload) =>
  safeFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateTransaction = (id, payload) =>
  safeFetch(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
