import { arrayUnion, collection, doc, increment, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import {
  holdUnit,
  LedgerError,
  planCancel,
  planPayment,
  planPurchase,
  planReturnFromCustomer,
  planReturnToSupplier,
  planSale,
  planSettle,
} from './ledger'
import { applyLots, lotsOf, takeFromSupplier, takeOldest, totalCost, unitCost } from './lots'
import { dateKey } from './dates'
import { returnableQty } from './returns'
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

function applyEffects(batch, { fx, party, reason, refId, productMap, at }) {
  const productIds = new Set([
    ...Object.keys(fx.stock || {}),
    ...Object.keys(fx.lotsOut || {}),
    ...Object.keys(fx.lotsIn || {}),
  ])

  for (const productId of productIds) {
    const delta = fx.stock?.[productId] || 0
    const patch = { updatedAt: at }
    if (delta) patch.stock = increment(delta)
    if (fx.lotsOut?.[productId] || fx.lotsIn?.[productId]) {
      patch.lots = applyLots(lotsOf(productMap[productId]), {
        out: fx.lotsOut?.[productId],
        inn: fx.lotsIn?.[productId],
      })
    }
    batch.update(doc(db, 'products', productId), patch)
    if (delta) {
      batch.set(doc(collection(db, 'stockMoves')), {
        productId,
        productName: productMap[productId]?.name || '',
        delta,
        reason,
        refId,
        createdAt: at,
      })
    }
  }

  const patch = {}
  if (fx.balance) patch.balance = increment(fx.balance)
  for (const [productId, delta] of Object.entries(fx.holdings || {})) {
    patch[`holdings.${productId}`] = increment(delta)
  }
  for (const [productId, delta] of Object.entries(fx.holdCost || {})) {
    patch[`holdCost.${productId}`] = increment(delta)
  }
  for (const [productId, delta] of Object.entries(fx.holdValue || {})) {
    patch[`holdValue.${productId}`] = increment(delta)
  }
  if (party && Object.keys(patch).length) {
    batch.update(doc(db, party.collection, party.id), patch)
  }
}

function groupBy(list, key) {
  const out = {}
  for (const item of list) (out[item[key]] ||= []).push(item)
  return out
}

function takeForSale(items, productMap) {
  const work = {}
  const lotsOut = {}
  const costed = items.map((line) => {
    const lots = work[line.productId] ?? lotsOf(productMap[line.productId])
    const { taken, rest } = takeOldest(lots, line.qty)
    work[line.productId] = rest
    lotsOut[line.productId] = [...(lotsOut[line.productId] || []), ...taken]
    return { ...line, cost: unitCost(taken), costTotal: totalCost(taken) }
  })
  return { costed, lotsOut }
}

export function createSale({ customer, lines, type, paid, note = '', productMap }) {
  const lined = saleLines(lines, productMap)
  const plan = planSale({
    type,
    items: lined,
    paid,
    stockOf: stockOf(productMap, lined.map((l) => l.productId)),
  })

  const { costed: items, lotsOut } = takeForSale(lined, productMap)
  const fx = { ...plan.fx, lotsOut }
  if (type === 'consign') {
    fx.holdCost = Object.fromEntries(Object.entries(lotsOut).map(([id, taken]) => [id, totalCost(taken)]))
    fx.holdValue = {}
    for (const line of items) fx.holdValue[line.productId] = (fx.holdValue[line.productId] || 0) + line.qty * line.price
  }

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
    fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, sale)
  applyEffects(batch, { fx, party: { collection: 'customers', id: customer.id }, reason: type, refId: ref.id, productMap, at })
  commit(batch)
  return { id: ref.id, ...sale }
}

