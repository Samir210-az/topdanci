import { collection, doc, increment, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { LedgerError, planCancel, planPayment, planSale, planSettle } from './ledger'
import { dateKey } from './dates'
import { reportError } from './events'

function stamp() {
  const date = new Date()
  return { at: Timestamp.fromDate(date), key: dateKey(date) }
}

function commit(batch) {
  batch.commit().catch(reportError)
}

function stockOf(productMap, productIds) {
  return Object.fromEntries(productIds.map((id) => [id, productMap[id]?.stock || 0]))
}

function saleLines(lines, productMap) {
  return lines.map((line) => {
    const product = productMap[line.productId]
    if (!product) throw new LedgerError('Mal tapılmadı. Siyahını yeniləyib yenidən yoxla')
    return {
      productId: line.productId,
      name: product.name,
      unit: product.unit,
      qty: line.qty,
      price: line.price,
      cost: product.cost || 0,
    }
  })
}

function applyEffects(batch, { fx, customerId, reason, refId, productMap, at }) {
  for (const [productId, delta] of Object.entries(fx.stock)) {
    batch.update(doc(db, 'products', productId), { stock: increment(delta), updatedAt: at })
    batch.set(doc(collection(db, 'stockMoves')), {
      productId,
      productName: productMap[productId]?.name || '',
      delta,
      reason,
      refId,
      createdAt: at,
    })
  }

  const patch = {}
  if (fx.balance) patch.balance = increment(fx.balance)
  for (const [productId, delta] of Object.entries(fx.holdings)) {
    patch[`holdings.${productId}`] = increment(delta)
  }
  if (customerId && Object.keys(patch).length) {
    batch.update(doc(db, 'customers', customerId), patch)
  }
}

export function createSale({ customer, lines, type, paid, note = '', productMap }) {
  const items = saleLines(lines, productMap)
  const plan = planSale({
    type,
    items,
    paid,
    stockOf: stockOf(productMap, items.map((l) => l.productId)),
  })

  const { at, key } = stamp()
  const ref = doc(collection(db, 'sales'))
  const sale = {
    type,
    customerId: customer.id,
    customerName: customer.name,
    items,
    total: plan.total,
    paid: plan.paid,
    balanceDelta: plan.fx.balance,
    fx: plan.fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, sale)
  applyEffects(batch, { fx: plan.fx, customerId: customer.id, reason: type, refId: ref.id, productMap, at })
  commit(batch)
  return { id: ref.id, ...sale }
}

export function settleConsignment({ customer, sold, returned, paid, note = '', productMap }) {
  const soldItems = saleLines(sold, productMap)
  const returnedItems = returned.map((line) => {
    const product = productMap[line.productId]
    return { productId: line.productId, name: product?.name || '', unit: product?.unit || '', qty: line.qty }
  })
  const plan = planSettle({
    holdings: customer.holdings || {},
    sold: soldItems,
    returned: returnedItems,
    paid,
  })

  const { at, key } = stamp()
  const ref = doc(collection(db, 'sales'))
  const sale = {
    type: 'settle',
    customerId: customer.id,
    customerName: customer.name,
    items: soldItems,
    returned: returnedItems,
    total: plan.total,
    paid: plan.paid,
    balanceDelta: plan.fx.balance,
    fx: plan.fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, sale)
  applyEffects(batch, { fx: plan.fx, customerId: customer.id, reason: 'settle', refId: ref.id, productMap, at })
  commit(batch)
  return { id: ref.id, ...sale }
}

export function createPayment({ customer, amount, method, note = '' }) {
  const plan = planPayment({ amount })
  const { at, key } = stamp()
  const ref = doc(collection(db, 'payments'))

  const batch = writeBatch(db)
  batch.set(ref, {
    customerId: customer.id,
    customerName: customer.name,
    amount,
    method,
    note,
    fx: plan.fx,
    canceled: false,
    createdAt: at,
    dateKey: key,
  })
  batch.update(doc(db, 'customers', customer.id), { balance: increment(plan.fx.balance) })
  commit(batch)
  return ref.id
}

export function cancelSale({ sale, customer, productMap }) {
  if (sale.canceled) throw new LedgerError('Bu əməliyyat artıq ləğv edilib')
  const undo = planCancel({
    fx: sale.fx,
    stockOf: stockOf(productMap, Object.keys(sale.fx.stock)),
    holdingsOf: customer?.holdings || {},
  })

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'sales', sale.id), { canceled: true, canceledAt: at })
  applyEffects(batch, { fx: undo, customerId: sale.customerId, reason: 'cancel', refId: sale.id, productMap, at })
  commit(batch)
}

export function cancelPayment({ payment }) {
  if (payment.canceled) throw new LedgerError('Bu ödəniş artıq ləğv edilib')
  const undo = planCancel({ fx: payment.fx, stockOf: {}, holdingsOf: {} })

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'payments', payment.id), { canceled: true, canceledAt: at })
  batch.update(doc(db, 'customers', payment.customerId), { balance: increment(undo.balance) })
  commit(batch)
}

export function saveCustomer({ id, data }) {
  const { at } = stamp()
  const batch = writeBatch(db)
  if (id) {
    batch.update(doc(db, 'customers', id), { ...data, updatedAt: at })
    commit(batch)
    return id
  }
  const ref = doc(collection(db, 'customers'))
  batch.set(ref, { ...data, balance: 0, holdings: {}, createdAt: at, updatedAt: at })
  commit(batch)
  return ref.id
}

export function saveProduct({ id, data, initialStock = 0 }) {
  const { at } = stamp()
  const batch = writeBatch(db)
  if (id) {
    batch.update(doc(db, 'products', id), { ...data, updatedAt: at })
    commit(batch)
    return id
  }

  const ref = doc(collection(db, 'products'))
  batch.set(ref, { ...data, stock: initialStock, archived: false, createdAt: at, updatedAt: at })
  if (initialStock > 0) {
    batch.set(doc(collection(db, 'stockMoves')), {
      productId: ref.id,
      productName: data.name,
      delta: initialStock,
      reason: 'initial',
      refId: ref.id,
      createdAt: at,
    })
  }
  commit(batch)
  return ref.id
}

export function setProductArchived(id, archived) {
  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'products', id), { archived, updatedAt: at })
  commit(batch)
}

export function receiveStock({ product, qty, unitCost = 0 }) {
  if (!Number.isInteger(qty) || qty <= 0) throw new LedgerError('Qəbul edilən say düzgün deyil')

  const onHand = Math.max(product.stock || 0, 0)
  const patch = { stock: increment(qty) }
  if (unitCost > 0) {
    patch.cost = Math.round((onHand * (product.cost || 0) + qty * unitCost) / (onHand + qty))
  }

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'products', product.id), { ...patch, updatedAt: at })
  batch.set(doc(collection(db, 'stockMoves')), {
    productId: product.id,
    productName: product.name,
    delta: qty,
    reason: 'receive',
    refId: product.id,
    createdAt: at,
  })
  commit(batch)
}

export function adjustStock({ product, actual }) {
  if (!Number.isInteger(actual) || actual < 0) throw new LedgerError('Say düzgün deyil')
  const delta = actual - (product.stock || 0)
  if (delta === 0) return

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'products', product.id), { stock: increment(delta), updatedAt: at })
  batch.set(doc(collection(db, 'stockMoves')), {
    productId: product.id,
    productName: product.name,
    delta,
    reason: 'adjust',
    refId: product.id,
    createdAt: at,
  })
  commit(batch)
}
