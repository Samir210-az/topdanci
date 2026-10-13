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

  if (type === 'consign') {
    return { total, paid: 0, fx: { stock: negate(need), holdings: need, balance: 0 } }
  }

  assertPaid(paid, total)
  return { total, paid, fx: { stock: negate(need), holdings: {}, balance: total - paid } }
}

export function planSettle({ holdings, sold, returned, paid = 0 }) {
  if (!sold.length && !returned.length) {
    throw new LedgerError('Satılan və ya qaytarılan mal göstərilməyib')
  }
  assertLines(sold)
  for (const line of returned) {
    if (!isInt(line.qty) || line.qty <= 0) {
      throw new LedgerError(`“${line.name}” üçün qaytarılan say düzgün deyil`)
    }
  }

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

  const total = itemsTotal(sold)
  assertPaid(paid, total)
  return { total, paid, fx: { stock: returnedQty, holdings: holdingsFx, balance: total - paid } }
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

  return { stock, holdings, balance: fx.balance === 0 ? 0 : -fx.balance }
}
