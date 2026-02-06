import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
const useDatabase = Boolean(MONGODB_URI)

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    division: { type: String, enum: ['Personal', 'Office'], required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    accountId: { type: String },
    fromAccountId: { type: String },
    toAccountId: { type: String },
  },
  { timestamps: true },
)

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
)

const TransactionModel = useDatabase ? mongoose.model('Transaction', transactionSchema) : null
const AccountModel = useDatabase ? mongoose.model('Account', accountSchema) : null

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

let accounts = [
  { id: 'acc-1', name: 'Cash Wallet', balance: 8200 },
  { id: 'acc-2', name: 'Savings Bank', balance: 48000 },
  { id: 'acc-3', name: 'Credit Card', balance: -6200 },
]

let transactions = [
  {
    id: 'tx-1',
    type: 'income',
    amount: 45000,
    category: 'Salary',
    division: 'Office',
    description: 'January payout',
    date: new Date().toISOString(),
    accountId: 'acc-2',
  },
]

const connectDb = async () => {
  if (!useDatabase) return false
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('MongoDB connected')

    // Seed defaults if collections are empty, using real ObjectIds for references
    const accountCount = await AccountModel.countDocuments()
    if (accountCount === 0) {
      await AccountModel.insertMany(accounts)
    }

    const existingAccounts = await AccountModel.find().lean()
    const accountIdMap = {
      'acc-1': existingAccounts.find((doc) => doc.name === 'Cash Wallet')?._id?.toString(),
      'acc-2': existingAccounts.find((doc) => doc.name === 'Savings Bank')?._id?.toString(),
      'acc-3': existingAccounts.find((doc) => doc.name === 'Credit Card')?._id?.toString(),
    }

    const txCount = await TransactionModel.countDocuments()
    if (txCount === 0) {
      const transactionsWithRealIds = transactions.map((tx) => ({
        ...tx,
        accountId: tx.accountId ? accountIdMap[tx.accountId] || tx.accountId : undefined,
        fromAccountId: tx.fromAccountId
          ? accountIdMap[tx.fromAccountId] || tx.fromAccountId
          : undefined,
        toAccountId: tx.toAccountId ? accountIdMap[tx.toAccountId] || tx.toAccountId : undefined,
      }))

      await TransactionModel.insertMany(transactionsWithRealIds)
    }

    return true
  } catch (error) {
    console.error('MongoDB connection failed, staying in memory mode', error.message)
    return false
  }
}

const mapTx = (doc) => ({
  id: doc._id?.toString() || doc.id,
  type: doc.type,
  amount: doc.amount,
  category: doc.category,
  division: doc.division,
  description: doc.description,
  date: doc.date,
  accountId: doc.accountId,
  fromAccountId: doc.fromAccountId,
  toAccountId: doc.toAccountId,
})

const mapAccount = (doc) => ({
  id: doc._id?.toString() || doc.id,
  name: doc.name,
  balance: doc.balance,
})

app.get('/api/accounts', async (_req, res) => {
  if (useDatabase && mongoose.connection.readyState === 1) {
    const docs = await AccountModel.find().lean()
    return res.json(docs.map(mapAccount))
  }
  res.json(accounts)
})

app.get('/api/transactions', async (_req, res) => {
  if (useDatabase && mongoose.connection.readyState === 1) {
    const docs = await TransactionModel.find().sort({ createdAt: -1 }).lean()
    return res.json(docs.map(mapTx))
  }
  res.json(transactions)
})

app.post('/api/transactions', async (req, res) => {
  const payload = req.body
  if (!payload || !payload.type || !payload.amount) {
    return res.status(400).json({ message: 'Invalid transaction' })
  }

  if (useDatabase && mongoose.connection.readyState === 1) {
    try {
      const created = await TransactionModel.create(payload)
      return res.status(201).json(mapTx(created))
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  const tx = { ...payload, id: payload.id || `tx-${Date.now()}` }
  transactions = [tx, ...transactions]
  res.status(201).json(tx)
})

app.patch('/api/transactions/:id', async (req, res) => {
  const { id } = req.params

  if (useDatabase && mongoose.connection.readyState === 1) {
    try {
      const updated = await TransactionModel.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }).lean()
      if (!updated) return res.status(404).json({ message: 'Not found' })
      return res.json(mapTx(updated))
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  const idx = transactions.findIndex((t) => t.id === id)
  if (idx === -1) return res.status(404).json({ message: 'Not found' })
  transactions[idx] = { ...transactions[idx], ...req.body }
  res.json(transactions[idx])
})

const start = async () => {
  await connectDb()
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

start()
