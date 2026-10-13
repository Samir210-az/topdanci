const mk = (qty, cost, at, sid) => (sid ? { qty, cost, at: at || 0, sid } : { qty, cost, at: at || 0 })
const sum = (lots) => lots.reduce((total, lot) => total + lot.qty, 0)

function merge(lots) {
  const sorted = [...lots].filter((l) => l.qty > 0).sort((a, b) => a.at - b.at)
  const out = []
  for (const lot of sorted) {
    const last = out[out.length - 1]
    if (last && last.at === lot.at && last.cost === lot.cost && last.sid === lot.sid) last.qty += lot.qty
    else out.push({ ...lot })
  }
  return out
}

export function lotsOf(product) {
  const stored = (product?.lots || []).map((l) => mk(l.qty, l.cost, l.at, l.sid))
  const stock = Math.max(product?.stock || 0, 0)
  const total = sum(stored)
  if (total < stock) {
    return merge([...stored, { qty: stock - total, cost: product?.cost || 0, at: 0 }])
  }
  if (total > stock) return removeNewest(stored, total - stock)
  return merge(stored)
}

function removeNewest(lots, qty) {
  const out = merge(lots)
  let left = qty
  for (let i = out.length - 1; i >= 0 && left > 0; i--) {
    const cut = Math.min(out[i].qty, left)
    out[i].qty -= cut
    left -= cut
  }
  return out.filter((l) => l.qty > 0)
}

export function takeOldest(lots, qty) {
  const rest = merge(lots)
  const taken = []
  let left = qty
  for (const lot of rest) {
    if (left <= 0) break
    const cut = Math.min(lot.qty, left)
    taken.push(mk(cut, lot.cost, lot.at, lot.sid))
    lot.qty -= cut
    left -= cut
  }
  return { taken, rest: rest.filter((l) => l.qty > 0) }
}

export function unitCost(taken) {
  const qty = sum(taken)
  if (!qty) return 0
  return Math.round(taken.reduce((total, l) => total + l.qty * l.cost, 0) / qty)
}

export function totalCost(taken) {
  return taken.reduce((total, l) => total + l.qty * l.cost, 0)
}

export function applyLots(lots, { out = [], inn = [] }) {
  let current = merge(lots)
  for (const item of out) {
    const index = current.findIndex((l) => l.at === item.at && l.cost === item.cost && l.sid === item.sid && l.qty >= item.qty)
    if (index >= 0) {
      current[index] = { ...current[index], qty: current[index].qty - item.qty }
      current = current.filter((l) => l.qty > 0)
    } else {
      current = removeNewest(current, item.qty)
    }
  }
  return merge([...current, ...inn])
}

export const lotsQty = sum

export function qtyFromSupplier(product, supplierId) {
  return lotsOf(product)
    .filter((lot) => lot.sid === supplierId)
    .reduce((total, lot) => total + lot.qty, 0)
}