export function settleConsignment({ customer, sold, returned, paid, note = '', productMap }) {
  const holdings = customer.holdings || {}
  const unitOf = (productId) => {
    const held = holdings[productId] || 0
    const total = customer.holdCost?.[productId] ?? held * (productMap[productId]?.cost || 0)
    return { held, total, unit: held ? Math.round(total / held) : 0 }
  }

  const soldItems = saleLines(sold, productMap).map((line) => ({ ...line, cost: unitOf(line.productId).unit }))
  const returnedItems = returned.map((line) => {
    const product = productMap[line.productId]
    return { productId: line.productId, name: product?.name || '', unit: product?.unit || '', qty: line.qty }
  })
  const unitValue = {}
  for (const line of [...soldItems, ...returnedItems]) {
    const unit = holdUnit(customer, line.productId)
    if (unit != null) unitValue[line.productId] = unit
  }
  const plan = planSettle({ holdings, sold: soldItems, returned: returnedItems, paid, unitValue })

  const used = {}
  for (const line of [...soldItems, ...returnedItems]) used[line.productId] = (used[line.productId] || 0) + line.qty
  const holdCost = {}
  for (const [productId, qty] of Object.entries(used)) {
    const { held, total, unit } = unitOf(productId)
    holdCost[productId] = -(qty >= held ? total : Math.min(total, qty * unit))
  }

  const holdValue = {}
  for (const [productId, qty] of Object.entries(used)) {
    const total = customer.holdValue?.[productId]
    if (total == null) continue
    const held = holdings[productId] || 0
    holdValue[productId] = -(qty >= held ? total : Math.min(total, qty * unitValue[productId]))
  }

  const lotsIn = {}
  for (const line of returnedItems) {
    const { unit } = unitOf(line.productId)
    ;(lotsIn[line.productId] ||= []).push({ qty: line.qty, cost: unit, at: 0 })
  }
  const fx = { ...plan.fx, lotsIn, holdCost, holdValue }

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
    fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, sale)
  applyEffects(batch, { fx, party: { collection: 'customers', id: customer.id }, reason: 'settle', refId: ref.id, productMap, at })
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

export function cancelSale({ sale, customer, productMap, sales = [] }) {
  if (sale.canceled) throw new LedgerError('Bu əməliyyat artıq ləğv edilib')
  if (sale.type === 'sale' || sale.type === 'settle') {
    for (const line of sale.items) {
      if (returnableQty(sales, sale.customerId, line.productId, sale.id) < 0) {
        throw new LedgerError('Bu satışdakı mal artıq müştəridən qaytarılıb. Əvvəl qaytarmanı ləğv et')
      }
    }
  }
  const undo = planCancel({
    fx: sale.fx,
    stockOf: stockOf(productMap, Object.keys(sale.fx.stock)),
    holdingsOf: customer?.holdings || {},
  })

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'sales', sale.id), { canceled: true, canceledAt: at })
  applyEffects(batch, { fx: undo, party: { collection: 'customers', id: sale.customerId }, reason: 'cancel', refId: sale.id, productMap, at })
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
  const lots = initialStock > 0 ? [{ qty: initialStock, cost: data.cost || 0, at: Date.now() }] : []
  batch.set(ref, { ...data, stock: initialStock, lots, archived: false, createdAt: at, updatedAt: at })
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

export function adjustStock({ product, actual }) {
  if (!Number.isInteger(actual) || actual < 0) throw new LedgerError('Say düzgün deyil')
  const delta = actual - (product.stock || 0)
  if (delta === 0) return

  const fx = { stock: { [product.id]: delta }, holdings: {}, balance: 0 }
  if (delta > 0) fx.lotsIn = { [product.id]: [{ qty: delta, cost: product.cost || 0, at: Date.now() }] }
  else fx.lotsOut = { [product.id]: takeOldest(lotsOf(product), -delta).taken }

  const { at } = stamp()
  const batch = writeBatch(db)
  applyEffects(batch, { fx, reason: 'adjust', refId: product.id, productMap: { [product.id]: product }, at })
  commit(batch)
}

export function saveSupplier({ id, data }) {
  const { at } = stamp()
  const batch = writeBatch(db)
  if (id) {
    batch.update(doc(db, 'suppliers', id), { ...data, updatedAt: at })
    commit(batch)
    return id
  }
  const ref = doc(collection(db, 'suppliers'))
  batch.set(ref, { ...data, balance: 0, createdAt: at, updatedAt: at })
  commit(batch)
  return ref.id
}

