import test from 'node:test'
import assert from 'node:assert/strict'
import { summarize } from './summary.js'

const item = (qty, price, costTotal) => ({ qty, price, costTotal })

test('satış, qaytarma və satışa verilən birlikdə', () => {
  const rows = [
    { type: 'sale', total: 8400, items: [item(12, 700, 6200)] },
    { type: 'consign', total: 7000, items: [item(10, 700, 5000)] },
    { type: 'return', total: 2800, items: [item(4, 700, 2000)] },
    { type: 'sale', total: 500, canceled: true, items: [item(1, 500, 100)] },
  ]
  assert.deepEqual(summarize(rows), { revenue: 5600, cost: 4200, profit: 1400 })
})
