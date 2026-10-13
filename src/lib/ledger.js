export class LedgerError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LedgerError'
  }
}

const isInt = Number.isInteger

export const lineTotal = (line) => line.qty * line.price
export const itemsTotal = (items) => items.reduce((sum, line) => sum + lineTotal(line), 0)

function sumByProduct(lines) {
  const out = {}
  for (const line of lines) out[line.productId] = (out[line.productId] || 0) + line.qty
  return out
}

function negate(map) {
  const out = {}
  for (const [key, value] of Object.entries(map)) {
    if (value !== 0) out[key] = -value
  }
  return out
}

function assertLines(lines) {
  for (const line of lines) {
    if (!isInt(line.qty) || line.qty <= 0) {
      throw new LedgerError(`“${line.name}” üçün say düzgün deyil`)
    }
    if (!isInt(line.price) || line.price < 0) {
      throw new LedgerError(`“${line.name}” üçün qiymət düzgün deyil`)
    }
  }
}

function assertPaid(paid, total) {
  if (!isInt(paid) || paid < 0 || paid > total) {
    throw new LedgerError('Ödənilən məbləğ düzgün deyil')
  }
}

export function planSale({ type, items, paid = 0, stockOf }) {
  if (!items.length) throw new LedgerError('Satış üçün mal seçilməyib')
  assertLines(items)

  const need = sumByProduct(items)
  const names = Object.fromEntries(items.map((l) => [l.productId, l.name]))
  for (const [productId, qty] of Object.entries(need)) {
    const available = stockOf[productId] ?? 0
    if (qty > available) {
      throw new LedgerError(`“${names[productId]}” anbarda kifayət qədər yoxdur (qalıq: ${available})`)
    }
  }

  const total = itemsTotal(items)

  assertPaid(paid, total)
  const holdings = type === 'consign' ? need : {}
  return { total, paid, fx: { stock: negate(need), holdings, balance: total - paid } }
}

export function holdUnit(customer, productId) {
  const value = customer.holdValue?.[productId]
  if (value == null) return null
  const held = customer.holdings?.[productId] || 0
  return held ? Math.round(value / held) : 0
}

export function planSettle({ holdings, sold, returned, paid = 0, unitValue = {} }) {
  if (!sold.length && !returned.length) {
    throw new LedgerError('Satılan və ya qaytarılan mal göstərilməyib')
  }
  assertLines(sold)
  for (const line of returned) {
    if (!isInt(line.qty) || line.qty <= 0) {
      throw new LedgerError(`“${line.name}” üçün qaytarılan say düzgün deyil`)
    }
  }
  if (!isInt(paid) || paid < 0) throw new LedgerError('Ödənilən məbləğ düzgün deyil')

  const soldQty = sumByProduct(sold)
  const returnedQty = sumByProduct(returned)
  const holdingsFx = {}
  for (const productId of new Set([...Object.keys(soldQty), ...Object.keys(returnedQty)])) {
    const used = (soldQty[productId] || 0) + (returnedQty[productId] || 0)
    if (used > (holdings[productId] || 0)) {
      throw new LedgerError('Müştəridə olan maldan çox say göstərilib')
    }
    holdingsFx[productId] = -used
  }

  let balance = -paid
  for (const line of sold) {
    const given = unitValue[line.productId]
    balance += given == null ? line.qty * line.price : line.qty * (line.price - given)
  }
  for (const line of returned) {
    const given = unitValue[line.productId]
    if (given != null) balance -= line.qty * given
  }

  return { total: itemsTotal(sold), paid, fx: { stock: returnedQty, holdings: holdingsFx, balance } }
}

export function planPayment({ amount }) {
  if (!isInt(amount) || amount <= 0) throw new LedgerError('Ödəniş məbləği düzgün deyil')
  return { fx: { stock: {}, holdings: {}, balance: -amount } }
}

export function planCancel({ fx, stockOf, holdingsOf }) {
  const stock = negate(fx.stock)
  const holdings = negate(fx.holdings)

  for (const [productId, delta] of Object.entries(stock)) {
    if (delta < 0 && (stockOf[productId] ?? 0) + delta < 0) {
      throw new LedgerError('Qaytarılan mal artıq satılıb, anbarda kifayət qədər yoxdur. Ləğv etmək olmur')
    }
  }
  for (const [productId, delta] of Object.entries(holdings)) {
    if (delta < 0 && (holdingsOf[productId] || 0) + delta < 0) {
      throw new LedgerError('Müştəridə bu mal artıq azalıb. Ləğv etmək olmur')
    }
  }

  return {
    stock,
    holdings,
    balance: fx.balance === 0 ? 0 : -fx.balance,
    lotsOut: fx.lotsIn || {},
    lotsIn: fx.lotsOut || {},
    holdCost: negate(fx.holdCost || {}),
    holdValue: negate(fx.holdValue || {}),
  }
}

export function planPurchase({ items, paid = 0 }) {
  if (!items.length) throw new LedgerError('Alış üçün mal seçilməyib')
  for (const line of items) {
    if (!isInt(line.qty) || line.qty <= 0) throw new LedgerError(`“${line.name}” üçün say düzgün deyil`)
    if (!isInt(line.cost) || line.cost <= 0) throw new LedgerError(`“${line.name}” üçün alış qiyməti düzgün deyil`)
  }
  const total = items.reduce((sum, line) => sum + line.qty * line.cost, 0)
  assertPaid(paid, total)
  return { total, paid, fx: { stock: sumByProduct(items), holdings: {}, balance: total - paid } }
}

export function planReturnFromCustomer({ items }) {
  if (!items.length) throw new LedgerError('Qaytarılan mal seçilməyib')
  assertLines(items)
  const total = itemsTotal(items)
  return { total, fx: { stock: sumByProduct(items), holdings: {}, balance: -total } }
}

export function planReturnToSupplier({ items, costs }) {
  if (!items.length) throw new LedgerError('Qaytarılan mal seçilməyib')
  for (const line of items) {
    if (!isInt(line.qty) || line.qty <= 0) throw new LedgerError(`“${line.name}” üçün say düzgün deyil`)
  }
  const total = costs.reduce((sum, value) => sum + value, 0)
  return { total, fx: { stock: negate(sumByProduct(items)), holdings: {}, balance: -total } }
}
