const lineMargin = (l) => l.qty * l.price - (l.costTotal ?? l.qty * (l.cost || 0))
const lineCost = (l) => l.costTotal ?? l.qty * (l.cost || 0)

export function summarize(rows) {
  let revenue = 0
  let cost = 0
  for (const s of rows) {
    if (s.canceled) continue
    const sign = s.type === 'return' ? -1 : s.type === 'sale' || s.type === 'settle' ? 1 : 0
    if (!sign) continue
    revenue += sign * s.total
    cost += sign * s.items.reduce((p, l) => p + lineCost(l), 0)
  }
  return { revenue, cost, profit: revenue - cost }
}

export { lineMargin }
