export function returnableQty(sales, customerId, productId, excludeId) {
  let qty = 0
  for (const sale of sales) {
    if (sale.customerId !== customerId || sale.canceled || sale.id === excludeId) continue
    if (sale.type !== 'sale' && sale.type !== 'settle' && sale.type !== 'return') continue
    const sign = sale.type === 'return' ? -1 : 1
    for (const line of sale.items) if (line.productId === productId) qty += sign * line.qty
  }
  return qty
}