export function createPurchase({ supplier, lines, paid, note = '', productMap }) {
  const items = lines.map((line) => {
    const product = productMap[line.productId]
    if (!product) throw new LedgerError('Mal tapılmadı. Siyahını yeniləyib yenidən yoxla')
    return { productId: line.productId, name: product.name, unit: product.unit, qty: line.qty, cost: line.cost }
  })
  const plan = planPurchase({ items, paid })

  const atMs = Date.now()
  const lotsIn = Object.fromEntries(
    Object.entries(groupBy(items, 'productId')).map(([productId, rows]) => [
      productId,
      rows.map((r) => ({ qty: r.qty, cost: r.cost, at: atMs, sid: supplier.id })),
    ]),
  )
  const fx = { ...plan.fx, lotsIn }

  const { at, key } = stamp()
  const ref = doc(collection(db, 'purchases'))
  const purchase = {
    supplierId: supplier.id,
    supplierName: supplier.name,
    items,
    total: plan.total,
    paid: plan.paid,
    fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, purchase)
  applyEffects(batch, { fx, party: { collection: 'suppliers', id: supplier.id }, reason: 'purchase', refId: ref.id, productMap, at })
  for (const line of items) batch.update(doc(db, 'products', line.productId), { cost: line.cost })

  const goods = {}
  for (const line of items) {
    goods[`goods.${line.productId}.name`] = line.name
    goods[`goods.${line.productId}.unit`] = line.unit
    goods[`goods.${line.productId}.lastCost`] = line.cost
    goods[`goods.${line.productId}.lastAt`] = at
    goods[`goods.${line.productId}.qty`] = increment(line.qty)
  }
  batch.update(doc(db, 'suppliers', supplier.id), goods)
  commit(batch)
  return { id: ref.id, ...purchase }
}

export function cancelPurchase({ purchase, productMap }) {
  if (purchase.canceled) throw new LedgerError('Bu alış artıq ləğv edilib')
  const undo = planCancel({
    fx: purchase.fx,
    stockOf: stockOf(productMap, Object.keys(purchase.fx.stock)),
    holdingsOf: {},
  })

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'purchases', purchase.id), { canceled: true, canceledAt: at })
  applyEffects(batch, {
    fx: undo,
    party: { collection: 'suppliers', id: purchase.supplierId },
    reason: 'cancel',
    refId: purchase.id,
    productMap,
    at,
  })
  const goods = {}
  const sign = purchase.kind === 'return' ? 1 : -1
  for (const line of purchase.items) goods[`goods.${line.productId}.qty`] = increment(sign * line.qty)
  batch.update(doc(db, 'suppliers', purchase.supplierId), goods)
  commit(batch)
}

export function createSupplierPayment({ supplier, amount, method, note = '' }) {
  const plan = planPayment({ amount })
  const { at, key } = stamp()
  const ref = doc(collection(db, 'supplierPayments'))

  const batch = writeBatch(db)
  batch.set(ref, {
    supplierId: supplier.id,
    supplierName: supplier.name,
    amount,
    method,
    note,
    fx: plan.fx,
    canceled: false,
    createdAt: at,
    dateKey: key,
  })
  batch.update(doc(db, 'suppliers', supplier.id), { balance: increment(plan.fx.balance) })
  commit(batch)
  return ref.id
}

export function cancelSupplierPayment({ payment }) {
  if (payment.canceled) throw new LedgerError('Bu ödəniş artıq ləğv edilib')
  const undo = planCancel({ fx: payment.fx, stockOf: {}, holdingsOf: {} })

  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'supplierPayments', payment.id), { canceled: true, canceledAt: at })
  batch.update(doc(db, 'suppliers', payment.supplierId), { balance: increment(undo.balance) })
  commit(batch)
}

export function returnFromCustomer({ customer, lines, note = '', productMap, sales }) {
  const recent = (productId) =>
    sales.find(
      (sale) =>
        sale.customerId === customer.id &&
        !sale.canceled &&
        sale.type !== 'return' &&
        sale.items.some((l) => l.productId === productId),
    )?.items.find((l) => l.productId === productId)

  const asked = {}
  const items = lines.map((line) => {
    const product = productMap[line.productId]
    if (!product) throw new LedgerError('Mal tapılmadı. Siyahını yeniləyib yenidən yoxla')
    asked[line.productId] = (asked[line.productId] || 0) + line.qty
    const available = returnableQty(sales, customer.id, line.productId)
    if (asked[line.productId] > available) {
      throw new LedgerError(`“${product.name}” üçün qaytarıla bilən say: ${Math.max(available, 0)}`)
    }
    const last = recent(line.productId)
    return {
      productId: line.productId,
      name: product.name,
      unit: product.unit,
      qty: line.qty,
      price: line.price,
      cost: last?.cost ?? product.cost ?? 0,
    }
  })
  const plan = planReturnFromCustomer({ items })

  const lotsIn = {}
  for (const line of items) (lotsIn[line.productId] ||= []).push({ qty: line.qty, cost: line.cost, at: 0 })
  const fx = { ...plan.fx, lotsIn }

  const { at, key } = stamp()
  const ref = doc(collection(db, 'sales'))
  const sale = {
    type: 'return',
    customerId: customer.id,
    customerName: customer.name,
    items,
    total: plan.total,
    paid: 0,
    balanceDelta: plan.fx.balance,
    fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, sale)
  applyEffects(batch, { fx, party: { collection: 'customers', id: customer.id }, reason: 'return', refId: ref.id, productMap, at })
  commit(batch)
  return { id: ref.id, ...sale }
}

export function returnToSupplier({ supplier, lines, note = '', productMap }) {
  const work = {}
  const lotsOut = {}
  const items = []
  const costs = []

  for (const line of lines) {
    const product = productMap[line.productId]
    if (!product) throw new LedgerError('Mal tapılmadı. Siyahını yeniləyib yenidən yoxla')
    const { taken, rest, missing } = takeFromSupplier(work[line.productId] ?? lotsOf(product), supplier.id, line.qty)
    if (missing > 0) {
      throw new LedgerError(`“${product.name}” bu təchizatçıdan bu qədər qalmayıb`)
    }
    work[line.productId] = rest
    lotsOut[line.productId] = [...(lotsOut[line.productId] || []), ...taken]
    costs.push(totalCost(taken))
    items.push({ productId: line.productId, name: product.name, unit: product.unit, qty: line.qty, cost: unitCost(taken) })
  }

  const plan = planReturnToSupplier({ items, costs })
  const fx = { ...plan.fx, lotsOut }

  const { at, key } = stamp()
  const ref = doc(collection(db, 'purchases'))
  const record = {
    kind: 'return',
    supplierId: supplier.id,
    supplierName: supplier.name,
    items,
    total: plan.total,
    paid: 0,
    fx,
    note,
    canceled: false,
    createdAt: at,
    dateKey: key,
  }

  const batch = writeBatch(db)
  batch.set(ref, record)
  applyEffects(batch, { fx, party: { collection: 'suppliers', id: supplier.id }, reason: 'return', refId: ref.id, productMap, at })
  const goods = {}
  for (const line of items) goods[`goods.${line.productId}.qty`] = increment(-line.qty)
  batch.update(doc(db, 'suppliers', supplier.id), goods)
  commit(batch)
  return { id: ref.id, ...record }
}

export function saveReceipt({ sale, signature, signedBy, debt }) {
  const { at } = stamp()
  const receipt = { debt, signedBy, createdAt: at, ...(signature ? { signature, signedAt: at } : {}) }
  const batch = writeBatch(db)
  batch.update(doc(db, 'sales', sale.id), { receipt, receiptSent: arrayUnion(at) })
  commit(batch)
  return { at, receipt }
}

export function markReceiptSent({ sale }) {
  const { at } = stamp()
  const batch = writeBatch(db)
  batch.update(doc(db, 'sales', sale.id), { receiptSent: arrayUnion(at) })
  commit(batch)
  return at
}
